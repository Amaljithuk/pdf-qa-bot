import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Upload, FileText, Loader2, Copy, Check, MessageSquare, Sparkles, X } from 'lucide-react';

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
      const allowed = /\.(pdf|docx|txt)$/i;
      if (allowed.test(droppedFile.name)) {
        setFile(droppedFile);
      } else {
        alert("Please drop a PDF, DOCX, or TXT file");
      }
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, messageId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearFile = () => {
    setFile(null);
    setMessages([]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Select a file first");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_BASE}/upload`, formData);
      // Add a system welcome message after successful upload
      setMessages([{ role: "bot", content: `I've successfully indexed **${file.name}**. You can now ask me questions about it!`, sources: [] }]);
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
      const chatHistory = [...messages, userMsg].slice(-6).map(m => ({ role: m.role, content: m.content }));
      const { data } = await axios.post(`${API_BASE}/chat`, { question, chat_history: chatHistory });

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
    <div className="flex h-screen w-full bg-[#0f172a] text-white font-sans overflow-hidden">

      {/* Sidebar */}
      <div className="w-80 flex flex-col border-r border-white/5 bg-slate-900/50 backdrop-blur-sm relative z-10">

        {/* Header / Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">DocQuery AI</h1>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload your documents and chat with them using advanced RAG technology.
          </p>
        </div>

        {/* File Upload Area */}
        <div className="p-6 flex-1 flex flex-col">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Source Material</h2>

          {!file ? (
            <div
              className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-6 transition-all duration-200 ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-300 mb-1">Drag file here</p>
              <p className="text-xs text-slate-500 mb-4">PDF, DOCX, or TXT</p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <span className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-blue-400 transition-colors">
                  Browse Files
                </span>
              </label>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="glass-panel p-4 rounded-xl mb-4 relative group">
                <button
                  onClick={clearFile}
                  className="absolute top-2 right-2 p-1 rounded-full bg-slate-800/50 hover:bg-red-500/20 hover:text-red-400 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={14} />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <FileText className="text-blue-400 w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-200">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                >
                  {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : "Process File"}
                </button>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Ready to chat once processed.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>System Operational</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth" id="chat-container">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
              <div className="w-24 h-24 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-6 ring-1 ring-white/5">
                <MessageSquare className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">Start a new conversation</h3>
              <p className="text-slate-500 max-w-sm">Upload a document from the sidebar and ask questions to extract insights.</p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 max-w-3xl mx-auto animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                  {msg.role === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-purple-500/20 mt-1">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}

                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                    <div
                      className={`px-6 py-4 rounded-2xl text-[0.95rem] leading-relaxed shadow-sm ${msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'glass-panel text-slate-200 rounded-tl-sm border-slate-700/50'
                        }`}
                    >
                      {msg.content}
                    </div>

                    {/* Sources (Only for bot) */}
                    {msg.role === 'bot' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 animate-fade-in delay-100">
                        {msg.sources.map((source, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-white/5 text-[10px] text-slate-400 font-medium hover:bg-slate-800 hover:text-slate-300 transition-colors cursor-default">
                            <span>📄</span>
                            {source}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {msg.role === 'bot' && (
                      <div className="flex items-center gap-2 mt-2 ml-1">
                        <button
                          onClick={() => copyToClipboard(msg.content, i)}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                        >
                          {copiedId === i ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                          {copiedId === i ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center mt-1">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-tr from-slate-600 to-slate-500 flex items-center justify-center text-xs font-bold text-white">
                        U
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-4 max-w-3xl mx-auto animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="glass-panel px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-slate-950/80 backdrop-blur-md border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleChat} className="relative group">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask me anything about the document..."
                className="w-full glass-input px-5 py-4 pr-16 rounded-xl text-sm placeholder-slate-500 text-white shadow-lg focus:shadow-blue-500/10 outline-none"
              />
              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-0 disabled:scale-90 shadow-lg shadow-blue-600/20"
              >
                <Send size={18} />
              </button>
            </form>
            <p className="text-center text-[10px] text-slate-600 mt-3 font-medium">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;