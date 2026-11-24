#!/usr/bin/env bash
# Build ffmpeg for Android/aarch64 on the device itself, using the Zig based
# cross compiler from ../android-cc. Produces shared libraries only (an app
# loads them; there is no ffmpeg binary, because Android refuses to exec from
# app data).
set -euo pipefail

FF_VER="${FF_VER:-7.1}"
API="${API:-29}"
PREFIX="${PREFIX:-/opt/ffbuild/out}"
SRC="${SRC:-/opt/ffmpeg-$FF_VER}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CC_DIR="$HERE/../android-cc"

[ -x "$CC_DIR/zigcc" ] || { echo "run ../android-cc/setup.sh first" >&2; exit 2; }

if [ ! -d "$SRC" ]; then
  echo "fetching ffmpeg $FF_VER ..."
  tmp="${TMPDIR:-/tmp}/ff-$FF_VER.tar.xz"
  curl -L --retry 2 -o "$tmp" "https://ffmpeg.org/releases/ffmpeg-$FF_VER.tar.xz"
  tar xf "$tmp" -C "$(dirname "$SRC")"
  rm -f "$tmp"
fi

cd "$SRC"
./configure \
  --target-os=android --arch=aarch64 --enable-cross-compile \
  --cc="$CC_DIR/zigcc" --cxx="$CC_DIR/zigcxx" \
  --ar="$CC_DIR/zigar" --ranlib="$CC_DIR/zigranlib" --strip="$CC_DIR/zigstrip" \
  --prefix="$PREFIX" --enable-shared --disable-static \
  --disable-programs --disable-doc --disable-debug \
  --disable-avdevice --disable-postproc --disable-network --disable-autodetect \
  --disable-hwaccels --disable-vdpau --disable-vulkan --disable-cuda-llvm \
  --disable-cuvid --disable-nvdec --disable-nvenc --disable-vaapi \
  --disable-d3d11va --disable-dxva2 --disable-v4l2-m2m --disable-mediacodec \
  --disable-jni --disable-videotoolbox --disable-audiotoolbox \
  --disable-everything \
  --enable-decoder=aac,h264,hevc,mp3,opus,vorbis,flac,pcm_s16le,pcm_s16be \
  --enable-encoder=aac,flac,pcm_s16le \
  --enable-demuxer=matroska,mov,mp3,wav,flac,ogg,aac,image2 \
  --enable-muxer=matroska,mp4,wav,flac,ogg,adts \
  --enable-parser=aac,h264,hevc,mpegaudio,opus,vorbis,flac \
  --enable-protocol=file,pipe \
  --enable-filter=aresample,anull,format,null,scale,transpose \
  --enable-bsf=aac_adtstoasc,h264_mp4toannexb,hevc_mp4toannexb,extract_extradata \
  --enable-swresample --enable-swscale \
  "$@"

# Cross detection gets some platform features wrong (it finds NDK stub libs for
# Windows APIs); this rewrites those macros against the real sysroot.
python3 "$HERE/fix-config.py"

# The NDK ships stub libs for dxgi/d3d11/d3d12/atomic; on AArch64 the CPU has
# native atomics and the D3D ones do not exist, so drop them from the link line.
sed -i 's/-ldxgi//g; s/-ld3d11//g; s/-ld3d12//g; s/-latomic//g; s/-landroid//g; s/-lmediandk//g' ffbuild/config.mak

touch config.h
make -j"$(nproc)"
make install

echo
echo "installed into $PREFIX/lib:"
ls -lh "$PREFIX"/lib/*.so* 2>/dev/null | awk '{print "  ", $9, $5}'
echo
echo "copy them into your APK as lib/arm64-v8a/, stored uncompressed and"
echo "page aligned, with android:extractNativeLibs=\"false\"."
