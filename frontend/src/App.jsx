import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Upload, FileText, Loader2, Copy, Check, User, Bot } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        alert("Please drop a PDF file");
      }
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, messageId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpload = async () => {
    if (!file) return alert("Select a PDF first");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_BASE}/upload`, formData);
      alert("PDF Indexed successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMsg = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_BASE}/chat`, { question });
      const botMessage = { 
        role: "bot", 
        content: data.answer,
        sources: data.sources || []
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "bot", content: "Error: Could not reach backend.", sources: [] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-gray-700 px-8 py-6">
        <h1 className="app-title text-4xl font-bold mb-1">RAG Document Assistant</h1>
        <p className="text-gray-400 text-sm tracking-wider">Retrieval-Augmented Generation for Intelligent PDF Q&A</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-8 overflow-hidden">
        {/* Upload Section */}
        <div 
          className={`upload-section bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl w-full max-w-4xl mb-6 border-2 transition-all cursor-pointer ${dragActive ? 'border-blue-400 bg-blue-900/20' : 'border-gray-700 hover:border-blue-500'} shadow-xl`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 w-full">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={(e) => setFile(e.target.files[0])}
                className="block flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-600 file:to-blue-700 file:text-white hover:file:bg-gradient-to-r hover:file:from-blue-700 hover:file:to-blue-800 cursor-pointer"
              />
              <button 
                onClick={handleUpload}
                disabled={uploading}
                className="upload-btn flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2 rounded-lg whitespace-nowrap font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                Upload
              </button>
            </div>
            {!file && <p className="text-gray-500 text-sm">or drag and drop your PDF here</p>}
            {file && <p className="text-blue-400 text-sm">✅ {file.name}</p>}
          </div>
        </div>

        {/* Chat Section */}
        <div className="chat-container bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl w-full max-w-4xl flex flex-col flex-1 border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-blue-400">Conversation</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-30" />
                <p>Upload a PDF and ask questions to get started...</p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {msg.role === 'bot' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
              )}
              <div className={`max-w-[70%] group`}>
                <div className={`p-4 rounded-xl text-sm leading-relaxed ${msg.role === 'user' ? 'user-message text-white' : 'bot-message text-gray-100'}`}>
                  {msg.content}
                  {msg.role === 'bot' && msg.sources && msg.sources.length > 0 && (
                    <div className="citation-container">
                      <div className="text-xs font-semibold text-gray-400 mb-2 mt-3">📄 Sources:</div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, idx) => (
                          <span key={idx} className="citation-item">
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {msg.role === 'bot' && (
                  <button
                    onClick={() => copyToClipboard(msg.content, i)}
                    className="mt-2 text-gray-400 hover:text-gray-200 transition flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100"
                  >
                    {copiedId === i ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copiedId === i ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex items-center gap-2 bg-gray-700 text-gray-200 p-4 rounded-xl">
                <Loader2 className="animate-spin" size={18} />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleChat} className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700 flex gap-3">
          <input 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something about the PDF..."
            className="chat-input flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button type="submit" className="send-btn bg-blue-600 p-3 rounded-xl hover:bg-blue-700 text-white transition flex items-center justify-center">
            <Send size={20} />
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

export default App;