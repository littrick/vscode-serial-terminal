import * as vscode from 'vscode';
import { FileTreeDataProvider } from './FileTreeDataProvider';
import { setting } from '../context/setting';

function registerScriptView(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider(
            "serialport.scriptsNotebooks",
            new FileTreeDataProvider(
                ['.scrnb'],
                () => setting.noteBookFolder,
                {
                    command: "serialTerminal.treeItem.openOnEditor",
                    readdirErrorMessagePrefix: vscode.l10n.t("Script path error: "),
                    icon: new vscode.ThemeIcon("notebook"),
                }
            )
        )
    );
}

export { registerScriptView };