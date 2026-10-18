import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Zap,
  GitBranch,
  Bot,
  UserCheck,
  Globe,
  Plus,
  Play,
  Code,
  X,
  Sliders,
  Layers,
  Trash2,
  Copy,
  Search,
  Check,
  ShieldCheck,
  MousePointer,
  PanelRight,
  RotateCcw,
  Filter,
  Webhook,
  Send,
  MousePointerClick,
  List,
  Image,
  Clock,
  CalendarClock,
  Timer,
  Split,
  UserPlus,
  Tag,
  Gauge,
  Smile,
  Target,
  Upload,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye
} from 'lucide-react';
import PersonaAiPage from './persona-ai-page';
import AiConnectionPage from './ai-connection-page';

// ===== Tipe data socket (mengacu Node Editor Blender) =====
const SOCKET_TYPES = {
  flow: { label: 'Alur', color: '#FFFFFF', border: '#4A635F' },
  string: { label: 'String', color: '#EEEE22', border: '#8A8A17' },
  boolean: { label: 'Boolean', color: '#CC44CC', border: '#7A2979' },
  number: { label: 'Angka', color: '#A0E040', border: '#5E8A26' },
  json: { label: 'JSON', color: '#E68C1B', border: '#8C560F' },
  array: { label: 'Array', color: '#6363C7', border: '#3B3B7A' }
};

const SOCKET_ORDER = ['flow', 'string', 'boolean', 'number', 'json', 'array'];

// ===== Kategori node (warna header sesuai spec) =====
const CATEGORIES = {
  trigger: { label: 'Pemicu', color: '#C44040' },
  action: { label: 'Pesan', color: '#449944' },
  logic: { label: 'Logika', color: '#4466CC' },
  crm: { label: 'CRM', color: '#CC9922' },
  ai: { label: 'AI', color: '#2299AA' },
  integration: { label: 'Integrasi', color: '#776655' }
};

const CATEGORY_ORDER = ['trigger', 'action', 'logic', 'crm', 'ai', 'integration'];

// ===== Geometri node =====
const NODE_WIDTH = 280;
const NODE_HEADER_H = 44;
const SOCKET_ROW_H = 26;
const SOCKET_PAD_Y = 10;
const SUMMARY_H = 28;
const SUMMARY_GAP = 8;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.8;
const ZOOM_STEP = 0.1;

const clampZoom = (value) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));

const withAlpha = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const socketStroke = (type) => (type === 'flow' ? '#4A635F' : (SOCKET_TYPES[type] || SOCKET_TYPES.flow).color);

const FIELD_CLASS =
  'w-full bg-white border border-[#D5DDDC] rounded-lg px-3 py-2 text-xs text-[#191C1E] placeholder-[#8A9492] outline-none transition focus:border-[#00695F] focus:ring-4 focus:ring-[#00695F]/10';

// ===== Katalog lengkap node =====
const NODE_CATALOG = [
  // ---------- 2. Trigger ----------
  {
    type: 'onMessageNode',
    category: 'trigger',
    label: 'Pesan Masuk',
    icon: MessageSquare,
    description: 'Dipicu saat pesan WhatsApp biasa masuk dari kontak atau nomor baru.',
    summary: () => 'Semua pesan masuk',
    inputs: [],
    outputs: [
      { id: 'out', name: 'Lanjut', type: 'flow' },
      { id: 'body', name: 'Isi Pesan', type: 'string' },
      { id: 'phone', name: 'Nomor Pengirim', type: 'string' },
      { id: 'profile', name: 'Profil Pengirim', type: 'json' }
    ],
    fields: [{ key: 'note', label: 'Catatan', type: 'text', help: 'Label internal, tidak dikirim ke pelanggan.' }],
    defaultData: { note: 'Pesan masuk' }
  },
  {
    type: 'keywordMatchNode',
    category: 'trigger',
    label: 'Kata Kunci Cocok',
    icon: Filter,
    description: 'Mengecek apakah pesan memuat kata kunci tertentu.',
    summary: (d) => d.keyword,
    inputs: [{ id: 'keyword', name: 'Kata Kunci', type: 'string' }],
    outputs: [
      { id: 'matched', name: 'Cocok', type: 'flow' },
      { id: 'unmatched', name: 'Tidak cocok', type: 'flow' },
      { id: 'term', name: 'Matched Term', type: 'string' }
    ],
    fields: [
      { key: 'keyword', label: 'Kata Kunci', type: 'text', placeholder: 'PROMO' },
      {
        key: 'matchMode',
        label: 'Mode Pencocokan',
        type: 'select',
        options: ['contains', 'exact', 'regex']
      }
    ],
    defaultData: { keyword: 'PROMO', matchMode: 'contains' }
  },
  {
    type: 'ctwaNode',
    category: 'trigger',
    label: 'Dari Iklan WhatsApp',
    icon: Zap,
    description: 'Aktif saat pelanggan datang dari iklan Meta Ads.',
    summary: (d) => d.adId,
    inputs: [],
    outputs: [
      { id: 'out', name: 'Lanjut', type: 'flow' },
      { id: 'adId', name: 'ID Iklan', type: 'string' },
      { id: 'headline', name: 'Headline', type: 'string' },
      { id: 'sourceUrl', name: 'Link Sumber', type: 'string' }
    ],
    fields: [
      { key: 'adId', label: 'ID Iklan', type: 'text', placeholder: '120210000000000' },
      { key: 'headline', label: 'Headline Iklan', type: 'text' },
      { key: 'sourceUrl', label: 'Link Sumber', type: 'text' }
    ],
    defaultData: {
      adId: '120210445566778',
      headline: 'Promo Katalog 2026',
      sourceUrl: 'https://fb.me/ads/promo'
    }
  },
  {
    type: 'webhookNode',
    category: 'trigger',
    label: 'Dari Sistem Luar',
    icon: Webhook,
    description: 'Aktif saat sistem lain mengirim data ke chatbot.',
    summary: () => 'Webhook masuk',
    inputs: [{ id: 'secret', name: 'Kunci Rahasia', type: 'string' }],
    outputs: [
      { id: 'out', name: 'Lanjut', type: 'flow' },
      { id: 'payload', name: 'Data Masuk', type: 'json' }
    ],
    fields: [
      {
        key: 'secret',
        label: 'Kunci Rahasia',
        type: 'text',
        help: 'Token untuk memverifikasi signature request.'
      }
    ],
    defaultData: { secret: 'whsec_••••••' }
  },

  // ---------- 3. Action / Pesan ----------
  {
    type: 'sendTextNode',
    category: 'action',
    label: 'Kirim Pesan Teks',
    icon: Send,
    description: 'Kirim pesan teks standar yang mendukung variabel dinamis.',
    summary: (d) => d.body,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'body', name: 'Isi Pesan', type: 'string' },
      { id: 'vars', name: 'Data Variabel', type: 'json', optional: true }
    ],
    outputs: [
      { id: 'out', name: 'Lanjut', type: 'flow' },
      { id: 'wamid', name: 'Message ID', type: 'string' }
    ],
    fields: [
      {
        key: 'body',
        label: 'Isi Pesan',
        type: 'textarea',
        rows: 4,
        help: 'Boleh pakai variabel, contoh {{contact.first_name}}.'
      }
    ],
    defaultData: { body: 'Halo {{contact.first_name}}, terima kasih sudah menghubungi kami!' }
  },
  {
    type: 'sendButtonsNode',
    category: 'action',
    label: 'Kirim Tombol Pilihan',
    icon: MousePointerClick,
    description: 'Kirim pesan dengan sampai 3 tombol pilihan.',
    summary: (d) => d.header,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'header', name: 'Teks Header', type: 'string' },
      { id: 'options', name: 'Pilihan Tombol', type: 'array' }
    ],
    outputs: [
      { id: 'btn1', name: 'Tombol 1', type: 'flow' },
      { id: 'btn2', name: 'Tombol 2', type: 'flow' },
      { id: 'btn3', name: 'Tombol 3', type: 'flow' },
      { id: 'timeout', name: 'Waktu habis', type: 'flow' }
    ],
    fields: [
      { key: 'header', label: 'Teks Header', type: 'textarea', rows: 2 },
      { key: 'btn1', label: 'Tombol 1', type: 'text' },
      { key: 'btn2', label: 'Tombol 2', type: 'text' },
      { key: 'btn3', label: 'Tombol 3', type: 'text' },
      { key: 'timeoutSeconds', label: 'Batas Waktu (detik)', type: 'number', step: 10 }
    ],
    defaultData: {
      header: 'Halo! Pilih layanan yang kamu butuhkan:',
      btn1: 'Lihat Katalog',
      btn2: 'Konsultasi Sales',
      btn3: '',
      timeoutSeconds: 300
    }
  },
  {
    type: 'sendListNode',
    category: 'action',
    label: 'Kirim Menu Pilihan',
    icon: List,
    description: 'Kirim menu pilihan berisi beberapa item.',
    summary: (d) => d.title,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'title', name: 'Judul Menu', type: 'string' },
      { id: 'buttonLabel', name: 'Label Tombol', type: 'string' },
      { id: 'rows', name: 'Daftar Item', type: 'array' }
    ],
    outputs: [
      { id: 'selected', name: 'Dipilih', type: 'flow' },
      { id: 'rowId', name: 'Selected Row ID', type: 'string' },
      { id: 'rowTitle', name: 'Selected Row Title', type: 'string' }
    ],
    fields: [
      { key: 'title', label: 'Judul Menu', type: 'text' },
      { key: 'buttonLabel', label: 'Label Tombol Menu', type: 'text', placeholder: 'Pilih Layanan' },
      {
        key: 'rows',
        label: 'Item List',
        type: 'lines',
        rows: 4,
        help: 'Satu item per baris, maksimal 10 baris.'
      }
    ],
    defaultData: {
      title: 'Daftar Layanan',
      buttonLabel: 'Pilih Layanan',
      rows: ['Katalog Produk', 'Cek Harga', 'Bicara dengan CS']
    }
  },
  {
    type: 'sendMediaNode',
    category: 'action',
    label: 'Kirim Gambar/Dokumen',
    icon: Image,
    description: 'Kirim gambar, dokumen, audio, atau video ke pelanggan.',
    summary: (d) => d.mediaType,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'url', name: 'Link Media', type: 'string' },
      { id: 'mediaType', name: 'Tipe Media', type: 'string' },
      { id: 'caption', name: 'Caption', type: 'string', optional: true }
    ],
    outputs: [
      { id: 'out', name: 'Lanjut', type: 'flow' },
      { id: 'success', name: 'Success', type: 'boolean' }
    ],
    fields: [
      { key: 'url', label: 'Link Media', type: 'text', placeholder: 'https://...' },
      { key: 'mediaType', label: 'Tipe Media', type: 'select', options: ['image', 'document', 'audio', 'video'] },
      { key: 'caption', label: 'Caption', type: 'textarea', rows: 2 }
    ],
    defaultData: { url: 'https://cdn.adcrm.id/katalog-2026.pdf', mediaType: 'document', caption: 'Katalog resmi 2026' }
  },

  // ---------- 4. Logic ----------
  {
    type: 'conditionNode',
    category: 'logic',
    label: 'Jika / Maka',
    icon: GitBranch,
    description: 'Membandingkan dua nilai untuk memilih jalur.',
    summary: (d) => `${d.operandA} ${d.operator} ${d.operandB}`,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'operandA', name: 'Operand A', type: 'string' },
      { id: 'operator', name: 'Operator', type: 'string' },
      { id: 'operandB', name: 'Operand B', type: 'string' }
    ],
    outputs: [
      { id: 'true', name: 'Ya', type: 'flow' },
      { id: 'false', name: 'Tidak', type: 'flow' }
    ],
    fields: [
      { key: 'operandA', label: 'Operand A', type: 'text', placeholder: '{{lead.score}}' },
      {
        key: 'operator',
        label: 'Operator',
        type: 'select',
        options: ['==', '!=', '>', '<', 'contains', 'is_empty']
      },
      { key: 'operandB', label: 'Operand B', type: 'text', placeholder: '50' }
    ],
    defaultData: { operandA: '{{lead.score}}', operator: '>=', operandB: '50' }
  },
  {
    type: 'waitInputNode',
    category: 'logic',
    label: 'Tunggu Balasan',
    icon: Clock,
    description: 'Menahan alur untuk menunggu balasan bebas dari pelanggan.',
    summary: (d) => `${d.timeoutSeconds ?? 300} detik`,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'timeout', name: 'Timeout (detik)', type: 'number' }
    ],
    outputs: [
      { id: 'reply', name: 'Ada balasan', type: 'flow' },
      { id: 'timeoutOut', name: 'Waktu habis', type: 'flow' },
      { id: 'replyText', name: 'User Reply Text', type: 'string' }
    ],
    fields: [{ key: 'timeoutSeconds', label: 'Batas Waktu (detik)', type: 'number', step: 10 }],
    defaultData: { timeoutSeconds: 300 }
  },
  {
    type: 'delayNode',
    category: 'logic',
    label: 'Jeda / Efek Mengetik',
    icon: Timer,
    description: 'Memberi jeda agar balasan terasa seperti diketik manusia.',
    summary: (d) => `${d.duration ?? 2.5} detik`,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'duration', name: 'Durasi (detik)', type: 'number' }
    ],
    outputs: [{ id: 'out', name: 'Lanjut', type: 'flow' }],
    fields: [{ key: 'duration', label: 'Durasi (detik)', type: 'number', step: 0.5 }],
    defaultData: { duration: 2.5 }
  },
  {
    type: 'switchNode',
    category: 'logic',
    label: 'Pilih Cabang',
    icon: Split,
    description: 'Memilih cabang berdasarkan nilai tertentu.',
    summary: (d) => d.target,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'target', name: 'Sumber Nilai', type: 'string' }
    ],
    outputs: [
      { id: 'caseA', name: 'Kasus A', type: 'flow' },
      { id: 'caseB', name: 'Kasus B', type: 'flow' },
      { id: 'caseC', name: 'Kasus C', type: 'flow' },
      { id: 'default', name: 'Lainnya', type: 'flow' }
    ],
    fields: [
      { key: 'target', label: 'Sumber Nilai', type: 'text', placeholder: '{{last.reply}}' },
      { key: 'caseA', label: 'Nilai Case A', type: 'text' },
      { key: 'caseB', label: 'Nilai Case B', type: 'text' },
      { key: 'caseC', label: 'Nilai Case C', type: 'text' }
    ],
    defaultData: { target: '{{last.reply}}', caseA: '1', caseB: '2', caseC: '3' }
  },

  // ---------- 5. CRM ----------
  {
    type: 'updateStageNode',
    category: 'crm',
    label: 'Pindah Tahap Prospek',
    icon: UserCheck,
    description: 'Memindahkan pelanggan ke tahap penjualan tertentu.',
    summary: (d) => d.stageId,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'stageId', name: 'Tahap Tujuan', type: 'string' }
    ],
    outputs: [{ id: 'out', name: 'Lanjut', type: 'flow' }],
    fields: [{ key: 'stageId', label: 'Stage Tujuan', type: 'text', placeholder: 'Qualified Lead' }],
    defaultData: { stageId: 'Qualified Lead' }
  },
  {
    type: 'assignAgentNode',
    category: 'crm',
    label: 'Alihkan ke Admin/CS',
    icon: UserPlus,
    description: 'Alihkan obrolan dari bot ke admin/CS.',
    summary: (d) => d.department,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'department', name: 'Tim/Agen', type: 'string' },
      { id: 'mode', name: 'Cara Bagi', type: 'string' }
    ],
    outputs: [
      { id: 'assigned', name: 'Diteruskan', type: 'flow' },
      { id: 'noAgent', name: 'Tidak ada agen', type: 'flow' }
    ],
    fields: [
      { key: 'department', label: 'Tim / Agen', type: 'text', placeholder: 'Sales' },
      { key: 'mode', label: 'Mode Distribusi', type: 'select', options: ['Round-Robin', 'Least-Busy', 'Direct'] },
      {
        key: 'reply',
        label: 'Balasan Sebelum Dialihkan',
        type: 'textarea',
        rows: 2,
        help: 'Pesan yang dikirim bot sebelum percakapan diserahkan ke agen. Kosongkan untuk tanpa balasan.'
      }
    ],
    defaultData: {
      department: 'Sales',
      mode: 'Round-Robin',
      reply: 'Baik Kak, saya sambungkan ke tim CS/Admin ya. Mohon tunggu sebentar.'
    }
  },
  {
    type: 'customFieldNode',
    category: 'crm',
    label: 'Simpan Data ke CRM',
    icon: Tag,
    description: 'Menyimpan info dari obrolan ke data pelanggan.',
    summary: (d) => `${d.fieldName} = ${d.fieldValue}`,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'fieldName', name: 'Nama Field', type: 'string' },
      { id: 'fieldValue', name: 'Nilai Field', type: 'string' }
    ],
    outputs: [{ id: 'out', name: 'Lanjut', type: 'flow' }],
    fields: [
      { key: 'fieldName', label: 'Nama Field', type: 'text', placeholder: 'lokasi_domisili' },
      { key: 'fieldValue', label: 'Nilai Field', type: 'text' }
    ],
    defaultData: { fieldName: 'lokasi_domisili', fieldValue: 'Jakarta' }
  },
  {
    type: 'leadScoreNode',
    category: 'crm',
    label: 'Tambah Skor Prospek',
    icon: Gauge,
    description: 'Menambah atau mengurangi nilai peluang pembeli.',
    summary: (d) => `${(d.scoreValue ?? 0) > 0 ? '+' : ''}${d.scoreValue ?? 0} poin`,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'scoreValue', name: 'Nilai Skor', type: 'number' }
    ],
    outputs: [
      { id: 'out', name: 'Lanjut', type: 'flow' },
      { id: 'totalScore', name: 'Total Skor', type: 'number' }
    ],
    fields: [{ key: 'scoreValue', label: 'Perubahan Skor', type: 'number', step: 5, help: 'Boleh negatif, contoh -5.' }],
    defaultData: { scoreValue: 10 }
  },
  {
    type: 'appointmentNode',
    category: 'crm',
    label: 'Buat Janji Temu',
    icon: CalendarClock,
    description: 'Membuat jadwal janji temu; ditolak bila di luar jam operasional.',
    summary: (d) => d.requestedAt || 'Waktu janji',
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'requestedAt', name: 'Waktu Janji', type: 'string' }
    ],
    outputs: [
      { id: 'created', name: 'Janji Dibuat', type: 'flow' },
      { id: 'unavailable', name: 'Slot Tidak Tersedia', type: 'flow' }
    ],
    fields: [
      {
        key: 'requestedAt',
        label: 'Waktu Janji (ISO)',
        type: 'text',
        placeholder: '{{appointmentAt}}',
        help: 'Format tanggal ISO, mis. 2026-01-01T10:00:00Z. Gagal bila di luar jam operasional.'
      }
    ],
    defaultData: { requestedAt: '' }
  },

  // ---------- 6. AI ----------
  {
    type: 'aiAgentNode',
    category: 'ai',
    label: 'Balas dengan AI',
    icon: Bot,
    description: 'Membuat balasan otomatis dengan AI sesuai instruksi kamu.',
    summary: (d) => d.model,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'systemPrompt', name: 'Instruksi untuk AI', type: 'string' },
      { id: 'userInput', name: 'Pesan Pelanggan', type: 'string' },
      { id: 'crmContext', name: 'Data CRM', type: 'json' }
    ],
    outputs: [
      { id: 'out', name: 'Lanjut', type: 'flow' },
      { id: 'aiResponse', name: 'Balasan AI', type: 'string' },
      { id: 'intent', name: 'Maksud Pelanggan', type: 'string' }
    ],
    fields: [
      {
        key: 'systemPrompt',
        label: 'Instruksi untuk AI',
        type: 'textarea',
        rows: 4,
        help: 'Panduan karakter dan batas pengetahuan AI.'
      },
      { key: 'model', label: 'Model AI', type: 'text', help: 'Harus sama dengan model di Koneksi AI.' }
    ],
    defaultData: {
      systemPrompt: 'Anda adalah Sales Rep ramah yang membantu kualifikasi kebutuhan dan budget calon pembeli.',
      model: 'deepseek-v4.1-flash'
    }
  },
  {
    type: 'sentimentNode',
    category: 'ai',
    label: 'Baca Nada Pesan',
    icon: Smile,
    description: 'Menilai pesan pelanggan: positif, netral, atau negatif.',
    summary: (d) => `Ambang: ${d.threshold ?? 0.6}`,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'inputText', name: 'Teks Sumber', type: 'string' }
    ],
    outputs: [
      { id: 'positive', name: 'Positif', type: 'flow' },
      { id: 'neutral', name: 'Netral', type: 'flow' },
      { id: 'negative', name: 'Negatif', type: 'flow' },
      { id: 'score', name: 'Skor Nada', type: 'number' }
    ],
    fields: [
      { key: 'inputText', label: 'Teks Sumber', type: 'text', placeholder: '{{last.reply}}' },
      {
        key: 'threshold',
        label: 'Ambang Negatif',
        type: 'number',
        step: 0.1,
        help: 'Skor di bawah nilai ini dianggap perlu eskalasi.'
      }
    ],
    defaultData: { inputText: '{{last.reply}}', threshold: -0.6 }
  },

  // ---------- 7. Integrasi ----------
  {
    type: 'httpRequestNode',
    category: 'integration',
    label: 'Panggil API Luar',
    icon: Globe,
    description: 'Menghubungi layanan lain lewat internet.',
    summary: (d) => `${d.method} ${d.url}`,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'method', name: 'Metode', type: 'string' },
      { id: 'url', name: 'URL', type: 'string' },
      { id: 'headersBody', name: 'Header & Isi', type: 'json' }
    ],
    outputs: [
      { id: 'success', name: 'Sukses', type: 'flow' },
      { id: 'error', name: 'Gagal', type: 'flow' },
      { id: 'statusCode', name: 'Kode Status', type: 'number' },
      { id: 'responseData', name: 'Data Balasan', type: 'json' }
    ],
    fields: [
      { key: 'method', label: 'Metode', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      { key: 'url', label: 'Alamat URL', type: 'text', placeholder: 'https://api.example.com/orders' },
      { key: 'headersBody', label: 'Header & Isi (JSON)', type: 'textarea', rows: 3 }
    ],
    defaultData: {
      method: 'POST',
      url: 'https://api.example.com/orders',
      headersBody: '{\n  "Authorization": "Bearer {{env.token}}"\n}'
    }
  },
  {
    type: 'capiNode',
    category: 'integration',
    label: 'Lapor Konversi ke Meta',
    icon: Target,
    description: 'Mengirim data konversi ke Meta untuk pelacakan iklan.',
    summary: (d) => d.eventName,
    inputs: [
      { id: 'in', name: 'Masuk', type: 'flow' },
      { id: 'eventName', name: 'Nama Event', type: 'string' },
      { id: 'currencyValue', name: 'Nilai Transaksi', type: 'number', optional: true }
    ],
    outputs: [{ id: 'out', name: 'Lanjut', type: 'flow' }],
    fields: [
      { key: 'eventName', label: 'Jenis Event', type: 'select', options: ['Lead', 'Purchase', 'Contact', 'Schedule'] },
      { key: 'currencyValue', label: 'Nilai Transaksi', type: 'number', step: 1000, optional: true }
    ],
    defaultData: { eventName: 'Lead', currencyValue: 150000 }
  }
];

const NODE_BY_TYPE = NODE_CATALOG.reduce((acc, item) => {
  acc[item.type] = item;
  return acc;
}, {});

// ===== Pembuat graf otomatis: rangkai node sesuai urutan, sambung socket FLOW =====
function buildGraph(spec) {
  const nodes = spec.map((step, i) => {
    const def = NODE_BY_TYPE[step.type];
    return {
      id: `n${i + 1}`,
      type: step.type,
      label: step.label || def.label,
      x: step.x ?? 60 + i * 340,
      y: step.y ?? 160,
      data: { ...def.defaultData, ...(step.data || {}) }
    };
  });

  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const outSocket = NODE_BY_TYPE[nodes[i].type].outputs.find((s) => s.type === 'flow');
    const inSocket = NODE_BY_TYPE[nodes[i + 1].type].inputs.find((s) => s.type === 'flow');
    if (outSocket && inSocket) {
      edges.push({
        id: `e${i + 1}`,
        source: nodes[i].id,
        sourceHandle: outSocket.id,
        target: nodes[i + 1].id,
        targetHandle: inSocket.id,
        color: '#4A635F'
      });
    }
  }

  return { nodes, edges };
}

// ===== Galeri template bot (tampil sebelum masuk kanvas) =====
const BOT_CATEGORIES = [
  { id: 'all', label: 'Semua template' },
  { id: 'generate_leads', label: 'Hasilkan lead' },
  { id: 'business_info', label: 'Info bisnis' },
  { id: 'nurture_leads', label: 'Memelihara lead' },
  { id: 'reduce_busywork', label: 'Mengurangi kesibukan' },
  { id: 'automate_booking', label: 'Notifikasi booking' }
];

const BOT_CHANNELS = [
  { id: 'wa', label: 'WhatsApp Business' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'fb_messenger', label: 'Messenger' },
  { id: 'mail', label: 'Email' },
  { id: 'crm_plugin', label: 'Live chat' }
];

const ALL_CHANNELS = ['wa', 'telegram', 'instagram', 'tiktok', 'fb_messenger', 'mail', 'crm_plugin'];

const BOT_TEMPLATES = [
  {
    id: 'welcome_bot',
    title: 'Sapa Pelanggan Baru',
    category: 'business_info',
    channelIds: ALL_CHANNELS,
    icon: MessageSquare,
    tint: 'from-[#00695F] to-[#004F47]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'sendTextNode', label: 'Sapaan', data: { body: 'Halo! Terima kasih sudah menghubungi kami. Ada yang bisa dibantu?' } },
      { type: 'sendButtonsNode', label: 'Menu Bantuan', data: { header: 'Pilih topik:' } },
      { type: 'aiAgentNode', label: 'AI Menjawab' }
    ]
  },
  {
    id: 'receive_booking',
    title: 'Catat Jadwal Janji Temu',
    category: 'automate_booking',
    channelIds: ['wa', 'instagram', 'fb_messenger'],
    icon: CalendarClock,
    tint: 'from-[#1D4ED8] to-[#1E3A8A]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'aiAgentNode', label: 'AI Jadwalkan' },
      { type: 'appointmentNode', label: 'Buat Janji' },
      { type: 'sendTextNode', label: 'Konfirmasi', data: { body: 'Janji temu kamu sudah dicatat. Sampai jumpa!' } }
    ]
  },
  {
    id: 'capture_callback',
    title: 'Kumpulkan Nomor untuk Ditelepon',
    category: 'generate_leads',
    channelIds: ['wa', 'tiktok', 'instagram'],
    icon: UserPlus,
    tint: 'from-[#B26A00] to-[#7C4A00]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'aiAgentNode', label: 'AI Kualifikasi' },
      { type: 'customFieldNode', label: 'Simpan Kontak', data: { fieldName: 'nomor_telepon' } },
      { type: 'assignAgentNode', label: 'Alihkan ke Sales' }
    ]
  },
  {
    id: 'qualify_budget',
    title: 'Saring Pelanggan Siap Beli',
    category: 'generate_leads',
    channelIds: ['wa', 'fb_messenger'],
    icon: Gauge,
    tint: 'from-[#7C3AED] to-[#4C1D95]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'aiAgentNode', label: 'AI Kualifikasi' },
      { type: 'leadScoreNode', label: 'Tambah Skor', data: { scoreValue: 25 } },
      { type: 'updateStageNode', label: 'Naik Tahap', data: { stageId: 'Qualified' } }
    ]
  },
  {
    id: 'business_faq',
    title: 'Jawab Pertanyaan Umum',
    category: 'business_info',
    channelIds: ALL_CHANNELS,
    icon: Bot,
    tint: 'from-[#0E7490] to-[#164E63]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'keywordMatchNode', label: 'Kata Kunci', data: { keyword: 'harga, jam buka, alamat' } },
      { type: 'aiAgentNode', label: 'AI Menjawab' },
      { type: 'sendTextNode', label: 'Kirim Jawaban' }
    ]
  },
  {
    id: 'keyword_reply',
    title: 'Balas Otomatis per Kata Kunci',
    category: 'reduce_busywork',
    channelIds: ['wa', 'telegram', 'instagram', 'tiktok'],
    icon: Zap,
    tint: 'from-[#D97706] to-[#92400E]',
    steps: [
      { type: 'keywordMatchNode', label: 'Kata Kunci Promo', data: { keyword: 'PROMO' } },
      { type: 'sendTextNode', label: 'Kirim Info', data: { body: 'Ini info promo terbaru untuk kamu!' } }
    ]
  },
  {
    id: 'offline_message',
    title: 'Balas Saat Anda Tidak Online',
    category: 'reduce_busywork',
    channelIds: ALL_CHANNELS,
    icon: Clock,
    tint: 'from-[#334155] to-[#0F172A]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'sendTextNode', label: 'Balas Otomatis', data: { body: 'Kami sedang offline. Pesanmu akan dibalas saat jam kerja.' } },
      { type: 'customFieldNode', label: 'Simpan Pesan', data: { fieldName: 'pesan_offline' } }
    ]
  },
  {
    id: 'collect_feedback',
    title: 'Minta Penilaian Pelanggan',
    category: 'nurture_leads',
    channelIds: ['wa', 'fb_messenger', 'instagram'],
    icon: Smile,
    tint: 'from-[#DB2777] to-[#831843]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'sendButtonsNode', label: 'Tanya Kepuasan', data: { header: 'Seberapa puas kamu?', btn1: '😍 Puas', btn2: '🙂 Biasa', btn3: '😞 Kurang' } },
      { type: 'sentimentNode', label: 'Baca Nada' }
    ]
  },
  {
    id: 'schedule_promo',
    title: 'Kirim Promo Terjadwal',
    category: 'nurture_leads',
    channelIds: ['wa', 'mail', 'telegram'],
    icon: Timer,
    tint: 'from-[#0D9488] to-[#115E59]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'delayNode', label: 'Jeda', data: { duration: 3 } },
      { type: 'sendTextNode', label: 'Kirim Promo', data: { body: 'Jangan lewatkan promo spesial kami hari ini!' } }
    ]
  },
  {
    id: 'route_requests',
    title: 'Teruskan ke Bagian yang Tepat',
    category: 'reduce_busywork',
    channelIds: ALL_CHANNELS,
    icon: Split,
    tint: 'from-[#4338CA] to-[#312E81]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'conditionNode', label: 'Cek Departemen', data: { operandA: '{{lastReply}}', operator: 'contains', operandB: 'sales' } },
      { type: 'assignAgentNode', label: 'Alihkan ke Tim' }
    ]
  },
  {
    id: 'send_promo_code',
    title: 'Bagikan Kode Diskon',
    category: 'nurture_leads',
    channelIds: ['wa', 'instagram', 'tiktok'],
    icon: Tag,
    tint: 'from-[#C2410C] to-[#7C2D12]',
    steps: [
      { type: 'keywordMatchNode', label: 'Kata Kunci Kode', data: { keyword: 'KODE' } },
      { type: 'sendTextNode', label: 'Kirim Barcode', data: { body: 'Kode promomu: HEMAT10. Berlaku sampai akhir bulan.' } }
    ]
  },
  {
    id: 'follow_up_booking',
    title: 'Ingatkan Jadwal Janji',
    category: 'automate_booking',
    channelIds: ['wa', 'mail'],
    icon: CalendarClock,
    tint: 'from-[#0369A1] to-[#0C4A6E]',
    steps: [
      { type: 'onMessageNode', label: 'Pesan Masuk' },
      { type: 'sendButtonsNode', label: 'Konfirmasi', data: { header: 'Konfirmasi jadwal janji temu kamu?', btn1: 'Ya, konfirmasi', btn2: 'Jadwal ulang' } },
      { type: 'appointmentNode', label: 'Catat Janji' }
    ]
  }
];

function shuffleArray(list) {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const BOTS = [
  {
    id: 'bot-1',
    name: 'Kualifikasi Lead CTWA',
    status: 'Aktif',
    updatedAt: '2 jam lalu',
    triggers: ['Pesan masuk dari iklan CTWA', 'Skor lead ≥ 50'],
    conversion: 42.5,
    totalLaunches: 1280,
    activeSessions: 12,
    graph: buildGraph([
      { type: 'ctwaNode', label: 'Iklan CTWA Masuk' },
      { type: 'conditionNode', label: 'Cek Skor Lead', y: 260, data: { operandA: '{{lead.score}}', operator: '>=', operandB: '50' } },
      { type: 'aiAgentNode', label: 'Kualifikasi AI', y: 60 },
      { type: 'sendTextNode', label: 'Kirim Info Katalog', y: 60 }
    ])
  },
  {
    id: 'bot-2',
    name: 'Bot NPS',
    status: 'Draf',
    updatedAt: '1 hari lalu',
    triggers: ['Percakapan ditutup'],
    conversion: 0,
    totalLaunches: 0,
    activeSessions: 0,
    graph: buildGraph([
      { type: 'webhookNode', label: 'Percakapan Ditutup', data: { secret: 'whsec_nps' } },
      { type: 'sentimentNode', label: 'Baca Nada Balasan', y: 260 },
      { type: 'sendButtonsNode', label: 'Minta Skor 1-10', y: 60 }
    ])
  },
  {
    id: 'bot-3',
    name: 'Follow-up Keranjang',
    status: 'Aktif',
    updatedAt: '5 jam lalu',
    triggers: ['Kata kunci "KERANJANG"', 'Waktu respons terlampaui'],
    conversion: 18.2,
    totalLaunches: 640,
    activeSessions: 3,
    graph: buildGraph([
      { type: 'keywordMatchNode', label: 'Deteksi Kata Kunci', data: { keyword: 'KERANJANG' } },
      { type: 'delayNode', label: 'Jeda 5 Menit', y: 260, data: { duration: 300 } },
      { type: 'sendTextNode', label: 'Ingatkan Keranjang', y: 60 }
    ])
  },
  {
    id: 'bot-4',
    name: 'Onboarding Reseller',
    status: 'Dijeda',
    updatedAt: '3 hari lalu',
    triggers: ['Pesan baru', 'Webhook pendaftaran'],
    conversion: 33,
    totalLaunches: 210,
    activeSessions: 5,
    graph: buildGraph([
      { type: 'onMessageNode', label: 'Pesan Reseller Masuk' },
      { type: 'sendListNode', label: 'Menu Paket Reseller', y: 260 },
      { type: 'assignAgentNode', label: 'Alihkan ke Tim Partner', y: 60 }
    ])
  }
];

const cloneGraph = (graph) => ({
  nodes: graph.nodes.map((n) => ({ ...n, data: { ...n.data } })),
  edges: graph.edges.map((e) => ({ ...e }))
});

// Urutkan node mengikuti alur (BFS dari pemicu) untuk pratinjau percakapan.
function orderGraphNodes(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const reached = new Set(edges.map((e) => e.target));
  const queue = nodes.filter((n) => !reached.has(n.id));
  const ordered = [];
  const seen = new Set();

  while (queue.length) {
    const node = queue.shift();
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);
    ordered.push(node);
    edges
      .filter((e) => e.source === node.id)
      .forEach((e) => {
        const next = byId.get(e.target);
        if (next && !seen.has(next.id)) queue.push(next);
      });
  }

  nodes.forEach((n) => {
    if (!seen.has(n.id)) ordered.push(n);
  });

  return ordered;
}

// Terjemahkan node menjadi gelembung percakapan WhatsApp (perkiraan dari alur).
function buildChatPreview(nodes, edges) {
  return orderGraphNodes(nodes, edges)
    .map((node) => {
      const def = NODE_BY_TYPE[node.type];
      if (!def) return null;
      const data = node.data || {};

      if (def.category === 'trigger') {
        return { id: node.id, kind: 'note', text: `Pemicu · ${node.label}` };
      }
      if (node.type === 'sendTextNode') {
        return { id: node.id, kind: 'bot', text: data.body || '(pesan kosong)' };
      }
      if (node.type === 'sendButtonsNode') {
        return {
          id: node.id,
          kind: 'bot',
          text: data.header || '(tanpa header)',
          buttons: [data.btn1, data.btn2, data.btn3].filter(Boolean)
        };
      }
      if (node.type === 'sendListNode') {
        return {
          id: node.id,
          kind: 'bot',
          text: data.title || '(tanpa judul)',
          listLabel: data.buttonLabel,
          buttons: (data.rows || []).slice(0, 4)
        };
      }
      if (node.type === 'sendMediaNode') {
        return { id: node.id, kind: 'bot', text: data.caption || data.url || '(media)', media: data.mediaType };
      }
      if (node.type === 'aiAgentNode') {
        return { id: node.id, kind: 'bot', text: 'Baik, boleh dijelaskan kebutuhan dan budget Anda?', ai: data.model };
      }

      return { id: node.id, kind: 'note', text: `${def.label} · ${def.summary ? def.summary(data) || '' : ''}`.trim() };
    })
    .filter(Boolean);
}

// ===== Layout per node (dihitung, bukan diukur dari DOM) =====
function layoutNode(node) {
  const def = NODE_BY_TYPE[node.type];
  const inputs = def ? def.inputs : [];
  const outputs = def ? def.outputs : [];
  const rows = Math.max(inputs.length, outputs.length);
  const summary = def && def.summary ? def.summary(node.data || {}) : null;
  const hasSummary = Boolean(summary);
  const socketsTop = NODE_HEADER_H + (hasSummary ? SUMMARY_H + SUMMARY_GAP : 0) + SOCKET_PAD_Y;
  const height = socketsTop + rows * SOCKET_ROW_H + SOCKET_PAD_Y;

  return { def, inputs, outputs, rows, summary, hasSummary, socketsTop, height };
}

function socketScreenPos(node, handleId, zoom, pan) {
  const layout = layoutNode(node);
  const baseY = node.y * zoom + pan.y;
  const baseX = node.x * zoom + pan.x;

  const inIndex = layout.inputs.findIndex((s) => s.id === handleId);
  if (inIndex >= 0) {
    return {
      x: baseX,
      y: baseY + (layout.socketsTop + inIndex * SOCKET_ROW_H + SOCKET_ROW_H / 2) * zoom
    };
  }

  const outIndex = layout.outputs.findIndex((s) => s.id === handleId);
  if (outIndex >= 0) {
    return {
      x: baseX + NODE_WIDTH * zoom,
      y: baseY + (layout.socketsTop + outIndex * SOCKET_ROW_H + SOCKET_ROW_H / 2) * zoom
    };
  }

  return { x: baseX, y: baseY };
}

function findSocket(node, handleId) {
  const layout = layoutNode(node);
  const input = layout.inputs.find((s) => s.id === handleId);
  if (input) return { socket: input, side: 'in' };
  const output = layout.outputs.find((s) => s.id === handleId);
  if (output) return { socket: output, side: 'out' };
  return null;
}

function SocketRowLabel({ socket, align }) {
  return (
    <div
      className={`pointer-events-none absolute flex items-center ${
        align === 'right' ? 'justify-end' : ''
      }`}
      style={{
        top: socket.rowTop,
        height: SOCKET_ROW_H,
        [align === 'right' ? 'right' : 'left']: 12,
        width: '58%'
      }}
    >
      <span className="truncate text-[10px] font-medium text-[#3E4947]">
        {socket.name}
        {socket.optional ? ' (opsional)' : ''}
      </span>
    </div>
  );
}

function EmptyCanvasState({ onOpenCatalog }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-dashed border-[#BEC9C6] bg-white/80 p-8 text-center shadow-sm backdrop-blur">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F3F0] text-[#00695F]">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="text-sm font-semibold text-[#191C1E]">Canvas masih kosong</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#6F7977]">
          Tarik blok dari daftar di kiri untuk mulai menyusun alur chatbot.
        </p>
        <button
          onClick={onOpenCatalog}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#00695F] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#004F47] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/20"
        >
          <Plus className="h-4 w-4" />
          Buka Daftar Node
        </button>
      </div>
    </div>
  );
}

function FieldControl({ field, value, onChange }) {
  const label = (
    <label className="mb-1 block text-[11px] font-semibold text-[#3E4947]">
      {field.label}
      {field.optional ? <span className="font-normal text-[#8A9492]"> (opsional)</span> : null}
    </label>
  );

  let control;

  if (field.type === 'textarea') {
    control = (
      <textarea
        rows={field.rows || 3}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={`${FIELD_CLASS} resize-none`}
      />
    );
  } else if (field.type === 'lines') {
    control = (
      <textarea
        rows={field.rows || 4}
        value={(value || []).join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean))}
        placeholder={field.placeholder}
        className={`${FIELD_CLASS} resize-none`}
      />
    );
  } else if (field.type === 'select') {
    control = (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_CLASS}
      >
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'number') {
    control = (
      <input
        type="number"
        step={field.step || 1}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder={field.placeholder}
        className={FIELD_CLASS}
      />
    );
  } else {
    control = (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={FIELD_CLASS}
      />
    );
  }

  return (
    <div>
      {label}
      {control}
      {field.help && <p className="mt-1 text-[10px] leading-snug text-[#8A9492]">{field.help}</p>}
    </div>
  );
}

function SocketLegendRow({ type }) {
  const info = SOCKET_TYPES[type];
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border"
        style={{ backgroundColor: info.color, borderColor: info.border }}
      />
      <span className="text-[10px] text-[#6F7977]">
        <span className="font-semibold text-[#3E4947]">{info.label}</span>
      </span>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    Aktif: 'border-[#86EFAC] bg-[#E8F8EE] text-[#16A34A]',
    Draf: 'border-[#BEC9C6] bg-[#E1E2E4] text-[#3E4947]',
    Dijeda: 'border-[#FCD34D] bg-[#FEF3E7] text-[#D97706]'
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        styles[status] || styles.Draf
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function ChannelCheck({ checked, label, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
        checked ? 'bg-[#E8F5F2] text-[#004F47]' : 'text-[#3E4947] hover:bg-[#F2F4F6]'
      }`}
    >
      <span className="truncate">{label}</span>
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
          checked ? 'border-[#00695F] bg-[#00695F] text-white' : 'border-[#BEC9C6] bg-white'
        }`}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}

function BotTemplatesLibrary({ onClose, onPick, onBlank }) {
  const [category, setCategory] = useState('all');
  const [channels, setChannels] = useState([]);
  const [search, setSearch] = useState('');

  const allChannels = channels.length === BOT_CHANNELS.length;
  const toggleChannel = (id) =>
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  const toggleAll = () => setChannels(allChannels ? [] : BOT_CHANNELS.map((c) => c.id));

  const categoryCounts = useMemo(() => {
    const counts = { all: BOT_TEMPLATES.length };
    BOT_CATEGORIES.forEach((cat) => {
      if (cat.id === 'all') return;
      counts[cat.id] = BOT_TEMPLATES.filter((t) => t.category === cat.id).length;
    });
    return counts;
  }, []);

  const query = search.trim().toLowerCase();
  const baseTemplates = useMemo(() => shuffleArray(BOT_TEMPLATES), []);
  const templates = baseTemplates.filter((t) => {
    const inCategory = category === 'all' || t.category === category;
    const inChannel = channels.length === 0 || t.channelIds.some((c) => channels.includes(c));
    const inSearch = !query || t.title.toLowerCase().includes(query);
    return inCategory && inChannel && inSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#191C1E]">Pilih template bot</h2>
            <p className="mt-0.5 text-xs text-[#6F7977]">
              Mulai cepat dari template, atau susun alur sendiri dari kanvas kosong.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup galeri template"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DDE4E6] bg-white text-[#3E4947] transition hover:bg-[#F6F9F8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Sidebar filter */}
          <aside className="flex flex-col gap-4 lg:col-span-3">
            <button
              type="button"
              onClick={onBlank}
              className="flex items-center gap-3 rounded-xl border border-[#00695F] bg-[#E8F5F2] p-3.5 text-left transition hover:bg-[#DCF0EB]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00695F] text-white">
                <Plus className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-semibold text-[#004F47]">Mulai dari awal</span>
                <span className="block text-[10px] text-[#0F766E]">Kanvas kosong</span>
              </span>
            </button>

            <div className="rounded-xl bg-white p-3 shadow-sm">
              <h3 className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[#8A9492]">
                Kategori
              </h3>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {BOT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                      category === cat.id
                        ? 'bg-[#E8F5F2] font-semibold text-[#004F47]'
                        : 'text-[#3E4947] hover:bg-[#F2F4F6]'
                    }`}
                  >
                    <span className="truncate">{cat.label}</span>
                    <span className="shrink-0 rounded-full bg-[#E4E9EB] px-1.5 py-0.5 text-[10px] font-semibold text-[#6F7977]">
                      {categoryCounts[cat.id] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#8A9492]">
                  Saluran
                </h3>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[10px] font-semibold text-[#00695F] hover:underline"
                >
                  {allChannels ? 'Kosongkan' : 'Pilih semua'}
                </button>
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {BOT_CHANNELS.map((ch) => (
                  <ChannelCheck
                    key={ch.id}
                    checked={channels.includes(ch.id)}
                    label={ch.label}
                    onChange={() => toggleChannel(ch.id)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Daftar template */}
          <div className="lg:col-span-9">
            <div className="flex items-center gap-2">
              <div className="flex h-9 flex-1 items-center rounded-lg border border-[#D5DDDC] bg-white px-3 focus-within:border-[#00695F] focus-within:ring-4 focus-within:ring-[#00695F]/10">
                <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-[#6F7977]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari template..."
                  className="w-full bg-transparent text-xs text-[#191C1E] outline-none placeholder-[#8A9492]"
                />
              </div>
              <span className="shrink-0 rounded-full bg-[#E4E9EB] px-2.5 py-1 text-[11px] font-semibold text-[#3E4947]">
                {templates.length} template
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPick(t)}
                    className="group flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#00695F] hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${t.tint} text-white`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-semibold leading-snug text-[#191C1E]">
                        {t.title}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      {t.steps.slice(0, 3).map((step, i) => (
                        <span
                          key={`${t.id}-${i}`}
                          className="rounded bg-[#F2F4F6] px-1.5 py-0.5 text-[10px] font-medium text-[#6F7977]"
                        >
                          {step.label}
                        </span>
                      ))}
                      {t.steps.length > 3 && (
                        <span className="text-[10px] font-semibold text-[#8A9492]">
                          +{t.steps.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {templates.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-[#BEC9C6] p-8 text-center text-xs text-[#6F7977]">
                  Tidak ada template yang cocok. Coba ubah kategori, saluran, atau kata kunci.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotListPage({ bots, onOpen, onCreate, onImport, onDelete }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [selectedIds, setSelectedIds] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const filteredBots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bots.filter((bot) => {
      const matchesStatus = statusFilter === 'Semua' || bot.status === statusFilter;
      const matchesQuery =
        !q ||
        bot.name.toLowerCase().includes(q) ||
        bot.triggers.some((t) => t.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [bots, query, statusFilter]);

  const allSelected = filteredBots.length > 0 && filteredBots.every((b) => selectedIds.includes(b.id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : filteredBots.map((b) => b.id));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.nodes)) throw new Error('format');
      onImport(file.name.replace(/\.json$/i, ''), {
        nodes: parsed.nodes,
        edges: Array.isArray(parsed.edges) ? parsed.edges : []
      });
      setErrorMessage('');
    } catch {
      setErrorMessage('File JSON tidak valid. Pastikan berisi field "nodes" dan "edges".');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        {/* Judul halaman + aksi */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#191C1E]">Chatbot</h2>
            <p className="mt-0.5 text-[11px] text-[#6F7977]">
              Daftar chatbot WhatsApp yang membalas pelanggan dari iklan Meta Ads kamu
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Impor alur dari file JSON"
              className="flex h-8 items-center gap-2 rounded-lg border border-[#DDE4E6] bg-white px-3 text-xs font-semibold text-[#3E4947] transition hover:border-[#BEC9C6] hover:bg-[#F6F9F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/15"
            >
              <Upload className="h-3.5 w-3.5" />
              Impor
            </button>
            <button
              onClick={onCreate}
              className="flex h-8 items-center gap-2 rounded-lg bg-[#00695F] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#004F47] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/25"
            >
              <Plus className="h-4 w-4" />
              Buat bot
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex h-8 min-w-[220px] flex-1 items-center rounded-lg border border-[#D5DDDC] bg-white px-3 transition focus-within:border-[#00695F] focus-within:ring-4 focus-within:ring-[#00695F]/10 sm:max-w-xs">
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-[#6F7977]" />
            <input
              type="text"
              placeholder="Cari bot atau pemicu..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-[#191C1E] outline-none placeholder-[#8A9492]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Bersihkan pencarian"
                className="ml-1 rounded p-0.5 text-[#6F7977] hover:bg-[#E4E9EB]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {['Semua', 'Aktif', 'Draf', 'Dijeda'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`h-8 rounded-full px-3 text-[11px] font-semibold transition ${
                  statusFilter === status
                    ? 'bg-[#00695F] text-white'
                    : 'bg-[#E4E9EB] text-[#3E4947] hover:bg-[#D5DDDC]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#3E4947]">
                {selectedIds.length} dipilih
              </span>
              <button
                onClick={() => {
                  onDelete(selectedIds);
                  setSelectedIds([]);
                }}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[#F8B4BD] bg-[#FCE8EB] px-2.5 text-[11px] font-semibold text-[#B3261E] transition hover:bg-[#F8D0D6]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <p className="mt-2 rounded-lg border border-[#F8B4BD] bg-[#FCE8EB] px-3 py-2 text-[11px] font-medium text-[#B3261E]">
            {errorMessage}
          </p>
        )}

        {/* Tabel bot */}
        <div className="mt-3 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F2F4F6] text-[10px] uppercase tracking-wide text-[#6F7977]">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Pilih semua bot"
                      className="h-3.5 w-3.5 accent-[#00695F]"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Nama</th>
                  <th className="px-3 py-2.5 font-semibold">Pemicu</th>
                  <th className="px-3 py-2.5 font-semibold">Persentase konversi</th>
                  <th className="px-3 py-2.5 font-semibold">Total diluncurkan</th>
                  <th className="px-3 py-2.5 font-semibold">Sesi aktif</th>
                  <th className="w-12 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filteredBots.map((bot) => {
                  const firstType = bot.graph.nodes[0]?.type;
                  const accent = CATEGORIES[NODE_BY_TYPE[firstType]?.category]?.color || '#00695F';
                  return (
                    <tr
                      key={bot.id}
                      onClick={() => onOpen(bot.id)}
                      className="cursor-pointer border-b border-[#EEF2F3] transition last:border-b-0 hover:bg-[#F6F9F8]"
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(bot.id)}
                          onChange={() => toggleOne(bot.id)}
                          aria-label={`Pilih ${bot.name}`}
                          className="h-3.5 w-3.5 accent-[#00695F]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-[#00695F] hover:underline">
                                {bot.name}
                              </span>
                              <StatusPill status={bot.status} />
                            </div>
                            <div className="mt-0.5 text-[10px] text-[#8A9492]">
                              Diubah {bot.updatedAt} &middot; {bot.graph.nodes.length} node
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {bot.triggers.slice(0, 2).map((trigger) => (
                            <span
                              key={trigger}
                              className="rounded-full border border-[#E2E8F0] bg-[#F7F9F9] px-2 py-0.5 text-[10px] text-[#3E4947]"
                            >
                              {trigger}
                            </span>
                          ))}
                          {bot.triggers.length > 2 && (
                            <span
                              className="rounded-full border border-[#E2E8F0] bg-[#F7F9F9] px-2 py-0.5 text-[10px] font-semibold text-[#6F7977]"
                              title={bot.triggers.slice(2).join(', ')}
                            >
                              +{bot.triggers.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E4E9EB]">
                            <div
                              className="h-full rounded-full bg-[#00695F]"
                              style={{ width: `${Math.min(100, bot.conversion)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-[11px] font-semibold text-[#3E4947]">
                            {bot.conversion}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[11px] text-[#3E4947]">
                        {bot.totalLaunches.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#3E4947]">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              bot.activeSessions > 0 ? 'bg-[#16A34A]' : 'bg-[#BEC9C6]'
                            }`}
                          />
                          <span className="tabular-nums font-semibold">{bot.activeSessions}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-[#8A9492]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredBots.length === 0 && (
            <div className="p-8 text-center">
              <Bot className="mx-auto mb-2 h-6 w-6 text-[#8A9492]" />
              <p className="text-xs font-semibold text-[#3E4947]">Belum ada bot yang cocok</p>
              <p className="mt-1 text-[11px] text-[#6F7977]">
                Ubah filter, impor file JSON, atau buat bot baru.
              </p>
            </div>
          )}
        </div>

        <p className="mt-3 text-[10px] text-[#8A9492]">
          Klik nama bot untuk membuka canvas dan menyusun alurnya.
        </p>
      </div>
    </div>
  );
}

function NodePicker({ title, options, onPick, onClose, style }) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={style}
      className="absolute z-40 w-60 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#EEF2F3] bg-[#F7F9F9] px-2.5 py-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#6F7977]">
          {title}
        </span>
        <button
          onClick={onClose}
          aria-label="Tutup menu"
          className="rounded p-0.5 text-[#8A9492] transition hover:bg-[#E4E9EB]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto p-1.5">
        {options.length === 0 && (
          <p className="px-2 py-3 text-[11px] text-[#6F7977]">Tidak ada node yang cocok.</p>
        )}

        {options.map((item) => {
          const Icon = item.icon;
          const cat = CATEGORIES[item.category];
          return (
            <button
              key={item.type}
              onClick={() => onPick(item.type)}
              className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-[#F2F4F6]"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: cat.color }}
              >
                <Icon className="h-3 w-3" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold text-[#191C1E]">
                  {item.label}
                </span>
                <span className="block truncate text-[10px] text-[#8A9492]">{cat.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChatPreviewPanel({ botName, messages, onClose }) {
  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-80 shrink-0 flex-col border-l border-[#E2E8F0] bg-[#F2F4F6] shadow-2xl md:relative md:z-10 md:shadow-none">
      <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] px-3.5 py-3">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#3E4947]">
          <Eye className="h-4 w-4 text-[#00695F]" />
          Pratinjau Bot
        </span>
        <button
          onClick={onClose}
          aria-label="Tutup pratinjau"
          className="rounded-lg p-1 text-[#3E4947] transition hover:bg-[#E2E8F0]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        <div className="overflow-hidden rounded-2xl border border-[#D5DDDC] bg-[#ECE5DD] shadow-sm">
          <div className="flex items-center gap-2 bg-[#075E54] px-3 py-2.5 text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">{botName}</div>
              <div className="text-[10px] text-white/70">online</div>
            </div>
          </div>

          <div className="min-h-[280px] space-y-2 p-3">
            {messages.length === 0 && (
              <p className="pt-8 text-center text-[11px] text-[#6F7977]">
                Belum ada langkah pesan pada alur ini.
              </p>
            )}

            {messages.map((msg) => {
              if (msg.kind === 'note') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-[10px] font-medium text-[#3E4947]">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col items-start gap-1">
                  <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-[11px] leading-snug text-[#191C1E] shadow-sm">
                    {msg.text}
                    {msg.media && (
                      <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-[#F2F4F6] px-2 py-1.5 text-[10px] text-[#3E4947]">
                        <Image className="h-3.5 w-3.5 text-[#00695F]" />
                        Lampiran {msg.media}
                      </div>
                    )}
                    {msg.listLabel && (
                      <div className="mt-1.5 flex items-center justify-center rounded-lg border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold text-[#075E54]">
                        {msg.listLabel}
                      </div>
                    )}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {msg.buttons.map((btn) => (
                          <div
                            key={btn}
                            className="rounded-lg border border-[#D9E7E4] px-2 py-1 text-center text-[10px] font-medium text-[#075E54]"
                          >
                            {btn}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.ai && (
                      <div className="mt-1 text-[9px] font-medium text-[#8A9492]">via {msg.ai}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-[#8A9492]">
          Pratinjau ini disusun otomatis dari urutan node &amp; isi pesan pada alur, bukan percakapan
          sungguhan.
        </p>
      </div>
    </aside>
  );
}

export default function App() {
  const [bots, setBots] = useState(BOTS);
  const [view, setView] = useState('list');
  const [activeBotId, setActiveBotId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1024
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1280
  );
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [quickAddFor, setQuickAddFor] = useState(null);
  const [pendingAdd, setPendingAdd] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copied, setCopied] = useState(false);
  const [connectNotice, setConnectNotice] = useState('');

  // Canvas Drag & Pan State
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Wiring Connection State
  const [connectingStart, setConnectingStart] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  const canvasRef = useRef(null);
  const copyTimerRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const wireStartRef = useRef(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const activeBot = useMemo(() => bots.find((b) => b.id === activeBotId) || null, [bots, activeBotId]);

  // ===== Navigasi daftar bot <-> canvas =====
  const enterBuilder = (bot) => {
    const graph = cloneGraph(bot.graph);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelectedNodeId(graph.nodes[0]?.id ?? null);
    setCanvasPan({ x: 0, y: 0 });
    setZoom(1);
    setConnectingStart(null);
    setActiveBotId(bot.id);
    setView('builder');
  };

  const openBot = (botId) => {
    const bot = bots.find((b) => b.id === botId);
    if (bot) enterBuilder(bot);
  };

  const closeBuilder = () => {
    // Simpan perubahan terakhir ke daftar bot.
    setBots((prev) =>
      prev.map((b) =>
        b.id === activeBotId ? { ...b, graph: { nodes, edges }, updatedAt: 'baru saja' } : b
      )
    );
    setConnectingStart(null);
    setActiveBotId(null);
    setView('list');
  };

  const createBot = () => {
    const bot = {
      id: `bot_${Date.now()}`,
      name: `Bot Baru ${bots.length + 1}`,
      status: 'Draf',
      updatedAt: 'baru saja',
      triggers: ['Pesan baru'],
      conversion: 0,
      totalLaunches: 0,
      activeSessions: 0,
      graph: buildGraph([
        { type: 'onMessageNode', label: 'Pesan Masuk' },
        { type: 'sendTextNode', label: 'Balasan Pembuka' }
      ])
    };
    setBots((prev) => [bot, ...prev]);
    enterBuilder(bot);
  };

  const createFromTemplate = (template) => {
    const bot = {
      id: `bot_${Date.now()}`,
      name: template.title,
      status: 'Draf',
      updatedAt: 'baru saja',
      triggers: ['Pesan baru'],
      conversion: 0,
      totalLaunches: 0,
      activeSessions: 0,
      graph: buildGraph(template.steps)
    };
    setBots((prev) => [bot, ...prev]);
    enterBuilder(bot);
  };

  const importBot = (name, graph) => {
    const bot = {
      id: `bot_${Date.now()}`,
      name: name || `Impor ${bots.length + 1}`,
      status: 'Draf',
      updatedAt: 'baru saja',
      triggers: ['Impor JSON'],
      conversion: 0,
      totalLaunches: 0,
      activeSessions: 0,
      graph: cloneGraph(graph)
    };
    setBots((prev) => [bot, ...prev]);
    enterBuilder(bot);
  };

  const deleteBots = (ids) => {
    setBots((prev) => prev.filter((b) => !ids.includes(b.id)));
  };

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return NODE_CATALOG.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesQuery =
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, activeCategory]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Ukuran canvas dipakai untuk minimap dan "Sesuaikan tampilan".
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    });
    observer.observe(el);
    setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Release drag/pan even when the pointer leaves the canvas.
  useEffect(() => {
    const handleWindowMouseUp = (e) => {
      setDraggingNodeId(null);
      setIsPanning(false);

      const start = wireStartRef.current;
      wireStartRef.current = null;
      if (!start || !connectingStart) return;

      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved <= 5) return;

      // Dialog hanya muncul kalau kabel dilepas di area kanvas yang kosong.
      if (e.target !== canvasRef.current) {
        setConnectingStart(null);
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      setPendingAdd({
        origin: {
          nodeId: connectingStart.nodeId,
          handleId: connectingStart.handleId,
          side: connectingStart.side,
          type: connectingStart.type
        },
        screenX: e.clientX - rect.left,
        screenY: e.clientY - rect.top
      });
      setConnectingStart(null);
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  });

  // Kabel tetap mengikuti kursor walau keluar dari area canvas.
  useEffect(() => {
    if (!connectingStart) return;
    const handleWindowMove = (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    window.addEventListener('mousemove', handleWindowMove);
    return () => window.removeEventListener('mousemove', handleWindowMove);
  }, [connectingStart]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === 'Escape') {
        setShowJsonModal(false);
        setConnectingStart(null);
        setQuickAddFor(null);
        setPendingAdd(null);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
        setEdges((prev) => prev.filter((ed) => ed.source !== selectedNodeId && ed.target !== selectedNodeId));
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId]);

  const flashNotice = (message) => {
    setConnectNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setConnectNotice(''), 2200);
  };

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - canvasPan.x) / zoom;
    const mouseY = (e.clientY - rect.top - canvasPan.y) / zoom;

    setDragOffset({ x: mouseX - node.x, y: mouseY - node.y });
  };

  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target === canvasRef.current) {
      setSelectedNodeId(null);
      setConnectingStart(null);
      setQuickAddFor(null);
      setPendingAdd(null);
      wireStartRef.current = null;
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasPan.x, y: e.clientY - canvasPan.y });
    }
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      setMousePos({ x: currentX, y: currentY });

      if (isPanning) {
        setCanvasPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }

      if (draggingNodeId) {
        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            if (n.id === draggingNodeId) {
              return {
                ...n,
                x: Math.max(10, (currentX - canvasPan.x) / zoom - dragOffset.x),
                y: Math.max(10, (currentY - canvasPan.y) / zoom - dragOffset.y)
              };
            }
            return n;
          })
        );
      }
    },
    [draggingNodeId, dragOffset, isPanning, panStart, canvasPan, zoom]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    const item = JSON.parse(rawData);
    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = (e.clientX - rect.left - canvasPan.x) / zoom - 120;
    const dropY = (e.clientY - rect.top - canvasPan.y) / zoom - 40;

    const newNode = {
      id: `node_${Date.now()}`,
      type: item.type,
      label: item.label,
      x: Math.max(20, dropX),
      y: Math.max(20, dropY),
      data: { ...item.defaultData }
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Tarik kabel: mousedown di satu socket, lalu lepaskan di socket tujuan.
  const startWire = (nodeId, handleId, side, event) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const found = findSocket(node, handleId);
    if (!found) return;

    const pos = socketScreenPos(node, handleId, zoom, canvasPan);
    wireStartRef.current = { x: event.clientX, y: event.clientY };
    setConnectingStart({
      nodeId,
      handleId,
      side,
      type: found.socket.type,
      color: socketStroke(found.socket.type),
      x: pos.x,
      y: pos.y
    });
  };

  const tryConnect = (targetNodeId, targetHandleId, targetSide) => {
    if (!connectingStart) return;
    if (connectingStart.nodeId === targetNodeId) return;

    const targetNode = nodes.find((n) => n.id === targetNodeId);
    if (!targetNode) return;
    const found = findSocket(targetNode, targetHandleId);
    if (!found) return;

    const startRef = {
      nodeId: connectingStart.nodeId,
      handleId: connectingStart.handleId,
      type: connectingStart.type
    };
    const targetRef = { nodeId: targetNodeId, handleId: targetHandleId, type: found.socket.type };
    const outSide = targetSide === 'out' ? targetRef : startRef;
    const inSide = targetSide === 'in' ? targetRef : startRef;

    if (outSide.type !== inSide.type) {
      flashNotice(
        `Koneksi tidak cocok: ${SOCKET_TYPES[outSide.type].label} ≠ ${SOCKET_TYPES[inSide.type].label}`
      );
      setConnectingStart(null);
      return;
    }

    const isDuplicate = edges.some(
      (ed) =>
        ed.source === outSide.nodeId &&
        ed.target === inSide.nodeId &&
        ed.sourceHandle === outSide.handleId &&
        ed.targetHandle === inSide.handleId
    );

    if (!isDuplicate) {
      setEdges((prev) => [
        ...prev,
        {
          id: `edge_${Date.now()}`,
          source: outSide.nodeId,
          sourceHandle: outSide.handleId,
          target: inSide.nodeId,
          targetHandle: inSide.handleId,
          color: socketStroke(outSide.type)
        }
      ]);
    }

    setConnectingStart(null);
    wireStartRef.current = null;
  };

  const handleSocketMouseDown = (e, nodeId, handleId, side) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setPendingAdd(null);

    if (!connectingStart) {
      startWire(nodeId, handleId, side, e);
      return;
    }

    // Klik socket yang sama = biarkan kabel aktif (mode klik-klik).
    if (connectingStart.nodeId === nodeId && connectingStart.handleId === handleId) return;

    // Socket lain di sisi yang sama = pindahkan titik awal kabel.
    if (connectingStart.side === side) {
      startWire(nodeId, handleId, side, e);
      return;
    }

    tryConnect(nodeId, handleId, side);
  };

  const handleSocketMouseUp = (e, nodeId, handleId, side) => {
    if (!connectingStart) return;
    if (connectingStart.nodeId === nodeId && connectingStart.handleId === handleId) return;
    e.stopPropagation();
    tryConnect(nodeId, handleId, side);
  };

  const removeEdge = (edgeId) => {
    setEdges((prev) => prev.filter((ed) => ed.id !== edgeId));
    setHoveredEdgeId((current) => (current === edgeId ? null : current));
  };

  const updateSelectedNodeData = (field, value) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === selectedNodeId) {
          if (field === 'label') {
            return { ...n, label: value };
          }
          return { ...n, data: { ...n.data, [field]: value } };
        }
        return n;
      })
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const calculateBezier = (p1x, p1y, p2x, p2y) => {
    const dx = Math.abs(p2x - p1x) * 0.5;
    return `M ${p1x} ${p1y} C ${p1x + dx} ${p1y}, ${p2x - dx} ${p2y}, ${p2x} ${p2y}`;
  };

  const bezierMidpoint = (p1, p2) => {
    const dx = Math.abs(p2.x - p1.x) * 0.5;
    const c1 = { x: p1.x + dx, y: p1.y };
    const c2 = { x: p2.x - dx, y: p2.y };
    return {
      x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8,
      y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8
    };
  };

  const copyGraphJson = () => {
    navigator.clipboard.writeText(JSON.stringify({ nodes, edges }, null, 2));
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1600);
  };

  // Zoom keeps the point under the cursor (or canvas center) fixed on screen.
  const zoomTo = (nextZoom, anchorX, anchorY) => {
    const target = clampZoom(nextZoom);
    if (target === zoom) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const localX = typeof anchorX === 'number' ? anchorX : rect ? rect.width / 2 : 0;
    const localY = typeof anchorY === 'number' ? anchorY : rect ? rect.height / 2 : 0;

    setCanvasPan({
      x: localX - ((localX - canvasPan.x) / zoom) * target,
      y: localY - ((localY - canvasPan.y) / zoom) * target
    });
    setZoom(target);
  };

  const handleWheel = (e) => {
    const el = canvasRef.current;
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
    zoomTo(zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  // Native listener so preventDefault works (React's own wheel handler is passive).
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  });

  const resetView = () => {
    setCanvasPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // Sesuaikan zoom & posisi agar semua node terlihat.
  const fitToContent = () => {
    const el = canvasRef.current;
    if (!el || nodes.length === 0) return;

    const boxes = nodes.map((n) => ({
      x: n.x,
      y: n.y,
      w: NODE_WIDTH,
      h: layoutNode(n).height
    }));
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.w));
    const maxY = Math.max(...boxes.map((b) => b.y + b.h));

    const pad = 70;
    const scale = clampZoom(
      Math.min(
        (el.clientWidth - pad * 2) / Math.max(1, maxX - minX),
        (el.clientHeight - pad * 2) / Math.max(1, maxY - minY)
      )
    );

    setZoom(scale);
    setCanvasPan({
      x: (el.clientWidth - (maxX - minX) * scale) / 2 - minX * scale,
      y: (el.clientHeight - (maxY - minY) * scale) / 2 - minY * scale
    });
  };

  // Peta mini seluruh alur.
  const mapBounds = useMemo(() => {
    if (nodes.length === 0) return null;
    const pad = 60;
    const minX = Math.min(...nodes.map((n) => n.x)) - pad;
    const minY = Math.min(...nodes.map((n) => n.y)) - pad;
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_WIDTH)) + pad;
    const maxY = Math.max(...nodes.map((n) => n.y + layoutNode(n).height)) + pad;
    return { minX, minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
  }, [nodes]);

  const MAP_W = 196;
  const MAP_H = 124;

  const jumpToWorld = (worldX, worldY) => {
    setCanvasPan({
      x: canvasSize.w / 2 - worldX * zoom,
      y: canvasSize.h / 2 - worldY * zoom
    });
  };

  const handleMinimapMouseDown = (e) => {
    if (!mapBounds) return;
    e.stopPropagation();
    const box = e.currentTarget.getBoundingClientRect();
    const worldX = mapBounds.minX + ((e.clientX - box.left) / box.width) * mapBounds.w;
    const worldY = mapBounds.minY + ((e.clientY - box.top) / box.height) * mapBounds.h;
    jumpToWorld(worldX, worldY);
  };

  // Opsi node yang kompatibel dengan ujung kabel (tipe socket harus sama).
  const compatibleOptions = (wireType, side) =>
    NODE_CATALOG.filter((def) =>
      side === 'out'
        ? def.inputs.some((s) => s.type === wireType)
        : def.outputs.some((s) => s.type === wireType)
    );

  // Buat node baru pada posisi world tertentu lalu sambungkan ke ujung kabel.
  const connectNewNode = (type, worldX, worldY, origin) => {
    const def = NODE_BY_TYPE[type];
    if (!def) return;

    const newNode = {
      id: `node_${Date.now()}`,
      type,
      label: def.label,
      x: Math.max(10, worldX - NODE_WIDTH / 2),
      y: Math.max(10, worldY - 24),
      data: { ...def.defaultData }
    };

    setNodes((prev) => [...prev, newNode]);

    if (origin) {
      if (origin.side === 'out') {
        const inSocket = def.inputs.find((s) => s.type === origin.type);
        if (inSocket) {
          setEdges((prev) => [
            ...prev,
            {
              id: `edge_${Date.now()}`,
              source: origin.nodeId,
              sourceHandle: origin.handleId,
              target: newNode.id,
              targetHandle: inSocket.id,
              color: socketStroke(origin.type)
            }
          ]);
        }
      } else {
        const outSocket = def.outputs.find((s) => s.type === origin.type);
        if (outSocket) {
          setEdges((prev) => [
            ...prev,
            {
              id: `edge_${Date.now()}`,
              source: newNode.id,
              sourceHandle: outSocket.id,
              target: origin.nodeId,
              targetHandle: origin.handleId,
              color: socketStroke(origin.type)
            }
          ]);
        }
      }
    }

    setSelectedNodeId(newNode.id);
    setPendingAdd(null);
    setConnectingStart(null);
    setQuickAddFor(null);
  };

  // Tambah node baru tepat setelah node terpilih, lalu sambungkan socket FLOW.
  const createAfter = (sourceId, type) => {
    const source = nodes.find((n) => n.id === sourceId);
    const outSocket = source ? NODE_BY_TYPE[source.type].outputs.find((s) => s.type === 'flow') : null;
    if (!source || !outSocket) return;

    const x = source.x + NODE_WIDTH + 90;
    let y = source.y;
    const taken = nodes.filter((n) => Math.abs(n.x - x) < NODE_WIDTH).map((n) => n.y);
    while (taken.some((otherY) => Math.abs(otherY - y) < 180)) y += 200;

    connectNewNode(type, x + NODE_WIDTH / 2, y + 24, {
      nodeId: sourceId,
      handleId: outSocket.id,
      side: 'out',
      type: 'flow'
    });
  };

  const previewMessages = useMemo(
    () => (showPreview ? buildChatPreview(nodes, edges) : []),
    [showPreview, nodes, edges]
  );

  const hasMovedView = canvasPan.x !== 0 || canvasPan.y !== 0 || zoom !== 1;
  const selectedLayout = selectedNode ? layoutNode(selectedNode) : null;

  return (
    <div className="flex h-screen w-screen select-none flex-col overflow-hidden bg-[#F8F9FB] font-sans text-[#191C1E]">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#F2F4F6]/95 px-3 backdrop-blur sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {view === 'builder' ? (
            <>
              <button
                onClick={closeBuilder}
                aria-label="Kembali ke daftar bot"
                title="Kembali ke daftar bot"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[#DDE4E6] bg-white px-2.5 text-xs font-semibold text-[#3E4947] transition hover:border-[#BEC9C6] hover:bg-[#F6F9F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/15"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                <span className="hidden sm:inline">Daftar Bot</span>
              </button>

              <span className="hidden h-6 w-px shrink-0 bg-[#E2E8F0] sm:block" />

              <button
                onClick={() => setIsDrawerOpen((v) => !v)}
                aria-label="Buka atau tutup katalog"
                aria-expanded={isDrawerOpen}
                title="Katalog node"
                className={`hidden rounded-lg p-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/20 sm:block ${
                  isDrawerOpen ? 'bg-[#CCE8E2] text-[#004F47]' : 'text-[#3E4947] hover:bg-[#E4E9EB]'
                }`}
              >
                <Layers className="h-5 w-5" />
              </button>
            </>
          ) : null}

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00695F] to-[#004F47] text-white shadow-sm">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-tight text-[#191C1E]">
                  {view === 'builder' && activeBot ? activeBot.name : 'Chatbot Builder WhatsApp'}
                </h1>
                <span className="hidden shrink-0 items-center gap-1 rounded-full border border-[#86EFAC] bg-[#E8F8EE] px-2 py-0.5 text-[10px] font-semibold text-[#16A34A] lg:inline-flex">
                  <ShieldCheck className="h-3 w-3" /> CAPI Aktif
                </span>
                {view === 'builder' && activeBot && <StatusPill status={activeBot.status} />}
              </div>
              <p className="hidden truncate text-[11px] text-[#6F7977] sm:block">
                {view === 'builder'
                  ? 'Susun alur percakapan, sambungkan antar-node, lalu aktifkan'
                  : 'Bikin alur chatbot WhatsApp untuk iklan Meta Ads'}
              </p>
            </div>
          </div>
        </div>

        {view === 'builder' ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() =>
                setIsInspectorOpen((v) => {
                  const next = !v;
                  if (next) setShowPreview(false);
                  return next;
                })
              }
              aria-label="Buka atau tutup pengaturan"
              aria-pressed={isInspectorOpen}
              title="Pengaturan node"
              className={`flex h-8 items-center rounded-lg border px-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/20 ${
                isInspectorOpen
                  ? 'border-[#94E5D8] bg-[#CCE8E2] text-[#004F47]'
                  : 'border-[#DDE4E6] bg-white text-[#3E4947] hover:bg-[#F6F9F8]'
              }`}
            >
              <PanelRight className="h-4 w-4" />
            </button>

            <button
              title="Simpan dan aktifkan alur"
              className="flex h-8 items-center gap-2 rounded-lg bg-[#00695F] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#004F47] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/25"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">Aktifkan Alur</span>
              <span className="sm:hidden">Aktifkan</span>
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[11px] text-[#6F7977] sm:block">
              {bots.length} bot &middot;{' '}
              {bots.filter((b) => b.status === 'Aktif').length} aktif
            </span>
            <button
              onClick={() => setView('persona')}
              aria-pressed={view === 'persona'}
              title="Atur AI chatbot per stage CRM"
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition ${
                view === 'persona'
                  ? 'bg-[#CCE8E2] text-[#004F47]'
                  : 'bg-[#00695F] text-white hover:bg-[#004F47]'
              }`}
            >
              <Bot className="h-4 w-4" />
              Atur Model AI
            </button>
          </div>
        )}
      </header>

      {/* DAFTAR BOT */}
      {view === 'list' ? (
        <BotListPage
          bots={bots}
          onOpen={openBot}
          onCreate={() => setView('templates')}
          onImport={importBot}
          onDelete={deleteBots}
        />
      ) : view === 'templates' ? (
        <BotTemplatesLibrary
          onClose={() => setView('list')}
          onPick={createFromTemplate}
          onBlank={createBot}
        />
      ) : view === 'persona' ? (
        <PersonaAiPage
          onBack={() => setView('list')}
          onManageAi={() => setView('aiConnection')}
        />
      ) : view === 'aiConnection' ? (
        <AiConnectionPage onBack={() => setView('persona')} />
      ) : (
        <div className="relative flex flex-1 overflow-hidden">
        {/* 2. LEFT DRAWER (NODE CATALOG) */}
        <aside
          className={`absolute inset-y-0 left-0 z-30 flex shrink-0 flex-col border-r border-[#E2E8F0] bg-[#F2F4F6] transition-[width,box-shadow] duration-300 md:relative md:z-10 ${
            isDrawerOpen ? 'w-[292px] shadow-2xl md:shadow-none' : 'w-0 overflow-hidden border-r-0'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] px-3.5 py-3">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#3E4947]">
              <Plus className="h-4 w-4 text-[#00695F]" />
              Daftar Node
            </span>
            <span className="rounded-full border border-[#94E5D8] bg-[#CCE8E2] px-2 py-0.5 text-[10px] font-semibold text-[#004F47]">
              {filteredCatalog.length} node
            </span>
          </div>

          <div className="space-y-2 border-b border-[#E2E8F0] p-3">
            <div className="flex items-center rounded-lg border border-[#D5DDDC] bg-white px-3 py-1.5 transition focus-within:border-[#00695F] focus-within:ring-4 focus-within:ring-[#00695F]/10">
              <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-[#6F7977]" />
              <input
                type="text"
                placeholder="Cari node..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#191C1E] outline-none placeholder-[#8A9492]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Bersihkan pencarian"
                  className="ml-1 rounded p-0.5 text-[#6F7977] hover:bg-[#E4E9EB]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`rounded-full px-2 py-1 text-[10px] font-semibold transition ${
                  activeCategory === 'all'
                    ? 'bg-[#00695F] text-white'
                    : 'bg-[#E4E9EB] text-[#3E4947] hover:bg-[#D5DDDC]'
                }`}
              >
                Semua
              </button>
              {CATEGORY_ORDER.map((key) => {
                const cat = CATEGORIES[key];
                const isActive = activeCategory === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className="rounded-full border px-2 py-1 text-[10px] font-semibold transition"
                    style={{
                      borderColor: withAlpha(cat.color, isActive ? 1 : 0.4),
                      backgroundColor: isActive ? cat.color : withAlpha(cat.color, 0.1),
                      color: isActive ? '#FFFFFF' : cat.color
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {filteredCatalog.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#BEC9C6] p-6 text-center">
                <Search className="mx-auto mb-2 h-5 w-5 text-[#6F7977]" />
                <p className="text-[11px] text-[#6F7977]">Tidak ada node yang cocok dengan filter.</p>
              </div>
            )}

            {filteredCatalog.map((item) => {
              const Icon = item.icon;
              const cat = CATEGORIES[item.category];
              const socketCount = item.inputs.length + item.outputs.length;

              return (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(item));
                  }}
                  className="group cursor-grab rounded-xl border border-[#E2E8F0] bg-white p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                  style={{ borderLeft: `4px solid ${cat.color}` }}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className="shrink-0 rounded-lg p-1.5 text-white shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate text-xs font-semibold text-[#191C1E]">{item.label}</span>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                      style={{ backgroundColor: withAlpha(cat.color, 0.12), color: cat.color }}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-snug text-[#6F7977]">
                    {item.description}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[9px] font-medium text-[#8A9492]">
                    <span>{item.inputs.length} input</span>
                    <span>&middot;</span>
                    <span>{socketCount} socket</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#E2E8F0] bg-[#EDE4F0]/30 px-3.5 py-2.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6F7977]">
              Tipe Socket
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SOCKET_ORDER.map((type) => (
                <SocketLegendRow key={type} type={type} />
              ))}
            </div>
          </div>
        </aside>

        {/* 3. CANVAS WORKSPACE */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative h-full flex-1 overflow-hidden bg-[#F8F9FB] ${
            isPanning ? 'cursor-grabbing' : 'cursor-crosshair'
          }`}
          style={{
            backgroundImage: 'radial-gradient(#C3CFCC 1.4px, transparent 1.4px)',
            backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
            backgroundPosition: `${canvasPan.x}px ${canvasPan.y}px`
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 25% 0%, rgba(0,105,95,0.07), transparent 48%)'
            }}
          />

          {/* KABEL ALUR */}
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
            {edges.map((edge) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const start = socketScreenPos(sourceNode, edge.sourceHandle, zoom, canvasPan);
              const end = socketScreenPos(targetNode, edge.targetHandle, zoom, canvasPan);
              const pathD = calculateBezier(start.x, start.y, end.x, end.y);
              const mid = bezierMidpoint(start, end);
              const isHovered = hoveredEdgeId === edge.id;

              return (
                <g key={edge.id}>
                  {/* Area klik lebar untuk melepas kabel */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() =>
                      setHoveredEdgeId((current) => (current === edge.id ? null : current))
                    }
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => removeEdge(edge.id)}
                  >
                    <title>Klik untuk melepas kabel</title>
                  </path>

                  <path
                    d={pathD}
                    fill="none"
                    stroke={edge.color || '#4A635F'}
                    strokeWidth={isHovered ? 4 : 2.5}
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none' }}
                    className={isHovered ? 'opacity-100' : 'opacity-80'}
                  />

                  {!isHovered && (
                    <circle r="3.5" fill={edge.color || '#4A635F'} opacity="0.9">
                      <animateMotion path={pathD} dur="2.5s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {isHovered && (
                    <g
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => removeEdge(edge.id)}
                    >
                      <circle cx={mid.x} cy={mid.y} r="10" fill="#B3261E" />
                      <path
                        d={`M ${mid.x - 3.5} ${mid.y - 3.5} L ${mid.x + 3.5} ${mid.y + 3.5} M ${
                          mid.x + 3.5
                        } ${mid.y - 3.5} L ${mid.x - 3.5} ${mid.y + 3.5}`}
                        stroke="#FFFFFF"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {connectingStart && (
              <path
                d={calculateBezier(connectingStart.x, connectingStart.y, mousePos.x, mousePos.y)}
                fill="none"
                stroke={connectingStart.color || '#4A635F'}
                strokeWidth="2.5"
                strokeDasharray="6,6"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* NODE */}
          {nodes.map((node) => {
            const layout = layoutNode(node);
            const def = layout.def;
            if (!def) return null;

            const cat = CATEGORIES[def.category];
            const Icon = def.icon;
            const isSelected = node.id === selectedNodeId;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                style={{
                  transform: `translate(${node.x * zoom + canvasPan.x}px, ${
                    node.y * zoom + canvasPan.y
                  }px) scale(${zoom})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  width: NODE_WIDTH,
                  height: layout.height
                }}
                className={`group z-10 cursor-grab rounded-xl border bg-white text-xs transition-shadow active:cursor-grabbing ${
                  isSelected
                    ? 'border-[#00695F] shadow-lg ring-4 ring-[#00695F]/15'
                    : 'border-[#E2E8F0] shadow-sm hover:border-[#9DB5B0] hover:shadow-md'
                }`}
              >
                {/* Header node */}
                <div
                  className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 rounded-t-xl px-3"
                  style={{ height: NODE_HEADER_H, backgroundColor: cat.color }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="shrink-0 rounded-md bg-white/20 p-1 text-white">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate text-xs font-semibold tracking-tight text-white">
                      {node.label}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-black/20 px-1.5 py-0.5 text-[9px] font-semibold text-white/90">
                    {cat.label}
                  </span>
                </div>

                {/* Ringkasan konfigurasi */}
                {layout.hasSummary && (
                  <div
                    className="pointer-events-none absolute left-2.5 right-2.5 flex items-center truncate rounded-md border px-2 text-[10px] text-[#3E4947]"
                    style={{
                      top: NODE_HEADER_H + 5,
                      height: SUMMARY_H - 10,
                      borderColor: withAlpha(cat.color, 0.35),
                      backgroundColor: withAlpha(cat.color, 0.08)
                    }}
                  >
                    {layout.summary}
                  </div>
                )}

                {/* Socket input & output */}
                {layout.inputs.map((socket, i) => {
                  const rowTop = layout.socketsTop + i * SOCKET_ROW_H;
                  const info = SOCKET_TYPES[socket.type];
                  const isCompatible =
                    !connectingStart ||
                    (connectingStart.side !== 'in' &&
                      connectingStart.type === socket.type &&
                      connectingStart.nodeId !== node.id);
                  return (
                    <React.Fragment key={`in-${socket.id}`}>
                      <SocketRowLabel socket={{ ...socket, rowTop }} align="left" />
                      <button
                        onMouseDown={(e) => handleSocketMouseDown(e, node.id, socket.id, 'in')}
                        onMouseUp={(e) => handleSocketMouseUp(e, node.id, socket.id, 'in')}
                        aria-label={`Input ${socket.name} (${info.label})`}
                        title={`${socket.name} — ${info.label}${connectingStart ? '' : ' · klik lalu klik socket tujuan'}`}
                        className={`absolute z-20 h-3.5 w-3.5 cursor-pointer rounded-full border-2 shadow-sm transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/30 ${
                          isCompatible ? '' : 'opacity-30'
                        } ${connectingStart && isCompatible ? 'ring-2 ring-[#00695F]/40' : ''}`}
                        style={{
                          backgroundColor: info.color,
                          borderColor: info.border,
                          left: -7,
                          top: rowTop + SOCKET_ROW_H / 2 - 7
                        }}
                      />
                    </React.Fragment>
                  );
                })}

                {layout.outputs.map((socket, i) => {
                  const rowTop = layout.socketsTop + i * SOCKET_ROW_H;
                  const info = SOCKET_TYPES[socket.type];
                  const isCompatible =
                    !connectingStart ||
                    (connectingStart.side !== 'out' &&
                      connectingStart.type === socket.type &&
                      connectingStart.nodeId !== node.id);
                  return (
                    <React.Fragment key={`out-${socket.id}`}>
                      <SocketRowLabel socket={{ ...socket, rowTop }} align="right" />
                      <button
                        onMouseDown={(e) => handleSocketMouseDown(e, node.id, socket.id, 'out')}
                        onMouseUp={(e) => handleSocketMouseUp(e, node.id, socket.id, 'out')}
                        aria-label={`Output ${socket.name} (${info.label})`}
                        title={`${socket.name} — ${info.label}${connectingStart ? '' : ' · klik lalu klik socket tujuan'}`}
                        className={`absolute z-20 h-3.5 w-3.5 cursor-pointer rounded-full border-2 shadow-sm transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/30 ${
                          isCompatible ? '' : 'opacity-30'
                        } ${connectingStart && isCompatible ? 'ring-2 ring-[#00695F]/40' : ''}`}
                        style={{
                          backgroundColor: info.color,
                          borderColor: info.border,
                          right: -7,
                          top: rowTop + SOCKET_ROW_H / 2 - 7
                        }}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}

          {/* Tambah langkah berikutnya dari node terpilih */}
          {selectedNode &&
            (() => {
              const def = NODE_BY_TYPE[selectedNode.type];
              const layout = layoutNode(selectedNode);
              if (!def || !def.outputs.some((s) => s.type === 'flow') || pendingAdd) return null;

              const screenX = selectedNode.x * zoom + canvasPan.x;
              const screenY = selectedNode.y * zoom + canvasPan.y;
              const options = NODE_CATALOG.filter(
                (item) => item.inputs.some((s) => s.type === 'flow') && item.type !== selectedNode.type
              );
              const popoverWidth = 240;
              const flip = screenX + NODE_WIDTH * zoom + 16 + popoverWidth > canvasSize.w;

              return (
                <>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickAddFor((current) => (current === selectedNode.id ? null : selectedNode.id));
                    }}
                    style={{
                      left: screenX + NODE_WIDTH * zoom + 14,
                      top: screenY + layout.height * zoom - 18
                    }}
                    className="absolute z-20 flex items-center gap-1 rounded-full border border-[#94E5D8] bg-white px-2 py-1 text-[10px] font-semibold text-[#00695F] shadow-md transition hover:bg-[#F1FAF8]"
                    title="Tambah langkah berikutnya"
                  >
                    <Plus className="h-3 w-3" />
                    Langkah berikutnya
                  </button>

                  {quickAddFor === selectedNode.id && (
                    <NodePicker
                      title={`Setelah "${selectedNode.label}"`}
                      options={options}
                      onPick={(type) => createAfter(selectedNode.id, type)}
                      onClose={() => setQuickAddFor(null)}
                      style={{
                        left: flip
                          ? screenX - popoverWidth - 14
                          : screenX + NODE_WIDTH * zoom + 14,
                        top: screenY + layout.height * zoom - 18
                      }}
                    />
                  )}
                </>
              );
            })()}

          {/* Dialog muncul saat kabel dilepas di area kosong */}
          {pendingAdd &&
            (() => {
              const { origin, screenX, screenY } = pendingAdd;
              const popoverWidth = 240;
              const flip = screenX + 18 + popoverWidth > canvasSize.w;
              return (
                <NodePicker
                  title="Tambahkan langkah selanjutnya"
                  options={compatibleOptions(origin.type, origin.side)}
                  onPick={(type) =>
                    connectNewNode(
                      type,
                      (screenX - canvasPan.x) / zoom,
                      (screenY - canvasPan.y) / zoom,
                      origin
                    )
                  }
                  onClose={() => setPendingAdd(null)}
                  style={{
                    left: flip ? screenX - popoverWidth - 18 : screenX + 18,
                    top: Math.min(screenY + 12, Math.max(12, canvasSize.h - 300))
                  }}
                />
              );
            })()}

          {nodes.length === 0 && (
            <EmptyCanvasState onOpenCatalog={() => setIsDrawerOpen(true)} />
          )}

          {/* Petunjuk & notifikasi (kiri bawah) */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2">
            {connectingStart && (
              <span className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-lg border border-[#BAC8FF] bg-[#EBF2FF] px-2.5 text-[10px] font-semibold text-[#3B5BDB] shadow-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full border"
                  style={{
                    backgroundColor: SOCKET_TYPES[connectingStart.type].color,
                    borderColor: SOCKET_TYPES[connectingStart.type].border
                  }}
                />
                Tipe {SOCKET_TYPES[connectingStart.type].label} &middot; lepas di socket tujuan &middot; Esc
                batal
              </span>
            )}

            {!connectingStart && hoveredEdgeId === null && (
              <span className="pointer-events-none flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white/80 px-2.5 text-[10px] font-medium text-[#6F7977] shadow-sm">
                <MousePointer className="h-3 w-3" />
                Tarik socket untuk menyambung &middot; lepas di area kosong untuk menambah langkah &middot; klik
                kabel untuk melepas
              </span>
            )}

            {connectNotice && (
              <span className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-lg border border-[#F8B4BD] bg-[#FCE8EB] px-2.5 text-[10px] font-semibold text-[#B3261E] shadow-sm">
                {connectNotice}
              </span>
            )}
          </div>

          {/* Minimap + kontrol tampilan (kanan bawah) */}
          <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
            {mapBounds && (
              <div
                onMouseDown={handleMinimapMouseDown}
                title="Klik peta untuk berpindah tampilan"
                className="relative cursor-pointer overflow-hidden rounded-lg border border-[#E2E8F0] bg-white/95 shadow-sm backdrop-blur"
                style={{ width: MAP_W, height: MAP_H }}
              >
                {nodes.map((node) => {
                  const mapScale = Math.min(MAP_W / mapBounds.w, MAP_H / mapBounds.h);
                  const offX = (MAP_W - mapBounds.w * mapScale) / 2;
                  const offY = (MAP_H - mapBounds.h * mapScale) / 2;
                  const nodeLayout = layoutNode(node);
                  const cat = NODE_BY_TYPE[node.type] ? CATEGORIES[NODE_BY_TYPE[node.type].category] : CATEGORIES.action;
                  return (
                    <div
                      key={node.id}
                      className="absolute rounded-[3px]"
                      style={{
                        left: offX + (node.x - mapBounds.minX) * mapScale,
                        top: offY + (node.y - mapBounds.minY) * mapScale,
                        width: Math.max(4, NODE_WIDTH * mapScale),
                        height: Math.max(3, nodeLayout.height * mapScale),
                        backgroundColor: cat ? cat.color : '#00695F',
                        opacity: node.id === selectedNodeId ? 1 : 0.55
                      }}
                    />
                  );
                })}

                {canvasSize.w > 0 && (
                  (() => {
                    const mapScale = Math.min(MAP_W / mapBounds.w, MAP_H / mapBounds.h);
                    const offX = (MAP_W - mapBounds.w * mapScale) / 2;
                    const offY = (MAP_H - mapBounds.h * mapScale) / 2;
                    const viewX = -canvasPan.x / zoom;
                    const viewY = -canvasPan.y / zoom;
                    return (
                      <div
                        className="pointer-events-none absolute rounded-[4px] border border-[#00695F] bg-[#00695F]/10"
                        style={{
                          left: offX + (viewX - mapBounds.minX) * mapScale,
                          top: offY + (viewY - mapBounds.minY) * mapScale,
                          width: (canvasSize.w / zoom) * mapScale,
                          height: (canvasSize.h / zoom) * mapScale
                        }}
                      />
                    );
                  })()
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex items-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
                <button
                  onClick={() => zoomTo(zoom - ZOOM_STEP)}
                  disabled={zoom <= ZOOM_MIN}
                  aria-label="Zoom out"
                  title="Perkecil (scroll)"
                  className="flex h-8 w-8 items-center justify-center text-[#3E4947] transition hover:bg-[#F2F4F6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => zoomTo(1)}
                  title="Kembalikan ke 100%"
                  className="h-8 w-14 border-x border-[#E2E8F0] font-mono text-[11px] font-semibold text-[#00695F] transition hover:bg-[#F2F4F6]"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => zoomTo(zoom + ZOOM_STEP)}
                  disabled={zoom >= ZOOM_MAX}
                  aria-label="Zoom in"
                  title="Perbesar (scroll)"
                  className="flex h-8 w-8 items-center justify-center text-[#3E4947] transition hover:bg-[#F2F4F6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                onClick={fitToContent}
                disabled={nodes.length === 0}
                title="Sesuaikan tampilan dengan seluruh alur"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[10px] font-semibold text-[#3E4947] shadow-sm transition hover:bg-[#F2F4F6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Maximize2 className="h-3 w-3" />
                Sesuaikan
              </button>

              {hasMovedView && (
                <button
                  onClick={resetView}
                  title="Kembalikan posisi dan ukuran kanvas"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[10px] font-semibold text-[#3E4947] shadow-sm transition hover:bg-[#F2F4F6]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}

              <button
                onClick={() => {
                  setShowPreview((v) => !v);
                  if (!showPreview) setIsInspectorOpen(false);
                }}
                aria-pressed={showPreview}
                title="Pratinjau percakapan bot"
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold shadow-sm transition ${
                  showPreview
                    ? 'border-[#94E5D8] bg-[#CCE8E2] text-[#004F47]'
                    : 'border-[#E2E8F0] bg-white text-[#3E4947] hover:bg-[#F2F4F6]'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Pratinjau
              </button>

              <button
                onClick={() => setShowJsonModal(true)}
                title="Lihat isi alur dalam bentuk JSON"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[10px] font-semibold text-[#3E4947] shadow-sm transition hover:bg-[#F2F4F6]"
              >
                <Code className="h-3 w-3" />
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* 4. RIGHT PANEL (INSPECTOR / PRATINJAU) */}
        {showPreview && (
          <ChatPreviewPanel
            botName={activeBot ? activeBot.name : 'Bot'}
            messages={previewMessages}
            onClose={() => setShowPreview(false)}
          />
        )}

        {!showPreview && (
        <aside
          className={`absolute inset-y-0 right-0 z-30 flex shrink-0 flex-col border-l border-[#E2E8F0] bg-[#F2F4F6] transition-[width,box-shadow] duration-300 md:relative md:z-10 ${
            isInspectorOpen ? 'w-80 shadow-2xl md:shadow-none' : 'w-0 overflow-hidden border-l-0'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] px-3.5 py-3">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#3E4947]">
              <Sliders className="h-4 w-4 text-[#00695F]" />
              Pengaturan Node
            </span>
            <button
              onClick={() => setIsInspectorOpen(false)}
              aria-label="Tutup pengaturan"
              className="rounded-lg p-1 text-[#3E4947] transition hover:bg-[#E2E8F0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00695F]/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isInspectorOpen && (
            <div className="flex-1 overflow-y-auto p-3.5">
              {selectedNode && selectedLayout ? (
                <div className="space-y-3.5">
                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[10px] text-[#8A9492]">
                        {selectedNode.id}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                        style={{
                          backgroundColor: withAlpha(CATEGORIES[selectedLayout.def.category].color, 0.12),
                          color: CATEGORIES[selectedLayout.def.category].color
                        }}
                      >
                        {CATEGORIES[selectedLayout.def.category].label}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#191C1E]">{selectedNode.label}</div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-[#6F7977]">
                      <span>x: {Math.round(selectedNode.x)}</span>
                      <span>y: {Math.round(selectedNode.y)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#3E4947]">
                      Judul Node
                    </label>
                    <input
                      type="text"
                      value={selectedNode.label || ''}
                      onChange={(e) => updateSelectedNodeData('label', e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>

                  {selectedLayout.def.fields.length > 0 ? (
                    <div className="space-y-3.5">
                      {selectedLayout.def.fields.map((field) => (
                        <FieldControl
                          key={field.key}
                          field={field}
                          value={selectedNode.data[field.key]}
                          onChange={(value) => updateSelectedNodeData(field.key, value)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-[#BEC9C6] p-3 text-[11px] text-[#6F7977]">
                      Node ini tidak punya konfigurasi tambahan.
                    </p>
                  )}

                  <div className="border-t border-[#E2E8F0] pt-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6F7977]">
                      Socket
                    </p>
                    <div className="space-y-1.5">
                      {[...selectedLayout.inputs, ...selectedLayout.outputs].length === 0 && (
                        <p className="text-[11px] text-[#6F7977]">Tidak ada socket.</p>
                      )}
                      {selectedLayout.inputs.map((socket) => (
                        <div
                          key={`i-${socket.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#E7ECEB] bg-white px-2.5 py-1.5"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full border"
                              style={{
                                backgroundColor: SOCKET_TYPES[socket.type].color,
                                borderColor: SOCKET_TYPES[socket.type].border
                              }}
                            />
                            <span className="truncate text-[10px] text-[#3E4947]">{socket.name}</span>
                          </span>
                          <span className="shrink-0 text-[9px] font-semibold text-[#8A9492]">
                            IN &middot; {SOCKET_TYPES[socket.type].label}
                          </span>
                        </div>
                      ))}
                      {selectedLayout.outputs.map((socket) => (
                        <div
                          key={`o-${socket.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#E7ECEB] bg-white px-2.5 py-1.5"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full border"
                              style={{
                                backgroundColor: SOCKET_TYPES[socket.type].color,
                                borderColor: SOCKET_TYPES[socket.type].border
                              }}
                            />
                            <span className="truncate text-[10px] text-[#3E4947]">{socket.name}</span>
                          </span>
                          <span className="shrink-0 text-[9px] font-semibold text-[#8A9492]">
                            OUT &middot; {SOCKET_TYPES[socket.type].label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#E2E8F0] pt-3">
                    <button
                      onClick={deleteSelectedNode}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#F8B4BD] bg-[#FCE8EB] py-2 text-xs font-semibold text-[#B3261E] transition hover:bg-[#F8D0D6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B3261E]/15"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus Node Ini
                    </button>
                    <p className="mt-2 text-center text-[10px] text-[#8A9492]">
                      Tekan Delete untuk menghapus node terpilih
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center text-[#6F7977]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#00695F] shadow-sm">
                    <MousePointer className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-[#3E4947]">Belum ada node dipilih</p>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Klik node mana pun di canvas untuk melihat konfigurasi dan daftar socket-nya.
                  </p>
                  <div className="mt-5 grid w-full grid-cols-2 gap-2">
                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                      <div className="text-base font-bold text-[#00695F]">{nodes.length}</div>
                      <div className="text-[10px] text-[#6F7977]">Node aktif</div>
                    </div>
                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                      <div className="text-base font-bold text-[#00695F]">{edges.length}</div>
                      <div className="text-[10px] text-[#6F7977]">Kabel terhubung</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
        )}
        </div>
      )}

      {/* 5. STATUS FOOTER */}
      <footer className="z-20 flex h-8 shrink-0 items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#F2F4F6] px-3 text-[10px] text-[#3E4947] sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          {view === 'builder' ? (
            <>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#16A34A]" />
                <span className="font-semibold text-[#16A34A]">Siap</span>
              </span>
              <span className="truncate">
                Alur: <strong className="font-semibold">{activeBot ? activeBot.name : 'baru'}</strong>
              </span>
              <span className="hidden shrink-0 sm:inline">
                Node: <strong className="font-semibold">{nodes.length}</strong>
              </span>
              <span className="hidden shrink-0 sm:inline">
                Kabel: <strong className="font-semibold">{edges.length}</strong>
              </span>
            </>
          ) : (
            <>
              <span className="truncate">
                Total bot: <strong className="font-semibold">{bots.length}</strong>
              </span>
              <span className="hidden shrink-0 sm:inline">
                Aktif: <strong className="font-semibold">{bots.filter((b) => b.status === 'Aktif').length}</strong>
              </span>
              <span className="hidden shrink-0 sm:inline">
                Draf: <strong className="font-semibold">{bots.filter((b) => b.status === 'Draf').length}</strong>
              </span>
            </>
          )}
        </div>
        <div className="hidden shrink-0 font-mono text-[10px] text-[#6F7977] md:block">
          Chatbot Flow Engine v3.3 &middot; Socket Spec Blender
        </div>
      </footer>

      {/* 6. JSON EXPORT DIALOG MODAL */}
      {showJsonModal && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowJsonModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#F2F4F6] px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#00695F]">
                <Code className="h-4 w-4" />
                Isi Alur (JSON)
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#BEC9C6] bg-[#E1E2E4] px-2 py-0.5 text-[10px] font-medium text-[#3E4947]">
                  {nodes.length} node &middot; {edges.length} kabel
                </span>
                <button
                  onClick={() => setShowJsonModal(false)}
                  aria-label="Tutup dialog"
                  className="rounded-lg p-1 text-[#3E4947] transition hover:bg-[#E2E8F0]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#1E293B] p-4 font-mono text-[11px] leading-relaxed text-[#94E5D8]">
              <pre>{JSON.stringify({ nodes, edges }, null, 2)}</pre>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] bg-[#F2F4F6] p-3">
              <button
                onClick={copyGraphJson}
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition ${
                  copied ? 'bg-[#16A34A]' : 'bg-[#00695F] hover:bg-[#004F47]'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
              </button>
              <button
                onClick={() => setShowJsonModal(false)}
                className="rounded-lg border border-[#BEC9C6] px-4 py-1.5 text-xs font-semibold text-[#3E4947] transition hover:bg-[#E2E8F0]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
