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
    # First, get the chain's answer (keeps existing behavior)
    response = rag_chain.invoke({"input": question})

    # Try HyDE: generate a short hypothetical excerpt using the LLM,
    # then use that hypothetical text to retrieve better sources from the vectorstore.
    try:
        # Build a concise HyDE prompt
        hyde_prompt = (
            "Write a concise factual excerpt (1-2 sentences) that would directly answer the "
            f"question: \"{question}\". Provide only factual content, no commentary."
        )

        # Generate hypothetical excerpt (may return different shapes depending on LLM wrapper)
        try:
            hyde_resp = llm.invoke({"input": hyde_prompt})
        except Exception:
            # Some runtimes may implement __call__ instead
            hyde_resp = llm(hyde_prompt)

        # Extract text from possible response types
        if isinstance(hyde_resp, dict):
            hypo_text = hyde_resp.get("output") or hyde_resp.get("answer") or hyde_resp.get("text") or str(hyde_resp)
        else:
            hypo_text = str(hyde_resp)

        # Defensive: truncate hypo_text if excessively long
        hypo_text = (hypo_text or "").strip()
        if not hypo_text:
            raise ValueError("Empty HyDE output")

        # Use the vectorstore's text-based similarity search with score to find documents
        try:
            # This will embed the hypo_text internally and return docs with scores
            candidates = vectorstore.similarity_search_with_score(hypo_text, k=10)
        except Exception:
            # Fallback: use default retriever behavior if similarity_search_with_score not available
            candidates = []

        # Build citation list from candidates
        sources = []
        for doc_score in candidates:
            # candidates may be list of (doc, score) or just docs
            if isinstance(doc_score, tuple) and len(doc_score) >= 1:
                doc = doc_score[0]
            else:
                doc = doc_score
            page_num = doc.metadata.get("page", 0) + 1 if doc.metadata else 1
            source_file = doc.metadata.get("source", "Unknown") if doc.metadata else "Unknown"
            filename = source_file.split("/")[-1] if source_file else "Unknown"
            sources.append(f"{filename} (Page {page_num})")

        # De-duplicate and return
        unique_sources = list(dict.fromkeys(sources))

        if not unique_sources:
            # No HyDE-retrieved sources; fall back to original context metadata
            fallback_sources = []
            for doc in response.get("context", []):
                page_num = doc.metadata.get("page", 0) + 1 if doc.metadata else 1
                source_file = doc.metadata.get("source", "Unknown") if doc.metadata else "Unknown"
                filename = source_file.split("/")[-1] if source_file else "Unknown"
                fallback_sources.append(f"{filename} (Page {page_num})")
            unique_fallback = list(dict.fromkeys(fallback_sources))
            return {"answer": response.get("answer", ""), "sources": unique_fallback}

        return {"answer": response.get("answer", ""), "sources": unique_sources}

    except Exception:
        # On any HyDE failure, gracefully return the original rag_chain answer and its sources
        sources = []
        for doc in response.get("context", []):
            page_num = doc.metadata.get("page", 0) + 1 if doc.metadata else 1
            source_file = doc.metadata.get("source", "Unknown") if doc.metadata else "Unknown"
            filename = source_file.split("/")[-1] if source_file else "Unknown"
            sources.append(f"{filename} (Page {page_num})")
        unique_sources = list(dict.fromkeys(sources))
        return {"answer": response.get("answer", ""), "sources": unique_sources}