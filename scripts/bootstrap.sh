#!/usr/bin/env bash
# Shell profile lines below are written literally (with $HOME unexpanded) on purpose.
# shellcheck disable=SC2016
# -----------------------------------------------------------------------------
# bootstrap.sh - install the tools Desktop Starter App Builder needs (Windows in Git Bash, macOS, Linux)
#
# Purpose
#   Detects the operating system, Linux distribution and processor architecture,
#   checks which prerequisites are already installed at an acceptable version,
#   prints a plan table, asks for confirmation, and then installs only what is
#   missing. It uses each tool's official installer (Bun, rustup, Node.js
#   binaries from nodejs.org) or the system package manager (Homebrew on macOS,
#   apt / dnf / pacman on Linux, winget on Windows). It finishes by running the
#   read-only `doctor` check when Bun (or Node.js for npm apps) is available.
#
#   On Windows, run it in Git Bash (installed with Git for Windows). It uses
#   winget, the Windows package manager, for every install; installers that
#   need administrator rights show the normal Windows permission prompt.
#   scripts/bootstrap.ps1 does the same for people who prefer PowerShell.
#
# Usage
#   bash scripts/bootstrap.sh [--base electron|tauri|extension|all] [--mobile] [--e2e]
#                             [--yes] [--dry-run] [--help]
#
#   --base      Which app base to prepare for (default: all).
#   --mobile    Also prepare Tauri Android tooling, and iOS tooling on macOS.
#   --e2e       Also install end-to-end test drivers (tauri-driver and, on
#               Debian/Ubuntu, webkit2gtk-driver and xvfb).
#   --yes       Do not ask questions; treat every prompt as answered "yes"
#               (installing Homebrew still asks, because its installer does).
#   --dry-run   Print the plan and the exact commands, change nothing.
#
# Safety rules this script follows
#   * It says so before any command that uses sudo, and lists those commands.
#   * It never edits a shell profile silently: it prints the exact lines and
#     appends them only after you agree (or with --yes). Lines already present
#     are not added again.
#   * Running it twice is safe: tools that are already present are skipped.
# -----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

# Minimum versions, taken from docs/SETUP_RESOURCES.md.
MIN_BUN="1.3.0"
MIN_NODE="22.17.0"
MIN_RUST="1.90.0"
NODE_DIST_URL="https://nodejs.org/dist/latest-v24.x"

BASE="all"
MOBILE=0
PACKAGE_MANAGER="bun"
# Inside a generated app, default to the app's own base and targets from project-plan.json.
if [[ -f "$ROOT/project-plan.json" ]]; then
  if grep -q '"base": "tauri"' "$ROOT/project-plan.json"; then BASE="tauri"; fi
  if grep -q '"base": "electron"' "$ROOT/project-plan.json"; then BASE="electron"; fi
  if grep -q '"base": "extension"' "$ROOT/project-plan.json"; then BASE="extension"; fi
  # Only the "targets" array decides mobile ("uiTheme": "ios" is a look, not a target).
  if tr -d ' \n\r\t' < "$ROOT/project-plan.json" | grep -Eq '"targets":\[[^]]*"(android|ios)"'; then MOBILE=1; fi
  if grep -q '"packageManager": "npm"' "$ROOT/project-plan.json"; then PACKAGE_MANAGER="npm"; fi
fi
E2E=0
ASSUME_YES=0
DRY_RUN=0

usage() {
  sed -n '/^# ----/,/^# ----/{/^# ----/d;s/^# \{0,1\}//;p;}' "${BASH_SOURCE[0]}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      [[ $# -ge 2 ]] || { echo "error: --base needs a value (electron, tauri, extension or all)" >&2; exit 2; }
      BASE="$2"
      shift 2
      ;;
    --base=*) BASE="${1#--base=}"; shift ;;
    --mobile) MOBILE=1; shift ;;
    --e2e) E2E=1; shift ;;
    --yes | -y) ASSUME_YES=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help | -h) usage; exit 0 ;;
    *) echo "error: unknown argument '$1' (see --help)" >&2; exit 2 ;;
  esac
done

case "$BASE" in
  electron | tauri | extension | all) ;;
  *) echo "error: --base must be electron, tauri, extension or all" >&2; exit 2 ;;
esac

want_electron() { [[ "$BASE" == "electron" || "$BASE" == "all" ]]; }
want_tauri() { [[ "$BASE" == "tauri" || "$BASE" == "all" ]]; }
want_extension() { [[ "$BASE" == "extension" || "$BASE" == "all" ]]; }

# --- Output helpers ----------------------------------------------------------

say() { printf '%s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

# Ask a yes/no question. Returns 0 for yes. --yes answers yes automatically.
confirm() {
  local question="$1" reply
  if [[ $ASSUME_YES -eq 1 ]]; then
    say "$question [y/N] y (--yes)"
    return 0
  fi
  if [[ ! -t 0 ]]; then
    say "$question [y/N] n (no terminal to ask; re-run with --yes to accept)"
    return 1
  fi
  read -r -p "$question [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" || "$reply" == "yes" ]]
}

# --- Platform detection ------------------------------------------------------

UNAME_S="$(uname -s)"
case "$UNAME_S" in
  MINGW* | MSYS* | CYGWIN*) OS="windows" ;;
  Darwin) OS="macos" ;;
  Linux) OS="linux" ;;
  *) die "unsupported operating system: $UNAME_S" ;;
esac

case "$(uname -m)" in
  x86_64 | amd64) ARCH="x64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
  *) ARCH="$(uname -m)" ;;
esac

DISTRO="none"
PKG="none"
if [[ "$OS" == "linux" && -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  OS_ID="$(. /etc/os-release && printf '%s' "${ID:-}")"
  # shellcheck disable=SC1091
  OS_LIKE="$(. /etc/os-release && printf '%s' "${ID_LIKE:-}")"
  case " $OS_ID $OS_LIKE " in
    *" debian "* | *" ubuntu "*) DISTRO="debian"; PKG="apt" ;;
    *" fedora "*) DISTRO="fedora"; PKG="dnf" ;;
    *" arch "*) DISTRO="arch"; PKG="pacman" ;;
    *) DISTRO="$OS_ID" ;;
  esac
fi

SUDO=""
if [[ "$OS" == "linux" && "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

# --- Version helpers ---------------------------------------------------------

# Prints the first dotted version number found in the input, e.g. "1.97.0".
extract_version() { grep -Eo '[0-9]+(\.[0-9]+)+' | head -n 1 || true; }

# version_ge A B: true when version A >= version B (numeric, up to 3 parts).
version_ge() {
  local IFS=.
  # shellcheck disable=SC2206
  local a=($1) b=($2) i x y
  for i in 0 1 2; do
    x="${a[$i]:-0}"; y="${b[$i]:-0}"
    x="${x%%[!0-9]*}"; y="${y%%[!0-9]*}"
    x="${x:-0}"; y="${y:-0}"
    if ((10#$x > 10#$y)); then return 0; fi
    if ((10#$x < 10#$y)); then return 1; fi
  done
  return 0
}

have() { command -v "$1" >/dev/null 2>&1; }

# Version of a command, or empty when the command is missing.
tool_version() {
  local cmd="$1"; shift
  if have "$cmd"; then
    # A tool that is present but broken (for example a rustup proxy before any
    # toolchain is installed) prints no version; that must not stop the script.
    "$cmd" "$@" 2>/dev/null | extract_version || true
  fi
}

# Make tools installed in user folders visible to this session.
[[ -d "$HOME/.bun/bin" ]] && PATH="$HOME/.bun/bin:$PATH"
[[ -d "$HOME/.cargo/bin" ]] && PATH="$HOME/.cargo/bin:$PATH"
[[ -d "$HOME/.local/node/bin" ]] && PATH="$HOME/.local/node/bin:$PATH"
# Windows: folders winget installers put tools in, so they work in this same Git Bash session.
win_path() { [[ -n "${1:-}" ]] || return 0; cygpath -u "$1" 2>/dev/null || true; }
# At startup the folders are appended, so a tool the user's shell already
# resolves (for example Node.js from nvm-windows) is never shadowed by an older
# system install. After an install step they are prepended so the new tool wins.
win_refresh_path() {
  local d
  for d in "$HOME/.cargo/bin" "$HOME/.bun/bin" "/c/Program Files/nodejs" \
    "$(win_path "${LOCALAPPDATA:-}")/Microsoft/WinGet/Links" \
    "$(win_path "${LOCALAPPDATA:-}")/Microsoft/WindowsApps"; do
    [[ -d "$d" ]] && case ":$PATH:" in
      *":$d:"*) ;;
      *) if [[ "${1:-}" == "prepend" ]]; then PATH="$d:$PATH"; else PATH="$PATH:$d"; fi ;;
    esac
  done
  export PATH
}
[[ "$OS" == "windows" ]] && win_refresh_path
for brew_bin in /opt/homebrew/bin/brew /usr/local/bin/brew /home/linuxbrew/.linuxbrew/bin/brew; do
  if [[ "$OS" == "macos" && -x "$brew_bin" ]] && ! have brew; then
    PATH="$(dirname "$brew_bin"):$PATH"
  fi
done
export PATH

# --- Plan state --------------------------------------------------------------
# Bash 3.2 (the macOS default) has no associative arrays, so the plan is kept
# in parallel indexed arrays. "${arr[@]+"${arr[@]}"}" keeps `set -u` happy on
# empty arrays in Bash 3.2.

ROW_TOOL=()
ROW_FOUND=()
ROW_ACTION=()
STEP_DESC=()
STEP_CMD=()
STEP_SHOW=()
MANUAL=()
PROFILE_LINES=()
SYS_PKGS=()
NEED_BREW=0

row() { ROW_TOOL+=("$1"); ROW_FOUND+=("${2:--}"); ROW_ACTION+=("$3"); }
queue() {
  local desc="$1"; shift
  STEP_DESC+=("$desc")
  STEP_CMD+=("$(printf '%q ' "$@")")
  STEP_SHOW+=("$(printf '%q ' "$@")")
}
# Queues a Homebrew command; brew_run decides at run time whether brew exists.
queue_brew() {
  local desc="$1"; shift
  queue_shown "$desc" "brew $*" brew_run "$@"
}
# Like queue, but shows a readable command line instead of the helper name.
queue_shown() {
  local desc="$1" shown="$2"; shift 2
  STEP_DESC+=("$desc")
  STEP_CMD+=("$(printf '%q ' "$@")")
  STEP_SHOW+=("$shown")
}
manual() { MANUAL+=("$1"); }

# Windows: queues `winget install` for a package id (optional installer override arguments).
queue_winget() {
  local desc="$1" id="$2" override="${3:-}"
  local shown="winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements"
  [[ -n "$override" ]] && shown="$shown --override \"$override\""
  queue_shown "$desc" "$shown" winget_install "$id" "$override"
}

# Windows: user environment variables set with setx after confirmation (new terminals see them).
ENV_NAMES=()
ENV_VALUES=()
env_var() { ENV_NAMES+=("$1"); ENV_VALUES+=("$2"); }
profile_line() {
  local line="$1" existing
  for existing in ${PROFILE_LINES[@]+"${PROFILE_LINES[@]}"}; do
    [[ "$existing" == "$line" ]] && return 0
  done
  PROFILE_LINES+=("$line")
}
sys_pkg() {
  local p
  for p in "$@"; do SYS_PKGS+=("$p"); done
}

# True when a system package is installed (Linux).
pkg_installed() {
  case "$PKG" in
    apt) dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "install ok installed" ;;
    dnf) rpm -q "$1" >/dev/null 2>&1 ;;
    pacman) pacman -Q "$1" >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

# Adds each package that is not installed yet; prints how many were missing.
want_pkgs() {
  local label="$1"; shift
  local missing=() p
  for p in "$@"; do
    pkg_installed "$p" || missing+=("$p")
  done
  if [[ ${#missing[@]} -eq 0 ]]; then
    row "$label" "installed" "ok"
  else
    row "$label" "missing: ${missing[*]}" "install with $PKG (sudo)"
    sys_pkg "${missing[@]}"
  fi
}

# --- Checks ------------------------------------------------------------------

CLT_QUEUED=0
# Queues the Xcode Command Line Tools installer once (macOS). It provides Git,
# the C compiler and the linker that Rust needs.
ensure_clt() {
  [[ $CLT_QUEUED -eq 0 ]] || return 0
  CLT_QUEUED=1
  row "Xcode Command Line Tools" "-" "install (xcode-select --install)"
  queue "Install Xcode Command Line Tools (finish the dialog that opens)" xcode-select --install
  manual "After the Xcode Command Line Tools dialog finishes, run this script again."
}

check_linux_basics() {
  [[ "$OS" == "linux" ]] || return 0
  case "$PKG" in
    apt | dnf | pacman) want_pkgs "curl, unzip (needed by installers)" curl unzip ;;
    *)
      if ! have curl || ! have unzip; then
        row "curl, unzip" "missing" "manual"
        manual "Install curl and unzip with your distribution's package manager."
      fi
      ;;
  esac
}

check_git() {
  local v
  v="$(tool_version git --version)"
  if [[ -n "$v" ]]; then
    row "Git" "$v" "ok"
    return
  fi
  case "$OS" in
    windows)
      row "Git (includes Git Bash)" "-" "install with winget"
      queue_winget "Install Git" Git.Git
      ;;
    macos)
      if xcode-select -p >/dev/null 2>&1; then
        NEED_BREW=1
        row "Git" "-" "install with Homebrew"
        queue_brew "Install Git with Homebrew" install git
      else
        row "Git" "-" "comes with Xcode Command Line Tools"
        ensure_clt
      fi
      ;;
    linux)
      case "$PKG" in
        apt | dnf | pacman) row "Git" "-" "install with $PKG (sudo)"; sys_pkg git ;;
        *) row "Git" "-" "manual"; manual "Install Git with your distribution's package manager." ;;
      esac
      ;;
  esac
}

check_bun() {
  local v
  v="$(tool_version bun --version)"
  if [[ -z "$v" && "$OS" == "windows" ]]; then
    row "Bun >= $MIN_BUN" "-" "install with winget"
    queue_winget "Install Bun" Oven-sh.Bun
  elif [[ -z "$v" ]]; then
    row "Bun >= $MIN_BUN" "-" "install (official script)"
    queue_shown "Install Bun with the official script (profile edits disabled)" \
      "curl -fsSL https://bun.com/install | SHELL=/bin/sh bash" install_bun
    profile_line 'export BUN_INSTALL="$HOME/.bun"'
    profile_line 'export PATH="$BUN_INSTALL/bin:$PATH"'
  elif version_ge "$v" "$MIN_BUN"; then
    row "Bun >= $MIN_BUN" "$v" "ok"
  else
    row "Bun >= $MIN_BUN" "$v" "upgrade (bun upgrade)"
    queue "Upgrade Bun" bun upgrade
  fi
}

check_node() {
  local v
  v="$(tool_version node --version)"
  if [[ -n "$v" ]] && version_ge "$v" "$MIN_NODE"; then
    row "Node.js >= $MIN_NODE" "$v" "ok"
    return
  fi
  case "$OS" in
    windows)
      if [[ -n "${NVM_HOME:-}" ]] || have nvm; then
        # A version manager owns Node.js here; a second system install would fight it.
        row "Node.js >= $MIN_NODE" "${v:--}" "manual (nvm-windows)"
        manual "Node.js is managed by nvm-windows. Run: nvm install $MIN_NODE   then: nvm use $MIN_NODE   (or install a newer 22.x or 24.x LTS), then open a new Git Bash window."
      else
        row "Node.js >= $MIN_NODE" "${v:--}" "install Node.js LTS with winget"
        queue_winget "Install Node.js LTS" OpenJS.NodeJS.LTS
      fi
      ;;
    macos)
      NEED_BREW=1
      row "Node.js >= $MIN_NODE" "${v:--}" "install with Homebrew (brew install node)"
      queue_brew "Install Node.js with Homebrew" install node
      ;;
    linux)
      if [[ "$ARCH" != "x64" && "$ARCH" != "arm64" ]]; then
        row "Node.js >= $MIN_NODE" "${v:--}" "manual"
        manual "Install Node.js $MIN_NODE or newer for $ARCH from https://nodejs.org/en/download"
        return
      fi
      row "Node.js >= $MIN_NODE" "${v:--}" "install Node.js 24 LTS to ~/.local/node (nodejs.org)"
      queue_shown "Install Node.js 24 LTS from nodejs.org into ~/.local/node" \
        "download node-v24.x-linux-$ARCH.tar.gz from $NODE_DIST_URL, check SHA-256, extract to ~/.local, link ~/.local/node" \
        install_node_tarball
      profile_line 'export PATH="$HOME/.local/node/bin:$PATH"'
      ;;
  esac
}

check_electron_linux_makers() {
  [[ "$OS" == "linux" ]] || return 0
  case "$PKG" in
    apt) want_pkgs "Electron Linux makers (dpkg, fakeroot, rpm)" dpkg fakeroot rpm ;;
    dnf) want_pkgs "Electron Linux makers (dpkg, fakeroot, rpm-build)" dpkg fakeroot rpm-build ;;
    pacman) want_pkgs "Electron Linux makers (dpkg, fakeroot, rpm-tools)" dpkg fakeroot rpm-tools ;;
    *)
      row "Electron Linux makers" "-" "manual"
      manual "Install dpkg, fakeroot and rpm-build (or rpm) to build .deb and .rpm installers."
      ;;
  esac
}

check_rust() {
  local v
  v="$(tool_version rustc --version)"
  if [[ "$OS" == "windows" ]]; then
    # Tauri on Windows needs the MSVC toolchain (it links with the Visual Studio C++ tools).
    if [[ -z "$v" ]]; then
      row "Rust >= $MIN_RUST (rustup, MSVC)" "-" "install with winget"
      queue_winget "Install rustup" Rustlang.Rustup
      queue_shown "Make the MSVC stable toolchain the default" "rustup default stable-msvc" rustup_run default stable-msvc
    elif version_ge "$v" "$MIN_RUST" && rustc -vV 2>/dev/null | grep -q '^host:.*msvc'; then
      row "Rust >= $MIN_RUST (rustup, MSVC)" "$v" "ok"
    elif have rustup; then
      row "Rust >= $MIN_RUST (rustup, MSVC)" "$v" "rustup update stable + default stable-msvc"
      queue_shown "Update the stable toolchain" "rustup update stable" rustup_run update stable
      queue_shown "Make the MSVC stable toolchain the default" "rustup default stable-msvc" rustup_run default stable-msvc
    else
      row "Rust >= $MIN_RUST (rustup, MSVC)" "$v" "manual"
      manual "Rust was not installed with rustup. Uninstall it, then run this script again to install rustup."
    fi
    return
  fi
  if [[ -z "$v" ]]; then
    row "Rust >= $MIN_RUST (rustup)" "-" "install (official rustup script)"
    queue_shown "Install Rust with rustup (profile edits disabled)" \
      "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path" install_rustup
    profile_line '. "$HOME/.cargo/env"'
  elif version_ge "$v" "$MIN_RUST"; then
    row "Rust >= $MIN_RUST (rustup)" "$v" "ok"
  elif have rustup; then
    row "Rust >= $MIN_RUST (rustup)" "$v" "upgrade (rustup update stable)"
    queue "Update the stable Rust toolchain" rustup update stable
  else
    row "Rust >= $MIN_RUST (rustup)" "$v" "manual"
    manual "Rust $v was not installed with rustup. Remove it and install rustup from https://rustup.rs"
  fi
}

# Windows: Visual Studio C++ Build Tools, found with Microsoft's vswhere tool.
check_windows_build_tools() {
  local pf86 vswhere with_vc="" any_vs=""
  pf86="$(win_path "$(printenv 'ProgramFiles(x86)' 2>/dev/null || true)")"
  vswhere="${pf86:-/c/Program Files (x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
  if [[ -x "$vswhere" ]]; then
    with_vc="$("$vswhere" -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 \
      -property displayName 2>/dev/null | head -n 1 | tr -d '\r')"
    any_vs="$("$vswhere" -products '*' -property displayName 2>/dev/null | head -n 1 | tr -d '\r')"
  fi
  if [[ -n "$with_vc" ]]; then
    row "C++ Build Tools (Desktop development with C++)" "$with_vc" "ok"
  elif [[ -n "$any_vs" ]]; then
    row "C++ Build Tools (Desktop development with C++)" "$any_vs without C++" "manual"
    manual "Open the Visual Studio Installer, choose Modify on '$any_vs', tick 'Desktop development with C++' and install."
  else
    row "C++ Build Tools (Desktop development with C++)" "-" "install with winget (admin prompt)"
    queue_winget "Install Visual Studio Build Tools with the C++ workload" Microsoft.VisualStudio.BuildTools \
      "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  fi
}

# Windows: the WebView2 runtime registers its version (pv) under one of these keys.
check_webview2() {
  local key found=""
  for key in 'HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' \
    'HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' \
    'HKCU\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'; do
    # MSYS_NO_PATHCONV stops Git Bash from turning /v into a file path.
    found="$(MSYS_NO_PATHCONV=1 reg query "$key" /v pv 2>/dev/null | grep -Eo '[0-9]+(\.[0-9]+)+' | head -n 1 || true)"
    [[ -n "$found" && "$found" != "0.0.0.0" ]] && break
    found=""
  done
  if [[ -n "$found" ]]; then
    row "WebView2 runtime" "$found" "ok"
  else
    row "WebView2 runtime" "-" "install with winget"
    queue_winget "Install the WebView2 runtime" Microsoft.EdgeWebView2Runtime
  fi
}

check_tauri_system() {
  case "$OS" in
    windows)
      check_windows_build_tools
      check_webview2
      ;;
    macos)
      if xcode-select -p >/dev/null 2>&1; then
        row "Xcode Command Line Tools" "$(xcode-select -p)" "ok"
      else
        ensure_clt
      fi
      ;;
    linux)
      case "$PKG" in
        apt)
          # Tauri prerequisites page (Debian tab) plus libdbus-1-dev and pkg-config,
          # which the builder's secure-storage module and doctor command use.
          want_pkgs "Tauri system libraries (WebKitGTK 4.1 etc.)" libwebkit2gtk-4.1-dev build-essential \
            curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libdbus-1-dev pkg-config
          ;;
        dnf)
          want_pkgs "Tauri system libraries (WebKitGTK 4.1 etc.)" webkit2gtk4.1-devel openssl-devel curl wget \
            file libappindicator-gtk3-devel librsvg2-devel libxdo-devel
          if have gcc && have g++ && have make; then
            row "C/C++ compiler (c-development group)" "$(tool_version gcc --version)" "ok"
          else
            row "C/C++ compiler (c-development group)" "-" "install with dnf (sudo)"
            queue "Install the c-development group" $SUDO dnf group install -y "c-development"
          fi
          ;;
        pacman)
          want_pkgs "Tauri system libraries (WebKitGTK 4.1 etc.)" webkit2gtk-4.1 base-devel curl wget file \
            openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool
          ;;
        *)
          if pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
            row "WebKitGTK 4.1" "$(pkg-config --modversion webkit2gtk-4.1)" "ok"
          else
            row "Tauri system libraries" "-" "manual"
            manual "Install the Tauri system libraries for '$DISTRO' listed in docs/SETUP_RESOURCES.md."
          fi
          ;;
      esac
      ;;
  esac
}

# Adds missing rustup targets.
want_rust_targets() {
  local label="$1"; shift
  local installed missing=() t
  if ! have rustup; then
    row "$label" "-" "add after rustup is installed"
    queue "Add Rust targets: $*" rustup target add "$@"
    return
  fi
  installed="$(rustup target list --installed 2>/dev/null || true)"
  for t in "$@"; do
    printf '%s\n' "$installed" | grep -qx "$t" || missing+=("$t")
  done
  if [[ ${#missing[@]} -eq 0 ]]; then
    row "$label" "installed" "ok"
  else
    row "$label" "missing ${#missing[@]}" "rustup target add"
    queue "Add Rust targets: ${missing[*]}" rustup target add "${missing[@]}"
  fi
}

check_android() {
  local studio="" sdk jbr
  case "$OS" in
    windows)
      jbr="C:\\Program Files\\Android\\Android Studio\\jbr"
      sdk="$(win_path "${LOCALAPPDATA:-}")/Android/Sdk"
      if [[ -d "/c/Program Files/Android/Android Studio/bin" ]]; then
        row "Android Studio" "installed" "ok"
      else
        row "Android Studio" "-" "install with winget"
        queue_winget "Install Android Studio" Google.AndroidStudio
      fi
      if [[ -d "$sdk/platform-tools" && -d "$sdk/ndk" ]]; then
        row "Android SDK + NDK" "$sdk" "ok"
      else
        row "Android SDK + NDK" "-" "manual (Android Studio SDK Manager)"
        manual "In Android Studio open the SDK Manager and install: Android SDK Platform, Android SDK Platform-Tools, \
NDK (Side by side), Android SDK Build-Tools and Android SDK Command-line Tools. Then run this script again with \
--mobile so it can set NDK_HOME."
      fi
      env_var JAVA_HOME "$jbr"
      env_var ANDROID_HOME "${LOCALAPPDATA:-}\\Android\\Sdk"
      if [[ -d "$sdk/ndk" ]]; then
        local ndk_version="" entry
        for entry in "$sdk/ndk"/*; do [[ -d "$entry" ]] && ndk_version="${entry##*/}"; done
        [[ -n "$ndk_version" ]] && env_var NDK_HOME "${LOCALAPPDATA:-}\\Android\\Sdk\\ndk\\$ndk_version"
      fi
      row "JAVA_HOME / ANDROID_HOME / NDK_HOME" "${JAVA_HOME:-unset} / ${ANDROID_HOME:-unset}" "user variables with setx (shown below)"
      want_rust_targets "Rust Android targets" aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
      return
      ;;
    macos)
      sdk="$HOME/Library/Android/sdk"
      jbr="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
      [[ -d "/Applications/Android Studio.app" ]] && studio="/Applications/Android Studio.app"
      if [[ -n "$studio" ]]; then
        row "Android Studio" "installed" "ok"
      else
        NEED_BREW=1
        row "Android Studio" "-" "install with Homebrew (cask android-studio)"
        queue_brew "Install Android Studio with Homebrew" install --cask android-studio
      fi
      ;;
    linux)
      sdk="$HOME/Android/Sdk"
      jbr="/opt/android-studio/jbr"
      [[ -x /opt/android-studio/bin/studio.sh ]] && studio="/opt/android-studio"
      if [[ -n "$studio" ]]; then
        row "Android Studio" "$studio" "ok"
      else
        row "Android Studio" "-" "manual (see below)"
        manual "Android Studio (Linux): download the Linux .tar.gz from https://developer.android.com/studio, \
extract it so that /opt/android-studio/bin/studio.sh exists (for example: sudo tar -xzf android-studio-*-linux.tar.gz -C /opt), \
then run /opt/android-studio/bin/studio.sh and finish the setup wizard."
      fi
      ;;
  esac

  if [[ -d "$sdk/platform-tools" && -d "$sdk/ndk" ]]; then
    row "Android SDK + NDK" "$sdk" "ok"
  else
    row "Android SDK + NDK" "-" "manual (Android Studio SDK Manager)"
    manual "In Android Studio open the SDK Manager and install: Android SDK Platform, Android SDK Platform-Tools, \
NDK (Side by side), Android SDK Build-Tools and Android SDK Command-line Tools."
  fi

  row "JAVA_HOME / ANDROID_HOME / NDK_HOME" "${JAVA_HOME:-unset} / ${ANDROID_HOME:-unset}" "profile lines (shown below)"
  profile_line "export JAVA_HOME=\"$jbr\""
  if [[ "$OS" == "macos" ]]; then
    profile_line 'export ANDROID_HOME="$HOME/Library/Android/sdk"'
  else
    profile_line 'export ANDROID_HOME="$HOME/Android/Sdk"'
  fi
  profile_line 'export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" 2>/dev/null | tail -n 1)"'

  want_rust_targets "Rust Android targets" aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
}

check_ios() {
  [[ "$OS" == "macos" ]] || return 0
  if xcodebuild -version >/dev/null 2>&1; then
    row "Xcode (full, for iOS)" "$(xcodebuild -version 2>/dev/null | head -n 1)" "ok"
  else
    row "Xcode (full, for iOS)" "-" "manual (Mac App Store)"
    manual "Install Xcode (not only the Command Line Tools) from the Mac App Store and launch it once so it finishes setting up."
  fi
  want_rust_targets "Rust iOS targets" aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
  local v
  v="$(tool_version pod --version)"
  if [[ -n "$v" ]]; then
    row "CocoaPods" "$v" "ok"
  else
    NEED_BREW=1
    row "CocoaPods" "-" "install with Homebrew"
    queue_brew "Install CocoaPods with Homebrew" install cocoapods
  fi
}

# Windows: the installed Microsoft Edge version (product version of msedge.exe), or nothing.
edge_version() {
  local exe found ps="/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
  [[ -x "$ps" ]] || return 0
  for exe in 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' \
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'; do
    found="$("$ps" -NoProfile -Command "if (Test-Path '$exe') { (Get-Item '$exe').VersionInfo.ProductVersion }" 2>/dev/null \
      | tr -d '\r' | grep -Eo '^[0-9]+(\.[0-9]+)+$' | head -n 1 || true)"
    if [[ -n "$found" ]]; then
      printf '%s\n' "$found"
      return 0
    fi
  done
  return 0
}

# Windows: Tauri end-to-end tests need msedgedriver.exe whose major version equals Edge's.
check_msedgedriver() {
  local edge driver
  edge="$(edge_version)"
  driver="$(tool_version msedgedriver --version)"
  if [[ -z "$edge" ]]; then
    row "msedgedriver.exe" "${driver:--}" "manual"
    manual "Microsoft Edge was not found, so the matching msedgedriver.exe cannot be chosen. Install Edge, then re-run."
  elif [[ -n "$driver" && "${driver%%.*}" == "${edge%%.*}" ]]; then
    row "msedgedriver.exe (Edge $edge)" "$driver" "ok"
  else
    row "msedgedriver.exe (Edge $edge)" "${driver:--}" "download msedgedriver $edge"
    queue_shown "Download msedgedriver $edge into ~/.cargo/bin" \
      "curl https://msedgedriver.microsoft.com/$edge/edgedriver_win64.zip, unzip msedgedriver.exe into ~/.cargo/bin" \
      install_msedgedriver "$edge"
  fi
}

# Windows: downloads the msedgedriver that matches the given Edge version from Microsoft.
install_msedgedriver() {
  local version="$1" tmp bin="$HOME/.cargo/bin"
  tmp="$(mktemp -d)"
  mkdir -p "$bin"
  curl -fsSL "https://msedgedriver.microsoft.com/$version/edgedriver_win64.zip" -o "$tmp/driver.zip" \
    || die "could not download msedgedriver $version from msedgedriver.microsoft.com"
  unzip -o -q "$tmp/driver.zip" msedgedriver.exe -d "$bin" || die "could not unzip msedgedriver.exe"
  rm -rf "$tmp"
  say "msedgedriver $("$bin/msedgedriver.exe" --version | head -n 1) installed in $bin"
}

check_e2e() {
  if want_tauri; then
    if [[ "$OS" == "windows" ]]; then
      check_msedgedriver
    fi
    if [[ "$OS" == "macos" ]]; then
      row "tauri-driver" "-" "not used on macOS"
      manual "macOS has no native WebDriver for its web view; Tauri end-to-end tests on macOS use the \
WebdriverIO Tauri service with its embedded driver (see docs/TESTING.md)."
    elif have tauri-driver; then
      row "tauri-driver" "installed" "ok"
    else
      row "tauri-driver" "-" "cargo install tauri-driver --locked"
      queue "Install tauri-driver" cargo install tauri-driver --locked
    fi
  fi
  if [[ "$OS" == "linux" ]]; then
    if [[ "$PKG" == "apt" ]]; then
      if want_tauri; then
        want_pkgs "WebKitWebDriver, Xvfb (e2e)" webkit2gtk-driver xvfb
      else
        want_pkgs "Xvfb (headless e2e)" xvfb
      fi
    else
      if want_tauri && ! have WebKitWebDriver; then
        row "WebKitWebDriver" "-" "manual"
        manual "Install the package that provides WebKitWebDriver for '$DISTRO' (on Debian/Ubuntu it is webkit2gtk-driver)."
      fi
      if ! have xvfb-run; then
        row "Xvfb (headless e2e)" "-" "manual"
        manual "Install Xvfb (the package providing xvfb-run) for '$DISTRO' to run end-to-end tests without a display."
      fi
    fi
  fi
}

# --- Install actions (run only after confirmation) ---------------------------

install_bun() {
  # SHELL=/bin/sh makes Bun's official installer print the PATH lines instead
  # of appending them to a shell profile; this script offers them at the end.
  curl -fsSL https://bun.com/install | SHELL=/bin/sh bash
  PATH="$HOME/.bun/bin:$PATH"
  export PATH
}

install_rustup() {
  # Official command from https://rustup.rs with -y (no prompt) and
  # --no-modify-path (this script offers the PATH line instead).
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
  PATH="$HOME/.cargo/bin:$PATH"
  export PATH
}

install_node_tarball() {
  local platform="linux-$ARCH" tmp file sum
  tmp="$(mktemp -d)"
  curl -fsSL "$NODE_DIST_URL/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  file="$(grep -Eo "node-v[0-9.]+-$platform\.tar\.gz" "$tmp/SHASUMS256.txt" | head -n 1)"
  [[ -n "$file" ]] || die "no Node.js build for $platform in $NODE_DIST_URL/SHASUMS256.txt"
  curl -fSL "$NODE_DIST_URL/$file" -o "$tmp/$file"
  sum="$(grep " $file\$" "$tmp/SHASUMS256.txt" | cut -d' ' -f1)"
  printf '%s  %s\n' "$sum" "$tmp/$file" | sha256sum -c - >/dev/null || die "checksum mismatch for $file"
  mkdir -p "$HOME/.local"
  tar -xzf "$tmp/$file" -C "$HOME/.local"
  ln -sfn "$HOME/.local/${file%.tar.gz}" "$HOME/.local/node"
  rm -rf "$tmp"
  PATH="$HOME/.local/node/bin:$PATH"
  export PATH
  say "Node.js $("$HOME/.local/node/bin/node" --version) installed in $HOME/.local/${file%.tar.gz}"
}

# Windows: installs one winget package. winget exits non-zero when the package
# is already installed or needs a restart, so a failure is reported, not fatal.
winget_install() {
  local id="$1" override="${2:-}" args
  args=(install --id "$id" -e --source winget --accept-package-agreements --accept-source-agreements)
  [[ -n "$override" ]] && args+=(--override "$override")
  winget "${args[@]}" || warn "winget reported a problem installing $id (exit $?). If it says the package is already installed, ignore this."
  win_refresh_path prepend
}

# Windows: runs rustup from the folder winget's rustup installer uses, even before PATH is refreshed.
rustup_run() {
  win_refresh_path prepend
  rustup "$@"
}

install_homebrew() {
  say "Homebrew's official installer explains what it will do and pauses before doing it."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  local b
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [[ -x "$b" ]]; then
      eval "$("$b" shellenv)"
      profile_line "eval \"\$($b shellenv)\""
      return 0
    fi
  done
  return 1
}

# Runs brew when it exists; otherwise records a manual step instead of failing.
brew_run() {
  if have brew; then
    brew "$@"
  else
    warn "Homebrew is not installed; skipped: brew $*"
    manual "Install Homebrew (https://brew.sh), then run: brew $*"
  fi
}

install_sys_pkgs() {
  case "$PKG" in
    apt)
      $SUDO apt-get update
      $SUDO apt-get install -y "$@"
      ;;
    dnf) $SUDO dnf install -y "$@" ;;
    pacman) $SUDO pacman -Syu --needed --noconfirm "$@" ;;
  esac
}

# --- Build the plan ----------------------------------------------------------

check_linux_basics
check_git
# Apps generated for npm run their scripts with Node.js instead of Bun.
if [[ "$PACKAGE_MANAGER" == "npm" ]]; then
  check_node
  want_electron && check_electron_linux_makers
else
  check_bun
fi
if [[ "$PACKAGE_MANAGER" != "npm" ]] && { want_electron || want_extension; }; then
  check_node
fi
if [[ "$PACKAGE_MANAGER" != "npm" ]] && want_electron; then
  check_electron_linux_makers
fi
if want_tauri; then
  check_tauri_system
  check_rust
fi
if [[ $MOBILE -eq 1 ]]; then
  if want_tauri; then
    check_android
    check_ios
  else
    warn "--mobile applies to Tauri only; ignored for --base $BASE."
  fi
fi
[[ $E2E -eq 1 ]] && check_e2e

# System packages go first so curl/unzip exist before the official installers run.
if [[ ${#SYS_PKGS[@]} -gt 0 ]]; then
  # Remove duplicates while keeping order.
  uniq_pkgs=()
  for p in "${SYS_PKGS[@]}"; do
    case " ${uniq_pkgs[*]+"${uniq_pkgs[*]}"} " in *" $p "*) ;; *) uniq_pkgs+=("$p") ;; esac
  done
  STEP_DESC=("Install system packages with $PKG (uses sudo)" ${STEP_DESC[@]+"${STEP_DESC[@]}"})
  STEP_CMD=("$(printf '%q ' install_sys_pkgs "${uniq_pkgs[@]}")" ${STEP_CMD[@]+"${STEP_CMD[@]}"})
  case "$PKG" in
    apt) shown="${SUDO:+$SUDO }apt-get update && ${SUDO:+$SUDO }apt-get install -y ${uniq_pkgs[*]}" ;;
    dnf) shown="${SUDO:+$SUDO }dnf install -y ${uniq_pkgs[*]}" ;;
    *) shown="${SUDO:+$SUDO }pacman -Syu --needed --noconfirm ${uniq_pkgs[*]}" ;;
  esac
  STEP_SHOW=("$shown" ${STEP_SHOW[@]+"${STEP_SHOW[@]}"})
fi

if [[ "$OS" == "windows" && ${#STEP_CMD[@]} -gt 0 ]] && ! have winget; then
  manual "winget (App Installer) was not found. Install 'App Installer' from the Microsoft Store, then run this script again."
fi

BREW_MISSING=0
if [[ "$OS" == "macos" && $NEED_BREW -eq 1 ]] && ! have brew; then
  BREW_MISSING=1
  row "Homebrew" "-" "install (asks separately)"
fi

# --- Show the plan -----------------------------------------------------------

say ""
say "Desktop Starter App Builder bootstrap"
say "Host: $OS ($ARCH)$([[ "$OS" == "linux" ]] && printf ', distribution: %s, package manager: %s' "$DISTRO" "$PKG")"
say "Base: $BASE   mobile: $([[ $MOBILE -eq 1 ]] && echo yes || echo no)   e2e: $([[ $E2E -eq 1 ]] && echo yes || echo no)"
say ""
printf '%-46s %-28s %s\n' "TOOL" "FOUND" "ACTION"
printf '%-46s %-28s %s\n' "----" "-----" "------"
for i in "${!ROW_TOOL[@]}"; do
  printf '%-46s %-28s %s\n' "${ROW_TOOL[$i]}" "${ROW_FOUND[$i]:0:28}" "${ROW_ACTION[$i]}"
done
say ""

if [[ ${#STEP_CMD[@]} -gt 0 ]]; then
  say "Commands that will run, in order:"
  for i in "${!STEP_CMD[@]}"; do
    say "  $((i + 1)). ${STEP_DESC[$i]}"
    say "     ${STEP_SHOW[$i]}"
  done
  say ""
  if [[ -n "$SUDO" && ${#SYS_PKGS[@]} -gt 0 ]]; then
    say "Note: step 1 runs '$SUDO $PKG ...' and will ask for your password."
    say ""
  fi
fi

finish() {
  if [[ ${#MANUAL[@]} -gt 0 ]]; then
    say ""
    say "Manual steps (this script cannot do these for you):"
    for m in "${MANUAL[@]}"; do say "  - $m"; done
  fi
}

run_doctor() {
  local b bases=()
  # Inside a generated app (no cli/ folder) the app's own scripts/doctor.mjs reads project-plan.json.
  if [[ ! -f "$ROOT/cli/main.ts" ]]; then
    local runner=bun
    [[ "$PACKAGE_MANAGER" == "npm" ]] && runner=node
    if ! have "$runner"; then
      say ""
      say "$runner is not on PATH yet, so the doctor check was skipped. Open a new terminal and run: $runner scripts/doctor.mjs"
      return 0
    fi
    say ""
    say "Running: $runner scripts/doctor.mjs"
    (cd "$ROOT" && "$runner" scripts/doctor.mjs) || warn "doctor reported missing tools (see above)."
    return 0
  fi
  if ! have bun; then
    say ""
    say "Bun is not on PATH yet, so the doctor check was skipped. Open a new terminal and run:"
    say "  bash start.sh doctor --base ${BASE/all/electron}"
    return 0
  fi
  if [[ "$BASE" == "all" ]]; then bases=(electron tauri extension); else bases=("$BASE"); fi
  for b in "${bases[@]}"; do
    say ""
    say "Running: bun cli/main.ts doctor --base $b"
    (cd "$ROOT" && bun cli/main.ts doctor --base "$b") || warn "doctor reported missing tools for $b (see above)."
  done
}

if [[ ${#ENV_NAMES[@]} -gt 0 ]]; then
  say "Windows user environment variables that would be set with setx (seen by new terminals):"
  for i in "${!ENV_NAMES[@]}"; do say "  ${ENV_NAMES[$i]}=${ENV_VALUES[$i]}"; done
  say ""
fi

if [[ ${#STEP_CMD[@]} -eq 0 && ${#PROFILE_LINES[@]} -eq 0 && ${#ENV_NAMES[@]} -eq 0 && $BREW_MISSING -eq 0 ]]; then
  say "Nothing to install."
  finish
  [[ $DRY_RUN -eq 1 ]] || run_doctor
  exit 0
fi

if [[ $DRY_RUN -eq 1 ]]; then
  if [[ ${#PROFILE_LINES[@]} -gt 0 ]]; then
    say "Shell profile lines that would be offered:"
    for l in "${PROFILE_LINES[@]}"; do say "  $l"; done
  fi
  finish
  say ""
  say "Dry run: nothing was changed."
  exit 0
fi

confirm "Proceed with the steps above?" || { say "Nothing was changed."; exit 0; }

# --- Execute -----------------------------------------------------------------

if [[ $BREW_MISSING -eq 1 ]]; then
  # Homebrew is never installed without an explicit answer, even with --yes.
  saved_yes=$ASSUME_YES
  ASSUME_YES=0
  if confirm "Homebrew is needed for some steps. Install Homebrew now with its official installer?"; then
    install_homebrew || warn "Homebrew installation did not complete."
  else
    say "Skipping Homebrew; steps that need it will be listed as manual steps."
  fi
  ASSUME_YES=$saved_yes
fi

for i in "${!STEP_CMD[@]}"; do
  say ""
  say "==> ${STEP_DESC[$i]}"
  eval "${STEP_CMD[$i]}"
done

# --- Windows user environment variables ---------------------------------------

if [[ ${#ENV_NAMES[@]} -gt 0 ]] && confirm "Set the Windows user environment variables listed above?"; then
  for i in "${!ENV_NAMES[@]}"; do
    MSYS_NO_PATHCONV=1 setx "${ENV_NAMES[$i]}" "${ENV_VALUES[$i]}" >/dev/null && say "set ${ENV_NAMES[$i]}"
  done
  say "Open a new Git Bash window to see them."
fi

# --- Shell profile -----------------------------------------------------------

if [[ ${#PROFILE_LINES[@]} -gt 0 ]]; then
  case "$(basename "${SHELL:-sh}")" in
    zsh) PROFILE="$HOME/.zshrc" ;;
    bash) if [[ "$OS" == "macos" ]]; then PROFILE="$HOME/.bash_profile"; else PROFILE="$HOME/.bashrc"; fi ;;
    *) PROFILE="$HOME/.profile" ;;
  esac
  NEW_LINES=()
  for l in "${PROFILE_LINES[@]}"; do
    if [[ ! -f "$PROFILE" ]] || ! grep -Fqx -- "$l" "$PROFILE"; then NEW_LINES+=("$l"); fi
  done
  if [[ ${#NEW_LINES[@]} -gt 0 ]]; then
    say ""
    say "These lines make the tools available in new terminals:"
    for l in "${NEW_LINES[@]}"; do say "  $l"; done
    if confirm "Append them to $PROFILE?"; then
      {
        printf '\n# Added by Desktop Starter App Builder scripts/bootstrap.sh\n'
        printf '%s\n' "${NEW_LINES[@]}"
      } >>"$PROFILE"
      say "Appended to $PROFILE. Open a new terminal to use them."
    else
      say "Not changed. Add the lines above to your shell profile yourself."
    fi
  fi
fi

finish
run_doctor
