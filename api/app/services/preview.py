from docx import Document
from typing import Tuple


def preview_section_text(doc_path: str, section: str, table_index: int | None = None) -> str:
    doc = Document(doc_path)
    if section in ("EXPERIENCE", "PROJECTS") and table_index is not None:
        tbl = doc.tables[table_index]
        row = tbl.rows[0]
        left = row.cells[0].text.strip()
        right = row.cells[1].text.strip()

        # bullets after table (simple preview)
        # note: this is only preview text; editor has the real bullet logic
        bullets = []
        started = False
        # find table in body is harder; for preview we can just show header + bullets in nearby paras
        # minimal preview:
        return f"{left} | {right}\n(Bullets updated — download to see exact formatting.)"

    # generic fallback: return first occurrence of section header + next few paragraphs
    lines = []
    hit = False
    for p in doc.paragraphs:
        txt = (p.text or "").strip()
        if not txt:
            continue
        if txt == section:
            hit = True
            continue
        if hit:
            # stop at next all-caps header
            if txt.isupper() and len(txt) < 40:
                break
            lines.append(txt)
            if len(lines) >= 10:
                break

    if not lines:
        return f"(No preview text found for {section}. Download to verify.)"
    return "\n".join(lines)
