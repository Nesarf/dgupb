// 同文控制台：只读读取 /sdcard/TETO 里的 Rime 配置，展示方案、主题、词库状态。
import fs from 'node:fs'

export const name = 'local-trime-console'

const USER_DIR = '/sdcard/TETO'

function readHead(path, maxBytes) {
  try {
    const stat = fs.statSync(path)
    if (!stat.isFile() || stat.size === 0) return null
    const fd = fs.openSync(path, 'r')
    try {
      const buf = Buffer.alloc(Math.min(stat.size, maxBytes))
      fs.readSync(fd, buf, 0, buf.length, 0)
      return buf.toString('utf8')
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    return null
  }
}

function countThemes() {
  try {
    return fs.readdirSync(USER_DIR).filter((name) => name.endsWith('.trime.yaml')).length
  } catch {
    return 0
  }
}

function readSchemas() {
  const text = readHead(`${USER_DIR}/default.custom.yaml`, 40000) || ''
  const rows = [...text.matchAll(/^\s*-\s*schema:\s*([A-Za-z0-9_]+)/gm)].map((m) => m[1])
  return rows.length > 0 ? rows.join('、') : '（未读到方案列表）'
}

function countDicts() {
  const text = readHead(`${USER_DIR}/rime_ice.dict.yaml`, 200000) || ''
  return (text.match(/^\s*-\s*cn_dicts\/\S+/gm) || []).length
}

function readTable() {
  try {
    const stat = fs.statSync(`${USER_DIR}/build/rime_ice.table.bin`)
    return { size: stat.size, mtime: stat.mtimeMs }
  } catch {
    return null
  }
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function formatTime(ms) {
  try {
    return new Date(ms).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return ''
  }
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('trime', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '同文控制台',
          children: [
            {
              type: 'keyValue',
              items: [
                { label: '方案', value: { $: 'data.schemas' } },
                { label: '主题', value: { $: 'data.themeCount' } },
                { label: '词库挂载', value: { $: 'data.dictCount' } },
                { label: '词表', value: { $: 'data.table' } },
              ],
            },
            { type: 'text', text: { $: 'data.tableTime' }, tone: 'muted' },
            {
              type: 'actions',
              items: [{ label: '刷新', action: 'refresh', style: 'primary' }],
            },
          ],
        }
      },
      data(scope, emit, caps) {
        const table = readTable()
        emit({
          schemas: readSchemas(),
          themeCount: `${countThemes()} 套`,
          dictCount: `${countDicts()} 个`,
          table: table ? formatSize(table.size) : '未部署',
          tableTime: table ? `最近部署 ${formatTime(table.mtime)}` : '词表尚未生成',
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
      },
    })
  })
}
