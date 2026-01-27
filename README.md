# onnx-ai-models
Byte-identical, WebGPU-compatible ONNX files

This mimics the Flax MAXIM reference (deep encoder → bottleneck → wide decoder).

## Why this works:
- Each chunk uses < 300 MB VRAM
- VRAM is released between chunk calls
- No single kernel dispatch allocates the entire attention block at once
