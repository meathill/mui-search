export const WIDGET_STYLE_ROOT_AND_CONTROLS = `
.asw-root {
  --asw-bg: #ffffff;
  --asw-surface: #ffffff;
  --asw-border: #cccccc;
  --asw-soft-border: #e4e4e4;
  --asw-text: #333333;
  --asw-subtext: #555555;
  --asw-placeholder: #9b9b9b;
  --asw-accent: #009900;
  --asw-danger: #b42318;
  --asw-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  --asw-icon-fill: #555555;
  --asw-icon-hover: #009900;
  --asw-clear-hover-bg: rgba(0, 0, 0, 0.06);

  font-family: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif;
  color-scheme: light;
  color: var(--asw-text);
  border-radius: 8px;
  background: var(--asw-bg);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--asw-shadow);
  box-sizing: border-box;
}

@supports (-webkit-hyphens:none) {
  .asw-root {
    transform: translateY(-15rem);
  }
}

.asw-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.asw-input-wrap {
  position: relative;
  flex-grow: 1;
  width: 100%;
  min-width: 0;
}

.asw-input {
  width: 100%;
  border: 2px solid var(--asw-border);
  border-radius: 5px;
  font: inherit;
  font-size: 18px;
  background: var(--asw-surface);
  color: var(--asw-text);
  outline: none;
  padding: 12px 44px 12px 15px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.asw-input::placeholder {
  color: var(--asw-placeholder);
}

.asw-input:focus {
  border-color: var(--asw-accent);
}

.asw-input-clear-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--asw-subtext);
  cursor: pointer;
  padding: 0;
}

.asw-input-clear-btn:hover {
  color: var(--asw-text);
  background: var(--asw-clear-hover-bg);
}

.asw-input-clear-btn svg {
  width: 16px;
  height: 16px;
  display: block;
  fill: currentColor;
}

.asw-search-icon-btn {
  border: none;
  background: transparent;
  padding: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asw-search-icon-btn svg {
  width: 28px;
  height: 28px;
  display: block;
}

.asw-search-icon-btn svg path {
  fill: var(--asw-icon-fill);
  transition: fill 0.2s ease-in-out;
}

.asw-search-icon-btn:hover:not(:disabled) svg path {
  fill: var(--asw-icon-hover);
}

.asw-search-icon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.asw-status {
  margin: 0;
  font-size: 13px;
  color: var(--asw-subtext);
}

.asw-status.is-error {
  color: var(--asw-danger);
}

.asw-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.asw-panel h3 {
  margin: 0;
  font-size: 14px;
  color: var(--asw-subtext);
  padding: 0 4px;
}

.asw-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  min-width: 0;
}

.asw-empty {
  padding: 10px;
  border: 1px dashed var(--asw-soft-border);
  border-radius: 5px;
  color: var(--asw-subtext);
  font-size: 13px;
  background: var(--asw-surface);
  min-height: 40px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}
`;
