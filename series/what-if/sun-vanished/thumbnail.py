# Thumbnail: run from build/what-if/sun-vanished after grabbing th_day.png (11.8 s) and th_dark.png (14.0 s) from clean.mp4
#   python3 ../../../series/what-if/sun-vanished/thumbnail.py ../../../output/what-if_sun-disappeared_thumbnail.jpg
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
day = Image.open('th_day.png').convert('RGB'); dark = Image.open('th_dark.png').convert('RGB')
W, H = day.size
# diagonal split: day top-left, dark bottom-right
mask = Image.new('L', (W, H), 0); d = ImageDraw.Draw(mask)
d.polygon([(0, 0), (W, 0), (W, H * 0.40), (0, H * 0.60)], fill=255)
img = Image.composite(day, dark, mask.filter(ImageFilter.GaussianBlur(3)))
# glowing seam
seam = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(seam)
sd.line([(0, H * 0.60), (W, H * 0.40)], fill=(255, 210, 120, 255), width=10)
glow = seam.filter(ImageFilter.GaussianBlur(18))
img = Image.alpha_composite(img.convert('RGBA'), glow); img = Image.alpha_composite(img, seam.filter(ImageFilter.GaussianBlur(2)))
# darken top and bottom bands for text
grad = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(grad)
for y in range(H):
    a = 0
    if y < 520: a = int(170 * (1 - y / 520) ** 1.4)
    if y > H - 560: a = int(200 * ((y - (H - 560)) / 560) ** 1.3)
    gd.line([(0, y), (W, y)], fill=(0, 0, 0, a))
img = Image.alpha_composite(img, grad)
F = '/usr/share/fonts/truetype/google-fonts/Poppins-Black.ttf'
try: ImageFont.truetype(F, 10)
except OSError: F = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
dr = ImageDraw.Draw(img)
def text(y, s, size, fill, stroke=10):
    f = ImageFont.truetype(F, size); w = dr.textlength(s, font=f)
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).text(((W - w) / 2 + 6, y + 10), s, font=f, fill=(0, 0, 0, 200), stroke_width=stroke, stroke_fill=(0, 0, 0, 200))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
    ImageDraw.Draw(img).text(((W - w) / 2, y), s, font=f, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0))
text(120, 'WHAT IF THE', 112, (255, 255, 255))
text(250, 'SUN', 250, (255, 196, 48), 14)
text(H - 360, 'DISAPPEARED?', 132, (255, 255, 255))
img.convert('RGB').save(sys.argv[1], quality=94)
