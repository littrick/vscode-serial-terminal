import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { updateSerialPortProvider } from './view/serialPortView';
import { l10n } from 'vscode';
import { log } from './logger';
import { logSettingId, scriptSettingId, serialPortSettingId, setting } from './context/setting';
import { SerialTerminal, serialTerminalManager } from './terminal/serialTerminal';
import * as picker from './view/picker';
import { validateFileName } from './view/fileNameValidation';
import { getSelectedScriptFolder, refreshScriptView } from './view/scriptView';
import { refreshLogView } from './view/logView';

function registerCommands(context: vscode.ExtensionContext) {
    // 在扩展内按设置前缀筛选，避免文本搜索误匹配其它扩展的设置
    const openSettings = (query: string) =>
        vscode.commands.executeCommand(
            "workbench.action.openSettings",
            `@ext:${context.extension.id} ${query}`
        );

    /* eslint-disable @typescript-eslint/naming-convention */
    const commands: { [key: string]: (...args: any[]) => any; } =
    {
        "serialTerminal.terminal.startSaveLog": startSaveLog,
        "serialTerminal.terminal.stopSaveLog": stopSaveLog,

        "serialTerminal.terminal.clear": () => vscode.commands.executeCommand("workbench.action.terminal.clear"),

        "serialTerminal.setting.SerialPort": () => openSettings(serialPortSettingId),
        "serialTerminal.setting.Log": () => openSettings(logSettingId),
        "serialTerminal.setting.Notebook": () => openSettings(scriptSettingId),

        "serialTerminal.treeItem.openOnEditor": openTreeItemResource,
        "serialTerminal.treeItem.revealInExplorer": revealInExplorer,
        "serialTerminal.treeItem.copyPath": copyPath,
        "serialTerminal.treeItem.renameResource": renameTreeItem,
        "serialTerminal.treeItem.deleteResource": deleteResource,

        "serialTerminal.serialView.open": openSerialTerminal,
        "serialTerminal.serialView.openCustom": openCustomSerialTerminal,
        "serialTerminal.refresh": refreshAllViews,

        "serialTerminal.logView.revealLogs": async () => await revealOrOpenInOS(setting.logSaveFolder),
        "serialTerminal.logView.newFolder": () => createFolder(setting.logSaveFolder, "serialTerminal.refresh"),

        "serialTerminal.scriptView.newNotebook": createScriptNotebook,
        "serialTerminal.scriptView.revealNotebooks": async () => await revealOrOpenInOS(setting.noteBookFolder),
        "serialTerminal.scriptView.newFolder": () => createFolder(
            getSelectedScriptFolder() ?? setting.noteBookFolder,
            "serialTerminal.refresh"
        ),
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    for (const [id, handler] of Object.entries(commands)) {
        context.subscriptions.push(
            vscode.commands.registerCommand(id, handler)
        );
    }
}

async function openSerialTerminal(context: any) {
    const portName = context?.label ?? await picker.pickSerialPort();
    if (!portName) {
        log.error("No serial port selected");
        return;
    }

    await openSerialTerminalByPath(portName);
}

async function openCustomSerialTerminal() {
    const portPath = (await vscode.window.showInputBox({
        title: l10n.t("Please enter the serial port path"),
        placeHolder: process.platform === 'win32' ? "COM3" : "/dev/ttyUSB0",
        validateInput: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
                return l10n.t("Serial port path cannot be empty");
            }
            if (/[\x00-\x1F]/.test(trimmed)) {
                return l10n.t("Serial port path cannot contain line breaks");
            }
            return undefined;
        }
    }))?.trim();

    if (!portPath) {
        log.error("No serial port path provided");
        return;
    }

    log.info(`Opening custom serial port: ${portPath}`);
    await openSerialTerminalByPath(portPath);
}

async function openSerialTerminalByPath(portName: string) {
    let exist = serialTerminalManager.getSerialPortTerminal(portName);
    if (exist) {
        exist.show();
        return;
    }

    let cfg = await picker.pickConfiguration();
    if (!cfg) {
        log.error("No configuration selected");
        return;
    }

    let newTerminal: SerialTerminal;
    if (setting.autoSaveLog) {
        let logFile = await picker.pickLogFile(portName);
        if (!logFile) {
            log.error("No log file selected");
            return;
        }

        newTerminal = await serialTerminalManager.getOrCreateSerialPortTerminal(portName, cfg);
        await newTerminal.beginRecord(logFile);
    } else {
        newTerminal = await serialTerminalManager.getOrCreateSerialPortTerminal(portName, cfg);
    }
    newTerminal.show();
}

async function startSaveLog() {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        log.error("No active terminal");
        return;
    }

    let exist = serialTerminalManager.getSerialPortTerminalByTerminal(terminal);
    if (!exist) {
        log.error("Active terminal is not a serial port terminal");
        return;
    }

    let logFile = await picker.pickLogFile(exist.portName());
    log.info(`Selected log file: ${logFile}`);

    if (logFile) {
        await exist.beginRecord(logFile);
    }
}


async function stopSaveLog() {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        log.error("No active terminal");
        return;
    }

    let exist = serialTerminalManager.getSerialPortTerminalByTerminal(terminal);
    if (!exist) {
        log.error("Active terminal is not a serial port terminal");
        return;
    }

    await exist.stopRecord();

}

// 日志与脚本视图共用打开命令，按节点的 contextValue 区分所属视图
async function openTreeItemResource(context?: vscode.TreeItem) {
    const uri = context?.resourceUri;
    if (!uri) {
        return;
    }
    log.info(`Opening resource: ${uri.toString()}`);

    // 日志以只读方式打开，避免误编辑
    if (context.contextValue?.startsWith("log")) {
        await vscode.commands.executeCommand("vscode.open", uri);
        const editor = vscode.window.activeTextEditor;
        if (editor?.document.uri.toString() === uri.toString()) {
            vscode.commands.executeCommand("workbench.action.files.setActiveEditorReadonlyInSession");
        }
        return;
    }

    // .md 默认由文本编辑器打开，开启设置后强制用 Script Notebook 的 md notebook 打开
    if (setting.openMdAsNotebook && uri.path.toLowerCase().endsWith('.md')) {
        await vscode.commands.executeCommand("vscode.openWith", uri, "mdnb");
    } else {
        await vscode.commands.executeCommand("vscode.open", uri);
    }
}

// 日志与脚本视图共用重命名命令，按节点的 contextValue 区分所属视图
function renameTreeItem(context?: vscode.TreeItem) {
    if (!context?.resourceUri) {
        return;
    }
    if (context.contextValue?.startsWith("log")) {
        return renameResource(context, "serialTerminal.refresh", {
            hideExtension: true,
        });
    }
    return renameResource(context, "serialTerminal.refresh", {
        allowedExtensions: [".md", ".mdnb"],
    });
}

// 三个视图共用刷新命令
function refreshAllViews() {
    updateSerialPortProvider();
    refreshLogView();
    refreshScriptView();
}

async function copyPath(context?: vscode.TreeItem) {
    const uri = context?.resourceUri;
    if (!uri) {
        return;
    }
    await vscode.env.clipboard.writeText(uri.fsPath);
    log.info(`Copied path: ${uri.fsPath}`);
}

async function revealInExplorer(context: vscode.TreeItem) {
    log.info(`Revealing in explorer: ${context.resourceUri?.toString()}`);
    if (!context.resourceUri) {
        return;
    }
    await revealOrOpenInOS(context.resourceUri);
}

// revealFileInOS 在 Windows 上对目录执行 explorer /select，会打开父目录并选中该目录；
// 目录改为直接打开目录本身，文件仍使用 revealFileInOS 定位选中。
async function revealOrOpenInOS(uri: vscode.Uri) {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type & vscode.FileType.Directory) {
            const opened = await vscode.env.openExternal(uri);
            if (!opened) {
                log.error(`Failed to open folder in OS: ${uri.toString()}`);
            }
            return;
        }
    } catch (err) {
        log.error(`Failed to stat ${uri.toString()}: ${(err as Error).message}`);
    }
    await vscode.commands.executeCommand("revealFileInOS", uri);
}

async function createFolder(root: vscode.Uri, refreshCommand: string) {
    const name = (await vscode.window.showInputBox({
        title: l10n.t("Please enter the folder name"),
        validateInput: validateFileName,
    }))?.trim();
    if (!name) {
        return;
    }

    try {
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root, name));
        await vscode.commands.executeCommand(refreshCommand);
    } catch (err) {
        vscode.window.showErrorMessage(l10n.t("Failed to create folder {0}: {1}", name, (err as Error).message));
    }
}

// Windows / macOS 默认大小写不敏感：仅大小写不同的改名需要走原生 rename。
const caseInsensitiveFileSystem = process.platform === 'win32' || process.platform === 'darwin';

interface RenameOptions {
    /** 输入框只显示主文件名，提交后自动补回原扩展名（日志视图） */
    hideExtension?: boolean;
    /** 文件只能使用的扩展名，输入框显示完整文件名（脚本视图） */
    allowedExtensions?: string[];
}

async function renameResource(
    context: vscode.TreeItem | undefined,
    refreshCommand: string,
    options: RenameOptions = {}
) {
    const source = context?.resourceUri;
    if (!source) {
        return;
    }

    const isDirectory = context.contextValue?.endsWith("Folder") ?? false;
    const oldName = path.basename(source.fsPath);
    const extension = isDirectory ? "" : path.extname(oldName);
    const baseName = path.basename(oldName, extension);
    const parent = vscode.Uri.file(path.dirname(source.fsPath));
    // 日志视图的输入框不显示后缀，提交时再补回原后缀
    const hideExtension = !isDirectory && options.hideExtension === true;

    // 仅大小写不同时，大小写不敏感的文件系统会把目标当成已存在的同一个文件
    const isCaseOnlyRename = (target: vscode.Uri) =>
        caseInsensitiveFileSystem && target.fsPath.toLowerCase() === source.fsPath.toLowerCase();

    // 把输入框中的名称转换为最终文件名（隐藏后缀时补回原后缀）
    const toFileName = (value: string) => {
        if (hideExtension && !value.toLowerCase().endsWith(extension.toLowerCase())) {
            return value + extension;
        }
        return value;
    };

    // 日志隐藏后缀、默认选中主文件名；Notebook 显示完整文件名并选中主文件名
    const newName = (await vscode.window.showInputBox({
        title: l10n.t("Please enter the new name"),
        prompt: source.fsPath,
        value: hideExtension ? baseName : oldName,
        valueSelection: [0, baseName.length],
        validateInput: (value) => {
            const nameError = validateFileName(value);
            if (nameError) {
                return nameError;
            }
            const fileName = toFileName(value.trim());

            // Notebook 只允许 md / mdnb 两种后缀
            if (!isDirectory && options.allowedExtensions
                && !options.allowedExtensions.includes(path.extname(fileName))) {
                return l10n.t("File extension must be one of: {0}", options.allowedExtensions.join(", "));
            }

            if (fileName === oldName) {
                return undefined;
            }
            const target = vscode.Uri.joinPath(parent, fileName);
            return !isCaseOnlyRename(target) && fs.existsSync(target.fsPath)
                ? l10n.t("File already exists: {0}", fileName)
                : undefined;
        },
    }))?.trim();

    if (!newName) {
        return;
    }

    const fileName = toFileName(newName);
    if (fileName === oldName) {
        return;
    }

    const target = vscode.Uri.joinPath(parent, fileName);
    try {
        if (isCaseOnlyRename(target)) {
            await fs.promises.rename(source.fsPath, target.fsPath);
        } else {
            await vscode.workspace.fs.rename(source, target, { overwrite: false });
        }
        await vscode.commands.executeCommand(refreshCommand);
    } catch (err) {
        vscode.window.showErrorMessage(l10n.t("Failed to rename {0}: {1}", oldName, (err as Error).message));
    }
}

async function createScriptNotebook() {
    // 在脚本视图中选中目录时，新脚本创建到该目录下；否则创建到根目录
    const targetFolder = getSelectedScriptFolder() ?? setting.noteBookFolder;
    const fileName = (await vscode.window.showInputBox({
        title: l10n.t("Please enter the script notebook file name"),
        prompt: targetFolder.fsPath,
        validateInput: (value) => {
            const nameError = validateFileName(value);
            if (nameError) {
                return nameError;
            }
            const fileName = value.trim() + ".mdnb";
            return fs.existsSync(vscode.Uri.joinPath(targetFolder, fileName).fsPath)
                ? l10n.t("File already exists: {0}", fileName)
                : undefined;
        },
    }))?.trim();
    if (!fileName) {
        log.info("Script notebook creation cancelled: No file name provided");
        return false;
    }

    const scriptNotebookFile = vscode.Uri.joinPath(targetFolder, fileName + ".mdnb");
    if (fs.existsSync(scriptNotebookFile.fsPath)) {
        vscode.window.showErrorMessage(l10n.t("File already exists: {0}", fileName + ".mdnb"));
        return false;
    }

    fs.writeFileSync(scriptNotebookFile.fsPath, "");
    vscode.commands.executeCommand("vscode.open", scriptNotebookFile);
}
async function deleteResource(context: vscode.TreeItem) {
    if (!context.resourceUri) {
        return;
    }
    const name = context.resourceUri.path.split('/').pop() ?? context.resourceUri.fsPath;
    const deleteLabel = l10n.t("Delete");
    const confirm = await vscode.window.showWarningMessage(
        l10n.t("Delete {0}?", name),
        { modal: true },
        deleteLabel
    );
    if (confirm !== deleteLabel) {
        return;
    }
    await vscode.workspace.fs.delete(context.resourceUri, { recursive: true, useTrash: true });
}

export { registerCommands };