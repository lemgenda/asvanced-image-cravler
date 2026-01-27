# onnx-ai-models
Byte-identical, WebGPU-compatible ONNX files


| File                              | Purpose            | WebGPU               |
| --------------------------------- | ------------------ | -------------------- |
| `maxim_s3_op16_fp32.onnx`         | Raw export         | ❌ Too large          |
| `maxim_s3_fp16.onnx`              | FP16               | ⚠ Still heavy        |
| `maxim_s3_fp16_fused.onnx`        | Fused-attention    | ✔ Best performance   |
| `maxim_s3_fp16_fused_simple.onnx` | Fused + simplified | ✔ Most reliable      |
| `maxim_s3_fp16_webgpu_tiled.onnx` | Tiled version      | ✔ Guaranteed to load |

