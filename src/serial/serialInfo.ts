import { SerialPort } from "serialport";
import { l10n } from "vscode";
import { compareNames } from "../utils";


interface SerialInfo {
    path: string;
    manufacturer?: string;
    serialNumber?: string;
    pnpId?: string;
    locationId?: string;
    vendorId?: string;
    productId?: string;
}

async function listSerialPort(): Promise<SerialInfo[]> {
    return SerialPort.list();
}

/**
 * 串口排序优先级，数字越小越靠前。
 * 优先展示真实的 USB 串口，蓝牙串口（通常只有配对的设备在线时才可用）放到最后。
 */
function serialPortPriority(port: SerialInfo): number {
    if (process.platform === 'win32') {
        const pnpId = (port.pnpId ?? '').toUpperCase();
        if (pnpId.startsWith('USB\\')) {
            return 0;
        }
        if (pnpId.startsWith('BTHENUM\\')) {
            return 2;
        }
        return 1;
    }

    if (process.platform === 'linux') {
        const name = port.path.split('/').pop()?.toLowerCase() ?? '';
        // USB 串口：ttyUSB / ttyACM / ttyXRUSB / ttyWCH
        if (/^tty(usb|acm|xrusb|wch)/.test(name)) {
            return 0;
        }
        // 蓝牙串口
        if (name.startsWith('rfcomm')) {
            return 3;
        }
        // 传统 PC 串口（ttyS0、ttyS1...），通常包含大量未实际引出的端口
        if (/^ttys\d+/.test(name)) {
            return 2;
        }
        // 其他：SoC / 板载 UART（ttyAMA、ttyMFD、ttyO 等）
        return 1;
    }

    return 0;
}

/**
 * 串口排序：可用性优先（USB 串口在前、蓝牙串口在后），同优先级按名称自然排序。
 * 串口视图与选择列表共用同一规则。
 */
function sortSerialPorts(ports: SerialInfo[]): SerialInfo[] {
    return [...ports].sort((a, b) => {
        const priorityDiff = serialPortPriority(a) - serialPortPriority(b);
        return priorityDiff !== 0 ? priorityDiff : compareNames(a.path, b.path);
    });
}

function serialInfoToString(serialInfo: SerialInfo): string {
    /* eslint-disable @typescript-eslint/naming-convention */
    let infoTable: { [key: string]: string | undefined; } = {
        "Path": serialInfo.path,
        "Manufacturer": serialInfo.manufacturer,
        "SerialNumber": serialInfo.serialNumber,
        "PnpId": serialInfo.pnpId,
        "LocationId": serialInfo.locationId,
        "VendorId": serialInfo.vendorId,
        "ProductId": serialInfo.productId,
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    let infoString = "";
    for (let key in infoTable) {
        if (infoTable[key]) {
            infoString += `${l10n.t(key)}: ${infoTable[key]}\n`;
        }
    }
    return infoString;
}


export {
    SerialInfo,
    serialInfoToString,
    listSerialPort,
    serialPortPriority,
    sortSerialPorts,
};