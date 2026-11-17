# local-asc

审计与监控面板，合并两个本地工具：

## Aragami 审计

在引擎侧调用 [Aragami-SilentCrystal](https://github.com/Nesarf/Aragami-SilentCrystal)
的只读静态审计：显示运行模式、Tor Browser 安装数、Firefox profile 数、检查面项数；
「运行审计」和「版本检查」把 CLI 输出插入输入框。

## VML 监控

[Vtuber's Monitor Link](https://github.com/Nesarf/VtuberMonitorLink) 的本地服务管理：

- 显示服务状态（监听 127.0.0.1:43110）、配置是否已保存、访问地址；
- 「启动 VML」：后台启动 `node server/src/index.js`（NO_OPEN=1，不自动开浏览器）；
- 「停止 VML」：结束该服务进程。

服务依赖在 `/root/workspace/VtuberMonitorLink/server/node_modules`（已 npm install）。
VML 的网页界面打开 http://127.0.0.1:43110 使用。

## VML LLM 设置

- 显示当前 provider / model / API key 是否已设置；
- 「剪贴板设 Key」：先复制 API key，再点按钮，会通过 `PUT /api/config` 写入 VML 配置；
- 「测试 LLM」：调用 `POST /api/llm/test` 检查连接。

