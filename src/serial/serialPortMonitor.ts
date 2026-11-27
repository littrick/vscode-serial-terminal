import * as vscode from 'vscode';
import { SerialPort } from 'serialport';
import { SerialInfo } from './serialInfo';
import { serialPortSettingId, setting } from '../context/setting';
import { log } from '../logger';

const MIN_INTERVAL_MS = 500;
const DEFAULT_INTERVAL_MS = 2000;

interface SerialPortChange {
    added: SerialInfo[];
    removed: string[];
}

/**
 * 串口热插拔监控。
 * serialport 库没有提供设备变化事件，这里通过定时调用 SerialPort.list() 做差集。
 */
class SerialPortMonitor implements vscode.Disposable {
    private timer: NodeJS.Timeout | undefined;
    private known = new Set<string>();
    private polling = false;
    private initialized = false;

    constructor(private readonly onDidChange: (change: SerialPortChange) => void) { }

    start(intervalMs: number) {
        this.stop();
        void this.poll();
        this.timer = setInterval(() => void this.poll(), intervalMs);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    dispose() {
        this.stop();
    }

    private async poll() {
        if (this.polling) {
            return;
        }
        this.polling = true;

        try {
            const ports = await SerialPort.list();
            const next = new Map(ports.map((port) => [port.path, port]));
            const added = [...next.values()].filter((port) => !this.known.has(port.path));
            const removed = [...this.known].filter((path) => !next.has(path));
            this.known = new Set(next.keys());

            // 第一次轮询只记录初始状态，不触发刷新
            if (!this.initialized) {
                this.initialized = true;
                return;
            }

            if (added.length > 0 || removed.length > 0) {
                log.info(
                    `Serial ports changed, added: [${added.map((port) => port.path).join(', ')}], `
                    + `removed: [${removed.join(', ')}]`
                );
                this.onDidChange({ added, removed });
            }
        } catch (err) {
            // 枚举失败（驱动异常、权限问题等）时忽略这一轮
            log.warn(`Failed to enumerate serial ports: ${(err as Error).message}`);
        } finally {
            this.polling = false;
        }
    }
}

function registerSerialPortMonitor(context: vscode.ExtensionContext, onDidChange: () => void) {
    const monitor = new SerialPortMonitor(() => onDidChange());
    context.subscriptions.push(monitor);

    const apply = () => {
        monitor.stop();
        if (!setting.serialPortAutoRefresh) {
            return;
        }
        const configured = setting.serialPortAutoRefreshInterval;
        const interval = Number.isFinite(configured)
            ? Math.max(MIN_INTERVAL_MS, configured)
            : DEFAULT_INTERVAL_MS;
        monitor.start(interval);
    };

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(serialPortSettingId)) {
                // 等 setting.update() 生效后再应用新的开关/间隔
                setTimeout(apply, 0);
            }
        })
    );

    apply();
}

export { registerSerialPortMonitor };
