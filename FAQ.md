# FAQ

[中文](https://github.com/littrick/vscode-serial-terminal/blob/main/FAQ.zh.md)|[English](https://github.com/littrick/vscode-serial-terminal/blob/main/FAQ.md)

Back to [README](https://github.com/littrick/vscode-serial-terminal/blob/main/README.md)

---

## Q: Received data is garbled or not displayed

A: Check the serial parameters, especially the baud rate. Data bits, stop bits, and parity must match the device settings as well. Also make sure the terminal is connected to the device you expect.

## Q: Where are log files saved?

A: Saved logs are listed in the **Logs** view. The folder icon in the view title opens the log directory in your OS file manager. To change the directory, edit `SerialTerminal.log.savePath` and reload the window afterwards.

## Q: What are the limitations of log timestamps?

A: Timestamps are added per received data chunk, not per line:

- A chunk containing several lines gets only one timestamp at its start, and a line split across chunks may get a timestamp in the middle.
- A timestamp is only added when the gap since the previous chunk reaches `SerialTerminal.log.timestamp.duration` (default 20 ms), and only with second precision — fast output may have no timestamp or repeated ones.
- The time is when the extension received the data, not when the device sent it. Timestamps are written to the log file only.

For exact per-line timing, generate timestamps on the device side.

## Q: What is a Notebook?

A: A notebook is an interactive document made of code cells and text cells. In this extension it can be used to write and run serial interaction scripts and automate repetitive debugging steps. Markdown files (`.md`) and notebook files (`.mdnb` / `.scrnb`) can be opened as notebooks.

## Q: What does the green plug icon mean, and why are some ports sorted last?

A: A green plug marks a port that currently has an open terminal. In the port list, real USB serial adapters are shown first. On Windows and Linux, Bluetooth serial ports are placed last because they are only usable while the paired device is connected.

## Q: How do I open a serial port that isn't in the list?

A: Click the `+` button in the **Available Serial Ports** view title and enter the port path — for example `COM3` on Windows, or `/dev/ttyUSB0` / `/dev/serial/by-id/...` on Linux and macOS. Custom ports behave like normal serial terminals, but they are not added to the list or tracked by hot-plug detection.

## Q: Why does a Markdown file open as a notebook? How can I open it as text instead?

A: When opened from the **Script Notebook** view, `.md` files use the notebook editor by default. Set `SerialTerminal.notebook.openMdAsNotebook` to `false` to open them in the text editor instead. Opening a `.md` file from the Explorer is not affected.

## Q: What is the default log file name?

A: `YYYY-MM-DD_<port>_HH-mm-ss.log`, for example `2026-11-22_COM13_15-30-45.log`. The name can be edited before recording starts; Chinese characters and spaces are supported.
