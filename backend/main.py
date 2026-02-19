import os
import shutil
from fastapi import FastAPI, UploadFile, File
from ingestion import process_pdf
from pydantic import BaseModel
from rag_engine import get_answer
from fastapi.middleware.cors import CORSMiddleware

class QuestionRequest(BaseModel):
    question: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development; narrow this down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a temporary directory for uploads
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # Save file locally first
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Process and index
    try:
        result = process_pdf(file_path)
        return {"message": result}
    except Exception as e:
        return {"error": str(e)}
    finally:
        # Clean up local file after indexing
        if os.path.exists(file_path):
            os.remove(file_path)

@app.get("/")
def read_root():
    return {"status": "Backend is running!"}

@app.post("/chat")
async def chat_with_pdf(request: QuestionRequest):
    try:
        response = get_answer(request.question)
        # Ensure sources are included in the response
        return {
            "answer": response.get("answer", ""),
            "sources": response.get("sources", [])
        }
    except Exception as e:
        return {"error": str(e), "answer": "Error processing your question", "sources": []}