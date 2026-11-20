// 扫雷：每打开一次面板生成一局，棋盘用字符画显示。
// 完整可玩版本在 src/：Sweeper.java（Swing）与 ui_sweeper.py（tkinter）。
import { build } from './core.js'

export const name = 'local-sweeper'

let seed = Math.floor(Date.now() % 100000)

function render(board) {
  const rows = []
  const { R, C } = board
  for (let r = 0; r < R; r++) {
    let line = ''
    for (let c = 0; c < C; c++) {
      const i = board.I(r, c)
      if (board.rev.has(i)) {
        const v = board.numAt(i)
        line += v === 0 ? '.' : String(v)
      } else if (board.known.has(i)) {
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
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = build(R, C, M, seed + attempt * 7919)
    if (!r.ok) continue
    const board = r.board
    board.rev = new Set(r.snapshot)
    board.known = new Set()
    board.dead = false
    return { board, hints: r.hints }
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
        emit({
          left: String(board.m),
          level: '初级 9×9 · 10 雷',
          board: render(board),
          note: '形状提示 ' + hints.length + ' 条；完整盘面见 src/ 里的桌面版。',
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
