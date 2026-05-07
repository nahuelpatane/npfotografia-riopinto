#!/usr/bin/env python3
"""
indexar_interactivo.py — Muestra cada foto, vos escribís el dorsal, el script sube y registra.
La foto se abre y se cierra automáticamente. Guarda en Supabase cada 10 fotos.

Uso:
  python indexar_interactivo.py --input ./fotos_originales
  python indexar_interactivo.py --input ./fotos_originales --rotate 270

Comandos:
  42          →  asignar un dorsal
  42 87 156   →  varios dorsales en la misma foto
  s           →  saltar esta foto
  q           →  guardar lo hecho hasta ahora y salir
"""

import os, sys, re, json, argparse, tempfile, threading, queue as _queue
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# .env
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

def _require_env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"Error: variable de entorno '{name}' no definida.")
    return val

# ---------------------------------------------------------------------------
# Librerías
# ---------------------------------------------------------------------------
import numpy as np
from PIL import Image as PILImage, ImageOps
import cloudinary, cloudinary.uploader
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

RACE_NAME         = os.environ.get("RACE_NAME", "Carrera")
CLOUDINARY_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "npfotografia")
SUPPORTED_EXT     = {".jpg", ".jpeg", ".png", ".webp"}

# ---------------------------------------------------------------------------
# Visor de imágenes (tkinter en hilo separado)
# ---------------------------------------------------------------------------
class _Viewer:
    """Muestra imágenes en una ventana tkinter que corre en su propio hilo."""

    def __init__(self):
        self._q: _queue.Queue = _queue.Queue()
        self._ready = threading.Event()
        t = threading.Thread(target=self._run, daemon=True)
        t.start()
        self._ready.wait(timeout=5)

    def _run(self):
        import tkinter as tk
        from PIL import ImageTk

        root = tk.Tk()
        root.title("NPFotografia")
        root.configure(bg="black")
        root.withdraw()

        label = tk.Label(root, bg="black")
        label.pack(fill="both", expand=True)

        photo_ref = [None]  # mantener referencia para evitar GC

        def poll():
            try:
                while True:
                    cmd, *args = self._q.get_nowait()
                    if cmd == "show":
                        pil_img, title = args
                        sw = root.winfo_screenwidth()
                        sh = root.winfo_screenheight()
                        pil_img = pil_img.copy()
                        pil_img.thumbnail((int(sw * 0.88), int(sh * 0.88)), PILImage.LANCZOS)
                        photo_ref[0] = ImageTk.PhotoImage(pil_img)
                        label.configure(image=photo_ref[0])
                        root.title(title)
                        root.deiconify()
                        root.lift()
                        root.focus_force()
                    elif cmd == "hide":
                        root.withdraw()
            except _queue.Empty:
                pass
            root.after(40, poll)

        self._ready.set()
        root.after(40, poll)
        root.mainloop()

    def show(self, img: PILImage.Image, title: str) -> None:
        self._q.put(("show", img, title))

    def hide(self) -> None:
        self._q.put(("hide",))


def _make_viewer() -> "_Viewer | None":
    try:
        import tkinter  # noqa: F401
        from PIL import ImageTk  # noqa: F401
        return _Viewer()
    except Exception:
        return None

# ---------------------------------------------------------------------------
# Orientación
# ---------------------------------------------------------------------------
def detect_cw_rotation(img: PILImage.Image) -> int:
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
# Upload
# ---------------------------------------------------------------------------
def prepare_image(img_path: Path, rotate_mode: str) -> tuple[PILImage.Image, int]:
    """Abre, corrige EXIF y rota. Devuelve (imagen, grados_rotados)."""
    img = PILImage.open(img_path)
    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')
    degrees = detect_cw_rotation(img) if rotate_mode == 'auto' else int(rotate_mode)
    return rotate_pil(img, degrees), degrees

def upload(img_path: Path, img: PILImage.Image) -> str:
    public_id = f"{CLOUDINARY_FOLDER}/{img_path.stem}"
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

# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------
def batch_upsert(records: list[dict]) -> None:
    if not records:
        return
    supabase.table("photos").upsert(
        records,
        on_conflict="bib_number,cloudinary_public_id"
    ).execute()

# ---------------------------------------------------------------------------
# Progreso
# ---------------------------------------------------------------------------
def load_progress(input_dir: Path) -> set[str]:
    p = input_dir / "progreso.json"
    if p.exists():
        try:
            return set(json.loads(p.read_text()).get("done", []))
        except Exception:
            pass
    return set()

def save_progress(input_dir: Path, done: set[str]) -> None:
    p = input_dir / "progreso.json"
    p.write_text(json.dumps({"done": sorted(done)}, indent=2, ensure_ascii=False))

# ---------------------------------------------------------------------------
# Loop principal
# ---------------------------------------------------------------------------
def run(input_dir: Path, rotate_mode: str) -> None:
    all_images = sorted([f for f in input_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXT])
    if not all_images:
        sys.exit("No se encontraron imágenes.")

    done = load_progress(input_dir)
    images = [f for f in all_images if f.name not in done]

    total_all = len(all_images)
    total     = len(images)
    pending: list[dict] = []
    skipped: list[str]  = []
    saved   = 0

    viewer = _make_viewer()
    if viewer is None:
        print("⚠  No se pudo iniciar el visor. Las fotos no se mostrarán automáticamente.")

    def flush(force: bool = False) -> None:
        nonlocal pending, saved
        if not pending:
            return
        if force or len(pending) >= 10:
            batch_upsert(pending)
            saved += len(pending)
            for r in pending:
                done.add(r["original_filename"])
            save_progress(input_dir, done)
            print(f"         💾 Guardado en Supabase ({saved} en total)")
            pending = []

    rot_label = "automática" if rotate_mode == 'auto' else f"{rotate_mode}° forzados"
    ya_hechas = total_all - total
    print(f"\n{'═'*60}")
    print(f"  {total_all} fotos en total  |  carrera: {RACE_NAME}  |  rotación: {rot_label}")
    if ya_hechas:
        print(f"  ✓ {ya_hechas} ya procesadas — retomando desde donde quedó")
    print(f"  Faltan: {total}  |  42 = un dorsal  |  42 87 = varios  |  s = saltar  |  q = salir")
    print(f"{'═'*60}\n")

    for i, img_path in enumerate(images, 1):
        num = ya_hechas + i  # posición real sobre el total
        # Cargar, rotar y mostrar
        try:
            img, deg = prepare_image(img_path, rotate_mode)
        except Exception as exc:
            print(f"[{num:>4}/{total_all}]  {img_path.name}  ⚠  no se pudo abrir: {exc}")
            skipped.append(img_path.name)
            continue

        if viewer:
            viewer.show(img, f"[{num}/{total_all}]  {img_path.name}")

        rot_info = f"  (rotada {deg}°)" if deg else ""
        print(f"[{num:>4}/{total_all}]  {img_path.name}{rot_info}")

        while True:
            raw = input("          Dorsal: ").strip().lower()

            if raw == 'q':
                if viewer:
                    viewer.hide()
                flush(force=True)
                print(f"✓  {saved} guardadas · {len(skipped)} saltadas · {total - i} sin procesar.")
                return

            if raw == 's':
                if viewer:
                    viewer.hide()
                skipped.append(img_path.name)
                print(f"          → saltada\n")
                break

            numeros = re.findall(r'\d+', raw)
            if not numeros:
                print("          ⚠  Ingresá número(s), 's' para saltar o 'q' para salir.")
                continue

            bibs = [int(n) for n in numeros]
            print(f"          Subiendo...", end=" ", flush=True)
            try:
                public_id = upload(img_path, img)
                for bib in bibs:
                    pending.append({
                        "bib_number": bib,
                        "cloudinary_public_id": public_id,
                        "race_name": RACE_NAME,
                        "original_filename": img_path.name,
                    })
                bib_str = ", ".join(f"#{b}" for b in bibs)
                print(f"✓  {bib_str}")
                if viewer:
                    viewer.hide()
                flush()
                print()
                break
            except Exception as exc:
                print(f"✗  ERROR: {exc}")
                print("          Intentá de nuevo o 's' para saltar.")

    flush(force=True)
    print(f"\n{'═'*60}")
    print(f"  Listo: {saved} indexadas  |  {len(skipped)} saltadas  |  {total} total")
    if skipped:
        print(f"  Saltadas: {', '.join(skipped)}")
    print(f"{'═'*60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Carpeta con las fotos")
    parser.add_argument(
        "--rotate", default="auto",
        help="Rotación CW: 'auto' (detecta por luminancia) o 0 / 90 / 180 / 270 (default: auto)"
    )
    args = parser.parse_args()
    run(Path(args.input).resolve(), args.rotate)
