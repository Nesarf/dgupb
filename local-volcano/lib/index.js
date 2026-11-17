// 宿主观察：volcano-separator 的 observer 概念在 Linux 宿主上的只读版本。
// 显示进程数、按 RSS 的前几个进程、负载、内存和磁盘。
import fs from 'node:fs'

export const name = 'local-volcano'

function readText(path, maxBytes = 20000) {
  try {
    return fs.readFileSync(path, 'utf8').slice(0, maxBytes)
  } catch {
    return null
  }
}

function readProcesses() {
  let pids = []
  try {
    pids = fs.readdirSync('/proc').filter((name) => /^\d+$/.test(name))
  } catch {
    return { count: 0, top: [] }
  }
  const pageSize = 4096
  const rows = []
  for (const pid of pids) {
    try {
      const statm = readText('/proc/' + pid + '/statm', 200)
      if (!statm) continue
      const rssPages = Number(statm.split(/\s+/)[1] || 0)
      if (!rssPages) continue
      const comm = (readText('/proc/' + pid + '/comm', 200) || '').trim()
      rows.push({ pid, comm: comm || ('pid ' + pid), rssMb: (rssPages * pageSize) / 1024 / 1024 })
    } catch {
      // process may disappear while reading
    }
  }
  rows.sort((a, b) => b.rssMb - a.rssMb)
  return { count: pids.length, top: rows.slice(0, 8) }
}

function readLoad() {
  const text = readText('/proc/loadavg', 500)
  if (!text) return null
  return text.trim().split(/\s+/).slice(0, 3).join(' / ')
}

function readMemory() {
  const text = readText('/proc/meminfo', 4000)
  if (!text) return null
  const get = (key) => {
    const m = text.match(new RegExp('^' + key + ':\\s+(\\d+)', 'm'))
    return m ? Number(m[1]) : null
  }
  const total = get('MemTotal')
  const available = get('MemAvailable')
  if (!total || !available) return null
  return { usedMb: Math.round((total - available) / 1024), totalMb: Math.round(total / 1024) }
}

function readDisk() {
  try {
    const st = fs.statfsSync('/root')
    return { freeGb: ((st.bavail * st.bsize) / 1024 / 1024 / 1024).toFixed(1), totalGb: ((st.blocks * st.bsize) / 1024 / 1024 / 1024).toFixed(1) }
  } catch {
    return null
  }
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('volcano', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '宿主观察',
          children: [
            { type: 'metric', label: '进程', value: { $: 'data.count' }, caption: { $: 'data.load' } },
            { type: 'keyValue', items: [
              { label: '内存', value: { $: 'data.mem' } },
              { label: '磁盘', value: { $: 'data.disk' } },
            ] },
            { type: 'text', text: '内存占用前几位', tone: 'muted' },
            { type: 'list', items: { $: 'data.top' } },
            { type: 'actions', items: [{ label: '刷新', action: 'refresh' }] },
          ],
        }
      },
      data(scope, emit, caps) {
        const procs = readProcesses()
        const mem = readMemory()
        const disk = readDisk()
        const load = readLoad()
        emit({
          count: String(procs.count),
          load: load ? '负载 ' + load : '负载未知',
          mem: mem ? mem.usedMb + ' MB / ' + mem.totalMb + ' MB' : '未知',
          disk: disk ? disk.freeGb + ' GB 可用 / ' + disk.totalGb + ' GB' : '未知',
          top: procs.top.map((p) => ({
            title: p.comm,
            subtitle: 'pid ' + p.pid,
            trailing: p.rssMb.toFixed(0) + ' MB',
          })),
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
      },
    })
  })
}
