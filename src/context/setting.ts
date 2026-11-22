import { ExtensionContext, l10n, Uri, window, workspace } from "vscode";
import { homedir } from 'os';
import { log } from "../logger";
import * as fs from 'fs';

const serialPortSettingId = 'SerialTerminal.serialPort';
const logSettingId = 'SerialTerminal.log';
const scriptSettingId = 'SerialTerminal.notebook';

const portConfigurationsKey = `${serialPortSettingId}.configurations`;
const serialPortAutoRefreshKey = `${serialPortSettingId}.autoRefresh`;
const serialPortAutoRefreshIntervalKey = `${serialPortSettingId}.autoRefreshInterval`;
const logSaveFolderKey = `${logSettingId}.savePath`;
const autoSaveLogKey = `${logSettingId}.autoSave`;
const addingTimeStampKey = `${logSettingId}.timestamp.enable`;
const filterSpecialCharsKey = `${logSettingId}.filterSpecialChars`;
const timeStampDurationKey = `${logSettingId}.timestamp.duration`;
const noteBookFolderKey = `${scriptSettingId}.savePath`;
const openMdAsNotebookKey = `${scriptSettingId}.openMdAsNotebook`;

interface ISetting {
    portConfigurations: Array<string>;
    serialPortAutoRefresh: boolean;
    serialPortAutoRefreshInterval: number;
    logSaveFolder: Uri;
    noteBookFolder: Uri;
    autoSaveLog: boolean;
    addingTimeStamp: boolean;
    filterSpecialChars: boolean;
    timeStampDurationNs: number;
    openMdAsNotebook: boolean;
}

class Setting implements ISetting {
    portConfigurations: Array<string> = [
        "9600n1",
        "115200n1",
    ];
    serialPortAutoRefresh: boolean = true;
    serialPortAutoRefreshInterval: number = 2000;
    logSaveFolder: Uri = Uri.joinPath(
        Uri.file(homedir()),
        "serialTerminal",
        'log'
    );
    noteBookFolder: Uri = Uri.joinPath(
        Uri.file(homedir()),
        "serialTerminal",
        'notebook'
    );

    autoSaveLog: boolean = false;
    addingTimeStamp: boolean = false;
    filterSpecialChars: boolean = true;
    timeStampDurationNs: number = 20_000_000; // 20ms
    openMdAsNotebook: boolean = true;

    readonly default: ISetting = {
        portConfigurations: this.portConfigurations,
        serialPortAutoRefresh: this.serialPortAutoRefresh,
        serialPortAutoRefreshInterval: this.serialPortAutoRefreshInterval,
        logSaveFolder: this.logSaveFolder,
        noteBookFolder: this.noteBookFolder,
        autoSaveLog: this.autoSaveLog,
        addingTimeStamp: this.addingTimeStamp,
        filterSpecialChars: this.filterSpecialChars,
        timeStampDurationNs: this.timeStampDurationNs,
        openMdAsNotebook: this.openMdAsNotebook,
    };

    update() {
        // 检查 logSaveFolder 和 noteBookFolder 是否存在，如果不存在则创建
        this.logSaveFolder = Uri.file(this.getConfigOrDefault(logSaveFolderKey, this.default.logSaveFolder.path));
        this.noteBookFolder = Uri.file(this.getConfigOrDefault(noteBookFolderKey, this.default.noteBookFolder.path));
        this.timeStampDurationNs = this.getConfigOrDefault(timeStampDurationKey, this.default.timeStampDurationNs);
        this.portConfigurations = this.getConfigOrDefault(portConfigurationsKey, this.default.portConfigurations);
        this.serialPortAutoRefresh = this.getConfigOrDefault(serialPortAutoRefreshKey, this.default.serialPortAutoRefresh);
        this.serialPortAutoRefreshInterval = this.getConfigOrDefault(
            serialPortAutoRefreshIntervalKey,
            this.default.serialPortAutoRefreshInterval
        );
        this.autoSaveLog = this.getConfigOrDefault(autoSaveLogKey, this.default.autoSaveLog);
        this.addingTimeStamp = this.getConfigOrDefault(addingTimeStampKey, this.default.addingTimeStamp);
        this.filterSpecialChars = this.getConfigOrDefault(filterSpecialCharsKey, this.default.filterSpecialChars);
        this.openMdAsNotebook = this.getConfigOrDefault(openMdAsNotebookKey, this.default.openMdAsNotebook);

        log.info("Settings updated: ", this.fmt());
    }

    private getConfigOrDefault<T>(key: string, defaultValue: T): T {
        const value = workspace.getConfiguration().get<T>(key);
        if (value === undefined || value === '') {
            workspace.getConfiguration().update(key, defaultValue, true);
            log.info(`Configuration for ${key} is undefined, using default value: ${defaultValue}`);
            window.showWarningMessage(l10n.t("Configuration for {0} is not set. Using default value: {1}", key, JSON.stringify(defaultValue)));
            return defaultValue;
        }
        return value;
    }

    checkAndCreateFolders() {
        this.checkAndCreateFolder(this.logSaveFolder);
        this.checkAndCreateFolder(this.noteBookFolder);
    }

    private checkAndCreateFolder(folderPath: Uri) {
        if (!fs.existsSync(folderPath.fsPath)) {
            if (!fs.mkdirSync(folderPath.fsPath, { recursive: true })) {
                window.showErrorMessage(l10n.t("Failed to create folder at {0}", folderPath.fsPath));
                return;
            }
            log.info(`Folder created: ${folderPath.fsPath}`);
        }
    }

    // for debug
    fmt() {
        return `Setting:
        portConfigurations: ${JSON.stringify(this.portConfigurations)},
        serialPortAutoRefresh: ${this.serialPortAutoRefresh},
        serialPortAutoRefreshInterval: ${this.serialPortAutoRefreshInterval},
        logSaveFolder: ${this.logSaveFolder.fsPath},
        noteBookFolder: ${this.noteBookFolder.fsPath},
        autoSaveLog: ${this.autoSaveLog},
        addingTimeStamp: ${this.addingTimeStamp},
        filterSpecialChars: ${this.filterSpecialChars},
        timeStampDurationNs: ${this.timeStampDurationNs},
        openMdAsNotebook: ${this.openMdAsNotebook}`;
    }
}

const setting = new Setting();

function registerSetting(context: ExtensionContext) {
    context.subscriptions.push(
        workspace.onDidChangeConfiguration((event) => {
            log.info("Configuration changed, event: ", JSON.stringify(event));
            // 创建异步的更新设置
            setTimeout(() => {
                setting.update();
            }, 0);
        })
    );
    setting.update();
    setting.checkAndCreateFolders();
}

export {
    serialPortSettingId,
    logSettingId,
    scriptSettingId,

    portConfigurationsKey,
    serialPortAutoRefreshKey,
    serialPortAutoRefreshIntervalKey,
    logSaveFolderKey,
    noteBookFolderKey,
    autoSaveLogKey,
    addingTimeStampKey,
    filterSpecialCharsKey,
    timeStampDurationKey,
    openMdAsNotebookKey,
    setting,
    registerSetting
};