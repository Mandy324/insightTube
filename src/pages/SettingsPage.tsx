import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, CheckCircle, Key, Cpu, Hash } from "lucide-react";
import { getSettings, saveSettings } from "../services/storage";
import { AppSettings, DEFAULT_SETTINGS, AIProvider } from "../types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="page settings-page">
        <div className="loading-indicator">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-subtitle">
          Configure your AI provider and API keys. Keys are stored locally on your device.
        </p>
      </div>

      <div className="settings-sections">
        {/* AI Provider Selection */}
        <section className="settings-section">
          <div className="section-header">
            <Cpu size={20} />
            <h2>AI Provider</h2>
          </div>
          <div className="provider-cards">
            {(["gemini", "openai"] as AIProvider[]).map((provider) => (
              <button
                key={provider}
                className={`provider-card ${settings.selectedProvider === provider ? "active" : ""}`}
                onClick={() => updateSetting("selectedProvider", provider)}
              >
                <div className="provider-card-inner">
                  <div className="provider-name">
                    {provider === "openai" ? "OpenAI" : "Google Gemini"}
                  </div>
                  <div className="provider-model">
                    {provider === "openai" ? "GPT-4o Mini" : "Gemini 2.0 Flash"}
                  </div>
                </div>
                {settings.selectedProvider === provider && (
                  <CheckCircle size={18} className="provider-check" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* API Keys */}
        <section className="settings-section">
          <div className="section-header">
            <Key size={20} />
            <h2>API Keys</h2>
          </div>

          <div className="form-group">
            <label className="form-label">OpenAI API Key</label>
            <div className="input-with-toggle">
              <input
                type={showOpenAI ? "text" : "password"}
                className="form-input"
                value={settings.openaiApiKey}
                onChange={(e) => updateSetting("openaiApiKey", e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowOpenAI(!showOpenAI)}
                type="button"
              >
                {showOpenAI ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="form-hint">
              Get your key from{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                platform.openai.com
              </a>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Google Gemini API Key</label>
            <div className="input-with-toggle">
              <input
                type={showGemini ? "text" : "password"}
                className="form-input"
                value={settings.geminiApiKey}
                onChange={(e) => updateSetting("geminiApiKey", e.target.value)}
                placeholder="AIza..."
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowGemini(!showGemini)}
                type="button"
              >
                {showGemini ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="form-hint">
              Get your key from{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com
              </a>
            </span>
          </div>
        </section>

        {/* Quiz Settings */}
        <section className="settings-section">
          <div className="section-header">
            <Hash size={20} />
            <h2>Quiz Settings</h2>
          </div>

          <div className="form-group">
            <label className="form-label">
              Number of Questions: <strong>{settings.questionCount}</strong>
            </label>
            <input
              type="range"
              min="5"
              max="20"
              step="1"
              value={settings.questionCount}
              onChange={(e) =>
                updateSetting("questionCount", Number(e.target.value))
              }
              className="form-range"
            />
            <div className="range-labels">
              <span>5</span>
              <span>20</span>
            </div>
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <button className="btn btn-primary btn-save" onClick={handleSave}>
          {saved ? (
            <>
              <CheckCircle size={18} />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
