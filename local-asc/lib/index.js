// Aragami 审计 + VML 监控：一个面板看 Tor/Firefox 静态审计和 Vtuber's Monitor Link 本地服务。
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'

export const name = 'local-asc'

// ---------- Aragami ----------
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

// ---------- VML ----------
const VML_DIR = '/root/workspace/VtuberMonitorLink'
const VML_PORT = 43110

function portListening(port) {
  const hexPort = port.toString(16).toUpperCase().padStart(4, '0')
  for (const file of ['/proc/net/tcp', '/proc/net/tcp6']) {
    let text = null
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    for (const line of text.split('\n').slice(1)) {
      const fields = line.trim().split(/\s+/)
      if (fields.length < 4) continue
      const local = fields[1]
      const state = fields[3]
      if (!local || state !== '01') continue
      const localPort = local.split(':')[1]
      if (localPort === hexPort) return true
    }
  }
  return false
}

function vmlReady() {
  try {
    fs.accessSync(VML_DIR + '/server/src/index.js', fs.constants.R_OK)
    fs.accessSync(VML_DIR + '/server/node_modules', fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}

function vmlConfig() {
  try {
    const stat = fs.statSync(VML_DIR + '/config.json')
    return '已保存（' + Math.round(stat.size / 1024) + ' KB）'
  } catch {
    return '未保存（首次在网页里保存设置后生成）'
  }
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('asc', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '审计与监控',
          children: [
            { type: 'text', text: 'Aragami 审计', tone: 'muted' },
            { type: 'metric', label: '检查面', value: { $: 'data.checks' }, caption: { $: 'data.catalog' } },
            { type: 'keyValue', items: [
              { label: '环境', value: { $: 'data.env' } },
              { label: 'Tor Browser', value: { $: 'data.tor' } },
              { label: 'Firefox', value: { $: 'data.firefox' } },
            ] },
            { type: 'actions', items: [
              { label: '运行审计', action: 'run-audit', style: 'primary' },
              { label: '版本检查', action: 'run-version' },
            ] },
            { type: 'text', text: 'VML 监控', tone: 'muted' },
            { type: 'keyValue', items: [
              { label: '服务', value: { $: 'data.vml' } },
              { label: '配置', value: { $: 'data.vmlConf' } },
              { label: '地址', value: { $: 'data.vmlUrl' } },
            ] },
            { type: 'text', text: { $: 'data.note' }, tone: 'muted' },
            { type: 'actions', items: [
              { label: '启动 VML', action: 'vml-start' },
              { label: '停止 VML', action: 'vml-stop' },
              { label: '刷新', action: 'refresh' },
            ] },
          ],
        }
      },
      data(scope, emit, caps) {
        const dir = findAscDir()
        let checks = '未找到'
        let env = '未找到'
        let tor = '未知'
        let firefox = '未知'
        if (dir) {
          const envText = runCli(dir, ['aragami_env', '--human'])
          const checksText = runCli(dir, ['aragami_checks', '--human'])
          const declared = first(checksText, /(\d+) of (\d+) declared checks/)
          const torCount = first(envText, /Tor Browser installs \((\d+)\)/)
          const ffCount = first(envText, /Firefox profiles \((\d+)\)/)
          const mode = first(envText, /mode (\w+)/)
          checks = declared ? declared + ' 项' : '未知'
          env = mode ? mode + ' · node ' + process.version : '未知'
          tor = torCount !== null ? torCount + ' 个安装' : '未知'
          firefox = ffCount !== null ? ffCount + ' 个 profile' : '未知'
        }
        const running = portListening(VML_PORT)
        emit({
          checks,
          catalog: '只读静态检查面',
          env,
          tor,
          firefox,
          vml: running ? '运行中' : (vmlReady() ? '已停止' : '未安装依赖'),
          vmlConf: vmlConfig(),
          vmlUrl: running ? 'http://127.0.0.1:' + VML_PORT : '—',
          note: 'VML 是本地 web 服务（默认 127.0.0.1:' + VML_PORT + '），启动后可在浏览器打开；审计对象需要 Tor Browser 安装或 Firefox profile。',
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
        'run-audit': () => {
          const dir = findAscDir()
          if (!dir) return { toast: '找不到 Aragami 工具目录' }
          const text = runCli(dir, ['aragami_audit', '--human'], 20000)
          if (!text) return { toast: '审计运行失败' }
          return { insert: text.slice(0, 4000) }
        },
        'run-version': () => {
          const dir = findAscDir()
          if (!dir) return { toast: '找不到 Aragami 工具目录' }
          const text = runCli(dir, ['aragami_version', '--human'], 20000)
          if (!text) return { toast: '版本检查失败' }
          return { insert: text.slice(0, 4000) }
        },
        'vml-start': () => {
          if (portListening(VML_PORT)) return { toast: 'VML 已经在运行' }
          if (!vmlReady()) return { toast: 'VML 依赖未安装（server/node_modules 缺失）' }
          try {
            const child = spawn('node', ['server/src/index.js'], {
              cwd: VML_DIR,
              detached: true,
              stdio: 'ignore',
              env: { ...process.env, NO_OPEN: '1', PORT: String(VML_PORT) },
            })
            child.unref()
            return { toast: 'VML 启动中，稍等几秒刷新' }
          } catch {
            return { toast: 'VML 启动失败' }
          }
        },
        'vml-stop': () => {
          try {
            execFileSync('pkill', ['-f', 'node server/src/index.js'], { timeout: 10000, stdio: 'ignore' })
            return { toast: '已停止 VML' }
          } catch {
            return { toast: 'VML 未在运行' }
          }
        },
      },
    })
  })
}
