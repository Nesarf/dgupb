#!/data/data/com.termux/files/usr/bin/bash
# Install or update every dgupb plugin into the dsh-go web profile.
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
for plugin in local-dsh-ime local-termux-tools local-trime-console local-snippets local-phone-status local-code-point local-mega local-shell local-asc local-ichiwatashi local-volcano local-lineweight local-sweeper; do
  if [ -d "$DIR/$plugin" ]; then
    echo "installing $plugin ..."
    dsh plugin --profile web add "$DIR/$plugin"
  fi
done
echo "done. Restart the engine in the dsh-go app for lib changes to take effect."
