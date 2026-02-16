import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Trash2, Play, BookOpen, Search } from "lucide-react";
import { getVideoSessions, deleteVideoSession } from "../services/storage";
import { VideoSession } from "../types";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getVideoSessions().then((s) => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteVideoSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const filtered = filter
    ? sessions.filter(
        (s) =>
          s.videoTitle.toLowerCase().includes(filter.toLowerCase()) ||
          s.videoId.toLowerCase().includes(filter.toLowerCase())
      )
    : sessions;

  if (loading) {
    return (
      <div className="page history-page">
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

  return (
    <div className="page history-page">
      <div className="page-header">
        <h1>History</h1>
        <p className="page-subtitle">
          All your studied videos, organized chronologically.
        </p>
      </div>

      {sessions.length > 0 && (
        <div className="history-search">
          <div className="input-wrapper">
            <Search size={18} className="input-icon" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search videos..."
              className="url-input"
            />
          </div>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="history-list">
          {filtered.map((session) => {
            const totalQuizzes = session.quizResults.length;
            const avgScore =
              totalQuizzes > 0
                ? Math.round(
                    session.quizResults.reduce(
                      (a, r) =>
                        a +
                        (r.totalQuestions > 0
                          ? (r.score / r.totalQuestions) * 100
                          : 0),
                      0
                    ) / totalQuizzes
                  )
                : null;
            const hasStudy =
              session.studyMaterials &&
              Object.keys(session.studyMaterials).length > 0;

            return (
              <div
                key={session.id}
                className="history-card"
                onClick={() => navigate(`/study/${session.id}`)}
              >
                <div className="history-thumb">
                  <img
                    src={session.thumbnailUrl}
                    alt={session.videoTitle}
                  />
                  <div className="history-thumb-overlay">
                    <Play size={24} />
                  </div>
                </div>
                <div className="history-content">
                  <div className="history-title">{session.videoTitle}</div>
                  <div className="history-meta">
                    <span className="history-date">
                      <Clock size={12} />
                      {new Date(session.createdAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </span>
                    {totalQuizzes > 0 && (
                      <span className="history-quizzes">
                        <BookOpen size={12} />
                        {totalQuizzes} quiz{totalQuizzes !== 1 ? "zes" : ""}
                      </span>
                    )}
                    {avgScore !== null && (
                      <span
                        className={`history-score ${
                          avgScore >= 70 ? "good" : avgScore >= 50 ? "ok" : "low"
                        }`}
                      >
                        Avg: {avgScore}%
                      </span>
                    )}
                    {hasStudy && (
                      <span className="history-study-badge">Study Materials</span>
                    )}
                  </div>
                </div>
                <div className="history-actions">
                  <button
                    className="btn-icon danger"
                    onClick={(e) => handleDelete(e, session.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : sessions.length > 0 ? (
        <div className="empty-state">
          <h2>No Matches</h2>
          <p>No videos match your search.</p>
        </div>
      ) : (
        <div className="empty-state">
          <h2>No History Yet</h2>
          <p>Videos you study will appear here.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}
