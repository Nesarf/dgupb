#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫雷 · 形状提示版（tkinter 窗口）"""
import sys, time, random
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import tkinter as tk
from tkinter import ttk
from sweeper_core import B, SHAPES, DISP

BG = "#e8eef4"
HID = "#c8d6e3"
HID2 = "#eff5fa"
OPEN = "#f8fbfd"
GRID = "#dbe5ee"
NUMCOL = {1: "#2f6fa8", 2: "#2e7d46", 3: "#c0392b", 4: "#5b3f94", 5: "#8a5a2b",
          6: "#1f7a7a", 7: "#333333", 8: "#777777"}

LEVELS = {"初级 9×9 · 10 雷": (9, 9, 10),
          "中级 16×16 · 40 雷": (16, 16, 40),
          "高级 16×30 · 100 雷": (16, 30, 100)}


class App:
    def __init__(self, root):
        self.root = root
        root.title("扫雷 · 形状提示版")
        root.configure(bg=BG)
        self.rows, self.cols, self.mines = 16, 30, 100
        self.cell = 34
        self.flag_mode = False
        self.show_hints = tk.BooleanVar(value=True)
        self.hints = []
        self.flags = set()
        self.start_time = None
        self.running = False
        self.dead = False

        bar = tk.Frame(root, bg=BG)
        bar.pack(fill="x", padx=8, pady=6)
        self.level = ttk.Combobox(bar, values=list(LEVELS), width=20, state="readonly")
        self.level.set("高级 16×30 · 100 雷")
        self.level.pack(side="left")
        self.level.bind("<<ComboboxSelected>>", lambda e: self.new_game(*LEVELS[self.level.get()]))
        tk.Button(bar, text="新局", command=lambda: self.new_game(self.rows, self.cols, self.mines)).pack(side="left", padx=6)
        self.flag_btn = tk.Button(bar, text="旗帜模式", command=self.toggle_flag, relief="raised")
        self.flag_btn.pack(side="left", padx=4)
        tk.Checkbutton(bar, text="显示形状提示", variable=self.show_hints, bg=BG,
                       command=self.draw).pack(side="left", padx=6)
        self.info = tk.Label(bar, text="", bg=BG, font=("Noto Sans CJK SC", 11))
        self.info.pack(side="right")

        self.canvas = tk.Canvas(root, bg=BG, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True, padx=8, pady=4)
        self.canvas.bind("<Button-1>", self.on_left)
        self.canvas.bind("<Button-3>", self.on_right)
        self.canvas.bind("<Double-Button-1>", self.on_double)

        self.new_game(16, 30, 100)
        root.geometry("%dx%d" % (self.cols * self.cell + 24, self.rows * self.cell + 70))

    # ---------- 生成 ----------
    def new_game(self, rows, cols, mines):
        self.rows, self.cols, self.mines = rows, cols, mines
        seed = random.randrange(1, 10 ** 6)
        for attempt in range(60):
            b = B(rows, cols, mines, seed + attempt * 7919)
            b.open(rows // 2, cols // 2)
            snap = set(b.revealed)
            hints, ok = [], False
            for _ in range(80):
                if b.solve(hints):
                    ok = True
                    break
                cands = b.candidates()
                pick = None
                for c in cands:
                    if not any(h[0] == c[2] and h[1] == c[3] for h in hints):
                        pick = c
                        break
                if pick is None:
                    break
                hints.append((pick[2], pick[3], pick[4], pick[5]))
            if ok:
                break
        b.revealed = set(snap)
        b.known = set()
        b.dead = False
        self.b = b
        self.hints = hints
        self.weak = b.weak_hints()
        self.flags = set()
        self.dead = False
        self.running = True
        self.start_time = time.time()
        self.draw()
        self.root.geometry("%dx%d" % (cols * self.cell + 24, rows * self.cell + 70))

    def toggle_flag(self):
        self.flag_mode = not self.flag_mode
        self.flag_btn.config(relief="sunken" if self.flag_mode else "raised")

    # ---------- 交互 ----------
    def cell_at(self, x, y):
        c, r = x // self.cell, y // self.cell
        if 0 <= r < self.rows and 0 <= c < self.cols:
            return r, c
        return None

    def on_left(self, e):
        p = self.cell_at(e.x, e.y)
        if not p or self.dead:
            return
        if self.flag_mode:
            self.toggle_flag_at(p)
            return
        self.open_at(p)

    def on_right(self, e):
        p = self.cell_at(e.x, e.y)
        if p and not self.dead:
            self.toggle_flag_at(p)

    def on_double(self, e):
        p = self.cell_at(e.x, e.y)
        if not p or self.dead:
            return
        r, c = p
        if (r, c) not in self.b.revealed:
            return
        v = self.b.num(r, c)
        if v == 0:
            return
        nbrs = self.b.nb(r, c)
        if sum(1 for q in nbrs if q in self.flags) != v:
            return
        for q in nbrs:
            if q not in self.b.revealed and q not in self.flags:
                self.b.open(*q)
        if self.b.dead:
            self.dead = True
            self.running = False
        elif len(self.b.revealed) == self.rows * self.cols - self.mines:
            self.running = False
        self.draw()

    def toggle_flag_at(self, p):
        r, c = p
        if (r, c) in self.b.revealed:
            return
        if (r, c) in self.flags:
            self.flags.discard((r, c))
        else:
            self.flags.add((r, c))
        self.draw()

    def open_at(self, p):
        r, c = p
        if (r, c) in self.flags or (r, c) in self.b.revealed:
            return
        self.b.open(r, c)
        self.weak = self.b.weak_hints()
        if self.b.dead:
            self.dead = True
            self.running = False
        elif len(self.b.revealed) == self.rows * self.cols - self.mines:
            self.running = False
            self.flags = {(r2, c2) for r2 in range(self.rows) for c2 in range(self.cols) if (r2, c2) in self.b.mines}
        self.draw()

    # ---------- 绘制 ----------
    def draw(self):
        cv = self.canvas
        cv.delete("all")
        s = self.cell
        for r in range(self.rows):
            for c in range(self.cols):
                x0, y0 = c * s, r * s
                x1, y1 = x0 + s, y0 + s
                if (r, c) in self.b.revealed:
                    cv.create_rectangle(x0, y0, x1, y1, fill=OPEN, outline=GRID)
                    if (r, c) in self.b.mines:
                        cx, cy = x0 + s // 2, y0 + s // 2
                        cv.create_oval(cx - 7, cy - 7, cx + 7, cy + 7, fill="#2b3a45", outline="")
                        cv.create_line(cx - 11, cy, cx + 11, cy, fill="#2b3a45", width=2)
                        cv.create_line(cx, cy - 11, cx, cy + 11, fill="#2b3a45", width=2)
                    else:
                        v = self.b.num(r, c)
                        if v:
                            cv.create_text(x0 + s / 2, y0 + s / 2, text=str(v),
                                           fill=NUMCOL.get(v, "#333"),
                                           font=("Noto Sans CJK SC", int(s * 0.5), "bold"))
                else:
                    cv.create_rectangle(x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill=HID, outline=HID2, width=2)
                    if (r, c) in self.flags:
                        cx, cy = x0 + s // 2, y0 + s // 2
                        cv.create_polygon(cx - 6, cy - 9, cx + 8, cy - 2, cx - 6, cy + 5,
                                          fill="#d64045", outline="")
                        cv.create_line(cx - 7, cy - 9, cx - 7, cy + 11, fill="#6b7a88", width=2)
        if self.show_hints.get():
            exact_cells = {h[0] for h in self.hints}
            for (q, sym, ids, lb, _exact) in self.weak:
                if q in exact_cells:
                    continue
                r, c = q
                if (r, c) not in self.b.revealed:
                    continue
                if not any(p not in self.b.revealed for p in self.b.shape_cells(q, ids)):
                    continue
                x0, y0 = c * s, r * s
                cv.create_text(x0 + s - 3, y0 + 3, text=DISP.get(sym, sym) + str(lb),
                               anchor="ne", fill="#b06a00",
                               font=("Noto Sans CJK SC", max(7, int(s * 0.27))))
            drawn = set()
            for (q, sym, ids, lb) in self.hints:
                r, c = q
                if (r, c) not in self.b.revealed or q in drawn:
                    continue
                drawn.add(q)
                x0, y0 = c * s, r * s
                cv.create_text(x0 + s - 4, y0 + s - 6, text=DISP.get(sym, sym) + str(lb),
                               anchor="se", fill="#2f6fa8",
                               font=("Noto Sans CJK SC", max(7, int(s * 0.28))))
        left = self.mines - len(self.flags)
        if self.dead:
            msg = "踩雷了 —— 按新局再来"
        elif not self.running:
            msg = "清完了"
        else:
            msg = "进行中"
        self.info.config(text="剩余雷 %d    %s" % (left, msg))


def main():
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
