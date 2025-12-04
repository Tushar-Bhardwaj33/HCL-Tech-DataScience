# HCL-Tech-DataScience — RAG Backend

This repository contains a Retrieval-Augmented Generation (RAG) backend used to ingest PDFs, chunk and extract text, tables and images, summarize content with LLMs, and build a retriever for downstream QA or assistants.

Contents
- backend/: Backend application code (rag chunking, ingest, summarizer, loader, agent)
- backend/data/: Place PDF files here for processing
- tests/: Unit tests (pytest) that exercise core logic without requiring heavy vendor libraries

Quickstart
1. Create a Python virtual environment
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate

2. Install runtime requirements (adjust if you only need testing):
   pip install -r backend/requirements.txt

   Notes:
   - Large vendor libraries (unstructured, langchain, model provider SDKs) may be optional when running the test suite because the code uses lazy imports and fallbacks. Install them only when you need full functionality.
   - If you only want basic PDF text extraction, install PyPDF2: pip install PyPDF2

3. Place a PDF file into backend/data/ (e.g. backend/data/example.pdf)

4. Run the chunker script to extract chunks (uses unstructured if available, falls back to PyPDF2):
   python backend/run_chunker.py

Running Tests
- Install pytest if needed:
  pip install pytest
- Run tests from repository root:
  pytest -q

What the tests cover
- tests/test_summarizer.py: ensures SummarizerAndImageDescriber initializes correctly and can be imported without installing heavy LLM/model packages (tests inject small fake langchain modules).
- tests/test_get.py: ensures chunk metadata extraction behaves as expected.
- tests/test_conversations.py: ensures ConversationSession.run handles various stream shapes from an agent executor.

Design notes and runtime behavior
- Lazy imports: Modules that depend on large third-party libraries (langchain, unstructured, model SDKs) perform imports lazily and provide lightweight fallbacks so unit tests and minimal features run without those packages.
- Summarizer fallback: If model SDKs are not installed or API keys are missing, summarizer methods will either raise (missing API keys) or use simple fallbacks so tests remain deterministic.
- PDF processing: If unstructured.partition.pdf is present it'll be used. Otherwise PyPDF2 is used to extract per-page text and create minimal chunk objects.

Environment variables
- GROQ_API_KEY: API key for Groq (used by summarizer)
- NVIDIA_API_KEY: API key for NVIDIA model provider

Common troubleshooting
- "ModuleNotFoundError" for optional packages: install the package or run tests which use injected fakes.
- If pip install -r backend/requirements.txt fails, install only the packages you need (e.g., PyPDF2 for basic PDF extraction).

Next steps / Recommendations
- Convert other top-level imports to lazy imports if you plan to run unit tests without vendor packages.
- Add CI configuration and pin versions in requirements.txt for reproducible installs.
- Implement further test coverage for loader, ingest and agent components with mocks for external services.

License
- Add your preferred license file to the repository root.
