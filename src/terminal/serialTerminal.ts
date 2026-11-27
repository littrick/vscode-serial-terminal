import { EventEmitter, l10n, Uri, Terminal as VsTerminal, workspace } from "vscode";
import * as fs from 'fs';
import { Configuration, SerialPort } from "../serial/serialPort";
import { Terminal } from "./terminal";
import * as colors from 'colors';
import { setting, serialPortAutoReconnectKey } from "../context/setting";
import { log } from "../logger";
import * as utils from "../utils";
import * as context from "../context/context";
import { setLogRecording } from "../view/logDecoration";

// 终端消息写入的是 VS Code 伪终端（Pseudoterminal），颜色由终端解析 ANSI 转义序列渲染，
// 与扩展宿主进程的 stdout 是否为 TTY 无关。
// colors 库默认根据 TERM/COLORTERM/CI 等环境变量自动判断是否启用颜色：
// Windows 下会无条件启用，而 Linux 下从图形界面启动 VS Code 时这些变量可能缺失或为 dumb，
// 从而导致 colors.enabled 为 false、所有颜色都被吞掉。这里显式启用，保证提示消息正常着色。
colors.enable();

class SerialTerminal {
    private serialport: SerialPort;
    private terminal: Terminal;
    private isPty: boolean;
    private logFile: Uri | undefined;
    private onClose: () => void = () => { };
    private onStateChange: () => void = () => { };
    private reconnectTimer: NodeJS.Timeout | undefined;
    private closed = false;

    private constructor(portPath: string, serialport: SerialPort, terminal: Terminal, isPty: boolean) {
        this.isPty = isPty;

        let cfg = serialport.config;

        serialport.addListener('open', () => {
            this.stopReconnect();
            terminal.write(SerialTerminal.connectedFormat(portPath, cfg));
            this.onStateChange();
        });
        serialport.addListener('data', (data) => {
            terminal.write(SerialTerminal.terminalFormat(data.toString()));
        });
        serialport.addListener('close', () => {
            terminal.write(SerialTerminal.disconnectedFormat(portPath, cfg));
            this.refreshReconnect();
            this.onStateChange();
        });

        terminal.addListener('close', () => {
            this.closed = true;
            this.stopReconnect();
            if (this.isRecordingLog()) {
                this.stopRecord();
            }
            serialport.close();
            this.onClose();
        });
        terminal.addListener('input', (data) => {
            serialport.write(data);
        });

        this.serialport = serialport;
        this.terminal = terminal;
        this.refreshReconnect();
    }

    // TODO: 可以考虑作为常量放在外面
    private static serialInfoFormat = (name: string, cfg: Configuration) => `${name} (${cfg.baudrate})`;
    private static terminalName = (name: string, cfg: Configuration) => `${this.serialInfoFormat(name, cfg)}`;
    private static terminalFormat = (text: string) => `${text.replace(/(\r?\n)/g, '\r\n')}`;

    private static connectedFormat = (name: string, cfg: Configuration) =>
        colors.green.bold(l10n.t('{0} CONNECTED', SerialTerminal.serialInfoFormat(name, cfg)) + '\r\n\r\n');
    private static disconnectedFormat = (name: string, cfg: Configuration) =>
        `\r\n${colors.red.bold(l10n.t('{0} DISCONNECTED', SerialTerminal.serialInfoFormat(name, cfg)))}\r\n`;
    private static failedFormat = (name: string, cfg: Configuration, message?: string) =>
        `${colors.red.bold(l10n.t('{0} OPEN FAILED!', SerialTerminal.serialInfoFormat(name, cfg)))}` +
        ` ${message ?? ''}\r\n`;

    private static configChangedFormat = (name: string, cfg: Configuration) =>
        `\r\n${colors.yellow.bold(l10n.t('{0} CONFIG CHANGED!', SerialTerminal.serialInfoFormat(name, cfg)))}\r\n`;

    recording: {
        timestamp: () => boolean,
        timeStampDurationNs: () => number,
        lastTimeStamp: bigint,
    } | undefined;

    static new(portPath: string, cfg: Configuration, isPty: boolean = false): Promise<SerialTerminal> {
        return new Promise<SerialTerminal>(async (resolve) => {
            let terminal = new Terminal(this.terminalName(portPath, cfg), isPty);

            // 延时
            await new Promise(resolve => setTimeout(resolve, 200));

            let serialport = await SerialPort.open(portPath, cfg, {
                success: () => { },
                error: (err) => {
                    console.error(`Failed to open serial port ${portPath}:`, err);
                    terminal.write(this.failedFormat(portPath, cfg, err.message));
                }
            });

            resolve(new SerialTerminal(portPath, serialport, terminal, isPty));
        });
    }

    private logCallback: (data: Buffer) => void = () => { };
    private timeStampFormat = (text: string) => `[${utils.getTimeStamp()}] ${text}`;
    private timeStampHandle = (text: string) => {
        // 计算与上次添加时间戳的时间差，单位为纳秒
        // 如果时间差大于等于设定的时间戳添加间隔，则在文本前添加时间戳
        // this.recording不能为空

        const currentTime = process.hrtime.bigint();
        let diff = currentTime - this.recording!.lastTimeStamp;

        // 更新最后一次计算时间戳的时间
        this.recording!.lastTimeStamp = currentTime;

        if (diff >= BigInt(this.recording!.timeStampDurationNs())) {
            return this.timeStampFormat(text);
        }
        return text;
    };

    private static sanitizeLogText(text: string): string {
        return text
            .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, '')   // OSC 序列
            .replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, '')            // CSI 序列（颜色等）
            .replace(/\x1B[@-_]/g, '')                            // 其他 ESC 序列
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');    // 控制字符，保留 \t \n \r
    }

    private logText(data: Buffer): string {
        const text = data.toString();
        return setting.filterSpecialChars ? SerialTerminal.sanitizeLogText(text) : text;
    }

    private buildCallback(logFile: Uri) {
        fs.writeFileSync(logFile.fsPath, '');

        if (!this.recording) { return; }
        if (this.recording.timestamp()) {
            this.logCallback = (data: Buffer) => {
                const text = this.timeStampHandle(this.logText(data));
                fs.appendFileSync(logFile.fsPath, text);
            };
        } else {
            this.logCallback = (data: Buffer) => {
                fs.appendFileSync(logFile.fsPath, this.logText(data));
            };
        }
    }

    beginRecord(logFile: Uri) {
        if (this.isRecordingLog()) {
            log.warn("Already recording log, stop current recording before starting a new one");
            return;
        }

        log.info(`Start recording log to ${logFile.fsPath}`);

        this.recording = {
            timestamp: () => setting.addingTimeStamp,
            timeStampDurationNs: () => setting.timeStampDurationNs,
            lastTimeStamp: process.hrtime.bigint(),
        };
        this.buildCallback(logFile);
        this.serialport.addListener('data', this.logCallback);

        this.logFile = logFile;
        setLogRecording(logFile, true);
        context.setSerialTerminalRecordingLog(true);
    }

    stopRecord() {
        if (!this.isRecordingLog()) {
            log.warn("Not recording log");
            return;
        }

        this.serialport.removeListener('data', this.logCallback);
        this.recording = undefined;
        if (this.logFile) {
            setLogRecording(this.logFile, false);
            this.logFile = undefined;
        }
        log.info("Stop recording log");
        context.setSerialTerminalRecordingLog(false);
    }

    serialConfig(): Configuration {
        return this.serialport.config;
    }

    private async checkAndReopen(quiet: boolean = false) {
        if (!this.serialport.isOpen && !this.serialport.isOpening) {
            const err = await this.serialport.reopen();
            if (err) {
                if (quiet) {
                    log.debug(`Auto reconnect failed for ${this.serialport.name}: ${err.message}`);
                } else {
                    log.error(`Failed to reopen serial port ${this.serialport.name}`);
                    this.terminal.write(SerialTerminal.failedFormat(this.serialport.name, this.serialConfig(), err.message));
                }
            }
        }
    }

    private static reconnectIntervalMs = 2000;

    /**
     * 根据设置与连接状态启动或停止自动重连。
     * 终端已关闭、设置关闭或已连接时停止定时器。
     */
    refreshReconnect(enabled: boolean = setting.serialPortAutoReconnect) {
        if (this.closed || !enabled || this.serialport.isOpen) {
            this.stopReconnect();
            return;
        }
        if (this.reconnectTimer) {
            return;
        }

        log.info(`Auto reconnect enabled for ${this.serialport.name}`);
        this.reconnectTimer = setInterval(() => {
            if (this.closed || !setting.serialPortAutoReconnect) {
                this.stopReconnect();
                return;
            }
            if (this.serialport.isOpen || this.serialport.isOpening) {
                return;
            }
            void this.checkAndReopen(true);
        }, SerialTerminal.reconnectIntervalMs);
    }

    private stopReconnect() {
        if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = undefined;
            log.info(`Auto reconnect stopped for ${this.serialport.name}`);
        }
    }

    async updateSerial(cfg?: Configuration) {
        log.info(`Updating serial port ${this.serialport.name} config with ${cfg ? cfg.toString() : 'current config'}`);
        this.checkAndReopen();

        if (cfg && this.serialport.update(cfg)) {
            log.info(`Serial port ${this.serialport.name} configuration updated`);
            this.terminal.write(SerialTerminal.configChangedFormat(this.serialport.name, cfg));
            // TODO： 目前串口配置改变后，终端名称不会改变，可以考虑在配置改变后更新终端名称
        }
    }

    async show() {
        // 如果串口没有打开，先尝试打开串口
        log.info(`Showing serial terminal for port ${this.serialport.name}`);
        this.checkAndReopen();
        if (!this.isPty) {
            this.terminal.show();
        }
    }

    close() {
        this.serialport.close();
        this.terminal.close();
    }

    getTerminalOptions() {
        return this.terminal.options;
    }

    portName() {
        return this.serialport.name;
    }

    isRecordingLog() {
        return !!this.recording;
    }

    isOpen(): boolean {
        return this.serialport.isOpen;
    }

    setOnCloseCallback(callback: () => void) {
        this.onClose = callback;
    }

    setOnStateChangeCallback(callback: () => void) {
        this.onStateChange = callback;
    }

    // for debug
    fmt = () => `SerialTerminal(port=${this.serialport.fmt()}, terminal=${this.terminal.fmt()}, isRecording=${this.isRecordingLog()})`;
}

class SerialTerminalManager {
    private terminals: Map<string, SerialTerminal> = new Map();
    private changeEmitter = new EventEmitter<void>();
    readonly onDidChangeTerminals = this.changeEmitter.event;

    constructor() {
        // 开关设置变化时立即更新已有终端的自动重连状态
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(serialPortAutoReconnectKey)) {
                const enabled = workspace.getConfiguration().get<boolean>(serialPortAutoReconnectKey, false);
                for (const terminal of this.terminals.values()) {
                    terminal.refreshReconnect(enabled);
                }
            }
        });
    }

    async getOrCreateSerialPortTerminal(portPath: string, cfg: Configuration, isPty: boolean = false): Promise<SerialTerminal> {
        let exist = this.terminals.get(portPath);
        if (exist) {
            log.info(`Serial terminal for port ${portPath} already exists, updating config and showing it`);

            await exist.updateSerial(cfg);
            await exist.show();
            this.changeEmitter.fire();
            return exist;
        }
        var serialTerminal = await SerialTerminal.new(portPath, cfg, isPty);
        serialTerminal.setOnCloseCallback(() => {
            log.info(`Serial terminal for port ${portPath} closed, removing from manager`);
            this.terminals.delete(portPath);
            this.changeEmitter.fire();
        });
        serialTerminal.setOnStateChangeCallback(() => this.changeEmitter.fire());

        this.terminals.set(portPath, serialTerminal);
        this.changeEmitter.fire();
        return serialTerminal;
    }

    getSerialPortTerminal(portPath: string): SerialTerminal | undefined {
        return this.terminals.get(portPath);
    }

    getSerialPortTerminalByTerminal(terminal: VsTerminal): SerialTerminal | undefined {
        for (let serialTerminal of this.terminals.values()) {
            if (serialTerminal.getTerminalOptions().name === terminal.name) {
                return serialTerminal;
            }
        }
        return undefined;
    }

    // for debug
    printfSerialPortTerminals() {
        log.info("Current serial port terminals:");
        for (let [portPath, serialTerminal] of this.terminals.entries()) {
            log.info(`- ${portPath}: ${serialTerminal.fmt()}`);
        }
    }
}


const serialTerminalManager = new SerialTerminalManager();

export {
    SerialTerminal,
    serialTerminalManager,
};