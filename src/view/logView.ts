import * as vscode from 'vscode';
import { FileTreeDataProvider } from './FileTreeDataProvider';
import { FileDragAndDropController } from './fileDragAndDrop';
import { setting } from '../context/setting';

let logProvider: FileTreeDataProvider | undefined;

function refreshLogView() {
    logProvider?.refresh();
}

function registerLogView(context: vscode.ExtensionContext) {
    const provider = new FileTreeDataProvider(
        ['.txt', '.log'],
        () => setting.logSaveFolder,
        {
            command: "serialTerminal.treeItem.openOnEditor",
            readdirErrorMessagePrefix: vscode.l10n.t("Log path error: "),
            icon: new vscode.ThemeIcon("output"),
            contextValuePrefix: "log",
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
    logProvider = provider;
    context.subscriptions.push(view, provider);
}

export { registerLogView, refreshLogView };