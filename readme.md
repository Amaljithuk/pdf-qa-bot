# PDF Question Answering Bot (RAG)

A full-stack RAG application built with React, FastAPI, and Pinecone.

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** FastAPI, LangChain
- **Vector DB:** Pinecone
- **LLM:** OpenRouter (OpenAI-compatible)

## Setup
1. Clone the repo.
2. In `/backend`, create a `.env` with `OPENROUTER_API_KEY`, `PINECONE_API_KEY`, and `PINECONE_INDEX_NAME`.
3. Run `pip install -r requirements.txt` and start with `uvicorn main:app --reload`.
4. In `/frontend`, run `npm install` and `npm run dev`.