/* Minimal crt shim: lets configure's "can you link at all" probe succeed on
   Android, where the NDK only ships crt objects that need a real bionic libc.
   Symbols that genuinely do not exist still fail to link, which is what keeps
   feature detection honest. */
void __libc_init(void *a, void *b, void *c, void *d) { (void)a; (void)b; (void)c; (void)d; }
void __cxa_atexit(void) {}
void _start(void) { __libc_init(0, 0, 0, 0); for (;;) {} }
