# Fine Line Projects

Static website for Fine Line Projects, served from the repository root.

## Image optimization

To create optimized WebP copies without replacing the originals:

1. Install Python 3 and Pillow: `py -m pip install Pillow`
2. Run: `py scripts/convert_images_to_webp.py`
3. Review the generated files under `assets/images/webp/` and use them as `<source type="image/webp">` entries in `<picture>` elements, retaining the current image as the fallback.

The script preserves the source directory structure, limits images to 2000 pixels wide, and leaves original images unchanged. Review generated images and update page references before deployment.