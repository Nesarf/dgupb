# local-ichiwatashi

像素测量面板：在引擎侧调用 [Ichiwatashi](https://github.com/Nesarf/Ichiwatashi) 的 `judge`，
测量像素画并给出报告（颜色数、像素比例、孤立像素率、簇、轮廓、包围盒、dither 和 note）。

- 把要测的图保存为 `/sdcard/Download/DSH-Go/ichiwatashi-input.png`；
- 点「测量输入图」，报告会插入输入框；
- 工具目录默认找 `/root/workspace/Ichiwatashi`（已 `pip install -e`），需要 Python 3 和该包可导入。

只读：不修改图片，不写任何文件（报告只进输入框）。
