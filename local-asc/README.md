# local-asc

Aragami 审计面板：在引擎侧调用 [Aragami-SilentCrystal](https://github.com/Nesarf/Aragami-SilentCrystal)
的只读静态审计工具，展示环境与检查面。

- 面板显示运行模式、Tor Browser 安装数、Firefox profile 数、检查项数；
- 按钮“运行审计”和“版本检查”会把 CLI 输出插入输入框（截断到 4000 字）；
- 工具目录默认找 `/root/workspace/Aragami-SilentCrystal`，也可以用环境变量 `ARAGAMI_DIR` 指定。

只读：面板不写文件、不启动 Tor、不改配置。
