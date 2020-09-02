FROM gitpod/workspace-full:latest

USER gitpod

# We use latest major version of Node.js distributed VS Code. (see about dialog in your local VS Code)
RUN bash -c ". .nvm/nvm.sh \
    && nvm install 20 \
    && nvm use 20 \
    && nvm alias default 20"

RUN echo "nvm use default &>/dev/null" >> ~/.bashrc.d/51-nvm-fix

# Install dependencies
RUN sudo apt-get update \
    && sudo apt-get install -y --no-install-recommends \
        xvfb x11vnc fluxbox dbus-x11 x11-utils x11-xserver-utils xdg-utils \
        fbautostart xterm eterm gnome-terminal gnome-keyring seahorse nautilus \
        libx11-dev libxkbfile-dev libsecret-1-dev libnotify4 libnss3 libxss1 \
        libasound2 libgbm1 xfonts-base xfonts-terminus fonts-noto fonts-wqy-microhei \
        fonts-droid-fallback vim-tiny nano libgconf2-dev libgtk-3-dev twm \
    && sudo apt-get clean && sudo rm -rf /var/cache/apt/* && sudo rm -rf /var/lib/apt/lists/* && sudo rm -rf /tmp/*

# Disable v8 cache used by yarn v1.x, refs https://github.com/nodejs/node/issues/51555
ENV DISABLE_V8_COMPILE_CACHE=1
