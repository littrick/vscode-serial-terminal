import * as vscode from 'vscode';

interface ScriptNoteBookRaw {
    cells: ScriptNoteBookCell[],
}

interface ScriptNoteBookCell {
    type: 'code' | 'markdown',
    source: string[],
}

function registerScriptNotebookSerializer(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer(
            "scrnb",
            new (class implements vscode.NotebookSerializer {
                async deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
                    const contents = new TextDecoder().decode(content);
                    let raw: ScriptNoteBookCell[];
                    try {
                        raw = (<ScriptNoteBookRaw>JSON.parse(contents)).cells;
                    } catch {
                        raw = [];
                    }
                    const cells = raw.map(item =>
                        new vscode.NotebookCellData(
                            item.type === 'code' ?
                                vscode.NotebookCellKind.Code :
                                vscode.NotebookCellKind.Markup,
                            item.source.join('\n'),
                            item.type === 'code' ? 'shellscript' : 'markdown'
                        )
                    );

                    return new vscode.NotebookData(cells);
                }

                async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
                    const contents: ScriptNoteBookRaw = { cells: [] };
                    for (const cell of data.cells) {
                        contents.cells.push({
                            type: cell.kind === vscode.NotebookCellKind.Code ? 'code' : 'markdown',
                            source: cell.value.split(/\r?\n/g)
                        });
                    }

                    return new TextEncoder().encode(JSON.stringify(contents));
                }
            })())
    );
}

export { registerScriptNotebookSerializer };