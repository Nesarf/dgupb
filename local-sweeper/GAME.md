# 扫雷 · 形状提示版

## 文件

| 路径 | 作用 |
| --- | --- |
| `sweeper_app.html` | 单文件应用（HTML + CSS + JS，约 26 KB），浏览器直接打开 |
| `android/SweeperApp/` | APK 工程：清单、MainActivity、图标、构建脚本 |
| `android/SweeperApp/assets/sweeper.html` | 打包时使用的副本，与根目录那份同步 |
| `saolei.py` / `ui_sweeper.py` / `hint_research.py` | 早期 Python 版本，见下方「已知限制」 |

## 构建 APK

```sh
cd android/SweeperApp
./build.sh
adb install -r /sdcard/Download/DSH-Go/扫雷.apk
```

依赖：`aapt2`（系统包）、`d8.jar` 与 `apksigner.jar`（`SDK=/opt/android-sdk`）、JDK。
签名用 `android/SweeperApp/debug.keystore`（固定，勿删），否则升级会报签名冲突。

## 提示语义

八邻域编号（左上 1，右下 8）：

```text
 1 2 3
 4   5
 6 7 8
```

一个数字格上最多挂一条提示：

```text
右上角  至少 n 颗   该形状里至少有 n 颗雷
右下角  共有 n 颗   该形状里恰好有 n 颗雷
```

「共有」只在形状覆盖该格全部未开邻格时给出（此时形状内雷数等于数字的剩余雷数），
所以两种提示都恒成立，不会随局面变化而失效。

## 档位

```text
精简  只显示非平凡的精确值（0 < n < 形状格数）
标准  再加「至少 2 颗」的弱提示
全部  含平凡结论（全安全 / 全雷）
关闭  不显示提示，纯经典玩法
```

## 操作

```text
点击        翻开
长按 0.4s   插旗 / 取消
拖 8px 以上  平移画面（放大后才有余量）
双指捏合     缩放 0.7x ~ 2.2x
点数字格     高亮该格提示覆盖的形状
「下一步」   求援：给出一格可确定的格，卡住时自动重算一次提示
「刷新提示」 整表重算（符号会变，仅在你主动点时发生）
```

## 已知限制

- 新翻开的格子会补算提示（只增不改），但整表重算只发生在「新局」和「刷新提示」。
- 形状里所有格子都被翻开后，该条提示不再绘制（没有可标的对象）。
- `saolei.py` / `ui_sweeper.py` / `hint_research.py` 是早期 Python 实现，
  提示逻辑仍包含上界推断，**可能与网页版的结论不同**，仅作算法参考。
