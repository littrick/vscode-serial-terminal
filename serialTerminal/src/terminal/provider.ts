import { CancellationToken, ExtensionContext, ProviderResult, TerminalProfile, TerminalProfileProvider, window } from "vscode";
import { pickConfiguration, pickLogFile, pickSerialPort } from "../view/picker";
import { log } from "../logger";
import { SerialTerminal, serialTerminalManager } from "./serialTerminal";
import { setting } from "../context/setting";


const provider = new (class implements TerminalProfileProvider {
    provideTerminalProfile(token: CancellationToken): ProviderResult<TerminalProfile> {
        return new Promise<TerminalProfile>(async (resolve) => {
            let portPath = await pickSerialPort();
            if (!portPath) {
                log.error("No serial port selected");
                return;
            }

            let spt = serialTerminalManager.getSerialPortTerminal(portPath);
            if (spt) {
                await spt.show();
                return;
            }

            let cfg = await pickConfiguration();
            if (!cfg) {
                log.error("No configuration selected");
                return;
            }

            if (setting.autoSaveLog) {
                let logFile = await pickLogFile(portPath);
                if (!logFile) {
                    log.error("No log file selected");
                    return;
                }

                spt = await serialTerminalManager.getOrCreateSerialPortTerminal(portPath, cfg, true);
                spt.beginRecord(logFile);
            } else {
                spt = await serialTerminalManager.getOrCreateSerialPortTerminal(portPath, cfg, true);
            }
            resolve(new TerminalProfile(spt.getTerminalOptions()));
        });
    }
})();


function registerSerialPortTerminalProfile(context: ExtensionContext) {
    context.subscriptions.push(
        window.registerTerminalProfileProvider("serialPortTerminal", provider)
    );
}

export { registerSerialPortTerminalProfile };