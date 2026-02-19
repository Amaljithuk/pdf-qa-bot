import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

# 1. Setup Embeddings (Must match ingestion.py)
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small", 
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1"
)

# 2. Connect to the existing Pinecone Index
vectorstore = PineconeVectorStore(
    index_name=os.getenv("PINECONE_INDEX_NAME"), 
    embedding=embeddings
)

# 3. Setup OpenRouter LLM
llm = ChatOpenAI(
    model="arcee-ai/trinity-large-preview:free", # Or your preferred free model
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1"
)

# 4. Define the Prompt Template
system_prompt = (
    "You are an assistant for question-answering tasks. "
    "Use the following pieces of retrieved context to answer "
    "the question. If you don't know the answer, say that you "
    "don't know. Use three sentences maximum and keep the "
    "answer concise.\n\n"
    "{context}"
)

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt),
        ("human", "{input}"),
    ]
)

# 5. Create the RAG Chain with score-based filtering
# Use similarity search with score threshold to filter irrelevant results
retriever = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"score_threshold": 0.7, "k": 5}  # Only return docs with >0.7 similarity
)

question_answer_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

# def get_answer(question: str):
#     response = rag_chain.invoke({"input": question})
#     return {
#         "answer": response["answer"],
#         "sources": [doc.metadata.get("source") for doc in response["context"]]
#     }
def get_answer(question: str):
    response = rag_chain.invoke({"input": question})
    
    # Extract page numbers and filenames with citations
    sources = []
    for doc in response["context"]:
        page_num = doc.metadata.get("page", 0) + 1  # PyPDF is 0-indexed
        source_file = doc.metadata.get("source", "Unknown")
        # Extract just the filename from the path
        filename = source_file.split("/")[-1] if source_file else "Unknown"
        citation = f"{filename} (Page {page_num})"
        sources.append(citation)
    
    # Keep only unique citations
    unique_sources = list(set(sources))
    
    # Check if we have relevant sources
    if not unique_sources:
        return {
            "answer": response["answer"] + " [Note: No relevant documents found in the uploaded PDFs]",
            "sources": []
        }
    
    return {
        "answer": response["answer"],
        "sources": unique_sources
    }