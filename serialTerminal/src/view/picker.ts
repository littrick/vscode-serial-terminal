import { window, l10n, QuickPickItem, commands, QuickPickItemKind, QuickInputButton, Command, Uri } from "vscode";
import { listSerialPort } from "../serial/serialInfo";
import { Configuration } from "../serial/serialPort";
import { portConfigurationsKey, setting } from "../context/setting";
import { log } from "../logger";
import { SerialPortCfg } from "../serial/serialConfiguration";
import * as utils from "../utils";


async function pickSerialPort(): Promise<string | undefined> {
    const serialPortItems: Thenable<QuickPickItem[]> = new Promise((resolve, reject) => {
        listSerialPort().then((ports) => {
            const portItems: QuickPickItem[] = ports.map((port) => {
                return { label: port.path, description: port.manufacturer };
            });
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
    return new Promise((resolve, reject) => {
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
    let serialportPath = prefix.replace(/[\/\\:]/g, '_');
    let date = utils.getTimeStamp().replace(/[\/:]/g, '').replace(/ /g, '_');

    let fileName = await window.showInputBox({
        title: l10n.t("Please enter the log file name"),
        value: `${serialportPath}_${date}`,
        valueSelection: [0, serialportPath.length],
        prompt: l10n.t("Only letters, numbers, `_` and `-` are allowed"),
        validateInput: (value: string) => {
            const result = value.match(/^[0-9a-zA-Z_-]*$/g)?.toString();
            return result ? undefined
                : l10n.t("Only letters, numbers, `_` and `-` are allowed");
        }
    });

    return fileName ? Uri.joinPath(setting.logSaveFolder, fileName + ".log") : undefined;
}

export {
    pickSerialPort,
    pickConfiguration,
    pickLogFile,
};