import { SerialPort } from "serialport";
import { l10n } from "vscode";


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
 * Windows 下把真实的 USB 串口排在前面，蓝牙串口（通常只有配对的设备在线时才可用）放到最后。
 */
function serialPortPriority(port: SerialInfo): number {
    if (process.platform !== 'win32') {
        return 0;
    }

    const pnpId = (port.pnpId ?? '').toUpperCase();
    if (pnpId.startsWith('USB\\')) {
        return 0;
    }
    if (pnpId.startsWith('BTHENUM\\')) {
        return 2;
    }
    return 1;
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
};