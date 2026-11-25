#!/usr/bin/env bash
# 把 ffmpeg 的静态库 + fftools + JNI 胶水链接成单个 libffmpegcli.so。
#
# 这里有四个必须照做的细节，少一个就是 dlopen failed：
#   1. -Wl,-soname 要写，安卓 linker 靠它认库
#   2. libc/libm/libdl 要显式列出并配 --no-as-needed，否则 -lc 会被
#      --as-needed 丢掉，NEEDED 里只剩 libm，stdout/longjmp 一类符号
#      运行时全都解析不了
#   3. 静态库必须带 -fPIC 编，汇编里的 adrp/add 重定位进不了共享库
#   4. -Bsymbolic 用来压住 ffmpeg 内部表的符号抢占（Zig 的 lld 不支持
#      -Bsymbolic-functions 和 --exclude-libs）
set -euo pipefail

SRC="${SRC:-/opt/ffmpeg-7.1}"
OUT="${OUT:-/opt/ffbuild/libffmpegcli.so}"
DEPS="${DEPS:-/opt/ffbuild/deps}"
API="${API:-29}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CC_DIR="$HERE/../android-cc"
ZIGCC="$CC_DIR/zigcc"
SR="/opt/android-ndk-r27c/toolchains/llvm/prebuilt/linux-x86_64/sysroot"
L="$SR/usr/lib/aarch64-linux-android/$API"

[ -x "$ZIGCC" ] || { echo "先跑 ../android-cc/setup.sh" >&2; exit 2; }

"$ZIGCC" -c -O2 -fPIC -I"$SR/usr/include" -o /tmp/jni_glue.o "$HERE/jni_glue.c"

cd "$SRC"
rm -f "$OUT"
"$ZIGCC" -shared -Wl,-soname,"$(basename "$OUT")" -Wl,-s -Wl,-Bsymbolic \
  -Wl,--no-as-needed "$L/libc.so" "$L/libm.so" "$L/libdl.so" \
  -o "$OUT" \
  /tmp/jni_glue.o fftools/*.o \
  libavfilter/libavfilter.a libavformat/libavformat.a libavcodec/libavcodec.a \
  libswresample/libswresample.a libswscale/libswscale.a libavutil/libavutil.a \
  "$DEPS/lib/libx264.a" -Wl,-z,noexecstack -lm -lz

echo "built $OUT"
readelf -d "$OUT" | grep -E "SONAME|NEEDED"
