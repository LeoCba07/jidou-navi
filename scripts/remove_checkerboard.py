#!/usr/bin/env python3
"""
Remove background from pixel art PNGs using flood fill from corners.
This preserves the artwork while removing connected background regions.
"""

from PIL import Image
import sys
import os
from collections import deque

def colors_similar(c1, c2, tolerance=30):
    """Check if two RGB colors are similar within tolerance."""
    return (abs(c1[0] - c2[0]) <= tolerance and 
            abs(c1[1] - c2[1]) <= tolerance and 
            abs(c1[2] - c2[2]) <= tolerance)

def flood_fill_transparent(img, start_x, start_y, tolerance=30):
    """Flood fill from a starting point, making similar connected pixels transparent."""
    pixels = img.load()
    width, height = img.size
    
    start_pixel = pixels[start_x, start_y]
    if len(start_pixel) < 3:
        return 0
    
    # Skip if already transparent
    if len(start_pixel) >= 4 and start_pixel[3] == 0:
        return 0
        
    start_color = (start_pixel[0], start_pixel[1], start_pixel[2])
    
    visited = set()
    queue = deque([(start_x, start_y)])
    removed = 0
    
    while queue:
        x, y = queue.popleft()
        
        if (x, y) in visited:
            continue
        if x < 0 or x >= width or y < 0 or y >= height:
            continue
            
        visited.add((x, y))
        
        pixel = pixels[x, y]
        if len(pixel) >= 4 and pixel[3] == 0:
            continue
            
        pixel_color = (pixel[0], pixel[1], pixel[2])
        
        if colors_similar(pixel_color, start_color, tolerance):
            # Make transparent
            pixels[x, y] = (0, 0, 0, 0)
            removed += 1
            
            # Add neighbors
            queue.append((x + 1, y))
            queue.append((x - 1, y))
            queue.append((x, y + 1))
            queue.append((x, y - 1))
    
    return removed

def remove_background(input_path, output_path=None, tolerance=30):
    """Remove background using flood fill from all corners and edges."""
    if output_path is None:
        output_path = input_path
    
    # Open and convert to RGBA
    img = Image.open(input_path).convert('RGBA')
    width, height = img.size
    
    removed_count = 0
    
    # Flood fill from corners
    corners = [
        (0, 0), (width-1, 0), (0, height-1), (width-1, height-1)
    ]
    
    for x, y in corners:
        removed_count += flood_fill_transparent(img, x, y, tolerance)
    
    # Also flood fill from edges (every 10 pixels) to catch any missed areas
    for x in range(0, width, 10):
        removed_count += flood_fill_transparent(img, x, 0, tolerance)
        removed_count += flood_fill_transparent(img, x, height-1, tolerance)
    
    for y in range(0, height, 10):
        removed_count += flood_fill_transparent(img, 0, y, tolerance)
        removed_count += flood_fill_transparent(img, width-1, y, tolerance)
    
    img.save(output_path, 'PNG')
    print(f"Processed {input_path}: removed {removed_count} background pixels")
    return removed_count

def main():
    # Default to processing all pixel-stat and pixel- PNGs in assets
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets')
    
    if len(sys.argv) > 1:
        # Process specific files
        files = sys.argv[1:]
    else:
        # Find all pixel-*.png files
        files = [
            os.path.join(assets_dir, f) 
            for f in os.listdir(assets_dir) 
            if f.startswith('pixel-') and f.endswith('.png')
        ]
    
    if not files:
        print("No files to process")
        return
    
    print(f"Processing {len(files)} files...")
    for filepath in files:
        if os.path.exists(filepath):
            remove_background(filepath, tolerance=35)
        else:
            print(f"File not found: {filepath}")

if __name__ == '__main__':
    main()
