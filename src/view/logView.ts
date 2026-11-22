import * as vscode from 'vscode';
import { FileTreeDataProvider } from './FileTreeDataProvider';
import { setting } from '../context/setting';


function registerLogView(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("serialport.logs", {
        treeDataProvider: new FileTreeDataProvider(
            ['.txt', '.log'],
            () => setting.logSaveFolder,
            {
                command: "serialTerminal.logView.openOnEditor",
                readdirErrorMessagePrefix: vscode.l10n.t("Log path error: "),
                icon: new vscode.ThemeIcon("output"),
            }
        ),
        showCollapseAll: true,
        canSelectMany: true,
    });
    context.subscriptions.push(view);
}

export { registerLogView };