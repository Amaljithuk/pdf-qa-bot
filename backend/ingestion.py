import os
from dotenv import load_dotenv
from langchain_community.document_loaders import (
    PyPDFLoader, 
    Docx2txtLoader, 
    TextLoader
)
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

load_dotenv()

# 1. Setup Pinecone Client
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = os.getenv("PINECONE_INDEX_NAME")

# 2. Setup Embeddings 
# We use OpenAIEmbeddings because most OpenRouter models use this standard.
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small", 
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1"
)
def process_pdf(file_path: str):
    # Load the PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    
    # Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200
    )
    docs = text_splitter.split_documents(documents)
    
    # Push to Pinecone
    vectorstore = PineconeVectorStore.from_documents(
        docs, 
        embeddings, 
        index_name=index_name
    )
    return f"Successfully indexed {len(docs)} chunks from {file_path}"
def process_document(file_path: str):
    ext = os.path.splitext(file_path)[-1].lower()
    
    # 1. Select the correct loader
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif ext == ".docx" or ext == ".doc":
        loader = Docx2txtLoader(file_path)
    elif ext == ".txt":
        loader = TextLoader(file_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

    # 2. Load and Split
    documents = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_splitter.split_documents(documents)