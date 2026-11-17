// Aragami 审计：在引擎侧跑 Aragami-SilentCrystal 的只读静态审计工具。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

export const name = 'local-asc'

function findAscDir() {
  const candidates = [
    process.env.ARAGAMI_DIR,
    '/root/workspace/Aragami-SilentCrystal',
    '/sdcard/Download/asc',
  ].filter(Boolean)
  for (const dir of candidates) {
    try {
      fs.accessSync(dir + '/cli/index.mjs', fs.constants.R_OK)
      return dir
    } catch {
      // try next
    }
  }
  return null
}

function runCli(dir, args, timeoutMs = 9000) {
  try {
    return execFileSync('node', [dir + '/cli/index.mjs', ...args], {
      timeout: timeoutMs,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: dir,
    }).trim()
  } catch {
    return null
  }
}

function first(text, pattern) {
  const m = String(text || '').match(pattern)
  return m ? m[1] : null
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('asc', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: 'Aragami 审计',
          children: [
            { type: 'metric', label: '检查面', value: { $: 'data.checks' }, caption: { $: 'data.catalog' } },
            { type: 'keyValue', items: [
              { label: '环境', value: { $: 'data.env' } },
              { label: 'Tor Browser', value: { $: 'data.tor' } },
              { label: 'Firefox', value: { $: 'data.firefox' } },
              { label: '工具目录', value: { $: 'data.dir' } },
            ] },
            { type: 'text', text: { $: 'data.note' }, tone: 'muted' },
            { type: 'actions', items: [
              { label: '运行审计', action: 'run-audit', style: 'primary' },
              { label: '版本检查', action: 'run-version' },
              { label: '刷新', action: 'refresh' },
            ] },
          ],
        }
      },
      data(scope, emit, caps) {
        const dir = findAscDir()
        if (!dir) {
          emit({ checks: '未找到', catalog: 'Aragami-SilentCrystal 不在已知路径', env: '未找到', tor: '未知', firefox: '未知', dir: '未找到', note: '把仓库放到 /root/workspace/Aragami-SilentCrystal，或用 ARAGAMI_DIR 指定路径。' })
          return () => {}
        }
        const env = runCli(dir, ['aragami_env', '--human'])
        const checks = runCli(dir, ['aragami_checks', '--human'])
        const tor = first(env, /Tor Browser installs \((\d+)\)/)
        const firefox = first(env, /Firefox profiles \((\d+)\)/)
        const declared = first(checks, /(\d+) of (\d+) declared checks/)
        const mode = first(env, /mode (\w+)/)
        emit({
          checks: declared ? declared + ' 项' : '未知',
          catalog: '只读静态检查面',
          env: mode ? mode + ' · node ' + process.version : '未知',
          tor: tor !== null ? tor + ' 个安装' : '未知',
          firefox: firefox !== null ? firefox + ' 个 profile' : '未知',
          dir: dir,
          note: '审计对象需要 Tor Browser 安装或 Firefox profile；引擎环境通常没有，面板会显示扫描结果为空。只读，不改文件。',
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
        'run-audit': (scope, event) => {
          const dir = findAscDir()
          if (!dir) return { toast: '找不到 Aragami 工具目录' }
          const text = runCli(dir, ['aragami_audit', '--human'], 20000)
          if (!text) return { toast: '审计运行失败' }
          return { insert: text.slice(0, 4000) }
        },
        'run-version': (scope, event) => {
          const dir = findAscDir()
          if (!dir) return { toast: '找不到 Aragami 工具目录' }
          const text = runCli(dir, ['aragami_version', '--human'], 20000)
          if (!text) return { toast: '版本检查失败' }
          return { insert: text.slice(0, 4000) }
        },
      },
    })
  })
}
