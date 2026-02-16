import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  StickyNote,
  Plus,
  Trash2,
  X,
  Film,
  Search,
  Edit3,
  FileText,
} from "lucide-react";
import { getNotes, saveNotes, getVideoSessions } from "../services/storage";
import { Note, VideoSession } from "../types";

const NOTE_COLORS = [
  "rgba(124, 58, 237, 0.12)",
  "rgba(16, 185, 129, 0.12)",
  "rgba(245, 158, 11, 0.12)",
  "rgba(59, 130, 246, 0.12)",
  "rgba(239, 68, 68, 0.12)",
  "rgba(236, 72, 153, 0.12)",
];
const NOTE_BORDER_COLORS = [
  "rgba(124, 58, 237, 0.35)",
  "rgba(16, 185, 129, 0.35)",
  "rgba(245, 158, 11, 0.35)",
  "rgba(59, 130, 246, 0.35)",
  "rgba(239, 68, 68, 0.35)",
  "rgba(236, 72, 153, 0.35)",
];

function noteColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % NOTE_COLORS.length;
  return { bg: NOTE_COLORS[idx], border: NOTE_BORDER_COLORS[idx] };
}

export default function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getNotes(), getVideoSessions()]).then(([n, s]) => {
      setNotes(n);
      setSessions(s);
      setLoading(false);
    });
  }, []);

  const persist = useCallback(
    async (updated: Note[]) => {
      setNotes(updated);
      await saveNotes(updated);
    },
    []
  );

  const handleNew = () => {
    const now = new Date().toISOString();
    setEditing({
      id: crypto.randomUUID(),
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleSave = (note: Note) => {
    const idx = notes.findIndex((n) => n.id === note.id);
    const updated = [...notes];
    const saved = { ...note, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      updated[idx] = saved;
    } else {
      updated.unshift(saved);
    }
    persist(updated);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    persist(notes.filter((n) => n.id !== id));
  };

  const filtered = notes
    .filter((n) => {
      if (filter === "all") return true;
      if (filter === "general") return !n.videoSessionId;
      return n.videoSessionId === filter;
    })
    .filter((n) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    });

  const getSessionTitle = (id?: string) => {
    if (!id) return null;
    return sessions.find((s) => s.id === id)?.videoTitle ?? null;
  };

  const totalNotes = notes.length;
  const videoNotes = notes.filter((n) => n.videoSessionId).length;
  const generalNotes = totalNotes - videoNotes;

  if (loading) {
    return (
      <div className="page notes-page">
        <div className="loading-indicator">
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page notes-page">
      <div className="page-header">
        <div>
          <h1>Notes</h1>
          <p className="page-subtitle">Capture ideas, study thoughts, and video-specific notes.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleNew}>
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      {/* Stats Strip */}
      <div className="notes-stats-strip">
        <div className="notes-stat-item">
          <FileText size={14} />
          <span><strong>{totalNotes}</strong> Total</span>
        </div>
        <div className="notes-stat-item">
          <Film size={14} />
          <span><strong>{videoNotes}</strong> Video</span>
        </div>
        <div className="notes-stat-item">
          <StickyNote size={14} />
          <span><strong>{generalNotes}</strong> General</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="notes-search-bar">
        <div className="notes-search-input-wrap">
          <Search size={15} className="notes-search-icon" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="notes-search-input"
          />
        </div>
        <select
          className="notes-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Notes</option>
          <option value="general">General Notes</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.videoTitle.slice(0, 40)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <StickyNote size={40} />
          <h2>{searchQuery ? "No Matching Notes" : "No Notes Yet"}</h2>
          <p>{searchQuery ? "Try a different search term." : "Create your first note to start capturing ideas."}</p>
          {!searchQuery && (
            <button className="btn btn-primary" onClick={handleNew}>
              <Plus size={16} /> Create Note
            </button>
          )}
        </div>
      ) : (
        <div className="notes-list">
          {filtered.map((note) => {
            const sessionTitle = getSessionTitle(note.videoSessionId);
            const colors = noteColor(note.id);
            return (
              <div
                key={note.id}
                className="note-card"
                onClick={() => setEditing(note)}
                style={{ borderLeftColor: colors.border, background: colors.bg }}
              >
                <div className="note-card-top">
                  <div className="note-card-title">
                    {note.title || "Untitled Note"}
                  </div>
                  <button
                    className="note-card-edit"
                    title="Edit note"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(note);
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
                <div className="note-card-preview">
                  {note.content || "No content"}
                </div>
                <div className="note-card-meta">
                  <span className="note-card-date">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {sessionTitle && (
                      <span
                        className="note-card-badge"
                        title={sessionTitle}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/study/${note.videoSessionId}`);
                        }}
                      >
                        <Film size={10} style={{ marginRight: 3 }} />
                        Video
                      </span>
                    )}
                    <button
                      className="note-card-delete-btn"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {editing && (
        <NoteEditor
          note={editing}
          sessions={sessions}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function NoteEditor({
  note,
  sessions,
  onSave,
  onClose,
}: {
  note: Note;
  sessions: VideoSession[];
  onSave: (n: Note) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [videoSessionId, setVideoSessionId] = useState(note.videoSessionId ?? "");

  const handleSave = () => {
    onSave({
      ...note,
      title: title.trim() || "Untitled Note",
      content,
      videoSessionId: videoSessionId || undefined,
    });
  };

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
          <select
            value={videoSessionId}
            onChange={(e) => setVideoSessionId(e.target.value)}
          >
            <option value="">General Note (no video)</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.videoTitle.slice(0, 60)}
              </option>
            ))}
          </select>
        </div>
        <div className="note-editor-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
