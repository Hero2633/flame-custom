#!/bin/sh
set -eu

# Drop privileges only for the untrusted browser, not Flame's existing runtime
# (which may need access to an explicitly mounted Docker socket).
if [ "$(id -u)" = "0" ]; then
  profile=''
  for argument in "$@"; do
    case "$argument" in
      --user-data-dir=/tmp/puppeteer_dev_chrome_profile-*)
        profile="${argument#--user-data-dir=}"
        ;;
    esac
  done
  if [ -z "$profile" ] || [ ! -d "$profile" ] || [ -L "$profile" ]; then
    echo "Flame Chromium requires a disposable Puppeteer profile" >&2
    exit 1
  fi
  # Puppeteer creates an empty, mode-0700 directory before launching Chrome.
  chown node:node "$profile"
  export HOME=/home/node
  exec su-exec node chromium-browser "$@"
fi

exec chromium-browser "$@"
