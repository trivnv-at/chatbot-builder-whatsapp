import { useEffect, useState } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Server
} from 'lucide-react';
import { getAiConfig, saveAiConfig, testAiConfig } from './api';

const PROVIDERS = [
  {
    id: 'opencode',
    label: 'OpenCode Go',
    protocol: 'openai',
    baseUrl: 'https://api.opencode.go/v1',
    models: ['deepseek-v4.1-flash', 'deepseek-v4.1', 'gpt-5-mini']
  },
  {
    id: 'openai',
    label: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o']
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3.5-sonnet', 'claude-3.5-haiku']
  },
  {
    id: 'google',
    label: 'Google Gemini',
    protocol: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro']
  },
  { id: 'custom', label: 'Kustom', protocol: 'openai', baseUrl: '', models: [] }
];

function findProvider(id) {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
}

interface Connection {
  id: number;
  provider: string;
  model: string;
  keyHash: string;
  active: boolean;
}

const inputClass =
  'h-10 w-full rounded-lg border border-[#D5DDDC] bg-[#F2F4F6] px-3 text-xs text-[#191C1E] outline-none focus:border-[#00695F]';

async function hashKey(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const shortHash = (hash) => `sha256:${hash.slice(0, 12)}…${hash.slice(-4)}`;

function StatusBadge({ status }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EE] px-2.5 py-1 text-[10px] font-semibold text-[#16A34A]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Terhubung
      </span>
    );
  }
  if (status === 'fail') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDECEC] px-2.5 py-1 text-[10px] font-semibold text-[#B3261E]">
        <XCircle className="h-3.5 w-3.5" />
        Gagal terhubung
      </span>
    );
  }
  return null;
}

export default function AiConnectionPage({ onBack }) {
  const [providerId, setProviderId] = useState('opencode');
  const [protocol, setProtocol] = useState('openai');
  const [baseUrl, setBaseUrl] = useState(PROVIDERS[0].baseUrl);
  const [model, setModel] = useState(PROVIDERS[0].models[0]);
  const [apiKey, setApiKey] = useState('');
  const [keyHash, setKeyHash] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState('idle');
  const [notice, setNotice] = useState('');

  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!apiKey) {
      setKeyHash('');
      return undefined;
    }
    hashKey(apiKey).then((hash) => {
      if (!cancelled) setKeyHash(hash);
    });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;
    getAiConfig()
      .then((res) => {
        const cfg = res && res.config;
        if (cancelled || !cfg) return;
        const preset = findProvider(cfg.provider);
        setProviderId(preset.id);
        setProtocol(cfg.protocol || preset.protocol);
        setBaseUrl(cfg.baseUrl || preset.baseUrl);
        setModel(cfg.model || preset.models[0] || '');
        setConnections([
          {
            id: 1,
            provider: preset.label,
            model: cfg.model,
            keyHash: cfg.keyHash,
            active: true
          }
        ]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const provider = findProvider(providerId);

  const changeProvider = (id) => {
    const next = findProvider(id);
    setProviderId(next.id);
    setProtocol(next.protocol);
    setBaseUrl(next.baseUrl);
    setModel(next.models[0] || '');
    setTestStatus('idle');
  };

  const testConnection = async () => {
    setTestStatus('testing');
    setNotice('');
    try {
      const res = await testAiConfig({
        provider: providerId,
        protocol,
        baseUrl,
        model,
        apiKey: apiKey.trim() || undefined
      });
      setTestStatus(res.ok ? 'ok' : 'fail');
      setNotice(res.ok ? '' : String(res.message || 'gagal terhubung'));
    } catch (error) {
      setTestStatus('fail');
      setNotice(`Backend tidak terjangkau: ${(error as Error).message}`);
    }
  };

  const saveConnection = async () => {
    if (!model.trim() || !apiKey.trim()) {
      setNotice('Model dan kunci API wajib diisi.');
      return;
    }
    try {
      const res = await saveAiConfig({
        provider: providerId,
        protocol,
        baseUrl,
        model,
        apiKey
      });
      const cfg = (res && res.config) || {};
      setConnections((prev) => [
        ...prev.map((c) => ({ ...c, active: false })),
        {
          id: Date.now(),
          provider: provider.label,
          model,
          keyHash: cfg.keyHash || keyHash,
          active: true
        }
      ]);
      setApiKey('');
      setNotice('Koneksi tersimpan di server (kunci dienkripsi).');
    } catch (error) {
      setNotice(`Gagal simpan ke server: ${error.message}`);
    }
  };

  const setActive = (id) =>
    setConnections((prev) => prev.map((c) => ({ ...c, active: c.id === id })));
  const removeConnection = (id) =>
    setConnections((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-[#F8F9FB] p-4 md:p-6">
      {/* Judul halaman */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold text-[#00695F] transition hover:text-[#004F47]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Persona AI
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-[#191C1E]">Koneksi AI</h1>
        </div>
        <p className="max-w-2xl text-xs text-[#6F7977]">
          Hubungkan layanan AI yang dipakai semua chatbot. Cukup isi penyedia, alamat server, dan
          kunci API. Kunci disimpan dalam keadaan terenkripsi.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Form koneksi */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-1.5">
              <h2 className="text-base font-semibold text-[#191C1E]">Pengaturan Koneksi</h2>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#3E4947]">Penyedia AI</span>
                <select
                  value={providerId}
                  onChange={(e) => changeProvider(e.target.value)}
                  className={inputClass}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#3E4947]">
                  Alamat Server (Base URL)
                </span>
                <div className="flex h-10 items-center rounded-lg border border-[#D5DDDC] bg-[#F2F4F6] px-3">
                  <Server className="mr-2 h-4 w-4 shrink-0 text-[#6F7977]" />
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.contoh.com/v1"
                    className="w-full bg-transparent text-xs text-[#191C1E] outline-none"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#3E4947]">Model</span>
                {provider.models.length > 0 ? (
                  <select value={model} onChange={(e) => setModel(e.target.value)} className={inputClass}>
                    {provider.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="mis. llama-3.1-70b"
                    className={inputClass}
                  />
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#3E4947]">Kunci API (API Key)</span>
                <div className="flex h-10 items-center rounded-lg border border-[#D5DDDC] bg-[#F2F4F6] px-3">
                  <KeyRound className="mr-2 h-4 w-4 shrink-0 text-[#6F7977]" />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestStatus('idle');
                    }}
                    placeholder="Tempel kunci API di sini"
                    className="w-full bg-transparent text-xs text-[#191C1E] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    title={showKey ? 'Sembunyikan' : 'Tampilkan'}
                    className="ml-1 rounded p-0.5 text-[#6F7977] transition hover:bg-[#E4E9EB]"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-[#8A9492]">
                  {keyHash
                    ? `Hash kunci (SHA-256): ${shortHash(keyHash)}`
                    : 'Kunci disimpan sebagai hash SHA-256, bukan teks asli.'}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testStatus === 'testing'}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E4E9EB] px-4 text-xs font-medium text-[#3E4947] transition hover:brightness-105 disabled:opacity-60"
                >
                  {testStatus === 'testing' && (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  )}
                  Uji Koneksi
                </button>
                <StatusBadge status={testStatus} />
              </div>
            </div>

            {notice && (
              <p className="mt-4 text-[11px] font-medium text-[#B3261E]">{notice}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#E2E8F0] pt-4">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-medium text-[#00695F] transition hover:bg-[#F2F4F6]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveConnection}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00695F] px-4 text-xs font-medium text-white shadow-sm transition hover:bg-[#004F47] active:scale-[0.98]"
              >
                <Plus className="h-[18px] w-[18px]" />
                Simpan Koneksi
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-[#E8F1FD] p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
            <p className="text-[11px] leading-relaxed text-[#191C1E]">
              Demi keamanan, gunakan kunci API yang khusus dibuat untuk chatbot ini. Jangan pakai
              kunci utama akun agar bisa dicabut kapan saja tanpa mengganggu layanan lain.
            </p>
          </div>
        </div>

        {/* Daftar koneksi */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#191C1E]">Koneksi Tersimpan</h2>
              <span className="rounded-full bg-[#E4E9EB] px-2.5 py-1 text-[10px] font-semibold text-[#3E4947]">
                {connections.length} koneksi
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {connections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#BEC9C6] p-6 text-center text-xs text-[#6F7977]">
                  Belum ada koneksi tersimpan.
                </div>
              ) : (
                connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex flex-col gap-2 rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[#191C1E]">
                            {conn.provider}
                          </span>
                          {conn.active && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8EE] px-2 py-0.5 text-[10px] font-bold text-[#16A34A]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-[#6F7977]">
                          {conn.model}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-[#8A9492]">
                          API key hash: {shortHash(conn.keyHash)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeConnection(conn.id)}
                        title="Hapus koneksi"
                        className="rounded p-1 text-[#6F7977] transition hover:bg-[#E4E9EB] hover:text-[#B3261E]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {!conn.active && (
                      <button
                        type="button"
                        onClick={() => setActive(conn.id)}
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#E4E9EB] px-2.5 py-1 text-[10px] font-semibold text-[#3E4947] transition hover:brightness-105"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Jadikan Aktif
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
