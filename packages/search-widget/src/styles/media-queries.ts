export const WIDGET_STYLE_MEDIA_QUERIES = `
@media (prefers-color-scheme: dark) {
  .asw-root {
    --asw-bg: #11161b;
    --asw-surface: #1b232b;
    --asw-border: #3b4754;
    --asw-soft-border: #2c3642;
    --asw-text: #edf2f7;
    --asw-subtext: #b9c5d1;
    --asw-placeholder: #8694a3;
    --asw-accent: #3cc96b;
    --asw-danger: #f97066;
    --asw-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
    --asw-icon-fill: #b9c5d1;
    --asw-icon-hover: #3cc96b;
    --asw-clear-hover-bg: rgba(255, 255, 255, 0.12);
    color-scheme: dark;
  }

  .asw-dialog::backdrop {
    background: rgba(0, 0, 0, 0.62);
  }
}

@media (prefers-reduced-motion: reduce) {
  .asw-search-panel {
    animation: none;
  }
}

@media (max-width: 768px) {
  .asw-input {
    font-size: 16px;
    padding: 10px 40px 10px 12px;
  }

  .asw-search-icon-btn svg {
    width: 26px;
    height: 26px;
  }

  .asw-panel h3 {
    font-size: 13px;
  }

  .asw-suggestion {
    font-size: 13px;
    padding: 7px 9px;
  }

  .asw-title {
    font-size: 14px;
  }

  .asw-content {
    font-size: 12px;
  }

  .asw-hot-meta {
    font-size: 11px;
  }
}

@media (max-width: 640px) {
  .asw-input {
    font-size: 14px;
    padding: 8px 36px 8px 10px;
  }

  .asw-search-icon-btn {
    padding: 3px;
  }

  .asw-search-icon-btn svg {
    width: 22px;
    height: 22px;
  }

  .asw-input-clear-btn {
    right: 8px;
  }

  .asw-input-clear-btn svg {
    width: 14px;
    height: 14px;
  }
}
`;
