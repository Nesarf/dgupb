/* dgupb devkit bridge
 * A localhost-only HTTP bridge that exposes a small whitelist of developer
 * tools to anything running on the phone: dsh-go panels, MT Manager, a
 * browser, curl, another app. Core is C; the tools it calls are Java/sh.
 */
#define _GNU_SOURCE
#include <arpa/inet.h>
#include <errno.h>
#include <netinet/in.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define PORT_DEFAULT 8737
#define MAX_REQ 8192
#define MAX_OUT 65536
#define VERSION "0.1.0"

static const char *ALLOW[] = {
    "apkbuild", "ffprobe", "ffmpeg", "sha256sum", "uname", "df", "uptime",
    "id", "pwd", "ls", NULL
};

static time_t g_started;
static int g_port = PORT_DEFAULT;

static int tool_allowed(const char *n) {
    for (int i = 0; ALLOW[i]; i++)
        if (strcmp(ALLOW[i], n) == 0) return 1;
    return 0;
}

/* Reject anything that could chain a second command. */
static int arg_safe(const char *s) {
    for (const char *p = s; *p; p++)
        if (strchr(";|&$`><\n\r\"'\\*()[]{}!", *p)) return 0;
    return 1;
}

static void json_escape(const char *in, char *out, size_t cap) {
    size_t o = 0;
    for (const unsigned char *p = (const unsigned char *)in; *p && o + 8 < cap; p++) {
        switch (*p) {
            case '"':  out[o++] = '\\'; out[o++] = '"';  break;
            case '\\': out[o++] = '\\'; out[o++] = '\\'; break;
            case '\n': out[o++] = '\\'; out[o++] = 'n';  break;
            case '\r': out[o++] = '\\'; out[o++] = 'r';  break;
            case '\t': out[o++] = '\\'; out[o++] = 't';  break;
            default:
                if (*p < 0x20) { o += (size_t)snprintf(out + o, cap - o, "\\u%04x", *p); }
                else out[o++] = (char)*p;
        }
    }
    out[o] = 0;
}

static int hexval(int c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static void url_decode(const char *in, char *out, size_t cap) {
    size_t o = 0;
    for (size_t i = 0; in[i] && o + 1 < cap; i++) {
        if (in[i] == '%' && hexval(in[i+1]) >= 0 && hexval(in[i+2]) >= 0) {
            out[o++] = (char)(hexval(in[i+1]) * 16 + hexval(in[i+2]));
            i += 2;
        } else if (in[i] == '+') {
            out[o++] = ' ';
        } else {
            out[o++] = in[i];
        }
    }
    out[o] = 0;
}

/* Pull one query parameter out of the raw query string. */
static int query_get(const char *q, const char *key, char *out, size_t cap) {
    size_t klen = strlen(key);
    const char *p = q;
    while (p && *p) {
        if (strncmp(p, key, klen) == 0 && p[klen] == '=') {
            const char *v = p + klen + 1;
            const char *e = strchr(v, '&');
            size_t n = e ? (size_t)(e - v) : strlen(v);
            char tmp[2048];
            if (n >= sizeof tmp) n = sizeof tmp - 1;
            memcpy(tmp, v, n); tmp[n] = 0;
            url_decode(tmp, out, cap);
            return 1;
        }
        p = strchr(p, '&');
        if (p) p++;
    }
    return 0;
}

static void send_all(int fd, const char *s, size_t n) {
    size_t off = 0;
    while (off < n) {
        ssize_t w = write(fd, s + off, n - off);
        if (w <= 0) return;
        off += (size_t)w;
    }
}

static void respond(int fd, int code, const char *ctype, const char *body) {
    char head[512];
    const char *reason = code == 200 ? "OK" : code == 404 ? "Not Found" : "Internal Error";
    int n = snprintf(head, sizeof head,
        "HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %zu\r\n"
        "Access-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
        code, reason, ctype, strlen(body));
    send_all(fd, head, (size_t)n);
    send_all(fd, body, strlen(body));
}

static int which(const char *name) {
    const char *path = getenv("PATH");
    if (!path) return 0;
    char buf[4096];
    snprintf(buf, sizeof buf, "%s", path);
    char *save = NULL;
    for (char *d = strtok_r(buf, ":", &save); d; d = strtok_r(NULL, ":", &save)) {
        char full[1024];
        snprintf(full, sizeof full, "%s/%s", d, name);
        if (access(full, X_OK) == 0) return 1;
    }
    return 0;
}

static void handle_status(int fd) {
    char body[MAX_OUT];
    size_t o = 0;
    char esc[256];
    o += (size_t)snprintf(body + o, sizeof body - o,
        "{\"ok\":true,\"version\":\"%s\",\"port\":%d,\"uptime\":%ld,\"pid\":%d,\"tools\":{",
        VERSION, g_port, (long)(time(NULL) - g_started), (int)getpid());
    int first = 1;
    for (int i = 0; ALLOW[i]; i++) {
        const char *n = ALLOW[i];
        const char *base = strrchr(n, '/');
        if (base) n = base + 1;
        int have = which(n);
        json_escape(n, esc, sizeof esc);
        o += (size_t)snprintf(body + o, sizeof body - o,
            "%s\"%s\":%s", first ? "" : ",", esc, have ? "true" : "false");
        first = 0;
    }
    o += (size_t)snprintf(body + o, sizeof body - o, "}}");
    respond(fd, 200, "application/json", body);
}

static void handle_run(int fd, const char *query) {
    char cmd[256] = {0}, arg[2048] = {0};
    if (!query_get(query, "cmd", cmd, sizeof cmd)) {
        respond(fd, 400, "application/json", "{\"ok\":false,\"error\":\"missing cmd\"}");
        return;
    }
    query_get(query, "arg", arg, sizeof arg);

    if (!tool_allowed(cmd)) {
        respond(fd, 400, "application/json", "{\"ok\":false,\"error\":\"command not allowed\"}");
        return;
    }
    if (arg[0] && !arg_safe(arg)) {
        respond(fd, 400, "application/json", "{\"ok\":false,\"error\":\"argument rejected\"}");
        return;
    }

    char line[4096];
    if (arg[0]) snprintf(line, sizeof line, "%s %s 2>&1", cmd, arg);
    else snprintf(line, sizeof line, "%s 2>&1", cmd);

    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);

    char *out = malloc(MAX_OUT);
    if (!out) { respond(fd, 500, "application/json", "{\"ok\":false,\"error\":\"oom\"}"); return; }
    out[0] = 0;
    size_t used = 0;

    FILE *f = popen(line, "r");
    int rc = -1;
    if (f) {
        size_t n;
        while (used + 4096 < MAX_OUT && (n = fread(out + used, 1, 4096, f)) > 0) used += n;
        out[used] = 0;
        int st = pclose(f);
        rc = WIFEXITED(st) ? WEXITSTATUS(st) : -1;
    } else {
        snprintf(out, MAX_OUT, "popen failed: %s", strerror(errno));
    }

    clock_gettime(CLOCK_MONOTONIC, &t1);
    long ms = (t1.tv_sec - t0.tv_sec) * 1000 + (t1.tv_nsec - t0.tv_nsec) / 1000000;

    char *esc = malloc(MAX_OUT * 2);
    if (!esc) { free(out); respond(fd, 500, "application/json", "{\"ok\":false,\"error\":\"oom\"}"); return; }
    json_escape(out, esc, MAX_OUT * 2);

    char *body = malloc(MAX_OUT * 2 + 512);
    if (!body) { free(out); free(esc); respond(fd, 500, "application/json", "{\"ok\":false,\"error\":\"oom\"}"); return; }
    snprintf(body, MAX_OUT * 2 + 512,
        "{\"ok\":%s,\"cmd\":\"%s\",\"exit\":%d,\"ms\":%ld,\"out\":\"%s\"}",
        rc == 0 ? "true" : "false", cmd, rc, ms, esc);
    respond(fd, 200, "application/json", body);

    free(body); free(esc); free(out);
}

static const char *INDEX_HTML =
"<!doctype html><meta charset=utf-8><title>dgupb devkit bridge</title>"
"<style>body{font:15px/1.6 system-ui;margin:2rem;max-width:44rem;background:#111;color:#ddd}"
"code{background:#222;padding:.15rem .4rem;border-radius:4px}a{color:#7bd}"
"h1{font-size:1.3rem}li{margin:.3rem 0}</style>"
"<h1>dgupb devkit bridge</h1>"
"<p>本地工具桥。只监听 127.0.0.1，只放行白名单命令。</p>"
"<ul><li><code>GET /status</code> 桥与工具状态</li>"
"<li><code>GET /run?cmd=uname&amp;arg=-a</code> 执行白名单命令</li></ul>"
"<p>示例：<code>curl 'http://127.0.0.1:8737/run?cmd=df&amp;arg=-h'</code></p>";

static void handle_client(int fd) {
    char req[MAX_REQ];
    ssize_t n = read(fd, req, sizeof req - 1);
    if (n <= 0) { close(fd); return; }
    req[n] = 0;

    char *sp1 = strchr(req, ' ');
    if (!sp1) { respond(fd, 400, "text/plain", "bad request"); close(fd); return; }
    char *sp2 = strchr(sp1 + 1, ' ');
    if (!sp2) { respond(fd, 400, "text/plain", "bad request"); close(fd); return; }
    *sp2 = 0;
    char *target = sp1 + 1;

    char path[1024], query[4096] = {0};
    char *q = strchr(target, '?');
    if (q) { *q = 0; snprintf(query, sizeof query, "%s", q + 1); }
    snprintf(path, sizeof path, "%s", target);

    if (strcmp(path, "/") == 0) respond(fd, 200, "text/html; charset=utf-8", INDEX_HTML);
    else if (strcmp(path, "/status") == 0) handle_status(fd);
    else if (strcmp(path, "/run") == 0) handle_run(fd, query);
    else respond(fd, 404, "application/json", "{\"ok\":false,\"error\":\"not found\"}");

    close(fd);
}

int main(int argc, char **argv) {
    if (argc > 1) g_port = atoi(argv[1]);
    setvbuf(stdout, NULL, _IOLBF, 0);
    signal(SIGPIPE, SIG_IGN);
    /* SIGCHLD must stay default: pclose() needs the exit status. */

    /* Make the devkit tools reachable no matter who started us. */
    const char *old = getenv("PATH");
    char path[4096];
    snprintf(path, sizeof path, "/root/workspace/dgupb/devkit/bin:%s", old ? old : "/usr/local/bin:/usr/bin:/bin");
    setenv("PATH", path, 1);

    g_started = time(NULL);

    int srv = socket(AF_INET, SOCK_STREAM, 0);
    if (srv < 0) { perror("socket"); return 1; }
    int one = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);

    struct sockaddr_in a;
    memset(&a, 0, sizeof a);
    a.sin_family = AF_INET;
    a.sin_port = htons((uint16_t)g_port);
    a.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    if (bind(srv, (struct sockaddr *)&a, sizeof a) < 0) { perror("bind"); return 1; }
    if (listen(srv, 16) < 0) { perror("listen"); return 1; }

    fprintf(stderr, "devkit bridge %s on http://127.0.0.1:%d (pid %d)\n", VERSION, g_port, (int)getpid());

    for (;;) {
        int c = accept(srv, NULL, NULL);
        if (c < 0) { if (errno == EINTR) continue; perror("accept"); break; }
        handle_client(c);
    }
    close(srv);
    return 0;
}
