# VS Code 串口终端扩展（Serial Terminal）

> 在 VS Code 中直接完成串口连接、收发调试、日志记录与脚本化操作。

[中文](https://github.com/littrick/vscode-serial-terminal/blob/main/README.zh.md)|[English](https://github.com/littrick/vscode-serial-terminal/blob/main/README.md)

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
- [x] 支持通信日志保存与查看，便于复现与排查
- [x] 支持自动插入时间戳（可在设置中开启）
- [x] 支持自定义串口参数（含波特率）
- [x] 提供脚本笔记本，提升重复调试效率
- [x] 自动处理换行符，无需为 CR/LF 烦恼

---

## ❓ FAQ

### Q: 接收到的数据乱码或者不显示怎么办？

A: 可能是串口参数设置不正确，尤其是波特率。请确认设备的串口参数（如波特率、数据位、停止位、校验位）与扩展设置一致。

### Q: 日志文件在哪里？

A: 你可以从串口侧边栏的日志列表中查看已保存的日志文件，点击文件夹图标可以打开日志所在的文件夹，在设置界面可以自定义日志保存路径。

### Q: Notebook是什么？

A: Notebook（笔记本）是一种交互式文档，可以包含代码单元和文本单元。在串口扩展中，你可以使用Notebook来编写和执行串口交互脚本，自动化常见的调试任务。

---

## 🤝 反馈与贡献

如果你有新的意见，欢迎提交 [Issue](https://github.com/littrick/vscode-serial-terminal/issues) 与 [PR](https://github.com/littrick/vscode-serial-terminal/pulls)，一起把它打磨成更好用的 VS Code 串口工具。
