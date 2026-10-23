# Docker

## What Docker is for here, and when you need it

Docker runs programs inside a **container**: a sealed Linux environment with
its own installed tools, started from an **image** (a recipe of what to
install). This repository includes an image recipe so that a machine with only
Docker installed can still generate, verify, end-to-end test and package
**Linux** builds of Electron and Tauri apps, and (optionally) **Android**
builds of Tauri apps, without installing Bun, Node.js, Rust, WebKitGTK or the
Android SDK on the machine itself. Typical uses are a CI server, a shared build
machine, or reproducing a Linux build exactly.

You do not need Docker for everyday work. On your own Windows, macOS or Linux
machine, `scripts/bootstrap.sh` / `scripts/bootstrap.ps1` install the tools
directly, and that is the faster path. Docker also cannot build Windows,
macOS or iOS packages, because those need their own operating systems; the
generated apps' GitHub Actions workflows build those on GitHub's Windows and
macOS machines.

## What the image contains

The image is defined in `docker/Dockerfile` and starts from the official
`node:22-bookworm` image (Debian 12 with Node.js 22). On top of that it adds
Bun (installed through npm), Rust through rustup, `tauri-driver`, WebKitGTK 4.1
development files and `webkit2gtk-driver` for Tauri, the shared libraries the
Electron runtime needs, Xvfb and a D-Bus session for running apps without a
screen, and `dpkg`, `fakeroot` and `rpm` for Linux installers. The entrypoint
(`docker/entrypoint.sh`) wraps every command in `xvfb-run` and
`dbus-run-session`, so apps can start inside the container.

Building with `--build-arg WITH_ANDROID=true` adds OpenJDK 17, the Android SDK
command-line tools, platform tools, an Android platform, build tools, the NDK
and the four Rust Android targets, and sets `JAVA_HOME`, `ANDROID_HOME` and
`NDK_HOME`. The command-line tools archive is checked against the SHA-256 that
the Android Studio download page lists. The platform, build-tools and NDK
versions are build arguments (`ANDROID_PLATFORM`, `ANDROID_BUILD_TOOLS`,
`ANDROID_NDK`); change them to the versions your app needs.

```bash
docker compose build --build-arg WITH_ANDROID=true builder
docker compose run --rm builder bash -c "cd /work/acme-pocket && bun install && bun run android:init && bun run android:build"
```

## Using it

All commands are run from the builder root on the host. Generated apps are
written to `/work` in the container, which is the `generated/` folder on the
host (ignored by Git).

```bash
docker compose build
docker compose run --rm builder bash start.sh doctor --base tauri
docker compose run --rm builder bash start.sh create /work/acme-notes \
  --plan plans/examples/electron-native.json --install --verify
docker compose run --rm builder bash -c "cd /work/acme-notes && bun run test:e2e && bun run make"
```

To use your own plan, put it in `generated/` on the host and pass
`--plan /work/<file>.json`. The Cargo registry, the Electron download cache and
Bun's package cache are kept in named volumes, so later runs do not download
them again.

To run the builder's own full generation test in the container:

```bash
docker compose run --rm builder bash -c "DSAB_E2E=1 bun run test:generate"
```

## Notes

Chromium needs more shared memory than Docker's default, so `compose.yaml`
sets `shm_size: 1gb`. The container runs as root; generated Electron
end-to-end tests detect this and pass `--no-sandbox` to Chromium, which is
acceptable in a disposable container but never in a shipped app.

The Dockerfile was written for this release but could not be built in the
environment where the builder was assembled, because that environment had no
access to a container registry or to Google's Android download server. The
Android download address follows Google's repository naming
(`https://dl.google.com/android/repository/<file name>`) and was not fetched;
the checksum check makes a wrong file fail the build instead of installing it.
The default Android platform, build-tools and NDK versions are **UNVERIFIED**
choices; `sdkmanager --list` inside the container shows the available ones. Every package and command in it was exercised
directly on Ubuntu 24.04 (the Tauri and Electron builds, the WebKitGTK and
WebDriver packages, `tauri-driver` and the Xvfb wrapper). Build it once
(`docker compose build`) and run the `doctor` command above to confirm it on
your machine.
