import os
from PIL import Image

def remove_white_bg(directory):
    if not os.path.exists(directory):
        print(f"Directory not found: {directory}")
        return

    for filename in os.listdir(directory):
        if filename.endswith(".png"):
            filepath = os.path.join(directory, filename)
            
            with Image.open(filepath) as img:
                img = img.convert("RGBA")
                datas = img.getdata()

                newData = []
                for item in datas:
                    # Pure white background removal (Safe version)
                    if item[0] > 245 and item[1] > 245 and item[2] > 245:
                        newData.append((255, 255, 255, 0))
                    else:
                        newData.append(item)

                img.putdata(newData)
                img.save(filepath, "PNG")
                print(f"Cleaned: {filename}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    badges_dir = os.path.join(project_root, "assets", "badges")
    
    remove_white_bg(badges_dir)
