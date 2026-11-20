import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.File;
import java.util.*;
import java.util.prefs.Preferences;

public class Sweeper extends JFrame {
    static final Map<String,int[]> SHAPES = new LinkedHashMap<>();
    static final Map<String,String> DISP = new LinkedHashMap<>();
    static final int[][] OFF = {{0,0},{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};
    static {
        SHAPES.put("up",new int[]{1,2,3});        DISP.put("up","↑");
        SHAPES.put("down",new int[]{6,7,8});      DISP.put("down","↓");
        SHAPES.put("left",new int[]{1,4,6});      DISP.put("left","←");
        SHAPES.put("right",new int[]{3,5,8});     DISP.put("right","→");
        SHAPES.put("ul",new int[]{1,2,4});        DISP.put("ul","↖");
        SHAPES.put("ur",new int[]{2,3,5});        DISP.put("ur","↗");
        SHAPES.put("dl",new int[]{4,6,7});        DISP.put("dl","↙");
        SHAPES.put("dr",new int[]{5,7,8});        DISP.put("dr","↘");
        SHAPES.put("cross",new int[]{1,3,6,8});   DISP.put("cross","×");
        SHAPES.put("sq",new int[]{3,4,7});        DISP.put("sq","√");
        SHAPES.put("mu",new int[]{1,3,4,5,6});    DISP.put("mu","μ");
        SHAPES.put("integ",new int[]{2,3,6,7});   DISP.put("integ","∫");
        SHAPES.put("vert",new int[]{2,7});        DISP.put("vert","∣");
        SHAPES.put("dash",new int[]{4,5});        DISP.put("dash","—");
        SHAPES.put("bs",new int[]{1,8});          DISP.put("bs","╲");
        SHAPES.put("fs",new int[]{3,6});          DISP.put("fs","╱");
        SHAPES.put("neq",new int[]{2,4,5,7});     DISP.put("neq","≠");
        SHAPES.put("pm",new int[]{1,2,3,6,7,8});  DISP.put("pm","±");
        SHAPES.put("mp",new int[]{1,2,3,4,5,7});  DISP.put("mp","∓");
        SHAPES.put("corner",new int[]{1,2,3,4});  DISP.put("corner","⌐");
        SHAPES.put("tf",new int[]{2,6,8});        DISP.put("tf","∴");
        SHAPES.put("bf",new int[]{1,3,7});        DISP.put("bf","∵");
        SHAPES.put("ang",new int[]{3,6,8});       DISP.put("ang","∠");
        SHAPES.put("lt",new int[]{2,4,7});        DISP.put("lt","〈");
        SHAPES.put("gt",new int[]{2,5,7});        DISP.put("gt","〉");
    }

    static class Hint { int i; String key; int lb, n; boolean exact = true; }

    static class Board {
        int R, C, M, seed;
        boolean[] mine, rev, known, flag;
        boolean placed, dead;
        int[] num;
        Random rng;

        Board(int R, int C, int M, int seed) {
            this.R = R; this.C = C; this.M = M; this.seed = seed;
            mine = new boolean[R*C]; rev = new boolean[R*C]; known = new boolean[R*C]; flag = new boolean[R*C];
            num = new int[R*C];
            rng = new Random(seed);
        }
        int I(int r, int c){ return r*C + c; }
        boolean inside(int r, int c){ return r >= 0 && r < R && c >= 0 && c < C; }
        ArrayList<Integer> nbs(int i){
            int r = i / C, c = i % C;
            ArrayList<Integer> out = new ArrayList<>(8);
            for (int d = 1; d <= 8; d++){
                int rr = r + OFF[d][0], cc = c + OFF[d][1];
                if (inside(rr, cc)) out.add(I(rr, cc));
            }
            return out;
        }
        void place(int safe) {
            int sr = safe / C, sc = safe % C;
            ArrayList<Integer> pool = new ArrayList<>();
            for (int r = 0; r < R; r++)
                for (int c = 0; c < C; c++)
                    if (Math.max(Math.abs(r-sr), Math.abs(c-sc)) > 1) pool.add(I(r,c));
            Collections.shuffle(pool, rng);
            for (int k = 0; k < M; k++) mine[pool.get(k)] = true;
            placed = true;
            Arrays.fill(num, -1);
        }
        int num(int i) {
            if (num[i] >= 0) return num[i];
            int n = 0;
            for (int j : nbs(i)) if (mine[j]) n++;
            num[i] = n;
            return n;
        }
        void open(int i) {
            if (rev[i]) return;
            if (!placed) place(i);
            if (mine[i]) { dead = true; rev[i] = true; return; }
            ArrayDeque<Integer> st = new ArrayDeque<>();
            st.push(i);
            while (!st.isEmpty()) {
                int p = st.pop();
                if (rev[p] || mine[p]) continue;
                rev[p] = true;
                if (num(p) == 0) for (int q : nbs(p)) if (!rev[q]) st.push(q);
            }
        }
        boolean unk(int i){ return !rev[i] && !known[i]; }
        int rest(int i){ int n = num(i); for (int j : nbs(i)) if (known[j]) n--; return n; }
        int revCount(){ int n=0; for (boolean b : rev) if (b) n++; return n; }

        boolean[] localMine, localSafe;
        void localRules() {
            localMine = new boolean[R*C]; localSafe = new boolean[R*C];
            for (int q = 0; q < R*C; q++) {
                if (!rev[q]) continue;
                int v = num(q);
                if (v == 0) continue;
                ArrayList<Integer> hid = new ArrayList<>();
                for (int p : nbs(q)) if (unk(p)) hid.add(p);
                if (hid.isEmpty()) continue;
                int r = rest(q);
                if (r == 0) for (int p : hid) localSafe[p] = true;
                else if (r == hid.size()) for (int p : hid) localMine[p] = true;
            }
        }
        void subsetRules() {
            localMine = new boolean[R*C]; localSafe = new boolean[R*C];
            HashMap<Integer, HashSet<Integer>> hmap = new HashMap<>();
            HashMap<Integer, Integer> rmap = new HashMap<>();
            for (int q = 0; q < R*C; q++) {
                if (!rev[q] || num(q) == 0) continue;
                HashSet<Integer> h = new HashSet<>();
                for (int p : nbs(q)) if (unk(p)) h.add(p);
                if (!h.isEmpty()) { hmap.put(q, h); rmap.put(q, rest(q)); }
            }
            for (int a : hmap.keySet()) {
                HashSet<Integer> ha = hmap.get(a);
                int ar = a / C, ac = a % C;
                for (int dr = -2; dr <= 2; dr++) for (int dc = -2; dc <= 2; dc++) {
                    if (dr == 0 && dc == 0) continue;
                    if (!inside(ar+dr, ac+dc)) continue;
                    int b = I(ar+dr, ac+dc);
                    HashSet<Integer> hb = hmap.get(b);
                    if (hb == null) continue;
                    HashSet<Integer> small, big; int d;
                    if (ha.size() < hb.size() && hb.containsAll(ha)) { small = ha; big = hb; d = rmap.get(b) - rmap.get(a); }
                    else if (hb.size() < ha.size() && ha.containsAll(hb)) { small = hb; big = ha; d = rmap.get(a) - rmap.get(b); }
                    else continue;
                    ArrayList<Integer> diff = new ArrayList<>();
                    for (int x : big) if (!small.contains(x)) diff.add(x);
                    if (diff.isEmpty()) continue;
                    if (d == diff.size()) for (int x : diff) localMine[x] = true;
                    else if (d == 0) for (int x : diff) localSafe[x] = true;
                }
            }
        }
        ArrayList<Integer> shapeCells(int q, String key) {
            int r = q / C, c = q % C;
            ArrayList<Integer> out = new ArrayList<>();
            for (int id : SHAPES.get(key)) {
                int rr = r + OFF[id][0], cc = c + OFF[id][1];
                if (inside(rr, cc)) out.add(I(rr, cc));
            }
            return out;
        }
        void hintRules(java.util.List<Hint> hints) {
            localMine = new boolean[R*C]; localSafe = new boolean[R*C];
            for (Hint h : hints) {
                ArrayList<Integer> cells = new ArrayList<>();
                for (int p : shapeCells(h.i, h.key)) if (unk(p)) cells.add(p);
                if (cells.isEmpty()) continue;
                if (h.lb >= cells.size()) for (int p : cells) localMine[p] = true;
                else if (h.lb <= 0) for (int p : cells) localSafe[p] = true;
            }
        }
        boolean solve(java.util.List<Hint> hints) {
            int total = R*C - M, guard = 0;
            while (revCount() < total) {
                if (guard++ > 20000) return false;
                localRules();
                boolean any = has(localMine) || has(localSafe);
                if (!any) { subsetRules(); any = has(localMine) || has(localSafe); }
                if (!any) { hintRules(hints); any = has(localMine) || has(localSafe); }
                if (!any) {
                    int k = 0; for (boolean b : known) if (b) k++;
                    if (k >= M) for (int i = 0; i < R*C; i++) if (unk(i)) localSafe[i] = true;
                }
                boolean progress = false;
                for (int i = 0; i < R*C; i++) if (localMine[i] && unk(i)) { known[i] = true; progress = true; }
                for (int i = 0; i < R*C; i++) if (localSafe[i] && unk(i)) { if (mine[i]) return false; open(i); progress = true; }
                if (!progress) return false;
            }
            for (int i = 0; i < R*C; i++) if (mine[i]) known[i] = true;
            return !dead;
        }
        boolean has(boolean[] a){ for (boolean b : a) if (b) return true; return false; }

        ArrayList<Hint> weakHints() {
            ArrayList<Hint> out = new ArrayList<>();
            HashMap<String,Integer> used = new HashMap<>();
            for (int q = 0; q < R*C; q++) {
                if (!rev[q] || num(q) == 0) continue;
                int base = rest(q);
                Hint best = null; int bestScore = Integer.MIN_VALUE;
                for (String key : SHAPES.keySet()) {
                    ArrayList<Integer> cells = shapeCells(q, key);
                    HashSet<Integer> set = new HashSet<>(cells);
                    int un = 0;
                    for (int p : cells) if (unk(p)) un++;
                    if (un == 0) continue;
                    int outside = 0;
                    for (int p : nbs(q)) if (!set.contains(p) && unk(p)) outside++;
                    int lb = Math.max(0, base - outside);
                    int outer = 0;
                    for (int q2 : nbs(q)) {
                        if (!rev[q2] || num(q2) == 0) continue;
                        int inner = 0;
                        for (int p : nbs(q2)) if (set.contains(p) && unk(p)) inner++;
                        outer = Math.max(outer, rest(q2) - inner);
                    }
                    int ub = Math.max(lb, base - outer);
                    boolean exact = (lb == ub);
                    if (!exact && lb < 1) continue;
                    int score = (exact ? 100 : 0) + lb * 10 - un - used.getOrDefault(key, 0);
                    if (score > bestScore) {
                        bestScore = score;
                        best = new Hint();
                        best.i = q; best.key = key; best.lb = lb; best.n = un; best.exact = exact;
                    }
                }
                if (best != null) { used.put(best.key, used.getOrDefault(best.key, 0) + 1); out.add(best); }
            }
            return out;
        }

        ArrayList<Hint> candidates() {
            ArrayList<Hint> out = new ArrayList<>();
            for (int q = 0; q < R*C; q++) {
                if (!rev[q] || num(q) == 0) continue;
                int base = rest(q);
                for (String key : SHAPES.keySet()) {
                    ArrayList<Integer> cells = shapeCells(q, key);
                    HashSet<Integer> set = new HashSet<>(cells);
                    int un = 0;
                    for (int p : cells) if (unk(p)) un++;
                    if (un == 0) continue;
                    int outside = 0;
                    for (int p : nbs(q)) if (!set.contains(p) && unk(p)) outside++;
                    int lb = Math.max(0, base - outside);
                    Hint h = new Hint();
                    h.i = q; h.key = key; h.lb = lb; h.n = un;
                    if (lb >= un) out.add(h);
                    int outer = 0;
                    for (int q2 : nbs(q)) {
                        if (!rev[q2] || num(q2) == 0) continue;
                        int inner = 0;
                        for (int p : nbs(q2)) if (set.contains(p) && unk(p)) inner++;
                        outer = Math.max(outer, rest(q2) - inner);
                    }
                    if (base - outer <= 0) { Hint h2 = new Hint(); h2.i=q; h2.key=key; h2.lb=0; h2.n=un; out.add(h2); }
                }
            }
            out.sort((x,y) -> y.n - x.n);
            return out;
        }
    }

    // ---------- 生成 ----------
    static Board board; static ArrayList<Hint> hints = new ArrayList<>(); static ArrayList<Hint> weak = new ArrayList<>(); static boolean[] snapshot;
    static int R = 16, C = 30, M = 100;
    static String mode = "高级 16×30 · 100 雷";

    static boolean newGame(int rows, int cols, int mines, int seed) {
        for (int t = 0; t < 40; t++) {
            Board b = new Board(rows, cols, mines, seed + t * 7919);
            b.open(b.I(rows/2, cols/2));
            boolean[] snap = b.rev.clone();
            ArrayList<Hint> hs = new ArrayList<>();
            boolean ok = false;
            for (int k = 0; k < 80; k++) {
                if (b.solve(hs)) { ok = true; break; }
                ArrayList<Hint> cands = b.candidates();
                Hint pick = null;
                for (Hint c : cands) {
                    boolean used = false;
                    for (Hint h : hs) if (h.i == c.i && h.key.equals(c.key)) { used = true; break; }
                    if (!used) { pick = c; break; }
                }
                if (pick == null) break;
                hs.add(pick);
            }
            if (!ok) continue;
            board = b; hints = hs; snapshot = snap;
            R = rows; C = cols; M = mines;
            board.rev = snap.clone();
            Arrays.fill(board.known, false);
            for (int i = 0; i < R*C; i++) { board.flag[i] = false; board.num[i] = -1; }
            board.dead = false;
            weak = board.weakHints();
            return true;
        }
        return false;
    }

    final BoardPanel panel = new BoardPanel();
    final JLabel status = new JLabel(" ");
    final JLabel mineLabel = new JLabel(" ");
    final JLabel timeLabel = new JLabel("00:00");
    final JCheckBox hintBox = new JCheckBox("显示形状提示", true);
    int seconds = 0; boolean running = false; int densityLevel = 1;
    long startedAt = 0; int highlight = -1;
    final javax.swing.Timer clock;

    public Sweeper() {
        super("扫雷 · 形状提示版");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setLayout(new BorderLayout());

        JToolBar bar = new JToolBar();
        bar.setFloatable(false);
        JButton ng = new JButton("新局");
        ng.addActionListener(e -> { startAgain(); });
        String[] levels = {"初级 9×9 · 10 雷", "中级 16×16 · 40 雷", "高级 16×30 · 100 雷"};
        JComboBox<String> lv = new JComboBox<>(levels);
        lv.setSelectedIndex(2);
        lv.addActionListener(e -> {
            int idx = lv.getSelectedIndex();
            if (idx == 0) start(9, 9, 10);
            else if (idx == 1) start(16, 16, 40);
            else start(16, 30, 100);
        });
        bar.add(new JLabel(" 难度 "));
        bar.add(lv);
        bar.addSeparator();
        bar.add(ng);
        bar.addSeparator();
        bar.add(hintBox);
        hintBox.addActionListener(e -> panel.repaint());
        String[] dens = {"精简", "标准", "全部"};
        JComboBox<String> density = new JComboBox<>(dens);
        density.setSelectedIndex(1);
        density.addActionListener(e -> { densityLevel = density.getSelectedIndex(); panel.repaint(); });
        bar.add(new JLabel(" 提示 "));
        bar.add(density);
        JButton hb = new JButton("提示");
        hb.addActionListener(e -> showHint());
        bar.add(hb);
        bar.add(Box.createHorizontalGlue());
        bar.add(mineLabel);
        bar.addSeparator();
        bar.add(timeLabel);
        bar.add(new JLabel("  "));
        add(bar, BorderLayout.NORTH);
        add(panel, BorderLayout.CENTER);
        add(status, BorderLayout.SOUTH);

        clock = new javax.swing.Timer(100, e -> {
            if (running) {
                long ms = System.currentTimeMillis() - startedAt;
                timeLabel.setText(String.format("%.1fs", ms / 1000.0));
            }
        });
        clock.start();

        start(16, 30, 100);
        setSize(1180, 780);
        setLocationRelativeTo(null);
    }

    void start(int rows, int cols, int mines) {
        R = rows; C = cols; M = mines;
        seconds = 0; running = true; highlight = -1;
        startedAt = System.currentTimeMillis();
        timeLabel.setText("0.0s");
        if (!newGame(rows, cols, mines, new Random().nextInt(1 << 20))) status.setText(" 生成失败，请再按新局");
        else status.setText(" 左键翻开 · 右键插旗");
        panel.relayout();
        updateCounters();
        revalidate(); repaint();
    }
    void startAgain() { start(R, C, M); }

    String bestKey(){ return "best_" + R + "x" + C + "_" + M; }
    double bestSeconds(){
        try { return Preferences.userNodeForPackage(Sweeper.class).getDouble(bestKey(), 0); }
        catch (Exception e) { return 0; }
    }
    void saveBest(double v){
        try { Preferences.userNodeForPackage(Sweeper.class).putDouble(bestKey(), v); }
        catch (Exception e) { }
    }

    void describeCell(int i) {
        int v = board.num(i);
        if (v == 0) { status.setText(" 空格，周围没有雷"); return; }
        String exactTxt = null, weakTxt = null;
        for (Hint h : hints) if (h.i == i) exactTxt = DISP.get(h.key) + h.lb;
        for (Hint h : weak) if (h.i == i) weakTxt = DISP.get(h.key) + h.lb;
        String pos = "R" + (i / C + 1) + "C" + (i % C + 1);
        if (exactTxt != null)
            status.setText(" " + pos + " 数字 " + v + "：共有 " + exactTxt + " 颗雷在这个形状里");
        else if (weakTxt != null)
            status.setText(" " + pos + " 数字 " + v + "：至少 " + weakTxt + " 颗雷在这个形状里");
        else
            status.setText(" " + pos + " 数字 " + v + "：这格暂时没有形状提示");
    }

    void showHint() {
        if (board == null || board.dead) return;
        for (Hint h : hints) {
            if (!board.rev[h.i]) continue;
            boolean useful = false;
            for (int p : board.shapeCells(h.i, h.key))
                if (!board.rev[p] && !board.flag[p]) useful = true;
            if (!useful) continue;
            highlight = h.i;
            panel.repaint();
            javax.swing.Timer t = new javax.swing.Timer(2400, ev -> { highlight = -1; panel.repaint(); });
            t.setRepeats(false);
            t.start();
            status.setText(" 提示：R" + (h.i / C + 1) + "C" + (h.i % C + 1) + " 的 " + DISP.get(h.key) + h.lb
                    + "（该形状里至少 " + h.lb + " 颗雷）");
            return;
        }
        status.setText(" 当前没有可用的形状提示");
    }

    void updateCounters() {
        int flags = 0;
        for (int i = 0; i < R*C; i++) if (board.flag[i]) flags++;
        int ex = 0; for (Hint h : weak) if (h.exact) ex++;
        mineLabel.setText("剩余雷 " + (M - flags) + " · 精确 " + ex + " / 至少 " + (weak.size() - ex) + "  ");
        if (board.dead) { status.setText(" 踩到雷了 —— 按新局再来"); running = false; }
        else if (board.revCount() == R*C - M) {
            double sec = (System.currentTimeMillis() - startedAt) / 1000.0;
            double prev = bestSeconds();
            double best = (prev <= 0 || sec < prev) ? sec : prev;
            if (prev <= 0 || sec < prev) saveBest(sec);
            status.setText(String.format(" 清完了 —— %.1f 秒（最佳 %.1f 秒，%d 条提示）", sec, best, hints.size()));
            running = false;
        }
    }

    class BoardPanel extends JPanel {
        int cell = 34, pad = 12;
        BoardPanel() {
            setBackground(new Color(0xE9EEF3));
            addMouseListener(new MouseAdapter() {
                public void mousePressed(MouseEvent e) { hit(e); }
                public void mouseClicked(MouseEvent e) {
                    if (e.getClickCount() == 2 && SwingUtilities.isLeftMouseButton(e)) {
                        int c = (e.getX() - pad) / cell, r = (e.getY() - pad) / cell;
                        if (board != null && board.inside(r, c)) chord(board.I(r, c));
                    }
                }
            });
        }
        void relayout() {
            int cw = (1180 - 2*pad) / Math.max(C, 1);
            cell = Math.max(18, Math.min(34, cw));
            setPreferredSize(new Dimension(C*cell + 2*pad, R*cell + 2*pad));
            revalidate();
        }
        void chord(int i) {
            if (board == null || board.dead || !board.rev[i]) return;
            int v = board.num(i);
            if (v == 0) return;
            int flags = 0;
            for (int p : board.nbs(i)) if (board.flag[p]) flags++;
            if (flags != v) return;
            for (int p : board.nbs(i)) if (!board.rev[p] && !board.flag[p]) board.open(p);
            if (board.revCount() == R*C - M)
                for (int k = 0; k < R*C; k++) if (board.mine[k]) board.flag[k] = true;
            repaint(); updateCounters();
        }
        void hit(MouseEvent e) {
            if (board == null) return;
            int c = (e.getX() - pad) / cell, r = (e.getY() - pad) / cell;
            if (!board.inside(r, c)) return;
            int i = board.I(r, c);
            if (SwingUtilities.isRightMouseButton(e) || e.isPopupTrigger()) {
                if (!board.rev[i]) { board.flag[i] = !board.flag[i]; repaint(); updateCounters(); }
                return;
            }
            if (board.rev[i]) { describeCell(i); return; }
            if (board.flag[i] || board.dead) return;
            board.open(i);
            weak = board.weakHints();
            if (board.revCount() == R*C - M) for (int k = 0; k < R*C; k++) if (board.mine[k]) board.flag[k] = true;
            repaint(); updateCounters();
        }
        Font numFont = new Font("SansSerif", Font.BOLD, 17);
        Font smallFont = new Font("SansSerif", Font.PLAIN, 10);
        protected void paintComponent(Graphics g0) {
            super.paintComponent(g0);
            Graphics2D g = (Graphics2D) g0;
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) {
                int i = board.I(r, c);
                int x = pad + c*cell, y = pad + r*cell;
                if (!board.rev[i]) {
                    g.setColor(new Color(0xC9D6E2));
                    g.fillRoundRect(x+1, y+1, cell-2, cell-2, 5, 5);
                    g.setColor(new Color(0xEFF5FA));
                    g.drawRoundRect(x+2, y+2, cell-4, cell-4, 5, 5);
                    if (board.flag[i]) {
                        g.setColor(new Color(0xD64045));
                        int[] xs = {x+cell/2-6, x+cell/2+7, x+cell/2-6};
                        int[] ys = {y+7, y+cell/2-1, y+cell/2-9};
                        g.fillPolygon(xs, ys, 3);
                        g.setColor(new Color(0x6B7A88));
                        g.fillRect(x+cell/2-7, y+8, 2, cell-14);
                    }
                } else {
                    g.setColor(new Color(0xF7FAFC));
                    g.fillRect(x+1, y+1, cell-2, cell-2);
                    g.setColor(new Color(0xDCE6EF));
                    g.drawRect(x+1, y+1, cell-2, cell-2);
                    if (board.mine[i]) { drawMine(g, x, y); continue; }
                    int v = board.num(i);
                    if (v > 0) {
                        g.setFont(numFont);
                        g.setColor(numColor(v));
                        String s = String.valueOf(v);
                        FontMetrics fm = g.getFontMetrics();
                        int tw = fm.stringWidth(s);
                        g.drawString(s, x + cell/2 - tw/2, y + cell/2 + fm.getAscent()/2 - 2);
                    }
                }
            }
            if (hintBox.isSelected()) drawHints(g);
            if (highlight >= 0) {
                int hr = highlight / C, hc = highlight % C;
                g.setColor(new Color(0xFFB300));
                g.setStroke(new BasicStroke(2.6f));
                g.drawRect(pad + hc*cell + 1, pad + hr*cell + 1, cell - 2, cell - 2);
            }
            if (board.dead) {
                g.setColor(new Color(0x00000022));
                g.fillRect(0, 0, getWidth(), getHeight());
            }
        }
        void drawHints(Graphics2D g) {
            g.setFont(smallFont);
            FontMetrics fm = g.getFontMetrics();
            HashSet<Integer> drawn = new HashSet<>();
            for (Hint h : weak) {
                if (!board.rev[h.i] || drawn.contains(h.i)) continue;
                boolean any = false;
                for (int p : board.shapeCells(h.i, h.key)) if (!board.rev[p]) any = true;
                if (!any) continue;
                if (densityLevel == 0 && !h.exact) continue;
                if (densityLevel == 1 && !h.exact && h.lb < 2) continue;
                int r = h.i / C, c = h.i % C;
                int x = pad + c*cell, y = pad + r*cell;
                String txt = DISP.get(h.key) + h.lb;
                int tw = fm.stringWidth(txt);
                if (h.exact) {
                    g.setColor(new Color(0x2F, 0x6F, 0xA8));
                    g.drawString(txt, x + cell - tw - 3, y + cell - 4);
                } else {
                    g.setColor(new Color(0xB0, 0x6A, 0x00));
                    g.drawString(txt, x + cell - tw - 3, y + 11);
                }
                drawn.add(h.i);
            }
            for (Hint h : hints) {
                if (!board.rev[h.i] || drawn.contains(h.i)) continue;
                drawn.add(h.i);
                int r = h.i / C, c = h.i % C;
                int x = pad + c*cell, y = pad + r*cell;
                String txt = DISP.get(h.key) + h.lb;
                int tw = fm.stringWidth(txt);
                g.setColor(new Color(0x2F, 0x6F, 0xA8));
                g.drawString(txt, x + cell - tw - 3, y + cell - 4);
            }
        }

        void drawMine(Graphics2D g, int x, int y) {
            g.setColor(new Color(0x2B3A45));
            int cx = x + cell/2, cy = y + cell/2, rr = Math.max(4, cell/5);
            g.fillOval(cx-rr, cy-rr, 2*rr, 2*rr);
            g.setStroke(new BasicStroke(1.4f));
            g.drawLine(cx-rr-3, cy, cx+rr+3, cy);
            g.drawLine(cx, cy-rr-3, cx, cy+rr+3);
        }
        Color numColor(int v) {
            switch (v) {
                case 1: return new Color(0x2F6FA8);
                case 2: return new Color(0x2E7D46);
                case 3: return new Color(0xC0392B);
                case 4: return new Color(0x5B3F94);
                default: return new Color(0x8B5A2B);
            }
        }
    }

    public static void main(String[] args) throws Exception {
        final String shot = args.length >= 2 && args[0].equals("shot") ? args[1] : null;
        SwingUtilities.invokeLater(() -> {
            Sweeper f = new Sweeper();
            f.setVisible(true);
            if (shot != null) {
                javax.swing.Timer t = new javax.swing.Timer(900, ev -> {
                    try {
                        BufferedImage img = new BufferedImage(f.getWidth(), f.getHeight(), BufferedImage.TYPE_INT_RGB);
                        Graphics2D g = img.createGraphics();
                        f.getContentPane().paint(g);
                        g.dispose();
                        ImageIO.write(img, "png", new File(shot));
                        System.out.println("saved " + shot + " " + img.getWidth() + "x" + img.getHeight());
                    } catch (Exception ex) { ex.printStackTrace(); }
                    System.exit(0);
                });
                t.setRepeats(false);
                t.start();
            }
        });
    }
}
