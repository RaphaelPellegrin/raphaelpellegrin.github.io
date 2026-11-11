"""Derive a night-theme hypergraph GIF from the existing day GIF.

Keeps every node/edge/walk position identical; only recolors for dark backgrounds.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
DAY_GIF = ROOT / "images" / "hypergraph_random_walk.gif"
NIGHT_GIF = ROOT / "images" / "hypergraph_random_walk_night.gif"

NIGHT_BG = np.array([18, 21, 26], dtype=np.float32)  # #12151a
DAY_FG = np.array([232, 234, 237], dtype=np.float32)  # near text/node light
RED_KEEP = np.array([255, 92, 92], dtype=np.float32)


def recolor_frame(frame: Image.Image) -> Image.Image:
    """Recolor one day-theme frame for night mode.

    Args:
        frame: Source frame from the day GIF.

    Returns:
        Night-themed RGB frame.
    """
    rgba = frame.convert("RGBA")
    arr = np.asarray(rgba, dtype=np.float32)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    # Perceptual helpers.
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    chroma = mx - mn
    lum = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]

    out = rgb.copy()

    # Near-white paper -> night page background.
    white_mask = (lum > 235) & (chroma < 18)
    out[white_mask] = NIGHT_BG

    # Soft near-white antialias / halo -> blend toward night bg.
    soft_white = (lum > 200) & (chroma < 25) & (~white_mask)
    t = np.clip((lum[soft_white] - 200.0) / 55.0, 0.0, 1.0)[:, None]
    out[soft_white] = (1.0 - t) * out[soft_white] + t * NIGHT_BG

    # Black / dark gray nodes + title text -> light foreground.
    dark_mask = (lum < 90) & (chroma < 35)
    # Preserve the active red walker (high red, low chroma of green/blue).
    red_mask = (rgb[:, :, 0] > 180) & (rgb[:, :, 1] < 90) & (rgb[:, :, 2] < 90)
    dark_mask = dark_mask & (~red_mask)
    # Map dark luminance to light ink.
    dark_t = np.clip(1.0 - lum[dark_mask] / 90.0, 0.0, 1.0)[:, None]
    out[dark_mask] = (1.0 - dark_t) * NIGHT_BG + dark_t * DAY_FG

    # Keep / slightly punch up the walker.
    out[red_mask] = RED_KEEP

    # Colored hyperedge strokes: lift a bit so they read on dark paper.
    color_mask = (chroma > 25) & (~red_mask) & (~white_mask)
    out[color_mask] = np.clip(out[color_mask] * 1.12 + 18.0, 0.0, 255.0)

    result = np.dstack([out, alpha]).astype(np.uint8)
    return Image.fromarray(result, mode="RGBA").convert("RGB")


def main() -> None:
    """Write ``hypergraph_random_walk_night.gif`` beside the day GIF."""
    if not DAY_GIF.exists():
        raise FileNotFoundError(f"Missing day GIF: {DAY_GIF}")

    day = Image.open(DAY_GIF)
    frames: list[Image.Image] = []
    durations: list[int] = []
    for frame in ImageSequence.Iterator(day):
        durations.append(int(frame.info.get("duration", 50)))
        frames.append(recolor_frame(frame))

    if not frames:
        raise RuntimeError("Day GIF contained no frames.")

    frames[0].save(
        NIGHT_GIF,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=False,
    )
    print(f"wrote {NIGHT_GIF} ({len(frames)} frames)")


if __name__ == "__main__":
    main()
