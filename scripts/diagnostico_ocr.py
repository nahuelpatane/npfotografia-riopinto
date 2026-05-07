#!/usr/bin/env python3
"""
diagnostico_ocr.py — Prueba OCR en las primeras 3 fotos y muestra todo el detalle.
Uso: python diagnostico_ocr.py --input ./fotos_originales
"""

import os, sys, re, argparse
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from PIL import Image as PILImage, ImageOps, ImageEnhance
import numpy as np
import easyocr

SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp"}

def load_corrected(image_path: str) -> PILImage.Image:
    img = PILImage.open(image_path)
    exif = img.getexif()
    orientation = exif.get(274, 1)  # tag 274 = Orientation
    print(f"  EXIF Orientation tag: {orientation}", flush=True)
    img = ImageOps.exif_transpose(img)
    print(f"  Tamaño tras corregir: {img.size}", flush=True)
    return img.convert('RGB')

def run(input_dir: Path, max_photos: int, ocr_width: int):
    images = sorted([f for f in input_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXT])[:max_photos]
    if not images:
        sys.exit("No se encontraron imágenes.")

    print("Cargando EasyOCR...")
    reader = easyocr.Reader(["es", "en"], gpu=False)

    for img_path in images:
        print(f"\n{'─'*56}")
        print(f"Foto: {img_path.name}")

        img = load_corrected(str(img_path))
        w, h = img.size
        if w > ocr_width:
            ratio = ocr_width / w
            img = img.resize((ocr_width, int(h * ratio)), PILImage.LANCZOS)
            print(f"  Redimensionada para OCR: {img.size}")

        img = ImageEnhance.Contrast(img).enhance(1.8)
        img = ImageEnhance.Sharpness(img).enhance(2.0)
        arr = np.array(img)
        results = reader.readtext(arr, detail=1, allowlist='0123456789')

        print(f"  Resultados OCR ({len(results)} bloques):")
        if not results:
            print("    (ninguno — el dorsal puede ser muy pequeño o no visible)")
        for (bbox, text, conf) in results:
            digits = re.sub(r"\D", "", text.strip())
            flag = ""
            if 2 <= len(digits) <= 5:
                flag = "  <-- POSIBLE DORSAL"
                if conf >= 0.03:
                    flag += " ✓ ACEPTADO"
                else:
                    flag += f" ✗ confianza baja (mínimo 0.03)"
            print(f"    conf={conf:.2f}  texto={repr(text)}  dígitos={repr(digits)}{flag}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--fotos", type=int, default=3)
    parser.add_argument("--ocr-width", type=int, default=2000)
    args = parser.parse_args()

    run(Path(args.input).resolve(), args.fotos, args.ocr_width)
