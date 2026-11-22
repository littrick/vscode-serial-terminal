# VS Code 串口终端扩展（Serial Terminal）

> 在 VS Code 中直接完成串口连接、收发调试、日志记录与脚本化操作。

[中文](https://github.com/littrick/vscode-serial-terminal/blob/main/README.zh.md)|[English](https://github.com/littrick/vscode-serial-terminal/blob/main/README.md)|[FAQ](https://github.com/littrick/vscode-serial-terminal/blob/main/FAQ.zh.md)

---

## ✨ 为什么使用它

- **不切工具**：在编码环境中直接调试串口，减少上下文切换。
- **可追溯**：支持日志保存与查看，便于问题复现和排查。
- **可自动化**：脚本笔记本让重复操作更高效。
- **可定制**：支持配置项与自定义波特率等串口参数。

---

## 🚀 快速开始（3 步）

1. 安装扩展并打开串口侧边栏。
2. 选择串口与参数（如波特率）后连接设备。
3. 在终端中收发数据，按需开启日志记录。

---

## 🎬 功能演示

### 1) 打开串口
![open.gif](https://s2.loli.net/2023/12/24/cF2y9Rpo8ixEQVG.gif)

### 2) 新增串口配置
![config.gif](https://s2.loli.net/2023/12/24/UR6txaOokhm3nYf.gif)

### 3) 开始保存日志
![log.gif](https://s2.loli.net/2023/12/24/NA1ldMSxO4qF5m6.gif)

### 4) 使用脚本笔记本
![script.gif](https://s2.loli.net/2023/12/24/gsVy3Up4jfPxKE2.gif)

---

## 🧩 核心特性

- [x] 终端式实时交互，串口收发响应更直观
- [x] 自动检测串口热插拔并刷新列表，USB 串口优先展示
- [x] 已打开的端口高亮标记，并支持手动输入任意串口路径
- [x] 支持通信日志保存与查看，可选时间戳与录制状态提示
- [x] 提供脚本笔记本，并支持将 Markdown 文件作为笔记本打开
- [x] 支持自定义串口参数（含波特率）
- [x] 自动处理换行符，无需为 CR/LF 烦恼

---

## ⚙️ 设置项

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| `SerialTerminal.serialPort.configurations` | 常用配置 | 打开串口时可选配置（`波特率[校验位][数据位][停止位]`） |
| `SerialTerminal.serialPort.autoRefresh` | `true` | 监听串口插拔并自动刷新列表 |
| `SerialTerminal.serialPort.autoRefreshInterval` | `2000` | 轮询间隔（毫秒，最小 500） |
| `SerialTerminal.log.savePath` | `$HOME/serialTerminal/log` | 日志保存目录，修改后需重载窗口 |
| `SerialTerminal.log.autoSave` | `false` | 打开串口时自动弹出日志文件名 |
| `SerialTerminal.log.timestamp.enable` | `false` | 在日志行前添加时间戳 |
| `SerialTerminal.log.timestamp.duration` | `20000000` | 时间戳间隔（纳秒，默认 20ms） |
| `SerialTerminal.log.filterSpecialChars` | `true` | 移除日志中的 ANSI 转义序列和控制字符 |
| `SerialTerminal.notebook.savePath` | `$HOME/serialTerminal/notebook` | Notebook 保存目录，修改后需重载窗口 |
| `SerialTerminal.notebook.openMdAsNotebook` | `true` | 从脚本视图打开 `.md` 时使用 Notebook 编辑器 |

---

## ❓ FAQ

常见问题请见 [FAQ](https://github.com/littrick/vscode-serial-terminal/blob/main/FAQ.zh.md)。

---

## 🤝 反馈与贡献

如果你有新的意见，欢迎提交 [Issue](https://github.com/littrick/vscode-serial-terminal/issues) 与 [PR](https://github.com/littrick/vscode-serial-terminal/pulls)，一起把它打磨成更好用的 VS Code 串口工具。
