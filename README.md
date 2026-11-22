# VS Code Serial Terminal Extension

> Connect, debug, log, and automate serial communication directly inside VS Code.

[中文](https://github.com/littrick/vscode-serial-terminal/blob/main/README.zh.md)|[English](https://github.com/littrick/vscode-serial-terminal/blob/main/README.md)|[FAQ](https://github.com/littrick/vscode-serial-terminal/blob/main/FAQ.md)

---

## ✨ Why Use It

- **Stay in your editor**: Debug serial devices without switching tools.
- **Traceable communication**: Save and review logs for easier troubleshooting.
- **Automation-friendly**: Use the script notebook for repetitive operations.
- **Configurable setup**: Customize serial parameters, including baud rate.

---

## 🚀 Quick Start (3 Steps)

1. Install the extension and open the serial sidebar.
2. Select the port and parameters (such as baud rate), then connect.
3. Send/receive data in the terminal and enable log saving when needed.

---

## 🎬 Feature Demo

### 1) Open a Serial Port
![open.gif](https://s2.loli.net/2023/12/24/cF2y9Rpo8ixEQVG.gif)

### 2) Add a New Serial Configuration
![config.gif](https://s2.loli.net/2023/12/24/UR6txaOokhm3nYf.gif)

### 3) Start Logging
![log.gif](https://s2.loli.net/2023/12/24/NA1ldMSxO4qF5m6.gif)

### 4) Use the Script Notebook
![script.gif](https://s2.loli.net/2023/12/24/gsVy3Up4jfPxKE2.gif)

---

## 🧩 Core Features

- [x] Terminal-style real-time interaction for direct serial send/receive
- [x] Automatic serial port detection with hot-plug refresh; USB adapters are prioritized
- [x] Open ports are highlighted, and any custom port path can be opened manually
- [x] Built-in log saving and viewing, with optional timestamps and a recording indicator
- [x] Script notebook support, including opening Markdown files as notebooks
- [x] Flexible serial parameter configuration (including baud rate)
- [x] Automatic line-ending handling, so CR/LF differences are no longer a hassle

---

## ⚙️ Settings

| Setting | Default | Description |
| --- | --- | --- |
| `SerialTerminal.serialPort.configurations` | common presets | Configurations offered when opening a port (`baud[parity][data bits][stop bits]`) |
| `SerialTerminal.serialPort.autoRefresh` | `true` | Watch for port plug/unplug and refresh the list automatically |
| `SerialTerminal.serialPort.autoRefreshInterval` | `2000` | Polling interval in milliseconds (minimum 500) |
| `SerialTerminal.log.savePath` | `$HOME/serialTerminal/log` | Log folder. Reload the window after changing it |
| `SerialTerminal.log.autoSave` | `false` | Ask for a log file name when opening a port |
| `SerialTerminal.log.timestamp.enable` | `false` | Add timestamps to log entries |
| `SerialTerminal.log.timestamp.duration` | `20000000` | Timestamp interval in nanoseconds (20 ms) |
| `SerialTerminal.log.filterSpecialChars` | `true` | Remove ANSI escape sequences and control characters from log files |
| `SerialTerminal.notebook.savePath` | `$HOME/serialTerminal/notebook` | Notebook folder. Reload the window after changing it |
| `SerialTerminal.notebook.openMdAsNotebook` | `true` | Open `.md` files from the Script Notebook view as notebooks |

---

## ❓ FAQ

Common questions are answered in the [FAQ](https://github.com/littrick/vscode-serial-terminal/blob/main/FAQ.md).

---

## 🤝 Feedback & Contribution

If you have ideas or suggestions, feel free to open an [Issue](https://github.com/littrick/vscode-serial-terminal/issues) or [PR](https://github.com/littrick/vscode-serial-terminal/pulls) and help make this extension even better.
