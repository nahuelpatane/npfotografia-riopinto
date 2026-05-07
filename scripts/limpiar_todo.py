#!/usr/bin/env python3
"""
limpiar_todo.py — Borra TODAS las fotos de Supabase y Cloudinary.
Usar antes de subir una nueva carrera desde cero.

Uso:
  python limpiar_todo.py
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
_load_dotenv(Path(__file__).parent / '.env')

def _require_env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"Error: la variable de entorno '{name}' no está definida.")
    return val

import cloudinary
import cloudinary.api
from supabase import create_client

cloudinary.config(
    cloud_name=_require_env("CLOUDINARY_CLOUD_NAME"),
    api_key=_require_env("CLOUDINARY_API_KEY"),
    api_secret=_require_env("CLOUDINARY_API_SECRET"),
)

supabase = create_client(
    _require_env("SUPABASE_URL"),
    _require_env("SUPABASE_SERVICE_ROLE_KEY"),
)

CLOUDINARY_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "npfotografia")

def limpiar_supabase() -> int:
    print("Borrando registros de Supabase...", end=" ", flush=True)
    result = supabase.table("photos").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    count = len(result.data) if result.data else 0
    print(f"✓  ({count} registros eliminados)")
    return count

def limpiar_cloudinary() -> int:
    print(f"Borrando imágenes de Cloudinary (carpeta: {CLOUDINARY_FOLDER})...")
    deleted = 0
    next_cursor = None

    while True:
        kwargs = {"type": "upload", "prefix": CLOUDINARY_FOLDER, "max_results": 500}
        if next_cursor:
            kwargs["next_cursor"] = next_cursor

        resources = cloudinary.api.resources(**kwargs)
        public_ids = [r["public_id"] for r in resources.get("resources", [])]

        if public_ids:
            cloudinary.api.delete_resources(public_ids)
            deleted += len(public_ids)
            print(f"  Eliminadas {deleted} imágenes...", flush=True)

        next_cursor = resources.get("next_cursor")
        if not next_cursor:
            break

    # Intentar borrar la carpeta también
    try:
        cloudinary.api.delete_folder(CLOUDINARY_FOLDER)
    except Exception:
        pass

    print(f"✓  Cloudinary limpio ({deleted} imágenes eliminadas)")
    return deleted

if __name__ == "__main__":
    print("=" * 56)
    print("  LIMPIEZA COMPLETA — Supabase + Cloudinary")
    print("=" * 56)
    print()

    confirm = input("¿Confirmas que querés borrar TODO? Escribí 'si' para continuar: ").strip().lower()
    if confirm != "si":
        print("Cancelado.")
        sys.exit(0)

    print()
    limpiar_supabase()
    limpiar_cloudinary()

    print()
    print("=" * 56)
    print("  Todo limpio. Ya podés correr indexar_fotos.py")
    print("=" * 56)
