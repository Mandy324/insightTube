import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { getVideoSessionById, saveVideoSession, getSettings } from "../services/storage";
import { generateStudyMaterial, getDefaultModelForProvider } from "../services/ai";
import { VideoSession, StudyMaterialType, MindMapNode, Flashcard, AppSettings } from "../types";

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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([getVideoSessionById(sessionId), getSettings()]).then(
      ([s, st]) => {
        setSession(s);
        setSettings(st);
        setLoading(false);
      }
    );
  }, [sessionId]);

  const handleGenerate = useCallback(
    async (type: StudyMaterialType) => {
      if (!session || !settings) return;
      setGenerating(true);
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
        setGenerating(false);
      }
    },
    [session, settings]
  );

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
    if (tab === "quizHistory") return session.quizResults.length > 0;
    return !!materials[tab];
  };

  return (
    <div className="page study-page">
      {/* Header */}
      <div className="study-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="study-video-info">
          <img
            src={session.thumbnailUrl}
            alt={session.videoTitle}
            className="study-thumb"
          />
          <div>
            <h1 className="study-title">{session.videoTitle}</h1>
            <p className="study-date">
              Added {new Date(session.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
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
            {tab.icon}
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
          <QuizHistoryTab session={session} navigate={navigate} />
        ) : hasContent(activeTab) ? (
          <div className="study-material-content">
            <div className="material-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleGenerate(activeTab)}
                disabled={generating}
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
              <MindMapView node={materials.mindMap} />
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
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate Now</span>
                </>
              )}
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

function MindMapView({ node }: { node: MindMapNode }) {
  return (
    <div className="mindmap-container">
      <MindMapNodeView node={node} depth={0} />
    </div>
  );
}

function MindMapNodeView({
  node,
  depth,
}: {
  node: MindMapNode;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const depthClass = `depth-${Math.min(depth, 4)}`;

  return (
    <div className={`mindmap-node ${depthClass}`}>
      <button
        className={`mindmap-label ${hasChildren ? "expandable" : ""} ${
          expanded ? "expanded" : ""
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <ChevronRight
            size={14}
            className={`mindmap-arrow ${expanded ? "rotated" : ""}`}
          />
        )}
        <span>{node.label}</span>
      </button>
      {expanded && hasChildren && (
        <div className="mindmap-children">
          {node.children!.map((child, i) => (
            <MindMapNodeView key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
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
}: {
  session: VideoSession;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (session.quizResults.length === 0) {
    return (
      <div className="generate-prompt">
        <Trophy size={32} className="generate-icon-svg" />
        <h3>No Quizzes Yet</h3>
        <p>Generate a quiz from the home page to see your results here.</p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          Generate Quiz
        </button>
      </div>
    );
  }

  return (
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
  );
}
