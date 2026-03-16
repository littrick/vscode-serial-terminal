import * as vscode from 'vscode';
import { FileTreeDataProvider } from './FileTreeDataProvider';
import { setting } from '../context/setting';


function registerLogView(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider(
            "serialport.logs",
            new FileTreeDataProvider(
                ['.txt', '.log'],
                () => setting.logSaveFolder,
                {
                    command: "serialTerminal.logView.openOnEditor",
                    readdirErrorMessagePrefix: vscode.l10n.t("Log path error: "),
                    icon: new vscode.ThemeIcon("output"),
                }
            )
        )
    );
}

export { registerLogView };