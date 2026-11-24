# android-cc

在本机（aarch64 Linux / proot）上产出 Android 原生库的工具链。

## 为什么不是 NDK、不是 qemu

NDK 自带的 clang 只有 **x86_64** 版本，aarch64 设备上根本执行不了（`Exec format error`）。
用 qemu 转译则需要一套 amd64 的 glibc，而设备的 apt 源是 ports（arm64），装 `libc6:amd64`
会连带一堆依赖失败。

绕开的办法是：**Zig 有 aarch64 原生版本，且知道 Android ABI**；NDK 里的
`sysroot`（头文件 + stub 库）是**纯数据**，不需要执行，直接指给 Zig 用即可。
两者一拼，就能在这台手机上编出 `ELF64 / AArch64 / DYN` 的安卓库。

## 用法

```sh
devkit/android-cc/setup.sh          # 下载 Zig、定位 NDK sysroot、生成包装器
devkit/android-cc/zigcc -c foo.c    # 编译
devkit/android-cc/zigcc -shared -o libfoo.so foo.c
```

环境变量：`ZIG_VER`（默认 0.13.0）、`ZIG_ROOT`、`NDK_DIR`、`API`（默认 29）。

NDK 需要自己下一次（约 660 MB）：

```sh
curl -LO https://dl.google.com/android/repository/android-ndk-r27c-linux.zip
unzip -q android-ndk-r27c-linux.zip -d /opt
```

## 两个坑

1. **`zig cc` 找不到 libc**：Zig 不自带 bionic 头文件，会报 `libc not available`。
   用 `-I$SYSROOT/usr/include/aarch64-linux-android -I$SYSROOT/usr/include` 补上，
   链接时用 `-L$SYSROOT/usr/lib/aarch64-linux-android/<API>`。
2. **configure 的可执行文件探针**：交叉编译到 Android 出不了可执行文件
   （没有 `_start`、没有 crt）。`zigcc` 对这类调用直接伪造成功——反正我们只要 `.so`。

产出的库 `malloc`/`snprintf` 之类是 `UND`，由 Android 运行时从已加载的 libc 解析，
这是正常形态。
