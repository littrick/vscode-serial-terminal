import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerContextCallback } from './context/context';
import { registerSerialPortView } from './view/serialPortView';
import { registerLogView } from './view/logView';
import { registerScriptView } from './view/scriptView';
import { registerSetting } from './context/setting';
import { registerSerialPortTerminalProfile } from './terminal/provider';



export function activate(context: vscode.ExtensionContext) {
    registerSetting(context);
    registerContextCallback(context);
    registerCommands(context);
    registerSerialPortView(context);
    registerLogView(context);
    registerScriptView(context);
    registerSerialPortTerminalProfile(context);

}

export function deactivate() { }
