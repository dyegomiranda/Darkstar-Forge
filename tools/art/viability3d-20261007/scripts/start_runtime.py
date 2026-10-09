"""Start ONLY the isolated, pinned ComfyUI experiment (localhost port 8189)."""
import os, subprocess, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
python = root/'runtime/venv/bin/python'
source = root/'runtime/ComfyUI'
if not python.exists() or not (source/'main.py').exists():
    raise SystemExit('Runtime missing. See README.md; do not upgrade the original ComfyUI.')
expected = 'af89add63f71a487fde45efc7fba744f3455ae73'
actual = subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()
if actual != expected:
    raise SystemExit(f'Unvalidated ComfyUI revision: {actual}; expected {expected}')
for directory in ['diffusion_models','clip_vision','vae','geometry_estimation','background_removal']:
    target = root/'models'/directory
    if not target.exists():
        raise SystemExit(f'Missing models: {target}; run download_models.py first.')
    link = source/'models'/directory
    if not (link.is_symlink() and link.resolve() == target.resolve()):
        # A copied checkout may materialize links as ordinary directories.
        # Accept existing model copies only when all expected filenames/sizes match.
        expected_files = list(target.glob('*.safetensors'))
        if not expected_files or not all((link / file.name).is_file() and (link / file.name).stat().st_size == file.stat().st_size for file in expected_files):
            raise SystemExit(f'Unexpected model directory: {link}. No files replaced automatically.')
environment=dict(os.environ,OPENBLAS_NUM_THREADS='2',OMP_NUM_THREADS='2',MKL_NUM_THREADS='2')
command=[str(python),'main.py','--listen','127.0.0.1','--port','8189',
    '--disable-auto-launch','--disable-all-custom-nodes','--offline',
    '--disable-dynamic-vram','--lowvram','--reserve-vram','3','--cache-none',
    '--preview-method','none','--output-directory',str(root/'outputs'),
    '--input-directory',str(root/'inputs')]
print('Isolated Pixal3D experiment. Stop with Ctrl+C. Original ComfyUI is not modified.',flush=True)
try:
    completed=subprocess.run(command,cwd=source,env=environment)
    raise SystemExit(completed.returncode)
except KeyboardInterrupt:
    pass
