import { useRef, useState } from "react";
import { useApi } from "../lib/api";
import type { ResumeSummary } from "../types";

interface Props {
  onUploaded?: (resume: ResumeSummary) => void;
}

const ACCEPT = ".pdf,.docx,.md,.markdown,.txt";

export function ResumeUploader({ onUploaded }: Props) {
  const api = useApi();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, name?: string, setActive = true) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (name) fd.append("name", name);
      fd.append("setActive", String(setActive));
      const created = await api.upload<ResumeSummary>("/api/resumes/upload", fd);
      onUploaded?.(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    void uploadFile(file, file.name.replace(/\.[^.]+$/, ""));
  }

  return (
    <div className="stack">
      <div
        className={`dropzone${drag ? " drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
      >
        <div style={{ fontSize: 28 }} aria-hidden>↥</div>
        <div style={{ fontWeight: 600, marginTop: 4 }}>
          {busy ? "Uploading…" : "Drop resume here or click to browse"}
        </div>
        <div className="hint">Accepts PDF, DOCX, Markdown (.md), or plain text (.txt) - up to 10 MB.</div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <div className="callout danger">{error}</div>}
    </div>
  );
}
