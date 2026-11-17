// DSH IME: a small local input panel for dsh-go.
// Characters are only data here; every one is written as a \u escape so this
// file stays plain ASCII.
export const name = 'local-dsh-ime'

const GROUPS = [
  {
    name: 'Greek',
    zh: '希腊字母',
    chars: '\u03b1\u03b2\u03b3\u03b4\u03b5\u03b6\u03b7\u03b8\u03b9\u03ba\u03bb\u03bc\u03bd\u03be\u03bf\u03c0\u03c1\u03c3\u03c4\u03c5\u03c6\u03c7\u03c8\u03c9',
  },
  {
    name: 'Russian',
    zh: '俄文字母',
    chars: '\u0430\u0431\u0432\u0433\u0434\u0435\u0451\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f',
  },
  {
    name: 'Hiragana',
    zh: '日文平假名',
    chars: '\u3042\u3044\u3046\u3048\u304a\u304b\u304d\u304f\u3051\u3053\u3055\u3057\u3059\u305b\u305d\u305f\u3061\u3064\u3066\u3068\u306a\u306b\u306c\u306d\u306e\u306f\u3072\u3075\u3078\u307b\u307e\u307f\u3080\u3081\u3082\u3084\u3086\u3088\u3089\u308a\u308b\u308c\u308d\u308f\u3092\u3093',
  },
  {
    name: 'Katakana',
    zh: '日文片假名',
    chars: '\u30a2\u30a4\u30a6\u30a8\u30aa\u30ab\u30ad\u30af\u30b1\u30b3\u30b5\u30b7\u30b9\u30bb\u30bd\u30bf\u30c1\u30c4\u30c6\u30c8\u30ca\u30cb\u30cc\u30cd\u30ce\u30cf\u30d2\u30d5\u30d8\u30db\u30de\u30df\u30e0\u30e1\u30e2\u30e4\u30e6\u30e8\u30e9\u30ea\u30eb\u30ec\u30ed\u30ef\u30f2\u30f3',
  },
  {
    name: 'Hangul',
    zh: '韩文',
    chars: '\uac00\ub098\ub2e4\ub77c\ub9c8\ubc14\uc0ac\uc544\uc790\ucc28\uce74\ud0c0\ud30c\ud558',
  },
  {
    name: 'Math',
    zh: '数学符号',
    chars: '\u00b1\u2260\u2264\u2265\u221e\u2211\u220f\u222b\u2202\u2206\u2207\u2208\u2209\u2282\u2283\u222a\u2229',
  },
  {
    name: 'Arrows',
    zh: '箭头',
    chars: '\u2190\u2191\u2192\u2193\u2194\u2195\u21d0\u21d1\u21d2\u21d3\u21d4',
  },
  {
    name: 'Punct',
    zh: '全角标点',
    chars: '\uff0c\u3002\uff01\uff1f\uff1b\uff1a\u3001\uff08\uff09\u3010\u3011\u300c\u300d\u300e\u300f\u300a\u300b\u2026',
  },
  {
    name: 'Money',
    zh: '货币符号',
    chars: '\u00a5\u20ac\u00a3\u00a2\uffe5\u20bf',
  },
  {
    name: 'Symbols',
    zh: '特殊符号',
    chars: '\u00a9\u00ae\u00b0\u00a7\u00b6\u2020\u2021\u2022\u2030',
  },
  {
    name: 'Numbers',
    zh: '大写数字',
    chars: '\u96f6\u58f9\u8d30\u53c1\u8086\u4f0d\u9646\u67d2\u634c\u7396\u62fe\u4f70\u4edf\u4e07\u4ebf',
  },
].map((group) => ({ ...group, chars: Array.from(group.chars) }))

function parseCodePoint(text) {
  const trimmed = String(text || '').trim()
  const match = trimmed.match(/^(?:u\+|U\+)?([0-9a-fA-F]{2,6})$/)
  if (!match) return null
  const cp = Number.parseInt(match[1], 16)
  if (!Number.isFinite(cp) || cp < 0x20 || cp > 0x10ffff) return null
  if (cp >= 0xd800 && cp <= 0xdfff) return null
  try {
    return String.fromCodePoint(cp)
  } catch {
    return null
  }
}

function findCodePoint(text) {
  const trimmed = String(text || '').trim()
  if (trimmed === '') return null
  const direct = parseCodePoint(trimmed)
  if (direct) return direct
  const match = trimmed.match(/(?:u\+|U\+)([0-9a-fA-F]{2,6})/i)
  return match ? parseCodePoint(match[1]) : null
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    const isZh = (event) => !String(event?.locale || '').startsWith('en')

    ctx.dshGo.panel('chars', {
      view(scope, caps) {
        const children = [
          {
            type: 'text',
            text: '点一个字符，它会插入到输入框',
            tone: 'muted',
          },
          {
            type: 'actions',
            items: [
              { label: '粘贴剪贴板', action: 'paste-clip' },
              { label: '码点转字', action: 'code-to-char' },
            ],
          },
        ]
        for (const group of GROUPS) {
          children.push({ type: 'text', text: group.zh, tone: 'muted' })
          children.push({
            type: 'list',
            items: group.chars.map((ch) => ({
              title: ch,
              subtitle: 'U+' + ch.codePointAt(0).toString(16).toUpperCase(),
              action: { id: 'insert-char', args: { ch } },
            })),
          })
        }
        return { type: 'stack', title: 'DSH 输入法', children }
      },
      actions: {
        'insert-char': (scope, event) => {
          const ch = event?.value?.ch
          if (!ch) return { toast: '没有可插入的字符' }
          return { insert: String(ch).slice(0, 32) }
        },
        'paste-clip': (scope, event) => {
          const text = String(scope.clipboard ?? '').trim()
          if (text === '') {
            return { toast: isZh(event) ? '剪贴板里没有文字' : 'The clipboard is empty' }
          }
          return { insert: text.slice(0, 2000) }
        },
        'code-to-char': (scope, event) => {
          const ch = findCodePoint(scope.clipboard)
          if (ch) return { insert: ch }
          return { toast: isZh(event) ? '剪贴板里没找到 Unicode 码点' : 'No code point in the clipboard' }
        },
      },
    })
  })
}
