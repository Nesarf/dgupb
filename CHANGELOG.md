# Changelog

## v0.11.0 - 2026-11-25

- Drop the surface around `devkit`. The C bridge, the web console and the
  `local-devkit` panel are gone: the only consumer of these tools is the agent
  that already has a shell, so an HTTP hop and a UI were pure overhead. What is
  left is `devkit/bin/apkbuild` and `devkit/bin/newproj`, headless scripts you
  call and forget. `devkit/README.md` records why.

## v0.10.0 - 2026-11-25

- New `devkit/`: a local toolchain for dsh-go with C and Java at the core.
  `bin/devkit-bridge` is a C HTTP bridge bound to 127.0.0.1 with a command
  whitelist (no shell chaining) that any client on the phone can call;
  `bin/apkbuild` turns a plain Java Android project into a signed APK through
  aapt2 + d8 + apksigner with no Gradle and no Android Studio; `bin/devkit-run`
  starts, stops and reports on the bridge; `bin/newproj` scaffolds a project with a
  generated keystore that apkbuild compiles as-is. Build the binary with `make -C devkit`.
- New `local-devkit` plugin: panel showing bridge state, port, pid and whether
  aapt2 / d8 / apksigner / android.jar are ready, with start / stop actions.

## v0.9.0 - 2026-11-21

- `local-sweeper`: new plugin. Minesweeper panel with an ASCII board and shape-hint stats;
  playable desktop builds (Swing / tkinter) and the generator live in `local-sweeper/src/`.

## v0.8.0 - 2026-11-16

- `local-asc`: add VML LLM settings block (provider/model/key state, set key from clipboard,
  test connection) so the monitor's LLM can be configured from dsh-go.

## v0.7.0 - 2026-11-16

- Merge VML (Vtuber's Monitor Link) service control into `local-asc`: start/stop the local
  monitor service and show its state next to the Aragami audit.

## v0.6.0 - 2026-11-16

- Add `local-lineweight`: LineWeight panel for weighted vector linework and `--fit` measurement.

## v0.5.0 - 2026-11-16

- Add `local-ichiwatashi`: pixel-art measurement panel calling Ichiwatashi's judge.
- Add `local-volcano`: host observer panel (processes, load, memory, disk).

## v0.4.0 - 2026-11-16

- Add `local-asc`: Aragami-SilentCrystal panel for Tor Browser / Firefox static posture audit.

## v0.3.0 - 2026-11-16

- Add `local-mega`: Mim index panel for mega-index-map Library statistics.
- Add `local-shell`: host environment panel (memory, load, disk, node).

## v0.2.0 - 2026-11-16

- Add `local-snippets`: quick text snippet panel with user template file.
- Add `local-phone-status`: battery, temperature, Wi-Fi and storage panel via Termux:API.
- Add `local-code-point`: turn clipboard text into Unicode code points.
- Add per-plugin README files.
- Add MIT LICENSE, .gitignore, install.sh, CHANGELOG and GitHub workflows.

## v0.1.0 - 2026-11-16

- Add `local-dsh-ime`: character table, code point convert, clipboard paste panel.
- Add `local-termux-tools`: Termux bridge status, clipboard, notification panel.
- Add `local-trime-console`: read-only Rime/Trime config status panel.
- Add project icon and README.
