import { useRef, useState } from "react";
import {
  uploadResume,
  getPreview,
  getSections,
  patchSummary,
  patchSkills,
  patchEducation,
  patchBullets,
  resumeDownloadUrl,
  type UploadResponse,
  type PreviewResponse,
  type SectionsResponse,
  type PatchBulletsRequest,
} from "./lib/api";

function App() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [info, setInfo] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ✅ mapping like {"EXPERIENCE":[1,2,3], "PROJECTS":[4,5]}
  const [sectionTables, setSectionTables] = useState<Record<string, number[]>>({});

  // shared patch state
  const [patchMsg, setPatchMsg] = useState<string | null>(null);
  const [patching, setPatching] = useState(false);

  // Summary editor
  const [summaryDraft, setSummaryDraft] = useState("");

  // Skills editor
  const [skillsDraft, setSkillsDraft] = useState("");

  // Education editor
  const [eduLeft, setEduLeft] = useState("");
  const [eduRight, setEduRight] = useState("");

  // Experience / Projects editor
  const [tableIndex, setTableIndex] = useState<number | null>(null);
  const [updateHeader, setUpdateHeader] = useState(false);
  const [headerLeft, setHeaderLeft] = useState("");
  const [headerRight, setHeaderRight] = useState("");
  const [bulletsDraft, setBulletsDraft] = useState("");

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setSelectedSection(null);
    setPreview(null);
    setPatchMsg(null);
    setSectionTables({});
    setTableIndex(null);

    try {
      const res = await uploadResume(file);
      setInfo(res);

      // ✅ fetch section -> table indices mapping
      const s: SectionsResponse = await getSections(res.resume_id);
      setSectionTables(s.section_tables ?? {});
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function resetBulletsEditor() {
    setUpdateHeader(false);
    setHeaderLeft("");
    setHeaderRight("");
    setBulletsDraft("");
  }

  async function handleSectionClick(section: string) {
    if (!info) return;

    setSelectedSection(section);
    setLoadingPreview(true);
    setPatchMsg(null);

    // reset unrelated drafts
    if (section !== "SUMMARY") setSummaryDraft("");
    if (section !== "TECHNICAL SKILLS") setSkillsDraft("");
    if (section !== "EDUCATION") {
      setEduLeft("");
      setEduRight("");
    }
    if (section !== "EXPERIENCE" && section !== "PROJECTS") {
      resetBulletsEditor();
      setTableIndex(null);
    }

    try {
      // ✅ SPECIAL: EXPERIENCE/PROJECTS should load ONLY selected table_index
      if (section === "EXPERIENCE" || section === "PROJECTS") {
        const indices = sectionTables[section] ?? [];
        const defaultIdx = indices.length ? indices[0] : 0;

        setTableIndex(defaultIdx);

        const single = await getPreview(info.resume_id, section, defaultIdx);
        setPreview(single);

        // Extract header automatically
        const lines = single.preview_text.split("\n");
        const headerLine = lines[0] || "";

        if (headerLine.includes("|")) {
          const parts = headerLine.split("|");
          setHeaderLeft(parts[0]?.trim() ?? "");
          setHeaderRight(parts[1]?.trim() ?? "");
        } else {
          setHeaderLeft(headerLine.trim());
          setHeaderRight("");
        }

        // remove header line from bullet draft
        setBulletsDraft(lines.slice(1).join("\n"));
        setLoadingPreview(false);
        return;
      }

      // normal preview for other sections
      const data = await getPreview(info.resume_id, section);
      setPreview(data);

      if (section === "SUMMARY") setSummaryDraft(data.preview_text);
      if (section === "TECHNICAL SKILLS") setSkillsDraft(data.preview_text);

      if (section === "EDUCATION") {
        const firstLine = (data.preview_text || "").split("\n")[0] ?? "";
        const parts = firstLine.split(/\s{2,}|\s\|\s/);
        setEduLeft(parts[0]?.trim() ?? "");
        setEduRight(parts.slice(1).join(" ").trim() ?? "");
      }
    } catch (err: any) {
      console.error(err);
      setPatchMsg(err?.response?.data?.detail ?? err?.message ?? "Preview failed");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function doPatchSummary() {
    if (!info) return;
    setPatching(true);
    setPatchMsg(null);

    try {
      const res = await patchSummary(info.resume_id, summaryDraft);
      setPatchMsg(res.message || "Summary patched ✅");

      const updated = await getPreview(info.resume_id, "SUMMARY");
      setPreview(updated);
      setSummaryDraft(updated.preview_text);
    } catch (e: any) {
      setPatchMsg(e?.response?.data?.detail ?? e?.message ?? "Patch failed");
    } finally {
      setPatching(false);
    }
  }

  async function doPatchSkills() {
    if (!info) return;
    setPatching(true);
    setPatchMsg(null);

    try {
      const lines = skillsDraft
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      const res = await patchSkills(info.resume_id, lines);
      setPatchMsg(res.message || "Skills patched ✅");

      const updated = await getPreview(info.resume_id, "TECHNICAL SKILLS");
      setPreview(updated);
      setSkillsDraft(updated.preview_text);
    } catch (e: any) {
      setPatchMsg(e?.response?.data?.detail ?? e?.message ?? "Patch failed");
    } finally {
      setPatching(false);
    }
  }

  async function doPatchEducation() {
    if (!info) return;
    setPatching(true);
    setPatchMsg(null);

    try {
      const res = await patchEducation(
        info.resume_id,
        eduLeft.trim() || null,
        eduRight.trim() || null
      );
      setPatchMsg(res.message || "Education patched ✅");

      const updated = await getPreview(info.resume_id, "EDUCATION");
      setPreview(updated);
    } catch (e: any) {
      setPatchMsg(e?.response?.data?.detail ?? e?.message ?? "Patch failed");
    } finally {
      setPatching(false);
    }
  }

  function normalizeBullets(text: string): string[] {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[-•*]\s+/, ""));
  }

  async function doPatchBullets(
    apiSection: "experience" | "projects",
    previewSection: "EXPERIENCE" | "PROJECTS"
  ) {
    if (!info) return;

    const idx = tableIndex ?? 0;
    const bullets = normalizeBullets(bulletsDraft);

    const payload: PatchBulletsRequest = {
      table_index: idx,
      update_header: updateHeader,
      header_left: updateHeader ? (headerLeft.trim() || null) : null,
      header_right: updateHeader ? (headerRight.trim() || null) : null,
      replace_all: true,
      bullets,
      keep_one_blank_line_before_next: true,
    };

    setPatching(true);
    setPatchMsg(null);

    try {
      const res = await patchBullets(info.resume_id, apiSection, payload);
      setPatchMsg(res.message || `${previewSection} updated ✅`);

      // ✅ IMPORTANT: refresh ONLY the same table_index preview
      const updated = await getPreview(info.resume_id, previewSection, idx);
      setPreview(updated);
      setBulletsDraft(updated.preview_text);
    } catch (e: any) {
      setPatchMsg(e?.response?.data?.detail ?? e?.message ?? "Patch failed");
    } finally {
      setPatching(false);
    }
  }

  const availableTableIndices =
    selectedSection ? sectionTables[selectedSection] ?? [] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/10 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Resume Studio</h1>
          <p className="text-sm text-gray-300">Upload • Preview • Patch • Download</p>
        </div>

        {info ? (
          <a
            href={resumeDownloadUrl(info.resume_id)}
            className="bg-indigo-600 hover:bg-indigo-500 transition px-4 py-2 rounded-lg shadow-lg"
          >
            Download
          </a>
        ) : (
          <button className="bg-indigo-600/40 px-4 py-2 rounded-lg cursor-not-allowed" disabled>
            Download
          </button>
        )}
      </header>

      <main className="grid md:grid-cols-2 gap-8 p-8">
        {/* Upload + Sections */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-semibold mb-4">Upload Resume</h2>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="border-2 border-dashed border-indigo-400/40 rounded-xl p-10 text-center hover:bg-white/5 transition cursor-pointer"
          >
            <p className="text-indigo-300 font-medium">
              {uploading ? "Uploading…" : "Drag & Drop Resume Here"}
            </p>
            <p className="text-sm text-gray-400 mt-2">PDF or DOCX (click to browse)</p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {info && (
            <div className="mt-6">
              <div className="text-sm text-gray-300 mb-2">Resume ID: {info.resume_id}</div>

              <div className="flex flex-wrap gap-2">
                {info.detected_sections.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => handleSectionClick(sec)}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      selectedSection === sec ? "bg-indigo-600" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview + Patch Panel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>

          <div className="bg-black/40 rounded-xl p-4 min-h-[250px] text-gray-300 overflow-auto whitespace-pre-wrap">
            {loadingPreview ? "Loading preview..." : preview?.preview_text ?? "Select a section to view preview."}
          </div>

          {patchMsg && (
            <div className="mt-3 text-sm text-gray-200 bg-white/10 border border-white/10 rounded-lg px-3 py-2">
              {patchMsg}
            </div>
          )}

          {/* SUMMARY */}
          {info && selectedSection === "SUMMARY" && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Edit Summary</h3>
              <textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                className="w-full min-h-[140px] rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-400/60"
              />
              <div className="mt-3">
                <button
                  disabled={patching}
                  onClick={doPatchSummary}
                  className="bg-emerald-600 hover:bg-emerald-500 transition px-4 py-2 rounded-lg shadow-lg disabled:opacity-50"
                >
                  {patching ? "Patching..." : "Patch Summary"}
                </button>
              </div>
            </div>
          )}

          {/* TECHNICAL SKILLS */}
          {info && selectedSection === "TECHNICAL SKILLS" && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Edit Technical Skills</h3>
              <textarea
                value={skillsDraft}
                onChange={(e) => setSkillsDraft(e.target.value)}
                className="w-full min-h-[140px] rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-400/60"
              />
              <div className="mt-3">
                <button
                  disabled={patching}
                  onClick={doPatchSkills}
                  className="bg-emerald-600 hover:bg-emerald-500 transition px-4 py-2 rounded-lg shadow-lg disabled:opacity-50"
                >
                  {patching ? "Patching..." : "Patch Skills"}
                </button>
              </div>
            </div>
          )}

          {/* EDUCATION */}
          {info && selectedSection === "EDUCATION" && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Edit Education (Header Row)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-300 mb-1">Left</div>
                  <input
                    value={eduLeft}
                    onChange={(e) => setEduLeft(e.target.value)}
                    className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-400/60"
                    placeholder="University / Degree"
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-300 mb-1">Right</div>
                  <input
                    value={eduRight}
                    onChange={(e) => setEduRight(e.target.value)}
                    className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-400/60"
                    placeholder="Dates / Location"
                  />
                </div>
              </div>

              <div className="mt-3">
                <button
                  disabled={patching}
                  onClick={doPatchEducation}
                  className="bg-emerald-600 hover:bg-emerald-500 transition px-4 py-2 rounded-lg shadow-lg disabled:opacity-50"
                >
                  {patching ? "Patching..." : "Patch Education"}
                </button>
              </div>
            </div>
          )}

          {/* EXPERIENCE + PROJECTS (NOW PER table_index preview) */}
          {info && (selectedSection === "EXPERIENCE" || selectedSection === "PROJECTS") && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Edit {selectedSection} (Bullets)</h3>

              <div className="flex items-center gap-3 mb-3">
                <div className="text-xs text-gray-300">Table Index</div>

                <select
                  value={tableIndex ?? 0}
                  onChange={async (e) => {
                    const idx = Number(e.target.value);
                    setTableIndex(idx);

                    if (!info || !selectedSection) return;

                    setLoadingPreview(true);
                    setPatchMsg(null);

                    try {
                      const single = await getPreview(info.resume_id, selectedSection, idx);
                      setPreview(single);
                      setBulletsDraft(single.preview_text);
                    } finally {
                      setLoadingPreview(false);
                    }
                  }}
                  className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none"
                >
                  {(availableTableIndices.length ? availableTableIndices : [0]).map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={updateHeader}
                    onChange={(e) => setUpdateHeader(e.target.checked)}
                  />
                  Update header row
                </label>
              </div>

              {updateHeader && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    value={headerLeft}
                    onChange={(e) => setHeaderLeft(e.target.value)}
                    className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-400/60"
                    placeholder="Header Left (e.g., Company | Role)"
                  />
                  <input
                    value={headerRight}
                    onChange={(e) => setHeaderRight(e.target.value)}
                    className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-400/60"
                    placeholder="Header Right (e.g., Dates | Location)"
                  />
                </div>
              )}

              <textarea
                value={bulletsDraft}
                onChange={(e) => setBulletsDraft(e.target.value)}
                className="w-full min-h-[180px] rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-400/60"
                placeholder={`Write one bullet per line.\nExample:\nBuilt X using Y, improving Z by 20%.\nOptimized pipeline, reducing cost by $5k/month.`}
              />

              <div className="mt-3">
                <button
                  disabled={patching}
                  onClick={() => {
                    if (selectedSection === "EXPERIENCE") {
                      doPatchBullets("experience", "EXPERIENCE");
                    } else {
                      doPatchBullets("projects", "PROJECTS");
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 transition px-4 py-2 rounded-lg shadow-lg disabled:opacity-50"
                >
                  {patching ? "Patching..." : `Patch ${selectedSection}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;