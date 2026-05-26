"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const PLATFORM_LABELS = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook_marketplace: "Facebook Marketplace",
};

const STATUS_LABELS = {
  queued: "Menunggu",
  running: "Berjalan",
  completed: "Selesai",
  failed: "Gagal",
};

const platformNotes = {
  tiktok: "TikTok dijalankan berbasis pencarian publik. Isi query yang paling relevan agar hasil lebih fokus.",
  instagram: "Instagram membuka browser Playwright. Jika perlu login manual, gunakan waktu tunggu sebelum scraping lanjut.",
  facebook_marketplace:
    "Facebook Marketplace wajib login dulu di browser Playwright. Klik login marketplace, selesaikan sesi, lalu jalankan tracing.",
};

const DEFAULT_PLATFORM_STATUS = [
  { id: "tiktok", authenticated_at: null },
  { id: "instagram", authenticated_at: null },
  { id: "facebook_marketplace", authenticated_at: null },
];

function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function getPlatformLabel(platform) {
  return PLATFORM_LABELS[platform] || platform;
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function trimText(value, maxLength = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "-";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function getTableConfig(platform) {
  if (platform === "facebook_marketplace") {
    return [
      { key: "title", label: "Item", render: (result) => trimText(result.metadata?.title || result.title, 120) },
      { key: "price", label: "Harga", render: (result) => trimText(result.metadata?.price || result.summary, 40) },
      {
        key: "seller_name",
        label: "Penjual",
        render: (result) => trimText(result.metadata?.seller_name || result.metadata?.seller_text || result.actor, 80),
      },
      {
        key: "location",
        label: "Lokasi",
        render: (result) => trimText(result.metadata?.location, 110),
      },
      {
        key: "seller_joined_text",
        label: "Bergabung",
        render: (result) => trimText(result.metadata?.seller_joined_text, 40),
      },
      {
        key: "url",
        label: "Tautan",
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
        label: "Akun",
        render: (result) => trimText(result.metadata?.author_username || result.actor, 60),
      },
      {
        key: "caption",
        label: "Caption",
        render: (result) => trimText(result.metadata?.caption || result.title, 160),
      },
      {
        key: "hashtags",
        label: "Tag",
        render: (result) => trimText(result.metadata?.hashtags || result.summary, 110),
      },
      {
        key: "source_seed",
        label: "Sumber",
        render: (result) => trimText(result.metadata?.source_seed || result.source_label, 50),
      },
      {
        key: "post_type",
        label: "Tipe",
        render: (result) => trimText(result.metadata?.post_type, 24),
      },
      {
        key: "url",
        label: "Tautan",
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
      label: "Pengguna",
      render: (result) => trimText(result.metadata?.creator_username || result.actor, 60),
    },
    {
      key: "query",
      label: "Kueri",
      render: (result) => trimText(result.metadata?.query || result.source_label, 50),
    },
    {
      key: "followers_count",
      label: "Pengikut",
      render: (result) => trimText(result.metadata?.followers_count, 24),
    },
    {
      key: "location_snippet",
      label: "Cuplikan",
      render: (result) => trimText(result.metadata?.location_snippet || result.summary, 140),
    },
    {
      key: "profile_url",
      label: "Profil",
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

export default function RunForm({ initialRuns, initialPlatforms }) {
  const [form, setForm] = useState({
    platform: "tiktok",
    query: "",
    region: "Anambas",
    max_results: 20,
    manual_wait_seconds: 60,
  });
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState(null);
  const [error, setError] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);
  const [runs, setRuns] = useState(initialRuns || []);
  const [platforms, setPlatforms] = useState(initialPlatforms || DEFAULT_PLATFORM_STATUS);

  useEffect(() => {
    setRuns(initialRuns || []);
  }, [initialRuns]);

  useEffect(() => {
    setPlatforms(initialPlatforms || DEFAULT_PLATFORM_STATUS);
  }, [initialPlatforms]);

  const activeNote = useMemo(() => platformNotes[form.platform], [form.platform]);
  const resultNote = useMemo(
    () => platformNotes[selectedRun?.platform || form.platform],
    [selectedRun?.platform, form.platform]
  );
  const tableConfig = useMemo(
    () => getTableConfig(selectedRun?.platform || form.platform),
    [selectedRun?.platform, form.platform]
  );
  const isQueryOptional = form.platform === "facebook_marketplace";
  const isMarketplaceSelected = form.platform === "facebook_marketplace";
  const marketplaceAuth = useMemo(
    () => platforms.find((item) => item.id === "facebook_marketplace") || DEFAULT_PLATFORM_STATUS[2],
    [platforms]
  );
  const marketplaceAuthenticatedAt = marketplaceAuth?.authenticated_at || null;
  const marketplaceReady = Boolean(marketplaceAuthenticatedAt);
  const selectedPlatformLabel = getPlatformLabel(selectedRun?.platform || form.platform);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSelectedRun(null);

    if (isMarketplaceSelected && !marketplaceReady) {
      setLoading(false);
      setError("Login Facebook Marketplace dulu sebelum tracing.");
      return;
    }

    try {
      const response = await fetch(buildApiUrl("/api/runs"), {
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

  async function handleMarketplaceLogin() {
    if (!isMarketplaceSelected) {
      return;
    }

    setLoginLoading(true);
    setError("");

    try {
      const response = await fetch(buildApiUrl("/api/platforms/facebook_marketplace/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manual_wait_seconds: Math.max(Number(form.manual_wait_seconds) || 0, 10),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "Login Marketplace gagal");
      }

      setPlatforms((current) => {
        const next = current.filter((item) => item.id !== payload.platform);
        next.push({
          id: payload.platform,
          authenticated_at: payload.authenticated_at,
        });
        return next;
      });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function openRun(runId) {
    setError("");
    try {
      const response = await fetch(buildApiUrl(`/api/runs/${runId}`));
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "Gagal mengambil detail run");
      }
      setSelectedRun(payload);
    } catch (detailError) {
      setError(detailError.message);
    }
  }

  async function handleDeleteRun(runId) {
    const confirmed = window.confirm("Hapus history run ini?");
    if (!confirmed) {
      return;
    }

    setDeletingRunId(runId);
    setError("");

    try {
      const response = await fetch(buildApiUrl(`/api/runs/${runId}`), {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || "Gagal menghapus history");
      }

      setRuns((current) => current.filter((item) => item.id !== runId));
      setSelectedRun((current) => (current?.id === runId ? null : current));
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingRunId(null);
    }
  }

  return (
    <div className="page-shell">
      <section className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Tracing Dashboard</p>
          <h1>SITARA - Aplikasi Tracing Sosial Media Anambas</h1>
          <p className="hero-copy">
            Pilih platform, jalankan pencarian, lalu tinjau hasil yang sudah dinormalisasi dalam satu tabel.
            Setiap run tersimpan sebagai riwayat sehingga hasil bisa dibuka ulang kapan saja.
          </p>
        </div>
        <div className="status-panel">
          <p className="status-label">Workspace</p>
          <strong>Siap menerima run</strong>
          <p>
            TikTok, Instagram, dan Facebook Marketplace menggunakan schema hasil yang sama, jadi data mudah
            dibandingkan antar platform.
          </p>
          <div className="platform-chips" aria-label="Platform yang didukung">
            <span>TikTok</span>
            <span>Instagram</span>
            <span>Facebook Marketplace</span>
          </div>
        </div>
      </section>

      <section className="grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-head">
            <div className="panel-head-stack">
              <h2>Jalankan pencarian</h2>
              <p>{activeNote}</p>
            </div>
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

          {isMarketplaceSelected ? (
            <div className="marketplace-auth-box">
              <div className="marketplace-auth-copy">
                <span className={`status-pill ${marketplaceReady ? "status-completed" : "status-running"}`}>
                  {marketplaceReady ? "Login aktif" : "Perlu login"}
                </span>
                <strong>
                  {marketplaceReady ? "Facebook Marketplace siap dipakai." : "Login Facebook Marketplace dulu."}
                </strong>
                <p>
                  {marketplaceReady
                    ? `Sesi tersimpan sejak ${formatDate(marketplaceAuthenticatedAt)}.`
                    : "Browser akan dibuka untuk login, lalu sesi itu dipakai saat tracing dimulai."}
                </p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={handleMarketplaceLogin}
                disabled={loginLoading || loading}
              >
                {loginLoading ? "Menyiapkan browser..." : marketplaceReady ? "Login ulang Marketplace" : "Login Marketplace"}
              </button>
            </div>
          ) : null}

          <label>
            Query {isQueryOptional ? "(opsional)" : ""}
            <input
              type="text"
              placeholder={isQueryOptional ? "boleh kosong jika filter manual sudah dipasang" : "contoh: umkm batam"}
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

          <button
            className="primary-button"
            type="submit"
            disabled={loading || loginLoading || (isMarketplaceSelected && !marketplaceReady)}
          >
            {loading ? "Menjalankan..." : isMarketplaceSelected && !marketplaceReady ? "Login dulu sebelum tracing" : "Jalankan"}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </form>

        <div className="panel history-panel">
          <div className="panel-head">
            <div className="panel-head-stack">
              <h2>Riwayat</h2>
              <p>Klik salah satu run untuk melihat hasil terakhir.</p>
            </div>
          </div>

          <div className="history-list">
            {runs.length === 0 ? <p className="empty-text">Belum ada run.</p> : null}
            {runs.map((run) => (
              <article key={run.id} className={`history-item ${selectedRun?.id === run.id ? "is-active" : ""}`}>
                <button className="history-main" type="button" onClick={() => openRun(run.id)}>
                  <div className="history-item-top">
                    <strong>#{run.id}</strong>
                    <span className={`status-pill status-${run.status}`}>{getStatusLabel(run.status)}</span>
                  </div>
                  <div className="history-item-body">
                    <span className="history-platform">{getPlatformLabel(run.platform)}</span>
                    <span className="history-query">{trimText(run.query || "Tanpa query", 90)}</span>
                  </div>
                  <div className="history-meta">
                    <span>{run.result_count} hasil</span>
                    <span>{formatDate(run.created_at)}</span>
                  </div>
                </button>
                <button
                  className="delete-button"
                  type="button"
                  onClick={() => handleDeleteRun(run.id)}
                  disabled={deletingRunId === run.id}
                >
                  {deletingRunId === run.id ? "Menghapus..." : "Hapus"}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel results-panel">
        <div className="panel-head">
          <div className="panel-head-stack">
            <h2>Hasil run</h2>
            <p>{resultNote}</p>
          </div>
          {selectedRun ? (
            <div className="results-actions">
              <span className={`status-pill status-${selectedRun.status}`}>{getStatusLabel(selectedRun.status)}</span>
              <button
                className="delete-button"
                type="button"
                onClick={() => handleDeleteRun(selectedRun.id)}
                disabled={deletingRunId === selectedRun.id}
              >
                {deletingRunId === selectedRun.id ? "Menghapus..." : "Hapus run"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="panel-body">
          {selectedRun ? (
            <>
              <div className="run-meta">
                <span>Platform: {selectedPlatformLabel}</span>
                <span>Query: {selectedRun.query || "Tanpa query"}</span>
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
                  <summary>Log eksekusi</summary>
                  <pre>{selectedRun.log_excerpt}</pre>
                </details>
              ) : null}
            </>
          ) : (
            <p className="empty-text">Pilih run dari riwayat atau jalankan pencarian baru.</p>
          )}
        </div>
      </section>
    </div>
  );
}
