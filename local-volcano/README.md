# local-volcano

宿主观察面板：把 [volcano-separator](https://github.com/Nesarf/volcano-separator) 的
observer 概念（这台机器在做什么）搬到 Linux 宿主的只读版本。

- 进程总数与负载；
- 内存、磁盘；
- 按 RSS 排前 8 的进程。

只读：遍历 `/proc` 读取统计，不结束、不修改任何进程。volcano-separator 本体是 Windows
工具，这里只移植了观察面。
