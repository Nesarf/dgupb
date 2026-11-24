# devkit

内部脚本，不是产品。这里只有两件事：把 Java 项目编成 APK，和生成这种项目。
没有服务、没有端口、没有界面、没有要装的插件——调用方只有引擎里的那个 agent。

```sh
devkit/bin/apkbuild /path/to/project        # 项目进，签名 APK 出
devkit/bin/newproj demo -p com.dgupb.demo   # 生成 apkbuild 能直接编的骨架
```

## apkbuild

流水线：`aapt2 compile` → `aapt2 link`（出 R.java）→ `javac` → `d8` →
重打包（`resources.arsc` 放第一个且不压缩，dex 和原生库一起进去）→ `apksigner`。
不依赖 Gradle，也不需要在电脑上装 Android Studio。

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

参数：`-o 输出.apk`、`-k keystore`、`-p 密码`、`-a 别名`、`--min-sdk`、`--target-sdk`。
路径可用环境变量覆盖：`ANDROID_JAR`、`AAPT2`、`R8_JAR`、`APKSIGNER_JAR`、`JDK_HOME`。

## newproj

```sh
devkit/bin/newproj demo -p com.dgupb.demo
devkit/bin/apkbuild demo
```

生成清单、`res/values/strings.xml`、`src/<包>/MainActivity.java` 和一把
`debug.keystore`（RSA 2048，口令 android，别名 dsh）。

## 为什么没有桥

一度有过一个监听 127.0.0.1 的 C 桥和一个网页控制台。它们存在的理由是「别的客户端也能调用」，
但这个场景里没有别的客户端：agent 自己有 shell，直接跑脚本比绕 HTTP 少一层。
给人看的界面在这里也是负担——要维护、要能跑起来、坏了还得查。
所以只留无头脚本，用完即走。
