import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Network,
  Layers,
  BookOpen,
  Map,
  Loader2,
  ChevronLeft,
  RotateCcw,
  Trophy,
  FlipVertical,
  ChevronRight,
  Play,
  Plus,
  Maximize2,
} from "lucide-react";
import { getVideoSessionById, saveVideoSession, getSettings } from "../services/storage";
import { generateStudyMaterial, generateQuiz, getDefaultModelForProvider } from "../services/ai";
import { VideoSession, StudyMaterialType, MindMapNode, Flashcard, AppSettings, Quiz } from "../types";

type Tab = StudyMaterialType | "quizHistory";

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "summary", label: "Summary", icon: <FileText size={16} /> },
  { key: "mindMap", label: "Mind Map", icon: <Network size={16} /> },
  { key: "flashcards", label: "Flashcards", icon: <Layers size={16} /> },
  { key: "studyGuide", label: "Study Guide", icon: <BookOpen size={16} /> },
  { key: "roadmap", label: "Roadmap", icon: <Map size={16} /> },
  { key: "quizHistory", label: "Quiz History", icon: <Trophy size={16} /> },
];

export default function StudyPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<VideoSession | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [generatingTab, setGeneratingTab] = useState<Tab | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([getVideoSessionById(sessionId), getSettings()]).then(
      ([s, st]) => {
        setSession(s);
        setSettings(st);
        // Default to quiz tab when a quiz is ready
        if (s?.latestQuiz) {
          setActiveTab("quizHistory");
        }
        setLoading(false);
      }
    );
  }, [sessionId]);

  const handleGenerate = useCallback(
    async (type: StudyMaterialType) => {
      if (!session || !settings) return;
      setGeneratingTab(type);
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

        const updated: VideoSession = {
          ...session,
          studyMaterials: { ...session.studyMaterials, ...result },
        };
        setSession(updated);
        await saveVideoSession(updated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate content"
        );
      } finally {
        setGeneratingTab(null);
      }
    },
    [session, settings]
  );

  const handleGenerateQuiz = useCallback(async () => {
    if (!session || !settings) return;
    setGeneratingTab("quizHistory");
    setError(null);
    try {
      const apiKey =
        settings.selectedProvider === "openai"
          ? settings.openaiApiKey
          : settings.geminiApiKey;
      const model =
        settings.selectedModel ||
        getDefaultModelForProvider(settings.selectedProvider);

      const questions = await generateQuiz(
        settings.selectedProvider,
        apiKey,
        session.transcript,
        settings.questionCount,
        model
      );

      const quiz: Quiz = {
        videoTitle: session.videoTitle,
        videoUrl: session.videoUrl,
        questions,
      };

      const updated: VideoSession = { ...session, latestQuiz: quiz };
      setSession(updated);
      await saveVideoSession(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate quiz"
      );
    } finally {
      setGeneratingTab(null);
    }
  }, [session, settings]);

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
  const isGenerating = generatingTab !== null;

  const hasContent = (tab: Tab): boolean => {
    if (tab === "quizHistory") return session.quizResults.length > 0 || !!session.latestQuiz;
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
          <div className="study-thumb-wrapper" onClick={() => setShowVideo(!showVideo)}>
            <img
              src={session.thumbnailUrl}
              alt={session.videoTitle}
              className="study-thumb"
            />
            <div className="study-thumb-play">
              <Play size={16} />
            </div>
          </div>
          <div>
            <h1 className="study-title">{session.videoTitle}</h1>
            <p className="study-date">
              Added {new Date(session.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* YouTube Embed */}
      {showVideo && (
        <div className="video-embed-container">
          <iframe
            src={`https://www.youtube.com/embed/${session.videoId}?autoplay=1`}
            title={session.videoTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="video-embed"
          />
        </div>
      )}

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
            {generatingTab === tab.key ? (
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
        {activeTab === "quizHistory" ? (
          <QuizHistoryTab
            session={session}
            navigate={navigate}
            onGenerateQuiz={handleGenerateQuiz}
            onStartQuiz={handleStartQuiz}
            isGenerating={generatingTab === "quizHistory"}
          />
        ) : generatingTab === activeTab ? (
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
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleGenerate(activeTab)}
                disabled={isGenerating}
              >
                <RotateCcw size={14} />
                <span>Regenerate</span>
              </button>
            </div>
            {activeTab === "summary" && (
              <MarkdownContent content={materials.summary || ""} />
            )}
            {activeTab === "studyGuide" && (
              <MarkdownContent content={materials.studyGuide || ""} />
            )}
            {activeTab === "roadmap" && (
              <MarkdownContent content={materials.roadmap || ""} />
            )}
            {activeTab === "mindMap" && materials.mindMap && (
              <MarkmapDiagram node={materials.mindMap} />
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
              disabled={isGenerating}
            >
              Generate Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-to-HTML renderer for headings, bold, bullets, numbered lists
  const html = content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      return `<ul>${match}</ul>`;
    })
    .replace(/\n{2,}/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ---- Markmap Diagram ---- */

interface IMarkmapNode {
  content: string;
  children: IMarkmapNode[];
}

function convertToMarkmapNode(node: MindMapNode): IMarkmapNode {
  return {
    content: node.label,
    children: node.children?.map(convertToMarkmapNode) ?? [],
  };
}

function MarkmapDiagram({ node }: { node: MindMapNode }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { Markmap } = await import("markmap-view");
        if (cancelled || !svgRef.current) return;

        svgRef.current.innerHTML = "";

        const data = convertToMarkmapNode(node);
        mmRef.current = Markmap.create(svgRef.current, {
          autoFit: true,
          duration: 500,
          zoom: true,
          pan: true,
        }, data as any);
      } catch (err) {
        console.error("Failed to load markmap:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (mmRef.current?.destroy) mmRef.current.destroy();
    };
  }, [node]);

  const handleFit = () => {
    if (mmRef.current?.fit) mmRef.current.fit();
  };

  return (
    <div className="markmap-diagram-container">
      <div className="markmap-toolbar">
        <button className="markmap-btn" onClick={handleFit} title="Fit to View">
          <Maximize2 size={14} />
        </button>
      </div>
      <svg ref={svgRef} className="markmap-svg" />
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
}: {
  session: VideoSession;
  navigate: ReturnType<typeof useNavigate>;
  onGenerateQuiz: () => void;
  onStartQuiz: () => void;
  isGenerating: boolean;
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
                <p>{session.latestQuiz!.questions.length} questions generated</p>
              </div>
            </div>
            <div className="quiz-action-buttons">
              <button className="btn btn-primary" onClick={onStartQuiz}>
                <Play size={16} />
                Start Quiz
              </button>
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
          </>
        ) : (
          <div className="generate-prompt compact">
            <Trophy size={28} className="generate-icon-svg" />
            <h3>Generate a Quiz</h3>
            <p>Test your understanding of this video with AI-generated questions.</p>
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
                return (
                  <div key={i} className="quiz-history-item">
                    <div className="quiz-history-score" style={{ color }}>
                      {pct}%
                    </div>
                    <div className="quiz-history-info">
                      <div className="quiz-history-detail">
                        {result.score}/{result.totalQuestions} correct
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
