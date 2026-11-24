# ffbuild

在设备上针对性编译 ffmpeg：只留要用的编解码器，产出的库直接打进 APK。

```sh
../android-cc/setup.sh      # 先备好工具链
./build.sh                  # 默认 ffmpeg 7.1，装到 /opt/ffbuild/out
```

可用环境变量：`FF_VER`、`API`、`PREFIX`、`SRC`。

## 实际编入的组件

| 类别 | 内容 |
| --- | --- |
| 封装 | adts、flac、matroska、mov、mp4、ogg、wav |
| 解封装 | flac、matroska、mov、ogg、wav |
| 解码 | aac、h264、hevc、flac、mp3、opus、vorbis、pcm_s16le/be |
| 编码 | aac、flac、pcm_s16le |
| 其他 | swresample、swscale、aresample/scale/format/null 滤镜 |

## 三个必须处理的坑

1. **平台特性误判**。configure 的特性探针靠链接判定，而 NDK 的 sysroot 里放着
   `libd3d11.so`/`libdxgi.so` 这类 Windows API 的桩，链接一「成功」，ffmpeg 就以为
   `windows.h`、`sysctl`、`io.h` 都存在，编译时立刻炸。
   `fix-config.py` 把所有 `HAVE_*_H` 宏按真实 sysroot 重新核对，并显式关掉一批
   平台相关宏；`config.mak` 里的 `-ldxgi`、`-ld3d11`、`-ld3d12`、`-latomic` 也要删
   （AArch64 有原生原子指令，不需要 libatomic）。

2. **`-latomic` 找不到**。NDK 里的 `libatomic.so` 是链接脚本形态，Zig 的 lld 不认，
   直接删掉即可。

3. **网络栈会引入 Windows 的 `closesocket`**。不需要就 `--disable-network`，
   这也是让 `closesocket` 一类错误消失的最省事办法。

## 验证产物

```sh
readelf -h libavcodec/libavcodec.so.61 | grep Machine     # AArch64
grep -E "^#define CONFIG_(H264|AAC)_DECODER 1$" config_components.h
```

组件开关在 `config_components.h`，不在 `config.h`——查错文件会以为什么都没编进去。
