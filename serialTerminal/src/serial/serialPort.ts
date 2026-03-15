import { EventEmitter } from "vscode";
import { log } from "../logger";
import { SerialPort as NativeSerialPort } from "serialport";
import { resolve } from "path";

interface Configuration {
    baudrate: number,
    parity: 'none' | 'even' | 'odd',
    dataBits: 5 | 6 | 7 | 8,
    stopBits: 1 | 1.5 | 2,

    toString(): string;
    equal(other: Configuration): boolean;
}

class SerialPort {
    private serialPortInstance: NativeSerialPort;
    private portPath: string;
    private cfg: Configuration;

    private onOpen: Set<() => void> = new Set;
    private onData: Set<(data: Buffer) => void> = new Set;
    private onClose: Set<() => void> = new Set;

    private constructor(serial: NativeSerialPort, portPah: string, cfg: Configuration) {
        this.serialPortInstance = serial;
        this.portPath = portPah;
        this.cfg = cfg;
        this.init();
    }

    init() {
        this.serialPortInstance.on('open', () => {
            this.onOpen.forEach(callback => callback());
        });

        this.serialPortInstance.on('data', (data) => {
            this.onData.forEach(callback => callback(data));
        });

        this.serialPortInstance.on('close', () => {
            this.onClose.forEach(callback => callback());
        });
    }

    static open(portPath: string, cfg: Configuration, callback?: {
        success: () => void,
        error: (err: Error) => void;
    }): SerialPort {
        let sp = SerialPort.openSerialPort(portPath, cfg, callback);
        return new SerialPort(sp, portPath, cfg);
    }

    static openSerialPort(portPath: string, cfg: Configuration, callback?: {
        success: () => void,
        error: (err: Error) => void;
    }): NativeSerialPort {
        let sp: NativeSerialPort;

        let openCallBack = (err: Error | null) => {
            log.info(`Serial port is open(${sp.isOpen}): ${portPath} ${cfg.toString()}`);
            if (sp.isOpen) {
                callback?.success();
            } else {
                callback?.error(err || new Error('Unknown error'));
            }
        };

        sp = new NativeSerialPort({
            path: portPath,
            baudRate: cfg.baudrate,
            parity: cfg.parity,
            dataBits: cfg.dataBits,
            stopBits: cfg.stopBits,
        }, openCallBack);

        return sp;
    }

    addListener(event: 'open', callback: () => void): this;
    addListener(event: 'data', callback: (data: Buffer) => void): this;
    addListener(event: 'close', callback: () => void): this;
    addListener(event: 'open' | 'data' | 'close', callback: Function): this {
        switch (event) {
            case 'open':
                this.onOpen.add(callback as () => void);
                break;
            case 'data':
                this.onData.add(callback as (data: Buffer) => void);
                break;
            case 'close':
                this.onClose.add(callback as () => void);
                break;
        }
        return this;
    }

    removeListener(event: 'open', callback: () => void): boolean;
    removeListener(event: 'data', callback: (data: Buffer) => void): boolean;
    removeListener(event: 'close', callback: () => void): boolean;
    removeListener(event: 'open' | 'data' | 'close', callback: Function): boolean {
        switch (event) {
            case 'open':
                return this.onOpen.delete(callback as () => void);
            case 'data':
                return this.onData.delete(callback as (data: Buffer) => void);
            case 'close':
                return this.onClose.delete(callback as () => void);
        }
    }

    write(data: string | Buffer): void {
        this.serialPortInstance.write(data);
    }

    close() {
        this.serialPortInstance.close();
    }

    async reopen(): Promise<Error | null> {
        return new Promise<Error | null>((resolve) => {
            this.serialPortInstance.open((err) => {
                if (err) {
                    log.error(`Failed to reopen serial port ${this.serialPortInstance.path}:`, err);
                } else {
                    log.info(`Serial port ${this.serialPortInstance.path} reopened successfully`);
                }
                resolve(err);
            });
        });
    }

    update(cfg: Configuration): boolean {
        // eslint-disable-next-line eqeqeq
        if (this.cfg.equal(cfg)) {
            log.info(`Serial port configuration is the same, no need to update`);
            return false;
        }

        if (this.cfg.baudrate !== cfg.baudrate && this.cfg.dataBits === cfg.dataBits
            && this.cfg.parity === cfg.parity && this.cfg.stopBits === cfg.stopBits) {
            log.info(`Updating serial port baudrate to ${cfg.baudrate}`);

            this.serialPortInstance.update({ baudRate: cfg.baudrate });
            this.cfg.baudrate = cfg.baudrate;
            return true;
        }
        log.info(`Serial port configuration changed, need to reopen the serial port`);

        this.serialPortInstance.close();
        let sp = SerialPort.openSerialPort(this.portPath, cfg);
        this.serialPortInstance = sp;
        this.init();
        this.cfg = cfg;
        return true;
    }

    get name(): string {
        return this.portPath;
    }

    get isOpen(): boolean {
        return this.serialPortInstance.isOpen;
    }

    get isOpening(): boolean {
        return this.serialPortInstance.opening;
    }

    get config(): Configuration {
        return this.cfg;
    }

    // for debug
    fmt = () => `SerialPort(name=${this.portPath}, isOpen=${this.isOpen}, config=${this.cfg.toString()})`;
}

export {
    SerialPort,
    Configuration
};