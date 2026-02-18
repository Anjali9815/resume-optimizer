from pathlib import Path
import sys
from pathlib import Path

# Add repo root to sys.path so we can import existing modules at repo root
REPO_ROOT = Path(__file__).resolve().parents[3]   # api/app/services -> api/app -> api -> repo
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


from ..services.storage import get_current_path, overwrite_current
from ..services.doc_parse import detect_headers, scan_tables_text_date, section_table_map

# reuse your existing modules from repo root
from header_edit_class import HeaderEditor
from summary_section_edit import SummaryEditor
from education_table_edit import EducationTableEditor
from skills_edit import SkillsEditor
from experience_edit import ExperienceEditor


def analyze_resume(resume_id: str):
    cur = str(get_current_path(resume_id))
    headers = detect_headers(cur)
    tables = scan_tables_text_date(cur)
    mapping = section_table_map(headers, tables)
    return headers, len(tables), mapping


def apply_header_patch(resume_id: str, payload):
    cur = get_current_path(resume_id)
    editor = HeaderEditor(str(cur))
    existing = editor.get_current()

    editor.update(
        payload.location or existing["location"],
        payload.phone or existing["phone"],
        payload.email or existing["email"],
        payload.linkedin_url or existing["linkedin_url"],
        payload.github_url or existing["github_url"],
    )

    tmp = cur.parent / "tmp.docx"
    editor.save(str(tmp))
    overwrite_current(resume_id, tmp)


def apply_summary_patch(resume_id: str, payload):
    cur = get_current_path(resume_id)
    editor = SummaryEditor(str(cur))
    editor.update(payload.summary)

    tmp = cur.parent / "tmp.docx"
    editor.save(str(tmp))
    overwrite_current(resume_id, tmp)


def apply_education_patch(resume_id: str, payload):
    cur = get_current_path(resume_id)
    editor = EducationTableEditor(str(cur), table_index=0, row_index=0)
    existing = editor.get_current()

    editor.update(payload.left or existing["left"], payload.right or existing["right"])

    tmp = cur.parent / "tmp.docx"
    editor.save(str(tmp))
    overwrite_current(resume_id, tmp)


def apply_skills_patch(resume_id: str, payload):
    cur = get_current_path(resume_id)
    editor = SkillsEditor(str(cur))
    text = "\n".join(payload.lines).strip()
    editor.replace_whole_section(text)

    tmp = cur.parent / "tmp.docx"
    editor.save(str(tmp))
    overwrite_current(resume_id, tmp)


def apply_bullets_patch(resume_id: str, section: str, payload):
    cur = get_current_path(resume_id)
    editor = ExperienceEditor(str(cur))

    if payload.update_header:
        if payload.header_left and payload.header_right:
            editor.update_header(payload.table_index, payload.header_left, payload.header_right)

    if payload.replace_all:
        editor.replace_all_bullets_scoped(
            payload.table_index,
            payload.bullets,
            next_table_override=None,  # UI will scope by providing table_index from section map
            keep_one_blank_line_before_next=payload.keep_one_blank_line_before_next
        )

    tmp = cur.parent / "tmp.docx"
    editor.save(str(tmp))
    overwrite_current(resume_id, tmp)
