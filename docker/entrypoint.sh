#!/usr/bin/env bash
# Runs the given command inside a virtual X display and a D-Bus session so
# desktop apps can start in a container without a screen.
#
# Xvfb is started here, and its socket is awaited, instead of using xvfb-run:
# xvfb-run waits for a signal from Xvfb, and when it runs as the container's
# first process (PID 1) that signal never arrives, so every command would hang.
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"
Xvfb "$DISPLAY" -screen 0 1280x960x24 -nolisten tcp > /dev/null 2>&1 &
xvfb_pid=$!
trap 'kill "$xvfb_pid" 2> /dev/null || true' EXIT

socket="/tmp/.X11-unix/X${DISPLAY#:}"
for _ in $(seq 1 100); do
  [[ -S "$socket" ]] && break
  sleep 0.1
done
if [[ ! -S "$socket" ]]; then
  echo "error: the virtual display $DISPLAY did not start" >&2
  exit 1
fi

dbus-run-session -- "$@"
