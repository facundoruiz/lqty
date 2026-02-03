import { addCollectionDoc, getCollectionDocs, updateCollectionDoc, serverTimestamp } from './admin-data.js';
import { cropAndCompressImageToDataURL, readFileAsDataURL, formatDate, placeholderImage, slugify } from './admin-utils.js';
import { showErrorNotification, showSuccessNotification } from './utils/notifications.js';
import { setEditorContent } from './admin-wysiwyg.js';

let cachedBlogs = [];
let galleryState = [];

const tableBody = () => document.querySelector('#blogs-table tbody');
const formEl = () => document.getElementById('blog-form');
const formTitle = () => document.getElementById('blog-form-title');
const imagePreview = () => document.getElementById('blog-image-preview');
const imageInput = () => document.getElementById('blog-image-file');
const galleryInput = () => document.getElementById('blog-gallery-files');
const galleryPreview = () => document.getElementById('blog-gallery-preview');

const resetForm = () => {
  const form = formEl();
  if (!form) return;
  form.reset();
  form.querySelector('[name="id"]').value = '';
  setEditorContent('[data-editor="blog-content"]', '');
  galleryState = [];
  if (galleryPreview()) galleryPreview().innerHTML = '';
  if (imagePreview()) {
    imagePreview().style.backgroundImage = '';
    imagePreview().textContent = 'Sin imagen seleccionada';
  }
  if (formTitle()) formTitle().textContent = 'Crear blog';
};

const renderTable = () => {
  const tbody = tableBody();
  if (!tbody) return;
  tbody.innerHTML = '';

  cachedBlogs.forEach((blog) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${blog.title || '-'}</td>
      <td>${blog.status || 'draft'}</td>
      <td>${blog.featured ? 'Sí' : 'No'}</td>
      <td>${formatDate(blog.updated_at || blog.created_at)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-small" data-action="edit" data-id="${blog.id}">Editar</button>
          <button class="btn-small btn-danger" data-action="hide" data-id="${blog.id}">
            ${blog.deleted_at ? 'Restaurar' : 'Ocultar'}
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
};

const loadBlogs = async () => {
  cachedBlogs = await getCollectionDocs('blogs', { orderByField: 'updated_at' });
  renderTable();
};

const populateForm = (blog) => {
  const form = formEl();
  if (!form) return;
  form.querySelector('[name="id"]').value = blog.id;
  form.querySelector('[name="date"]').value = blog.date || '';
  form.querySelector('[name="title"]').value = blog.title || '';
  form.querySelector('[name="excerpt"]').value = blog.excerpt || '';
  form.querySelector('[name="publish"]').checked = blog.status === 'published';
  form.querySelector('[name="featured"]').checked = Boolean(blog.featured);
  setEditorContent('[data-editor="blog-content"]', blog.content || '');

  const imageBase64 = blog.image_path || '';
  const preview = imagePreview();
  if (preview) {
    if (imageBase64) {
      preview.style.backgroundImage = `url(${imageBase64})`;
      preview.textContent = '';
      form.querySelector('[name="image_base64"]').value = imageBase64;
    } else {
      preview.style.backgroundImage = '';
      preview.textContent = 'Sin imagen seleccionada';
    }
  }

  galleryState = Array.isArray(blog.gallery) ? blog.gallery : [];
  renderGallery();

  if (formTitle()) formTitle().textContent = 'Editar blog';
};

const handleTableClick = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;
  const blog = cachedBlogs.find((item) => item.id === id);
  if (!blog) return;

  if (action === 'edit') {
    populateForm(blog);
    return;
  }

  if (action === 'hide') {
    const hidden = !blog.deleted_at;
    updateCollectionDoc('blogs', id, {
      deleted_at: hidden ? serverTimestamp() : null,
      deleted_by: hidden ? 'admin' : '0',
      status: hidden ? 'hidden' : 'published',
      updated_at: serverTimestamp()
    }).then(() => {
      showSuccessNotification(`Blog ${hidden ? 'oculto' : 'restaurado'}.`);
      loadBlogs();
    }).catch(() => showErrorNotification('No se pudo actualizar el blog.'));
  }
};

const setupImageInput = () => {
  const input = imageInput();
  const preview = imagePreview();
  if (!input || !preview) return;

  preview.textContent = 'Sin imagen seleccionada';
  input.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await cropAndCompressImageToDataURL(file, {
        targetWidth: 356,
        targetHeight: 200,
        maxBytes: 800 * 1024,
        mimeType: 'image/jpeg'
      });
      preview.style.backgroundImage = `url(${dataUrl})`;
      preview.textContent = '';
      formEl().querySelector('[name="image_base64"]').value = dataUrl;
    } catch (err) {
      console.error('Error procesando imagen:', err);
      showErrorNotification(err?.message || 'No se pudo procesar la imagen.');
      event.target.value = '';
      preview.style.backgroundImage = '';
      preview.textContent = 'Sin imagen seleccionada';
      formEl().querySelector('[name="image_base64"]').value = '';
    }
  });
};

const renderGallery = () => {
  const preview = galleryPreview();
  if (!preview) return;
  preview.innerHTML = '';
  galleryState.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.style.backgroundImage = `url(${item.image})`;
    preview.appendChild(div);
  });
};

const setupGalleryInput = () => {
  const input = galleryInput();
  if (!input) return;
  input.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const items = await Promise.all(files.map(async (file) => ({
      image: await readFileAsDataURL(file),
      alt: file.name
    })));
    galleryState = [...galleryState, ...items];
    renderGallery();
  });
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const id = form.querySelector('[name="id"]').value;
  const date = form.querySelector('[name="date"]').value;
  const title = form.querySelector('[name="title"]').value.trim();
  const excerpt = form.querySelector('[name="excerpt"]').value.trim();
  const content = form.querySelector('[name="content"]').value.trim();
  const publish = form.querySelector('[name="publish"]').checked;
  const featured = form.querySelector('[name="featured"]').checked;
  const imageBase64 = form.querySelector('[name="image_base64"]').value;

  if (!title || !excerpt || !content) {
    showErrorNotification('Completá título, resumen y contenido.');
    return;
  }

  const payload = {
    date,
    title,
    excerpt,
    content,
    image_path: imageBase64 || placeholderImage(title),
    gallery: galleryState,
    status: publish ? 'published' : 'draft',
    featured,
    slug: slugify(title),
    updated_at: serverTimestamp(),
    deleted_at: null,
    deleted_by: '0'
  };

  if (publish) {
    payload.published_at = new Date().toISOString();
  }

  if (!id) {
    payload.created_at = serverTimestamp();
    payload.created_by_ref = null;
    await addCollectionDoc('blogs', payload);
    showSuccessNotification('Blog creado.');
  } else {
    await updateCollectionDoc('blogs', id, payload);
    showSuccessNotification('Blog actualizado.');
  }

  resetForm();
  await loadBlogs();
};

export const initBlogsSection = async () => {
  await loadBlogs();
  setupImageInput();
  setupGalleryInput();

  const form = formEl();
  const table = tableBody()?.closest('table');
  const resetBtn = document.getElementById('blog-form-reset');
  const newBtn = document.getElementById('btn-new-blog');

  if (form) form.addEventListener('submit', handleSubmit);
  if (table) table.addEventListener('click', handleTableClick);
  if (resetBtn) resetBtn.addEventListener('click', resetForm);
  if (newBtn) newBtn.addEventListener('click', resetForm);
};
