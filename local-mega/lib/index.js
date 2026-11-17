// Mim 索引：读取 mega-index-map 的 Library 索引，显示对象统计与最近记录。
import fs from 'node:fs'

export const name = 'local-mega'

const INDEX_FILE = '/root/.dsh/library/index.json'

function readIndex() {
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf8')
    const data = JSON.parse(raw)
    const objects = Array.isArray(data.objects) ? data.objects : []
    return { data, objects }
  } catch {
    return null
  }
}

function countBy(objects, key) {
  const counts = new Map()
  for (const obj of objects) {
    const value = String(obj[key] || '-')
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('mega', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: 'Mim 索引',
          children: [
            { type: 'metric', label: '索引对象', value: { $: 'data.total' }, caption: { $: 'data.generated' } },
            { type: 'text', text: '按类型', tone: 'muted' },
            { type: 'list', items: { $: 'data.types' } },
            { type: 'text', text: '最近记录', tone: 'muted' },
            { type: 'list', items: { $: 'data.recent' } },
            { type: 'actions', items: [{ label: '刷新', action: 'refresh' }] },
          ],
        }
      },
      data(scope, emit, caps) {
        const index = readIndex()
        if (!index) {
          emit({ total: '未找到索引', generated: 'Library 索引还没生成', types: [], recent: [] })
          return () => {}
        }
        const types = countBy(index.objects, 'type').slice(0, 10).map(([label, count]) => ({
          title: label,
          trailing: String(count),
        }))
        const recent = index.objects.slice(-8).reverse().map((obj) => ({
          title: String(obj.name || '-'),
          subtitle: String(obj.type || '') + (obj.source ? ' · ' + obj.source : ''),
        }))
        emit({
          total: String(index.objects.length),
          generated: index.data.generatedAt ? '生成于 ' + String(index.data.generatedAt).replace('T', ' ').slice(0, 16) : '',
          types,
          recent,
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
      },
    })
  })
}
