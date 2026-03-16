import * as vscode from 'vscode';
import { EventEmitter, ExtensionTerminalOptions, Terminal as VsTerminal, TerminalDimensions, window } from "vscode";
import { log } from '../logger';
import * as context from '../context/context';

class Terminal {
    private writeEmitter = new EventEmitter<string>;
    private closeEmitter = new EventEmitter<void | number>;

    private onOpen: Set<(initialDimensions?: TerminalDimensions) => void> = new Set;
    private onInput: Set<(data: string) => void> = new Set;
    private onClose: Set<() => void> = new Set;

    private opts: ExtensionTerminalOptions;
    private isPty: boolean;
    private terminalInstance: () => VsTerminal | undefined = () =>
        vscode.window.terminals.find((terminal) => terminal.name === this.opts.name);

    constructor(name: string, isPty: boolean = false) {
        this.opts = {
            pty: {
                onDidWrite: this.writeEmitter.event,
                onDidClose: this.closeEmitter.event,
                open: (initialDimensions?: vscode.TerminalDimensions) => {
                    this.onOpen.forEach(callback => callback(initialDimensions));
                },
                close: () => {
                    this.onClose.forEach(callback => callback());
                },
                handleInput: (data: string) => {
                    this.onInput.forEach(callback => callback(data));
                },
            },
            name: name,
        };
        if (!isPty) {
            window.createTerminal(this.opts);
        }
        this.isPty = isPty;
    }

    addListener(event: 'open', callback: (initialDimensions?: TerminalDimensions) => void): this;
    addListener(event: 'input', callback: (data: string) => void): this;
    addListener(event: 'close', callback: () => void): this;
    addListener(event: string, callback: Function): this {
        switch (event) {
            case 'open':
                this.onOpen.add(callback as (initialDimensions?: TerminalDimensions) => void);
                break;
            case 'input':
                this.onInput.add(callback as (data: string) => void);
                break;
            case 'close':
                this.onClose.add(callback as () => void);
                break;
        }
        return this;
    }

    write(data: string) {
        this.writeEmitter.fire(data);
    }

    async show() {
        log.info(`Showing terminal ${this.opts.name}`);

        let terminal = this.terminalInstance();

        log.info(`Terminal instance: ${terminal ? terminal.name : 'undefined'}`);

        if (!terminal && !this.isPty) {
            log.info("Terminal instance not found, creating new terminal");
            window.createTerminal(this.opts);
        }

        await this.terminalInstance()?.show();
        context.setSerialTerminalFocus(true);
    }

    close(n: number | void) {
        this.closeEmitter.fire(n);
    }

    get options(): ExtensionTerminalOptions {
        return this.opts;
    }

    // for debug
    fmt = () => `Terminal(name=${this.opts.name}, isPty=${this.isPty}, instance=${!!this.terminalInstance()}`;
}

export { Terminal };