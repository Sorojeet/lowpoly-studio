#!/bin/bash
# Kokoro v1.0 ONNX voice models (Apache-2.0) -> ~/.cache/lowpoly-studio/models
set -e
D=~/.cache/lowpoly-studio/models; mkdir -p $D
U=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f $D/kokoro-v1.0.onnx ] || curl -L -o $D/kokoro-v1.0.onnx $U/kokoro-v1.0.onnx
[ -f $D/voices-v1.0.bin ]  || curl -L -o $D/voices-v1.0.bin  $U/voices-v1.0.bin
echo "models in $D"
