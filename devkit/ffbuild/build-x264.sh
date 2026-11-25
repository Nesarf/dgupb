#!/usr/bin/env bash
# 用 android-cc 的工具链把 x264 编成 aarch64 静态库。
# 产物装到 $PREFIX，供 ffmpeg 用 --enable-libx264 链接。
set -euo pipefail

X264_VER="${X264_VER:-master}"
PREFIX="${PREFIX:-/opt/ffbuild/deps}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CC_DIR="$HERE/../android-cc"
SRC="${SRC:-/opt/x264-$X264_VER}"

[ -x "$CC_DIR/zigcc" ] || { echo "先跑 ../android-cc/setup.sh" >&2; exit 2; }

# x264 按 --cross-prefix 拼工具名，这里给一组符合它预期的入口
BIN="$PREFIX/../bin"
mkdir -p "$BIN"
for pair in gcc:zigcc g++:zigcxx ar:zigar ranlib:zigranlib strip:zigstrip; do
  want="${pair%%:*}"; src="${pair##*:}"
  ln -sf "$CC_DIR/$src" "$BIN/aarch64-linux-android-$want"
done
# 它的字节序检测要扫目标文件，缺这个工具会直接 die
ln -sf /usr/bin/strings "$BIN/aarch64-linux-android-strings" 2>/dev/null || true
export PATH="$BIN:$PATH"

if [ ! -d "$SRC" ]; then
  echo "fetching x264 ..."
  tmp="${TMPDIR:-/tmp}/x264.tar.gz"
  curl -L --retry 2 -o "$tmp" "https://github.com/mirror/x264/archive/refs/heads/$X264_VER.tar.gz"
  tar xzf "$tmp" -C "$(dirname "$SRC")"
  rm -f "$tmp"
fi

cd "$SRC"
make clean >/dev/null 2>&1 || true
./configure --host=aarch64-linux-android --cross-prefix=aarch64-linux-android- \
  --enable-static --disable-cli --enable-pic --prefix="$PREFIX" "$@"
make -j"$(nproc)"
make install
echo
echo "libx264.a 已装到 $PREFIX/lib"
