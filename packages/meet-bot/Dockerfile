# Meet bot (#311) — headless Chromium that joins a Google Meet and records it.
#
# The Playwright base image already carries Chromium and its system libraries,
# which is the fiddly half of running a real browser in a container.
#
# This tag and `playwright-core` in package.json must stay on the SAME exact
# version — the image ships the browser build for this release, and a newer
# playwright-core fails at launch with "Executable doesn't exist". That is why
# the dependency is pinned exactly rather than with a caret. Bump both together.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# pulseaudio: the virtual sound card Chromium plays the call into.
# ffmpeg:     records that sink's monitor to Opus/WebM.
# xvfb + x11vnc: a real X display and a remote view, used ONLY for the
# human-driven Google login (see src/login.ts). Google blocks sign-in from an
# automated browser, so that one step runs a plain Chrome a person drives.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     pulseaudio pulseaudio-utils ffmpeg curl unzip xvfb x11vnc \
  && rm -rf /var/lib/apt/lists/*

# Bun runs the service (same runtime as the rest of the monorepo).
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY package.json ./
RUN bun install

COPY src ./src
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Playwright's bundled browsers live here in the base image.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PORT=8080

EXPOSE 8080
# VNC for the login session. Reachable only via a Railway TCP proxy you add
# deliberately, and only while a login session is running.
EXPOSE 5900

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD curl -fsS http://localhost:8080/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
