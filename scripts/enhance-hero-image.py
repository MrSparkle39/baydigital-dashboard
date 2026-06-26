"""Generate sharpened 1x/2x hero assets from the best available source."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images"

SOURCES = [
    OUT / "hero-bg.png",
]


def main() -> None:
    src_path = next((p for p in SOURCES if p.exists()), None)
    if src_path is None:
        raise SystemExit("No hero source image found.")

    im = Image.open(src_path).convert("RGB")
    print(f"Source: {src_path.name} {im.size}")

    w, h = im.size
    im_2x = im.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
    im_2x = im_2x.filter(ImageFilter.UnsharpMask(radius=1.4, percent=110, threshold=2))

    im_1x = im.filter(ImageFilter.UnsharpMask(radius=0.8, percent=105, threshold=3))

    im_1x.save(OUT / "hero-bg.png", optimize=True, compress_level=6)
    im_2x.save(OUT / "hero-bg@2x.png", optimize=True, compress_level=6)
    im_1x.save(OUT / "hero-bg.webp", quality=92, method=6)
    im_2x.save(OUT / "hero-bg@2x.webp", quality=92, method=6)

    for name in ("hero-bg.png", "hero-bg@2x.png", "hero-bg.webp", "hero-bg@2x.webp"):
        path = OUT / name
        with Image.open(path) as out:
            print(f"{name}: {out.size[0]}x{out.size[1]}, {path.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
