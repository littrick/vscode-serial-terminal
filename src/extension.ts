import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerContextCallback } from './context/context';
import { registerSerialPortView, updateSerialPortProvider } from './view/serialPortView';
import { registerSerialPortMonitor } from './serial/serialPortMonitor';
import { registerLogView } from './view/logView';
import { registerScriptView } from './view/scriptView';
import { registerLogDecoration } from './view/logDecoration';
import { registerSetting } from './context/setting';
import { registerSerialPortTerminalProfile } from './terminal/provider';
import { initializeNotebookSupport } from './notebookSupport';



export function activate(context: vscode.ExtensionContext) {
    initializeNotebookSupport(context);
    registerSetting(context);
    registerContextCallback(context);
    registerCommands(context);
    registerSerialPortView(context);
    registerSerialPortMonitor(context, updateSerialPortProvider);
    registerLogView(context);
    registerScriptView(context);
    registerLogDecoration(context);
    registerSerialPortTerminalProfile(context);

}

export function deactivate() { }
