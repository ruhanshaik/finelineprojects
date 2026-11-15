#!/usr/bin/env python3
"""Convert raster images in assets/images to optimized WebP copies."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = ROOT / "assets" / "images"
OUTPUT_ROOT = IMAGE_ROOT / "webp"
SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png"}
MAX_WIDTH = 2000
QUALITY = 82


def main():
    sources = [
        path
        for path in IMAGE_ROOT.rglob("*")
        if path.is_file()
        and path.suffix.lower() in SUPPORTED_FORMATS
        and OUTPUT_ROOT not in path.parents
    ]

    for source in sources:
        relative_path = source.relative_to(IMAGE_ROOT).with_suffix(".webp")
        output = OUTPUT_ROOT / relative_path
        output.parent.mkdir(parents=True, exist_ok=True)

        if output.exists() and output.stat().st_mtime >= source.stat().st_mtime:
            print(f"Skipped (current): {relative_path}")
            continue

        with Image.open(source) as image:
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

            image.thumbnail((MAX_WIDTH, MAX_WIDTH), Image.Resampling.LANCZOS)

            image.save(output, "WEBP", quality=QUALITY, method=6)

        print(f"Created: {relative_path}")


if __name__ == "__main__":
    main()
