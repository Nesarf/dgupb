# devkit

给 dsh-go 用的本地开发工具链。核心是 C 和 Java：桥接站用 C 写成单个静态可执行文件，构建链走 aapt2 + d8 + apksigner 这条官方 Java 工具路，不依赖 Gradle，也不需要在电脑上装 Android Studio。外面可以套任何语言（这里是 Node 写的面板插件）。

## 三个部件

| 部件 | 语言 | 作用 |
| --- | --- | --- |
| `bin/devkit-bridge` | C | 只监听 127.0.0.1 的 HTTP 桥，白名单命令执行，返回 JSON |
| `bin/apkbuild` | bash + Java 工具 | 一个 Java 项目目录进，一个签名 APK 出 |
| `bin/devkit-run` | bash | 桥的 start / stop / restart / status / log |
| `bin/newproj` | bash + keytool | 生成一个 apkbuild 能直接编的项目骨架 |

## newproj

```sh
devkit/bin/newproj demo -p com.dgupb.demo      # 生成到 ./demo
devkit/bin/apkbuild demo                       # 直接出签名包
```

生成 `AndroidManifest.xml`、`res/values/strings.xml`、`src/<包>/MainActivity.java` 和一把
`debug.keystore`（RSA 2048，口令 android，别名 dsh）。两步就能从零拿到一个能装的 APK。

## apkbuild

```sh
devkit/bin/apkbuild /path/to/project
```

项目约定（没有的目录跳过）：

```
project/
  AndroidManifest.xml
  src/**/*.java            源码
  res/                     资源（可选；已有 res.zip 则直接用）
  libs/*.jar               额外依赖（可选，同时进 javac 和 d8）
  lib/arm64-v8a/*.so       原生库（可选，自动打进 APK）
  debug.keystore           不给 -k 时自动用
```

可选参数：`-o 输出.apk`、`-k keystore`、`-p 密码`、`-a 别名`、`--min-sdk`、`--target-sdk`。
工具路径可用环境变量覆盖：`ANDROID_JAR`、`AAPT2`、`R8_JAR`、`APKSIGNER_JAR`、`JDK_HOME`。

流水线：`aapt2 compile` → `aapt2 link`（出 R.java）→ `javac` → `d8` → 重打包（`resources.arsc` 放第一个且不压缩，dex 与 so 一起进去）→ `apksigner`。

## 桥接站

```sh
devkit/bin/devkit-run start          # 默认 8737
curl -s http://127.0.0.1:8737/status
curl -s 'http://127.0.0.1:8737/run?cmd=df&arg=-h'
```

| 路由 | 说明 |
| --- | --- |
| `GET /` | 首页，列出用法 |
| `GET /status` | 版本、端口、uptime、白名单工具是否可用 |
| `GET /run?cmd=&arg=` | 执行白名单命令，返回 `{ok,cmd,exit,ms,out}` |

白名单：`apkbuild ffprobe ffmpeg sha256sum uname df uptime id pwd ls`。参数里出现 `; | & $ \` > < " ' \ * ( ) [ ] { } !` 一律拒绝，避免拼接第二条命令。

## 编译

```sh
make -C devkit            # 需要 gcc
```

产物是当前机器架构的 ELF，跑在 proot 里；它监听 loopback，所以手机上的 App、浏览器、curl 都能访问同一个端口。
