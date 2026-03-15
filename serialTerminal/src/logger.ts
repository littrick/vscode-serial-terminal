import * as vscode from 'vscode';

const log = vscode.window.createOutputChannel("Serial Terminal", { log: true });

export { log };