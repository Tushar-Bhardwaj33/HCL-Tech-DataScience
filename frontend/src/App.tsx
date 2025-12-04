import { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  FileText, 
  Send, 
  Sparkles, 
  MoreVertical, 
  X, 
  Loader2,
  Menu,
  BookOpen,
  Plus,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface SummaryData {
  title: string;
  summary: string;
  sources: number;
}

function App() {
  // State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // State logic helpers
  const resetSession = () => {
    setMessages([]);
    setSummaryData(null);
    setIsSummarizing(false);
    setIsThinking(false);
    setInputValue("");
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prevFiles) => {
      const newFiles = prevFiles.filter((_, idx) => idx !== indexToRemove);
      if (newFiles.length === 0) {
        resetSession(); // Clear session if all files removed
      } else {
        // If files change, we should ideally regenerate summary, 
        // but for now let's just keep the session active or reset if desired.
        // Per requirements: "If user uploads new documents: Reset chat, Reset summary panel"
        // This implies ANY change to source material might warrant a reset, 
        // but usually adding triggers reset. Removing might be subtle.
        // Let's stick to the "upload" trigger for full reset for now, 
        // but if they remove all, we definitely reset.
      }
      return newFiles;
    });
  };

  // Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    
    // NotebookLM behavior: New upload resets everything
    resetSession();
    setIsUploading(true);

    const formData = new FormData();
    newFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      // 1. Upload Files
      await new Promise(resolve => setTimeout(resolve, 800)); // UX delay
      
      const uploadResponse = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      const fileData = newFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      }));
      
      // Add to existing files or replace? 
      // Requirement says "If user uploads new documents: Reset chat... Create new session"
      // Usually this means adding to the context, but resetting the conversation.
      setFiles(prev => [...prev, ...fileData]); 
      
      // 2. Generate Summary
      setIsUploading(false);
      setIsSummarizing(true);
      
      // We need to send all filenames including previous ones if we are accumulating
      // For simplicity, let's assume we send just the new ones or all. 
      // Ideally, the backend knows the session state. 
      // Let's send a summary request.
      
      const allFileNames = [...files, ...fileData].map(f => f.name);
      
      try {
        const summaryResponse = await fetch("http://localhost:5000/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filenames: allFileNames }),
        });

        if (!summaryResponse.ok) throw new Error("Summary generation failed");
        
        const data = await summaryResponse.json();
        setSummaryData({
          title: data.title || "Untitled Notebook",
          summary: data.summary || "No summary available.",
          sources: allFileNames.length
        });
        
      } catch (summaryError) {
        console.error("Summary error:", summaryError);
        // Fallback mock summary
        setTimeout(() => {
          setSummaryData({
            title: "Untitled Notebook",
            summary: "This notebook contains information from your uploaded documents. You can now ask questions to analyze connections, summarize key points, and get insights across all your sources.",
            sources: allFileNames.length
          });
        }, 1500);
      }

    } catch (error) {
      console.error("Upload error:", error);
      // Fallback for demo
      const fileData = newFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      }));
      setFiles(prev => [...prev, ...fileData]);
      setIsUploading(false);
      setIsSummarizing(true);
      
      setTimeout(() => {
         setSummaryData({
            title: "Untitled Notebook",
            summary: "This notebook contains information from your uploaded documents. You can now ask questions to analyze connections, summarize key points, and get insights across all your sources.",
            sources: files.length + newFiles.length
          });
          setIsSummarizing(false);
      }, 2000);
      
      toast({
        title: "Demo Mode",
        description: "Backend not connected. Simulated upload & summary.",
      });
    } finally {
      setIsSummarizing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
    if (!summaryData) return;
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsThinking(true);

    try {
      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: userMsg.content,
          session: "current-session-id" // Mock ID
        }),
      });

      if (!response.ok) throw new Error("Query failed");

      const data = await response.json();
      const answer = data.answer || data.response || "I received your message.";

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error("Query error:", error);
      // Fallback demo response
      setTimeout(() => {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Based on your sources, I can confirm that this is a simulated response since the backend is currently unreachable. In a real environment, this would be a specific answer derived from your documents.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMsg]);
      }, 1000);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#fdfdfd] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar - Sources (Darker/different from main) */}
      <aside 
        className={cn(
          "bg-[#f0f2f5] border-r border-slate-200 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col z-20",
          sidebarOpen ? "w-[280px]" : "w-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg tracking-tight text-slate-700 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Sources
          </h2>
        </div>

        <div className="px-3 pb-4 flex-1 overflow-hidden flex flex-col">
          <div className="mb-4">
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.docx,.md"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm h-10 rounded-full text-sm font-medium transition-all flex items-center justify-start px-4"
              disabled={isUploading || isSummarizing}
            >
              <div className="bg-indigo-100 rounded-full p-0.5 mr-2">
                 <Plus className="w-3 h-3 text-indigo-600" />
              </div>
              {isUploading ? "Uploading..." : "Add Source"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {files.length === 0 ? (
              <div className="text-center py-8 px-4 opacity-60">
                <p className="text-xs text-slate-500">No sources added</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                 {files.map((file, idx) => (
                  <div 
                    key={idx} 
                    className="group flex items-center p-2.5 bg-white border border-slate-200/60 rounded-xl hover:shadow-sm transition-all cursor-default"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#f1f3f4] flex items-center justify-center flex-shrink-0 text-slate-500 mr-3">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full max-w-full overflow-hidden bg-white">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-500 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-medium text-lg text-slate-800">
              {summaryData ? summaryData.title : "Notebook"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-500">
                Share
            </Button>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                U
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pb-32 scroll-smooth">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {/* 1. Summary Section (Shows after upload) */}
                    {(summaryData || isSummarizing) && (
                         <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl">
                                {isSummarizing ? (
                                    <div className="flex flex-col items-center py-8 gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-25"></div>
                                            <div className="relative bg-indigo-50 p-4 rounded-full">
                                                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-1">
                                            <h3 className="text-lg font-medium text-slate-800">Generating summary...</h3>
                                            <p className="text-slate-500 text-sm">Analyzing your documents</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-indigo-50 rounded-md">
                                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Notebook Guide</span>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-normal text-slate-900 tracking-tight">
                                            {summaryData?.title}
                                        </h2>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                                            <span className="font-medium">{summaryData?.sources} source(s)</span>
                                        </div>
                                        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                                            <p>{summaryData?.summary}</p>
                                        </div>
                                    </div>
                                )}
                            </Card>
                         </div>
                    )}

                    {/* 2. Chat Messages */}
                    <div className="space-y-6 pb-4">
                        {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={cn(
                            "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                            msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div 
                            className={cn(
                                "max-w-[80%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed",
                                msg.role === "user" 
                                ? "bg-[#f1f3f4] text-slate-800 rounded-br-sm" 
                                : "bg-transparent text-slate-800 px-0"
                            )}
                            >
                            {msg.role === "assistant" && (
                                <div className="flex items-center gap-2 mb-1">
                                     <Sparkles className="w-4 h-4 text-indigo-600" />
                                     <span className="text-xs font-medium text-slate-500">Answer</span>
                                </div>
                            )}
                            {msg.content}
                            </div>
                        </div>
                        ))}
                        
                        {isThinking && (
                             <div className="flex justify-start w-full animate-in fade-in duration-300">
                                <div className="bg-transparent px-0 py-2 flex items-center gap-3">
                                  <div className="w-6 h-6 bg-indigo-50 rounded-full flex items-center justify-center">
                                      <Sparkles className="w-3 h-3 text-indigo-600" />
                                  </div>
                                  <span className="text-sm text-slate-400 font-medium">Thinking...</span>
                                </div>
                              </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Empty State / Prompt Suggestions */}
                    {summaryData && !isSummarizing && messages.length === 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-700 delay-150">
                            {["Suggest related ideas", "Create a study guide", "Find key themes", "Summarize the timeline"].map((suggestion, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setInputValue(suggestion)}
                                    className="p-4 text-left bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                                >
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{suggestion}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {/* Initial Empty State (No files) */}
                    {!summaryData && !isSummarizing && files.length === 0 && (
                         <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-60">
                            <div className="p-6 bg-slate-50 rounded-full mb-2">
                                <BookOpen className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-medium text-slate-400">Add sources to get started</h3>
                         </div>
                    )}
                </div>
            </div>

            {/* Input Area (Fixed Bottom) */}
            <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-slate-100 absolute bottom-0 left-0 right-0 z-20">
                <div className="max-w-3xl mx-auto relative">
                    <div className={cn(
                        "relative flex items-end gap-2 bg-[#f0f2f5] rounded-3xl p-2 transition-all duration-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 focus-within:shadow-md",
                        (!summaryData && !isSummarizing) && "opacity-50 cursor-not-allowed"
                    )}>
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!summaryData}
                        placeholder={
                            isSummarizing ? "Summary is being generated..." : 
                            summaryData ? "Start typing..." : 
                            "Upload a document to start..."
                        }
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-4 text-slate-700 placeholder:text-slate-400 scrollbar-hide text-[15px]"
                        rows={1}
                        style={{ height: inputValue ? `${Math.min(inputValue.split('\n').length * 24 + 24, 128)}px` : '48px' }}
                    />
                    <Button 
                        onClick={handleSendMessage}
                        disabled={!summaryData || !inputValue.trim() || isThinking}
                        className={cn(
                        "rounded-full h-10 w-10 mb-1 transition-all duration-200",
                        summaryData && inputValue.trim() 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" 
                            : "bg-transparent text-slate-300 hover:bg-slate-200/50"
                        )}
                        size="icon"
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </Button>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;
