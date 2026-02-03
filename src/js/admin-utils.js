export const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = (err) => reject(err);
  reader.readAsDataURL(file);
});

const loadImageFromFile = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    resolve(img);
  };
  img.onerror = (err) => {
    URL.revokeObjectURL(url);
    reject(err);
  };
  img.src = url;
});

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar el blob de imagen.'));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });

const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });

const centerCropRect = ({ srcW, srcH, targetW, targetH }) => {
  const srcAspect = srcW / srcH;
  const targetAspect = targetW / targetH;

  if (srcAspect > targetAspect) {
    // source is wider: crop left/right
    const cropH = srcH;
    const cropW = Math.round(cropH * targetAspect);
    const sx = Math.round((srcW - cropW) / 2);
    return { sx, sy: 0, sw: cropW, sh: cropH };
  }

  // source is taller: crop top/bottom
  const cropW = srcW;
  const cropH = Math.round(cropW / targetAspect);
  const sy = Math.round((srcH - cropH) / 2);
  return { sx: 0, sy, sw: cropW, sh: cropH };
};

export const cropAndCompressImageToDataURL = async (file, opts = {}) => {
  const targetW = Number(opts.targetWidth ?? 356);
  const targetH = Number(opts.targetHeight ?? 200);
  const maxBytes = Number(opts.maxBytes ?? 800 * 1024);
  const mimeType = opts.mimeType ?? 'image/jpeg';

  if (!file) throw new Error('No se recibi\u00f3 un archivo.');
  if (!Number.isFinite(targetW) || !Number.isFinite(targetH) || targetW <= 0 || targetH <= 0) {
    throw new Error('Tama\u00f1o de recorte inv\u00e1lido.');
  }
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error('Tama\u00f1o m\u00e1ximo inv\u00e1lido.');
  }

  const img = await loadImageFromFile(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const { sx, sy, sw, sh } = centerCropRect({ srcW, srcH, targetW, targetH });

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('No se pudo inicializar canvas.');

  // Favor quality on downscale
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  // If we can't encode efficiently (e.g. older Safari), fallback to PNG via readFileAsDataURL
  if (typeof canvas.toBlob !== 'function') {
    return readFileAsDataURL(file);
  }

  // Try a few qualities to stay under maxBytes.
  // 356x200 should usually fit easily, but we keep it robust.
  let low = 0.35;
  let high = 0.92;
  let best = null;

  for (let i = 0; i < 8; i += 1) {
    const q = (low + high) / 2;
    const blob = await canvasToBlob(canvas, mimeType, q);
    if (blob.size <= maxBytes) {
      best = blob;
      low = q; // try higher quality still under max
    } else {
      high = q; // too big, lower quality
    }
  }

  // If still too big, do a last-resort low-quality encode
  if (!best) {
    const blob = await canvasToBlob(canvas, mimeType, 0.3);
    if (blob.size > maxBytes) {
      throw new Error(`La imagen supera el l\u00edmite de ${Math.round(maxBytes / 1024)}kb incluso comprimida.`);
    }
    best = blob;
  }

  return blobToDataURL(best);
};

export const formatDate = (value) => {
  if (!value) return '-';
  if (value.toDate) {
    return value.toDate().toLocaleDateString('es-AR');
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date?.getTime?.())) return '-';
  return date.toLocaleDateString('es-AR');
};

export const slugify = (text = '') => text
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const placeholderImage = (label) =>
  `https://placehold.co/400x300?text=${encodeURIComponent(label || 'imagen')}`;
