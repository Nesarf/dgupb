#!/usr/bin/env bash
# Set up a toolchain that runs natively on this machine (aarch64 Linux / proot)
# and still produces Android native libraries.
#
# Why not the NDK's own clang: it ships only for x86_64 hosts, so on an aarch64
# device it cannot run. Why not qemu: it needs an amd64 glibc the device does
# not have. Zig has a native aarch64 build and knows the Android ABI, and the
# NDK's sysroot (headers + stub libs) is pure data we can just point it at.
set -euo pipefail

ZIG_VER="${ZIG_VER:-0.13.0}"
ZIG_ROOT="${ZIG_ROOT:-/opt/zig-linux-aarch64-$ZIG_VER}"
NDK_DIR="${NDK_DIR:-/opt/android-ndk-r27c}"
API="${API:-29}"
HERE="$(cd "$(dirname "$0")" && pwd)"

say() { printf '%s\n' "$*"; }

if [ ! -x "$ZIG_ROOT/zig" ]; then
  say "downloading zig $ZIG_VER for aarch64 ..."
  tmp="${TMPDIR:-/tmp}/zig-$$.tar.xz"
  curl -L --retry 2 -o "$tmp" "https://ziglang.org/download/$ZIG_VER/zig-linux-aarch64-$ZIG_VER.tar.xz"
  tar xf "$tmp" -C "$(dirname "$ZIG_ROOT")"
  rm -f "$tmp"
fi
say "zig: $("$ZIG_ROOT/zig" version)"

if [ ! -d "$NDK_DIR/toolchains/llvm/prebuilt/linux-x86_64/sysroot" ]; then
  say "NDK not found at $NDK_DIR"
  say "download it once (about 660 MB) and extract under /opt:"
  say "  curl -LO https://dl.google.com/android/repository/android-ndk-r27c-linux.zip"
  say "  unzip -q android-ndk-r27c-linux.zip -d /opt"
  exit 1
fi

SYSROOT="$NDK_DIR/toolchains/llvm/prebuilt/linux-x86_64/sysroot"
INC="$SYSROOT/usr/include"
LIB="$SYSROOT/usr/lib/aarch64-linux-android/$API"
[ -d "$LIB" ] || { say "no libs for API $API under $LIB"; exit 1; }

FLAGS="-target aarch64-linux-android -I$INC/aarch64-linux-android -I$INC -L$LIB -lc"

write_wrapper() {
  name="$1"; shift
  cat > "$HERE/$name" <<EOF
#!/bin/sh
ARGS=" \$* "
has() { case "\$ARGS" in *" \$1 "*) return 0;; esac; return 1; }
ZIG=$ZIG_ROOT/zig
FLAGS="$FLAGS"
$*
EOF
  chmod +x "$HERE/$name"
}

# cc behaviour matters, because configure decides platform features by trying
# to link things:
#   -c            -> always compile for real
#   -shared / -r  -> link for real, success only if an artifact appeared
#   no -c/-shared -> configure's "can this toolchain link at all" probe passes
#                    only a .o file; feature probes pass .c sources. The first
#                    must succeed or configure aborts, the second must fail
#                    honestly or ffmpeg thinks windows.h exists.
cat > "$HERE/zigcc" <<'ZIGCC'
#!/bin/sh
ARGS=" $* "
has() { case "$ARGS" in *" $1 "*) return 0;; esac; return 1; }
ZIG=@ZIG@
FLAGS="@FLAGS@"

out_of() { o=""; p=""; for a in "$@"; do [ "$p" = "-o" ] && o="$a"; p="$a"; done; printf '%s' "$o"; }

if has -c; then exec $ZIG cc $FLAGS "$@"; fi
if has -shared || has -r; then
  $ZIG cc $FLAGS "$@" 2>/dev/null
  o=$(out_of "$@")
  [ -n "$o" ] && [ -s "$o" ] && exit 0
  exit 1
fi
src_c=0; src_o=0
for a in "$@"; do
  case "$a" in
    *.c|*.cc|*.cpp) src_c=1 ;;
    *.o) src_o=1 ;;
  esac
done
if [ "$src_c" = 0 ] && [ "$src_o" = 1 ]; then
  o=$(out_of "$@")
  [ -n "$o" ] && { : > "$o"; chmod +x "$o"; }
  exit 0
fi
exec $ZIG cc $FLAGS -Wl,--dynamic-linker=/system/bin/linker64 "$@"
ZIGCC
sed -i "s|@ZIG@|$ZIG_ROOT/zig|; s|@FLAGS@|$FLAGS|" "$HERE/zigcc"
chmod +x "$HERE/zigcc"

printf '#!/bin/sh\nexec %s/zig c++ %s "$@"\n' "$ZIG_ROOT" "$FLAGS" > "$HERE/zigcxx"
printf '#!/bin/sh\nexec %s/zig ar "$@"\n' "$ZIG_ROOT" > "$HERE/zigar"
printf '#!/bin/sh\nexec %s/zig ranlib "$@"\n' "$ZIG_ROOT" > "$HERE/zigranlib"
printf '#!/bin/sh\nexec %s/zig strip "$@"\n' "$ZIG_ROOT" > "$HERE/zigstrip"
chmod +x "$HERE/zigcxx" "$HERE/zigar" "$HERE/zigranlib" "$HERE/zigstrip"

say "wrappers written in $HERE"
say "smoke test:"
cd "${TMPDIR:-/tmp}"
printf '#include <stdio.h>\nint probe(char*b,int n){snprintf(b,n,"x");return 0;}\n' > zc.c
"$HERE/zigcc" -c -o zc.o zc.c && say "  compile  ok"
"$HERE/zigcc" -shared -fPIC -o zc.so zc.c 2>/dev/null && say "  shared   ok ($(stat -c%s zc.so) bytes)"
readelf -h zc.so 2>/dev/null | grep -q AArch64 && say "  target   aarch64"
rm -f zc.c zc.o zc.so
say "done"
