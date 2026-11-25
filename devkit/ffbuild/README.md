# ffbuild

在设备上针对性编译 ffmpeg，并打成单个能被 JNI 加载的 `.so`。

```sh
../android-cc/setup.sh      # 先备好 Zig + NDK sysroot 工具链
./build-x264.sh             # 编 x264 静态库（可选，但有了才有 H.264 软编码）
./build.sh                  # 编 ffmpeg 静态库 + fftools，最后自动链接 .so
```

环境变量：`FF_VER`（默认 7.1）、`API`（29）、`PREFIX`、`SRC`、`DEPS`。

## 实际编入的组件

| 类别 | 内容 |
| --- | --- |
| 视频编码 | libx264 |
| 音频编码 | aac、flac、pcm_s16le |
| 解码 | aac、h264、hevc、mp3、opus、vorbis、flac、pcm |
| 封装 | matroska、mp4、wav、flac、ogg、adts |
| 滤镜 | aresample、anull、format、null、scale、transpose、fade、afade、volume、atempo、setpts |

## 为什么要把 CLI 编成库

Android 不允许从应用数据目录执行二进制（W^X 限制），所以不能塞一个 `ffmpeg`
可执行文件进去。做法是把 `fftools/` 编成目标文件、把 `main` 改名成
`ffmpeg_main`，再用 JNI 包一层 `run(String[])`，这样它就是一次普通函数调用。

## 链接一个能 dlopen 的共享库，四处必须对

这几条是踩出来的，少一处就是 `dlopen failed`，而且报错通常只给一句笼统的话。

1. **`-Wl,-soname`**。手工链接的库默认没有 `DT_SONAME`，安卓 linker 直接拒收。
2. **`libc.so` 必须出现在 NEEDED 里**。Zig 传 `-lc` 会被 `--as-needed` 丢掉，
   结果 NEEDED 只剩 `libm.so`；此时 `stdout`、`longjmp` 这类符号运行时全都
   找不到。正确做法是 `-Wl,--no-as-needed $SYSROOT/usr/lib/.../libc.so` 显式列出。
3. **静态库要用 `-fPIC` 编**。否则 aarch64 汇编里的 `adrp/add` 重定位进不了
   共享库，报 `relocation R_AARCH64_ADR_PREL_PG_HI21 cannot be used`。
   x264 同样要 `--enable-pic`。
4. **`-Bsymbolic`** 用来压住 ffmpeg 内部表（`ff_tx_tab_*`）的符号抢占。
   注意 Zig 的 lld **不支持** `-Bsymbolic-functions`、`--exclude-libs`、`--wrap`。

## 还有两个小坑

- **`stdout` / `stderr`**：bionic 把它们放在内部 `__sF` 数组，外部库拿不到这个
  无版本文本符号。`jni_glue.c` 里自己定义一份，用构造函数 `fdopen(1/2)` 接上。
- **`exit()`**：`ffmpeg_main` 只有一处真 `exit`（连续三次退出信号时的硬退出），
  正常路径是返回的，所以不必给整个库做 `--wrap`。

## 验证

```sh
readelf -d libffmpegcli.so | grep -E "SONAME|NEEDED"   # SONAME 与 libc 都要有
readelf -h libffmpegcli.so | grep Machine               # AArch64
grep -E "^#define CONFIG_(H264|LIBX264)_" ../ffmpeg-7.1/config_components.h
```

产物进 APK 时放 `lib/arm64-v8a/`，配 `android:extractNativeLibs="true"` 即可
（压缩存储也行，系统会在安装时解压）。
