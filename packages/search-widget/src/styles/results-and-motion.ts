export const WIDGET_STYLE_RESULTS_AND_MOTION = `
.asw-result {
  border: 1px solid var(--asw-soft-border);
  border-radius: 5px;
  padding: 10px;
  display: grid;
  gap: 6px;
  background: var(--asw-surface);
}

.asw-result-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.asw-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--asw-text);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.asw-content {
  margin: 0;
  color: var(--asw-subtext);
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.asw-meta {
  margin: 0;
  color: var(--asw-accent);
  font-size: 12px;
  font-weight: 600;
}

.asw-track {
  justify-self: start;
  border: 1px solid var(--asw-soft-border);
  border-radius: 5px;
  padding: 6px 10px;
  background: var(--asw-surface);
  color: var(--asw-subtext);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.asw-track:hover:not(:disabled) {
  border-color: var(--asw-accent);
  color: var(--asw-accent);
}

.asw-track:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.asw-search-panel {
  transform-origin: top center;
  animation: asw-panel-pop 220ms cubic-bezier(0.19, 1, 0.22, 1);
}

.asw-loading-indicator {
  font-size: 0.8em;
  color: var(--asw-subtext);
  margin-left: 8px;
  animation: asw-pulse 1.5s infinite;
}

@keyframes asw-panel-pop {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }
  70% {
    opacity: 1;
    transform: translateY(0) scale(1.005);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes asw-pulse {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}

.asw-spinner {
  width: 100%;
  height: 100%;
  transform-origin: center;
  animation: asw-spin 2s linear infinite;
}

@keyframes asw-spin {
  100% { transform: rotate(360deg); }
}
`;
