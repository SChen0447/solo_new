from PIL import Image, ImageDraw, ImageFont
from typing import Tuple, Optional
import io
import os

POSITION_MAP = {
    'top-left': (0.05, 0.05),
    'top-center': (0.5, 0.05),
    'top-right': (0.95, 0.05),
    'center-left': (0.05, 0.5),
    'center': (0.5, 0.5),
    'center-right': (0.95, 0.5),
    'bottom-left': (0.05, 0.95),
    'bottom-center': (0.5, 0.95),
    'bottom-right': (0.95, 0.95),
}


def hex_to_rgba(hex_color: str, alpha: int) -> Tuple[int, int, int, int]:
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, alpha)


def calculate_position(
    img_size: Tuple[int, int],
    wm_size: Tuple[int, int],
    position: str
) -> Tuple[int, int]:
    x_ratio, y_ratio = POSITION_MAP.get(position, (0.95, 0.95))
    x = int(img_size[0] * x_ratio - wm_size[0] / 2)
    y = int(img_size[1] * y_ratio - wm_size[1] / 2)
    x = max(0, min(x, img_size[0] - wm_size[0]))
    y = max(0, min(y, img_size[1] - wm_size[1]))
    return (x, y)


def apply_text_watermark(
    image_data: bytes,
    text: str,
    font_size: int = 36,
    font_color: str = '#ffffff',
    opacity: float = 0.7,
    position: str = 'bottom-right'
) -> bytes:
    alpha = int(opacity * 255)
    img = Image.open(io.BytesIO(image_data)).convert('RGBA')
    max_size = (2048, 2048)
    img.thumbnail(max_size, Image.LANCZOS)
    
    watermark = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(watermark)
    
    try:
        font_path = 'C:/Windows/Fonts/arial.ttf' if os.name == 'nt' else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        font = ImageFont.truetype(font_path, font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    pos = calculate_position(img.size, (text_width, text_height), position)
    rgba_color = hex_to_rgba(font_color, alpha)
    
    draw.text(pos, text, font=font, fill=rgba_color)
    result = Image.alpha_composite(img, watermark)
    
    output = io.BytesIO()
    result.convert('RGB').save(output, format='JPEG', quality=95)
    return output.getvalue()


def apply_image_watermark(
    image_data: bytes,
    watermark_data: bytes,
    scale: float = 0.2,
    opacity: float = 0.7,
    position: str = 'bottom-right'
) -> bytes:
    alpha = int(opacity * 255)
    img = Image.open(io.BytesIO(image_data)).convert('RGBA')
    max_size = (2048, 2048)
    img.thumbnail(max_size, Image.LANCZOS)
    
    wm = Image.open(io.BytesIO(watermark_data)).convert('RGBA')
    
    wm_width = int(img.size[0] * scale)
    wm_height = int(wm.size[1] * (wm_width / wm.size[0]))
    wm = wm.resize((wm_width, wm_height), Image.LANCZOS)
    
    for y in range(wm_height):
        for x in range(wm_width):
            r, g, b, a = wm.getpixel((x, y))
            wm.putpixel((x, y), (r, g, b, int(a * opacity)))
    
    pos = calculate_position(img.size, (wm_width, wm_height), position)
    watermark = Image.new('RGBA', img.size, (0, 0, 0, 0))
    watermark.paste(wm, pos, wm)
    
    result = Image.alpha_composite(img, watermark)
    
    output = io.BytesIO()
    result.convert('RGB').save(output, format='JPEG', quality=95)
    return output.getvalue()


def apply_watermark(
    image_data: bytes,
    config: dict,
    watermark_image_data: Optional[bytes] = None
) -> bytes:
    if config.get('type') == 'image' and watermark_image_data:
        return apply_image_watermark(
            image_data,
            watermark_image_data,
            scale=config.get('scale', 0.2),
            opacity=config.get('opacity', 0.7),
            position=config.get('position', 'bottom-right')
        )
    else:
        return apply_text_watermark(
            image_data,
            text=config.get('text', 'Watermark'),
            font_size=config.get('font_size', 36),
            font_color=config.get('font_color', '#ffffff'),
            opacity=config.get('opacity', 0.7),
            position=config.get('position', 'bottom-right')
        )


def generate_preview(
    image_data: bytes,
    config: dict,
    watermark_image_data: Optional[bytes] = None,
    max_size: Tuple[int, int] = (600, 600)
) -> bytes:
    result_data = apply_watermark(image_data, config, watermark_image_data)
    img = Image.open(io.BytesIO(result_data))
    img.thumbnail(max_size, Image.LANCZOS)
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85)
    return output.getvalue()
