// 快捷文本：内置模板加用户自定义模板，点一下插入输入框。
// 自定义模板文件：/sdcard/Download/DSH-Go/dgupb-snippets.txt，每行 "标题=内容"，
// 没有等号时整行当内容，标题取前 12 个字。
import fs from 'node:fs'

export const name = 'local-snippets'

const USER_FILE = '/sdcard/Download/DSH-Go/dgupb-snippets.txt'

const BUILTIN = [
  { title: '总结', text: '总结上面这段对话，列三条要点。' },
  { title: '继续', text: '继续。' },
  { title: '展开', text: '把上面这个结论展开讲清楚，给出依据和不确定的地方。' },
  { title: '中文回复', text: '用中文回复。' },
  { title: '代码', text: '给出可运行的代码，并说明怎么验证。' },
]

function readUserSnippets() {
  try {
    const text = fs.readFileSync(USER_FILE, 'utf8')
    const rows = []
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq > 0) {
        rows.push({ title: trimmed.slice(0, eq).trim(), text: trimmed.slice(eq + 1).trim() })
      } else {
        rows.push({ title: trimmed.slice(0, 12), text: trimmed })
      }
    }
    return rows
  } catch {
    return []
  }
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('snippets', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '快捷文本',
          children: [
            { type: 'text', text: '点一条插入输入框。自定义模板放在 /sdcard/Download/DSH-Go/dgupb-snippets.txt。', tone: 'muted' },
            { type: 'list', items: { $: 'data.items' } },
            { type: 'actions', items: [{ label: '刷新', action: 'refresh' }] },
          ],
        }
      },
      data(scope, emit, caps) {
        const items = [...readUserSnippets(), ...BUILTIN]
        emit({
          items: items.map((item) => ({
            title: item.title,
            subtitle: item.text.length > 40 ? item.text.slice(0, 40) + '...' : item.text,
            action: { id: 'insert-snippet', args: { text: item.text } },
          })),
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
        'insert-snippet': (scope, event) => {
          const text = String(event?.value?.text || '').trim()
          if (text === '') return { toast: '这条模板是空的' }
          return { insert: text.slice(0, 2000) }
        },
      },
    })
  })
}
