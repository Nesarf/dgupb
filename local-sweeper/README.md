# local-sweeper

扫雷面板：每打开一次生成一局，棋盘用字符画显示，并给出形状提示的条数。

## 面板

- 位置：功能页 / 会话标签 / 对话面板
- 顶部数字是剩余雷数，下面是 9×9 的盘面（`#` 未开、`.` 空、数字是周围雷数）
- 「新局」重新发牌

面板里只做展示；想真玩就用 `src/` 里的桌面版。

## 完整版

| 文件 | 说明 |
| --- | --- |
| `src/Sweeper.java` | Swing 桌面版，单文件无依赖：`javac Sweeper.java && java Sweeper` |
| `src/ui_sweeper.py` | tkinter 版，窗口更轻：`python3 ui_sweeper.py` |
| `src/sweeper_core.py` | 生成 + 形状提示引擎（Python） |
| `lib/core.js` | 同一套算法的 JS 版，面板用它生成盘面 |

没有图形环境时，可以起虚拟显示再投到浏览器：

```sh
Xvfb :99 -screen 0 1400x900x24 &
DISPLAY=:99 python3 src/ui_sweeper.py &
x11vnc -display :99 -forever -shared -nopw -rfbport 5900 -bg
websockify --web /usr/share/novnc 6080 127.0.0.1:5900 &
# 浏览器打开 http://127.0.0.1:6080/vnc.html?autoconnect=1
```

## 形状提示

八邻域编号，左上为 1、右下为 8：

```
 1 2 3
 4   5
 6 7 8
```

共 25 个形状，例如 `↑`=123、`√`=347、`μ`=13456、`∫`=2367、`〈`=247、`〉`=257。
盘面上一格写出 `2←0`，表示这颗 2 的左边三格有 0 颗雷。

## 依赖

面板本身无依赖；桌面版需要 JDK 或 tkinter。

## Android APK

`android/` 是一个最小的 WebView 工程：清单 + `MainActivity` + 内嵌的 `assets/sweeper.html`。
不申请任何权限，也不联网。

```sh
cd android
./build.sh      # aapt2 -> javac -> d8 -> zip -> apksigner
```

需要 `android.jar`、`d8.jar`、`apksigner.jar` 与系统 `aapt2`；脚本里用 `SDK` 变量指向它们。
产物约 25 KB，签名后即可安装。
