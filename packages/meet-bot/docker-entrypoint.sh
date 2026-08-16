#!/usr/bin/env bash
set -euo pipefail

# A headless container has no sound card, so Chromium would have nowhere to play
# the call and there would be nothing to record. PulseAudio's **null sink** is a
# virtual speaker: it throws away what it plays but exposes a `.monitor` source
# carrying the identical samples. Chromium plays into the sink, ffmpeg records
# the monitor. That is the entire recording mechanism.

export XDG_RUNTIME_DIR=/tmp/runtime
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

pulseaudio --start --exit-idle-time=-1 --disallow-exit -n \
  --load="module-null-sink sink_name=glitchgrab_sink sink_properties=device.description=GlitchgrabSink" \
  --load="module-native-protocol-unix" \
  --log-target=stderr

# Chromium follows the DEFAULT sink, so this is what actually routes the call
# into something we can capture.
pactl set-default-sink glitchgrab_sink

echo "[bot] pulseaudio ready — sink: glitchgrab_sink"

exec bun run src/server.ts
