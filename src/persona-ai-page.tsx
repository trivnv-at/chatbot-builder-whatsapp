import { useEffect, useState } from 'react';
import {
  GitBranch,
  Bot,
  Bookmark,
  Rocket,
  Cpu,
  ChevronDown,
  Settings,
  Clock,
  Info,
  ChevronRight,
  Brain,
  BookOpen,
  ListChecks,
  RefreshCw,
  MoreVertical,
  Send,
  BrainCircuit,
  MoreHorizontal,
  Timer,
  Check,
  Upload,
  Plus,
  Trash2,
  FileText,
  Globe
} from 'lucide-react';
import {
  getOfficeHours,
  getPersonaConfig,
  saveOfficeHours,
  savePersonaConfig
} from './api';

const MODELS = [
  { id: 'deepseek', model: 'deepseek-v4.1-flash', label: 'OpenCode Go · deepseek-v4.1-flash' },
  { id: 'gpt4o-mini', model: 'gpt-4o-mini', label: 'OpenAI · gpt-4o-mini' },
  { id: 'claude', model: 'claude-3.5-sonnet', label: 'Anthropic · claude-3.5-sonnet' },
  { id: 'gemini', model: 'gemini-1.5-flash', label: 'Google · gemini-1.5-flash' }
];

const STAGES = [
  { id: 'New', label: '1. New' },
  { id: 'Contacted', label: '2. Contacted' },
  { id: 'Warm', label: '3. Warm' },
  { id: 'Negotiation', label: '4. Negotiation' },
  { id: 'Won', label: '5. Won' },
  { id: 'After sale', label: '6. After sale' },
  { id: 'Lost', label: '7. Lost' }
];

const SUB_TABS = [
  { id: 'peran', label: 'Peran & Gaya Bahasa', icon: Brain },
  { id: 'pengetahuan', label: 'Pengetahuan Bot', icon: BookOpen, badge: '0 Dok' },
  { id: 'datawajib', label: 'Data Wajib', icon: ListChecks, badge: '3 Field' }
];

const DEFAULT_PERSONA = {
  persona: 'Sales consultant Netramaya CRM yang ramah, sopan, dan membantu.',
  greeting: 'Halo! Terima kasih sudah menghubungi Netramaya CRM. Ada yang bisa saya bantu?',
  tone: 'Santai',
  length: 'Sedang',
  language: 'Ikuti pelanggan',
  useEmoji: true,
  systemPrompt:
    'Selalu ramah, jangan berjanji di luar kapasitas, dan arahkan pelanggan untuk meninggalkan nama, budget, dan lokasi.',
  examples: ''
};

const DEFAULT_KNOWLEDGE = { docs: [], faqs: [] };

const DEFAULT_FIELDS = [
  { id: 1, name: 'Nama Pelanggan', required: true },
  { id: 2, name: 'Budget / Anggaran', required: true },
  { id: 3, name: 'Lokasi Domisili', required: true }
];

function Toggle({ checked, onChange, onColor = 'bg-[#00695F]' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/20 ${
        checked ? onColor : 'bg-[#D5DDDC]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

const inputClass =
  'h-10 w-full rounded-lg border border-[#D5DDDC] bg-[#F2F4F6] px-3 text-xs text-[#191C1E] outline-none focus:border-[#00695F]';
const textareaClass =
  'w-full rounded-lg border border-[#D5DDDC] bg-[#F2F4F6] px-3 py-2 text-xs text-[#191C1E] outline-none focus:border-[#00695F]';

function FormField({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-[#3E4947]">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-[#8A9492]">{hint}</span>}
    </label>
  );
}

function TabHeader({ icon: Icon, title, description, badge }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1">
          <Icon className="h-[22px] w-[22px] text-[#00695F]" />
          <h2 className="text-base font-semibold text-[#191C1E]">{title}</h2>
        </div>
        {badge}
      </div>
      <p className="text-xs text-[#6F7977]">{description}</p>
    </div>
  );
}

function PersonaTab({ value, onChange }) {
  const set = (key, next) => onChange({ ...value, [key]: next });

  return (
    <div className="flex flex-col gap-5">
      <TabHeader
        icon={Brain}
        title="Peran & Gaya Bahasa"
        description="Tentukan kepribadian dan cara bicara chatbot. Semua balasan bot akan mengikuti gaya ini."
      />

      <FormField label="Peran / Kepribadian Bot">
        <input
          value={value.persona}
          onChange={(e) => set('persona', e.target.value)}
          className={inputClass}
        />
      </FormField>

      <FormField label="Sapaan Pembuka" hint="Pesan pertama yang dikirim bot ke pelanggan baru.">
        <textarea
          rows={2}
          value={value.greeting}
          onChange={(e) => set('greeting', e.target.value)}
          className={textareaClass}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Gaya Bahasa">
          <select
            value={value.tone}
            onChange={(e) => set('tone', e.target.value)}
            className={inputClass}
          >
            <option>Santai</option>
            <option>Semi-formal</option>
            <option>Formal</option>
          </select>
        </FormField>
        <FormField label="Panjang Balasan">
          <select
            value={value.length}
            onChange={(e) => set('length', e.target.value)}
            className={inputClass}
          >
            <option>Singkat</option>
            <option>Sedang</option>
            <option>Detail</option>
          </select>
        </FormField>
        <FormField label="Bahasa">
          <select
            value={value.language}
            onChange={(e) => set('language', e.target.value)}
            className={inputClass}
          >
            <option>Ikuti pelanggan</option>
            <option>Indonesia</option>
            <option>Inggris</option>
          </select>
        </FormField>
        <div className="flex items-center justify-between gap-2 self-end rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
          <span className="text-xs font-semibold text-[#3E4947]">Gunakan Emoji</span>
          <Toggle checked={value.useEmoji} onChange={(v) => set('useEmoji', v)} />
        </div>
      </div>

      <FormField
        label="Instruksi Sistem (System Prompt)"
        hint="Aturan utama yang harus selalu dipatuhi bot."
      >
        <textarea
          rows={4}
          value={value.systemPrompt}
          onChange={(e) => set('systemPrompt', e.target.value)}
          className={textareaClass}
        />
      </FormField>

      <FormField label="Contoh Percakapan (opsional)" hint="Contoh tanya-jawab untuk melatih gaya bot.">
        <textarea
          rows={3}
          value={value.examples}
          onChange={(e) => set('examples', e.target.value)}
          placeholder={'Pelanggan: Berapa harganya?\nBot: ...'}
          className={textareaClass}
        />
      </FormField>
    </div>
  );
}

function KnowledgeTab({ value, onChange }) {
  const [url, setUrl] = useState('');
  const docs = value.docs;
  const faqs = value.faqs;
  const setDocs = (next) => onChange({ ...value, docs: next });
  const setFaqs = (next) => onChange({ ...value, faqs: next });

  const addDocs = (fileList) => {
    const names = Array.from(fileList || []).map((file) => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      source: 'Dokumen'
    }));
    if (names.length) setDocs([...docs, ...names]);
  };

  const addUrl = () => {
    const link = url.trim();
    if (!link) return;
    setDocs([...docs, { id: `${link}-${Date.now()}`, name: link, source: 'Website' }]);
    setUrl('');
  };

  return (
    <div className="flex flex-col gap-5">
      <TabHeader
        icon={BookOpen}
        title="Pengetahuan Bot"
        description="Unggah dokumen atau tautkan website agar bot bisa menjawab dari informasi Anda."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EE] px-2.5 py-1 text-[10px] font-semibold text-[#16A34A]">
            {docs.length} Sumber
          </span>
        }
      />

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#BEC9C6] bg-[#F2F4F6] p-6 text-center transition hover:border-[#00695F]">
        <Upload className="h-6 w-6 text-[#00695F]" />
        <span className="text-xs font-semibold text-[#191C1E]">Unggah Dokumen</span>
        <span className="text-[10px] text-[#6F7977]">PDF, DOCX, atau TXT (maks. 10 MB)</span>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => addDocs(e.target.files)}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-[#3E4947]">Tambah dari Website</span>
        <div className="flex items-center gap-2">
          <div className="flex h-10 flex-1 items-center rounded-lg border border-[#D5DDDC] bg-[#F2F4F6] px-3">
            <Globe className="mr-2 h-4 w-4 shrink-0 text-[#6F7977]" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://contoh.com/faq"
              className="w-full bg-transparent text-xs text-[#191C1E] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={addUrl}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#E4E9EB] px-4 text-xs font-medium text-[#3E4947] transition hover:brightness-105"
          >
            <Plus className="h-[18px] w-[18px]" />
            Tambah
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold text-[#3E4947]">Daftar Sumber</span>
        {docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#BEC9C6] p-6 text-center text-xs text-[#6F7977]">
            Belum ada dokumen. Bot hanya akan menjawab dari pengetahuan umum.
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 shadow-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-[#00695F]" />
                <span className="truncate text-xs text-[#191C1E]">{doc.name}</span>
                <span className="shrink-0 rounded-full bg-[#E4E9EB] px-2 py-0.5 text-[10px] font-semibold text-[#3E4947]">
                  {doc.source}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setDocs(docs.filter((d) => d.id !== doc.id))}
                className="rounded p-1 text-[#6F7977] transition hover:bg-[#E4E9EB] hover:text-[#B3261E]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[#3E4947]">Tanya-Jawab Manual</span>
          <button
            type="button"
            onClick={() =>
              setFaqs([...faqs, { id: Date.now(), q: '', a: '' }])
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#E4E9EB] px-2.5 py-1 text-[10px] font-semibold text-[#3E4947] transition hover:brightness-105"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah FAQ
          </button>
        </div>
        {faqs.length === 0 ? (
          <p className="text-[11px] text-[#8A9492]">Belum ada FAQ manual.</p>
        ) : (
          faqs.map((faq) => (
            <div key={faq.id} className="flex flex-col gap-2 rounded-lg border border-[#E2E8F0] bg-white p-3">
              <input
                value={faq.q}
                onChange={(e) =>
                  setFaqs(faqs.map((f) => (f.id === faq.id ? { ...f, q: e.target.value } : f)))
                }
                placeholder="Pertanyaan"
                className={inputClass}
              />
              <div className="flex items-center gap-2">
                <input
                  value={faq.a}
                  onChange={(e) =>
                    setFaqs(faqs.map((f) => (f.id === faq.id ? { ...f, a: e.target.value } : f)))
                  }
                  placeholder="Jawaban"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setFaqs(faqs.filter((f) => f.id !== faq.id))}
                  className="rounded p-1 text-[#6F7977] transition hover:bg-[#E4E9EB] hover:text-[#B3261E]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RequiredFieldsTab({ value, onChange }) {
  const fields = value;
  const setFields = (next) => onChange(next);

  const updateField = (id, patch) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeField = (id) => setFields(fields.filter((f) => f.id !== id));
  const addField = () => setFields([...fields, { id: Date.now(), name: '', required: true }]);

  const requiredCount = fields.filter((f) => f.required).length;

  return (
    <div className="flex flex-col gap-5">
      <TabHeader
        icon={ListChecks}
        title="Data Wajib"
        description="Tentukan data pelanggan yang harus dikumpulkan bot sebelum prospek naik ke tahap berikutnya."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EE] px-2.5 py-1 text-[10px] font-semibold text-[#16A34A]">
            {requiredCount} Field Wajib
          </span>
        }
      />

      <div className="flex items-start gap-2 rounded-lg bg-[#E8F1FD] p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
        <p className="text-[11px] leading-relaxed text-[#191C1E]">
          Bot akan berusaha menanyakan field di bawah lewat percakapan. Bila semua field wajib
          sudah terisi, prospek otomatis dipindah ke tahap berikutnya.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 shadow-sm"
          >
            <input
              value={field.name}
              onChange={(e) => updateField(field.id, { name: e.target.value })}
              placeholder="Nama field, mis. Nomor WhatsApp"
              className={inputClass}
            />
            <div className="flex shrink-0 items-center gap-2">
              <Toggle
                checked={field.required}
                onChange={(v) => updateField(field.id, { required: v })}
              />
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="rounded p-1 text-[#6F7977] transition hover:bg-[#E4E9EB] hover:text-[#B3261E]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addField}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#E4E9EB] px-3.5 py-2 text-xs font-semibold text-[#3E4947] transition hover:brightness-105"
      >
        <Plus className="h-[18px] w-[18px]" />
        Tambah Field
      </button>
    </div>
  );
}

export default function PersonaAiPage({ onBack, onManageAi }) {
  const [subTab, setSubTab] = useState('peran');
  const [activeStage, setActiveStage] = useState('New');
  const [modelOpen, setModelOpen] = useState(false);
  const [modelId, setModelId] = useState('deepseek');

  const [botSystemOn, setBotSystemOn] = useState(false);
  const [officeHoursOn, setOfficeHoursOn] = useState(false);

  const [persona, setPersona] = useState(DEFAULT_PERSONA);
  const [knowledge, setKnowledge] = useState(DEFAULT_KNOWLEDGE);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPersonaConfig(), getOfficeHours()])
      .then(([personaRes, hoursRes]) => {
        if (cancelled) return;
        const cfg = (personaRes && personaRes.config) || null;
        if (cfg) {
          if (cfg.persona) setPersona({ ...DEFAULT_PERSONA, ...cfg.persona });
          if (cfg.knowledge) setKnowledge({ ...DEFAULT_KNOWLEDGE, ...cfg.knowledge });
          if (Array.isArray(cfg.fields)) setFields(cfg.fields);
          if (typeof cfg.activeStage === 'string') setActiveStage(cfg.activeStage);
          if (typeof cfg.modelId === 'string') setModelId(cfg.modelId);
          if (typeof cfg.botSystemOn === 'boolean') setBotSystemOn(cfg.botSystemOn);
        }
        const hours = hoursRes && hoursRes.officeHours;
        if (hours && typeof hours.enabled === 'boolean') setOfficeHoursOn(hours.enabled);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const saveAll = async () => {
    setSaving(true);
    setSaveNotice('');
    try {
      await Promise.all([
        savePersonaConfig({
          activeStage,
          modelId,
          model: activeModel.model,
          botSystemOn,
          persona,
          knowledge,
          fields
        }),
        saveOfficeHours({ enabled: officeHoursOn, startHour: 9, endHour: 18 })
      ]);
      setSaveNotice('Tersimpan ke server.');
    } catch (error) {
      setSaveNotice(`Gagal simpan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const [testInput, setTestInput] = useState('');
  const [testMessages, setTestMessages] = useState([
    {
      id: 1,
      from: 'user',
      text: 'Halo, saya Budi Utomo dari PT Sumber Makmur di Jakarta. Mau tanya apakah Netramaya CRM bisa otomatis kirim purchase event ke Meta CAPI?',
      time: '10:42'
    },
    {
      id: 2,
      from: 'bot',
      text: 'Halo Pak Budi Utomo! Tentu saja bisa. Netramaya CRM dirancang khusus closed-loop Meta CAPI dengan target skor EMQ 9.0+. Boleh tahu berapa estimasi budget iklan bulanan PT Sumber Makmur?',
      time: '10:43'
    },
    {
      id: 3,
      from: 'user',
      text: 'Budget kami sekitar 15 juta per bulan untuk kampanye retargeting.',
      time: '10:44'
    }
  ]);

  const activeModel = MODELS.find((m) => m.id === modelId) || MODELS[0];

  const sendTest = () => {
    const text = testInput.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setTestMessages((prev) => [
      ...prev,
      { id: Date.now(), from: 'user', text, time },
      {
        id: Date.now() + 1,
        from: 'bot',
        text: 'Baik, terima kasih infonya. Saya catat ya, Kak. Ada lagi yang bisa dibantu?',
        time
      }
    ]);
    setTestInput('');
  };

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-[#F8F9FB] p-4 md:p-6">
      {/* Judul halaman + tab utama */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-semibold text-[#00695F]">Otomasi · Chatbot</p>
          <h1 className="text-lg font-semibold tracking-tight text-[#191C1E]">Chatbot Builder</h1>
          <p className="text-xs text-[#6F7977]">
            Workflow event-based (gabungan Otomasi Pipeline) + Persona AI per stage.
          </p>
        </div>
        <div className="flex gap-1 border-b border-[#E2E8F0]">
          <button
            type="button"
            onClick={onBack}
            title="Kembali ke chatbot"
            className="-mb-px flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-xs font-semibold text-[#6F7977] transition hover:text-[#191C1E]"
          >
            <GitBranch className="h-4 w-4" />
            Workflow
          </button>
          <button
            type="button"
            aria-current="page"
            className="-mb-px flex items-center gap-2 border-b-2 border-[#00695F] px-3 py-2 text-xs font-semibold text-[#00695F]"
          >
            <Bot className="h-4 w-4" />
            Persona AI
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-5">
          {/* Header konfigurasi bot */}
          <header className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#CCE8E2] text-[#004F47]">
                    <Bot className="h-[18px] w-[18px]" />
                  </span>
                  <h1 className="text-lg font-semibold tracking-tight text-[#191C1E]">
                    Atur Chatbot AI untuk Tiap Tahap Prospek
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4E9EB] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#3E4947]">
                    Pelacakan Iklan Otomatis
                  </span>
                </div>
                <p className="text-xs text-[#6F7977]">
                  Atur balasan otomatis chatbot untuk setiap tahap calon pembeli dari iklan Meta Ads
                  &amp; WhatsApp. Pilih model AI yang ingin dipakai.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-[#F2F4F6] px-4 py-1.5 shadow-sm">
                  <span className="text-xs font-semibold text-[#191C1E]">Nyalakan Chatbot</span>
                  <Toggle checked={botSystemOn} onChange={setBotSystemOn} />
                </div>
                <button
                  type="button"
                  onClick={saveAll}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#E4E9EB] px-4 text-xs font-medium text-[#3E4947] transition hover:brightness-105 disabled:opacity-60"
                >
                  <Bookmark className="h-[18px] w-[18px]" />
                  Simpan Sementara
                </button>
                <button
                  type="button"
                  onClick={saveAll}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00695F] px-4 text-xs font-medium text-white shadow-sm transition hover:bg-[#004F47] active:scale-[0.98] disabled:opacity-60"
                >
                  <Rocket className="h-[18px] w-[18px]" />
                  Simpan &amp; Aktifkan
                </button>
              </div>
            </div>

            {/* Kartu Model AI */}
            <div className="relative rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-xs font-semibold text-[#3E4947]">
                    Model AI (dari Koneksi AI):
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModelOpen((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#191C1E] shadow-sm transition hover:border-[#BEC9C6]"
                    >
                      <Cpu className="h-[18px] w-[18px] text-[#00695F]" />
                      <span className="tracking-tight">{activeModel.label}</span>
                      <ChevronDown className="h-[18px] w-[18px] text-[#8A9492]" />
                    </button>
                    {modelOpen && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-lg">
                        {MODELS.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setModelId(model.id);
                              setModelOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-[#F2F4F6] ${
                              model.id === modelId ? 'font-semibold text-[#00695F]' : 'text-[#3E4947]'
                            }`}
                          >
                            {model.label}
                            {model.id === modelId && <Check className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EE] px-2.5 py-1 text-[10px] font-semibold text-[#16A34A]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#16A34A]" />
                    Terhubung
                  </span>
                  <span className="font-mono text-[11px] text-[#6F7977]">
                    API key hash:{' '}
                    <span className="rounded bg-[#E4E9EB] px-1 py-0.5">sha256:a1b2c3d4…c5d6</span> ·
                    tersimpan sebagai hash
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onManageAi}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F2F4F6] px-4 py-1.5 text-xs font-semibold text-[#00695F] transition hover:bg-[#E4E9EB]"
                >
                  <Settings className="h-[18px] w-[18px]" />
                  Kelola Koneksi AI
                </button>
              </div>
            </div>

            {/* Kartu Jam Operasional */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <Clock className="h-[18px] w-[18px] text-[#00695F]" />
                  <span className="text-xs font-semibold text-[#3E4947]">
                    Batasi ke Jam Operasional
                  </span>
                  <span className="text-[11px] text-[#8A9492]">
                    {officeHoursOn ? 'Bot aktif sesuai jam kerja' : 'Bot aktif 24/7'}
                  </span>
                </div>
                <Toggle checked={officeHoursOn} onChange={setOfficeHoursOn} />
              </div>
            </div>
            {saveNotice && (
              <p className="text-[11px] font-medium text-[#00695F]">{saveNotice}</p>
            )}
          </header>

          {/* Pilih stage CRM */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STAGES.map((stage) => {
                const isActive = stage.id === activeStage;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStage(stage.id)}
                    className={`flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs shadow-sm transition ${
                      isActive
                        ? 'bg-[#CCE8E2] font-bold text-[#004F47] ring-2 ring-[#00695F]'
                        : 'bg-[#E4E9EB] font-semibold text-[#3E4947] hover:bg-[#D5DDDC]'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? 'animate-ping bg-[#16A34A]' : 'bg-[#3B82F6]'
                      }`}
                    />
                    <span>{stage.label}</span>
                    <span className="rounded-full bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#6F7977]">
                      Default
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#E8F1FD] p-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-[#1D4ED8]" />
                <p className="text-xs text-[#191C1E]">
                  <span className="font-semibold">Tahap Aktif: {activeStage}</span> — Memakai model
                  global default.
                </p>
              </div>
              <span className="hidden items-center gap-1 text-[10px] font-semibold text-[#1D4ED8] sm:flex">
                Prisma State Machine
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </section>

          {/* Grid konfigurasi + testing */}
          <div className="grid grid-cols-1 items-start gap-5 pb-8 lg:grid-cols-12">
            {/* Kolom kiri */}
            <div className="flex flex-col gap-5 lg:col-span-7">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <nav className="mb-5 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-[#F2F4F6] p-1.5">
                  {SUB_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.id === subTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSubTab(tab.id)}
                        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                          isActive
                            ? 'bg-[#00695F] text-white shadow-sm'
                            : 'text-[#3E4947] hover:bg-[#E4E9EB]'
                        }`}
                      >
                        <Icon className={`h-[18px] w-[18px] ${isActive ? '' : 'text-[#8A9492]'}`} />
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#E4E9EB] text-[#3E4947]'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {subTab === 'peran' ? (
                  <PersonaTab value={persona} onChange={setPersona} />
                ) : subTab === 'pengetahuan' ? (
                  <KnowledgeTab value={knowledge} onChange={setKnowledge} />
                ) : (
                  <RequiredFieldsTab value={fields} onChange={setFields} />
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
                    onClick={saveAll}
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00695F] px-4 text-xs font-medium text-white shadow-sm transition hover:bg-[#004F47] active:scale-[0.98] disabled:opacity-60"
                  >
                    <Check className="h-[18px] w-[18px]" />
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </div>

            {/* Kolom kanan — testing */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:col-span-5">
              <div className="rounded-2xl bg-[#E4E9EB] p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#16A34A]" />
                    <span className="text-sm font-semibold text-[#191C1E]">
                      Testing Mode — {activeStage}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-[#CCE8E2] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#004F47]">
                      {activeModel.label}
                    </span>
                    <button
                      type="button"
                      title="Reset Percakapan"
                      onClick={() => setTestMessages([])}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#3E4947] transition hover:bg-[#D5DDDC]"
                    >
                      <RefreshCw className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col overflow-hidden rounded-xl bg-[#efeae2] shadow-inner">
                  <div className="flex items-center justify-between bg-[#00695F] px-4 py-2 text-white">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#00695F]">
                        BU
                      </span>
                      <div>
                        <div className="text-xs font-semibold leading-none">Budi Utomo</div>
                        <span className="text-[10px] text-[#CCE8E2] opacity-90">
                          WA Cloud API · Active 24h window
                        </span>
                      </div>
                    </div>
                    <MoreVertical className="h-5 w-5 text-[#CCE8E2]" />
                  </div>

                  <div className="flex h-80 flex-col gap-2 overflow-y-auto p-4">
                    {testMessages.map((message) =>
                      message.from === 'user' ? (
                        <div
                          key={message.id}
                          className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white p-3 text-[11px] text-[#191C1E] shadow-sm"
                        >
                          <p>{message.text}</p>
                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#8A9492]">
                            <span>{message.time}</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={message.id}
                          className="max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-[#CCE8E2] p-3 text-[11px] text-[#004F47] shadow-sm"
                        >
                          <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-[#5E8A80]">
                            <span>SYSTEM_BOT ({activeModel.label})</span>
                            <span>temp: 0.3</span>
                          </div>
                          <p>{message.text}</p>
                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#5E8A80]">
                            <span>{message.time}</span>
                            <span className="font-bold text-[#004F47]">✓✓</span>
                          </div>
                        </div>
                      )
                    )}
                    <div className="self-center rounded-full bg-[#E8F1FD] px-3 py-1 text-[10px] font-semibold text-[#1D4ED8] shadow-sm">
                      <Timer className="mr-1 inline h-3.5 w-3.5 align-middle" />
                      Sesi 24 jam aktif — Percakapan bebas dua arah didukung
                    </div>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto bg-white/80 px-4 py-1.5">
                    {['Tanya Integrasi CAPI', 'Sebut Budget 25jt', 'Minta Sales Manusia'].map(
                      (chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setTestInput(chip)}
                          className="whitespace-nowrap rounded-full bg-[#E4E9EB] px-2.5 py-1 text-[11px] font-medium text-[#191C1E] transition hover:bg-[#CCE8E2]"
                        >
                          {chip}
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-white p-2">
                    <input
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendTest()}
                      placeholder="Ketik pesan simulasi pelanggan..."
                      className="flex-1 rounded-full bg-[#F2F4F6] px-4 py-1.5 text-[11px] text-[#191C1E] outline-none placeholder:text-[#8A9492]"
                    />
                    <button
                      type="button"
                      onClick={sendTest}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00695F] text-white transition hover:bg-[#004F47] disabled:opacity-50"
                    >
                      <Send className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BrainCircuit className="h-[18px] w-[18px] text-[#00695F]" />
                      <span className="text-sm font-semibold text-[#191C1E]">
                        Ekstraksi Kontak Real-Time
                      </span>
                    </div>
                    <span className="rounded-full bg-[#E8F8EE] px-2 py-0.5 text-[10px] font-bold text-[#16A34A]">
                      0 dari 3 Terdeteksi
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {['Nama Pelanggan', 'Budget / Anggaran', 'Lokasi Domisili'].map((field) => (
                      <div
                        key={field}
                        className="flex items-center justify-between rounded bg-[#F2F4F6] px-2 py-1.5 text-[11px]"
                      >
                        <span className="text-[#3E4947]">
                          {field}: <strong className="font-medium text-[#191C1E]">—</strong>
                        </span>
                        <span className="flex items-center gap-1 rounded bg-[#E4E9EB] px-2 py-0.5 text-[10px] font-semibold text-[#3E4947]">
                          <MoreHorizontal className="h-3 w-3" />
                          Menunggu
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
