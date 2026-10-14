# 🛡️ Insurance Samjho (Health Insurance Check Karo)

**Hacktoberfest 2026 - Week 2 (Side Hustle) & "Best Use of Gemma" Submission**

Insurance Samjho is a privacy-first, local-AI web application that reads dense health insurance policies and instantly generates an "Out-of-Pocket Map." It tells users exactly when they are covered and when they will have to pay from their own pocket—without ever sending highly sensitive financial and medical documents to closed-source cloud providers.

## 🚀 The Architecture

This project utilizes a modern, decoupled full-stack architecture built for local-first AI:

1. **Frontend (React / Vite / Tailwind):** A high-trust, responsive UI utilizing Apollo Client to map financial risk via dynamic scenario cards.
2. **API Gateway (Java Spring Boot / GraphQL):** Orchestrates the data flow. Handles multipart PDF uploads via REST and serves complex, nested UI data via GraphQL. 
3. **ML Microservice (Python / FastAPI):** Runs `vLLM` with **Gemma 4 (12B)**. It segments PDFs and uses constrained decoding (`guided_json`) to force the LLM to output a strict JSON schema.

## 🧠 The Anti-Hallucination Engine
Smaller local LLMs often hallucinate facts, which is dangerous in Insurance Tech. This pipeline solves that algorithmically:
* **Required Evidence:** The schema forces the LLM to provide a verbatim quote and page number for every extracted fact.
* **Deterministic Verification:** Before data reaches the user, a Python script cross-references every extracted quote against the raw PDF text. If the quote isn't a perfect match, it flags the confidence score as `"verify"`, prompting the UI to display a "Check with Insurer" badge. 

## 🛠️ Local Setup

The app has two modes, selectable in the UI: **Online LLM** (Modal-hosted Gemma + IndicTrans2) and **Local LLM (Private)** (everything on your machine). Local mode needs three model servers plus the app services.

### 1. Local LLM: Gemma 2 9B via vLLM (Port 8000)
Run in WSL/Linux. The AWQ-INT4 build fits a 12 GB GPU alongside the translation model.
```bash
vllm serve hugging-quants/gemma-2-9b-it-AWQ-INT4 \
  --served-model-name google/gemma-2-9b-it \
  --host 0.0.0.0 --port 8000 \
  --max-model-len 4096 --gpu-memory-utilization 0.7
```
Start this **before** the translation server so it can reserve its share of GPU memory first.

### 2. Translation Model: IndicTrans2 (Port 8002)
English → Hindi translation using `ai4bharat/indictrans2-en-indic-1B` (runs on the GPU in bfloat16 when CUDA is available, otherwise CPU).
```bash
cd ml-service
pip install -r requirements.txt
python -m app.serve_indictrans --port 8002
```
> **Pin `transformers==4.51.3` and `tokenizers==0.21.4`.** transformers 5.x breaks IndicTrans2 generation (repeated-token garbage output). For GPU, install a CUDA build of PyTorch (e.g. `pip install torch --index-url https://download.pytorch.org/whl/cu128`).

### 3. ML Microservice (Port 8001)
```bash
cd ml-service
uvicorn app.main:app --port 8001
```
For **Online** mode, set `VLLM_URL` and `TRANSLATE_URL` to your Modal endpoints before starting it. Local mode uses `localhost:8000` and `localhost:8002`.

### 4. Spring Boot API Gateway (Port 8080)
```bash
cd backend
mvn spring-boot:run
```

### 5. React Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

## **Support the Project** ☕

If Insurance Samjho made parsing your policy a breeze, consider buying me a coffee! 

I run the Gemma-2 LLM inference backend via Modal, and cloud GPU bills add up quickly. Your support goes directly toward keeping the online architecture live and accessible for everyone.

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="200" />](https://buymeacoffee.com/halfbloodcoder)