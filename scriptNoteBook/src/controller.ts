import * as vscode from 'vscode';
import { setting } from './setting';

const mdController = new (class {
    private readonly id = 'terminal-notebook-controller';
    private readonly type = 'mdnb';
    private readonly label = vscode.l10n.t('Terminal Notebook');
    private readonly supportedLanguages = () => setting.codeSuport;

    private readonly controller: vscode.NotebookController;

    constructor() {
        this.controller = vscode.notebooks.createNotebookController(
            this.id,
            this.type,
            this.label
        );
        this.controller.supportedLanguages = this.supportedLanguages();
        this.controller.executeHandler = this.doExecuteAll.bind(this);
    }

    private async doExecuteAll(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): Promise<void> {
        for (const cell of cells) {
            await this.doExecute(cell);
        }
    }

    private doExecute(cell: vscode.NotebookCell): void {
        const terminal = vscode.window.activeTerminal;
        if (!terminal) { return; }
        cell.document.getText().split(/\r?\n/g).forEach(cmd => terminal.sendText(cmd));
    }

    refreshSupportedLanguages() {
        this.controller.supportedLanguages = this.supportedLanguages();
    }

    dispose() {
        this.controller.dispose();
    }
})();

function registerNbController(context: vscode.ExtensionContext) {
    context.subscriptions.push(mdController);
}

function refreshSupportedLanguages() {
    mdController.refreshSupportedLanguages();
}

export { registerNbController, refreshSupportedLanguages };