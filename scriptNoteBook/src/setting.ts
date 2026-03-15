import { ExtensionContext, l10n, window, workspace } from 'vscode';
import { refreshSupportedLanguages } from './controller';
import { log } from './utils';

const codeSuportKey = "scriptNotebook.code.supports";

class Setting {
    codeSuport: Array<string> = [
        "sh",
        "txt",
        "shellscript",
        "plaintext",
        ""
    ];

    update() {
        log.info("Updating settings...");
        this.codeSuport = this.getConfigOrDefault(codeSuportKey, this.codeSuport);
        refreshSupportedLanguages();
    }

    private getConfigOrDefault<T>(key: string, defaultValue: T): T {
        const config = workspace.getConfiguration();
        const value = config.get<T>(key);
        if (value === undefined || value === '') {
            config.update(key, defaultValue, true);
            window.showWarningMessage(l10n.t("Configuration for {0} is not set. Using default value: {1}", key, JSON.stringify(defaultValue)));
            return defaultValue;
        }
        return value;
    }

    fmt() {
        return `Setting:
        codeSuport: ${JSON.stringify(this.codeSuport)}`;
    }
}
const setting = new Setting();

function registerSetting(context: ExtensionContext) {
    context.subscriptions.push(
        workspace.onDidChangeConfiguration((event) => {
            log.info("Configuration changed:", JSON.stringify(event));

            setting.update();
        })
    );
    setting.update();
}

export {
    setting,
    registerSetting
};