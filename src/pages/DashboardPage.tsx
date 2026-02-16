import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Trophy,
  Target,
  Flame,
  BookOpen,
  Play,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
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

      {/* Activity Calendar */}
      <div className="dashboard-section">
        <div className="section-header">
          <Flame size={20} />
          <h2>Activity</h2>
        </div>
        <ActivityCalendar activityDates={stats.activityDates} />
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

/* ---- Activity Calendar (LeetCode-style) ---- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getCalendarWeeks(year: number): { date: string; count: number; month: number }[][] {
  // Generate all days of the year grouped by week columns (Sun=0 start)
  const weeks: { date: string; count: number; month: number }[][] = [];
  const start = new Date(year, 0, 1);
  const startDay = start.getDay(); // 0=Sun

  // Pad the first week
  let week: { date: string; count: number; month: number }[] = [];
  for (let i = 0; i < startDay; i++) {
    week.push({ date: "", count: -1, month: -1 }); // empty cell
  }

  // Use local date math to avoid timezone shifts
  const cursor = new Date(year, 0, 1);
  while (cursor.getFullYear() === year) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const d = cursor.getDate();
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    week.push({ date: dateStr, count: 0, month: m });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (week.length > 0) {
    while (week.length < 7) {
      week.push({ date: "", count: -1, month: -1 });
    }
    weeks.push(week);
  }
  return weeks;
}

function ActivityCalendar({ activityDates }: { activityDates: Record<string, number> }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const weeks = useMemo(() => {
    const w = getCalendarWeeks(year);
    // Fill in activity counts
    for (const week of w) {
      for (const day of week) {
        if (day.date && activityDates[day.date]) {
          day.count = activityDates[day.date];
        }
      }
    }
    return w;
  }, [year, activityDates]);

  // Month labels: find first week index where a month starts
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    for (const day of week) {
      if (day.month >= 0 && day.month !== lastMonth) {
        monthLabels.push({ label: MONTHS[day.month], col: wi });
        lastMonth = day.month;
        break;
      }
    }
  });

  const totalActivities = Object.entries(activityDates)
    .filter(([d]) => d.startsWith(String(year)))
    .reduce((a, [, c]) => a + c, 0);

  const getLevel = (count: number) => {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  };

  return (
    <div className="activity-calendar">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={() => setYear(year - 1)}>
            <ChevronLeft size={14} />
          </button>
          <span className="cal-year">{year}</span>
          <button
            className="cal-nav-btn"
            onClick={() => setYear(year + 1)}
            disabled={year >= currentYear}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <span className="cal-summary">{totalActivities} activities in {year}</span>
      </div>
      <div className="calendar-grid-wrapper">
        <div className="calendar-day-labels">
          {DAYS.map((d, i) => (
            <div key={i} className="cal-day-label">{d}</div>
          ))}
        </div>
        <div className="calendar-scroll">
          <div className="calendar-month-labels" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="cal-month-label"
                style={{ gridColumnStart: m.col + 1 }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="calendar-grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
            {weeks.map((week, wi) =>
              week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`cal-cell level-${day.count < 0 ? "empty" : getLevel(day.count)}`}
                  style={{ gridColumn: wi + 1, gridRow: di + 1 }}
                  title={day.date ? `${day.date}: ${day.count} activit${day.count === 1 ? "y" : "ies"}` : ""}
                />
              ))
            )}
          </div>
        </div>
      </div>
      <div className="calendar-legend">
        <span className="cal-legend-text">Less</span>
        <div className="cal-cell level-0" />
        <div className="cal-cell level-1" />
        <div className="cal-cell level-2" />
        <div className="cal-cell level-3" />
        <div className="cal-cell level-4" />
        <span className="cal-legend-text">More</span>
      </div>
    </div>
  );
}
