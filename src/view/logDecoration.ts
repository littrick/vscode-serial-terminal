import * as vscode from 'vscode';
import { l10n } from 'vscode';

const recordingFiles = new Set<string>();
const changeEmitter = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();

const decorationProvider: vscode.FileDecorationProvider = {
    onDidChangeFileDecorations: changeEmitter.event,
    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
        if (!recordingFiles.has(uri.toString())) {
            return undefined;
        }
        return {
            badge: '●',
            color: new vscode.ThemeColor('charts.green'),
            tooltip: l10n.t('Recording log'),
        };
    },
};

function registerLogDecoration(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(decorationProvider),
        changeEmitter
    );
}

function setLogRecording(uri: vscode.Uri, recording: boolean) {
    const key = uri.toString();
    if (recording === recordingFiles.has(key)) {
        return;
    }
    if (recording) {
        recordingFiles.add(key);
    } else {
        recordingFiles.delete(key);
    }
    changeEmitter.fire(uri);
}

export { registerLogDecoration, setLogRecording };
