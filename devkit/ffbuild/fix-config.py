"""After configure, set the platform feature macros that cross detection got
wrong. Header macros are verified against the real sysroot; the function and
Windows macros are listed explicitly."""
import os
import re
import sys

NDK = '/opt/android-ndk-r27c/toolchains/llvm/prebuilt/linux-x86_64/sysroot'
INC = NDK + '/usr/include'
ARCH = INC + '/aarch64-linux-android'

# Symbols Android's bionic does not provide, or Windows/macOS only APIs.
FORCE_OFF = [
    'SYSCTL', 'SYSCTLBYNAME', 'WINDOWS_H', 'WINRT', 'WINSOCK2_H',
    'VDPAU', 'VULKAN', 'CUDA', 'CUDA_LLVM', 'VAAPI', 'D3D11VA', 'DXVA2',
    'V4L2', 'BJAVL', 'OPENCL', 'VULKAN_STATIC',
]

path = 'config.h'
lines = open(path, encoding='utf-8').read().split('\n')
changed = []
for i, ln in enumerate(lines):
    m = re.match(r'#define HAVE_([A-Z0-9_]+) 1$', ln)
    if not m:
        continue
    macro = m.group(1)
    off = macro in FORCE_OFF
    if not off and macro.endswith('_H'):
        header = macro[:-2].lower().replace('_', '/') + '.h'
        off = not (os.path.exists(os.path.join(INC, header)) or
                   os.path.exists(os.path.join(ARCH, header)))
    if off:
        lines[i] = '#define HAVE_%s 0' % macro
        changed.append(macro)
open(path, 'w', encoding='utf-8').write('\n'.join(lines))
print('fixed %d macros: %s' % (len(changed), ', '.join(changed)))
