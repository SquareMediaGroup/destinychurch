#!/bin/bash
# Synthesizes the sermon fixture PipelineIntegrationTests reads, using the
# macOS text-to-speech voice. Output is gitignored (Vendor/TestAudio/).
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p Vendor/TestAudio
say -v Daniel -r 175 -f Scripts/TestAudio/sermon.txt \
    -o Vendor/TestAudio/sermon.wav --file-format=WAVE --data-format=LEF32@16000
echo "🎙️  Wrote Vendor/TestAudio/sermon.wav"
