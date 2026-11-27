import * as vscode from 'vscode';
import { l10n } from 'vscode';
import { log } from './logger';

const NOTEBOOK_EXTENSION_ID = 'awsxxf.scriptnotebook';
/** 离线安装：发布时可将依赖扩展的 vsix 放到扩展目录的 bundled/ 下 */
const BUNDLED_VSIX_PATH = 'bundled/awsxxf.scriptnotebook.vsix';

let extensionContext: vscode.ExtensionContext | undefined;
let promptedThisSession = false;

function initializeNotebookSupport(context: vscode.ExtensionContext) {
    extensionContext = context;
}

function getNotebookExtension(): vscode.Extension<unknown> | undefined {
    return vscode.extensions.getExtension(NOTEBOOK_EXTENSION_ID);
}

/**
 * 确保 notebook 扩展已安装并激活。未安装时返回 false。
 */
async function ensureNotebookAvailable(): Promise<boolean> {
    const extension = getNotebookExtension();
    if (!extension) {
        return false;
    }
    if (!extension.isActive) {
        try {
            await extension.activate();
        } catch (err) {
            log.error(`Failed to activate ${NOTEBOOK_EXTENSION_ID}: ${(err as Error).message}`);
            return false;
        }
    }
    return true;
}

/**
 * 提示安装 notebook 扩展：优先安装扩展内自带的 VSIX（离线可用），
 * 没有内置 VSIX 时按扩展 ID 从扩展市场安装。
 * 同一会话内用户选择「稍后」后不再重复提示。
 */
async function promptInstallNotebookExtension(): Promise<boolean> {
    if (await ensureNotebookAvailable()) {
        return true;
    }
    if (promptedThisSession) {
        // 已提示过但用户未安装，再次使用相关功能时给出非模态提示
        vscode.window.showInformationMessage(
            l10n.t("The {0} extension is required for notebook features.", NOTEBOOK_EXTENSION_ID)
        );
        return false;
    }
    promptedThisSession = true;

    const installLabel = l10n.t("Install");
    const choice = await vscode.window.showWarningMessage(
        l10n.t("The {0} extension is required for notebook features.", NOTEBOOK_EXTENSION_ID),
        installLabel,
        l10n.t("Later")
    );
    if (choice !== installLabel) {
        return false;
    }
    return installNotebookExtension();
}

async function installNotebookExtension(): Promise<boolean> {
    if (!extensionContext) {
        return false;
    }

    let target: vscode.Uri | string = NOTEBOOK_EXTENSION_ID;
    const bundledVsix = vscode.Uri.joinPath(extensionContext.extensionUri, BUNDLED_VSIX_PATH);
    try {
        await vscode.workspace.fs.stat(bundledVsix);
        target = bundledVsix;
    } catch {
        // 没有内置 VSIX，改为从扩展市场安装
    }

    try {
        log.info(`Installing notebook extension: ${typeof target === 'string' ? target : target.fsPath}`);
        await vscode.commands.executeCommand("workbench.extensions.installExtension", target);
    } catch (err) {
        promptedThisSession = false;
        log.error(`Failed to install ${NOTEBOOK_EXTENSION_ID}: ${(err as Error).message}`);
        vscode.window.showErrorMessage(
            l10n.t("Failed to install {0}: {1}", NOTEBOOK_EXTENSION_ID, (err as Error).message)
        );
        return false;
    }

    if (await ensureNotebookAvailable()) {
        vscode.window.showInformationMessage(l10n.t("Notebook extension installed."));
        return true;
    }

    vscode.window.showInformationMessage(
        l10n.t("Notebook extension installation requested. Reload the window to enable notebook features.")
    );
    return false;
}

export { initializeNotebookSupport, ensureNotebookAvailable, promptInstallNotebookExtension };
