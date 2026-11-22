import { l10n } from 'vscode';

const invalidFileNameChars = /[\\/:*?"<>|\x00-\x1F]/;

/**
 * 文件 / 文件夹名校验。
 * 允许中文、空格等字符，只拒绝跨平台不安全的字符和 Windows 不允许的结尾。
 */
function validateFileName(name: string): string | undefined {
    const trimmed = name.trim();
    if (!trimmed) {
        return l10n.t("File name cannot be empty");
    }
    if (trimmed === '.' || trimmed === '..') {
        return l10n.t("File name cannot be . or ..");
    }
    if (invalidFileNameChars.test(trimmed)) {
        return l10n.t('File name cannot contain any of these characters: \\ / : * ? " < > |');
    }
    if (/[. ]$/.test(trimmed)) {
        return l10n.t("File name cannot end with a space or dot");
    }
    return undefined;
}

export { validateFileName };
