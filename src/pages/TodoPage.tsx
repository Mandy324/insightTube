import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Plus,
  Trash2,
  Bell,
  Check,
  Film,
  Clock,
  Calendar,
  ClockIcon,
} from "lucide-react";
import {
  getTodos,
  saveTodos,
  getReminders,
  saveReminders,
  getVideoSessions,
} from "../services/storage";
import { TodoItem, Reminder, VideoSession } from "../types";

type PageTab = "todos" | "reminders";

export default function TodoPage() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [tab, setTab] = useState<PageTab>("todos");
  const [loading, setLoading] = useState(true);

  // Todo input
  const [newTodo, setNewTodo] = useState("");
  // Reminder inputs
  const [newReminder, setNewReminder] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");

  useEffect(() => {
    Promise.all([getTodos(), getReminders(), getVideoSessions()]).then(
      ([t, r, s]) => {
        setTodos(t);
        setReminders(r);
        setSessions(s);
        setLoading(false);
      }
    );
  }, []);

  /* ---- Todo CRUD ---- */

  const persistTodos = useCallback(async (updated: TodoItem[]) => {
    setTodos(updated);
    await saveTodos(updated);
  }, []);

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    const item: TodoItem = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    persistTodos([item, ...todos]);
    setNewTodo("");
  };

  const toggleTodo = (id: string) => {
    persistTodos(
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (id: string) => {
    persistTodos(todos.filter((t) => t.id !== id));
  };

  /* ---- Reminder CRUD ---- */

  const persistReminders = useCallback(async (updated: Reminder[]) => {
    setReminders(updated);
    await saveReminders(updated);
  }, []);

  const addReminder = () => {
    const text = newReminder.trim();
    if (!text || !newReminderDate || !newReminderTime) return;
    const item: Reminder = {
      id: crypto.randomUUID(),
      text,
      dueAt: new Date(`${newReminderDate}T${newReminderTime}`).toISOString(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    persistReminders([item, ...reminders]);
    setNewReminder("");
    setNewReminderDate("");
    setNewReminderTime("");
  };

  const toggleReminder = (id: string) => {
    persistReminders(
      reminders.map((r) =>
        r.id === id ? { ...r, completed: !r.completed } : r
      )
    );
  };

  const deleteReminder = (id: string) => {
    persistReminders(reminders.filter((r) => r.id !== id));
  };

  const getSessionTitle = (id?: string) => {
    if (!id) return null;
    return sessions.find((s) => s.id === id)?.videoTitle ?? null;
  };

  if (loading) {
    return (
      <div className="page todo-page">
        <div className="loading-indicator">
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      </div>
    );
  }

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);
  const now = new Date();
  const activeReminders = reminders.filter((r) => !r.completed);
  const completedReminders = reminders.filter((r) => r.completed);

  return (
    <div className="page todo-page">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="page-subtitle">Stay organized with todos and timed reminders.</p>
        </div>
        <div className="todo-page-tabs">
          <button
            className={`todo-page-tab ${tab === "todos" ? "active" : ""}`}
            onClick={() => setTab("todos")}
          >
            <CheckSquare size={14} />
            Todos
          </button>
          <button
            className={`todo-page-tab ${tab === "reminders" ? "active" : ""}`}
            onClick={() => setTab("reminders")}
          >
            <Bell size={14} />
            Reminders
          </button>
        </div>
      </div>

      {tab === "todos" ? (
        <div className="todo-sections">
          {/* Add Todo */}
          <div className="todo-add-form">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
            />
            <button className="btn btn-primary" onClick={addTodo} disabled={!newTodo.trim()}>
              <Plus size={16} />
              Add
            </button>
          </div>

          {todos.length === 0 ? (
            <div className="empty-state">
              <CheckSquare size={40} />
              <h2>No Tasks Yet</h2>
              <p>Add your first todo to start tracking tasks.</p>
            </div>
          ) : (
            <>
              {/* Active todos */}
              {activeTodos.length > 0 && (
                <div>
                  <div className="todo-section-header">
                    <span>Active</span>
                    <span className="section-count">{activeTodos.length}</span>
                  </div>
                  <div className="todo-list">
                    {activeTodos.map((todo) => (
                      <TodoRow
                        key={todo.id}
                        todo={todo}
                        onToggle={toggleTodo}
                        onDelete={deleteTodo}
                        sessionTitle={getSessionTitle(todo.videoSessionId)}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedTodos.length > 0 && (
                <div>
                  <div className="todo-section-header">
                    <span>Completed</span>
                    <span className="section-count">{completedTodos.length}</span>
                  </div>
                  <div className="todo-list">
                    {completedTodos.map((todo) => (
                      <TodoRow
                        key={todo.id}
                        todo={todo}
                        onToggle={toggleTodo}
                        onDelete={deleteTodo}
                        sessionTitle={getSessionTitle(todo.videoSessionId)}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="todo-sections">
          {/* Add Reminder */}
          <div className="reminder-add-form">
            <input
              type="text"
              placeholder="Reminder text..."
              value={newReminder}
              onChange={(e) => setNewReminder(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReminder()}
            />
            <div className="reminder-datetime-group">
              <div className="datetime-field">
                <Calendar size={14} className="datetime-icon" />
                <input
                  type="date"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                />
              </div>
              <div className="datetime-field">
                <ClockIcon size={14} className="datetime-icon" />
                <input
                  type="time"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                />
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={addReminder}
              disabled={!newReminder.trim() || !newReminderDate || !newReminderTime}
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {reminders.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} />
              <h2>No Reminders</h2>
              <p>Set a reminder with a due date to stay on track.</p>
            </div>
          ) : (
            <>
              {activeReminders.length > 0 && (
                <div>
                  <div className="todo-section-header">
                    <span>Upcoming</span>
                    <span className="section-count">{activeReminders.length}</span>
                  </div>
                  <div className="todo-list">
                    {activeReminders
                      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
                      .map((r) => {
                        const due = new Date(r.dueAt);
                        const overdue = due < now;
                        return (
                          <div
                            key={r.id}
                            className={`reminder-item ${overdue ? "overdue" : ""}`}
                          >
                            <div className="reminder-icon">
                              {overdue ? <Clock size={18} /> : <Bell size={18} />}
                            </div>
                            <div className="reminder-info">
                              <div className="reminder-text">{r.text}</div>
                              <div className="reminder-due">
                                {overdue ? "Overdue — " : "Due "}
                                {due.toLocaleString()}
                              </div>
                              {r.videoSessionId && (
                                <span
                                  className="todo-video-link"
                                  onClick={() => navigate(`/study/${r.videoSessionId}`)}
                                >
                                  <Film size={10} />
                                  {getSessionTitle(r.videoSessionId)?.slice(0, 30)}
                                </span>
                              )}
                            </div>
                            <div className="reminder-actions">
                              <button
                                title="Mark complete"
                                onClick={() => toggleReminder(r.id)}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="delete-btn"
                                title="Delete"
                                onClick={() => deleteReminder(r.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {completedReminders.length > 0 && (
                <div>
                  <div className="todo-section-header">
                    <span>Completed</span>
                    <span className="section-count">{completedReminders.length}</span>
                  </div>
                  <div className="todo-list">
                    {completedReminders.map((r) => (
                      <div key={r.id} className="reminder-item completed">
                        <div className="reminder-icon">
                          <Check size={18} />
                        </div>
                        <div className="reminder-info">
                          <div className="reminder-text">{r.text}</div>
                          <div className="reminder-due">
                            {new Date(r.dueAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="reminder-actions">
                          <button
                            title="Undo"
                            onClick={() => toggleReminder(r.id)}
                          >
                            <Clock size={14} />
                          </button>
                          <button
                            className="delete-btn"
                            title="Delete"
                            onClick={() => deleteReminder(r.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Sub-component ---- */

function TodoRow({
  todo,
  onToggle,
  onDelete,
  sessionTitle,
  navigate,
}: {
  todo: TodoItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  sessionTitle: string | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className={`todo-item ${todo.completed ? "completed" : ""}`}>
      <button
        className={`todo-checkbox ${todo.completed ? "checked" : ""}`}
        onClick={() => onToggle(todo.id)}
      >
        {todo.completed && <Check size={14} />}
      </button>
      <span className="todo-text">{todo.text}</span>
      {sessionTitle && (
        <span
          className="todo-video-link"
          onClick={() => navigate(`/study/${todo.videoSessionId}`)}
        >
          <Film size={10} />
          {sessionTitle.slice(0, 25)}
        </span>
      )}
      <button className="todo-delete" onClick={() => onDelete(todo.id)}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}
