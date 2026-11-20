#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫雷 · 汐澜版 v3（矩形盘）
   生成时拒绝采样：只收「基础规则 + 相邻相减」就能一路推完、不需要猜的图。
   数字带指向性提示：3>1 = 周围 3 颗雷，右侧三格至少 1 颗；x = 对角四格。
"""
import random, argparse, time

ARROWS = {"^": [(-1,-1),(-1,0),(-1,1)],
          "v": [(1,-1),(1,0),(1,1)],
          "<": [(-1,-1),(0,-1),(1,-1)],
          ">": [(-1,1),(0,1),(1,1)],
          "x": [(-1,-1),(-1,1),(1,-1),(1,1)]}


class Board:
    def __init__(self, rows=9, cols=9, mines=10, seed=None, radius=1):
        self.R, self.C, self.m = rows, cols, mines
        self.rng = random.Random(seed)
        self.mines, self.revealed, self.known = set(), set(), set()
        self.placed, self.dead, self.radius = False, False, radius
        self.stats = {"local": 0, "subset": 0}

    # ---------- 基础 ----------
    def inside(self, r, c):
        return 0 <= r < self.R and 0 <= c < self.C

    def nb(self, r, c):
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if (dr or dc) and self.inside(r + dr, c + dc):
                    yield (r + dr, c + dc)

    def place(self, safe):
        pool = [(r, c) for r in range(self.R) for c in range(self.C)
                if max(abs(r - safe[0]), abs(c - safe[1])) > self.radius]
        self.mines = set(self.rng.sample(pool, self.m))
        self.placed = True

    def num(self, r, c):
        return sum(1 for p in self.nb(r, c) if p in self.mines)

    def unknown(self, p):
        return self.inside(*p) and p not in self.revealed and p not in self.known

    def open_cell(self, r, c):
        if (r, c) in self.revealed:
            return
        if not self.placed:
            self.place((r, c))
        if (r, c) in self.mines:
            self.dead = True
            self.revealed.add((r, c))
            return
        stack = [(r, c)]
        while stack:
            p = stack.pop()
            if p in self.revealed or p in self.mines:
                continue
            self.revealed.add(p)
            if self.num(*p) == 0:
                stack.extend(q for q in self.nb(*p) if q not in self.revealed)

    def rest(self, q):
        return self.num(*q) - sum(1 for p in self.nb(*q) if p in self.known)

    # ---------- 规则 ----------
    def local_rules(self):
        mine, safe = set(), set()
        for q in self.revealed:
            v = self.num(*q)
            if v == 0:
                continue
            hid = [p for p in self.nb(*q) if self.unknown(p)]
            if not hid:
                continue
            r = self.rest(q)
            if r == 0:
                safe.update(hid)
            elif r == len(hid):
                mine.update(hid)
        return mine, safe

    def subset_rules(self):
        """相邻数字相减：N(a) 真包含于 N(b) 时，差集的雷数 = 两数之差。"""
        info = {}
        for q in self.revealed:
            if self.num(*q) == 0:
                continue
            h = frozenset(p for p in self.nb(*q) if self.unknown(p))
            if h:
                info[q] = (h, self.rest(q))
        out_mine, out_safe = set(), set()
        for a, (ha, ra) in info.items():
            for dr in (-2, -1, 0, 1, 2):
                for dc in (-2, -1, 0, 1, 2):
                    b = (a[0] + dr, a[1] + dc)
                    if b not in info or b == a:
                        continue
                    hb, rb = info[b]
                    if len(ha) <= len(hb) and ha < hb:
                        diff, d = hb - ha, rb - ra
                    elif len(hb) < len(ha) and hb < ha:
                        diff, d = ha - hb, ra - rb
                    else:
                        continue
                    if not diff:
                        continue
                    if d == len(diff):
                        out_mine |= diff
                    elif d == 0:
                        out_safe |= diff
        return out_mine, out_safe

    def solve_direct(self):
        total = self.R * self.C - self.m
        while len(self.revealed) < total:
            mine, safe = self.local_rules()
            if mine or safe:
                self.stats["local"] += 1
            else:
                mine, safe = self.subset_rules()
                if mine or safe:
                    self.stats["subset"] += 1
            mine -= self.known
            safe -= self.revealed | self.known
            if not mine and not safe:
                return False
            self.known |= mine
            for p in sorted(safe):
                if p in self.mines:
                    return False
                self.open_cell(*p)
        self.known |= self.mines
        return not self.dead

    # ---------- 指向性提示 ----------
    def dir_lb(self, q, S):
        lb = 0
        for r2 in self.nb(*q):
            if r2 not in self.revealed or self.num(*r2) == 0:
                continue
            lb = max(lb, self.rest(r2) - sum(1 for p in self.nb(*r2) if p not in S and self.unknown(p)))
        return lb

    def hint_for(self, r, c):
        if self.num(r, c) == 0:
            return None
        best = None
        for arrow, offs in ARROWS.items():
            S = {(r + dr, c + dc) for dr, dc in offs if self.inside(r + dr, c + dc)}
            if not any(self.unknown(p) for p in S):
                continue
            lb = self.dir_lb((r, c), S)
            if lb >= 1:
                key = (-lb, sum(1 for p in S if self.unknown(p)))
                if best is None or key < best[0]:
                    best = (key, arrow, lb)
        return (best[1], best[2]) if best else None

    # ---------- 显示 ----------
    def cell_text(self, r, c, hints=True, compact=False):
        p = (r, c)
        if p in self.revealed:
            v = self.num(r, c)
            if v == 0:
                return "."
            if compact or not hints:
                return str(v)
            h = self.hint_for(r, c)
            return f"{v}{h[0]}{h[1]}" if h else str(v)
        return "F" if p in self.known else "#"

    def display(self, hints=True, compact=True):
        if compact:
            h1, h2 = [], []
            for c in range(self.C):
                if c and c % 10 == 0:
                    h1.append(" ")
                    h2.append(" ")
                h1.append(str(c // 10 + 1) if c % 10 == 0 else " ")
                h2.append(str((c + 1) % 10))
            out = ["    " + "".join(h1), "    " + "".join(h2)]
            for r in range(self.R):
                row = [f"{r+1:>2}  "]
                for c in range(self.C):
                    if c and c % 10 == 0:
                        row.append(" ")
                    row.append(self.cell_text(r, c, False, True))
                out.append("".join(row).rstrip())
            return "\n".join(out)
        head = "     " + "".join(f"{c+1:>3}" for c in range(self.C))
        out = [head]
        for r in range(self.R):
            row = [f"{r+1:>2}   "]
            for c in range(self.C):
                row.append(self.cell_text(r, c, hints, False).ljust(3))
            out.append("".join(row).rstrip())
        return "\n".join(out)

    def hint_lines(self, limit=10):
        got = []
        for r in range(self.R):
            for c in range(self.C):
                if (r, c) in self.revealed and self.num(r, c):
                    h = self.hint_for(r, c)
                    if h:
                        got.append(f"R{r+1}C{c+1}={self.num(r,c)}{h[0]}{h[1]}")
        return got[:limit], len(got)


def build(rows, cols, mines, seed, radius=1, tries=3000):
    for t in range(tries):
        b = Board(rows, cols, mines, seed * 100000 + t, radius)
        b.open_cell(rows // 2, cols // 2)
        if b.solve_direct():
            return b, t + 1
    return None, tries


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", type=int, default=16)
    ap.add_argument("--cols", type=int, default=30)
    ap.add_argument("--mines", type=int, default=100)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--rounds", type=int, default=1)
    ap.add_argument("--tries", type=int, default=3000)
    ap.add_argument("--radius", type=int, default=1)
    ap.add_argument("--show", type=int, default=1)
    ap.add_argument("--wide", action="store_true")
    a = ap.parse_args()

    t0 = time.time()
    ok, reorders = 0, []
    for s in range(a.seed, a.seed + a.rounds):
        b, used = build(a.R if False else a.rows, a.cols, a.mines, s, a.radius, a.tries)
        if b is None:
            print(f"第 {s} 局：{a.tries} 次重排仍没找到可直接推的图")
            continue
        ok += 1
        reorders.append(used)
        if s < a.seed + a.show:
            print(f"\n── 第 {s} 局 · {a.rows}x{a.cols} · {a.mines} 雷 · 重排 {used} 次成图 ──")
            print(b.display(compact=not a.wide))
            print(f"   推演记录：基础规则 {b.stats['local']} 次 · 相邻相减 {b.stats['subset']} 次 · 定式/枚举 0 次")
            lines, total = b.hint_lines()
            if lines:
                print(f"   带指向提示的格共 {total} 个，例如：" + "  ".join(lines))
    if reorders:
        print(f"\n成图 {ok}/{a.rounds} 局 · 平均重排 {sum(reorders)/len(reorders):.1f} 次 · 最省 {min(reorders)} 次 · 最费 {max(reorders)} 次 · 耗时 {time.time()-t0:.1f}s")
