export const WIDGET_STYLE_SUGGESTION_AND_HOT = `
.asw-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 1px solid var(--asw-soft-border);
  border-radius: 5px;
  background: var(--asw-surface);
  color: var(--asw-text);
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
  text-decoration: none;
  min-height: 40px;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.asw-suggestion:visited {
  color: var(--asw-text);
}

.asw-suggestion:hover {
  border-color: var(--asw-accent);
  color: var(--asw-accent);
}

.asw-static-item {
  cursor: default;
}

.asw-static-item:hover {
  border-color: var(--asw-soft-border);
  color: var(--asw-text);
}

.asw-suggestion-link {
  display: flex;
  align-items: center;
}

.asw-suggestion-static {
  display: flex;
  align-items: center;
}

.asw-suggestion-text {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.25;
}

.asw-suggestion-list {
  align-content: start;
}

.asw-suggestion-skeleton {
  pointer-events: none;
  justify-content: flex-start;
}

.asw-suggestion-skeleton .asw-skeleton-line {
  width: min(86%, 340px);
}

.asw-suggestion-padding {
  border-color: transparent;
  background: transparent;
  pointer-events: none;
}

.asw-hot-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-decoration: none;
}

.asw-hot-list {
  align-content: start;
}

.asw-hot-title {
  flex: 1;
  min-width: 0;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asw-hot-meta {
  display: inline-block;
  margin-left: 8px;
  font-size: 12px;
  color: var(--asw-subtext);
  white-space: nowrap;
}

.asw-hot-skeleton {
  pointer-events: none;
}

.asw-skeleton-line,
.asw-skeleton-meta {
  display: inline-block;
  border-radius: 999px;
  background: var(--asw-soft-border);
  animation: asw-pulse 1.6s ease-in-out infinite;
}

.asw-skeleton-line {
  width: min(72%, 280px);
  height: 14px;
}

.asw-skeleton-meta {
  width: 42px;
  height: 12px;
  flex-shrink: 0;
}
`;
