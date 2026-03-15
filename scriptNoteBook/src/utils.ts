import { l10n, window } from "vscode";

const log = window.createOutputChannel(l10n.t("Terminal Notebook"), { log: true });

export {
    log
};