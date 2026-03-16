import * as vscode from 'vscode';
import * as fs from 'fs';
import { updateSerialPortProvider } from './view/serialPortView';
import { l10n } from 'vscode';
import { log } from './logger';
import { logSettingId, scriptSettingId, serialPortSettingId, setting } from './context/setting';
import { SerialTerminal, serialTerminalManager } from './terminal/serialTerminal';
import * as picker from './view/picker';

function registerCommands(context: vscode.ExtensionContext) {
    /* eslint-disable @typescript-eslint/naming-convention */
    const commands: { [key: string]: (...args: any[]) => any; } =
    {
        "serialTerminal.terminal.startSaveLog": startSaveLog,
        "serialTerminal.terminal.stopSaveLog": stopSaveLog,

        "serialTerminal.terminal.clear": () => vscode.commands.executeCommand("workbench.action.terminal.clear"),

        "serialTerminal.setting.SerialPort": () => vscode.commands.executeCommand("workbench.action.openSettings", serialPortSettingId),
        "serialTerminal.setting.Log": () => vscode.commands.executeCommand("workbench.action.openSettings", logSettingId),
        "serialTerminal.setting.Notebook": () => vscode.commands.executeCommand("workbench.action.openSettings", scriptSettingId),

        "serialTerminal.treeItem.openOnEditor": openTreeItemResource,
        "serialTerminal.treeItem.revealInExplorer": revealInExplorer,
        "serialTerminal.treeItem.deleteResource": deleteResource,

        "serialTerminal.serialView.open": openSerialTerminal,
        "serialTerminal.serialView.refresh": updateSerialPortProvider,

        "serialTerminal.logView.openOnEditor": openLogOnEditor,
        "serialTerminal.logView.revealLogs": async () => await vscode.commands.executeCommand("revealFileInOS", setting.logSaveFolder),

        "serialTerminal.scriptView.newNotebook": createScriptNotebook,
        "serialTerminal.scriptView.revealNotebooks": async () => await vscode.commands.executeCommand("revealFileInOS", setting.noteBookFolder),
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    for (const [id, handler] of Object.entries(commands)) {
        context.subscriptions.push(
            vscode.commands.registerCommand(id, handler)
        );
    }
}

async function openSerialTerminal(context: { label: string; }) {
    let exist = serialTerminalManager.getSerialPortTerminal(context.label);
    if (exist) {
        exist.show();
        return;
    }

    let cfg = await picker.pickConfiguration();
    if (!cfg) {
        log.error("No configuration selected");
        return;
    }

    let newTerminal: SerialTerminal;
    if (setting.autoSaveLog) {
        let logFile = await picker.pickLogFile(context.label);
        if (!logFile) {
            log.error("No log file selected");
            return;
        }

        newTerminal = await serialTerminalManager.getOrCreateSerialPortTerminal(context.label, cfg);
        await newTerminal.beginRecord(logFile);
    } else {
        newTerminal = await serialTerminalManager.getOrCreateSerialPortTerminal(context.label, cfg);
    }
    newTerminal.show();
}

async function startSaveLog(context?: any) {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        log.error("No active terminal");
        return;
    }

    let exist = serialTerminalManager.getSerialPortTerminalByTerminal(terminal);
    if (!exist) {
        log.error("Active terminal is not a serial port terminal");
        return;
    }

    let logFile = await picker.pickLogFile(exist.portName());
    log.info(`Selected log file: ${logFile}`);

    if (logFile) {
        await exist.beginRecord(logFile);
    }
}


async function stopSaveLog(context?: any) {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        log.error("No active terminal");
        return;
    }

    let exist = serialTerminalManager.getSerialPortTerminalByTerminal(terminal);
    if (!exist) {
        log.error("Active terminal is not a serial port terminal");
        return;
    }

    await exist.stopRecord();

}

function openTreeItemResource(context: vscode.TreeItem) {
    log.info(`Opening resource: ${context.resourceUri?.toString()}`);
    vscode.commands.executeCommand("vscode.open", context.resourceUri);
}

async function revealInExplorer(context: vscode.TreeItem) {
    log.info(`Revealing in explorer: ${context.resourceUri?.toString()}`);
    await vscode.commands.executeCommand("revealFileInOS", context.resourceUri);
}

async function createScriptNotebook() {
    const fileName = await vscode.window.showInputBox({
        title: l10n.t("Please enter the script notebook file name"),
        prompt: l10n.t("Only letters, numbers, `_` and `-` are allowed"),
        validateInput: (value: string) => {
            const result = value.match(/^[0-9a-zA-Z_-]*$/g)?.toString();
            return result ? undefined : l10n.t("Only letters, numbers, `_` and `-` are allowed");
        }
    });
    if (!fileName) {
        log.info("Script notebook creation cancelled: No file name provided");
        return false;
    }

    const scriptNotebookFile = vscode.Uri.joinPath(setting.noteBookFolder, fileName + ".mdnb");
    fs.writeFileSync(scriptNotebookFile.fsPath, "");
    vscode.commands.executeCommand("vscode.open", scriptNotebookFile);
}
async function deleteResource(context: vscode.TreeItem) {
    if (context.resourceUri) {
        await vscode.workspace.fs.delete(context.resourceUri, { recursive: true, useTrash: true });
    }
}

async function openLogOnEditor(context: vscode.TreeItem) {
    await vscode.commands.executeCommand("vscode.open", context.resourceUri);
    let editor = vscode.window.activeTextEditor;
    if (editor?.document.uri.toString() === context.resourceUri?.toString()) {
        vscode.commands.executeCommand("workbench.action.files.setActiveEditorReadonlyInSession");
    }
}


export { registerCommands };