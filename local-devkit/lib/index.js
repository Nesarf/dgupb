// 开发工具：dgupb devkit 的 dsh-go 面板。
// 只做展示与按钮；真正执行的是 devkit/bin 下的 C 桥接站和 apkbuild 工具链。
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

export const name = 'local-devkit'

const ROOT = '/root/workspace/dgupb/devkit'
const BIN = ROOT + '/bin'
const PIDF = ROOT + '/bridge.pid'
const PORT = 8737

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

function readPid() {
  try {
    const t = fs.readFileSync(PIDF, 'utf8').trim()
    const pid = Number(t)
    if (!pid) return null
    fs.readFileSync('/proc/' + pid + '/cmdline')
    return pid
  } catch {
    return null
  }
}

function bridgeStatus() {
  const pid = readPid()
  if (!pid) return { up: false, note: '未启动' }
  let note = '运行中'
  try {
    const out = execFileSync('curl', ['-s', '--max-time', '2', 'http://127.0.0.1:' + PORT + '/status'], {
      encoding: 'utf8',
      timeout: 3000,
    })
    const j = JSON.parse(out)
    const tools = Object.entries(j.tools || {})
    const ok = tools.filter(([, v]) => v).length
    note = ok + '/' + tools.length + ' 个工具可用 · uptime ' + j.uptime + 's'
  } catch {
    note = '进程在，但端口没响应'
  }
  return { up: true, pid, note }
}

function run(cmd) {
  try {
    const out = execFileSync(BIN + '/devkit-run', [cmd], { encoding: 'utf8', timeout: 8000 })
    return out.trim()
  } catch (e) {
    return '失败：' + (e && e.message ? e.message : String(e))
  }
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('devkit', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '开发工具',
          children: [
            { type: 'metric', label: '桥接站', value: { $: 'data.bridge' }, caption: { $: 'data.bridgeNote' } },
            { type: 'keyValue', items: [
              { label: '端口', value: '127.0.0.1:' + PORT },
              { label: 'C 桥', value: { $: 'data.cbridge' } },
              { label: '构建链', value: { $: 'data.toolchain' } },
              { label: '上次输出', value: { $: 'data.last' } },
            ] },
            { type: 'text', text: { $: 'data.note' }, tone: 'muted' },
            { type: 'actions', items: [
              { label: '启动桥', action: 'start', style: 'primary' },
              { label: '停止', action: 'stop' },
              { label: '刷新', action: 'refresh' },
            ] },
          ],
        }
      },
      data(scope, emit, caps) {
        const st = bridgeStatus()
        const parts = [
          ['aapt2', '/usr/bin/aapt2'],
          ['d8', '/opt/r8/r8.jar'],
          ['apksigner', '/opt/android-sdk/bt/android-14/lib/apksigner.jar'],
          ['android.jar', '/opt/android-sdk/pf/android-34/android.jar'],
        ]
        const have = parts.filter(([, p]) => { try { fs.accessSync(p); return true } catch { return false } })
        emit({
          bridge: st.up ? '运行中' : '已停止',
          bridgeNote: st.note + (st.pid ? ' · pid ' + st.pid : ''),
          cbridge: exists(BIN + '/devkit-bridge') ? 'devkit-bridge 0.1.0' : '未编译（缺 bin/devkit-bridge）',
          toolchain: have.length + '/' + parts.length + ' 就绪' + (have.length ? '（' + have.map(([n]) => n).join('、') + '）' : ''),
          last: fs.existsSync(ROOT + '/build.log') ? fs.readFileSync(ROOT + '/build.log', 'utf8').trim().split('\n').pop() : '无',
          note: '桥只监听 127.0.0.1，命令走白名单；apkbuild 用 aapt2 + d8 + apksigner 直接出签名包，不依赖 Gradle。',
        })
        return () => {}
      },
      actions: {
        start: () => { run('start'); return { refresh: true, toast: '桥接站已启动' } },
        stop: () => { run('stop'); return { refresh: true, toast: '桥接站已停止' } },
        refresh: () => ({ refresh: true }),
      },
    })
  })
}
