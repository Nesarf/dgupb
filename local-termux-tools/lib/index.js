// Termux 小工具：通过 Termux 桥调用 Termux:API，把手机侧能力带进 dsh-go。
import { execFileSync } from 'node:child_process'

export const name = 'local-termux-tools'

function sshRun(host, args, timeoutMs = 3000) {
  try {
    return execFileSync(
      'ssh',
      ['-o', 'ConnectTimeout=2', '-o', 'BatchMode=yes', host, ...args],
      { timeout: timeoutMs, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim()
  } catch {
    return null
  }
}

function bridgeOk(host) {
  return sshRun(host, ['echo', 'ok'], 2500) !== null
}

function clipGet() {
  return sshRun('termux', ['termux-clipboard-get'], 2500)
}

function sendNotify(title, content) {
  const body = String(content || '').trim().slice(0, 200)
  if (!body) return false
  return sshRun('termux', ['termux-notification', '--title', title, '--content', body], 3000) !== null
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    const isZh = (event) => !String(event?.locale || '').startsWith('en')

    ctx.dshGo.panel('phone', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: 'Termux 小工具',
          children: [
            {
              type: 'keyValue',
              items: [
                { label: 'Termux 桥', value: { $: 'data.tx' } },
                { label: 'Shizuku 桥', value: { $: 'data.shk' } },
              ],
            },
            { type: 'text', text: { $: 'data.clipLabel' }, tone: 'muted' },
            { type: 'text', text: { $: 'data.clip' } },
            {
              type: 'actions',
              items: [
                { label: '刷新', action: 'refresh', style: 'primary' },
                { label: '复制内容', action: 'copy-clip' },
                { label: '发通知', action: 'notify-clip' },
              ],
            },
          ],
        }
      },
      data(scope, emit, caps) {
        const tx = bridgeOk('termux')
        const shk = bridgeOk('android')
        const clip = tx ? (clipGet() || '') : ''
        emit({
          tx: tx ? '正常' : '断开',
          shk: shk ? '正常' : '断开',
          clipLabel: tx ? '剪贴板内容' : '剪贴板（Termux 桥断开时读不到）',
          clip: clip ? clip.slice(0, 200) : '（空）',
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
        'copy-clip': () => {
          const clip = clipGet() || ''
          return clip !== ''
            ? { copy: clip.slice(0, 2000), toast: '已复制' }
            : { toast: '剪贴板为空或桥断开' }
        },
        'notify-clip': () => {
          const clip = clipGet() || ''
          return clip !== ''
            ? sendNotify('DSH', clip)
              ? { toast: '已发通知' }
              : { toast: '通知发送失败' }
            : { toast: '剪贴板为空或桥断开' }
        },
      },
    })
  })
}
