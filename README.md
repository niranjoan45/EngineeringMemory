# 🏗️ Engineering Memory
### AI-Powered Industrial Diagnosis Workstation for Heavy Machinery

> **Preserve engineering knowledge. Retrieve proven evidence. Diagnose with confidence — 100% offline.**

---

## 🎯 What It Does

A field technician opens a laptop, runs one file, and gets a full AI diagnostic system — no internet, no cloud, no installation needed.

The technician enters symptoms like *"slow boom movement, weak digging force, oil temperature high"* — the system searches **4,009 historical maintenance cases** using semantic AI, highlights the faulty component on a **live 3D machine model**, and gives a repair recommendation backed by real engineering evidence.

---

## 💡 Key Features

- **AI Semantic Search** — Finds the closest historical failure cases using vector similarity (not keyword matching) across 4,063 embedded vectors
- **Local AI Reasoning** — Qwen 3:4B runs via Ollama entirely on the laptop, no API calls
- **3D Interactive Machine Twin** — Diagnosed component highlighted with red pulsing glow and X-ray wireframe, camera auto-frames to the affected part
- **4,009 Historical Maintenance Cases** — Searchable by symptom, component, failure mode
- **Engineering Memory Search** — Semantic search across cases and indexed service manuals
- **Machine Passports with QR Codes** — Scan a QR code on any machine to instantly see its full maintenance history on your phone
- **Role-Based Workstations** — Technician, Engineer, Admin roles with scoped access
- **Investigations & Knowledge Center** — Track open fault investigations, approve knowledge before it enters the index
- **One-click startup** — `start_all.bat` starts everything

---

## 🚀 How to Run

### Prerequisites
- Python 3.10+
- [Ollama](https://ollama.com) with `qwen3:4b` pulled
- Node.js (for frontend build, already built)

### Start Everything
```bat
cd engineering-mem
start_all.bat
```

Then open:
```
http://localhost:8000/diagnose
```

Or double-click `index.html` — it redirects automatically.

---

## 📂 Project Architecture

```
engineering-mem/
├── start_all.bat                  # One-click startup
├── stop_all.bat                   # Stop all services
├── tools/
│   └── cloudflared.exe            # Optional public tunnel
└── em/
    ├── backend/
    │   └── app/
    │       ├── api/               # FastAPI route handlers
    │       ├── services/          # AI, FAISS, diagnosis, memory
    │       ├── db/                # SQLite / MySQL client
    │       └── main.py            # FastAPI entry point
    ├── frontend/
    │   └── src/
    │       ├── pages/             # Diagnose, Machines, Cases, Memory...
    │       ├── components/
    │       │   └── 3d/
    │       │       └── MachineScene.jsx   # Three.js 3D machine twin
    │       └── config/
    │           └── navigation.js  # Role-based nav
    ├── models/
    │   ├── engineering_memory.faiss        # FAISS vector index (4,063 vectors)
    │   └── engineering_memory_mapping.json
    ├── data/
    │   ├── engineering_memory.db           # SQLite database
    │   └── raw/                            # Source CSVs
    └── database/
        └── schema.sql
```

---

## 🧠 Tech Stack

| Layer | Technology |
|---|---|
| AI Reasoning | Qwen 3:4B via Ollama (fully offline) |
| Embedding | BAAI/bge-small-en-v1.5 (sentence-transformers) |
| Vector Search | FAISS (4,063 vectors) |
| Backend | Python FastAPI + Uvicorn |
| Database | SQLite (local) / MySQL (optional) |
| Frontend | React + Vite + Tailwind CSS |
| 3D Viewer | Three.js / React Three Fiber |
| Tunnel (optional) | Cloudflare Tunnel (trycloudflare.com) |

---

## 👥 Roles

| Role | Access |
|---|---|
| **Technician** | Diagnose, Investigations, Machines |
| **Engineer** | + Engineering Memory, Historical Cases, Evidence, Sensors, Review Queue |
| **Admin** | Full access including Ingestion, Vector DB, Audit Logs |

---

## 📱 QR Code Machine Passports

Every machine has a QR code generated from its detail page. Scanning it on any phone shows:
- Machine model, status, operating hours
- Full historical maintenance case list
- No login required to view

---

## ⚙️ How the Diagnosis Works

1. Technician selects machine and enters observed symptoms
2. System embeds symptoms using BGE model → searches FAISS index
3. Top matching historical cases + manual passages retrieved in milliseconds
4. Qwen 3:4B reasons over the evidence and returns likely cause, inspection steps, safety notes
5. 3D twin highlights the affected component with auto-camera focus
6. Technician can record verified repair → feeds back into the knowledge base

---

## 🔒 Fully Offline

- No OpenAI, no cloud APIs, no internet required
- All models run locally
- All data stored in local SQLite
- Designed for factory floors, mining sites, and remote field operations
