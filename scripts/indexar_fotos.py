#!/usr/bin/env python3
"""
indexar_fotos.py — Detecta el número de dorsal (BIB) en cada foto con EasyOCR,
sube la imagen a Cloudinary y registra la relación en Supabase.

Uso:
  pip install -r requirements.txt
  python indexar_fotos.py --input ./fotos_originales

Variables de entorno requeridas (o en un archivo .env en la misma carpeta):
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  RACE_NAME   (opcional, por defecto "Carrera")
"""

import os
import re
import sys
import shutil
import argparse
from pathlib import Path

# Force UTF-8 output so EasyOCR's progress bar (uses █) doesn't crash on Windows cp1252 terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Load .env if present (no dependency on python-dotenv)
# ---------------------------------------------------------------------------
def _load_dotenv(env_path: Path) -> None:
    if not env_path.exists():
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

_load_dotenv(Path(__file__).parent.parent / '.env.local')  # raíz del proyecto
_load_dotenv(Path(__file__).parent.parent / '.env')       # raíz del proyecto
_load_dotenv(Path(__file__).parent / '.env')              # carpeta scripts/

# ---------------------------------------------------------------------------
# Lazy imports (only after env is loaded)
# ---------------------------------------------------------------------------
import easyocr
import cloudinary
import cloudinary.uploader
from supabase import create_client

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
def _require_env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"Error: la variable de entorno '{name}' no está definida.")
    return val

cloudinary.config(
    cloud_name=_require_env("CLOUDINARY_CLOUD_NAME"),
    api_key=_require_env("CLOUDINARY_API_KEY"),
    api_secret=_require_env("CLOUDINARY_API_SECRET"),
)

supabase = create_client(
    _require_env("SUPABASE_URL"),
    _require_env("SUPABASE_SERVICE_ROLE_KEY"),
)

RACE_NAME = os.environ.get("RACE_NAME", "Carrera")
CLOUDINARY_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "npfotografia")
SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp"}

# BIB numbers are typically 2–5 digits; adjust if your race uses different ranges
BIB_MIN_DIGITS = 2
BIB_MAX_DIGITS = 5


# ---------------------------------------------------------------------------
# Manual filename helpers
# ---------------------------------------------------------------------------
def extract_bib_from_filename(stem: str) -> int | None:
    """Return BIB if filename matches d<number> (case-insensitive), else None."""
    m = re.fullmatch(r'd(\d+)', stem.strip().lower())
    return int(m.group(1)) if m else None


def process_manual(input_dir: Path) -> None:
    """Index photos renamed to d<bib>.jpg — no OCR, BIB comes from the filename."""
    images = [f for f in input_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXT]
    total = len(images)
    if total == 0:
        print("No se encontraron imágenes en el directorio manual.")
        return

    print(f"\nProcesando {total} foto(s) manual(es) — carrera: {RACE_NAME}\n{'─' * 52}")

    indexed = 0
    skipped = 0

    for i, img in enumerate(images, 1):
        print(f"[{i:>4}/{total}]  {img.name}", end="  ")
        bib = extract_bib_from_filename(img.stem)

        if bib is None:
            print(f"⚠  nombre no reconocido (esperado: d<número>, ej: d55.jpg)")
            skipped += 1
            continue

        try:
            public_id = upload(str(img), img.stem)
            insert_record(bib, public_id, img.name)
            print(f"✓  dorsal {bib}  →  {public_id}")
            indexed += 1
        except Exception as exc:
            print(f"✗  ERROR: {exc}")
            skipped += 1

    print(f"\n{'─' * 52}")
    print(f"Resumen: {indexed} indexadas  |  {skipped} omitidas  |  {total} total")


# ---------------------------------------------------------------------------
# OCR helpers
# ---------------------------------------------------------------------------
def extract_bibs(reader: easyocr.Reader, image_path: str) -> list[int]:
    """Return unique BIB candidates found in the image."""
    try:
        results = reader.readtext(image_path, detail=1)
    except Exception as e:
        print(f"  OCR error: {e}")
        return []

    bibs: set[int] = set()
    for (_, text, confidence) in results:
        if confidence < 0.45:
            continue
        digits = re.sub(r"\D", "", text.strip())
        if BIB_MIN_DIGITS <= len(digits) <= BIB_MAX_DIGITS:
            bibs.add(int(digits))
    return sorted(bibs)


# ---------------------------------------------------------------------------
# Cloudinary & Supabase helpers
# ---------------------------------------------------------------------------
def upload(image_path: str, stem: str) -> str:
    """Upload to Cloudinary and return the public_id.

    Using a deterministic public_id (folder/filename-stem) means re-running the
    script overwrites the same Cloudinary asset instead of creating a new one.
    """
    public_id = f"{CLOUDINARY_FOLDER}/{stem}"
    result = cloudinary.uploader.upload(
        image_path,
        public_id=public_id,
        overwrite=True,
        resource_type="image",
        quality="auto",
        fetch_format="auto",
    )
    return result["public_id"]


def insert_record(bib: int, public_id: str, filename: str) -> None:
    # upsert instead of insert: re-running the script won't create duplicates
    supabase.table("photos").upsert({
        "bib_number": bib,
        "cloudinary_public_id": public_id,
        "race_name": RACE_NAME,
        "original_filename": filename,
    }, on_conflict="bib_number,cloudinary_public_id").execute()


# ---------------------------------------------------------------------------
# Main processing loop
# ---------------------------------------------------------------------------
def process(input_dir: Path, output_base: Path) -> None:
    manual_dir = output_base / "manual"
    done_dir = output_base / "procesadas"
    manual_dir.mkdir(parents=True, exist_ok=True)
    done_dir.mkdir(parents=True, exist_ok=True)

    images = [f for f in input_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXT]
    total = len(images)
    if total == 0:
        print("No se encontraron imágenes en el directorio de entrada.")
        return

    print(f"\nCargando modelo EasyOCR (puede tardar la primera vez)...")
    reader = easyocr.Reader(["es", "en"], gpu=False)

    print(f"\nProcesando {total} imagen(es) — carrera: {RACE_NAME}\n{'─' * 52}")

    indexed = 0
    manual = 0
    errors = 0

    for i, img in enumerate(images, 1):
        print(f"[{i:>4}/{total}]  {img.name}", end="  ")

        try:
            bibs = extract_bibs(reader, str(img))

            if not bibs:
                print("⚠  sin BIB  →  /manual")
                shutil.copy2(img, manual_dir / img.name)
                manual += 1
                continue

            public_id = upload(str(img), img.stem)
            for bib in bibs:
                insert_record(bib, public_id, img.name)

            print(f"✓  BIBs: {bibs}  →  {public_id}")
            shutil.copy2(img, done_dir / img.name)
            indexed += 1

        except Exception as exc:
            print(f"✗  ERROR: {exc}  →  /manual")
            shutil.copy2(img, manual_dir / img.name)
            errors += 1
            manual += 1

    print(f"\n{'─' * 52}")
    print(f"Resumen: {indexed} indexadas  |  {manual} manuales  |  {errors} errores  |  {total} total")
    if manual > 0:
        print(f"Revisá las fotos manuales en: {manual_dir}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Indexa fotos de ciclismo por número de dorsal (BIB)"
    )
    parser.add_argument(
        "--input",
        help="Directorio con las fotos originales para procesar con OCR (ej: ./fotos_originales)"
    )
    parser.add_argument(
        "--manual",
        help="Directorio con fotos renombradas manualmente como d<número>.jpg (ej: ./fotos_manual)"
    )
    parser.add_argument(
        "--output", default="./output",
        help="Directorio de salida para el modo OCR (default: ./output)"
    )
    args = parser.parse_args()

    if not args.input and not args.manual:
        sys.exit("Error: especificá --input (OCR) o --manual (nombres d<número>), o ambos.")

    if args.manual:
        manual_path = Path(args.manual).expanduser().resolve()
        if not manual_path.is_dir():
            sys.exit(f"Error: el directorio manual no existe: {manual_path}")
        process_manual(manual_path)

    if args.input:
        input_path = Path(args.input).expanduser().resolve()
        if not input_path.is_dir():
            sys.exit(f"Error: el directorio de entrada no existe: {input_path}")
        process(input_path, Path(args.output).expanduser().resolve())
