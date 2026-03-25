export const WIDGET_STYLE_DIALOG = `
.asw-dialog {
  border: none;
  background: transparent;
  padding: 0;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  margin: auto;
  overflow: visible;
  outline: none;
}

.asw-dialog::backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.asw-dialog-close {
  position: absolute;
  right: 0;
  top: -40px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  padding: 5px;
}

.asw-dialog-close:hover {
  opacity: 0.8;
}

.asw-dialog-inner {
  position: relative;
  width: 100%;
  height: 100%;
}

.asw-content-area {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(90vh - 80px); /* 减去搜索框等头部的高度 */
}
`;
