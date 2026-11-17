// 像素测量：在引擎侧调用 Ichiwatashi 的 judge，测量像素画并给出报告。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

export const name = 'local-ichiwatashi'

const REPO_DIR = '/root/workspace/Ichiwatashi'
const INPUT_FILE = '/sdcard/Download/DSH-Go/ichiwatashi-input.png'
const RUNNER = 'from ichiwatashi.cli import main; main()'

function toolReady() {
  try {
    execFileSync('python3', ['-c', 'import ichiwatashi'], { timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] })
    return true
  } catch {
    return false
  }
}

function judge(path) {
  try {
    return execFileSync('python3', ['-c', RUNNER, 'judge', path], {
      timeout: 60000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: REPO_DIR,
    }).trim()
  } catch {
    return null
  }
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('ichiwatashi', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '像素测量',
          children: [
            { type: 'keyValue', items: [
              { label: '工具', value: { $: 'data.tool' } },
              { label: '输入图', value: { $: 'data.input' } },
              { label: 'Python', value: { $: 'data.python' } },
            ] },
            { type: 'text', text: { $: 'data.note' }, tone: 'muted' },
            { type: 'actions', items: [
              { label: '测量输入图', action: 'judge', style: 'primary' },
              { label: '刷新', action: 'refresh' },
            ] },
          ],
        }
      },
      data(scope, emit, caps) {
        const ready = toolReady()
        const inputExists = fs.existsSync(INPUT_FILE)
        emit({
          tool: ready ? '可用' : '未安装',
          input: inputExists ? INPUT_FILE : '未找到（放一张 PNG 到 ' + INPUT_FILE + '）',
          python: process.env.PYTHON || 'python3',
          note: '把要测的像素画保存为 /sdcard/Download/DSH-Go/ichiwatashi-input.png，点「测量输入图」会把测量报告插入输入框。参考分布来自 Ichiwatashi 的校准数据。',
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
        judge: (scope, event) => {
          if (!fs.existsSync(INPUT_FILE)) return { toast: '先放一张图片到 ' + INPUT_FILE }
          const report = judge(INPUT_FILE)
          if (!report) return { toast: '测量失败，检查 Ichiwatashi 是否安装' }
          return { insert: report.slice(0, 4000) }
        },
      },
    })
  })
}
