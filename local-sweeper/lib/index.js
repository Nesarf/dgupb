// 扫雷面板：与网页版同一套生成与提示逻辑（lib/core.js）。
// 面板只做展示：发一局 9×9，画字符盘，报提示条数。
import { build, shapeHints, DISP } from './core.js'

export const name = 'local-sweeper'

let seed = Math.floor(Date.now() % 100000)

function render(board) {
  const rows = []
  for (let r = 0; r < board.R; r++) {
    let line = ''
    for (let c = 0; c < board.C; c++) {
      const i = board.I(r, c)
      if (board.rev.has(i)) {
        const v = board.num(i)
        line += v === 0 ? '.' : String(v)
      } else if (board.flag.has(i)) {
        line += 'F'
      } else {
        line += '#'
      }
    }
    rows.push(line)
  }
  return rows.join('\n')
}

function deal(R, C, M) {
  for (let t = 0; t < 40; t++) {
    const r = build(R, C, M, seed + t * 7919)
    if (!r.ok) continue
    const board = r.board
    board.rev = new Set(r.snapshot)
    board.known = new Set()
    board.flag = new Set()
    board.dead = false
    return { board, hints: shapeHints(board) }
  }
  return null
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('sweeper', {
      view() {
        return {
          type: 'stack',
          title: '扫雷',
          children: [
            { type: 'metric', label: '剩余雷', value: { $: 'data.left' }, caption: { $: 'data.level' } },
            { type: 'text', text: { $: 'data.board' } },
            { type: 'text', text: { $: 'data.note' }, tone: 'muted' },
            { type: 'actions', items: [{ label: '新局', action: 'new-game', style: 'primary' }] },
          ],
        }
      },
      data(scope, emit) {
        const game = deal(9, 9, 10)
        if (!game) {
          emit({ left: '-', level: '初级 9×9 · 10 雷', board: '生成失败，按新局重试', note: '' })
          return () => {}
        }
        const { board, hints } = game
        const exact = hints.filter(h => h.exact).length
        const weak = hints.length - exact
        const sample = hints.slice(0, 3)
          .map(h => `${DISP[h.key]}${h.lb}`)
          .join(' · ')
        emit({
          left: String(board.m),
          level: '初级 9×9 · 10 雷',
          board: render(board),
          note: `提示 ${hints.length} 条（共有 ${exact} / 至少 ${weak}）${sample ? ' · 例：' + sample : ''}`,
        })
        return () => {}
      },
      actions: {
        'new-game': () => {
          seed = Math.floor(Date.now() % 100000)
          return { refresh: true }
        },
      },
    })
  })
}
