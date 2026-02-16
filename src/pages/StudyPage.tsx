import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Network,
  Layers,
  BookOpen,
  Loader2,
  ChevronLeft,
  RotateCcw,
  Trophy,
  FlipVertical,
  ChevronRight,
  Play,
  Plus,
  Maximize2,
  X,
  ScrollText,
  Copy,
  Check,
  MessageSquare,
  Send,
  StickyNote,
  Trash2,
  History,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { marked } from "marked";
import { getVideoSessionById, saveVideoSession, getSettings, getNotes, saveNotes, getChatSessionsByVideoId, saveChatSession, deleteChatSession } from "../services/storage";
import { generateStudyMaterial, generateQuiz, getDefaultModelForProvider, streamChatWithVideo } from "../services/ai";
import { VideoSession, StudyMaterialType, MindMapNode, Flashcard, AppSettings, Quiz, ChatMessage, Note, ChatSession } from "../types";

type Tab = StudyMaterialType | "quizHistory" | "transcription" | "chat" | "notes";

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "summary", label: "Summary", icon: <FileText size={16} /> },
  { key: "transcription", label: "Transcription", icon: <ScrollText size={16} /> },
  { key: "mindMap", label: "Mind Map", icon: <Network size={16} /> },
  { key: "flashcards", label: "Flashcards", icon: <Layers size={16} /> },
  { key: "studyGuide", label: "Study Guide", icon: <BookOpen size={16} /> },
  { key: "quizHistory", label: "Quiz History", icon: <Trophy size={16} /> },
  { key: "chat", label: "Chat", icon: <MessageSquare size={16} /> },
  { key: "notes", label: "Notes", icon: <StickyNote size={16} /> },
];

export default function StudyPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<VideoSession | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [generatingTabs, setGeneratingTabs] = useState<Set<Tab>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  const [quizQuestionCount, setQuizQuestionCount] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const [videoNotes, setVideoNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([getVideoSessionById(sessionId), getSettings(), getNotes(), getChatSessionsByVideoId(sessionId)]).then(
      ([s, st, allNotes, chatSes]) => {
        setSession(s);
        setSettings(st);
        setVideoNotes(allNotes.filter((n) => n.videoSessionId === sessionId));
        setChatSessions(chatSes);
        // Restore latest chat session if available
        if (chatSes.length > 0) {
          setActiveChatId(chatSes[0].id);
          setChatMessages(chatSes[0].messages);
        }
        // Set initial tab from URL param (default stays "summary")
        const tabParam = searchParams.get("tab") as Tab;
        if (tabParam && TAB_CONFIG.some((t) => t.key === tabParam)) {
          setActiveTab(tabParam);
        }
        setLoading(false);
      }
    );
  }, [sessionId]);

  const handleGenerate = useCallback(
    async (type: StudyMaterialType) => {
      if (!session || !settings) return;
      setGeneratingTabs((prev) => new Set(prev).add(type));
      setError(null);
      try {
        const apiKey =
          settings.selectedProvider === "openai"
            ? settings.openaiApiKey
            : settings.geminiApiKey;
        const model =
          settings.selectedModel ||
          getDefaultModelForProvider(settings.selectedProvider);

        const result = await generateStudyMaterial(
          type,
          settings.selectedProvider,
          apiKey,
          session.transcript,
          model
        );

        setSession((prev) => {
          if (!prev) return prev;
          const updated: VideoSession = {
            ...prev,
            studyMaterials: { ...prev.studyMaterials, ...result },
          };
          saveVideoSession(updated);
          return updated;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate content"
        );
      } finally {
        setGeneratingTabs((prev) => {
          const next = new Set(prev);
          next.delete(type);
          return next;
        });
      }
    },
    [session, settings]
  );

  const handleGenerateQuiz = useCallback(async () => {
    if (!session || !settings) return;
    setGeneratingTabs((prev) => new Set(prev).add("quizHistory"));
    setError(null);
    try {
      const apiKey =
        settings.selectedProvider === "openai"
          ? settings.openaiApiKey
          : settings.geminiApiKey;
      const model =
        settings.selectedModel ||
        getDefaultModelForProvider(settings.selectedProvider);

      const qCount = quizQuestionCount ?? settings.questionCount;

      const questions = await generateQuiz(
        settings.selectedProvider,
        apiKey,
        session.transcript,
        qCount,
        model
      );

      const nextVersion = (session.quizResults.length > 0
        ? Math.max(...session.quizResults.map((r) => r.quiz.version || 1)) + 1
        : (session.latestQuiz?.version || 0) + 1);

      const quiz: Quiz = {
        videoTitle: session.videoTitle,
        videoUrl: session.videoUrl,
        questions,
        version: nextVersion,
        createdAt: new Date().toISOString(),
      };

      setSession((prev) => {
        if (!prev) return prev;
        const updated: VideoSession = { ...prev, latestQuiz: quiz };
        saveVideoSession(updated);
        return updated;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate quiz"
      );
    } finally {
      setGeneratingTabs((prev) => {
        const next = new Set(prev);
        next.delete("quizHistory");
        return next;
      });
    }
  }, [session, settings]);

  const handleSendChat = useCallback(async () => {
    if (!session || !settings || !chatInput.trim()) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);
    setError(null);

    // Create a new chat session if none active
    let currentChatId = activeChatId;
    if (!currentChatId) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        videoSessionId: sessionId!,
        title: userMsg.content.slice(0, 60),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentChatId = newSession.id;
      setActiveChatId(currentChatId);
      setChatSessions((prev) => [newSession, ...prev]);
    }

    try {
      const apiKey =
        settings.selectedProvider === "openai"
          ? settings.openaiApiKey
          : settings.geminiApiKey;
      const model =
        settings.selectedModel ||
        getDefaultModelForProvider(settings.selectedProvider);

      // Add a placeholder assistant message for streaming
      const placeholderMsg: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, placeholderMsg]);

      const abort = new AbortController();
      chatAbortRef.current = abort;

      const finalContent = await streamChatWithVideo(
        settings.selectedProvider,
        apiKey,
        session.transcript,
        updatedMessages,
        model,
        (accumulated) => {
          // Update the last (assistant) message with accumulated content
          setChatMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: accumulated };
            return copy;
          });
        },
        abort.signal
      );

      // Finalize the message with complete content
      const finalMsg: ChatMessage = {
        role: "assistant",
        content: finalContent,
        timestamp: new Date().toISOString(),
      };
      const allMessages = [...updatedMessages, finalMsg];
      setChatMessages(allMessages);

      // Persist the chat session
      const chatSession: ChatSession = {
        id: currentChatId,
        videoSessionId: sessionId!,
        title: chatSessions.find((s) => s.id === currentChatId)?.title || updatedMessages[0]?.content.slice(0, 60) || "Chat",
        messages: allMessages,
        createdAt: chatSessions.find((s) => s.id === currentChatId)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveChatSession(chatSession);
      setChatSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === currentChatId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = chatSession;
          return copy;
        }
        return [chatSession, ...prev];
      });
    } catch (err) {
      // Remove the placeholder assistant message on error
      setChatMessages(updatedMessages);
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setChatLoading(false);
      chatAbortRef.current = null;
    }
  }, [session, settings, chatInput, chatMessages, activeChatId, chatSessions, sessionId]);

  const handleNewChat = useCallback(() => {
    if (chatAbortRef.current) chatAbortRef.current.abort();
    setChatMessages([]);
    setActiveChatId(null);
    setChatInput("");
    setChatLoading(false);
  }, []);

  const handleSwitchChat = useCallback((chatSession: ChatSession) => {
    if (chatAbortRef.current) chatAbortRef.current.abort();
    setActiveChatId(chatSession.id);
    setChatMessages(chatSession.messages);
    setChatInput("");
    setChatLoading(false);
  }, []);

  const handleDeleteChat = useCallback(async (id: string) => {
    await deleteChatSession(id);
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeChatId === id) {
      setChatMessages([]);
      setActiveChatId(null);
    }
  }, [activeChatId]);

  /* ---- Video Notes CRUD ---- */
  const handleSaveNote = useCallback(async (note: Note) => {
    const allNotes = await getNotes();
    const idx = allNotes.findIndex((n) => n.id === note.id);
    const saved = { ...note, updatedAt: new Date().toISOString(), videoSessionId: sessionId };
    if (idx >= 0) {
      allNotes[idx] = saved;
    } else {
      allNotes.unshift(saved);
    }
    await saveNotes(allNotes);
    setVideoNotes(allNotes.filter((n) => n.videoSessionId === sessionId));
    setEditingNote(null);
  }, [sessionId]);

  const handleDeleteNote = useCallback(async (id: string) => {
    const allNotes = await getNotes();
    const filtered = allNotes.filter((n) => n.id !== id);
    await saveNotes(filtered);
    setVideoNotes(filtered.filter((n) => n.videoSessionId === sessionId));
  }, [sessionId]);

  const handleStartQuiz = useCallback(() => {
    if (!session?.latestQuiz) return;
    navigate("/quiz", {
      state: { quiz: session.latestQuiz, sessionId: session.id },
    });
  }, [session, navigate]);

  if (loading) {
    return (
      <div className="page study-page">
        <div className="loading-indicator">
          <div className="loading-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page study-page">
        <div className="empty-state">
          <h2>Session Not Found</h2>
          <p>This video session doesn't exist or was deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const materials = session.studyMaterials || {};

  const hasContent = (tab: Tab): boolean => {
    if (tab === "quizHistory") return session.quizResults.length > 0 || !!session.latestQuiz;
    if (tab === "transcription") return !!session.transcript;
    if (tab === "chat") return chatMessages.length > 0 || chatSessions.length > 0;
    if (tab === "notes") return videoNotes.length > 0;
    return !!materials[tab];
  };

  return (
    <div className="page study-page">
      {/* Header */}
      <div className="study-header">
        <button className="btn-back" onClick={() => navigate("/history")}>
          <ChevronLeft size={20} />
        </button>
        <div className="study-video-info">
          <div>
            <h1 className="study-title">{session.videoTitle}</h1>
            <p className="study-date">
              Added {new Date(session.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* YouTube Embed */}
      <div className="video-embed-container">
        <iframe
            src={`https://www.youtube.com/embed/${session.videoId}`}
            title={session.videoTitle}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="video-embed"
          />
      </div>

      {/* Tabs */}
      <div className="study-tabs">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            className={`study-tab ${activeTab === tab.key ? "active" : ""} ${
              hasContent(tab.key) ? "has-content" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {generatingTabs.has(tab.key) ? (
              <Loader2 size={14} className="spin" />
            ) : (
              tab.icon
            )}
            <span>{tab.label}</span>
            {hasContent(tab.key) && <span className="tab-dot" />}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <p>{error}</p>
        </div>
      )}

      {/* Tab Content */}
      <div className="study-content">
        {activeTab === "chat" ? (
          <VideoChatTab
            messages={chatMessages}
            input={chatInput}
            loading={chatLoading}
            onInputChange={setChatInput}
            onSend={handleSendChat}
            chatSessions={chatSessions}
            activeChatId={activeChatId}
            showHistory={showChatHistory}
            onToggleHistory={() => setShowChatHistory((v) => !v)}
            onNewChat={handleNewChat}
            onSwitchChat={handleSwitchChat}
            onDeleteChat={handleDeleteChat}
          />
        ) : activeTab === "notes" ? (
          <VideoNotesTab
            notes={videoNotes}
            editing={editingNote}
            onEdit={setEditingNote}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            sessionId={sessionId!}
          />
        ) : activeTab === "quizHistory" ? (
          <QuizHistoryTab
            session={session}
            navigate={navigate}
            onGenerateQuiz={handleGenerateQuiz}
            onStartQuiz={handleStartQuiz}
            isGenerating={generatingTabs.has("quizHistory")}
            questionCount={quizQuestionCount ?? settings?.questionCount ?? 10}
            onQuestionCountChange={setQuizQuestionCount}
          />
        ) : activeTab === "transcription" ? (
          <div className="study-material-content">
            <div className="material-header">
              <h3 className="material-title">
                <ScrollText size={16} />
                Transcription
              </h3>
              <CopyButton text={session.transcript} />
            </div>
            <div className="transcription-body">
              {session.transcript}
            </div>
          </div>
        ) : generatingTabs.has(activeTab) ? (
          <div className="generate-prompt">
            <Loader2 size={32} className="spin generate-icon-svg" />
            <h3>Generating {TAB_CONFIG.find((t) => t.key === activeTab)?.label}...</h3>
            <p>AI is analyzing the video transcript. This may take a moment.</p>
          </div>
        ) : hasContent(activeTab) ? (
          <div className="study-material-content">
            <div className="material-header">
              <h3 className="material-title">
                {TAB_CONFIG.find((t) => t.key === activeTab)?.icon}
                {TAB_CONFIG.find((t) => t.key === activeTab)?.label}
              </h3>
              <div className="material-header-actions">
                {(activeTab === "summary" || activeTab === "studyGuide") && (
                  <CopyButton
                    text={
                      activeTab === "summary"
                        ? materials.summary || ""
                        : materials.studyGuide || ""
                    }
                  />
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleGenerate(activeTab)}
                  disabled={generatingTabs.has(activeTab)}
                >
                  <RotateCcw size={14} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
            {activeTab === "summary" && (
              <MarkdownContent content={materials.summary || ""} />
            )}
            {activeTab === "studyGuide" && (
              <MarkdownContent content={materials.studyGuide || ""} />
            )}
            {activeTab === "mindMap" && materials.mindMap && (
              <MarkmapDiagram node={materials.mindMap} onFullscreen={() => setShowFullscreenMap(true)} />
            )}
            {activeTab === "flashcards" && materials.flashcards && (
              <FlashcardsView cards={materials.flashcards} />
            )}
          </div>
        ) : (
          <div className="generate-prompt">
            <div className="generate-icon">
              {TAB_CONFIG.find((t) => t.key === activeTab)?.icon}
            </div>
            <h3>
              Generate{" "}
              {TAB_CONFIG.find((t) => t.key === activeTab)?.label}
            </h3>
            <p>
              AI will analyze the video transcript and create this study
              material for you.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => handleGenerate(activeTab as StudyMaterialType)}
              disabled={generatingTabs.has(activeTab)}
            >
              Generate Now
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Mind Map Modal */}
      {showFullscreenMap && materials.mindMap && (
        <MindmapModal
          node={materials.mindMap}
          onClose={() => setShowFullscreenMap(false)}
        />
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function MarkdownContent({ content }: { content: string }) {
  const html = marked.parse(content, { async: false, gfm: true, breaks: true }) as string;

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      className={`btn btn-secondary btn-sm copy-btn ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

/* ---- Markmap Diagram ---- */

function mindMapToMarkdown(node: MindMapNode, depth: number = 1): string {
  if (depth <= 6) {
    let md = `${"#".repeat(depth)} ${node.label}\n\n`;
    if (node.children) {
      for (const child of node.children) {
        md += mindMapToMarkdown(child, depth + 1);
      }
    }
    return md;
  }
  const indent = "  ".repeat(depth - 7);
  let md = `${indent}- ${node.label}\n`;
  if (node.children) {
    for (const child of node.children) {
      md += mindMapToMarkdown(child, depth + 1);
    }
  }
  return md;
}

async function renderMarkmapToSvg(
  svgEl: SVGSVGElement,
  node: MindMapNode
): Promise<any> {
  const { Transformer } = await import("markmap-lib");
  const { Markmap } = await import("markmap-view");
  const transformer = new Transformer();
  const markdown = mindMapToMarkdown(node);
  const { root } = transformer.transform(markdown);
  svgEl.innerHTML = "";
  return Markmap.create(
    svgEl,
    { autoFit: true, duration: 500, zoom: true, pan: true },
    root
  );
}

function MarkmapDiagram({
  node,
  onFullscreen,
}: {
  node: MindMapNode;
  onFullscreen: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    let cancelled = false;

    renderMarkmapToSvg(svgRef.current, node)
      .then((mm) => {
        if (cancelled) {
          mm?.destroy?.();
          return;
        }
        mmRef.current = mm;
      })
      .catch((err) => console.error("Failed to load markmap:", err));

    return () => {
      cancelled = true;
      if (mmRef.current?.destroy) mmRef.current.destroy();
    };
  }, [node]);

  return (
    <div className="markmap-diagram-container">
      <div className="markmap-toolbar">
        <button
          className="markmap-btn"
          onClick={onFullscreen}
          title="Fullscreen"
        >
          <Maximize2 size={14} />
        </button>
      </div>
      <svg ref={svgRef} className="markmap-svg" />
    </div>
  );
}

function MindmapModal({
  node,
  onClose,
}: {
  node: MindMapNode;
  onClose: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    let cancelled = false;

    renderMarkmapToSvg(svgRef.current, node)
      .then((mm) => {
        if (cancelled) {
          mm?.destroy?.();
          return;
        }
        mmRef.current = mm;
      })
      .catch((err) => console.error("Failed to load markmap:", err));

    return () => {
      cancelled = true;
      if (mmRef.current?.destroy) mmRef.current.destroy();
    };
  }, [node]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="mindmap-modal-overlay" onClick={onClose}>
      <div className="mindmap-modal" onClick={(e) => e.stopPropagation()}>
        <button className="mindmap-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <svg ref={svgRef} className="mindmap-modal-svg" />
      </div>
    </div>
  );
}

function FlashcardsView({ cards }: { cards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[currentIndex];
  if (!card) return null;

  const handlePrev = () => {
    setFlipped(false);
    setCurrentIndex((i) => (i > 0 ? i - 1 : cards.length - 1));
  };

  const handleNext = () => {
    setFlipped(false);
    setCurrentIndex((i) => (i < cards.length - 1 ? i + 1 : 0));
  };

  return (
    <div className="flashcards-container">
      <div className="flashcard-counter">
        Card {currentIndex + 1} of {cards.length}
      </div>
      <div
        className={`flashcard ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped(!flipped)}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <div className="flashcard-side-label">Question</div>
            <p>{card.front}</p>
            <div className="flashcard-flip-hint">
              <FlipVertical size={14} />
              Click to flip
            </div>
          </div>
          <div className="flashcard-back">
            <div className="flashcard-side-label">Answer</div>
            <p>{card.back}</p>
            <div className="flashcard-flip-hint">
              <FlipVertical size={14} />
              Click to flip
            </div>
          </div>
        </div>
      </div>
      <div className="flashcard-nav">
        <button className="btn btn-secondary btn-sm" onClick={handlePrev}>
          <ChevronLeft size={16} />
          Previous
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleNext}>
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function QuizHistoryTab({
  session,
  navigate,
  onGenerateQuiz,
  onStartQuiz,
  isGenerating,
  questionCount,
  onQuestionCountChange,
}: {
  session: VideoSession;
  navigate: ReturnType<typeof useNavigate>;
  onGenerateQuiz: () => void;
  onStartQuiz: () => void;
  isGenerating: boolean;
  questionCount: number;
  onQuestionCountChange: (count: number) => void;
}) {
  const hasQuiz = !!session.latestQuiz;
  const hasHistory = session.quizResults.length > 0;

  return (
    <div className="quiz-history-content">
      {/* Quiz Action Card */}
      <div className="quiz-action-card">
        {hasQuiz ? (
          <>
            <div className="quiz-action-ready">
              <Play size={24} className="quiz-action-icon" />
              <div>
                <h3>Quiz Ready</h3>
                <p>
                  {session.latestQuiz!.questions.length} questions
                  {session.latestQuiz!.version ? ` · Version ${session.latestQuiz!.version}` : ""}
                </p>
              </div>
            </div>
            <div className="quiz-action-buttons">
              <button className="btn btn-primary" onClick={onStartQuiz}>
                <Play size={16} />
                Start Quiz
              </button>
              <div className="quiz-question-count-inline">
                <select
                  className="select-sm"
                  value={questionCount}
                  onChange={(e) => onQuestionCountChange(Number(e.target.value))}
                  disabled={isGenerating}
                >
                  {[5, 10, 15, 20, 25, 30].map((n) => (
                    <option key={n} value={n}>{n} Qs</option>
                  ))}
                </select>
                <button
                  className="btn btn-secondary"
                  onClick={onGenerateQuiz}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <><Loader2 size={16} className="spin" /> Generating...</>
                  ) : (
                    <><Plus size={16} /> New Quiz</>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="generate-prompt compact">
            <Trophy size={28} className="generate-icon-svg" />
            <h3>Generate a Quiz</h3>
            <p>Test your understanding of this video with AI-generated questions.</p>
            <div className="quiz-question-count-inline" style={{ justifyContent: "center" }}>
              <select
                className="select-sm"
                value={questionCount}
                onChange={(e) => onQuestionCountChange(Number(e.target.value))}
                disabled={isGenerating}
              >
                {[5, 10, 15, 20, 25, 30].map((n) => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={onGenerateQuiz}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <><Loader2 size={16} className="spin" /> Generating...</>
                ) : (
                  <><Plus size={16} /> Generate Quiz</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quiz History */}
      {hasHistory && (
        <div className="quiz-history-section">
          <h3 className="quiz-history-heading">
            Past Attempts ({session.quizResults.length})
          </h3>
          <div className="quiz-history-list">
            {session.quizResults
              .slice()
              .reverse()
              .map((result, i) => {
                const pct = Math.round(
                  (result.score / result.totalQuestions) * 100
                );
                const color =
                  pct >= 70
                    ? "var(--color-success)"
                    : pct >= 50
                      ? "var(--color-warning)"
                      : "var(--color-error)";
                const version = result.quiz.version || (session.quizResults.length - i);
                return (
                  <div key={i} className="quiz-history-item">
                    <div className="quiz-history-score" style={{ color }}>
                      {pct}%
                    </div>
                    <div className="quiz-history-info">
                      <div className="quiz-history-detail">
                        {result.score}/{result.totalQuestions} correct
                        <span className="quiz-version-badge">v{version}</span>
                      </div>
                      <div className="quiz-history-date">
                        {new Date(result.completedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        navigate("/quiz", {
                          state: { quiz: result.quiz, sessionId: session.id },
                        })
                      }
                    >
                      <RotateCcw size={14} />
                      Retry
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Video Chat Tab ---- */

function VideoChatTab({
  messages,
  input,
  loading,
  onInputChange,
  onSend,
  chatSessions,
  activeChatId,
  showHistory,
  onToggleHistory,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
}: {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  chatSessions: ChatSession[];
  activeChatId: string | null;
  showHistory: boolean;
  onToggleHistory: () => void;
  onNewChat: () => void;
  onSwitchChat: (s: ChatSession) => void;
  onDeleteChat: (id: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="chat-container">
      {/* Chat Header */}
      <div className="chat-header">
        <button
          className="btn btn-ghost btn-sm chat-history-toggle"
          onClick={onToggleHistory}
          title={showHistory ? "Hide history" : "Show history"}
        >
          {showHistory ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          <span>History</span>
          {chatSessions.length > 0 && (
            <span className="chat-history-count">{chatSessions.length}</span>
          )}
        </button>
        <button className="btn btn-primary btn-sm" onClick={onNewChat}>
          <Plus size={14} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="chat-body">
        {/* Chat History Sidebar */}
        {showHistory && (
          <div className="chat-history-sidebar">
            <div className="chat-history-list">
              {chatSessions.length === 0 ? (
                <div className="chat-history-empty">
                  <History size={20} />
                  <span>No conversations yet</span>
                </div>
              ) : (
                chatSessions.map((cs) => (
                  <div
                    key={cs.id}
                    className={`chat-history-item ${cs.id === activeChatId ? "active" : ""}`}
                    onClick={() => onSwitchChat(cs)}
                  >
                    <div className="chat-history-item-content">
                      <span className="chat-history-item-title">{cs.title}</span>
                      <span className="chat-history-item-meta">
                        {cs.messages.length} message{cs.messages.length !== 1 ? "s" : ""} · {new Date(cs.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="chat-history-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(cs.id);
                      }}
                      title="Delete chat"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="chat-main">
          <div className="chat-messages">
            {messages.length === 0 && !loading && (
              <div className="chat-empty">
                <MessageSquare size={32} />
                <h3>Ask about this video</h3>
                <p>
                  Chat with AI about the video content. Ask questions, request summaries of specific parts, or explore topics in depth.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                <div className="chat-message-label">
                  <span className={`chat-dot ${msg.role}`} />
                  <span className="chat-role-text">{msg.role === "user" ? "YOU" : "AI"}</span>
                </div>
                <div className="chat-message-body">
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <MarkdownContent content={msg.content} />
                    ) : (
                      <div className="chat-typing">
                        <span /><span /><span />
                      </div>
                    )
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-bar">
            <input
              type="text"
              placeholder="Ask a question about the video..."
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
              disabled={loading}
            />
            <button
              className="btn btn-primary chat-send-btn"
              onClick={onSend}
              disabled={loading || !input.trim()}
            >
              {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Video Notes Tab ---- */

function VideoNotesTab({
  notes,
  editing,
  onEdit,
  onSave,
  onDelete,
  sessionId,
}: {
  notes: Note[];
  editing: Note | null;
  onEdit: (n: Note | null) => void;
  onSave: (n: Note) => void;
  onDelete: (id: string) => void;
  sessionId: string;
}) {
  const handleNew = () => {
    const now = new Date().toISOString();
    onEdit({
      id: crypto.randomUUID(),
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
      videoSessionId: sessionId,
    });
  };

  return (
    <div className="video-notes-tab">
      <div className="material-header">
        <h3 className="material-title">
          <StickyNote size={16} />
          Notes for this video
        </h3>
        <button className="btn btn-primary btn-sm" onClick={handleNew}>
          <Plus size={14} />
          <span>Add Note</span>
        </button>
      </div>

      {notes.length === 0 && !editing ? (
        <div className="generate-prompt">
          <StickyNote size={32} className="generate-icon-svg" />
          <h3>No Notes Yet</h3>
          <p>Add notes specific to this video to capture key insights.</p>
          <button className="btn btn-primary" onClick={handleNew}>
            <Plus size={16} /> Add Note
          </button>
        </div>
      ) : (
        <div className="video-notes-list">
          {notes.map((note) => (
            <div key={note.id} className="video-note-item" onClick={() => onEdit(note)}>
              <div className="video-note-header">
                <span className="video-note-title">{note.title || "Untitled"}</span>
                <div className="video-note-actions">
                  <span className="video-note-date">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    className="video-note-delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="video-note-preview">{note.content || "No content"}</div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <InlineNoteEditor note={editing} onSave={onSave} onClose={() => onEdit(null)} />
      )}
    </div>
  );
}

function InlineNoteEditor({
  note,
  onSave,
  onClose,
}: {
  note: Note;
  onSave: (n: Note) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  return (
    <div className="note-editor-overlay" onClick={onClose}>
      <div className="note-editor" onClick={(e) => e.stopPropagation()}>
        <div className="note-editor-header">
          <h3>{note.createdAt === note.updatedAt ? "New Note" : "Edit Note"}</h3>
          <button className="note-editor-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="note-editor-body">
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            placeholder="Write your notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="note-editor-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ ...note, title: title.trim() || "Untitled", content })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
