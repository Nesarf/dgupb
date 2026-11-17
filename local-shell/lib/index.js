// 宿主环境：dsh-shell-surfaces 的 dsh-go 面板版，看引擎侧这台机器的状态。
import fs from 'node:fs'

export const name = 'local-shell'

function readText(path, maxBytes = 20000) {
  try {
    return fs.readFileSync(path, 'utf8').slice(0, maxBytes)
  } catch {
    return null
  }
}

function readLoad() {
  const text = readText('/proc/loadavg', 500)
  if (!text) return null
  const parts = text.trim().split(/\s+/)
  return parts.slice(0, 3).join(' / ')
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
  const used = total - available
  return { usedMb: Math.round(used / 1024), totalMb: Math.round(total / 1024), pct: Math.round((used / total) * 100) }
}

function readDisk() {
  try {
    const st = fs.statfsSync('/root')
    const total = st.blocks * st.bsize
    const free = st.bavail * st.bsize
    return { totalGb: (total / 1024 / 1024 / 1024).toFixed(1), freeGb: (free / 1024 / 1024 / 1024).toFixed(1) }
  } catch {
    return null
  }
}

function which(name) {
  const dirs = ['/usr/local/bin', '/usr/bin', '/bin']
  for (const dir of dirs) {
    try {
      fs.accessSync(dir + '/' + name, fs.constants.X_OK)
      return true
    } catch {
      // keep looking
    }
  }
  return false
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('host', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '宿主环境',
          children: [
            { type: 'metric', label: '内存', value: { $: 'data.mem' }, caption: { $: 'data.memNote' } },
            { type: 'keyValue', items: [
              { label: '负载', value: { $: 'data.load' } },
              { label: '磁盘', value: { $: 'data.disk' } },
              { label: 'Node', value: { $: 'data.node' } },
              { label: '平台', value: { $: 'data.platform' } },
              { label: '命令', value: { $: 'data.commands' } },
            ] },
            { type: 'text', text: { $: 'data.note' }, tone: 'muted' },
            { type: 'actions', items: [{ label: '刷新', action: 'refresh', style: 'primary' }] },
          ],
        }
      },
      data(scope, emit, caps) {
        const mem = readMemory()
        const disk = readDisk()
        const tools = ['bash', 'git', 'ssh', 'node', 'python3'].filter((name) => which(name))
        emit({
          mem: mem ? mem.usedMb + ' MB / ' + mem.totalMb + ' MB' : '未知',
          memNote: mem ? '已用 ' + mem.pct + '%' : '读取 /proc/meminfo 失败',
          load: readLoad() || '未知',
          disk: disk ? disk.freeGb + ' GB 可用 / ' + disk.totalGb + ' GB' : '未知',
          node: process.version || '未知',
          platform: process.platform + ' ' + (process.arch || ''),
          commands: tools.join(' · ') || '无',
          note: '宿主是引擎所在的机器；这里显示的是它的负载、内存和磁盘，不是手机整机状态。',
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
      },
    })
  })
}
