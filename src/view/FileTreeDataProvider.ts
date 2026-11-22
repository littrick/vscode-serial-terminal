import * as vscode from 'vscode';
import * as fs from 'fs';
import { l10n, ThemeIcon, Uri } from 'vscode';

class FileTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem>, vscode.Disposable {
    private filePatton: string;
    private uriGetter: (() => vscode.Uri);
    private options?: {
        readdirErrorMessagePrefix?: string,
        command?: string,
        icon?: string | Uri | { light: string | Uri; dark: string | Uri; } | ThemeIcon,
        contextValuePrefix?: string,
    };
    private updateEmitter = new vscode.EventEmitter<void>();
    private watcher: vscode.FileSystemWatcher;

    constructor(
        filePattons: string[],
        uriGetter: (() => vscode.Uri),
        options?: {
            readdirErrorMessagePrefix?: string,
            command?: string;
            icon?: string | Uri | { light: string | Uri; dark: string | Uri; } | ThemeIcon,
            contextValuePrefix?: string,
        }) {
        this.filePatton = `(${filePattons.join('|')})$`;

        this.uriGetter = uriGetter;
        this.options = options;
        this.watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.uriGetter(), '**/*')
        );
        this.watcher.onDidCreate(() => this.updateEmitter.fire());
        this.watcher.onDidChange(() => this.updateEmitter.fire());
        this.watcher.onDidDelete(() => this.updateEmitter.fire());
    }

    dispose() {
        this.watcher.dispose();
        this.updateEmitter.dispose();
    }

    onDidChangeTreeData?: vscode.Event<void | vscode.TreeItem | vscode.TreeItem[] | null | undefined> | undefined
        = this.updateEmitter.event;

    refresh() {
        this.updateEmitter.fire();
    }

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
                    const uri = vscode.Uri.joinPath(dirUri, file);
                    const isDirectory = fs.statSync(uri.fsPath).isDirectory();
                    const item = new vscode.TreeItem(uri);
                    if (this.options?.contextValuePrefix) {
                        item.contextValue = `${this.options.contextValuePrefix}${isDirectory ? 'Folder' : 'File'}`;
                    }
                    if (isDirectory) {
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