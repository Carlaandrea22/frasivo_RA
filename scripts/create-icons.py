"""Generate the app's own geometric icon. Requires Pillow only when regenerating."""
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(__file__).resolve().parent.parent / 'public'
for name, size, maskable in [('icon-192.png', 192, False), ('icon-512.png', 512, False), ('icon-maskable.png', 512, True)]:
    scale = size / 192
    image = Image.new('RGB', (size, size), '#176454')
    draw = ImageDraw.Draw(image)
    def points(items):
        return [(round(x * scale), round(y * scale)) for x, y in items]
    draw.polygon(points([(62,137),(62,58),(127,58),(127,75),(82,75),(82,92),(119,92),(119,109),(82,109),(82,137)]), fill='#f8faf7')
    draw.ellipse([int(x*scale) for x in (112,114,137,139)], fill='#d7e8ae')
    image.save(out / name)
