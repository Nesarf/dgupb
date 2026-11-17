# local-shell

宿主环境面板：dsh-shell-surfaces 的 dsh-go 面板版，用来快速看引擎所在机器的状态。

- 内存使用（读 `/proc/meminfo`）；
- 负载（`/proc/loadavg`）；
- 磁盘剩余（`/root` 的文件系统）；
- Node 版本、平台、常用命令是否可用。

只读面板，不执行命令，也不改任何文件。
