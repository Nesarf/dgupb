// 码点工具：把剪贴板文字逐字符转成 Unicode 码点，插入输入框方便引用。
export const name = 'local-code-point'

function describe(text) {
  const chars = Array.from(String(text || ''))
  const rows = []
  for (const ch of chars) {
    if (ch === '\n') { rows.push('换行 U+000A'); continue }
    const cp = ch.codePointAt(0)
    rows.push(ch + ' U+' + cp.toString(16).toUpperCase().padStart(4, '0'))
  }
  return rows
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('code-point', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '码点工具',
          children: [
            { type: 'text', text: '先复制一段文字，再点下面的按钮：面板会把每个字符和它的码点插进输入框。', tone: 'muted' },
            { type: 'actions', items: [
              { label: '分析剪贴板', action: 'analyze', style: 'primary' },
              { label: '复制 U+ 格式', action: 'analyze-u' },
            ] },
            { type: 'text', text: '用法示例：U+4E2D 表示“中”。', tone: 'muted' },
          ],
        }
      },
      actions: {
        analyze: (scope, event) => {
          const rows = describe(scope.clipboard)
          if (rows.length === 0) return { toast: '剪贴板里没有文字' }
          return { insert: rows.join('\n').slice(0, 4000) }
        },
        'analyze-u': (scope, event) => {
          const rows = describe(scope.clipboard).map((row) => {
            const space = row.lastIndexOf(' ')
            return space > 0 ? row.slice(space + 1) : row
          })
          if (rows.length === 0) return { toast: '剪贴板里没有文字' }
          return { insert: rows.join(' ').slice(0, 4000) }
        },
      },
    })
  })
}
