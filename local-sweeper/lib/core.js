// 扫雷核心：矩形盘 + 形状提示注入（与 Python 版同构）
export const OFFS = {1:[-1,-1],2:[-1,0],3:[-1,1],4:[0,-1],5:[0,1],6:[1,-1],7:[1,0],8:[1,1]};

export const SHAPES = {
  up:[1,2,3], down:[6,7,8], left:[1,4,6], right:[3,5,8],
  ul:[1,2,4], ur:[2,3,5], dl:[4,6,7], dr:[5,7,8],
  cross:[1,3,6,8], sq:[3,4,7], mu:[1,3,4,5,6], integ:[2,3,6,7],
  vert:[2,7], dash:[4,5], bs:[1,8], fs:[3,6],
  neq:[2,4,5,7], pm:[1,2,3,6,7,8], mp:[1,2,3,4,5,7], corner:[1,2,3,4],
  tf:[2,6,8], bf:[1,3,7], ang:[3,6,8], lt:[2,4,7], gt:[2,5,7]
};
export const DISP = {
  up:"↑", down:"↓", left:"←", right:"→", ul:"↖", ur:"↗", dl:"↙", dr:"↘",
  cross:"×", sq:"√", mu:"μ", integ:"∫", vert:"∣", dash:"—", bs:"╲", fs:"╱",
  neq:"≠", pm:"±", mp:"∓", corner:"⌐", tf:"∴", bf:"∵", ang:"∠", lt:"〈", gt:"〉"
};

function makeRng(seed){
  let a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Board {
  constructor(R, C, m, seed){
    this.R = R; this.C = C; this.m = m; this.seed = seed;
    this.rng = makeRng(seed);
    this.mines = new Set(); this.rev = new Set(); this.known = new Set();
    this.dead = false; this.placed = false;
    this.nums = new Map();
  }
  inside(r,c){ return r >= 0 && r < this.R && c >= 0 && c < this.C; }
  I(r,c){ return r * this.C + c; }
  RC(i){ return [Math.floor(i / this.C), i % this.C]; }
  nbs(i){
    const [r,c] = this.RC(i), out = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++){
        if (!dr && !dc) continue;
        if (this.inside(r+dr, c+dc)) out.push(this.I(r+dr, c+dc));
      }
    return out;
  }
  numAt(i){
    if (this.nums.has(i)) return this.nums.get(i);
    let n = 0;
    for (const j of this.nbs(i)) if (this.mines.has(j)) n++;
    this.nums.set(i, n);
    return n;
  }
  placeMines(safe){
    const [sr,sc] = this.RC(safe);
    const pool = [];
    for (let r = 0; r < this.R; r++)
      for (let c = 0; c < this.C; c++)
        if (Math.max(Math.abs(r-sr), Math.abs(c-sc)) > 1) pool.push(this.I(r,c));
    for (let i = pool.length - 1; i > 0; i--){
      const j = Math.floor(this.rng() * (i + 1));
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    this.mines = new Set(pool.slice(0, this.m));
    this.placed = true; this.nums.clear();
  }
  openCell(i){
    if (this.rev.has(i)) return;
    if (!this.placed) this.placeMines(i);
    if (this.mines.has(i)){ this.dead = true; this.rev.add(i); return; }
    const st = [i];
    while (st.length){
      const p = st.pop();
      if (this.rev.has(p) || this.mines.has(p)) continue;
      this.rev.add(p);
      if (this.numAt(p) === 0)
        for (const q of this.nbs(p)) if (!this.rev.has(q)) st.push(q);
    }
  }
  unk(i){ return !this.rev.has(i) && !this.known.has(i); }
  rest(i){ let n = this.numAt(i); for (const j of this.nbs(i)) if (this.known.has(j)) n--; return n; }

  localRules(){
    const mi = new Set(), sa = new Set();
    for (const q of this.rev){
      const v = this.numAt(q);
      if (!v) continue;
      const hid = [];
      for (const p of this.nbs(q)) if (this.unk(p)) hid.push(p);
      if (!hid.length) continue;
      const r = this.rest(q);
      if (r === 0) hid.forEach(p => sa.add(p));
      else if (r === hid.length) hid.forEach(p => mi.add(p));
    }
    return [mi, sa];
  }
  subsetRules(){
    const mi = new Set(), sa = new Set(), info = new Map();
    for (const q of this.rev){
      if (!this.numAt(q)) continue;
      const h = new Set();
      for (const p of this.nbs(q)) if (this.unk(p)) h.add(p);
      if (h.size) info.set(q, { h, r: this.rest(q) });
    }
    const isSub = (a,b) => { for (const x of a) if (!b.has(x)) return false; return true; };
    for (const [a, ia] of info){
      const [ar, ac] = this.RC(a);
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++){
          if (!dr && !dc) continue;
          if (!this.inside(ar+dr, ac+dc)) continue;
          const ib = info.get(this.I(ar+dr, ac+dc));
          if (!ib) continue;
          let small, big, d;
          if (ia.h.size < ib.h.size && isSub(ia.h, ib.h)) { small = ia.h; big = ib.h; d = ib.r - ia.r; }
          else if (ib.h.size < ia.h.size && isSub(ib.h, ia.h)) { small = ib.h; big = ia.h; d = ia.r - ib.r; }
          else continue;
          const diff = [];
          for (const x of big) if (!small.has(x)) diff.push(x);
          if (!diff.length) continue;
          if (d === diff.length) diff.forEach(x => mi.add(x));
          else if (d === 0) diff.forEach(x => sa.add(x));
        }
    }
    return [mi, sa];
  }
  shapeCells(q, key){
    const [r,c] = this.RC(q), out = [];
    for (const id of SHAPES[key]){
      const [dr,dc] = OFFS[id];
      if (this.inside(r+dr, c+dc)) out.push(this.I(r+dr, c+dc));
    }
    return out;
  }
  hintEffect(hints){
    const mi = new Set(), sa = new Set();
    for (const h of hints){
      const cells = this.shapeCells(h.i, h.key).filter(p => this.unk(p));
      if (!cells.length) continue;
      if (h.lb >= cells.length) cells.forEach(x => mi.add(x));
      else if (h.lb <= 0) cells.forEach(x => sa.add(x));
    }
    return [mi, sa];
  }
  solve(hints){
    const total = this.R * this.C - this.m;
    let guard = 0;
    while (this.rev.size < total){
      if (guard++ > 20000) return false;
      let [mi, sa] = this.localRules();
      if (!mi.size && !sa.size) [mi, sa] = this.subsetRules();
      if (!mi.size && !sa.size) [mi, sa] = this.hintEffect(hints);
      if (!mi.size && !sa.size && this.known.size >= this.m){
        sa = new Set();
        for (let i = 0; i < this.R * this.C; i++) if (this.unk(i)) sa.add(i);
      }
      const mi2 = [...mi].filter(x => !this.rev.has(x) && !this.known.has(x));
      const sa2 = [...sa].filter(x => !this.rev.has(x) && !this.known.has(x));
      if (!mi2.length && !sa2.length) return false;
      mi2.forEach(x => this.known.add(x));
      for (const x of sa2){ if (this.mines.has(x)) return false; this.openCell(x); }
    }
    for (const x of this.mines) this.known.add(x);
    return !this.dead;
  }
  candidates(){
    const out = [];
    for (const q of this.rev){
      const v = this.numAt(q);
      if (!v) continue;
      const base = this.rest(q);
      for (const key in SHAPES){
        const cells = this.shapeCells(q, key);
        const set = new Set(cells);
        const unkCells = cells.filter(p => this.unk(p));
        if (!unkCells.length) continue;
        let outside = 0;
        for (const p of this.nbs(q)) if (!set.has(p) && this.unk(p)) outside++;
        const lb = Math.max(0, base - outside);
        if (lb >= unkCells.length) out.push({ i:q, key, lb, n:unkCells.length, v });
        let outer = 0;
        for (const q2 of this.nbs(q)){
          if (!this.rev.has(q2) || !this.numAt(q2)) continue;
          let inner = 0;
          for (const p of this.nbs(q2)) if (set.has(p) && this.unk(p)) inner++;
          outer = Math.max(outer, this.rest(q2) - inner);
        }
        if (base - outer <= 0) out.push({ i:q, key, lb:0, n:unkCells.length, v });
      }
    }
    out.sort((a,b) => b.n - a.n);
    return out;
  }
}

export function build(R, C, m, seed, quota){
  quota = quota || 80;
  const b = new Board(R, C, m, seed);
  b.openCell(b.I(Math.floor(R/2), Math.floor(C/2)));
  const snapshot = new Set(b.rev);
  const hints = [];
  for (let t = 0; t < quota; t++){
    if (b.solve(hints)) return { board: b, hints, snapshot, ok: true };
    const cands = b.candidates();
    let pick = null;
    for (const c of cands){
      if (!hints.some(h => h.i === c.i && h.key === c.key)) { pick = c; break; }
    }
    if (!pick) return { board: b, hints, snapshot, ok: false };
    hints.push(pick);
  }
  return { board: b, hints, snapshot, ok: false };
}

