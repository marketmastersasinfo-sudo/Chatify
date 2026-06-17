from PIL import Image
import sys
import os

def process_image(input_path, output_path):
    try:
        with Image.open(input_path) as img:
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Make it square by cropping the center
            width, height = img.size
            if width != height:
                min_dim = min(width, height)
                left = (width - min_dim) / 2
                top = (height - min_dim) / 2
                right = (width + min_dim) / 2
                bottom = (height + min_dim) / 2
                img = img.crop((left, top, right, bottom))
            
            # Resize to 640x640
            img = img.resize((640, 640), Image.Resampling.LANCZOS)
            
            # Save as high quality JPG
            img.save(output_path, 'JPEG', quality=95)
            print(f"Success! Saved to {output_path}")
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    input_file = r"C:\Users\felip\.gemini\antigravity-ide\brain\671bdf16-9962-4966-b815-9a51a9bb07f9\media__1781736982255.jpg"
    output_file = r"C:\Users\felip\OneDrive\Desktop\Foto_Perfil_ComprasYa.jpg"
    process_image(input_file, output_file)
