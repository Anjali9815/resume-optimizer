from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import shutil

from ..models import (
    UploadResponse, SectionsResponse, PreviewResponse, PatchResponse,
    PatchHeaderRequest, PatchSummaryRequest, PatchEducationRequest,
    PatchSkillsRequest, PatchBulletsRequest
)

from ..services.storage import new_resume_id, resume_dir, save_upload, get_current_path
from ..services.editor import (
    analyze_resume, apply_header_patch, apply_summary_patch, apply_education_patch,
    apply_skills_patch, apply_bullets_patch
)
from ..services.preview import preview_section_text


router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/upload", response_model=UploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx supported")

    rid = new_resume_id()
    d = resume_dir(rid)
    upload_path = d / file.filename

    with upload_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    save_upload(rid, upload_path)

    headers, tbl_count, _map = analyze_resume(rid)

    return UploadResponse(
        resume_id=rid,
        detected_sections=headers,
        tables_found=tbl_count
    )


@router.get("/{resume_id}/sections", response_model=SectionsResponse)
def get_sections(resume_id: str):
    headers, _, mapping = analyze_resume(resume_id)
    return SectionsResponse(resume_id=resume_id, detected_sections=headers, section_tables=mapping)


@router.get("/{resume_id}/preview/{section}", response_model=PreviewResponse)
def get_preview(resume_id: str, section: str, table_index: int | None = None):
    cur = str(get_current_path(resume_id))
    text = preview_section_text(cur, section.upper(), table_index=table_index)
    return PreviewResponse(resume_id=resume_id, section=section.upper(), preview_text=text, meta={"table_index": table_index})


@router.patch("/{resume_id}/header", response_model=PatchResponse)
def patch_header(resume_id: str, payload: PatchHeaderRequest):
    apply_header_patch(resume_id, payload)
    return PatchResponse(resume_id=resume_id, section="HEADER", message="Header updated.")


@router.patch("/{resume_id}/summary", response_model=PatchResponse)
def patch_summary(resume_id: str, payload: PatchSummaryRequest):
    apply_summary_patch(resume_id, payload)
    return PatchResponse(resume_id=resume_id, section="SUMMARY", message="Summary updated.")


@router.patch("/{resume_id}/education", response_model=PatchResponse)
def patch_education(resume_id: str, payload: PatchEducationRequest):
    apply_education_patch(resume_id, payload)
    return PatchResponse(resume_id=resume_id, section="EDUCATION", message="Education updated.")


@router.patch("/{resume_id}/skills", response_model=PatchResponse)
def patch_skills(resume_id: str, payload: PatchSkillsRequest):
    apply_skills_patch(resume_id, payload)
    return PatchResponse(resume_id=resume_id, section="TECHNICAL SKILLS", message="Skills updated.")


@router.patch("/{resume_id}/{section}/bullets", response_model=PatchResponse)
def patch_bullets(resume_id: str, section: str, payload: PatchBulletsRequest):
    sec = section.upper()
    if sec not in ("EXPERIENCE", "PROJECTS"):
        raise HTTPException(status_code=400, detail="section must be EXPERIENCE or PROJECTS")

    apply_bullets_patch(resume_id, sec, payload)
    return PatchResponse(resume_id=resume_id, section=sec, message=f"{sec} bullets updated.")


@router.get("/{resume_id}/download")
def download_resume(resume_id: str):
    cur = get_current_path(resume_id)
    if not cur.exists():
        raise HTTPException(status_code=404, detail="Resume not found")
    return FileResponse(
        path=str(cur),
        filename="resume_updated.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
