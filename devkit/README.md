# devkit

内部脚本，不是产品。这里的东西都只有同一个调用方：引擎里的那个 agent。

| 目录 | 作用 |
| --- | --- |
| `bin/apkbuild` | Java 项目进，签名 APK 出（aapt2 + d8 + apksigner，不用 Gradle） |
| `bin/newproj` | 生成 apkbuild 能直接编的项目骨架 |
| `android-cc/` | 在本机产出 Android 原生库的交叉工具链（Zig + NDK sysroot） |
| `ffbuild/` | 用上面那套工具链针对性编译 ffmpeg |

```sh
devkit/bin/apkbuild /path/to/project
devkit/bin/newproj demo -p com.dgupb.demo
devkit/android-cc/setup.sh
devkit/ffbuild/build.sh
```

## 为什么没有桥、没有面板

一度有过一个监听 127.0.0.1 的桥和一个网页控制台。它们存在的理由是「别的客户端也能调用」，
但这个场景里没有别的客户端：agent 自己有 shell，直接跑脚本比绕 HTTP 少一层。给人看的界面
在这里也是负担——要维护、要能跑起来、坏了还得查。所以只留无头脚本，用完即走。

## android-cc 与 ffbuild 的由来

NDK 自带的 clang 只有 x86_64 版本，aarch64 设备上执行不了；qemu 转译又需要 amd64 的 glibc，
而设备的 apt 源只有 ports。于是用 **Zig**（有 aarch64 原生版本、认识 Android ABI）配
**NDK 的 sysroot**（纯数据，不需要执行）来交叉编译。

细节和踩过的坑写在 `android-cc/README.md` 与 `ffbuild/README.md`。
