#!/usr/bin/env bash
# Runs the given command inside a virtual X display and a D-Bus session so
# desktop apps can start in a container without a screen.
set -euo pipefail
exec xvfb-run -a --server-args="-screen 0 1280x960x24" dbus-run-session -- "$@"
