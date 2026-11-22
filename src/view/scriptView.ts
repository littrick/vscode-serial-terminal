import * as vscode from 'vscode';
import { FileTreeDataProvider } from './FileTreeDataProvider';
import { setting } from '../context/setting';

function registerScriptView(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("serialport.scriptsNotebooks", {
        treeDataProvider: new FileTreeDataProvider(
            ['.scrnb', '.mdnb', '.md'],
            () => setting.noteBookFolder,
            {
                command: "serialTerminal.treeItem.openOnEditor",
                readdirErrorMessagePrefix: vscode.l10n.t("Script path error: "),
                icon: new vscode.ThemeIcon("notebook"),
            }
        ),
        showCollapseAll: true,
        canSelectMany: true,
    });
    context.subscriptions.push(view);
}

export { registerScriptView };