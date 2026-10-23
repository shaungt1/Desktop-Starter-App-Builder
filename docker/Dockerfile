# Linux build environment for Desktop Starter App Builder.
#
# Contains everything needed to generate, verify, end-to-end test and package
# Electron and Tauri apps on Linux: Node.js 22 (Electron Forge), Bun, Rust,
# Tauri's WebKitGTK build dependencies, Electron's runtime libraries,
# tauri-driver + WebKitWebDriver for Tauri end-to-end tests, Xvfb for a
# virtual display, and dpkg/fakeroot/rpm for Linux installers.
#
# With --build-arg WITH_ANDROID=true it also contains a JDK, the Android SDK
# command-line tools, platform, build tools and NDK, and the Rust Android
# targets, so Tauri Android packages (APK/AAB) can be built in the container.
#
# Windows, macOS and iOS packages cannot be built here; build those on their
# own operating systems (the generated apps' .github/workflows do this).
#
# Build:  docker compose build                      (desktop tools)
#         docker compose build --build-arg WITH_ANDROID=true builder
# Use:    docker compose run --rm builder bash start.sh doctor --base tauri
FROM node:22-bookworm

ARG BUN_VERSION=1.4.3
ARG RUST_TOOLCHAIN=stable
ARG TAURI_DRIVER_VERSION=2.1.0
# Android (optional). The command-line tools file name and SHA-256 are the ones
# listed on https://developer.android.com/studio ("Command line tools only").
ARG WITH_ANDROID=false
ARG ANDROID_CMDLINE_TOOLS=commandlinetools-linux-15859902_latest.zip
ARG ANDROID_CMDLINE_TOOLS_SHA256=4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583
ARG ANDROID_PLATFORM=android-36
ARG ANDROID_BUILD_TOOLS=36.0.0
ARG ANDROID_NDK=28.2.13676358

ENV DEBIAN_FRONTEND=noninteractive \
    CARGO_HOME=/usr/local/cargo \
    RUSTUP_HOME=/usr/local/rustup \
    PATH=/usr/local/cargo/bin:$PATH \
    CI=true

# Tauri build dependencies, Electron runtime libraries, test display and installers.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential pkg-config curl wget file git unzip ca-certificates \
      libwebkit2gtk-4.1-dev libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
      webkit2gtk-driver \
      libnss3 libgbm1 libasound2 libgtk-3-0 libxss1 libxtst6 \
      xvfb xauth dbus dbus-x11 \
      dpkg fakeroot rpm \
    && rm -rf /var/lib/apt/lists/*

# Bun, installed through npm (one of Bun's documented installation methods).
RUN npm install -g "bun@${BUN_VERSION}" && bun --version

# Rust through rustup, plus tauri-driver for Tauri end-to-end tests.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --profile minimal --default-toolchain "${RUST_TOOLCHAIN}" \
    && cargo install tauri-driver --version "${TAURI_DRIVER_VERSION}" --locked \
    && chmod -R a+w "${CARGO_HOME}" "${RUSTUP_HOME}"

# Optional Android toolchain for Tauri mobile builds (docs/tauri/14-mobile.md).
# /opt/jdk is a link to the installed JDK, so the path works on amd64 and arm64 images.
ENV ANDROID_HOME=/opt/android-sdk \
    JAVA_HOME=/opt/jdk
RUN if [ "${WITH_ANDROID}" = "true" ]; then \
      apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless \
      && rm -rf /var/lib/apt/lists/* \
      && ln -sfn "$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")" /opt/jdk \
      && mkdir -p "${ANDROID_HOME}/cmdline-tools" \
      && curl -fsSL -o /tmp/cmdline-tools.zip "https://dl.google.com/android/repository/${ANDROID_CMDLINE_TOOLS}" \
      && echo "${ANDROID_CMDLINE_TOOLS_SHA256}  /tmp/cmdline-tools.zip" | sha256sum -c - \
      && unzip -q /tmp/cmdline-tools.zip -d "${ANDROID_HOME}/cmdline-tools" \
      && mv "${ANDROID_HOME}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest" \
      && rm /tmp/cmdline-tools.zip \
      && yes | "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null \
      && "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" \
           "platform-tools" "platforms;${ANDROID_PLATFORM}" "build-tools;${ANDROID_BUILD_TOOLS}" "ndk;${ANDROID_NDK}" \
      && rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android \
      && echo "export NDK_HOME=${ANDROID_HOME}/ndk/${ANDROID_NDK}" >> /etc/profile.d/android.sh; \
    fi
ENV NDK_HOME=${ANDROID_HOME}/ndk/${ANDROID_NDK}

WORKDIR /builder

# Builder dependencies first, so source changes do not reinstall them.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Every command runs with a virtual display and a D-Bus session (needed by
# Electron, WebKitGTK, tray icons and the OS key store).
ENTRYPOINT ["/builder/docker/entrypoint.sh"]
CMD ["bash", "start.sh", "help"]
