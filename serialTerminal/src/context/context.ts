import * as vscode from 'vscode';
import { log } from '../logger';
import { serialTerminalManager } from '../terminal/serialTerminal';

enum ContextKey {
    rcordingLog = "serialTerminal.terminal.recordingLog",
    terminalFocus = "serialTerminal.terminal.focus"
}

function registerContextCallback(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTerminal((terminal) => {
            if (!terminal) {
                log.error("No active terminal");
                return;
            }

            let exist = serialTerminalManager.getSerialPortTerminalByTerminal(terminal);
            if (!exist) {
                setSerialTerminalFocus(false);
                setSerialTerminalRecordingLog(false);
            } else {
                setSerialTerminalFocus(true);
                setSerialTerminalRecordingLog(exist.isRecordingLog());
            }
        }));
}

function setSerialTerminalRecordingLog(value: boolean) {
    vscode.commands.executeCommand(
        "setContext",
        ContextKey.rcordingLog,
        value
    );
}

function setSerialTerminalFocus(value: boolean) {
    vscode.commands.executeCommand(
        "setContext",
        ContextKey.terminalFocus,
        value
    );
}

export {
    registerContextCallback,
    setSerialTerminalFocus,
    setSerialTerminalRecordingLog
};