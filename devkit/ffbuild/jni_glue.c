/*
 * 把 ffmpeg 的 CLI 主函数暴露给 JVM。
 *
 * ffmpeg_main 内部出错时会调用 exit()，在 App 进程里那就是直接退到桌面。
 * 链接时用 --wrap=exit 把 exit 换成 __wrap_exit，改成 longjmp 回到调用点，
 * 于是每次执行都像一次普通函数调用，失败只返回错误码。
 */
#include <jni.h>
#include <setjmp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern int ffmpeg_main(int argc, char **argv);

static jmp_buf g_jmp;
static volatile int g_jmp_ready = 0;
static volatile int g_exit_code = 0;

void __wrap_exit(int code) {
    g_exit_code = code;
    if (g_jmp_ready) {
        longjmp(g_jmp, code ? code : 1);
    }
    for (;;) {
        /* 没设跳转点时不能真的退出进程，挂住也比自杀好 */
    }
}

JNIEXPORT jint JNICALL
Java_com_dsh_rec_FfNative_run(JNIEnv *env, jclass clazz, jobjectArray args) {
    int argc = (*env)->GetArrayLength(env, args);
    if (argc <= 0) return -1;

    char **argv = (char **)calloc((size_t)argc + 1, sizeof(char *));
    if (!argv) return -1;

    for (int i = 0; i < argc; i++) {
        jstring s = (jstring)(*env)->GetObjectArrayElement(env, args, i);
        if (!s) { argv[i] = strdup(""); continue; }
        const char *c = (*env)->GetStringUTFChars(env, s, NULL);
        argv[i] = strdup(c ? c : "");
        if (c) (*env)->ReleaseStringUTFChars(env, s, c);
        (*env)->DeleteLocalRef(env, s);
    }
    argv[argc] = NULL;

    int ret;
    g_exit_code = 0;
    int jv = setjmp(g_jmp);
    if (jv == 0) {
        g_jmp_ready = 1;
        ret = ffmpeg_main(argc, argv);
        g_jmp_ready = 0;
        if (g_exit_code) ret = g_exit_code;
    } else {
        g_jmp_ready = 0;
        ret = jv;
    }

    for (int i = 0; i < argc; i++) free(argv[i]);
    free(argv);
    return ret;
}

/*
 * bionic 把 stdout/stderr 放在内部的 __sF 数组里，手工链接的库里拿不到这个
 * 无版本的对外符号，dlopen 时就会报 cannot locate symbol "stdout"。
 * 这里给出本模块自己的定义，并由构造函数接上真实的 fd 1/2。
 */
FILE *stdout = NULL;
FILE *stderr = NULL;

__attribute__((constructor))
static void dsh_init_stdio(void) {
    if (stdout == NULL) stdout = fdopen(1, "w");
    if (stderr == NULL) stderr = fdopen(2, "w");
}
