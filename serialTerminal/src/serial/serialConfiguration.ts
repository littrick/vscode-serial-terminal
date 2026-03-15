import { log } from "../logger";
import { Configuration } from "./serialPort";

class SerialPortCfg implements Configuration {
    baudrate: number;
    parity: 'none' | 'even' | 'odd';
    dataBits: 5 | 6 | 7 | 8;
    stopBits: 1 | 1.5 | 2;

    static reg = /^(\d+)(?:(n|e|o)([5678])?(1|1.5|2)?)?$/;

    constructor(baudrate: number, parity: 'none' | 'even' | 'odd', dataBits: 5 | 6 | 7 | 8, stopBits: 1 | 1.5 | 2) {
        this.baudrate = baudrate;
        this.parity = parity;
        this.dataBits = dataBits;
        this.stopBits = stopBits;
    }

    toString() {
        let parity = '';
        let dataBits = this.dataBits?.toString();
        let stopBits = this.stopBits?.toString();

        switch (this.parity) {
            case 'none':
                parity = 'n';
                break;
            case 'even':
                parity = 'e';
                break;
            case 'odd':
                parity = 'o';
                break;
            default:
                parity = 'n';
        }

        return `${this.baudrate}${parity}${dataBits}${stopBits}`;
    }

    equal(other: Configuration): boolean {
        return this.baudrate === other.baudrate &&
            this.parity === other.parity &&
            this.dataBits === other.dataBits &&
            this.stopBits === other.stopBits;
    }

    static parse(configStr: string): Configuration | undefined {
        let matches = this.reg.exec(configStr);
        log.info(`Parsing configuration string: ${configStr}, matches found: ${matches ? matches.length : 0}`);

        if (matches) {
            const [_fullMatch, baudrateStr, parityStr, dataBitsStr, stopBitsStr] = matches;
            log.info(`Parsing configuration string: baudrate=${baudrateStr}, parity=${parityStr}, dataBits=${dataBitsStr}, stopBits=${stopBitsStr}`);

            let baudrate: number;
            let parity: 'none' | 'even' | 'odd';
            let dataBits: 5 | 6 | 7 | 8;
            let stopBits: 1 | 1.5 | 2;

            baudrate = parseInt(baudrateStr);

            switch (parityStr) {
                case 'n':
                    parity = 'none';
                    break;
                case 'e':
                    parity = 'even';
                    break;
                case 'o':
                    parity = 'odd';
                    break;
                default:
                    parity = 'none';
                    break;
            }
            const parsedDataBits = parseInt(dataBitsStr);
            dataBits = [5, 6, 7, 8].includes(parsedDataBits) ? parsedDataBits as 5 | 6 | 7 | 8 : 8;

            const parsedStopBits = parseFloat(stopBitsStr);
            stopBits = [1, 1.5, 2].includes(parsedStopBits) ? parsedStopBits as 1 | 1.5 | 2 : 1;

            return new SerialPortCfg(baudrate, parity, dataBits, stopBits);
        }
        return undefined;
    }
}

export {
    SerialPortCfg
};
