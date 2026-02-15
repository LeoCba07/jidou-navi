import os
from PIL import Image

def remove_white_bg(directory):
    for filename in os.listdir(directory):
        if filename.endswith(".png"):
            filepath = os.path.join(directory, filename)
            img = Image.open(filepath).convert("RGBA")
            datas = img.getdata()

            newData = []
            for item in datas:
                # Si el pixel es blanco (o muy cercano al blanco), hacerlo transparente
                if item[0] > 245 and item[1] > 245 and item[2] > 245:
                    newData.append((255, 255, 255, 0))
                else:
                    newData.append(item)

            img.putdata(newData)
            img.save(filepath, "PNG")
            print(f"Cleaned: {filename}")

if __name__ == "__main__":
    remove_white_bg("assets/badges")
