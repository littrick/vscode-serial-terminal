import * as vscode from 'vscode';


function registerCommands(context: vscode.ExtensionContext) {
    /* eslint-disable @typescript-eslint/naming-convention */
    const commands: { [key: string]: (...args: any[]) => any; } = {
        "scriptNotebook.openWithNotebook": openWithNotebook,
        "scriptNotebook.openWithMarkdown": openWithMarkdown,
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    for (const [id, handler] of Object.entries(commands)) {
        context.subscriptions.push(
            vscode.commands.registerCommand(id, handler)
        );
    }
}

function openWithNotebook(uri: vscode.Uri) {
    vscode.commands.executeCommand("vscode.openWith", uri, "mdnb");
}

function openWithMarkdown(uri: vscode.Uri) {
    vscode.commands.executeCommand("vscode.openWith", uri, "markdown");
}

export { registerCommands };