import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Loader2, RefreshCw, Cpu } from "lucide-react";
import { AIProvider, AIModel } from "../types";
import { listModels, getDefaultModels } from "../services/ai";

interface ModelSelectorProps {
  provider: AIProvider;
  apiKey: string;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({
  provider,
  apiKey,
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchModels = useCallback(async () => {
    if (!apiKey) {
      setModels(getDefaultModels(provider));
      setFetched(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listModels(provider, apiKey);
      setModels(result.length > 0 ? result : getDefaultModels(provider));
      setFetched(result.length > 0);
    } catch {
      setModels(getDefaultModels(provider));
      setFetched(false);
    } finally {
      setLoading(false);
    }
  }, [provider, apiKey]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Auto-select first model if current selection isn't in the list
  useEffect(() => {
    if (models.length > 0 && !models.find((m) => m.id === selectedModel)) {
      onModelChange(models[0].id);
    }
  }, [models, selectedModel, onModelChange]);

  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <div className="model-selector-wrapper">
      <div className="model-selector-header">
        <div className="model-selector-label">
          <Cpu size={14} />
          <span>Model</span>
          {!fetched && apiKey && (
            <span className="model-hint">(defaults)</span>
          )}
        </div>
        {apiKey && (
          <button
            className="model-refresh-btn"
            onClick={(e) => {
              e.stopPropagation();
              fetchModels();
            }}
            disabled={loading}
            title="Refresh models"
          >
            <RefreshCw size={12} className={loading ? "spin" : ""} />
          </button>
        )}
      </div>
      <div className={`model-selector ${open ? "open" : ""} ${disabled ? "disabled" : ""}`}>
        <button
          className="model-selector-trigger"
          onClick={() => !disabled && !loading && setOpen(!open)}
          disabled={disabled || loading}
          type="button"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="spin" />
              <span>Loading models...</span>
            </>
          ) : (
            <>
              <span className="model-selected-name">
                {currentModel?.name ?? selectedModel}
              </span>
              <ChevronDown size={14} className={`model-chevron ${open ? "rotated" : ""}`} />
            </>
          )}
        </button>
        {open && (
          <div className="model-dropdown">
            {models.map((m) => (
              <button
                key={m.id}
                className={`model-option ${m.id === selectedModel ? "active" : ""}`}
                onClick={() => {
                  onModelChange(m.id);
                  setOpen(false);
                }}
                type="button"
              >
                <span className="model-option-name">{m.name}</span>
                <span className="model-option-id">{m.id}</span>
              </button>
            ))}
            {models.length === 0 && (
              <div className="model-option empty">No models found</div>
            )}
          </div>
        )}
      </div>
      {/* Click-away listener */}
      {open && (
        <div className="model-backdrop" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
