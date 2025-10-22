import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase-config.js';

const blogsCollectionRef = collection(db, 'blogs');

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const toSlug = (text) => normalizeString(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseTags = (value) => {
    const raw = normalizeString(value);
    if (!raw) {
        return [];
    }

    return raw
        .split(',')
        .map(tag => normalizeString(tag).toLowerCase())
        .filter(Boolean);
};

const buildBlogPayload = (data, userContext) => {
    const title = normalizeString(data.title);
    const excerpt = normalizeString(data.excerpt);
    const content = normalizeString(data.content);

    if (!title) {
        throw new Error('El título es obligatorio.');
    }

    if (!excerpt) {
        throw new Error('El resumen es obligatorio.');
    }

    if (!content) {
        throw new Error('El contenido es obligatorio.');
    }

    const publishWeb = Boolean(data.publishWeb);
    const createdBy = userContext?.uid || null;
    const authorName = normalizeString(userContext?.name);

    const payload = {
        title,
        excerpt,
        content,
        image_path: normalizeString(data.imagePath),
        image_alt: normalizeString(data.imageAlt) || title,
        tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : parseTags(data.tags),
        publish_web: publishWeb ? '1' : '0',
        status: publishWeb ? 'published' : 'draft',
        slug: toSlug(title),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        author_id: createdBy,
        author_name: authorName
    };

    if (!payload.image_path) {
        delete payload.image_path;
    }

    if (!payload.author_name) {
        delete payload.author_name;
    }

    if (!payload.tags || payload.tags.length === 0) {
        delete payload.tags;
    }

    return payload;
};

export const createBlog = async (data, userContext = {}) => {
    const payload = buildBlogPayload(data, userContext);
    const docRef = await addDoc(blogsCollectionRef, payload);
    return docRef;
};

export const __testables = {
    normalizeString,
    toSlug,
    parseTags,
    buildBlogPayload
};
