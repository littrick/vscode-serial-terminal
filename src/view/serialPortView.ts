import * as vscode from "vscode";
import { Event, ProviderResult, ThemeColor, ThemeIcon, TreeDataProvider, TreeItem } from "vscode";
import { listSerialPort, serialInfoToString, serialPortPriority } from "../serial/serialInfo";
import { serialTerminalManager } from "../terminal/serialTerminal";
import { compareNames } from "../utils";


function registerSerialPortView(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.createTreeView("serialport.serialportView", {
            treeDataProvider: serialPortProvider,
        }),
        serialTerminalManager.onDidChangeTerminals(() => serialPortProvider.update())
    );
}

const serialPortProvider = new (class implements TreeDataProvider<TreeItem> {
    updateEmitter = new vscode.EventEmitter<void>();
    onDidChangeTreeData: Event<void | TreeItem | TreeItem[] | null | undefined> | undefined = this.updateEmitter.event;
    update() {
        this.updateEmitter.fire();
    }

    getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
        return element;
    }
    getChildren(): ProviderResult<TreeItem[]> {
        return new Promise((resolve, reject) => {
            // 使用 serialport 模块获取可用的串口设备
            listSerialPort()
                .then((ports) => {
                    const treeItem = [...ports]
                        .sort((a, b) => {
                            // 可用性优先（USB 串口在前、蓝牙串口在后），同优先级按名称排序
                            const priorityDiff = serialPortPriority(a) - serialPortPriority(b);
                            return priorityDiff !== 0 ? priorityDiff : compareNames(a.path, b.path);
                        })
                        .map((port) => {
                            const info = (port as any).friendlyName || port.manufacturer;
                            const isOpen = serialTerminalManager.getSerialPortTerminal(port.path)?.isOpen() ?? false;
                            return {
                                id: port.path,
                                label: port.path,
                                description: info,
                                tooltip: serialInfoToString(port),
                                iconPath: new ThemeIcon("plug", isOpen ? new ThemeColor("charts.green") : undefined),
                                contextValue: isOpen ? "serialPortOpened" : "serialPort",
                            };
                        });
                    resolve(treeItem);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }
})();


function updateSerialPortProvider() {
    serialPortProvider.update();
}

export {
    registerSerialPortView,
    updateSerialPortProvider,
};