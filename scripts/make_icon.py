"""Generate the Paper application icon (1024x1024 PNG)."""
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
SS = 4  # supersampling factor
W = SIZE * SS

img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# --- rounded square with diagonal gradient ---------------------------------
import numpy as np

top = np.array([90, 200, 250], dtype=float)      # #5AC8FA
mid = np.array([10, 132, 255], dtype=float)     # #0A84FF
bottom = np.array([94, 92, 230], dtype=float)   # #5E5CE6

yy, xx = np.mgrid[0:W, 0:W]
t = np.clip((xx * 0.35 + yy * 0.75) / W, 0, 1)
grad = np.zeros((W, W, 3), dtype=float)
for i in range(3):
    first = t < 0.55
    grad[..., i] = np.where(
        first,
        top[i] + (mid[i] - top[i]) * (t / 0.55),
        mid[i] + (bottom[i] - mid[i]) * ((t - 0.55) / 0.45),
    )
grad_img = Image.fromarray(grad.astype(np.uint8), "RGB").convert("RGBA")

mask = Image.new("L", (W, W), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=225 * SS, fill=255)
img.paste(grad_img, (0, 0), mask)

# --- soft highlight --------------------------------------------------------
sheen = Image.new("RGBA", (W, W), (0, 0, 0, 0))
sd = ImageDraw.Draw(sheen)
sd.ellipse(
    [-W * 0.25, -W * 0.55, W * 0.9, W * 0.35],
    fill=(255, 255, 255, 46),
)
sheen = sheen.filter(ImageFilter.GaussianBlur(60 * SS))
img.alpha_composite(Image.composite(sheen, Image.new("RGBA", (W, W), (0, 0, 0, 0)), mask))

# --- page ------------------------------------------------------------------
page_w, page_h = int(W * 0.40), int(W * 0.55)
px, py = (W - page_w) // 2, int(W * 0.225)

# page shadow
shadow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    [px + int(W * 0.006), py + int(W * 0.012), px + page_w + int(W * 0.006),
     py + page_h + int(W * 0.012)],
    radius=int(W * 0.024),
    fill=(10, 40, 90, 120),
)
shadow = shadow.filter(ImageFilter.GaussianBlur(18 * SS))
img.alpha_composite(shadow)

draw = ImageDraw.Draw(img)
draw.rounded_rectangle(
    [px, py, px + page_w, py + page_h],
    radius=int(W * 0.022),
    fill=(255, 255, 255, 250),
)

# accent lines
line_color = (10, 132, 255, 235)
x0 = px + int(page_w * 0.16)
widths = [0.68, 0.52, 0.68, 0.40]
for i, ratio in enumerate(widths):
    y = py + int(page_h * (0.22 + i * 0.13))
    h = int(W * 0.014)
    alpha = 235 if i == 0 else max(70, 235 - i * 55)
    draw.rounded_rectangle(
        [x0, y, x0 + int(page_w * 0.68 * ratio / 0.68), y + h],
        radius=h // 2,
        fill=(10, 132, 255, alpha),
    )

# small bookmark ribbon on the page corner
ribbon_w = int(page_w * 0.15)
ribbon_h = int(page_h * 0.19)
rx = px + page_w - ribbon_w - int(page_w * 0.10)
ry = py + int(page_h * 0.06)
draw.rectangle([rx, ry, rx + ribbon_w, ry + ribbon_h], fill=(255, 197, 10, 255))
draw.polygon(
    [(rx, ry + ribbon_h), (rx + ribbon_w / 2, ry + ribbon_h - int(ribbon_h * 0.28)),
     (rx + ribbon_w, ry + ribbon_h)],
    fill=(255, 255, 255, 255),
)

img = img.resize((SIZE, SIZE), Image.LANCZOS)
img.save("scripts/app-icon.png")
print("wrote scripts/app-icon.png")
