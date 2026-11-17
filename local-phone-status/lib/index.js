// 手机状态：电池、温度、Wi-Fi、存储，数据来自 Termux:API 与本地文件系统。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

export const name = 'local-phone-status'

function sshRun(host, args, timeoutMs = 3500) {
  try {
    return execFileSync('ssh', ['-o', 'ConnectTimeout=2', '-o', 'BatchMode=yes', host, ...args],
      { timeout: timeoutMs, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

function readBattery() {
  const raw = sshRun('termux', ['termux-battery-status'])
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function readWifi() {
  const raw = sshRun('termux', ['termux-wifi-connectioninfo'])
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function readStorage() {
  try {
    const st = fs.statfsSync('/sdcard')
    const total = st.blocks * st.bsize
    const free = st.bavail * st.bsize
    return { total, free }
  } catch {
    return null
  }
}

function fmtGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.panel('phone-status', {
      view(scope, caps) {
        return {
          type: 'stack',
          title: '手机状态',
          children: [
            { type: 'metric', label: '电池', value: { $: 'data.battery' }, caption: { $: 'data.batteryNote' } },
            { type: 'keyValue', items: [
              { label: '温度', value: { $: 'data.temp' } },
              { label: '状态', value: { $: 'data.state' } },
              { label: 'Wi-Fi', value: { $: 'data.wifi' } },
              { label: '存储', value: { $: 'data.storage' } },
              { label: 'Termux 桥', value: { $: 'data.bridge' } },
            ] },
            { type: 'text', text: { $: 'data.note' }, tone: 'muted' },
            { type: 'actions', items: [{ label: '刷新', action: 'refresh', style: 'primary' }] },
          ],
        }
      },
      data(scope, emit, caps) {
        const battery = readBattery()
        const wifi = readWifi()
        const storage = readStorage()
        emit({
          battery: battery && battery.percentage != null ? battery.percentage + '%' : '未知',
          batteryNote: battery && battery.plugged ? '正在充电' : '电池数据来自 Termux:API',
          temp: battery && battery.temperature != null ? battery.temperature + ' 度' : '未知',
          state: battery ? String(battery.status || '') : '未知',
          wifi: wifi && wifi.ssid ? wifi.ssid : (wifi ? '未连接' : '读取失败'),
          storage: storage ? fmtGB(storage.free) + ' 可用 / ' + fmtGB(storage.total) : '未知',
          bridge: battery || wifi ? '正常' : '断开',
          note: '每打开一次面板会重新读取；Termux 桥断开时只有存储可用。',
        })
        return () => {}
      },
      actions: {
        refresh: () => ({ refresh: true }),
      },
    })
  })
}
