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
};