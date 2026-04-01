# SmartEdX Facial Recognition Server

DeepFace-powered face enrollment and verification service for SmartEdX.

- **Default port:** `8002`
- **Model:** `Facenet512`
- **Detector:** `RetinaFace`

---

## Setup

### 1. Install dependencies

```bash
uv sync
```

### 2. Configure environment

Copy `.env.example` to `.env` and adjust as needed:

```
PORT=8002
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
FACE_MODEL=Facenet512
DETECTOR_BACKEND=retinaface
DISTANCE_THRESHOLD=0.30
```

### 3. Run the server

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

---

## Fixing Corrupted / Incomplete Model Weights

On first run, DeepFace automatically downloads `facenet512_weights.h5` (~95 MB) from GitHub. If the download is interrupted, the file will be truncated and face extraction will fail with:

```
An exception occurred while loading the pre-trained weights from
~/.deepface/weights/facenet512_weights.h5.
This might have happened due to an interruption during the download.
```

### Fix — delete the corrupted file and let DeepFace re-download it

#### macOS / Linux

```bash
rm ~/.deepface/weights/facenet512_weights.h5
```

Then start the server (or run the snippet below) and DeepFace will download the file again automatically.

#### Windows (Command Prompt)

```cmd
del "%USERPROFILE%\.deepface\weights\facenet512_weights.h5"
```

#### Windows (PowerShell)

```powershell
Remove-Item "$env:USERPROFILE\.deepface\weights\facenet512_weights.h5"
```

---

### Verify the download completed successfully

After re-downloading, confirm the file is ~95 MB and not truncated:

#### macOS / Linux

```bash
ls -lh ~/.deepface/weights/facenet512_weights.h5
# Expected: ~95 MB
```

#### Windows (PowerShell)

```powershell
Get-Item "$env:USERPROFILE\.deepface\weights\facenet512_weights.h5" | Select-Object Length
# Expected: ~99614720 bytes (~95 MB)
```

You can also verify the file is a valid HDF5 file using Python:

```python
import h5py
with h5py.File("/path/to/facenet512_weights.h5", "r") as f:
    print("File OK, top-level keys:", list(f.keys()))
```

---

### Manual download (if automatic download keeps failing)

Download the file directly from the DeepFace model releases and place it in the weights folder:

**URL:** `https://github.com/serengil/deepface_models/releases/download/v1.0/facenet512_weights.h5`

#### macOS / Linux

```bash
mkdir -p ~/.deepface/weights
curl -L -o ~/.deepface/weights/facenet512_weights.h5 \
  https://github.com/serengil/deepface_models/releases/download/v1.0/facenet512_weights.h5
```

#### Windows (PowerShell)

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.deepface\weights"
Invoke-WebRequest `
  -Uri "https://github.com/serengil/deepface_models/releases/download/v1.0/facenet512_weights.h5" `
  -OutFile "$env:USERPROFILE\.deepface\weights\facenet512_weights.h5"
```

---

## Health Check

```
GET http://localhost:8002/health
```

Response:

```json
{
  "status": "ok",
  "model": "Facenet512",
  "detector": "retinaface"
}
```
