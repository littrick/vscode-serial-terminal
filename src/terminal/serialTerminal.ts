import { EventEmitter, l10n, Uri, Terminal as VsTerminal } from "vscode";
import * as fs from 'fs';
import { Configuration, SerialPort } from "../serial/serialPort";
import { Terminal } from "./terminal";
import * as colors from 'colors';
import { setting } from "../context/setting";
import { log } from "../logger";
import * as utils from "../utils";
import * as context from "../context/context";

class SerialTerminal {
    private serialport: SerialPort;
    private terminal: Terminal;
    private isPty: boolean;
    private onClose: () => void = () => { };

    private constructor(portPath: string, serialport: SerialPort, terminal: Terminal, isPty: boolean) {
        this.isPty = isPty;

        let cfg = serialport.config;

        serialport.addListener('open', () => {
            terminal.write(SerialTerminal.connectedFormat(portPath, cfg));
        });
        serialport.addListener('data', (data) => {
            terminal.write(SerialTerminal.terminalFormat(data.toString()));
        });
        serialport.addListener('close', () => {
            terminal.write(SerialTerminal.disconnectedFormat(portPath, cfg));
        });

        terminal.addListener('close', () => {
            serialport.close();
            this.onClose();
        });
        terminal.addListener('input', (data) => {
            serialport.write(data);
        });

        this.serialport = serialport;
        this.terminal = terminal;
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
        return new Promise<SerialTerminal>(async (resolve, reject) => {
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

    private buildCallback(logFile: Uri) {
        fs.writeFileSync(logFile.fsPath, '');

        if (!this.recording) { return; }
        if (this.recording.timestamp()) {
            this.logCallback = (data: Buffer) => {
                const text = this.timeStampHandle(data.toString());
                fs.appendFileSync(logFile.fsPath, text);
            };
        } else {
            this.logCallback = (data: Buffer) => {
                fs.appendFileSync(logFile.fsPath, data.toString());
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

        context.setSerialTerminalRecordingLog(true);
    }

    stopRecord() {
        if (!this.isRecordingLog()) {
            log.warn("Not recording log");
            return;
        }

        this.serialport.removeListener('data', this.logCallback);
        this.recording = undefined;
        log.info("Stop recording log");
        context.setSerialTerminalRecordingLog(false);
    }

    serialConfig(): Configuration {
        return this.serialport.config;
    }

    private async checkAndReopen() {
        if (!this.serialport.isOpen && !this.serialport.isOpening) {
            const err = await this.serialport.reopen();
            if (err) {
                log.error(`Failed to reopen serial port ${this.serialport.name}`);
                this.terminal.write(SerialTerminal.failedFormat(this.serialport.name, this.serialConfig(), err.message));
            }
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

    setOnCloseCallback(callback: () => void) {
        this.onClose = callback;
    }

    // for debug
    fmt = () => `SerialTerminal(port=${this.serialport.fmt()}, terminal=${this.terminal.fmt()}, isRecording=${this.isRecordingLog()})`;
}

class SerialTerminalManager {
    private terminals: Map<string, SerialTerminal> = new Map();

    async getOrCreateSerialPortTerminal(portPath: string, cfg: Configuration, isPty: boolean = false): Promise<SerialTerminal> {
        let exist = this.terminals.get(portPath);
        if (exist) {
            log.info(`Serial terminal for port ${portPath} already exists, updating config and showing it`);

            await exist.updateSerial(cfg);
            await exist.show();
            return exist;
        }
        var serialTerminal = await SerialTerminal.new(portPath, cfg, isPty);
        serialTerminal.setOnCloseCallback(() => {
            log.info(`Serial terminal for port ${portPath} closed, removing from manager`);
            this.terminals.delete(portPath);
        });

        this.terminals.set(portPath, serialTerminal);
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