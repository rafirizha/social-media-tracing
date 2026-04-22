"use client";

import { useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const platformNotes = {
  tiktok: "TikTok berjalan full search-based. Hasil akan diambil dari query yang kamu isi.",
  instagram: "Instagram akan membuka browser Playwright. Login manual jika perlu, lalu tunggu sesuai waktu manual wait.",
  facebook_marketplace:
    "Facebook Marketplace akan membuka browser Playwright. Set login, lokasi, dan filter manual di browser yang terbuka sebelum timer manual wait habis.",
};

function trimText(value, maxLength = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "-";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getTableConfig(platform) {
  if (platform === "facebook_marketplace") {
    return [
      { key: "title", label: "Item", render: (result) => trimText(result.metadata?.title || result.title, 120) },
      { key: "price", label: "Price", render: (result) => trimText(result.metadata?.price || result.summary, 40) },
      {
        key: "seller_name",
        label: "Seller",
        render: (result) => trimText(result.metadata?.seller_name || result.metadata?.seller_text || result.actor, 80),
      },
      {
        key: "location",
        label: "Location",
        render: (result) => trimText(result.metadata?.location, 110),
      },
      {
        key: "seller_joined_text",
        label: "Joined",
        render: (result) => trimText(result.metadata?.seller_joined_text, 40),
      },
      {
        key: "url",
        label: "URL",
        render: (result) =>
          result.url ? (
            <a href={result.url} target="_blank" rel="noreferrer">
              Buka item
            </a>
          ) : (
            "-"
          ),
      },
    ];
  }

  if (platform === "instagram") {
    return [
      {
        key: "author_username",
        label: "Author",
        render: (result) => trimText(result.metadata?.author_username || result.actor, 60),
      },
      {
        key: "caption",
        label: "Caption",
        render: (result) => trimText(result.metadata?.caption || result.title, 160),
      },
      {
        key: "hashtags",
        label: "Hashtags",
        render: (result) => trimText(result.metadata?.hashtags || result.summary, 110),
      },
      {
        key: "source_seed",
        label: "Seed",
        render: (result) => trimText(result.metadata?.source_seed || result.source_label, 50),
      },
      {
        key: "post_type",
        label: "Type",
        render: (result) => trimText(result.metadata?.post_type, 24),
      },
      {
        key: "url",
        label: "URL",
        render: (result) =>
          result.url ? (
            <a href={result.url} target="_blank" rel="noreferrer">
              Buka post
            </a>
          ) : (
            "-"
          ),
      },
    ];
  }

  return [
    {
      key: "creator_username",
      label: "Username",
      render: (result) => trimText(result.metadata?.creator_username || result.actor, 60),
    },
    {
      key: "query",
      label: "Query",
      render: (result) => trimText(result.metadata?.query || result.source_label, 50),
    },
    {
      key: "followers_count",
      label: "Followers",
      render: (result) => trimText(result.metadata?.followers_count, 24),
    },
    {
      key: "location_snippet",
      label: "Snippet",
      render: (result) => trimText(result.metadata?.location_snippet || result.summary, 140),
    },
    {
      key: "profile_url",
      label: "Profile",
      render: (result) => {
        const profileUrl = result.metadata?.profile_url;
        return profileUrl ? (
          <a href={profileUrl} target="_blank" rel="noreferrer">
            Buka profil
          </a>
        ) : (
          "-"
        );
      },
    },
    {
      key: "url",
      label: "Video",
      render: (result) =>
        result.url ? (
          <a href={result.url} target="_blank" rel="noreferrer">
            Buka video
          </a>
        ) : (
          "-"
        ),
    },
  ];
}

export default function RunForm({ initialRuns }) {
  const [form, setForm] = useState({
    platform: "tiktok",
    query: "",
    region: "Anambas",
    max_results: 20,
    manual_wait_seconds: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);
  const [runs, setRuns] = useState(initialRuns || []);

  const activeNote = useMemo(() => platformNotes[form.platform], [form.platform]);
  const tableConfig = useMemo(
    () => getTableConfig(selectedRun?.platform || form.platform),
    [selectedRun?.platform, form.platform]
  );
  const isQueryOptional = form.platform === "facebook_marketplace";

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSelectedRun(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          max_results: Number(form.max_results),
          manual_wait_seconds: Number(form.manual_wait_seconds),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "Run gagal dijalankan");
      }

      setSelectedRun(payload);
      setRuns((current) => [payload, ...current.filter((item) => item.id !== payload.id)]);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  async function openRun(runId) {
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/runs/${runId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "Gagal mengambil detail run");
      }
      setSelectedRun(payload);
    } catch (detailError) {
      setError(detailError.message);
    }
  }

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Tracing MVP</p>
          <h1>Multi-platform scraper dashboard untuk localhost</h1>
          <p className="hero-copy">
            Fondasi tetap scalable karena platform, query, dan wilayah diperlakukan sebagai input runtime.
            Untuk MVP ini flow-nya sengaja sempit: pilih platform, jalankan scrape, lalu lihat hasil di tabel.
          </p>
        </div>
        <div className="hero-card">
          <div className="metric">
            <span>Total run</span>
            <strong>{runs.length}</strong>
          </div>
          <div className="metric">
            <span>API default</span>
            <strong>{API_BASE_URL}</strong>
          </div>
        </div>
      </section>

      <section className="grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-head">
            <h2>Run scraper</h2>
            <p>{activeNote}</p>
          </div>

          <label>
            Platform
            <select
              value={form.platform}
              onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}
            >
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="facebook_marketplace">Facebook Marketplace</option>
            </select>
          </label>

          <label>
            Query {isQueryOptional ? "(optional)" : ""}
            <input
              type="text"
              placeholder={isQueryOptional ? "boleh kosong untuk ambil hasil dari filter manual" : "contoh: umkm batam"}
              value={form.query}
              onChange={(event) => setForm((current) => ({ ...current, query: event.target.value }))}
              required={!isQueryOptional}
            />
          </label>

          <label>
            Region
            <input
              type="text"
              value={form.region}
              onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
            />
          </label>

          <div className="row">
            <label>
              Max results
              <input
                type="number"
                min="1"
                max="100"
                value={form.max_results}
                onChange={(event) => setForm((current) => ({ ...current, max_results: event.target.value }))}
              />
            </label>

            <label>
              Manual wait (detik)
              <input
                type="number"
                min="0"
                max="300"
                value={form.manual_wait_seconds}
                onChange={(event) =>
                  setForm((current) => ({ ...current, manual_wait_seconds: event.target.value }))
                }
              />
            </label>
          </div>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Running..." : "Run sekarang"}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </form>

        <div className="panel history-panel">
          <div className="panel-head">
            <h2>Riwayat run</h2>
            <p>Klik salah satu run untuk melihat hasil terakhir.</p>
          </div>

          <div className="history-list">
            {runs.length === 0 ? <p className="empty-text">Belum ada run.</p> : null}
            {runs.map((run) => (
              <button key={run.id} className="history-item" type="button" onClick={() => openRun(run.id)}>
                <strong>#{run.id}</strong>
                <span>{run.platform}</span>
                <span>{run.query}</span>
                <span>{run.status}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel results-panel">
        <div className="panel-head">
          <h2>Hasil</h2>
          <p>
            {selectedRun
              ? `Run #${selectedRun.id} selesai dengan status ${selectedRun.status} dan ${selectedRun.result_count} hasil.`
              : "Jalankan scraper atau pilih run dari riwayat."}
          </p>
        </div>

        {selectedRun ? (
          <>
            <div className="run-meta">
              <span>Platform: {selectedRun.platform}</span>
              <span>Query: {selectedRun.query}</span>
              <span>Region: {selectedRun.region}</span>
              <span>Dibuat: {formatDate(selectedRun.created_at)}</span>
              <span>Selesai: {formatDate(selectedRun.completed_at)}</span>
            </div>

            {selectedRun.error_message ? <p className="error-text">{selectedRun.error_message}</p> : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {tableConfig.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedRun.results?.length ? (
                    selectedRun.results.map((result) => (
                      <tr key={result.id}>
                        {tableConfig.map((column) => (
                          <td key={`${result.id}-${column.key}`}>{column.render(result)}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={tableConfig.length}>Tidak ada hasil untuk run ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedRun.log_excerpt ? (
              <details className="log-box">
                <summary>Log scraper</summary>
                <pre>{selectedRun.log_excerpt}</pre>
              </details>
            ) : null}
          </>
        ) : (
          <p className="empty-text">Belum ada run yang dipilih.</p>
        )}
      </section>
    </div>
  );
}
