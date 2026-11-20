#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""研究：不筛图，靠「形状提示」把任意随机盘变成可推盘"""
import random, itertools

OFFS = {1: (-1,-1), 2: (-1,0), 3: (-1,1),
        4: (0,-1),           5: (0,1),
        6: (1,-1), 7: (1,0), 8: (1,1)}

DISP = {"^": "↑", "v": "↓", "<": "←", ">": "→",
        "UL": "↖", "UR": "↗", "DL": "↙", "DR": "↘",
        "x": "×", "r": "√", "m": "μ", "i": "∫",
        "|": "∣", "n": "≠", "+": "±", "mp": "∓",
        "th": "∴", "bec": "∵", "ang": "∠",
        "em": "—", "cor": "⌐", "bs": "╲", "fs": "╱",
        "lt": "〈", "gt": "〉"}

SHAPES = {
    "^": {1,2,3}, "v": {6,7,8}, "<": {1,4,6}, ">": {3,5,8},
    "UL": {1,2,4}, "UR": {2,3,5}, "DL": {4,6,7}, "DR": {5,7,8},
    "x": {1,3,6,8}, "r": {3,4,7}, "m": {1,3,4,5,6}, "i": {2,3,6,7},
    "|": {2,7}, "n": {2,4,5,7}, "+": {1,2,3,6,7,8}, 
    "mp": {1,2,3,4,5,7},
    "th": {2,6,8}, "bec": {1,3,7}, "ang": {3,6,8},
    "em": {4,5}, "cor": {1,2,3,4}, "bs": {1,8}, "fs": {3,6},

    "lt": {2,4,7}, "gt": {2,5,7},
}

class B:
    def __init__(self, R, C, m, seed):
        self.R, self.C, self.m = R, C, m
        self.rng = random.Random(seed)
        self.mines, self.revealed, self.known = set(), set(), set()
    def inside(self, r, c): return 0 <= r < self.R and 0 <= c < self.C
    def nb(self, r, c):
        return [(r+dr, c+dc) for dr, dc in OFFS.values() if self.inside(r+dr, c+dc)]
    def num(self, r, c): return sum(1 for p in self.nb(r, c) if p in self.mines)
    def unk(self, p): return p not in self.revealed and p not in self.known
    def place(self, safe):
        pool = [(r, c) for r in range(self.R) for c in range(self.C)
                if max(abs(r-safe[0]), abs(c-safe[1])) > 1]
        self.mines = set(self.rng.sample(pool, self.m))
    def open(self, r, c):
        if (r, c) in self.revealed: return
        if not self.mines and not hasattr(self, "_p"):
            self.place((r, c)); self._p = 1
        if (r, c) in self.mines:
            self.revealed.add((r, c)); return
        st = [(r, c)]
        while st:
            p = st.pop()
            if p in self.revealed or p in self.mines: continue
            self.revealed.add(p)
            if self.num(*p) == 0: st.extend(q for q in self.nb(*p) if q not in self.revealed)
    def rest(self, q):
        return self.num(*q) - sum(1 for p in self.nb(*q) if p in self.known)
    def shape_cells(self, q, ids):
        return {(q[0]+OFFS[i][0], q[1]+OFFS[i][1]) for i in ids if self.inside(q[0]+OFFS[i][0], q[1]+OFFS[i][1])}

    def local(self):
        mine, safe = set(), set()
        for q in self.revealed:
            if self.num(*q) == 0: continue
            hid = [p for p in self.nb(*q) if self.unk(p)]
            if not hid: continue
            r = self.rest(q)
            if r == 0: safe.update(hid)
            elif r == len(hid): mine.update(hid)
        return mine, safe

    def subset(self):
        info = {}
        for q in self.revealed:
            if self.num(*q) == 0: continue
            h = frozenset(p for p in self.nb(*q) if self.unk(p))
            if h: info[q] = (h, self.rest(q))
        mi, sa = set(), set()
        ks = list(info)
        for i, a in enumerate(ks):
            ha, ra = info[a]
            for b in ks[i+1:]:
                hb, rb = info[b]
                if len(ha) < len(hb) and ha < hb: d, dd = hb-ha, rb-ra
                elif len(hb) < len(ha) and hb < ha: d, dd = ha-hb, ra-rb
                else: continue
                if not d: continue
                if dd == len(d): mi |= d
                elif dd == 0: sa |= d
        return mi, sa

    def hint_effect(self, hints):
        mi, sa = set(), set()
        for (q, sym, ids, lb) in hints:
            cells = [p for p in self.shape_cells(q, ids) if self.unk(p)]
            if not cells: continue
            if lb >= len(cells): mi.update(cells)
            elif lb <= 0: sa.update(cells)
        return mi, sa

    def step(self, hints):
        mi, sa = self.local()
        if not mi and not sa: mi, sa = self.subset()
        if not mi and not sa: mi, sa = self.hint_effect(hints)
        mi -= self.revealed | self.known; sa -= self.revealed | self.known
        if not mi and not sa: return False
        self.known |= mi
        for p in sorted(sa): self.open(*p)
        return True

    def solve(self, hints):
        total = self.R*self.C - self.m
        for _ in range(20000):
            if len(self.revealed) >= total: return True
            if not self.step(hints): return False
        return False

    def weak_hints(self):
        """每个已开数字格挑一条「至少 n 颗」的弱提示（非精确），只用于显示。
        选形状时对已经用过的符号减分，让整局符号尽量分散。"""
        out = []
        used = {}
        for q in self.revealed:
            v = self.num(*q)
            if v == 0:
                continue
            base = self.rest(q)
            best = None
            for sym, ids in SHAPES.items():
                cells = self.shape_cells(q, ids)
                unk = [p for p in cells if self.unk(p)]
                if not unk:
                    continue
                outside = sum(1 for p in self.nb(*q) if p not in cells and self.unk(p))
                lb = max(0, base - outside)
                if 1 <= lb < len(unk):
                    score = lb * 10 - len(unk) - used.get(sym, 0) * 3
                    if best is None or score > best[0]:
                        best = (score, sym, ids, lb)
            if best:
                used[best[1]] = used.get(best[1], 0) + 1
                out.append((q, best[1], best[2], best[3], False))
        return out

    def candidates(self):
        out = []
        for q in self.revealed:
            v = self.num(*q)
            if v == 0: continue
            base = self.rest(q)
            for sym, ids in SHAPES.items():
                cells = self.shape_cells(q, ids)
                unk = [p for p in cells if self.unk(p)]
                if not unk: continue
                outside = sum(1 for p in self.nb(*q) if p not in cells and self.unk(p))
                lb = max(0, base - outside)
                if lb >= len(unk):
                    out.append((len(unk), 1, q, sym, ids, lb))
                # 反向：形状外已确定达到 base，形状内全安全
                outer_lb = 0
                for q2 in self.nb(*q):
                    if q2 not in self.revealed or self.num(*q2) == 0: continue
                    inner = sum(1 for p in self.nb(*q2) if p in cells and self.unk(p))
                    outer_lb = max(outer_lb, self.rest(q2) - inner)
                if base - outer_lb <= 0:
                    out.append((len(unk), 0, q, sym, ids, 0))
        out.sort(key=lambda t: -t[0])
        return out


def inject(R=16, C=30, m=100, seed=1, quota=80):
    b = B(R, C, m, seed)
    b.open(R//2, C//2)
    hints = []
    while True:
        total = R*C - m
        if b.solve(hints): return b, hints, True
        cands = b.candidates()
        if not cands or len(hints) >= quota: return b, hints, False
        pick = None
        for cand in cands:
            _, _, q, sym, ids, lb = cand
            if not any(h[0]==q and h[1]==sym for h in hints):
                pick = cand; break
        if pick is None:
            return b, hints, False
        _, _, q, sym, ids, lb = pick
        hints.append((q, sym, ids, lb))
        # 立即执行一次让状态前进
        if not b.step(hints):
            pass

def show(R, C, m, seed):
    b, hints, done = inject(R, C, m, seed)
    print(f"── {R}x{C} · {m} 雷 · 随机图 · 注入 {len(hints)} 条形状提示 · {'全程可推' if done else '仍有缺口'} ──")
    for r in range(R):
        row = []
        for c in range(C):
            p=(r,c)
            row.append("." if p in b.revealed and b.num(r,c)==0 else (str(b.num(r,c)) if p in b.revealed else ("F" if p in b.known else "#")))
        print(f"{r+1:>2} " + "".join(row))
    print("提示：")
    for (q,sym,ids,lb) in hints:
        print(f"  R{q[0]+1}C{q[1]+1} 数字 {b.num(*q)} · {DISP.get(sym,sym)}（点{sorted(ids)}）内 {lb} 颗雷")


if __name__ == "__main__":
    import time, argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", type=int, default=16)
    ap.add_argument("--cols", type=int, default=30)
    ap.add_argument("--mines", type=int, default=100)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--batch", type=int, default=0)
    a = ap.parse_args()
    if a.batch:
        t0=time.time(); ok=0; cnt=[]
        for s in range(1, a.batch+1):
            b, hints, done = inject(a.rows, a.cols, a.mines, s)
            ok += done; cnt.append(len(hints))
        print(f"{a.batch} 张随机图：{ok} 张靠提示推完 · 平均 {sum(cnt)/len(cnt):.1f} 条提示 · 最多 {max(cnt)} 条 · {time.time()-t0:.1f}s")
    else:
        show(a.rows, a.cols, a.mines, a.seed)
