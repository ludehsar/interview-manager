#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image="${CRATE_BUILD_IMAGE:-amazonlinux:2023}"
onnx_version="${ONNXRUNTIME_VERSION:-1.28.0}"
onnx_tgz="onnxruntime-linux-aarch64-${onnx_version}.tgz"
onnx_url="https://github.com/microsoft/onnxruntime/releases/download/v${onnx_version}/${onnx_tgz}"
cache="$root/target/onnxruntime"
bins="${*:-embed typst-render}"

needs_onnx=0
for bin in $bins; do
  [ "$bin" = "embed" ] && needs_onnx=1
done

if [ "$needs_onnx" = "1" ] && [ ! -f "$cache/lib/libonnxruntime.so" ]; then
  echo "get   $onnx_tgz"
  mkdir -p "$cache"
  curl -fsSL --retry 3 "$onnx_url" -o "$cache/$onnx_tgz"
  tar -xzf "$cache/$onnx_tgz" -C "$cache" --strip-components=1
  rm -f "$cache/$onnx_tgz"
fi
onnx_so=""
if [ "$needs_onnx" = "1" ]; then
  onnx_so="$(find "$cache/lib" -maxdepth 1 -type f -name "libonnxruntime.so.*" | head -1)"
  [ -n "$onnx_so" ] || { echo "libonnxruntime.so not found in $cache/lib" >&2; exit 1; }
  echo "ok    $(basename "$onnx_so") $(du -h "$onnx_so" | cut -f1)"
fi

echo "build $bins for aarch64-unknown-linux-gnu in $image"
docker run --rm \
  --platform linux/arm64 \
  -v "$root":/workspace \
  -v "$root/target/docker-cargo-registry":/usr/local/cargo/registry \
  -w /workspace \
  -e CARGO_TARGET_DIR=/workspace/target/lambda-build \
  -e CARGO_HOME=/usr/local/cargo \
  "$image" \
  bash -euo pipefail -c "
    dnf install -y -q gcc gcc-c++ make tar gzip zip findutils >/dev/null
    if ! command -v cargo >/dev/null; then
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain 1.98.1 >/dev/null
    fi
    export PATH=/usr/local/cargo/bin:\$PATH
    for bin in $bins; do
      case \"\$bin\" in
        embed) flags=\"--no-default-features --features dynamic\" ;;
        *) flags=\"\" ;;
      esac
      echo \"--- cargo build --release \$flags --bin \$bin\"
      cargo build --release \$flags --bin \"\$bin\"
    done
  "

for bin in $bins; do
  src="$root/target/lambda-build/release/$bin"
  dest="$root/target/lambda/$bin"
  [ -f "$src" ] || { echo "missing $src" >&2; exit 1; }

  rm -rf "$dest"
  mkdir -p "$dest"
  cp "$src" "$dest/bootstrap"
  chmod +x "$dest/bootstrap"
  if [ "$bin" = "embed" ]; then
    mkdir -p "$dest/lib"
    cp "$onnx_so" "$dest/lib/libonnxruntime.so"
  fi

  (cd "$dest" && rm -f "../$bin.zip" && zip -qr9 "../$bin.zip" .)
  printf '%-14s %s unzipped  %s zipped\n' "$bin" "$(du -sh "$dest" | cut -f1)" "$(du -h "../$bin.zip" 2>/dev/null | cut -f1 || du -h "$root/target/lambda/$bin.zip" | cut -f1)"
done
