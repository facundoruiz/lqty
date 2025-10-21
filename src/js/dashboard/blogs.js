import { createBlog } from '../services/blogService.js';

let initialized = false;

const editorRoles = ['editor', 'admin'];

const getNotifications = () => window.notifications || {};

const getElement = (selector) => document.querySelector(selector);

const setStatusMessage = (element, message, type = 'info') => {
    if (!element) {
        return;
    }

    element.textContent = message;
    element.dataset.status = type;
    element.style.display = message ? 'block' : 'none';
};

const disableForm = (form, disabled) => {
    if (!form) {
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = disabled;
        submitButton.classList.toggle('is-loading', disabled);
    }

    const inputs = form.querySelectorAll('input, textarea, button, select');
    inputs.forEach((control) => {
        if (disabled) {
            control.setAttribute('disabled', 'disabled');
        } else {
            control.removeAttribute('disabled');
        }
    });
};

const resetForm = (form) => {
    if (!form) {
        return;
    }

    form.reset();
};

const extractBlogData = (form) => {
    const formData = new FormData(form);

    return {
        title: formData.get('title') || '',
        excerpt: formData.get('excerpt') || '',
        content: formData.get('content') || '',
        imagePath: formData.get('imagePath') || '',
        imageAlt: formData.get('imageAlt') || '',
        tags: (formData.get('tags') || ''),
        publishWeb: formData.get('publishWeb') === 'on'
    };
};

const handleBlogSubmit = async ({ event, form, statusElement, user }) => {
    event.preventDefault();

    const { showSuccessNotification, showErrorNotification } = getNotifications();

    try {
        disableForm(form, true);
        setStatusMessage(statusElement, 'Guardando blog...', 'loading');

        const blogData = extractBlogData(form);

        await createBlog(blogData, user);

        setStatusMessage(statusElement, 'Blog creado correctamente.', 'success');
        resetForm(form);

        if (typeof showSuccessNotification === 'function') {
            showSuccessNotification('Blog creado correctamente.');
        }
    } catch (error) {
        console.error('Error al crear blog:', error);
        const message = error?.message || 'No se pudo crear el blog.';
        setStatusMessage(statusElement, message, 'error');

        if (typeof showErrorNotification === 'function') {
            showErrorNotification(message);
        }
    } finally {
        disableForm(form, false);
    }
};

const configureForm = ({ user }) => {
    const blogForm = getElement('#blog-form');
    const statusElement = getElement('#blog-form-status');

    if (!blogForm || initialized) {
        return;
    }

    initialized = true;

    blogForm.addEventListener('submit', (event) => {
        handleBlogSubmit({ event, form: blogForm, statusElement, user });
    });
};

export const initBlogManagement = (userData = {}) => {
    const role = userData.role || 'user';
    const blogTabButton = getElement('#blog-tab-link');
    const blogTabPane = getElement('#blog-admin');

    if (!blogTabButton || !blogTabPane) {
        return;
    }

    if (!editorRoles.includes(role)) {
        blogTabButton.hidden = true;
        blogTabButton.dataset.disabled = 'true';
        blogTabPane.setAttribute('aria-hidden', 'true');
        blogTabPane.classList.remove('active');
        return;
    }

    blogTabButton.hidden = false;
    blogTabButton.dataset.disabled = 'false';
    blogTabPane.removeAttribute('aria-hidden');

    configureForm({ user: userData });
};
