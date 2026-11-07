"""Generates resources/icon.png and resources/tray.png (a soft blue orb). Run: python scripts/generate-icons.py"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

def orb(size: int) -> Image.Image:
    ss = 4
    n = size * ss
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    px = img.load()
    cx = cy = n / 2
    r = n * 0.40
    for y in range(n):
        for x in range(n):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            if d > r:
                continue
            t = d / r
            # light source up-left
            hx, hy = x - (cx - r * 0.35), y - (cy - r * 0.4)
            h = max(0.0, 1 - math.hypot(hx, hy) / (r * 1.1))
            base = (0 + 90 * (1 - t), 113 + 90 * (1 - t), 227 + 20 * (1 - t))
            col = tuple(min(255, int(c + 120 * h * h)) for c in base)
            px[x, y] = (*col, 255)
    glow = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - r * 1.18, cy - r * 1.18, cx + r * 1.18, cy + r * 1.18], fill=(10, 132, 255, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(n * 0.03))
    out = Image.alpha_composite(glow, img)
    return out.resize((size, size), Image.LANCZOS)

os.makedirs("resources", exist_ok=True)
orb(512).save("resources/icon.png")
orb(32).save("resources/tray.png")
