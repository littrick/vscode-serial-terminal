import * as vscode from 'vscode';
import { FileTreeDataProvider } from './FileTreeDataProvider';
import { FileDragAndDropController } from './fileDragAndDrop';
import { setting } from '../context/setting';


function registerLogView(context: vscode.ExtensionContext) {
    const provider = new FileTreeDataProvider(
        ['.txt', '.log'],
        () => setting.logSaveFolder,
        {
            command: "serialTerminal.logView.openOnEditor",
            readdirErrorMessagePrefix: vscode.l10n.t("Log path error: "),
            icon: new vscode.ThemeIcon("output"),
        }
    );
    const view = vscode.window.createTreeView("serialport.logs", {
        treeDataProvider: provider,
        showCollapseAll: true,
        canSelectMany: true,
        dragAndDropController: new FileDragAndDropController(
            "application/vnd.code.tree.serialport.logs",
            () => setting.logSaveFolder,
            () => provider.refresh()
        ),
    });
    context.subscriptions.push(view, provider);
}

export { registerLogView };