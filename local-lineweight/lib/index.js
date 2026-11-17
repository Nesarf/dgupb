// 线稿：在引擎侧调用 LineWeight 生成带笔压的矢量线稿、测量线稿。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

export const name = 'local-lineweight'

const REPO_DIR = '/root/workspace/LineWeight'
const OUT_DIR = '/sdcard/Download/DSH-Go'
const INPUT_FILE = OUT_DIR + '/lineweight-input.png'
const RUNNER = 'from lineweight.core import main; main()'

function runCli(args, cwd, timeoutMs = 90000) {
  try {
    return execFileSync('python3', ['-c', RUNNER, ...args], {
      timeout: timeoutMs,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
      env: { ...process.env, PYTHONPATH: REPO_DIR },
    }).trim()
  } catch {
    return null
  }
}

function toolReady() {
  try {
    execFileSync('python3', ['-c', 'import lineweight'], {
      timeout: 20000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: REPO_DIR },
    })
    return true
  } catch {
    return false
  }
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('lineweight', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '线稿',
          children: [
            { type: 'keyValue', items: [
              { label: '工具', value: { $: 'data.tool' } },
              { label: '输出目录', value: { $: 'data.outDir' } },
              { label: '输入图', value: { $: 'data.input' } },
            ] },
            { type: 'text', text: { $: 'data.note' }, tone: 'muted' },
            { type: 'actions', items: [
              { label: '生成示例线稿', action: 'gen-demo', style: 'primary' },
              { label: '测量输入图', action: 'fit-input' },
              { label: '刷新', action: 'refresh' },
            ] },
          ],
        }
      },
      data(scope, emit, caps) {
        emit({
          tool: toolReady() ? '可用' : '未找到',
          outDir: OUT_DIR,
          input: fs.existsSync(INPUT_FILE) ? INPUT_FILE : '未找到（放一张图片到 ' + INPUT_FILE + '）',
          note: '「生成示例线稿」会调用 LineWeight 生成 strokes.svg 到输出目录；「测量输入图」用 --fit 对照真实线稿库给出报告。线稿输出是纯 SVG，可导入 Illustrator/SAI/Animate。',
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
        'gen-demo': (scope, event) => {
          if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
          const text = runCli([], OUT_DIR, 120000)
          if (text === null) return { toast: '生成失败，检查 LineWeight 目录' }
          const out = OUT_DIR + '/strokes.svg'
          return { insert: '已生成线稿：' + out + (fs.existsSync(out) ? '（' + Math.round(fs.statSync(out).size / 1024) + ' KB）' : '') }
        },
        'fit-input': (scope, event) => {
          if (!fs.existsSync(INPUT_FILE)) return { toast: '先放一张图片到 ' + INPUT_FILE }
          const text = runCli(['--fit', INPUT_FILE], REPO_DIR, 120000)
          if (!text) return { toast: '测量失败' }
          return { insert: text.slice(0, 4000) }
        },
      },
    })
  })
}
