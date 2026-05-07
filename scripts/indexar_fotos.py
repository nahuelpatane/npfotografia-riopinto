#!/usr/bin/env python3
"""
indexar_fotos.py — Detecta el número de dorsal (BIB) en cada foto con EasyOCR,
sube la imagen a Cloudinary y registra la relación en Supabase.

Uso:
  pip install -r requirements.txt
  python indexar_fotos.py --input ./fotos_originales [--workers 4] [--ocr-width 1200]

Variables de entorno requeridas (o en un archivo .env en la misma carpeta):
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  RACE_NAME   (opcional, por defecto "Carrera")

Optimizaciones respecto a la versión anterior:
  - Redimensiona las fotos a --ocr-width px antes del OCR (3-5x más rápido)
  - Procesa N imágenes en paralelo (OCR + upload simultáneos)
  - Batch upsert: un solo llamado a Supabase en lugar de uno por foto
"""

import os
import re
import sys
import shutil
import argparse
import tempfile
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

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

_load_dotenv(Path(__file__).parent.parent / '.env.local')
_load_dotenv(Path(__file__).parent.parent / '.env')
_load_dotenv(Path(__file__).parent / '.env')

# ---------------------------------------------------------------------------
# Lazy imports (only after env is loaded)
# ---------------------------------------------------------------------------
import numpy as np
from PIL import Image as PILImage, ImageOps, ImageEnhance

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

RACE_NAME         = os.environ.get("RACE_NAME", "Carrera")
CLOUDINARY_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "npfotografia")
SUPPORTED_EXT     = {".jpg", ".jpeg", ".png", ".webp"}
_rotate_mode      = "auto"  # se sobreescribe desde args

BIB_MIN_DIGITS = 2
BIB_MAX_DIGITS = 5

# Lock for EasyOCR calls (model inference is thread-safe with PyTorch,
# but the lock prevents any potential resource contention on CPU).
# The upload step runs outside this lock, so threads stay busy.
_ocr_lock = threading.Lock()

# Thread-safe progress printer
_print_lock = threading.Lock()
_done_count = 0
_total      = 0

def _log(msg: str) -> None:
    global _done_count
    with _print_lock:
        _done_count += 1
        print(f"[{_done_count:>4}/{_total}]  {msg}", flush=True)

# ---------------------------------------------------------------------------
# Orientación
# ---------------------------------------------------------------------------
def detect_cw_rotation(img: PILImage.Image) -> int:
    """
    Heurístico de luminancia: en fotos exteriores bien orientadas el cielo
    (zona más clara) queda arriba. Prueba 4 rotaciones y devuelve los grados
    de rotación horaria necesarios para corregir la imagen.
    """
    gray = np.array(img.convert('L'), dtype=np.float32)
    h = gray.shape[0]
    quarter = max(h // 4, 1)
    best_rot, best_score = 0, -1.0
    for rot in [0, 90, 180, 270]:
        arr = np.rot90(gray, k=rot // 90)
        score = float(arr[:quarter, :].mean())
        if score > best_score:
            best_score = score
            best_rot = rot
    return best_rot

def rotate_pil(img: PILImage.Image, cw_degrees: int) -> PILImage.Image:
    if cw_degrees == 0:
        return img
    return img.rotate(-cw_degrees, expand=True)

# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------
def load_resized_for_ocr(image_path: str, max_width: int) -> np.ndarray:
    """Load image, detect & correct orientation, enhance contrast/sharpness, downscale for OCR."""
    img = PILImage.open(image_path)
    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')

    if _rotate_mode == 'auto':
        degrees = detect_cw_rotation(img)
    else:
        degrees = int(_rotate_mode)
    img = rotate_pil(img, degrees)

    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        img = img.resize((max_width, int(h * ratio)), PILImage.LANCZOS)
    img = ImageEnhance.Contrast(img).enhance(1.8)
    img = ImageEnhance.Sharpness(img).enhance(2.0)
    return np.array(img)

# ---------------------------------------------------------------------------
# OCR helpers
# ---------------------------------------------------------------------------
def extract_bibs(reader: easyocr.Reader, image: "np.ndarray | str") -> list[int]:
    """Return unique BIB candidates. image can be a numpy array or file path."""
    try:
        with _ocr_lock:
            results = reader.readtext(image, detail=1, allowlist='0123456789')
    except Exception as e:
        print(f"  OCR error: {e}")
        return []

    bibs: set[int] = set()
    for (_, text, confidence) in results:
        if confidence < 0.03:
            continue
        digits = re.sub(r"\D", "", text.strip())
        if BIB_MIN_DIGITS <= len(digits) <= BIB_MAX_DIGITS:
            bibs.add(int(digits))
    return sorted(bibs)

# ---------------------------------------------------------------------------
# Cloudinary & Supabase helpers
# ---------------------------------------------------------------------------
def upload(image_path: str, stem: str) -> str:
    """Rotate image if needed, upload to Cloudinary, return public_id."""
    public_id = f"{CLOUDINARY_FOLDER}/{stem}"

    img = PILImage.open(image_path)
    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')

    if _rotate_mode == 'auto':
        degrees = detect_cw_rotation(img)
    else:
        degrees = int(_rotate_mode)
    img = rotate_pil(img, degrees)

    tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    try:
        img.save(tmp.name, 'JPEG', quality=95, subsampling=0)
        tmp.close()
        result = cloudinary.uploader.upload(
            tmp.name,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            quality="auto",
            fetch_format="auto",
        )
        return result["public_id"]
    finally:
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)

def batch_upsert(records: list[dict]) -> None:
    """Insert all records in a single HTTP call — much faster than one-by-one."""
    if not records:
        return
    supabase.table("photos").upsert(
        records,
        on_conflict="bib_number,cloudinary_public_id"
    ).execute()

# ---------------------------------------------------------------------------
# Manual filename helpers
# ---------------------------------------------------------------------------
def extract_bib_from_filename(stem: str) -> int | None:
    m = re.fullmatch(r'd(\d+)', stem.strip().lower())
    return int(m.group(1)) if m else None

def _process_manual_one(img: Path) -> dict | None:
    bib = extract_bib_from_filename(img.stem)
    if bib is None:
        _log(f"{img.name}  ⚠  nombre no reconocido (esperado: d<número>, ej: d55.jpg)")
        return None
    try:
        public_id = upload(str(img), img.stem)
        _log(f"{img.name}  ✓  dorsal {bib}  →  {public_id}")
        return {"bib_number": bib, "cloudinary_public_id": public_id,
                "race_name": RACE_NAME, "original_filename": img.name}
    except Exception as exc:
        _log(f"{img.name}  ✗  ERROR: {exc}")
        return None

def process_manual(input_dir: Path, workers: int) -> None:
    """Index photos renamed to d<bib>.jpg — no OCR, fully parallel uploads."""
    global _done_count, _total
    images = [f for f in input_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXT]
    _total = len(images)
    _done_count = 0

    if _total == 0:
        print("No se encontraron imágenes en el directorio manual.")
        return

    print(f"\nProcesando {_total} foto(s) manual(es) — carrera: {RACE_NAME}")
    print(f"Workers: {workers}  |  Modo: upload paralelo\n{'─' * 56}")

    records: list[dict] = []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(_process_manual_one, img): img for img in images}
        for future in as_completed(futures):
            result = future.result()
            if result:
                records.append(result)

    print(f"\nGuardando {len(records)} registros en Supabase...", end=" ")
    batch_upsert(records)
    print("✓")

    skipped = _total - len(records)
    print(f"\n{'─' * 56}")
    print(f"Resumen: {len(records)} indexadas  |  {skipped} omitidas  |  {_total} total")

# ---------------------------------------------------------------------------
# OCR processing (parallel)
# ---------------------------------------------------------------------------
def _process_ocr_one(img: Path, reader: easyocr.Reader,
                     manual_dir: Path, done_dir: Path,
                     ocr_width: int) -> dict | None:
    """
    Single-image worker:
      1. Resize image in memory (fast, Pillow)
      2. OCR on the small copy (locked, prevents contention)
      3. Upload full-resolution original to Cloudinary (parallel, network-bound)
    """
    try:
        # Resize in memory — OCR on smaller image is 3-5x faster
        img_array = load_resized_for_ocr(str(img), ocr_width)
        bibs = extract_bibs(reader, img_array)

        if not bibs:
            _log(f"{img.name}  ⚠  sin BIB  →  /manual")
            shutil.copy2(img, manual_dir / img.name)
            return None

        # Upload the original full-resolution file (runs outside the OCR lock)
        public_id = upload(str(img), img.stem)
        shutil.copy2(img, done_dir / img.name)

        bib_str = ", ".join(str(b) for b in bibs)
        _log(f"{img.name}  ✓  BIBs: [{bib_str}]  →  {public_id}")

        return [
            {"bib_number": bib, "cloudinary_public_id": public_id,
             "race_name": RACE_NAME, "original_filename": img.name}
            for bib in bibs
        ]

    except Exception as exc:
        _log(f"{img.name}  ✗  ERROR: {exc}  →  /manual")
        shutil.copy2(img, manual_dir / img.name)
        return None

def process(input_dir: Path, output_base: Path, workers: int, ocr_width: int) -> None:
    global _done_count, _total

    manual_dir = output_base / "manual"
    done_dir   = output_base / "procesadas"
    manual_dir.mkdir(parents=True, exist_ok=True)
    done_dir.mkdir(parents=True, exist_ok=True)

    images = [f for f in input_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXT]
    _total = len(images)
    _done_count = 0

    if _total == 0:
        print("No se encontraron imágenes en el directorio de entrada.")
        return

    print(f"\nCargando modelo EasyOCR (puede tardar la primera vez)...")
    reader = easyocr.Reader(["es", "en"], gpu=False)

    print(f"\nProcesando {_total} imagen(es) — carrera: {RACE_NAME}")
    print(f"Workers: {workers}  |  OCR width: {ocr_width}px  |  Modo: OCR+upload paralelo")
    print(f"{'─' * 56}")

    all_records: list[dict] = []
    manual_count = 0
    error_count  = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(_process_ocr_one, img, reader, manual_dir, done_dir, ocr_width): img
            for img in images
        }
        for future in as_completed(futures):
            result = future.result()
            if result is None:
                manual_count += 1
            else:
                all_records.extend(result)

    # Batch insert — one HTTP call for all records
    indexed = len({r["cloudinary_public_id"] for r in all_records})  # unique photos
    print(f"\nGuardando {len(all_records)} registro(s) en Supabase...", end=" ")
    batch_upsert(all_records)
    print("✓")

    print(f"\n{'─' * 56}")
    print(f"Resumen: {indexed} indexadas  |  {manual_count} manuales/sin BIB  |  {_total} total")
    if manual_count > 0:
        print(f"Revisá las fotos sin BIB en: {manual_dir}")

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import os
    default_workers = max(1, min(4, (os.cpu_count() or 4) // 2))

    parser = argparse.ArgumentParser(
        description="Indexa fotos de ciclismo por número de dorsal (BIB)"
    )
    parser.add_argument(
        "--input",
        help="Directorio con fotos para procesar con OCR (ej: ./fotos_originales)"
    )
    parser.add_argument(
        "--manual",
        help="Directorio con fotos renombradas como d<número>.jpg (ej: ./fotos_manual)"
    )
    parser.add_argument(
        "--output", default="./output",
        help="Directorio de salida para el modo OCR (default: ./output)"
    )
    parser.add_argument(
        "--workers", type=int, default=default_workers,
        help=f"Hilos paralelos para OCR+upload (default: {default_workers}, recomendado: 2-6)"
    )
    parser.add_argument(
        "--ocr-width", type=int, default=2000,
        help="Ancho máximo en px para redimensionar antes del OCR (default: 2000). "
             "Valores más bajos = más rápido pero menos preciso. Mínimo recomendado: 800."
    )
    parser.add_argument(
        "--rotate", default="auto",
        help="Rotación: 'auto' (detecta por luminancia) o grados fijos: 0, 90, 180, 270 (default: auto)"
    )
    args = parser.parse_args()

    global _rotate_mode
    _rotate_mode = args.rotate

    if not args.input and not args.manual:
        sys.exit("Error: especificá --input (OCR) o --manual (nombres d<número>), o ambos.")

    if args.manual:
        manual_path = Path(args.manual).expanduser().resolve()
        if not manual_path.is_dir():
            sys.exit(f"Error: el directorio manual no existe: {manual_path}")
        process_manual(manual_path, workers=args.workers)

    if args.input:
        input_path = Path(args.input).expanduser().resolve()
        if not input_path.is_dir():
            sys.exit(f"Error: el directorio de entrada no existe: {input_path}")
        process(
            input_path,
            Path(args.output).expanduser().resolve(),
            workers=args.workers,
            ocr_width=args.ocr_width,
        )
