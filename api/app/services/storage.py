from pathlib import Path
import uuid
import shutil
from ..config import WORK_DIR


def new_resume_id() -> str:
    return str(uuid.uuid4())


def resume_dir(resume_id: str) -> Path:
    d = WORK_DIR / resume_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_upload(resume_id: str, upload_path: Path):
    d = resume_dir(resume_id)
    orig = d / "original.docx"
    cur = d / "current.docx"
    shutil.copy2(upload_path, orig)
    shutil.copy2(upload_path, cur)


def get_current_path(resume_id: str) -> Path:
    return resume_dir(resume_id) / "current.docx"


def overwrite_current(resume_id: str, new_doc_path: Path):
    cur = get_current_path(resume_id)
    shutil.copy2(new_doc_path, cur)
