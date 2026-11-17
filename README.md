# dgupb

<img src="assets/icon.jpg" alt="dgupb" width="160">

dsh-go useful plugin bundle：一组本地 dsh-go 原生插件，给手机 App 加面板和加号工具。

## 插件

| 插件 | 作用 | 依赖 |
| --- | --- | --- |
| `local-dsh-ime` | DSH 输入法：字符表、码点转字、粘贴剪贴板 | 无 |
| `local-termux-tools` | Termux 小工具：桥状态、剪贴板、发通知 | Termux 桥 + Termux:API |
| `local-trime-console` | 同文控制台：只读查看 Rime 配置状态 | 无 |
| `local-snippets` | 快捷文本：内置加自定义模板，点一下插入 | 无 |
| `local-phone-status` | 手机状态：电池、温度、Wi-Fi、存储 | Termux 桥（存储不依赖） |
| `local-code-point` | 码点工具：剪贴板文字转 Unicode 码点 | 剪贴板权限 |
| `local-mega` | Mim 索引：mega-index-map 的 Library 统计 | 无 |
| `local-shell` | 宿主环境：引擎机器的内存、负载、磁盘 | 无 |
| `local-asc` | Aragami 审计：Tor/Firefox 静态姿态审计面板 | Aragami-SilentCrystal 仓库 |
| `local-ichiwatashi` | 像素测量：Ichiwatashi 的像素画质量报告 | Ichiwatashi 仓库 + Python |
| `local-volcano` | 宿主观察：进程、负载、内存、磁盘 | 无 |
| `local-lineweight` | 线稿：LineWeight 生成带笔压的矢量线稿 | LineWeight 仓库 + Python |

## 安装

一条命令批量安装：

```sh
bash install.sh
```

或者逐个安装：

```sh
dsh plugin --profile web add /root/workspace/dgupb/local-dsh-ime
```

清单（`package.json`）改动会自动重读；`lib/` 代码改动需要在 App 的「引擎」页重启引擎。

## 目录

```
dgupb/
  install.sh             批量安装脚本
  assets/icon.jpg        项目图标
  local-dsh-ime/         各插件一个目录
  ...
```

每个插件目录里是 `package.json`、`cordis.patch.yml`、`lib/index.js` 和 `README.md`。

## 说明

- 插件只做 dsh-go App 内的原生界面与引擎侧逻辑，不改系统输入法、不常驻后台。
- 胶囊入口在部分 App 版本上渲染错位，所以入口统一放在加号面板里。
- 许可证：MIT，见 [LICENSE](LICENSE)。
