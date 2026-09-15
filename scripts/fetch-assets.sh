#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
model_dir="$root/crates/embed/models/bge-small-en-v1.5"
font_dir="$root/crates/typst-render/fonts"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

model_base="https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main"
inter_zip="https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip"
inter_sha="9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e"

verify() {
  local dest="$1" expected="$2" actual
  actual="$(shasum -a 256 "$dest" | cut -d' ' -f1)"
  if [ "$expected" != "SKIP" ] && [ "$actual" != "$expected" ]; then
    echo "checksum mismatch for $(basename "$dest")" >&2
    echo "  expected $expected" >&2
    echo "  actual   $actual" >&2
    exit 1
  fi
  echo "ok    $(basename "$dest")  $actual"
}

fetch() {
  local url="$1" dest="$2" sha="$3"
  if [ ! -f "$dest" ]; then
    mkdir -p "$(dirname "$dest")"
    echo "get   $(basename "$dest")"
    curl -fsSL --retry 3 "$url" -o "$dest.part"
    mv "$dest.part" "$dest"
  fi
  verify "$dest" "$sha"
}

echo "embedding model"
while IFS='|' read -r remote sha; do
  [ -z "$remote" ] && continue
  fetch "$model_base/$remote" "$model_dir/$(basename "$remote")" "$sha"
done <<'MODELS'
onnx/model_quantized.onnx|6c9c6101a956d62dfb5e7190c538226c0c5bb9cb27b651234b6df063ee7dbfe4
tokenizer.json|d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66
tokenizer_config.json|9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3
config.json|fa73f90bf92c8cace1fbcb709626306f2bdbc9ea3e5b5f94b440df9b6aa56350
special_tokens_map.json|b6d346be366a7d1d48332dbc9fdf3bf8960b5d879522b7799ddba59e76237ee3
MODELS

echo
echo "typst fonts"
if [ -f "$font_dir/Inter-Regular.ttf" ] && [ -f "$font_dir/Inter-Bold.ttf" ] &&
   [ -f "$font_dir/Inter-SemiBold.ttf" ] && [ -f "$font_dir/Inter-Italic.ttf" ]; then
  for face in Inter-Regular Inter-Italic Inter-SemiBold Inter-Bold; do
    verify "$font_dir/$face.ttf" "SKIP"
  done
else
  echo "get   Inter-4.1.zip"
  curl -fsSL --retry 3 "$inter_zip" -o "$work/inter.zip"
  verify "$work/inter.zip" "${INTER_ZIP_SHA:-$inter_sha}"
  mkdir -p "$font_dir"
  for face in Inter-Regular Inter-Italic Inter-SemiBold Inter-Bold; do
    unzip -p "$work/inter.zip" "extras/ttf/$face.ttf" > "$font_dir/$face.ttf"
    verify "$font_dir/$face.ttf" "SKIP"
  done
  unzip -p "$work/inter.zip" "LICENSE.txt" > "$font_dir/OFL.txt"
fi

echo
du -sh "$model_dir" "$font_dir" 2>/dev/null || true
