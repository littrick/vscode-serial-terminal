import { l10n, window } from "vscode";

const log = window.createOutputChannel(l10n.t("Script Notebook"), { log: true });

export {
    log
};