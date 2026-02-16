import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Trophy,
  Target,
  Flame,
  BookOpen,
  Play,
  TrendingUp,
} from "lucide-react";
import { getDashboardStats, DashboardStats } from "../services/storage";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return (
      <div className="page dashboard-page">
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

  const hasData = stats.totalQuizzes > 0;

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Track your learning progress and achievements.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon videos">
            <Play size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalVideos}</div>
            <div className="stat-label">Videos Studied</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon quizzes">
            <BookOpen size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalQuizzes}</div>
            <div className="stat-label">Quizzes Taken</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon score">
            <Target size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.averageScore}%</div>
            <div className="stat-label">Average Score</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon streak">
            <Flame size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.currentStreak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>
      </div>

      {hasData ? (
        <>
          {/* Performance Overview */}
          <div className="dashboard-section">
            <div className="section-header">
              <TrendingUp size={20} />
              <h2>Performance Overview</h2>
            </div>
            <div className="performance-cards">
              <div className="perf-card">
                <div className="perf-ring-container">
                  <svg className="perf-ring" viewBox="0 0 100 100">
                    <circle
                      className="perf-ring-bg"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="8"
                    />
                    <circle
                      className="perf-ring-fill"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="8"
                      strokeDasharray={`${stats.averageScore * 2.51} ${251 - stats.averageScore * 2.51}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="perf-ring-value">{stats.averageScore}%</div>
                </div>
                <div className="perf-label">Average Score</div>
              </div>
              <div className="perf-card">
                <div className="perf-ring-container">
                  <svg className="perf-ring best" viewBox="0 0 100 100">
                    <circle
                      className="perf-ring-bg"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="8"
                    />
                    <circle
                      className="perf-ring-fill best"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="8"
                      strokeDasharray={`${stats.bestScore * 2.51} ${251 - stats.bestScore * 2.51}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="perf-ring-value">{stats.bestScore}%</div>
                </div>
                <div className="perf-label">Best Score</div>
              </div>
              <div className="perf-card">
                <div className="perf-big-stat">
                  <Trophy size={32} className="perf-trophy" />
                  <div className="perf-big-value">{stats.totalQuestions}</div>
                </div>
                <div className="perf-label">Questions Answered</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-section">
            <div className="section-header">
              <BarChart3 size={20} />
              <h2>Recent Videos</h2>
            </div>
            <div className="recent-sessions">
              {stats.recentSessions.map((session) => {
                const lastResult =
                  session.quizResults.length > 0
                    ? session.quizResults[session.quizResults.length - 1]
                    : null;
                const pct = lastResult
                  ? Math.round(
                      (lastResult.score / lastResult.totalQuestions) * 100
                    )
                  : null;
                return (
                  <div
                    key={session.id}
                    className="recent-session-card"
                    onClick={() => navigate(`/study/${session.id}`)}
                  >
                    <div className="session-thumb">
                      <img
                        src={session.thumbnailUrl}
                        alt={session.videoTitle}
                      />
                    </div>
                    <div className="session-info">
                      <div className="session-title">{session.videoTitle}</div>
                      <div className="session-meta">
                        {session.quizResults.length} quiz
                        {session.quizResults.length !== 1 ? "zes" : ""} taken
                        {pct !== null && ` · Last score: ${pct}%`}
                      </div>
                    </div>
                    <div className="session-date">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
            {stats.totalVideos > 5 && (
              <button
                className="btn btn-secondary btn-view-all"
                onClick={() => navigate("/history")}
              >
                View All History
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h2>No Activity Yet</h2>
          <p>
            Start by generating a quiz from a YouTube video to see your progress
            here.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Generate Your First Quiz
          </button>
        </div>
      )}
    </div>
  );
}
