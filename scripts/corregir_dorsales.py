#!/usr/bin/env python3
"""
corregir_dorsales.py — Corrige el dorsal asociado a fotos específicas en Supabase.

Uso:
  python scripts/corregir_dorsales.py
"""

import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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

from supabase import create_client

def _require_env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"Error: la variable de entorno '{name}' no está definida.")
    return val

supabase = create_client(
    _require_env("SUPABASE_URL"),
    _require_env("SUPABASE_SERVICE_ROLE_KEY"),
)

CLOUDINARY_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "npfotografia")
RACE_NAME         = os.environ.get("RACE_NAME", "Carrera")

# Lista de correcciones: (nombre_imagen_sin_extension, dorsal_correcto)
CORRECCIONES = [
    ("IMG_8716", 5515),
    ("IMG_8138", 793),
    ("IMG_7385", 2876),
    ("IMG_7443", 4442),
    ("IMG_7595", 4710),
    ("IMG_7606", 4418),
    ("IMG_7726", 3971),
    ("IMG_8099", 396),
    ("IMG_7961", 1159),
    ("IMG_8467", 3734),
    ("IMG_8496", 3692),
]

def corregir(stem: str, bib_correcto: int) -> None:
    public_id = f"{CLOUDINARY_FOLDER}/{stem}"

    # Ver qué hay actualmente
    res = supabase.table("photos").select("bib_number").eq("cloudinary_public_id", public_id).execute()
    bibs_actuales = [r["bib_number"] for r in res.data]

    if not bibs_actuales:
        print(f"  ⚠  {stem}: no se encontró en Supabase, verificá el nombre")
        return

    if bibs_actuales == [bib_correcto]:
        print(f"  ✓  {stem}: ya tiene el dorsal {bib_correcto}, nada que hacer")
        return

    # Borrar todos los registros de esa foto
    supabase.table("photos").delete().eq("cloudinary_public_id", public_id).execute()

    # Insertar el correcto
    supabase.table("photos").insert({
        "bib_number": bib_correcto,
        "cloudinary_public_id": public_id,
        "race_name": RACE_NAME,
        "original_filename": f"{stem}.jpg",
    }).execute()

    print(f"  ✓  {stem}: {bibs_actuales} → {bib_correcto}")

if __name__ == "__main__":
    print(f"\nCorrigiendo {len(CORRECCIONES)} foto(s) en Supabase...\n{'─' * 50}")
    for stem, bib in CORRECCIONES:
        corregir(stem, bib)
    print(f"{'─' * 50}\nListo.")
