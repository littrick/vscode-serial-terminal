import * as vscode from 'vscode';
import { FileTreeDataProvider } from './FileTreeDataProvider';
import { FileDragAndDropController } from './fileDragAndDrop';
import { setting } from '../context/setting';

function registerScriptView(context: vscode.ExtensionContext) {
    const provider = new FileTreeDataProvider(
        ['.scrnb', '.mdnb', '.md'],
        () => setting.noteBookFolder,
        {
            command: "serialTerminal.treeItem.openOnEditor",
            readdirErrorMessagePrefix: vscode.l10n.t("Script path error: "),
            icon: new vscode.ThemeIcon("notebook"),
        }
    );
    const view = vscode.window.createTreeView("serialport.scriptsNotebooks", {
        treeDataProvider: provider,
        showCollapseAll: true,
        canSelectMany: true,
        dragAndDropController: new FileDragAndDropController(
            "application/vnd.code.tree.serialport.scriptsnotebooks",
            () => setting.noteBookFolder,
            () => provider.refresh()
        ),
    });
    context.subscriptions.push(view, provider);
}

export { registerScriptView };