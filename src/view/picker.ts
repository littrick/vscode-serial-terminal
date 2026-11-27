import { window, l10n, QuickPickItem, commands, QuickPickItemKind, QuickInputButton, Command, Uri } from "vscode";
import { listSerialPort, serialPortPriority, sortSerialPorts } from "../serial/serialInfo";
import { Configuration } from "../serial/serialPort";
import { portConfigurationsKey, setting } from "../context/setting";
import { log } from "../logger";
import { SerialPortCfg } from "../serial/serialConfiguration";
import { validateFileName } from "./fileNameValidation";


async function pickSerialPort(): Promise<string | undefined> {
    const serialPortItems: Thenable<QuickPickItem[]> = new Promise((resolve, reject) => {
        listSerialPort().then((ports) => {
            const portItems: QuickPickItem[] = [];
            let lastPriority: number | undefined;
            // 按优先级分组，组间插入分割线（例如 USB 串口与蓝牙串口之间）
            for (const port of sortSerialPorts(ports)) {
                const priority = serialPortPriority(port);
                if (lastPriority !== undefined && priority !== lastPriority) {
                    portItems.push({ label: "", kind: QuickPickItemKind.Separator });
                }
                portItems.push({ label: port.path, description: port.manufacturer });
                lastPriority = priority;
            }
            resolve(portItems);
        }).catch((error) => {
            reject(error);
        });
    });

    let port = await window.showQuickPick(serialPortItems, { placeHolder: l10n.t("please select a serial port") });
    return port ? port.label : undefined;
}


interface CommandQuickPickItem extends QuickPickItem {
    label: string;
    kind?: QuickPickItemKind | undefined;
    description?: string | undefined;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;
    buttons?: readonly QuickInputButton[] | undefined;
    command?: Command;
}

async function pickConfiguration(): Promise<Configuration | undefined> {
    let selection = await window.showQuickPick(portPickConfigurations(), { placeHolder: l10n.t("please select a baudrate") });

    if (!selection) {
        log.error("No configuration selected");
        return;
    }

    if (selection?.command) {
        if (selection.command.arguments) {
            commands.executeCommand(selection.command.command, ...(selection.command.arguments));
        } else {
            commands.executeCommand(selection.command.command);
        }
        return;
    }

    let cfg = SerialPortCfg.parse(selection.label);
    if (!cfg) {
        log.error(`Invalid configuration selected: ${selection.label}`);
        return;
    }

    log.info(`Selected configuration: ${JSON.stringify(cfg)}`);
    return cfg;

}

function portPickConfigurations(): Thenable<CommandQuickPickItem[]> {
    return new Promise((resolve) => {
        const items: CommandQuickPickItem[] = setting.portConfigurations.map((value) => { return { label: value }; });

        let separator: CommandQuickPickItem[] = [{
            label: "",
            kind: QuickPickItemKind.Separator,
        },
        {
            label: `$(add) ${l10n.t("Adding a new serial port configuration")}`,
            command: {
                title: "add",
                command: "workbench.action.openSettings",
                arguments: [portConfigurationsKey]
            }
        },
        ];

        items.push(...separator);

        log.info(`Loaded serial port configurations: ${items.map(i => i.label).join(", ")}`);
        resolve(items);
    });
}

async function pickLogFile(prefix: string): Promise<Uri | undefined> {
    const serialportPath = prefix.replace(/[\/\\:]/g, '_');
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const value = `${date}_${serialportPath}_${time}`;

    const fileName = (await window.showInputBox({
        title: l10n.t("Please enter the log file name"),
        value: value,
        valueSelection: [date.length + 1, date.length + 1 + serialportPath.length],
        validateInput: validateFileName,
    }))?.trim();

    return fileName ? Uri.joinPath(setting.logSaveFolder, fileName + ".log") : undefined;
}

export {
    pickSerialPort,
    pickConfiguration,
    pickLogFile,
};