# HCL-Tech-genai – Document-aware RAG Assistant

An end-to-end Retrieval-Augmented Generation (RAG) system that lets you:

- Upload PDFs and other documents
- Extract and chunk text (and optionally tables/images)
- Build a semantic retriever over those chunks
- Chat with an LLM grounded in your own data via a web UI

This repo contains both **backend** (Python / FastAPI + LangChain-style pipeline) and **frontend** (TypeScript / React) code.

---

## ✨ Features

- **RAG pipeline**: Ingests PDFs, chunks them, and builds a retriever for QA.
- **Multi-provider LLM support** (designed to work with providers like Groq, NVIDIA, etc.).
- **Lazy imports & light mode**: Can run core logic (and tests) without installing every heavy dependency.
- **API-first backend**: FastAPI endpoints for ingestion, retrieval and chat.
- **Modern frontend**: TypeScript SPA for uploading docs and chatting with the assistant.
- **Environment-based configuration**: Plug in API keys via `.env`.

---

## 🗂️ Repository Structure

```text
HCL-Tech-genai/
├─ backend/               # Python backend (FastAPI, RAG pipeline, PDF processing)
│  ├─ app/                # API routes, services, models, utilities
│  ├─ data/               # (Git-ignored) input PDFs and processed artifacts
│  ├─ requirements.txt    # Python dependencies for backend
│  └─ run_chunker.py      # Example script to chunk PDFs
│
├─ frontend/              # TypeScript/React client
│  ├─ src/                # Components, pages, hooks, API client
│  ├─ public/             # Static assets
│  └─ package.json        # Frontend dependencies & scripts
│
└─ README.md              # Project documentation
````

> Some folders/files are illustrative; adjust the tree if you add or rename modules.

---

## ⚙️ Tech Stack

**Backend**

* Python
* FastAPI (REST API)
* LangChain ecosystem (retriever, chains, tools)
* PDF processing (e.g. `PyPDF2`, `pdf2image`, `unstructured`)
* Vector embeddings & RAG orchestration

**Frontend**

* TypeScript
* React (SPA)
* HTTP client for talking to the FastAPI backend

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Tushar-Bhardwaj33/HCL-Tech-genai.git
cd HCL-Tech-genai
```

---

### 2. Backend Setup

From the project root:

```bash
cd backend
```

#### Create and activate a virtual environment

```bash
python -m venv .venv

# Linux / macOS
source .venv/bin/activate

# Windows (PowerShell)
# .venv\Scripts\Activate.ps1
```

#### Install dependencies

```bash
pip install -r requirements.txt
```

If the full requirements fail (or you only need basic text extraction), you can start minimal and add more later, for example:

```bash
pip install PyPDF2
```

---

### 3. Configure Environment Variables

Create a `.env` file inside `backend/` (or configure env vars via your runtime):

```bash
# backend/.env

GROQ_API_KEY=your_groq_key_here
NVIDIA_API_KEY=your_nvidia_key_here
# Add other keys or configuration variables as required
```

These keys are used by the summarizer / LLM integration when you enable full RAG behavior.

---

### 4. Run the PDF Chunker (Optional Smoke Test)

Place at least one PDF into:

```text
backend/data/
    example.pdf
```

Then run:

```bash
cd backend
python run_chunker.py
```

This should:

1. Read PDFs from `backend/data/`
2. Extract content (using `unstructured` if available or falling back to `PyPDF2`)
3. Produce chunks and basic metadata ready for indexing / retrieval

---

### 5. Start the Backend API

Still inside `backend/`:

```bash
uvicorn app.main:app --reload
```

* The API will typically be served at:
  `http://127.0.0.1:8000`
* If you’ve defined a FastAPI docs route, you can visit:
  `http://127.0.0.1:8000/docs`

---

### 6. Frontend Setup

From the project root:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Run the development server (command name may differ slightly depending on your setup):

```bash
npm run dev
# or: yarn dev
```

The frontend will usually be available at:

```text
http://localhost:5173    # (or similar Vite/React dev port)
```

Make sure the frontend’s API base URL points to your backend (e.g. `http://127.0.0.1:8000`).

---

## 🧪 Testing (Backend)

If you add a `tests/` folder (recommended), you can run tests with:

```bash
cd backend
pip install pytest
pytest -q
```

Design intent:

* **Lazy imports**: modules that depend on heavy packages (LangChain, `unstructured`, vendor SDKs) only import them when needed.
* This allows tests to run even if certain heavy libraries aren’t installed, as long as the test suite injects fakes or mocks.

---

## 🧱 High-Level Architecture

```text
+-------------+        HTTP/JSON        +---------------------+       Vector search / RAG
|  Frontend   |  <--------------------> |     FastAPI API     |  <----------------------+
| (React/TS)  |        (REST)           |  (Python backend)   |                         |
+-------------+                         +---------------------+                         |
          ^                                       |                                     |
          |                                       v                                     |
          |                               +---------------+       +--------------------+
          |                               |  PDF Ingest   |       |  LLM + Embeddings |
          |                               |  & Chunking   |       |  (Groq, NVIDIA)   |
          |                               +---------------+       +--------------------+
          |                                        |
          |                                        v
          |                               +-----------------+
          +------------------------------ |  Vector Store   |
                                          +-----------------+
```

---
