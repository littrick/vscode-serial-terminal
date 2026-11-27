import * as vscode from "vscode";
import { Event, ProviderResult, ThemeColor, ThemeIcon, TreeDataProvider, TreeItem } from "vscode";
import { listSerialPort, serialInfoToString, sortSerialPorts } from "../serial/serialInfo";
import { serialTerminalManager } from "../terminal/serialTerminal";


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
                    const treeItem = sortSerialPorts(ports)
                        .map((port) => {
                            const info = (port as any).friendlyName || port.manufacturer;
                            const terminal = serialTerminalManager.getSerialPortTerminal(port.path);
                            const isOpen = terminal?.isOpen() ?? false;
                            // 有终端但未连接（打开失败或已断开）显示红色；没有终端保持默认色
                            const iconColor = terminal
                                ? new ThemeColor(isOpen ? "charts.green" : "charts.red")
                                : undefined;
                            return {
                                id: port.path,
                                label: port.path,
                                description: info,
                                tooltip: serialInfoToString(port),
                                iconPath: new ThemeIcon("plug", iconColor),
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