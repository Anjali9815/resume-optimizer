from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent.parent  # points to resume-optimizer/
WORK_DIR = REPO_ROOT / ".work"      # temp storage for uploaded/edited docs
WORK_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_MB = 10
