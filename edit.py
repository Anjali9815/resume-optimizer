# editing.py
from pathlib import Path
import re
from education_table_edit import EducationTableEditor
from summary_section_edit import SummaryEditor
from header_edit_class import HeaderEditor
from skills_edit import SkillsEditor
from experience_edit import ExperienceEditor

def sanitize_bullet_text(s: str) -> str:
    s = s.strip()
    # remove leading bullet chars like "•", "-", "*", "·"
    s = re.sub(r"^[\u2022\-\*\u00B7]+\s*", "", s)  # • - * ·
    # also remove accidental multiple leading bullets/spaces like "•    •    text"
    s = re.sub(r"^(?:[\u2022\-\*\u00B7]\s*)+", "", s)
    return s.strip()


def prompt_keep(label: str, old: str) -> str:
    val = input(f"{label} [{old}]: ").strip()
    return val if val else old


def read_multiline(prompt: str) -> str:
    print(prompt)
    print("Paste text. Press ENTER on empty line to finish.\n")
    lines = []
    while True:
        line = input()
        if line == "":
            break
        lines.append(line)
    return "\n".join(lines).strip()


def paste_bullets_done() -> list[str]:
    """
    Paste bullets where each bullet can span multiple lines.
    Blank line = next bullet.
    Type DONE on a new line to finish.
    Also removes any user-typed bullet characters (•, -, *) automatically.
    """
    print("\nPaste new bullets (you can include blank lines).")
    print("Type DONE on a new line to finish:\n")

    bullets: list[str] = []
    current: list[str] = []

    def flush_current():
        nonlocal current, bullets
        if not current:
            return
        text = " ".join(" ".join(current).split()).strip()
        text = sanitize_bullet_text(text)  # ✅ APPLY SANITIZER HERE
        if text:
            bullets.append(text)
        current = []

    while True:
        line = input()

        if line.strip() == "DONE":
            flush_current()
            break

        # blank line => new bullet
        if line.strip() == "":
            flush_current()
            continue

        current.append(line)

    return bullets


def edit_table_section_scoped(
    editor: ExperienceEditor,
    section_label: str,
    rp: Path,
    table_indices: list[int],
    out_suffix: str
):
    """
    One reusable editor for sections that look like:
    [table header (left | right)] + [bullets under it]

    IMPORTANT: bullets are anchored/scoped to the next table inside `table_indices`
    so Experience edits stay in Experience tables, and Projects edits stay in Project tables.
    """
    print(f"\nChoose {section_label}:")
    for i, ti in enumerate(table_indices, start=1):
        h = editor.get_table_header(ti)
        print(f"{i}) {h['left']}  |  {h['right']}")

    sel = int(input(f"Enter 1/{len(table_indices)}: ").strip())
    table_index = table_indices[sel - 1]

    # figure next anchor only inside this section
    next_table_override = None
    pos = table_indices.index(table_index)
    if pos < len(table_indices) - 1:
        next_table_override = table_indices[pos + 1]

    ans = input("\nDo you want to update the header (Y/N)? ").strip().lower()
    if ans == "y":
        h = editor.get_table_header(table_index)
        new_left = prompt_keep("Header Left", h["left"])
        new_right = prompt_keep("Header Right (Date)", h["right"])
        editor.update_header(table_index, new_left, new_right)

    bullets = editor.list_bullet_texts(table_index)
    print("\n=== Current Bullets ===")
    for i, b in enumerate(bullets):
        print(f"{i}) {b}")

    print("\nChoose bullet action:")
    print("1) Edit one bullet")
    print("2) Replace all bullets (paste)")
    mode = input("Enter 1/2: ").strip()

    if mode == "1":
        idx = int(input("Which bullet index? ").strip())
        new_text = input("New bullet text: ").strip()
        new_text = sanitize_bullet_text(new_text)  # ✅ also sanitize here
        editor.edit_bullet(table_index, idx, new_text)

    elif mode == "2":
        new_bullets = paste_bullets_done()

        sp = input("\nDo you want ONE blank line before the next header? (Y/N) [Y]: ").strip().lower()
        keep_space = True if sp == "" or sp == "y" else False

        editor.replace_all_bullets_scoped(
            table_index,
            new_bullets,
            next_table_override=next_table_override,
            keep_one_blank_line_before_next=keep_space
)

        updated = editor.list_bullet_texts(table_index)
        print(f"\n=== Updated Bullets (from DOC) [{len(updated)}] ===")
        for i, b in enumerate(updated):
            print(f"{i}) {b}")

    out_path = Path(__file__).parent / f"{rp.stem}_{out_suffix}.docx"
    editor.save(str(out_path))
    print("\n✅ Saved:", out_path)


def main():
    resume_path = "/Users/anjalijha/Desktop/resume/Orig_CA/matx/Anjali Jha Resume.docx"
    rp = Path(resume_path)

    if not rp.exists():
        print("❌ File not found.")
        return

    print("\nChoose what to edit:")
    print("1) Header (Location/Phone/Email/Links)")
    print("2) Summary")
    print("3) Education (table row)")
    print("4) Technical Skills")
    print("5) Experience (company header + bullets)")
    print("6) Projects (project header + bullets)")

    choice = input("Enter 1/2/3/4/5/6: ").strip()

    if choice == "1":
        editor = HeaderEditor(str(rp))
        cur = editor.get_current()
        print("\n=== Current Header ===")
        for k, v in cur.items():
            print(f"{k}: {v}")

        print("\n=== Edit Mode (Press Enter to keep existing) ===")
        new_location = prompt_keep("Location", cur["location"])
        new_phone = prompt_keep("Phone", cur["phone"])
        new_email = prompt_keep("Email", cur["email"])
        new_linkedin = prompt_keep("LinkedIn URL", cur["linkedin_url"])
        new_github = prompt_keep("GitHub URL", cur["github_url"])

        editor.update(new_location, new_phone, new_email, new_linkedin, new_github)
        out_path = Path(__file__).parent / f"{rp.stem}_HEADER_EDITED.docx"
        editor.save(str(out_path))
        print("\n✅ Saved:", out_path)

    elif choice == "2":
        editor = SummaryEditor(str(rp))
        print("\n=== Current SUMMARY ===")
        print(editor.get_current())

        new_summary = read_multiline("\n=== SUMMARY Edit Mode ===")
        editor.update(new_summary)

        out_path = Path(__file__).parent / f"{rp.stem}_SUMMARY_EDITED.docx"
        editor.save(str(out_path))
        print("\n✅ Saved:", out_path)

    elif choice == "3":
        editor = EducationTableEditor(str(rp), table_index=0, row_index=0)
        cur = editor.get_current()

        print("\n=== Current EDUCATION ===")
        print("Left :", cur["left"])
        print("Right:", cur["right"])

        print("\n=== Edit Mode (Press Enter to keep existing) ===")
        new_left = prompt_keep("Degree + University", cur["left"])
        new_right = prompt_keep("Date", cur["right"])

        editor.update(new_left, new_right)

        out_path = Path(__file__).parent / f"{rp.stem}_EDU_EDITED.docx"
        editor.save(str(out_path))
        print("\n✅ Saved:", out_path)

    elif choice == "4":
        editor = SkillsEditor(str(rp))

        print("\n=== Current TECHNICAL SKILLS ===")
        for line in editor.get_current_lines():
            print(line)

        print("\n=== Paste NEW TECHNICAL SKILLS section ===")
        print("Paste lines exactly as you want. Press ENTER on empty line to finish.\n")
        lines = []
        while True:
            line = input()
            if line == "":
                break
            lines.append(line)
        pasted = "\n".join(lines)

        editor.replace_whole_section(pasted)

        out_path = Path(__file__).parent / f"{rp.stem}_SKILLS_EDITED.docx"
        editor.save(str(out_path))
        print("\n✅ Saved:", out_path)

    elif choice == "5":
        exp = ExperienceEditor(str(rp))
        exp_tables = [1, 2, 3]
        edit_table_section_scoped(exp, "company", rp, exp_tables, "EXPERIENCE_EDITED")

    elif choice == "6":
        proj = ExperienceEditor(str(rp))
        proj_tables = [4, 5, 6]
        edit_table_section_scoped(proj, "project", rp, proj_tables, "PROJECTS_EDITED")

    else:
        print("❌ Invalid choice.")


if __name__ == "__main__":
    main()
