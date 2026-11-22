import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 树内拖拽移动文件。
 * 每个视图使用独立的 mime type，因此不同视图之间（例如 Logs ←→ Scripts）无法互相拖放。
 */
class FileDragAndDropController implements vscode.TreeDragAndDropController<vscode.TreeItem> {
    constructor(
        private readonly mimeType: string,
        private readonly rootUri: () => vscode.Uri,
        private readonly refresh: () => void,
    ) { }

    get dragMimeTypes(): readonly string[] {
        return [this.mimeType];
    }

    get dropMimeTypes(): readonly string[] {
        return [this.mimeType];
    }

    handleDrag(source: readonly vscode.TreeItem[], dataTransfer: vscode.DataTransfer): void {
        const uris = source
            .map((item) => item.resourceUri)
            .filter((uri): uri is vscode.Uri => !!uri);
        if (uris.length > 0) {
            dataTransfer.set(this.mimeType, new vscode.DataTransferItem(uris));
        }
    }

    async handleDrop(
        target: vscode.TreeItem | undefined,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<void> {
        const dataItem = dataTransfer.get(this.mimeType);
        if (!dataItem) {
            return;
        }

        const uris = dataItem.value;
        if (!Array.isArray(uris) || uris.length === 0) {
            return;
        }

        const targetDir = this.targetDirectory(target);

        for (const uri of uris as vscode.Uri[]) {
            if (token.isCancellationRequested) {
                break;
            }
            if (!(uri instanceof vscode.Uri)) {
                continue;
            }
            // 不处理目录拖到自身或自身子目录的情况
            if (targetDir.path === uri.path || targetDir.path.startsWith(uri.path + '/')) {
                continue;
            }

            const destination = vscode.Uri.joinPath(targetDir, path.basename(uri.fsPath));
            if (destination.toString() === uri.toString()) {
                continue;
            }

            try {
                await vscode.workspace.fs.rename(uri, destination, { overwrite: false });
            } catch (err) {
                vscode.window.showErrorMessage(
                    vscode.l10n.t("Failed to move {0}: {1}", path.basename(uri.fsPath), (err as Error).message)
                );
            }
        }

        this.refresh();
    }

    private targetDirectory(target: vscode.TreeItem | undefined): vscode.Uri {
        if (!target?.resourceUri) {
            // 拖到空白处：放到视图根目录
            return this.rootUri();
        }
        if (target.collapsibleState !== vscode.TreeItemCollapsibleState.None) {
            // 拖到目录上
            return target.resourceUri;
        }
        // 拖到文件上：放到该文件所在目录
        return vscode.Uri.file(path.dirname(target.resourceUri.fsPath));
    }
}

export { FileDragAndDropController };
