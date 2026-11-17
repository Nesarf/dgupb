# local-lineweight

线稿面板：在引擎侧调用 [LineWeight](https://github.com/Nesarf/LineWeight) 生成带笔压的矢量线稿。

- **生成示例线稿**：运行 LineWeight 默认命令，输出 `/sdcard/Download/DSH-Go/strokes.svg`（纯 SVG，可导入 Illustrator / SAI / Animate）；
- **测量输入图**：用 `--fit` 对照真实线稿库测量一张图，报告插入输入框（需要把图片放成 `/sdcard/Download/DSH-Go/lineweight-input.png`）；
- 工具目录默认 `/root/workspace/LineWeight`，通过 PYTHONPATH 调用，不需要 pip 安装。

只写输出目录下的 SVG 和报告文本，不改其他文件。
