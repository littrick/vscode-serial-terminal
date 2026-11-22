import * as vscode from 'vscode';
import * as fs from 'fs';
import { l10n, ThemeIcon, Uri } from 'vscode';
import { compareNames } from '../utils';

function formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${unitIndex === 0 ? value : value.toFixed(1)} ${units[unitIndex]}`;
}

function formatModifiedTime(ms: number): string {
    const date = new Date(ms);
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
                const entries = files
                    .map((file) => {
                        const uri = vscode.Uri.joinPath(dirUri, file);
                        return { file, uri, stats: fs.statSync(uri.fsPath) };
                    })
                    .filter(({ file, stats }) =>
                        stats.isDirectory() || (stats.isFile() && file.match(this.filePatton))
                    )
                    .sort((a, b) => {
                        // 目录在前，文件在后；同类按名称自然排序
                        const aIsDirectory = a.stats.isDirectory();
                        const bIsDirectory = b.stats.isDirectory();
                        if (aIsDirectory !== bIsDirectory) {
                            return aIsDirectory ? -1 : 1;
                        }
                        return compareNames(a.file, b.file);
                    });

                const treeItem = entries.map(({ uri, stats }) => {
                    const isDirectory = stats.isDirectory();
                    const item = new vscode.TreeItem(uri);
                    item.id = uri.toString();

                    const tooltip = new vscode.MarkdownString();
                    tooltip.appendText(uri.fsPath);
                    if (!isDirectory) {
                        const size = formatSize(stats.size);
                        const modified = formatModifiedTime(stats.mtimeMs);
                        item.description = `${size} · ${modified}`;
                        tooltip.appendMarkdown(
                            `\n\n${l10n.t("Size: {0}", size)}\n\n${l10n.t("Modified: {0}", modified)}`
                        );
                    }
                    item.tooltip = tooltip;

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