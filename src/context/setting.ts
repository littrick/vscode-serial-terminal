import { ExtensionContext, l10n, Uri, window, workspace } from "vscode";
import { homedir } from 'os';
import { log } from "../logger";
import * as fs from 'fs';

const serialPortSettingId = 'SerialTerminal.serialPort';
const logSettingId = 'SerialTerminal.log';
const scriptSettingId = 'SerialTerminal.notebook';

const portConfigurationsKey = `${serialPortSettingId}.configurations`;
const logSaveFolderKey = `${logSettingId}.savePath`;
const autoSaveLogKey = `${logSettingId}.autoSave`;
const addingTimeStampKey = `${logSettingId}.timestamp.enable`;
const timeStampDurationKey = `${logSettingId}.timestamp.duration`;
const noteBookFolderKey = `${scriptSettingId}.savePath`;

interface ISetting {
    portConfigurations: Array<string>;
    logSaveFolder: Uri;
    noteBookFolder: Uri;
    autoSaveLog: boolean;
    addingTimeStamp: boolean;
    timeStampDurationNs: number;
}

class Setting implements ISetting {
    portConfigurations: Array<string> = [
        "9600n1",
        "115200n1",
    ];
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
    timeStampDurationNs: number = 20_000_000; // 20ms

    readonly default: ISetting = {
        portConfigurations: this.portConfigurations,
        logSaveFolder: this.logSaveFolder,
        noteBookFolder: this.noteBookFolder,
        autoSaveLog: this.autoSaveLog,
        addingTimeStamp: this.addingTimeStamp,
        timeStampDurationNs: this.timeStampDurationNs,
    };

    update() {
        // 检查 logSaveFolder 和 noteBookFolder 是否存在，如果不存在则创建
        this.logSaveFolder = Uri.file(this.getConfigOrDefault(logSaveFolderKey, this.default.logSaveFolder.path));
        this.noteBookFolder = Uri.file(this.getConfigOrDefault(noteBookFolderKey, this.default.noteBookFolder.path));
        this.timeStampDurationNs = this.getConfigOrDefault(timeStampDurationKey, this.default.timeStampDurationNs);
        this.portConfigurations = this.getConfigOrDefault(portConfigurationsKey, this.default.portConfigurations);
        this.autoSaveLog = this.getConfigOrDefault(autoSaveLogKey, this.default.autoSaveLog);
        this.addingTimeStamp = this.getConfigOrDefault(addingTimeStampKey, this.default.addingTimeStamp);

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
        logSaveFolder: ${this.logSaveFolder.fsPath},
        noteBookFolder: ${this.noteBookFolder.fsPath},
        autoSaveLog: ${this.autoSaveLog},
        addingTimeStamp: ${this.addingTimeStamp},
        timeStampDurationNs: ${this.timeStampDurationNs}`;
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
    logSaveFolderKey,
    noteBookFolderKey,
    autoSaveLogKey,
    addingTimeStampKey,
    timeStampDurationKey,
    setting,
    registerSetting
};