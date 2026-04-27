import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import type { MeResponse } from "../types";

export function SettingsPage() {
  const api = useApi();
  const { user } = useUser();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setMe(await api.get<MeResponse>("/api/me"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      }
    })();
  }, [api]);

  return (
    <>
      <PageHeader title="Settings" description="Account information and configuration status." />
      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Profile</h3>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <Field label="Name" value={user?.fullName ?? "—"} />
            <Field label="Email" value={user?.primaryEmailAddress?.emailAddress ?? "—"} />
            <Field label="User ID" value={user?.id ?? me?.userId ?? "—"} mono />
            <Field label="Created" value={user?.createdAt ? new Date(user.createdAt).toLocaleString() : "—"} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Server configuration</h3>
            <p className="card-sub">Set in <span className="kbd">web/server/.env</span></p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <ConfigRow
              label="OpenAI API key"
              ok={Boolean(me?.config.openAiConfigured)}
              hint={me?.config.openAiConfigured ? "Configured" : "Set OPENAI_API_KEY in web/server/.env"}
            />
            <ConfigRow label="Clerk auth" ok={true} hint="Active for this session" />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Usage summary</h3>
          </div>
          {!me ? (
            <div className="muted">Loading…</div>
          ) : (
            <div className="grid-stats">
              <Mini label="Resumes" value={me.counts.resumes} />
              <Mini label="Evaluations" value={me.counts.evaluations} />
              <Mini label="Optimizations" value={me.counts.optimizations} />
              <Mini label="Roadmaps" value={me.counts.roadmaps} />
              <Mini label="Scan results" value={me.counts.scanResults} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
      <div className="muted" style={{ fontSize: 12, minWidth: 100 }}>{label}</div>
      <div className={mono ? "mono" : ""} style={{ textAlign: "right", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

function ConfigRow({ label, ok, hint }: { label: string; ok: boolean; hint?: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {hint && <div className="muted" style={{ fontSize: 12 }}>{hint}</div>}
      </div>
      <span className={`badge ${ok ? "success" : "warn"}`}>{ok ? "Ready" : "Action needed"}</span>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
