const applyCommand = (command, value = null) => {
  document.execCommand(command, false, value);
};

const handleToolbarClick = (event, editor) => {
  const button = event.target.closest('button');
  if (!button || !button.dataset.cmd) return;

  const cmd = button.dataset.cmd;
  if (cmd === 'createLink') {
    const url = window.prompt('URL del enlace:');
    if (url) applyCommand(cmd, url);
    return;
  }

  applyCommand(cmd);
  editor.focus();
};

const syncEditorValue = (editorEl) => {
  const valueEl = editorEl.querySelector('.editor-value');
  const bodyEl = editorEl.querySelector('.editor-body');
  if (valueEl && bodyEl) {
    valueEl.value = bodyEl.innerHTML.trim();
  }
};

export const initWysiwygEditors = () => {
  const editors = document.querySelectorAll('.editor');
  editors.forEach((editor) => {
    const toolbar = editor.querySelector('.editor-toolbar');
    const body = editor.querySelector('.editor-body');
    if (!toolbar || !body) return;

    toolbar.addEventListener('click', (event) => handleToolbarClick(event, body));
    body.addEventListener('input', () => syncEditorValue(editor));
    body.addEventListener('blur', () => syncEditorValue(editor));
  });
};

export const setEditorContent = (editorSelector, html) => {
  const editor = document.querySelector(editorSelector);
  if (!editor) return;
  const body = editor.querySelector('.editor-body');
  const valueEl = editor.querySelector('.editor-value');
  if (body) body.innerHTML = html || '';
  if (valueEl) valueEl.value = html || '';
};
