# local-devkit

开发工具面板：看 dgupb devkit 的桥接站和构建链状态，一键启停。

- 桥接站运行状态、端口、pid；
- C 桥二进制与 aapt2 / d8 / apksigner / android.jar 是否就绪；
- 启动 / 停止 / 刷新。

面板本身只读，按钮调用的是 `devkit/bin/devkit-run`。真正的实现在 `devkit/`：

```sh
devkit/bin/apkbuild /path/to/project    # 一条命令出签名 APK
devkit/bin/devkit-run start             # 起本地桥
curl 'http://127.0.0.1:8737/status'     # 任何客户端都能问
```
