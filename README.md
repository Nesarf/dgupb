# dgupb

dsh-go useful plugin bundle，一组本地 dsh-go 原生插件（手机 App 界面里的胶囊、面板、加号工具）。

## 插件

### local-dsh-ime —— DSH 输入法
加号面板「字符表」：

- 顶部按钮：粘贴剪贴板、码点转字（把 `U+4E2D` 这类码点转成字符）；
- 分类字符表：希腊字母、俄文字母、日文平假名/片假名、韩文、数学符号、箭头、全角标点、货币、特殊符号、大写数字；
- 点字符插入到输入框。

字符数据全部写成 `\u` 转义，源码保持纯 ASCII。

### local-termux-tools —— Termux 小工具
加号面板「手机」：

- 显示 Termux 桥、Shizuku 桥状态；
- 显示剪贴板内容，可复制、可发手机通知；
- 依赖 Termux:API（`termux-clipboard-get`、`termux-notification`）和 Termux 的 SSH 桥。

### local-trime-console —— 同文控制台
加号面板「同文」：

- 只读读取 `/sdcard/TETO` 的 Rime 配置；
- 显示当前方案列表、主题套数、词库挂载数、词表大小和最近部署时间。

## 安装

```sh
dsh plugin --profile web add /root/workspace/dgupb/local-dsh-ime
dsh plugin --profile web add /root/workspace/dgupb/local-termux-tools
dsh plugin --profile web add /root/workspace/dgupb/local-trime-console
```

清单（`package.json`）改动会自动重读；`lib/` 代码改动需要在 App 的「引擎」页重启引擎。

## 目录

```
dgupb/
  local-dsh-ime/         package.json  lib/index.js  cordis.patch.yml
  local-termux-tools/    package.json  lib/index.js  cordis.patch.yml
  local-trime-console/   package.json  lib/index.js  cordis.patch.yml
```

## 说明

- 这些插件只做 dsh-go App 内的原生界面与引擎侧逻辑，不改系统输入法、不常驻后台。
- 胶囊入口此前在部分 App 版本上渲染错位，所以全部入口放在加号面板里。
