# Changelog

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
