CC ?= gcc
CFLAGS ?= -O2 -Wall -Wextra
PREFIX ?= /root/workspace/dgupb/devkit

all: bin/devkit-bridge

bin/devkit-bridge: src/bridge.c
	@mkdir -p bin
	$(CC) $(CFLAGS) -o $@ $<

clean:
	rm -f bin/devkit-bridge

install: all
	chmod +x bin/apkbuild bin/devkit-run

.PHONY: all clean install
