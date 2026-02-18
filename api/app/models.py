from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class UploadResponse(BaseModel):
    resume_id: str
    detected_sections: List[str]
    tables_found: int


class SectionsResponse(BaseModel):
    resume_id: str
    detected_sections: List[str]
    section_tables: Dict[str, List[int]]  # e.g. {"EXPERIENCE":[1,2,3], "PROJECTS":[4,5,6]}


class PatchHeaderRequest(BaseModel):
    location: str | None = None
    phone: str | None = None
    email: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None


class PatchSummaryRequest(BaseModel):
    summary: str


class PatchEducationRequest(BaseModel):
    left: str | None = None
    right: str | None = None


class PatchBulletsRequest(BaseModel):
    # for Experience/Projects
    table_index: int
    update_header: bool = False
    header_left: Optional[str] = None
    header_right: Optional[str] = None

    # one of these:
    replace_all: bool = True
    bullets: List[str] = Field(default_factory=list)

    # spacing option
    keep_one_blank_line_before_next: bool = True


class PatchSkillsRequest(BaseModel):
    # full section replacement
    lines: List[str]


class PreviewResponse(BaseModel):
    resume_id: str
    section: str
    preview_text: str
    meta: Dict[str, Any] = Field(default_factory=dict)


class PatchResponse(BaseModel):
    resume_id: str
    section: str
    message: str
