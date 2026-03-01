import { useRef, useState } from "react";
import {
  uploadResume,
  getPreview,
  patchSummary,
  type UploadResponse,
  type PreviewResponse,
} from "./lib/api";

function App() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [info, setInfo] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ✅ Summary editor state
  const [summaryDraft, setSummaryDraft] = useState("");
  const [patchMsg, setPatchMsg] = useState<string | null>(null);
  const [patching, setPatching] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setSelectedSection(null);
    setPreview(null);
    setPatchMsg(null);

    try {
      const res = await uploadResume(file);
      setInfo(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSectionClick(section: string) {
    if (!info) return;

    setSelectedSection(section);
    setLoadingPreview(true);
    setPatchMsg(null);

    try {
      const data = await getPreview(info.resume_id, section);
      setPreview(data);

      // ✅ Prefill editor when SUMMARY is selected
      if (section === "SUMMARY") {
        setSummaryDraft(data.preview_text);
      }
    } catch (err: any) {
      console.error(err);
      setPatchMsg(err?.response?.data?.detail ?? err?.message ?? "Preview failed");
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/10 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Resume Studio</h1>
          <p className="text-sm text-gray-300">Upload • Preview • Patch • Download</p>
        </div>
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
                      selectedSection === sec
                        ? "bg-indigo-600"
                        : "bg-white/10 hover:bg-white/20"
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
            {loadingPreview
              ? "Loading preview..."
              : preview?.preview_text ?? "Select a section to view preview."}
          </div>

          {/* ✅ Patch Summary UI */}
          {info && selectedSection === "SUMMARY" && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Edit Summary</h3>

              <textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                className="w-full min-h-[140px] rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-400/60"
              />

              <div className="flex items-center gap-3 mt-3">
                <button
                  disabled={patching}
                  onClick={async () => {
                    if (!info) return;
                    setPatching(true);
                    setPatchMsg(null);
                    try {
                      const res = await patchSummary(info.resume_id, summaryDraft);
                      setPatchMsg(res.message || "Summary patched ✅");

                      // refresh preview after patch
                      const updated = await getPreview(info.resume_id, "SUMMARY");
                      setPreview(updated);
                      setSummaryDraft(updated.preview_text);
                    } catch (e: any) {
                      setPatchMsg(e?.response?.data?.detail ?? e?.message ?? "Patch failed");
                    } finally {
                      setPatching(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 transition px-4 py-2 rounded-lg shadow-lg disabled:opacity-50"
                >
                  {patching ? "Patching..." : "Patch Summary"}
                </button>

                {patchMsg && (
                  <div className="text-sm text-gray-200 bg-white/10 border border-white/10 rounded-lg px-3 py-2">
                    {patchMsg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;