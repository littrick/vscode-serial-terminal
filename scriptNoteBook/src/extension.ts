import * as vscode from 'vscode';
import { registerScriptNotebookSerializer } from './noteBookSerializer';
import { registerNbController } from './controller';
import { registerNbSerializer } from './mdSerializer';
import { registerCommands } from './commands';
import { registerSetting, setting } from './setting';

export function activate(context: vscode.ExtensionContext) {
    // Load user configuration before registering components
    setting.update();
    registerSetting(context);
    registerScriptNotebookSerializer(context);
    registerNbSerializer(context);
    registerNbController(context);
    registerCommands(context);
}

export function deactivate() { }
