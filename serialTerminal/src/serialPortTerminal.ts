import { PseudoTerminal } from "./PseudoTerminal";
import { l10n } from 'vscode';
import * as vscode from 'vscode';
import * as colors from 'colors';
import * as fs from 'fs';
import { SerialPort } from "serialport";
import { getLogDefaultAddingTimeStamp, getLogDirUri } from "./settingManager";
import { SerialPortConfiguration, pickConfiguration, pickSerialPort } from "./serialPortView";

const terminalNamePrefix = "PORT: ";

function isSerialPortTerminal(terminalName: String): boolean {
    return terminalName.match(`^${terminalNamePrefix}.*`) ? true : false;
}

async function listSerialPort() {
    return SerialPort.list();
}

function serialPortInfo2String(portInfo: import("@serialport/bindings-cpp").PortInfo): string {
    let info = new Map<string, string>();
    let portInfoAny = portInfo as any;

    if (portInfoAny.friendlyName) { info.set("Name", portInfoAny.friendlyName); }
    if (portInfoAny.path) { info.set("Path", portInfoAny.path); }
    if (portInfoAny.manufacturer) { info.set("Manufacturer", portInfoAny.manufacturer); }
    if (portInfoAny.vendorId) { info.set("VendorId", portInfoAny.vendorId); }
    if (portInfoAny.productId) { info.set("ProductId", portInfoAny.productId); }
    if (portInfoAny.serialNumber) { info.set("SerialNumber", portInfoAny.serialNumber); }
    if (portInfoAny.pnpId) { info.set("PnpId", portInfoAny.pnpId); }
    if (portInfoAny.locationId) { info.set("LocationId", portInfoAny.locationId); }

    let maxWidth = 0;
    info.forEach((_, key) => {
        maxWidth = Math.max(key.length, maxWidth);
    });

    let infoString = "";
    info.forEach((value, key) => {
        infoString += `${l10n.t(key)}: ${value}\n`;
    });


    return infoString;
}

interface ISerialPortTerminal {
    readonly state: { loging: boolean; timeStamp: boolean; hex: boolean; };
    readonly serialport: SerialPort;
    readonly terminal: PseudoTerminal;
    open(): void;
    startLogging(timeStamp?: boolean): Promise<boolean>;
    stopLogging(): boolean;
    setCloseCallback(callback?: () => void): void;
}

class SerialPortTerminal implements ISerialPortTerminal {
    private constructor(serialPort: SerialPort, pseudo: boolean = false) {
        this.state = {
            loging: false,
            timeStamp: getLogDefaultAddingTimeStamp(),
            hex: false,
        };
        this.serialport = serialPort;
        let opts = pseudo ? { create: false } : undefined;
        this.terminal = new PseudoTerminal(terminalNamePrefix + serialPort.path, opts);
        this.init();
    }

    private init() {
        this.terminal.setOnInput(
            (data) => this.serialport.write(data)
        );
        this.terminal.setOnOpen(() => {
            this.terminal.write(this.serialport.isOpen ?
                colors.green.bold(l10n.t('({0}) CONNECTED', this.serialport.path) + '\r\n\r\n')
                : colors.red.bold(l10n.t('({0}) OPEN FAILED!', this.serialport.path) + '\r\n\r\n'));
        });
        this.terminal.setOnClose(() => {
            this.serialport.close();
            if (this.closeCallback) { this.closeCallback(); };
        });

        this.serialport.addListener("data", (data) =>
            this.terminal.write(this.terminalFormat(data.toString()))
        );

        this.serialport.on("close", () => {
            this.terminal.write(colors.red.bold(
                "\n" + l10n.t("({0}) CLOSED!", this.serialport.path) + '\r\n\r\n'));
        }
        );
    }

    static async new(portPath: string, cfg: SerialPortConfiguration): Promise<ISerialPortTerminal> {
        return new Promise<SerialPortTerminal>((resolve, reject) => {
            let serialPort: SerialPort;
            let openCallBack = () => {
                resolve(new SerialPortTerminal(serialPort));
            };

            /* bug: If dataBits is assigned to undefined, opening the serial port fails, so... */
            if (cfg.dataBits) {
                serialPort = new SerialPort({
                    path: portPath,
                    baudRate: cfg.baudrate,
                    parity: cfg.parity,
                    dataBits: cfg.dataBits,
                    stopBits: cfg.stopBits,
                }, openCallBack);
            } else {
                serialPort = new SerialPort({
                    path: portPath,
                    baudRate: cfg.baudrate,
                    parity: cfg.parity,
                    stopBits: cfg.stopBits,
                }, openCallBack);
            }
        });
    }

    static async newOpt(): Promise<ISerialPortTerminal> {
        return new Promise<ISerialPortTerminal>(async (resolve, reject) => {
            const portPath = await pickSerialPort();
            if (!portPath) { reject(); return; }
            const cfg = await pickConfiguration();
            if (!cfg) { reject(); return; }
            let serialPort: SerialPort;
            let openCallBack = () => {
                const serialPortTerminal = new SerialPortTerminal(serialPort, true);
                if (serialPortTerminal.terminal.options) { resolve(serialPortTerminal); }
                else { reject(); }
            };

            /* bug: If dataBits is assigned to undefined, opening the serial port fails, so... */
            if (cfg.dataBits) {
                serialPort = new SerialPort({
                    path: portPath,
                    baudRate: cfg.baudrate,
                    parity: cfg.parity,
                    dataBits: cfg.dataBits,
                    stopBits: cfg.stopBits,
                }, openCallBack);
            } else {
                serialPort = new SerialPort({
                    path: portPath,
                    baudRate: cfg.baudrate,
                    parity: cfg.parity,
                    stopBits: cfg.stopBits,
                }, openCallBack);
            }
        });
    }

    setCloseCallback(callback?: () => void): void { this.closeCallback = callback; }

    state: { loging: boolean; timeStamp: boolean; hex: boolean; };

    open(): void {
        if (this.serialport.isOpen) { return; }
        this.serialport.open(() => {
            this.terminal.write(this.serialport.isOpen ?
                colors.green.bold(l10n.t('({0}) CONNECTED', this.serialport.path) + '\r\n\r\n')
                : colors.red.bold(l10n.t('({0}) OPEN FAILED!', this.serialport.path) + '\r\n\r\n'));
        });
    }

    private getTime() {
        return new Date().toLocaleString('zh', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    private getTimeStamp(): string { return `[${this.getTime()}] `; }

    private async getLogUri(): Promise<vscode.Uri | undefined> {
        let fileName = await vscode.window.showInputBox({
            title: l10n.t("Please enter the log file name"),
            value: "general_" + this.getTime().replace(/[\/:]/g, '').replace(/ /g, '_'),
            valueSelection: [0, 7],
            prompt: l10n.t("Only letters, numbers, `_` and `-` are allowed"),
            validateInput: (value: string) => {
                const result = value.match(/^[0-9a-zA-Z_-]*$/g)?.toString();
                return result ? undefined
                    : l10n.t("Only letters, numbers, `_` and `-` are allowed");
            }
        });
        if (fileName) {
            return vscode.Uri.joinPath(getLogDirUri(), fileName + ".log");
        } else { return undefined; }
    }

    private getLogCallBack(logUri: vscode.Uri) {
        fs.writeFileSync(logUri.fsPath, "");
        if (this.state.timeStamp) {
            return (data: any) => {
                fs.appendFileSync(
                    logUri.fsPath,
                    data.toString()
                        .replaceAll('\r', '')
                        .replaceAll('\n', '\n' + this.getTimeStamp()));
            };
        } else {
            return (data: any) => {
                fs.appendFileSync(logUri.fsPath, data.toString().replaceAll('\r', ''));
            };
        }
    }

    async startLogging(timeStamp?: boolean | undefined): Promise<boolean> {
        if (this.state.loging) { return this.state.loging; }
        const logUri = await this.getLogUri();
        if (!logUri) { return this.state.loging; } else {
            this.logUri = logUri;
        }
        if (timeStamp) { this.state.timeStamp = timeStamp; }
        this.logCallBack = this.getLogCallBack(this.logUri);
        this.serialport.addListener("data", this.logCallBack);
        this.state.loging = true;
        return this.state.loging;
    }

    stopLogging(): boolean {
        if (!this.state.loging) { return false; }
        this.serialport.removeListener("data", this.logCallBack);
        vscode.window.showInformationMessage(
            l10n.t("The logs have been saved in {0}", this.logUri.fsPath));
        this.state.loging = false;
        return this.state.loging;
    }

    serialport: SerialPort;
    terminal: PseudoTerminal;

    private terminalFormat = (text: string) => `${text.replace(/(\r?\n)/g, '\r\n')}`;

    private logUri: vscode.Uri = vscode.Uri.file("");
    private logCallBack: (data: any) => void = () => { };
    private closeCallback?: () => void;
}

export {
    SerialPortConfiguration,
    ISerialPortTerminal,
    SerialPortTerminal,
    listSerialPort,
    isSerialPortTerminal,
    terminalNamePrefix,
    serialPortInfo2String
};