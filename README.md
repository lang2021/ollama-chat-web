# Ollama Chat Web

一个轻量的本地聊天网页，用来和本机的 Ollama 模型直接对话，默认适配 `qwen3.5:9b`。

这个项目适合想要快速搭一个本地 AI 聊天界面的场景，不依赖前端框架，也不需要额外安装 npm 依赖。

## Features

- 连接本地 Ollama 接口，默认地址为 `http://127.0.0.1:11434`
- 默认模型为 `qwen3.5:9b`
- 支持连续对话
- 支持流式输出
- 支持 Markdown 回复渲染
- 支持显示并折叠模型思考过程
- 自动优化部分模型返回的分词碎片和换行问题
- 提供一键启动和一键关闭脚本

## Files

- `index.html`: 页面结构
- `styles.css`: 页面样式
- `app.js`: 聊天逻辑、流式处理、Markdown 渲染、思考折叠
- `start-chat.bat`: 启动本地静态服务并打开网页
- `stop-chat.bat`: 关闭聊天网页服务
- `stop-chat.ps1`: 彻底清理聊天网页相关进程

## Requirements

- Windows
- Python 3
- 已安装并可运行的 [Ollama](https://ollama.com/)
- 本地已拉取模型，例如：

```powershell
ollama pull qwen3.5:9b
```

## Quick Start

1. 启动 Ollama

```powershell
ollama serve
```

2. 进入项目目录

```powershell
cd ollama-chat-web
```

3. 启动网页

双击 `start-chat.bat`

或者在终端执行：

```powershell
.\start-chat.bat
```

启动后会自动打开：

```text
http://127.0.0.1:8765
```

## Stop Service

关闭网页服务时，运行：

```powershell
.\stop-chat.bat
```

这个脚本会尝试：

- 结束占用 `8765` 端口的本地静态服务
- 清理由 `start-chat.bat` 拉起的相关进程树

## Model Settings

页面默认配置：

- Ollama 地址：`http://127.0.0.1:11434`
- 模型：`qwen3.5:9b`

如果你的 Ollama 地址或模型标签不同，可以直接在页面顶部修改。

## Thinking Display

如果模型返回了思考内容，页面会自动识别并折叠显示。

目前支持两种情况：

- 回复中直接包含 `<think>...</think>`
- 流式接口返回 `thinking`、`reasoning` 或 `reasoning_content`

思考区域支持：

- 折叠/展开
- Markdown 渲染
- 自动整理部分中文 token 拆分和异常换行

## Markdown Support

回复内容目前支持常见 Markdown 格式：

- 标题
- 列表
- 粗体
- 斜体
- 行内代码
- 代码块
- 链接

## Notes

- 这是一个纯前端静态页面，通过浏览器直接请求本地 Ollama API
- 为避免直接打开 HTML 时遇到浏览器跨域或本地文件限制，项目使用 `python -m http.server` 启动本地服务
- 如果 `http://127.0.0.1:11434` 无法连接，请先确认 Ollama 是否已启动

## Screenshot

你可以在上传到 GitHub 后自行补充截图。

## License

MIT
