import * as vscode from 'vscode';
import { FileTreeDataProvider } from './FileTreeDataProvider';
import { FileDragAndDropController } from './fileDragAndDrop';
import { setting } from '../context/setting';

let scriptTreeView: vscode.TreeView<vscode.TreeItem> | undefined;

/**
 * 返回脚本视图中当前选中的目录。
 * 未选中目录（或选中的是文件）时返回 undefined，由调用方回退到根目录。
 */
function getSelectedScriptFolder(): vscode.Uri | undefined {
    const folder = scriptTreeView?.selection.find(
        (item) => item.contextValue === 'scriptFolder' && item.resourceUri
    );
    return folder?.resourceUri;
}

function registerScriptView(context: vscode.ExtensionContext) {
    const provider = new FileTreeDataProvider(
        ['.scrnb', '.mdnb', '.md'],
        () => setting.noteBookFolder,
        {
            command: "serialTerminal.treeItem.openOnEditor",
            readdirErrorMessagePrefix: vscode.l10n.t("Script path error: "),
            icon: new vscode.ThemeIcon("notebook"),
            contextValuePrefix: "script",
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
    scriptTreeView = view;
    context.subscriptions.push(
        view,
        provider,
        vscode.commands.registerCommand("serialTerminal.scriptView.refresh", () => provider.refresh())
    );
}

export { registerScriptView, getSelectedScriptFolder };
