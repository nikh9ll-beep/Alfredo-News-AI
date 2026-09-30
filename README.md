# AlfredoNews AI – Financial News Simplifier

> **Understand financial news. Simplified by AI.**

AlfredoNews AI is a full-stack, production-ready platform that converts complex financial news into clean, jargon-free explanations for students, beginner retail investors, and curious business professionals.

---

## 1. Project Overview
Financial journalism is frequently dense, filled with esoteric jargon (such as *CET1 capital ratios, yield curve inversions, basis points, quantitative tightening*), and numbers that can overwhelm readers.

**AlfredoNews AI bridges this gap without compromising factual integrity.** It retrieves real-time financial news, parses articles, and generates a structured, multi-dimensional breakdown including:
- **Simple Summary**: 3–5 sentence executive summary in plain English.
- **What Happened?**: Direct explanation of the primary catalyst.
- **Why It Matters**: Concrete real-world significance for everyday consumers and the economy.
- **Key Takeaways**: 3–5 scannable bullet points.
- **Financial Glossary**: Automated identification and plain-English definitions of complex terms.
- **Market Impact**: Verified market shifts (strictly without fabricated speculation).
- **Important Numbers**: Preservation of exact percentages, interest rates, and monetary figures.
- **Safety Disclaimer**: Prominent reminder that simplifications are for educational purposes and do not constitute financial advice.

---

## 2. Technology Stack & Architecture
- **Frontend Dashboard**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Node.js Live Server**: Express backend (`server.ts`) integrated with Vite middleware for container execution on port 3000.
- **Python FastAPI Backend**: Production FastAPI application (`backend/main.py`) with Pydantic validation, CORS, and modular services.
- **AI Processing Engines**:
  - **Groq API**: Powered by `llama-3.3-70b-versatile` for ultra-fast, structured financial inference.
  - **Google Gemini API**: Native integration via `@google/genai` (`gemini-3.8-flash`) as primary server-side capability.
  - **Fallback Synthesis Engine**: Deterministic financial analysis safeguarding app continuity even when external API quotas are exhausted.
- **News Ingestion**: NewsAPI (`/v2/top-headlines` & `/v2/everything`) paired with a high-fidelity curated live financial feed.

---

## 3. Project Structure
```
finnews-ai/
│
├── backend/
│   ├── main.py                  # FastAPI entry point & CORS
│   ├── config.py                # Pydantic & environment settings
│   ├── schemas.py               # Request/Response Pydantic models
│   ├── routes/
│   │   ├── health.py            # /health & /api/status
│   │   ├── news.py              # /api/news endpoint
│   │   └── ai.py                # /api/simplify & /api/news/simplify
│   ├── services/
│   │   ├── news_service.py      # NewsAPI ingestion & sanitization
│   │   └── ai_service.py        # Groq LLaMA 3.3 & prompt engine
│   └── utils/
│       └── validators.py        # Input cleaning & validation
│
├── src/                         # Full Interactive Dashboard
│   ├── components/
│   │   ├── Header.tsx           # Navigation & status indicators
│   │   ├── ArticleCard.tsx      # News card with AI expander
│   │   ├── ChatBotModal.tsx     # FinNews Assistant chatbot
│   │   ├── CustomArticleModal.tsx # Simplify any custom text/URL
│   │   └── GlossaryModal.tsx    # Interactive finance dictionary
│   ├── types.ts                 # TypeScript data contracts
│   ├── App.tsx                  # Main state coordinator
│   └── main.tsx                 # React entry point
│
├── server.ts                    # Express + Vite live runner (Port 3000)
├── requirements.txt             # Python dependencies
├── .env.example                 # Template for secret variables
└── README.md                    # Documentation & architecture
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check returning `{"status": "healthy", "service": "FinNews AI"}` |
| `GET` | `/api/status` | System status, active model, and service status |
| `GET` | `/api/news` | Retrieve financial news with query params (`category`, `country`, `page_size`, `q`) |
| `POST` | `/api/simplify` | Send an article object and receive structured AI simplification |
| `POST` | `/api/news/simplify` | Batch fetch and simplify news stories |
| `POST` | `/api/chat` | Chat with the FinNews AI Assistant for finance queries and explanations |

---

## 5. Environment Variables & Setup
Create a `.env` file from `.env.example`:
```bash
# Optional: Set NewsAPI key for real-time live article retrieval
NEWS_API_KEY="your_newsapi_key_here"

# Optional: Set Groq key for LLaMA 3.3 70B inference
GROQ_API_KEY="your_groq_api_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"

# Optional: Google Gemini key (auto-injected in AI Studio environment)
GEMINI_API_KEY="your_gemini_key_here"
```

---

## 6. How to Run

### Live Container / Web Dashboard (Node.js + React + Express)
```bash
# Install dependencies
npm install

# Run the live full-stack application (runs on port 3000)
npm run dev

# Build for production
npm run build
npm run start
```

### Python FastAPI Backend
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server with Uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 7. AI Safety & Factuality Rules
1. **No Speculative Advice**: Does not recommend buying, holding, or selling stocks.
2. **Number Preservation**: Preserves basis points, monetary valuations, and percentages.
3. **Verified Market Impacts**: Explicitly reports *"Market impact cannot be determined from the available article."* if not directly stated.
4. **Jargon Translation**: Automatically identifies financial terms and defines them in plain English.
