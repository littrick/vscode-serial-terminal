import * as vscode from 'vscode';
import * as fs from 'fs';
import { l10n, ThemeIcon, Uri } from 'vscode';

class FileTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private filePatton: string;
    private uriGetter: (() => vscode.Uri);
    private options?: {
        readdirErrorMessagePrefix?: string,
        command?: string,
        icon?: string | Uri | { light: string | Uri; dark: string | Uri; } | ThemeIcon,
    };
    private updateEmitter = new vscode.EventEmitter<void>();
    private _watcher;

    constructor(
        filePattons: string[],
        uriGetter: (() => vscode.Uri),
        options?: {
            readdirErrorMessagePrefix?: string,
            command?: string;
            icon?: string | Uri | { light: string | Uri; dark: string | Uri; } | ThemeIcon,
        }) {
        this.filePatton = `(${filePattons.join('|')})$`;

        this.uriGetter = uriGetter;
        this.options = options;
        this._watcher = fs.watch(this.uriGetter().fsPath, () => {
            this.updateEmitter.fire();
        });
    }

    onDidChangeTreeData?: vscode.Event<void | vscode.TreeItem | vscode.TreeItem[] | null | undefined> | undefined
        = this.updateEmitter.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: vscode.TreeItem | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
        return new Promise((resolve, reject) => {
            let dirUri: vscode.Uri;
            if (element) {
                if (!element.resourceUri) {
                    reject();
                    return;
                } else {
                    dirUri = element.resourceUri;
                }
            } else {
                dirUri = this.uriGetter();
            }

            var files;
            try {
                files = fs.readdirSync(dirUri.fsPath);
            } catch (err) {
                vscode.window.showErrorMessage(this.options?.readdirErrorMessagePrefix + (err as Error).message);
            }

            if (files) {
                const treeItem = files.filter((file) => {
                    let stats = fs.statSync(vscode.Uri.joinPath(dirUri, file).fsPath);
                    return stats.isDirectory() || stats.isFile() && file.match(this.filePatton);
                }).map((file) => {
                    const item = new vscode.TreeItem(vscode.Uri.joinPath(dirUri, file));
                    if (item.resourceUri && fs.statSync(item.resourceUri?.fsPath).isDirectory()) {
                        item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                    } else {
                        if (this.options?.command) {
                            item.command = {
                                title: l10n.t("View"),
                                command: this.options.command,
                                arguments: [item],
                            };
                            item.iconPath = this.options.icon;
                        }
                    }
                    return item;
                });
                resolve(treeItem);
            } else {
                reject();
            }
        });
    }
}


export { FileTreeDataProvider };