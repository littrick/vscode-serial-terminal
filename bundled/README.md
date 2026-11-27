# 离线安装依赖

此目录用于存放 Terminal Notebook for Markdown（`awsxxf.scriptnotebook`）的 VSIX：

```
bundled/awsxxf.scriptnotebook.vsix
```

- CI（`.github/workflows/Package.yaml`、`Release.yaml`）会从子模块
  `submodules/vscode-terminal-notebook` 构建该 VSIX，再随主扩展一起打包
- 本地打包时可手动构建：

  ```bash
  cd submodules/vscode-terminal-notebook
  npm ci --ignore-scripts
  npx vsce package --out ../../bundled/awsxxf.scriptnotebook.vsix
  ```

用户缺少该依赖时，扩展会提示安装，并优先安装这个内置 VSIX；
如果没有提供该文件，则回退为按扩展 ID 从扩展市场安装（需要联网）。

> 该文件已在 `.gitignore` 中忽略，不会提交到仓库。
