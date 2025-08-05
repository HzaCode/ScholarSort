from PIL import Image, ImageDraw, ImageFont
import os

def create_logo(size):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    radius = int(size * 0.45)
    
    # Background circle
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], 
                 fill=(66, 133, 244, 255), outline=(26, 115, 232, 255), width=max(1, size//64))
    
    # Scholar cap
    cap_width = int(size * 0.5)
    cap_height = int(size * 0.2)
    cap_points = [
        (center - cap_width//2, center - cap_height//2),
        (center + cap_width//2, center - cap_height//2),
        (center + cap_width//2, center - cap_height//2 + cap_height//5),
        (center, center + cap_height//2),
        (center - cap_width//2, center - cap_height//2 + cap_height//5)
    ]
    draw.polygon(cap_points, fill=(255, 255, 255, 255))
    
    # Cap band
    band_width = int(cap_width * 0.85)
    band_height = max(1, size//20)
    draw.rectangle([
        center - band_width//2, 
        center - cap_height//2 + cap_height//5,
        center + band_width//2,
        center - cap_height//2 + cap_height//5 + band_height
    ], fill=(255, 255, 255, 255))
    
    # Highlighter effect
    highlight_points = [
        (center - cap_width//2 - size//32, center + cap_height//2),
        (center + cap_width//2 + size//32, center + cap_height//2),
        (center + cap_width//2 + size//32, center + cap_height//2 + size//16),
        (center, center + cap_height//2 + size//8),
        (center - cap_width//2 - size//32, center + cap_height//2 + size//16)
    ]
    draw.polygon(highlight_points, fill=(255, 235, 59, 200))
    
    # Impact factor badge (for larger sizes)
    if size >= 48:
        badge_radius = int(size * 0.1)
        badge_x = center + cap_width//2 + badge_radius
        badge_y = center - cap_height//2 + badge_radius
        draw.ellipse([
            badge_x - badge_radius, badge_y - badge_radius,
            badge_x + badge_radius, badge_y + badge_radius
        ], fill=(52, 168, 83, 255))
        
        # IF text
        try:
            font_size = max(8, size//16)
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        draw.text((badge_x, badge_y), "IF", fill=(255, 255, 255, 255), 
                 font=font, anchor="mm")
    
    # Magnifying glass (for larger sizes)
    if size >= 48:
        glass_radius = int(size * 0.08)
        glass_x = center + cap_width//2 - glass_radius
        glass_y = center + cap_height//2 + glass_radius
        draw.arc([
            glass_x - glass_radius, glass_y - glass_radius,
            glass_x + glass_radius, glass_y + glass_radius
        ], 0, 360, fill=(255, 255, 255, 255), width=max(1, size//64))
        
        # Handle
        handle_start = (glass_x + int(glass_radius * 0.7), glass_y + int(glass_radius * 0.7))
        handle_end = (glass_x + int(glass_radius * 1.4), glass_y + int(glass_radius * 1.4))
        draw.line([handle_start, handle_end], fill=(255, 255, 255, 255), width=max(1, size//64))
    
    return img

def main():
    sizes = [16, 48, 128]
    
    for size in sizes:
        logo = create_logo(size)
        filename = f"icon{size}.png"
        logo.save(filename, "PNG")
        print(f"Created {filename}")

if __name__ == "__main__":
    main() 