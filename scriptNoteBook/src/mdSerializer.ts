import * as vscode from 'vscode';
import { setting } from './setting';


export function registerNbSerializer(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer('mdnb', serializer));
}

const supportedLanguages = () => setting.codeSuport;
const serializer = new (class implements vscode.NotebookSerializer {
    private readonly codeBeginRegx = /```([a-zA-Z0-9]*)\s*$/;
    private readonly codeEndRegx = /^```[\s]*?$/;
    private readonly allNewLineRegx = /^[\r\n]*?$/;

    private readonly id2langTab = new Map([
        ["shellscript", "sh"],
        ["plaintext", "txt"],
        ["raw", ""],
    ]);

    private id2lang(id: string) {
        return this.id2langTab.get(id) || id;
    }

    private codeBlock(lang: string, content: string) {
        return `\`\`\`${lang}\n${content}\n\`\`\``;
    }

    private codeCell = (lang: string, content: string) =>
        new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            content,
            lang
        );

    private mdCell = (content: string) =>
        new vscode.NotebookCellData(
            vscode.NotebookCellKind.Markup,
            content,
            'markdown'
        );

    deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): vscode.NotebookData {
        if (content.length === 0) { return new vscode.NotebookData([]); }

        const contents = new TextDecoder().decode(content);
        const lines = contents.split(/\r?\n/);
        const data: vscode.NotebookCellData[] = [];

        // Use local variables to avoid state corruption on concurrent calls
        let isCode = false;
        let codeBegin = 0;
        let codeLang = "";

        lines.forEach((line, idx) => {
            if (isCode && this.codeEndRegx.test(line)) {
                if (supportedLanguages().includes(codeLang)) {
                    data.push(this.codeCell(codeLang, lines.slice(codeBegin, idx).join('\n')));
                } else {
                    data.push(this.mdCell(this.codeBlock(codeLang, lines.slice(codeBegin, idx).join('\n'))));
                }
                isCode = false;
                codeBegin = idx + 1;
            } else {
                const match = line.match(this.codeBeginRegx);
                if (match) {
                    const pending = lines.slice(codeBegin, idx).join('\n');
                    if (!this.allNewLineRegx.test(pending)) {
                        data.push(this.mdCell(pending));
                    }
                    codeLang = match[1] || "raw";
                    isCode = true;
                    codeBegin = idx + 1;
                }
            }
        });

        if (codeBegin !== lines.length) {
            if (!isCode) {
                data.push(this.mdCell(lines.slice(codeBegin, lines.length).join('\n')));
            } else {
                data.push(this.codeCell(codeLang, lines.slice(codeBegin, lines.length).join('\n')));
            }
        }

        return new vscode.NotebookData(data);
    }

    serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Uint8Array {
        const content = data.cells.map((cell) => {
            if (cell.kind === vscode.NotebookCellKind.Markup) {
                return cell.value;
            } else {
                return this.codeBlock(this.id2lang(cell.languageId), cell.value);
            }
        }).join('\n');

        return new TextEncoder().encode(content);
    }
});