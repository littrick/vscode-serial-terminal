# FAQ

[中文](https://github.com/littrick/vscode-serial-terminal/blob/main/FAQ.zh.md)|[English](https://github.com/littrick/vscode-serial-terminal/blob/main/FAQ.md)

返回 [README](https://github.com/littrick/vscode-serial-terminal/blob/main/README.zh.md)

---

## Q: 接收到的数据乱码或者不显示怎么办？

A: 可能是串口参数设置不正确，尤其是波特率。请确认数据位、停止位、校验位也与设备一致，并检查终端是否连接到了预期的设备。

## Q: 日志文件在哪里？

A: 已保存的日志会显示在 **Logs** 视图中。点击视图标题栏的文件夹图标可以在系统文件管理器中打开日志目录。要修改保存路径，请调整 `SerialTerminal.log.savePath`，修改后需要重载窗口。

## Q: 日志时间戳有什么缺陷？

A: 时间戳按“收到的数据块”添加，而不是按行：

- 一个数据块包含多行时只有块首有时间戳；一行被拆成多块时，时间戳可能出现在行中间。
- 只有与上一块的间隔达到 `SerialTerminal.log.timestamp.duration`（默认 20ms）才添加，且只精确到秒——快速连续输出可能没有时间戳或出现重复时间。
- 记录的是扩展收到数据的时刻，而不是设备发送时刻；时间戳只写入日志文件。

需要精确到行的时序时，建议在设备端或上层协议中打时间戳。

## Q: Notebook 是什么？

A: Notebook（笔记本）是一种由代码单元和文本单元组成的交互式文档。在串口扩展中，你可以用它编写和执行串口交互脚本，自动化常见的调试任务。Markdown 文件（`.md`）和 Notebook 文件（`.mdnb` / `.scrnb`）都可以作为笔记本打开。

## Q: 绿色插头图标是什么意思？为什么有些端口排在后面？

A: 绿色插头表示该串口当前有已打开的终端。端口列表中，真实的 USB 串口会排在前面；在 Windows 和 Linux 上，蓝牙串口会排在最后，因为它们通常只有在配对设备在线时才可用。

## Q: 列表里没有的串口怎么打开？

A: 点击 **可用串口** 视图标题栏的 `+` 按钮，输入串口路径即可——Windows 下例如 `COM3`，Linux / macOS 下例如 `/dev/ttyUSB0` 或 `/dev/serial/by-id/...`。自定义端口的使用方式与普通串口一致，但不会出现在列表中，也不参与热插拔检测。

## Q: 为什么 Markdown 文件会以 Notebook 打开？怎么用文本编辑器打开？

A: 从 **Script Notebook** 视图打开 `.md` 文件时，默认使用 Notebook 编辑器。将 `SerialTerminal.notebook.openMdAsNotebook` 设为 `false` 即可改为文本编辑器打开；从资源管理器直接打开 `.md` 文件不受影响。

## Q: 默认的日志文件名规则是什么？

A: 默认为 `YYYY-MM-DD_端口_HH-mm-ss.log`，例如 `2026-11-22_COM13_15-30-45.log`。开始录制前可以修改名称，支持中文和空格。
