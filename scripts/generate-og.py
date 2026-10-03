#!/usr/bin/env python3
"""Generate 1200x630 Open Graph PNGs into public/og/. Usage: python3 scripts/generate-og.py"""
import os, re, glob
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG, TEXT, SEC, BORDER = "#fafaf9", "#1a1a1a", "#555555", "#e5e5e3"
D = "/usr/share/fonts/truetype/dejavu/"
def font(name, size):
    try: return ImageFont.truetype(D + name, size)
    except OSError: return ImageFont.load_default()

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "public", "og")
os.makedirs(out, exist_ok=True)

def wrap(draw, text, f, width):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur)
    return lines

def render(title, path):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 14, H], fill=TEXT)
    size = 64
    while True:
        f = font("DejaVuSerif-Bold.ttf", size)
        lines = wrap(d, title, f, W - 160 - 60)
        if len(lines) <= 5 or size <= 36: break
        size -= 4
    lh = int(size * 1.25)
    y = 80
    for ln in lines:
        d.text((80, y), ln, font=f, fill=TEXT); y += lh
    d.line([80, H - 130, W - 80, H - 130], fill=BORDER, width=2)
    d.text((80, H - 105), "Pavel Savinov", font=font("DejaVuSans-Bold.ttf", 30), fill=TEXT)
    t = "getjump.me"; ft = font("DejaVuSans.ttf", 30)
    d.text((W - 80 - d.textlength(t, font=ft), H - 105), t, font=ft, fill=SEC)
    img.save(os.path.join(out, path), optimize=True)

render("Pavel Savinov: notes on distributed systems, testing and building with AI agents", "default.png")
for p in sorted(glob.glob(os.path.join(root, "src/content/posts/*.mdx"))):
    m = re.search(r'^title:\s*(["\'])(.*)\1\s*$', open(p).read(), re.M)
    render(m.group(2), os.path.basename(p)[:-4] + ".png")
