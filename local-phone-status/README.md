# local-phone-status

手机状态面板：电池、电量、温度、Wi-Fi、存储。

- 电池与 Wi-Fi 数据通过 Termux 桥调用 `termux-battery-status` 和 `termux-wifi-connectioninfo`；
- 存储数据直接读 `/sdcard` 的文件系统信息，不依赖桥。
- Termux 桥断开时，面板只显示存储，其余显示“未知”。
