# Chatbot Builder WhatsApp

Visual builder untuk chatbot WhatsApp: susun alur percakapan dengan editor node bertipe socket, atur gaya balasan AI, lalu jalankan lewat engine event-based berbasis queue.

- **Frontend** — React 18 + TypeScript + Vite + Tailwind CSS v4 (canvas node editor, galeri template, halaman Persona AI, halaman Koneksi AI).
- **Backend** — Fastify + Zod + BullMQ + Redis (eksekusi alur node, pengiriman WhatsApp, Meta CAPI, adapter AI provider-agnostic).

---

## Daftar Isi

- [Fitur](#fitur)
- [Preset Koneksi AI](#preset-koneksi-ai)
- [Arsitektur](#arsitektur)
- [Tech Stack](#tech-stack)
- [Prasyarat](#prasyarat)
- [Instalasi](#instalasi)
- [Environment Variables](#environment-variables)
- [Menjalankan](#menjalankan)
- [API Endpoints](#api-endpoints)
- [Tipe Node Alur](#tipe-node-alur)
- [Keamanan](#keamanan)
- [Testing & CI](#testing--ci)
- [Struktur Repo](#struktur-repo)

---

## Fitur

### Builder (frontend)
- **Canvas node bertipe socket** — node disambungkan lewat socket bertipe (`flow`, `string`, `number`, `boolean`, `json`, `array`); koneksi divalidasi agar tipe cocok.
- **Galeri template** — 12 template siap pakai (sambut pelanggan, janji temu, kualifikasi lead, dsb.) dengan filter kategori & saluran, judul ramah pengguna.
- **Persona AI** — peran bot, gaya bicara, sumber pengetahuan, data wajib, dan jam kerja bot. Config disimpan ke backend.
- **Koneksi AI** — preset **Meta Model API** (default), OpenCode Go, OpenAI, Anthropic, Google Gemini, dan Kustom. Atur base URL, model, dan API key. Kunci disimpan **terenkripsi** (AES-256-GCM); UI hanya menampilkan hash.
- **Pratinjau & uji** — panel simulasi percakapan dan tombol Uji Koneksi.

### Engine (backend)
- **Eksekusi alur event-based** — tiap pesan masuk dijadikan job; worker menjalankan graph node-by-node sampai selesai / menunggu / handoff.
- **Antrian & resume** — BullMQ (`inbound`, `resume`) untuk pesan dan jeda/waktu-tunggu.
- **Pengiriman WhatsApp Cloud API** — teks, tombol (≤3), list (≤10), media. Otomatis **mock** bila token kosong.
- **Meta Conversions API (CAPI)** — lapor event konversi server-to-server (nomor di-hash SHA-256).
- **AI provider-agnostic** — `aiAgentNode` memakai kredensial dari halaman Koneksi AI (default Meta Model API / Muse; fallback ke env Gemini).
- **HTTP Request node aman** — hanya HTTPS publik, blokir IP privat/localhost (anti-SSRF), redirect manual.
- **Guard alur** — `MAX_STEPS`, `MAX_NODE_VISITS` (anti-loop), deduplikasi pesan, verifikasi signature webhook.

---

## Preset Koneksi AI

Halaman **Koneksi AI** menyediakan preset berikut (base URL dan model tetap bisa diubah manual):

| Preset | Protocol | Base URL | Model |
|---|---|---|---|
| **Meta Model API** (default) | `openai` | `https://api.meta.ai/v1` | `muse-spark-1.3`, `muse-spark-1.3-contributor`, `muse-spark-1.2`, `muse-spark-1.1`, `muse-wonder-1.0` |
| OpenCode Go | `openai` | `https://api.opencode.go/v1` | Muse (`muse-spark-1.3`, `muse-spark-1.3-contributor`, `muse-spark-1.2`, `muse-wonder-1.0`), `deepseek-v4.1-flash`, `deepseek-v4.1`, `gpt-5-mini` |
| OpenAI | `openai` | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o` |
| Anthropic | `anthropic` | `https://api.anthropic.com/v1` | Muse (`muse-wonder-1.0`, `muse-spark-1.3`, `muse-spark-1.3-contributor`, `muse-spark-1.2`, `muse-spark-1.1`), `claude-3.5-sonnet`, `claude-3.5-haiku` |
| Google Gemini | `gemini` | `https://generativelanguage.googleapis.com/v1beta` | `gemini-1.5-flash`, `gemini-1.5-pro` |
| Kustom | `openai` | _(isi sendiri)_ | _(isi sendiri)_ |

Catatan:

- **Meta Model API** kompatibel dengan OpenAI (Chat Completions) dan Anthropic (Messages). Untuk memakai model Muse lewat preset **Anthropic**, ubah Base URL ke `https://api.meta.ai/v1`.
- API key Meta dibuat di dashboard Model API (`MODEL_API_KEY`) dan ditempel di kolom **Kunci API** halaman Koneksi AI — tidak perlu env server.
- Referensi: <https://dev.meta.ai/docs/api-reference>.

---

## Arsitektur

Pola pipeline:

```
terima pesan → validasi → enqueue (inbound) → worker
   → muat flow + state → executor (state machine) → kirim (WhatsApp/CAPI/AI) → simpan state
```

```
src/                     (frontend)
  chatbot-builder-whatsapp.tsx   canvas, katalog node, galeri template, daftar bot
  persona-ai-page.tsx            Persona AI (gaya bicara, pengetahuan, data wajib)
  ai-connection-page.tsx         Koneksi AI (provider, model, API key)
  api.ts                         client HTTP ke backend

server/src/              (backend)
  index.ts                Fastify: routes + webhook + bootstrap worker
  worker.ts               BullMQ worker (inbound/resume) + deps
  engine/executor.ts      state machine eksekusi node
  engine/node-defs.ts     daftar output tiap tipe node
  engine/expression.ts    evaluasi kondisi & regex aman
  engine/schedule.ts      cek jam operasional
  flow/schema.ts          validasi graph (Zod) + aturan socket
  flow/store.ts           simpan/muat flow (Redis)
  flow/state.ts           state percakapan (Redis)
  ai.ts / ai-providers.ts adapter AI multi-protocol (OpenAI-compatible, Anthropic Messages, Gemini)
  ai-config.ts            persist config AI + enkripsi kunci
  secret-box.ts           AES-256-GCM + hash
  persona.ts / settings.ts config persona & jam operasional
  whatsapp.ts / capi.ts   integrasi WhatsApp & Meta
  http.ts                 HTTP client dengan guard SSRF
  security.ts             API key, signature webhook, dedup
  queue.ts / redis.ts     BullMQ + Redis
```

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS v4, lucide-react |
| Backend | Node.js, TypeScript, Fastify 4, Zod, BullMQ, ioredis |
| Infrastruktur | Redis 7, Docker Compose (Redis) |
| Test | `node:test` (via `tsx`) |

---

## Prasyarat

- Node.js **20+**
- Redis 7 (atau Docker untuk menjalankan Redis)

---

## Instalasi

```bash
# 1. dependency frontend
npm install

# 2. dependency server
npm --prefix server install

# 3. jalankan Redis
docker compose -f server/docker-compose.yml up -d

# 4. siapkan env server
cp server/.env.example server/.env   # lalu sesuaikan isinya
```

---

## Environment Variables

### Server (`server/.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `8080` | Port HTTP server |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Koneksi Redis |
| `FLOW_API_KEY` | `change-me-please` | Kunci untuk endpoint admin (`x-api-key`) |
| `WEBHOOK_APP_SECRET` | _(kosong)_ | Bila diisi, webhook wajib signature `X-Hub-Signature-256` |
| `WHATSAPP_TOKEN` | _(kosong)_ | Token Cloud API; kosong → mode mock |
| `WHATSAPP_PHONE_NUMBER_ID` | _(kosong)_ | Phone number ID WhatsApp |
| `GEMINI_API_KEY` | _(kosong)_ | Fallback AI bila Koneksi AI belum diisi |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Model fallback |
| `AI_CONFIG_SECRET` | `dev-ai-config-secret-key-32bytes` | Kunci enkripsi API key (≥16 karakter, **wajib diganti di produksi**) |
| `DEFAULT_FLOW_ID` | _(kosong)_ | Flow default saat tidak ada `flowId` di query webhook |
| `CONVERSATION_TTL_SECONDS` | `86400` | TTL state percakapan |
| `MAX_STEPS` | `40` | Batas langkah per turn |
| `MAX_NODE_VISITS` | `12` | Batas kunjungan node (anti-loop) |

### Frontend (opsional, saat build)

| Variabel | Default | Keterangan |
|---|---|---|
| `VITE_API_BASE` | `http://127.0.0.1:8080` | Base URL backend |
| `VITE_FLOW_API_KEY` | `change-me-please` | Harus sama dengan `FLOW_API_KEY` |

---

## Menjalankan

```bash
# Frontend (Vite dev server)
npm run dev                 # http://127.0.0.1:5173

# Backend (watch mode)
npm --prefix server run dev # http://127.0.0.1:8080
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run build` | Build frontend produksi |
| `npm run lint` | ESLint (frontend + server) |
| `npm test` | Jalankan test server |
| `npm run verify` | lint + test + build frontend + build server |
| `npm --prefix server run typecheck` | `tsc --noEmit` |
| `npm --prefix server run build` | Compile server ke `server/dist` |

---

## API Endpoints

Semua endpoint admin butuh header `x-api-key: <FLOW_API_KEY>`.

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/health` | Health check |
| `PUT` | `/flows/:id` | Simpan graf flow |
| `GET` | `/flows/:id` | Ambil graf flow |
| `GET` | `/ai/config` | Ambil config AI (tanpa kunci) |
| `PUT` | `/ai/config` | Simpan config AI (kunci dienkripsi) |
| `POST` | `/ai/test` | Uji koneksi AI |
| `GET` | `/settings/office-hours` | Ambil jam operasional |
| `PUT` | `/settings/office-hours` | Simpan jam operasional |
| `GET` | `/persona/config` | Ambil config persona |
| `PUT` | `/persona/config` | Simpan config persona |
| `POST` | `/webhook/whatsapp` | Webhook pesan masuk (signature) |

Contoh:

```bash
curl -X PUT http://127.0.0.1:8080/flows/demo \
  -H "x-api-key: change-me-please" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","nodes":[{"id":"n1","type":"onMessageNode","data":{}}],"edges":[]}'
```

---

## Tipe Node Alur

`onMessageNode`, `keywordMatchNode`, `ctwaNode`, `webhookNode`, `sendTextNode`, `sendButtonsNode`, `sendListNode`, `sendMediaNode`, `conditionNode`, `waitInputNode`, `delayNode`, `switchNode`, `updateStageNode`, `assignAgentNode`, `customFieldNode`, `leadScoreNode`, `appointmentNode`, `aiAgentNode`, `sentimentNode`, `httpRequestNode`, `capiNode`.

Graph divalidasi terhadap daftar ini (`server/src/engine/node-defs.ts`) — tipe tak dikenal akan ditolak.

---

## Keamanan

- **API key** hanya hidup di env; endpoint admin diverifikasi dengan perbandingan waktu konstan.
- **Kunci AI dienkripsi** AES-256-GCM (`secret-box.ts`); yang disimpan/ditampilkan hanya hash SHA-256.
- **Signature webhook** `X-Hub-Signature-256` (HMAC) bila `WEBHOOK_APP_SECRET` diisi.
- **Anti-SSRF** pada `httpRequestNode`: wajib HTTPS, blokir IP privat/loopback, redirect manual.
- **Deduplikasi** pesan via Redis `SET NX` berdasarkan `messageId`.
- **Guard** `MAX_STEPS` & `MAX_NODE_VISITS` mencegah loop alur.
- Jangan pernah commit `.env` — sudah masuk `.gitignore`.

---

## Testing & CI

```bash
npm test            # 16 test (executor, expression, jadwal, secret-box)
npm run verify      # lint + test + build + build server
```

CI (`.github/workflows/ci.yml`) menjalankan `lint → test → build frontend → build server` pada pull request dan push.

---

## Struktur Repo

```
├── src/                     # frontend (React + Vite)
├── server/                  # backend (Fastify + BullMQ)
│   ├── src/
│   │   ├── engine/          # executor, node-defs, expression, schedule
│   │   ├── flow/            # schema, store, state
│   │   └── ...
│   ├── docker-compose.yml   # Redis
│   └── .env.example
├── .github/workflows/ci.yml
├── vite.config.ts
└── package.json
```
