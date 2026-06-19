import { useEffect, useState } from "react";
import {
  Database,
  Pencil,
  PlugZap,
  RefreshCw,
  Trash2,
  Server,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Inbox,
  Plus,
  Sliders,
} from "lucide-react";
import { toast } from "react-toastify";
import PageLoadingSpinner from "../components/PageLoadingSpinner";
import {
  createConnection,
  deleteConnection,
  fetchConnections,
  testConnection,
  updateConnection,
} from "../controllers/connectionController";

const connectionKinds = [
  "postgres",
  "mysql",
  "mssql",
  "oracle",
  "snowflake",
  "bigquery",
  "clickhouse",
  "sqlite",
  "s3",
  "nessie",
];

const kindLabel = (k) =>
  ({
    postgres: "PostgreSQL",
    mysql: "MySQL",
    mssql: "SQL Server",
    oracle: "Oracle",
    snowflake: "Snowflake",
    bigquery: "BigQuery",
    clickhouse: "ClickHouse",
    sqlite: "SQLite",
    s3: "Amazon S3",
    nessie: "Nessie / Iceberg",
  })[k] || k;

const kindAccent = (k) => {
  const map = {
    postgres: "from-emerald-500/20 to-teal-600/10 text-emerald-800 ring-emerald-500/25",
    mysql: "from-blue-500/15 to-sky-600/10 text-blue-900 ring-blue-500/20",
    mssql: "from-red-500/15 to-rose-600/10 text-red-900 ring-red-500/20",
    oracle: "from-amber-500/20 to-orange-600/10 text-amber-950 ring-amber-500/25",
    snowflake: "from-cyan-500/15 to-blue-600/10 text-cyan-950 ring-cyan-500/20",
    bigquery: "from-violet-500/15 to-purple-600/10 text-violet-900 ring-violet-500/25",
    nessie: "from-teal-500/18 to-cyan-600/12 text-teal-950 ring-teal-500/25",
  };
  return map[k] || "from-slate-500/15 to-slate-600/10 text-slate-800 ring-slate-400/20";
};

const connectionSummary = (conn) => {
  const c = conn?.config || {};
  if (conn?.kind === "sqlite") {
    return c.path && c.path !== ":memory:" ? c.path : "In-memory / file path";
  }
  if (conn?.kind === "s3") {
    const bucket = c.bucket || c.database || "—";
    const ep = c.endpoint_url || c.host || "";
    return ep ? `${bucket} · ${ep}` : bucket;
  }
  if (conn?.kind === "nessie") {
    const url = c.nessie_url || "—";
    const wh = c.warehouse_uri || (c.bucket ? `s3://${c.bucket}` : "");
    return wh ? `${url} · ${wh}` : url;
  }
  const host = c.host || "—";
  const port = c.port != null && c.port !== "" ? `:${c.port}` : "";
  const db = c.database ? ` / ${c.database}` : "";
  return `${host}${port}${db}`;
};

const DataSources = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [testFeedback, setTestFeedback] = useState(null);
  const [testLoadingId, setTestLoadingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    kind: "mysql",
    host: "",
    port: "",
    database: "",
    user: "",
    password: "",
    path: "",
    dsn: "",
    s3Prefix: "",
    s3Region: "us-east-1",
    nessieTab: "general",
    nessieUrl: "",
    nessieAuthType: "none",
    nessieBearer: "",
    s3Root: "",
    minioEndpoint: "",
    extraProps: [],
  });

  const loadConnections = async () => {
    setLoading(true);
    try {
      const data = await fetchConnections();
      setConnections(data);
    } catch (error) {
      setConnections([]);
      if (error?.response?.status !== 401) {
        toast.error("Failed to load connections");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setNessieExtraProp = (idx, field, value) => {
    setForm((prev) => {
      const next = [...(prev.extraProps || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, extraProps: next };
    });
  };

  const addNessieExtraProp = () => {
    setForm((prev) => ({
      ...prev,
      extraProps: [...(prev.extraProps || []), { name: "", value: "" }],
    }));
  };

  const removeNessieExtraProp = (idx) => {
    setForm((prev) => ({
      ...prev,
      extraProps: (prev.extraProps || []).filter((_, i) => i !== idx),
    }));
  };

  const nessieTabLabel = {
    general: "General",
    storage: "Storage",
    advanced: "Advanced",
  };

  const resetForm = () => {
    setForm({
      name: "",
      kind: "mysql",
      host: "",
      port: "",
      database: "",
      user: "",
      password: "",
      path: "",
      dsn: "",
      s3Prefix: "",
      s3Region: "us-east-1",
      nessieTab: "general",
      nessieUrl: "",
      nessieAuthType: "none",
      nessieBearer: "",
      s3Root: "",
      minioEndpoint: "",
      extraProps: [],
    });
    setEditingConnection(null);
  };

  const buildPayload = () => {
    const base = { name: form.name, kind: form.kind };
    let config;
    if (form.kind === "sqlite") {
      config = { path: form.path || ":memory:" };
    } else if (form.kind === "s3") {
      config = {
        bucket: form.database,
        endpoint_url: form.host?.trim() || undefined,
        region: form.s3Region || "us-east-1",
        prefix: form.s3Prefix?.trim() || "",
      };
    } else if (form.kind === "nessie") {
      const root = String(form.s3Root || "")
        .trim()
        .replace(/^s3:\/\//i, "");
      const bucketOnly = root.includes("/") ? root.split("/")[0].trim() : root.trim();
      const extra = {};
      (form.extraProps || []).forEach((row) => {
        const key = String(row?.name || "").trim();
        if (key) extra[key] = row?.value != null ? String(row.value) : "";
      });
      config = {
        nessie_url: form.nessieUrl?.trim() || "",
        warehouse_uri: root ? `s3://${root}` : "",
        ...(bucketOnly ? { bucket: bucketOnly } : {}),
        endpoint_url: form.minioEndpoint?.trim() || undefined,
        region: form.s3Region || "us-east-1",
        ...(Object.keys(extra).length ? { extra_properties: extra } : {}),
      };
    } else if (form.kind === "oracle") {
      config = {
        ...(form.dsn?.trim() ? { dsn: form.dsn.trim() } : {}),
        host: form.host,
        port: form.port ? Number(form.port) : undefined,
        database: form.database,
      };
    } else {
      config = {
        host: form.host,
        port: form.port ? Number(form.port) : undefined,
        database: form.database,
      };
    }

    let secret = {};
    const nessieSecretPayload =
      form.kind === "nessie"
        ? {
            ...(form.user || form.password
              ? { access_key_id: form.user, secret_access_key: form.password }
              : {}),
            ...(form.nessieAuthType === "bearer" && form.nessieBearer?.trim()
              ? { nessie_bearer_token: form.nessieBearer.trim() }
              : {}),
          }
        : {};
    if (form.kind !== "sqlite" && (form.user || form.password || Object.keys(nessieSecretPayload).length)) {
      if (form.kind === "s3") {
        secret = {
          secret: {
            access_key_id: form.user,
            secret_access_key: form.password,
          },
        };
      } else if (form.kind === "nessie") {
        secret = { secret: nessieSecretPayload };
      } else {
        secret = { secret: { user: form.user, password: form.password } };
      }
    }

    return { ...base, config, ...secret };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.kind === "nessie") {
      const root = String(form.s3Root || "")
        .trim()
        .replace(/^s3:\/\//i, "");
      if (!root) {
        toast.warning(
          "Nessie: set S3 warehouse root on the Storage tab (e.g. iceberg-warehouse) before saving."
        );
        return;
      }
      if (!form.minioEndpoint?.trim()) {
        toast.warning("Nessie: set the MinIO S3 endpoint on the Storage tab (e.g. http://host:9000).");
        return;
      }
      if (!form.nessieUrl?.trim()) {
        toast.warning("Nessie: set the Nessie endpoint URL on the General tab.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingConnection?.public_id) {
        await updateConnection(editingConnection.public_id, payload);
      } else {
        await createConnection(payload);
      }
      await loadConnections();
      resetForm();
      toast.success(editingConnection ? "Connection updated" : "Connection created");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to save connection");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (conn) => {
    setEditingConnection(conn);
    const c = conn?.config || {};
    const isS3 = conn?.kind === "s3";
    const isNessie = conn?.kind === "nessie";
    let extraProps = [];
    const rawExtra = c.extra_properties;
    if (rawExtra && typeof rawExtra === "object" && !Array.isArray(rawExtra)) {
      extraProps = Object.entries(rawExtra).map(([name, value]) => ({ name, value: String(value ?? "") }));
    } else if (Array.isArray(rawExtra)) {
      extraProps = rawExtra.map((row) => ({
        name: row?.name ?? "",
        value: row?.value != null ? String(row.value) : "",
      }));
    }
    const wh = (c.warehouse_uri || "").replace(/^s3:\/\//i, "");
    const nessieWarehouseDisplay = wh || (isNessie ? c.bucket || "" : "");
    setForm({
      name: conn.name || "",
      kind: conn.kind || "mysql",
      host: isS3 ? c.endpoint_url || c.host || "" : c.host || "",
      port: c.port != null && c.port !== "" ? String(c.port) : "",
      database: isS3 ? c.bucket || c.database || "" : c.database || "",
      user: "",
      password: "",
      path: c.path || "",
      dsn: c.dsn || "",
      s3Prefix: c.prefix || c.warehouse_prefix || "",
      s3Region: c.region || "us-east-1",
      nessieTab: "general",
      nessieUrl: isNessie ? c.nessie_url || "" : "",
      nessieAuthType: "none",
      nessieBearer: "",
      s3Root: isNessie ? nessieWarehouseDisplay : "",
      minioEndpoint: isNessie ? c.endpoint_url || c.host || "" : "",
      extraProps,
    });
  };

  const onDelete = async (publicId) => {
    const ok = window.confirm("Delete this connection?");
    if (!ok) return;
    try {
      await deleteConnection(publicId);
      await loadConnections();
      if (editingConnection?.public_id === publicId) {
        resetForm();
      }
      toast.success("Connection deleted");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to delete connection");
    }
  };

  const onTest = async (publicId, connectionName = "") => {
    setTestLoadingId(publicId);
    setTestFeedback(null);
    try {
      const result = await testConnection(publicId);
      const ok = Boolean(result?.ok);
      const message =
        result?.message ||
        (ok ? "Connection OK" : "Connection test failed (no message from server)");

      console.log("[connection test] result", {
        publicId,
        name: connectionName,
        ok,
        message,
        raw: result,
      });

      setTestFeedback({
        publicId,
        name: connectionName || publicId,
        ok,
        message,
      });
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        (typeof error?.response?.data === "string" ? error.response.data : null) ||
        error?.message ||
        "Connection test failed";

      console.log("[connection test] error", {
        publicId,
        name: connectionName,
        message: detail,
        response: error?.response?.data,
        status: error?.response?.status,
        error,
      });

      setTestFeedback({
        publicId,
        name: connectionName || publicId,
        ok: false,
        message: String(detail),
      });
    } finally {
      setTestLoadingId(null);
    }
  };

  return (
    <div className="ui-shell min-h-screen pb-12" style={{ background: "var(--app-bg)" }}>
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <header className="relative mb-8 lg:mb-10 overflow-hidden rounded-2xl border border-slate-800/20 shadow-xl shadow-slate-900/10">
          <div
            className="absolute inset-0 opacity-[0.97]"
            style={{
              background:
                "linear-gradient(125deg, #0c1222 0%, #162032 45%, #134e4a 100%)",
            }}
          />
          <div
            className="absolute -left-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full blur-3xl opacity-30"
            style={{ background: "var(--brand-primary, #14b8a6)" }}
          />
          <div className="relative px-6 py-7 sm:px-10 sm:py-9 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl min-w-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/90">Infrastructure</p>
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Data sources</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                  Register databases and warehouses so report designer and SQL preview can run securely against your
                  environments. Test after saving to validate connectivity.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur-sm">
                    {loading ? "…" : `${connections.length} connection${connections.length === 1 ? "" : "s"}`}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-slate-200">
                    <ShieldCheck size={14} className="text-teal-300" />
                    Credentials stored server-side
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
          {/* Form */}
          <div
            className="rounded-2xl border p-6 shadow-sm sm:p-8"
            style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}
          >
            <div className="mb-6 flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
                style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))" }}
              >
                <PlugZap size={22} strokeWidth={2} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold" style={{ color: "var(--surface-text)" }}>
                  {editingConnection ? "Edit connection" : "Add connection"}
                </h2>
                <p className="mt-0.5 text-sm opacity-70" style={{ color: "var(--surface-text)" }}>
                  {editingConnection ? "Update fields and save. Re-enter password only if changing it." : "Required fields depend on engine type."}
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-55" style={{ color: "var(--surface-text)" }}>
                  <Server size={14} /> Identity
                </p>
                <input
                  className="ui-input w-full rounded-xl"
                  placeholder="Display name (e.g. Production DW)"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                />
                <select className="ui-select w-full rounded-xl" name="kind" value={form.kind} onChange={onChange}>
                  {connectionKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kindLabel(kind)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-55" style={{ color: "var(--surface-text)" }}>
                  <Database size={14} /> Connection
                </p>
                {form.kind === "sqlite" ? (
                  <input
                    className="ui-input w-full rounded-xl"
                    placeholder="SQLite path (optional, default :memory:)"
                    name="path"
                    value={form.path}
                    onChange={onChange}
                  />
                ) : form.kind === "nessie" ? (
                  <div
                    className="overflow-hidden rounded-2xl border shadow-sm"
                    style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--surface-bg) 92%, var(--app-bg))" }}
                  >
                    <div className="flex min-h-[300px] flex-col md:flex-row">
                      <nav
                        className="flex shrink-0 gap-0 border-b md:w-[11.5rem] md:flex-col md:border-b-0 md:border-r"
                        style={{ borderColor: "var(--stroke)", background: "rgba(15, 23, 42, 0.04)" }}
                        aria-label="Nessie connection sections"
                      >
                        {(["general", "storage", "advanced"]).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, nessieTab: tab }))}
                            className={`px-4 py-3.5 text-left text-sm font-semibold transition md:px-5 ${
                              form.nessieTab === tab
                                ? "bg-teal-700 text-white md:border-l-2 md:border-l-teal-400"
                                : "text-slate-700 hover:bg-white/60 md:border-l-2 md:border-l-transparent"
                            }`}
                          >
                            {nessieTabLabel[tab]}
                          </button>
                        ))}
                      </nav>
                      <div className="flex-1 space-y-4 p-4 sm:p-6">
                        {form.nessieTab === "general" ? (
                          <>
                            <div>
                              <p className="mb-1.5 text-sm font-medium" style={{ color: "var(--surface-text)" }}>
                                Nessie endpoint URL
                              </p>
                              <input
                                className="ui-input w-full rounded-xl font-mono text-sm"
                                placeholder="http://10.0.0.1:19120/api/v2"
                                name="nessieUrl"
                                value={form.nessieUrl}
                                onChange={onChange}
                                required
                              />
                              <p className="mt-2 text-xs leading-relaxed opacity-75" style={{ color: "var(--surface-text)" }}>
                                Same URL you use in Dremio or Nessie clients. The BI <strong>server</strong> (Django) opens a direct TCP connection to
                                Nessie — separate from MinIO. If your browser reaches Nessie but tests fail with “unreachable host”, connect VPN or run the backend where{" "}
                                <span className="font-mono">10.x</span> routes exist. Iceberg REST base is derived as{" "}
                                <span className="font-mono">…/iceberg</span> when you use <span className="font-mono">/api/v2</span>.
                              </p>
                            </div>
                            <div>
                              <p className="mb-2 text-sm font-medium" style={{ color: "var(--surface-text)" }}>
                                Nessie authentication
                              </p>
                              <div className="flex flex-wrap gap-4">
                                <label className="inline-flex cursor-pointer items-center gap-2 text-sm" style={{ color: "var(--surface-text)" }}>
                                  <input
                                    type="radio"
                                    name="nessieAuthType"
                                    value="none"
                                    checked={form.nessieAuthType === "none"}
                                    onChange={() => setForm((p) => ({ ...p, nessieAuthType: "none" }))}
                                  />
                                  None
                                </label>
                                <label className="inline-flex cursor-pointer items-center gap-2 text-sm" style={{ color: "var(--surface-text)" }}>
                                  <input
                                    type="radio"
                                    name="nessieAuthType"
                                    value="bearer"
                                    checked={form.nessieAuthType === "bearer"}
                                    onChange={() => setForm((p) => ({ ...p, nessieAuthType: "bearer" }))}
                                  />
                                  Bearer
                                </label>
                              </div>
                              <p className="mt-2 text-xs opacity-70" style={{ color: "var(--surface-text)" }}>
                                {form.nessieAuthType === "none"
                                  ? "Use when the Nessie server does not require catalog auth (typical for internal dev)."
                                  : "Send an Authorization Bearer token on Iceberg REST requests."}
                              </p>
                            </div>
                            {form.nessieAuthType === "bearer" ? (
                              <input
                                type="password"
                                className="ui-input w-full rounded-xl font-mono text-sm"
                                placeholder="Bearer token"
                                name="nessieBearer"
                                value={form.nessieBearer}
                                onChange={onChange}
                                autoComplete="new-password"
                              />
                            ) : null}
                          </>
                        ) : null}

                        {form.nessieTab === "storage" ? (
                          <>
                            <p className="text-xs leading-relaxed opacity-75" style={{ color: "var(--surface-text)" }}>
                              MinIO or other S3-compatible storage backing the Iceberg warehouse (same style as “AWS root path” + keys in Dremio).
                            </p>
                            <div>
                              <p className="mb-1.5 text-sm font-medium" style={{ color: "var(--surface-text)" }}>
                                S3 warehouse root
                              </p>
                              <div className="flex rounded-xl border focus-within:ring-2 focus-within:ring-teal-500/30" style={{ borderColor: "var(--stroke)" }}>
                                <span className="flex shrink-0 items-center border-r px-3 font-mono text-sm text-slate-500" style={{ borderColor: "var(--stroke)", background: "rgba(15,23,42,0.04)" }}>
                                  s3://
                                </span>
                                <input
                                  className="ui-input min-w-0 flex-1 rounded-none rounded-r-xl border-0 font-mono text-sm"
                                  placeholder="iceberg-warehouse"
                                  name="s3Root"
                                  value={form.s3Root}
                                  onChange={onChange}
                                  required
                                />
                              </div>
                            </div>
                            <input
                              className="ui-input w-full rounded-xl font-mono text-sm"
                              placeholder="MinIO API only: http://10.0.0.1:9000 (no bucket path)"
                              name="minioEndpoint"
                              value={form.minioEndpoint}
                              onChange={onChange}
                              required
                            />
                            <p className="text-xs opacity-70" style={{ color: "var(--surface-text)" }}>
                              Put the bucket name only in <strong>S3 warehouse root</strong> above — not after the port in this field.
                            </p>
                            <input
                              className="ui-input w-full rounded-xl"
                              placeholder="Region (MinIO often us-east-1)"
                              name="s3Region"
                              value={form.s3Region}
                              onChange={onChange}
                            />
                            <div className="rounded-xl border border-dashed p-4" style={{ borderColor: "var(--stroke)" }}>
                              <p className="mb-3 text-xs font-semibold uppercase tracking-wider opacity-60" style={{ color: "var(--surface-text)" }}>
                                Object storage authentication
                              </p>
                              <input
                                className="ui-input mb-3 w-full rounded-xl"
                                placeholder="Access key ID"
                                name="user"
                                value={form.user}
                                onChange={onChange}
                              />
                              <input
                                type="password"
                                className="ui-input w-full rounded-xl"
                                placeholder="Secret access key"
                                name="password"
                                value={form.password}
                                onChange={onChange}
                                autoComplete="new-password"
                              />
                            </div>
                          </>
                        ) : null}

                        {form.nessieTab === "advanced" ? (
                          <>
                            <div className="flex items-start gap-2">
                              <Sliders size={18} className="mt-0.5 shrink-0 text-teal-700" />
                              <div>
                                <p className="font-medium" style={{ color: "var(--surface-text)" }}>
                                  Connection properties
                                </p>
                                <p className="mt-1 text-xs leading-relaxed opacity-75" style={{ color: "var(--surface-text)" }}>
                                  Optional key–value options (for example{" "}
                                  <span className="font-mono">fs.s3a.path.style.access</span>,{" "}
                                  <span className="font-mono">fs.s3a.endpoint</span>) used when talking to MinIO.
                                </p>
                              </div>
                            </div>
                            <ul className="space-y-3">
                              {(form.extraProps || []).map((row, idx) => (
                                <li key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <input
                                    className="ui-input flex-1 rounded-xl font-mono text-sm"
                                    placeholder="Name"
                                    value={row.name || ""}
                                    onChange={(e) => setNessieExtraProp(idx, "name", e.target.value)}
                                  />
                                  <input
                                    className="ui-input flex-1 rounded-xl font-mono text-sm"
                                    placeholder="Value"
                                    value={row.value || ""}
                                    onChange={(e) => setNessieExtraProp(idx, "value", e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 sm:shrink-0"
                                    onClick={() => removeNessieExtraProp(idx)}
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              onClick={addNessieExtraProp}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
                            >
                              <Plus size={16} strokeWidth={2.5} />
                              Add property
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : form.kind === "s3" ? (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed opacity-75" style={{ color: "var(--surface-text)" }}>
                      MinIO / S3-compatible: use your endpoint (e.g. <span className="font-mono">http://localhost:9000</span>
                      ). Set <strong>warehouse prefix</strong> to the folder that contains Iceberg table directories
                      (each with a <span className="font-mono">metadata/</span> subfolder).
                    </p>
                    <input
                      className="ui-input w-full rounded-xl"
                      placeholder="S3 endpoint URL (e.g. http://localhost:9000)"
                      name="host"
                      value={form.host}
                      onChange={onChange}
                      required
                    />
                    <input
                      className="ui-input w-full rounded-xl"
                      placeholder="Bucket name"
                      name="database"
                      value={form.database}
                      onChange={onChange}
                      required
                    />
                    <input
                      className="ui-input w-full rounded-xl"
                      placeholder="Warehouse prefix inside bucket (e.g. warehouse/ or iceberg/)"
                      name="s3Prefix"
                      value={form.s3Prefix}
                      onChange={onChange}
                    />
                    <input
                      className="ui-input w-full rounded-xl"
                      placeholder="Region (MinIO often us-east-1)"
                      name="s3Region"
                      value={form.s3Region}
                      onChange={onChange}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      className="ui-input w-full rounded-xl"
                      placeholder={
                        form.kind === "oracle" ? "Host (skip if using DSN / TNS only below)" : "Host"
                      }
                      name="host"
                      value={form.host}
                      onChange={onChange}
                      required={form.kind !== "oracle" || !form.dsn?.trim()}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="ui-input w-full rounded-xl"
                        placeholder={form.kind === "oracle" ? "Port (default 1521)" : "Port"}
                        name="port"
                        value={form.port}
                        onChange={onChange}
                      />
                      <input
                        className="ui-input w-full rounded-xl sm:col-span-2"
                        placeholder={
                          form.kind === "oracle"
                            ? "Service / PDB name (e.g. ORCL, XEPDB1)"
                            : "Database / catalog"
                        }
                        name="database"
                        value={form.database}
                        onChange={onChange}
                        required={form.kind === "oracle" && !form.dsn?.trim()}
                      />
                    </div>
                    {form.kind === "oracle" ? (
                      <input
                        className="ui-input w-full rounded-xl"
                        placeholder="Optional: full DSN or TNS alias (overrides host/port/service above)"
                        name="dsn"
                        value={form.dsn}
                        onChange={onChange}
                      />
                    ) : null}
                  </div>
                )}
              </div>

              {form.kind !== "sqlite" && form.kind !== "nessie" ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-55" style={{ color: "var(--surface-text)" }}>
                    <KeyRound size={14} /> {form.kind === "s3" ? "Object storage keys" : "Credentials"}
                  </p>
                  <input
                    className="ui-input w-full rounded-xl"
                    placeholder={form.kind === "s3" ? "Access key ID" : "User"}
                    name="user"
                    value={form.user}
                    onChange={onChange}
                  />
                  <input
                    type="password"
                    className="ui-input w-full rounded-xl"
                    placeholder={form.kind === "s3" ? "Secret access key" : "Password"}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                <button
                  type="submit"
                  className="ui-btn-primary min-h-[2.75rem] flex-1 rounded-xl px-5 font-semibold sm:min-w-[12rem]"
                  disabled={saving}
                >
                  {saving ? "Saving…" : editingConnection ? "Update connection" : "Save connection"}
                </button>
                {editingConnection ? (
                  <button type="button" className="ui-btn-secondary min-h-[2.75rem] rounded-xl px-5 font-semibold" onClick={resetForm}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          {/* List */}
          <div
            className="rounded-2xl border p-6 shadow-sm sm:p-8"
            style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}
          >
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold" style={{ color: "var(--surface-text)" }}>
                    Saved connections
                  </h2>
                  <p className="text-xs opacity-65" style={{ color: "var(--surface-text)" }}>
                    Test from here before publishing reports
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadConnections}
                className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50"
                style={{ borderColor: "var(--stroke)", color: "var(--surface-text)" }}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {testFeedback ? (
              <div
                role="status"
                className={`mb-5 flex gap-3 rounded-xl border p-4 ${
                  testFeedback.ok
                    ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
                    : "border-red-200 bg-red-50/90 text-red-950"
                }`}
              >
                {testFeedback.ok ? (
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {testFeedback.ok ? "Test succeeded" : "Test failed"} — {testFeedback.name}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs opacity-90">
                    {testFeedback.message}
                  </p>
                </div>
              </div>
            ) : null}

            {loading ? (
              <PageLoadingSpinner minHeight="min-h-[40vh]" label="Loading connections…" />
            ) : connections.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center"
                style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 80%, transparent)" }}
              >
                <div className="mb-4 rounded-2xl bg-slate-100 p-5 text-slate-400">
                  <Inbox size={40} strokeWidth={1.25} />
                </div>
                <p className="font-display text-base font-semibold text-slate-800">No connections yet</p>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Add your first data source using the form on the left. You’ll need at least one connection to design
                  reports.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {connections.map((conn) => (
                  <li key={conn.public_id}>
                    <div
                      className={`group flex flex-col gap-4 rounded-2xl border p-4 transition-all duration-200 hover:shadow-md lg:flex-row lg:items-stretch lg:justify-between lg:gap-6 ${
                        editingConnection?.public_id === conn.public_id ? "ring-2 ring-teal-500/30 border-teal-300/60" : ""
                      }`}
                      style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}
                    >
                      <div className="min-w-0 flex flex-1 items-start gap-3">
                        <div
                          className={`shrink-0 rounded-lg bg-gradient-to-br px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${kindAccent(conn.kind)}`}
                        >
                          {kindLabel(conn.kind)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{conn.name}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500 break-all sm:break-words">
                            {connectionSummary(conn)}
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full flex-col gap-2 border-t border-slate-100 pt-3 lg:w-52 lg:shrink-0 lg:border-t-0 lg:border-l lg:border-slate-100 lg:pl-6 lg:pt-0">
                        <button
                          type="button"
                          onClick={() => onTest(conn.public_id, conn.name)}
                          disabled={testLoadingId === conn.public_id}
                          className="ui-btn-primary min-h-[2.75rem] w-full justify-center gap-2 rounded-xl text-sm shadow-sm disabled:opacity-50"
                          style={{ color: "#ffffff", width: "100%" }}
                        >
                          {testLoadingId === conn.public_id ? (
                            <>
                              <RefreshCw size={16} className="shrink-0 animate-spin" style={{ color: "#ffffff" }} />{" "}
                              <span style={{ color: "#ffffff" }}>Testing…</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={16} className="shrink-0" style={{ color: "#ffffff" }} />{" "}
                              <span style={{ color: "#ffffff" }}>Test connection</span>
                            </>
                          )}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(conn)}
                            className="ui-btn-secondary min-h-[2.5rem] w-full justify-center gap-1.5 rounded-xl px-3 text-sm"
                            style={{ color: "var(--surface-text)" }}
                            title="Edit"
                          >
                            <Pencil size={16} style={{ color: "var(--surface-text)" }} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(conn.public_id)}
                            className="min-h-[2.5rem] w-full justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold transition hover:bg-red-100 inline-flex items-center"
                            style={{ color: "#b91c1c" }}
                            title="Delete"
                          >
                            <Trash2 size={16} className="shrink-0" style={{ color: "#b91c1c" }} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSources;
