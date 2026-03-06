export const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = (err) => reject(err);
  reader.readAsDataURL(file);
});

const IMAGE_CROP_CANCELLED_CODE = 'IMAGE_CROP_CANCELLED';

export const isCropCancelledError = (error) => error?.code === IMAGE_CROP_CANCELLED_CODE;

const createCropCancelledError = () => {
  const error = new Error('Recorte cancelado.');
  error.code = IMAGE_CROP_CANCELLED_CODE;
  return error;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const createOrientedCanvas = ({ sourceImage, rotation, mirrored }) => {
  const srcW = sourceImage.naturalWidth || sourceImage.width;
  const srcH = sourceImage.naturalHeight || sourceImage.height;
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const swapAxes = normalizedRotation === 90 || normalizedRotation === 270;
  const outW = swapAxes ? srcH : srcW;
  const outH = swapAxes ? srcW : srcH;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('No se pudo inicializar canvas.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((normalizedRotation * Math.PI) / 180);
  ctx.scale(mirrored ? -1 : 1, 1);
  ctx.drawImage(sourceImage, -srcW / 2, -srcH / 2);
  ctx.restore();

  return canvas;
};

const getOrCreateCropperModal = () => {
  let root = document.getElementById('admin-image-cropper-modal');
  if (!root) {
    root = document.createElement('div');
    root.id = 'admin-image-cropper-modal';
    root.className = 'admin-cropper-modal';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="admin-cropper-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-cropper-title">
        <div class="admin-cropper-header">
          <h4 id="admin-cropper-title">Recortar imagen</h4>
          <button type="button" class="btn-small admin-cropper-close" aria-label="Cerrar">x</button>
        </div>
        <p class="admin-cropper-help">Arrastra la imagen para centrar el recorte.</p>
        <div class="admin-cropper-controls">
          <div class="admin-cropper-control">
            <span class="admin-cropper-control-label">Zoom</span>
            <div class="admin-cropper-zoom-controls">
              <button type="button" class="btn-small admin-cropper-zoom-out" aria-label="Reducir zoom">-</button>
              <input
                type="range"
                class="admin-cropper-zoom-slider"
                min="-4"
                max="4"
                step="0.05"
                value="1"
                aria-label="Zoom de imagen"
              />
              <button type="button" class="btn-small admin-cropper-zoom-in" aria-label="Aumentar zoom">+</button>
              <span class="admin-cropper-zoom-value">100%</span>
            </div>
          </div>
          <div class="admin-cropper-control">
            <span class="admin-cropper-control-label">Giro</span>
            <div class="admin-cropper-rotation-controls">
              <button type="button" class="btn-small admin-cropper-rotate-btn is-active" data-rotation="0">0°</button>
              <button type="button" class="btn-small admin-cropper-rotate-btn" data-rotation="90">90°</button>
              <button type="button" class="btn-small admin-cropper-rotate-btn" data-rotation="180">180°</button>
              <button type="button" class="btn-small admin-cropper-rotate-btn" data-rotation="270">270°</button>
            </div>
          </div>
          <div class="admin-cropper-control">
            <span class="admin-cropper-control-label">Espejo</span>
            <button type="button" class="btn-small admin-cropper-mirror-btn" aria-pressed="false">Horizontal: OFF</button>
          </div>
        </div>
        <div class="admin-cropper-stage">
          <div class="admin-cropper-viewport">
            <canvas class="admin-cropper-canvas" aria-hidden="true"></canvas>
            <div class="admin-cropper-guides" aria-hidden="true"></div>
          </div>
        </div>
        <div class="admin-cropper-actions">
          <button type="button" class="btn-ghost admin-cropper-cancel">Cancelar</button>
          <button type="button" class="btn-primary admin-cropper-apply">Aplicar recorte</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  return {
    root,
    dialog: root.querySelector('.admin-cropper-dialog'),
    title: root.querySelector('#admin-cropper-title'),
    help: root.querySelector('.admin-cropper-help'),
    viewport: root.querySelector('.admin-cropper-viewport'),
    previewCanvas: root.querySelector('.admin-cropper-canvas'),
    zoomOutBtn: root.querySelector('.admin-cropper-zoom-out'),
    zoomInBtn: root.querySelector('.admin-cropper-zoom-in'),
    zoomSlider: root.querySelector('.admin-cropper-zoom-slider'),
    zoomValue: root.querySelector('.admin-cropper-zoom-value'),
    rotateButtons: Array.from(root.querySelectorAll('.admin-cropper-rotate-btn')),
    mirrorBtn: root.querySelector('.admin-cropper-mirror-btn'),
    closeBtn: root.querySelector('.admin-cropper-close'),
    cancelBtn: root.querySelector('.admin-cropper-cancel'),
    applyBtn: root.querySelector('.admin-cropper-apply')
  };
};

const requestManualCropRect = ({ sourceImage, targetW, targetH }) => new Promise((resolve, reject) => {
  const modal = getOrCreateCropperModal();
  const previousBodyOverflow = document.body.style.overflow;
  const minZoom = -4;
  const maxZoom = 4;
  const zoomStep = 0.1;

  modal.title.textContent = `Recortar imagen (${targetW} x ${targetH})`;
  modal.help.textContent = 'Arrastra para centrar. El resultado se guardara en el tamano final.';
  modal.viewport.style.aspectRatio = `${targetW} / ${targetH}`;
  modal.zoomSlider.value = '1';
  modal.zoomValue.textContent = '100%';
  modal.rotateButtons.forEach((button) => {
    button.classList.toggle('is-active', Number(button.dataset.rotation) === 0);
  });
  modal.mirrorBtn.classList.remove('is-active');
  modal.mirrorBtn.setAttribute('aria-pressed', 'false');
  modal.mirrorBtn.textContent = 'Horizontal: OFF';
  modal.root.classList.add('is-open');
  modal.root.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  let rotation = 0;
  let mirrored = false;
  let zoom = 1;
  let frameWidth = 0;
  let frameHeight = 0;
  let displayScale = 1;
  let orientedCanvas = createOrientedCanvas({ sourceImage, rotation, mirrored });
  let orientedW = orientedCanvas.width;
  let orientedH = orientedCanvas.height;
  let imageX = 0;
  let imageY = 0;
  let draggingPointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragImageStartX = 0;
  let dragImageStartY = 0;
  let settled = false;

  const getCanvasContext = () => modal.previewCanvas.getContext('2d', { alpha: false });

  const syncFrameMetrics = () => {
    const nextFrameW = modal.viewport.clientWidth || targetW;
    const nextFrameH = modal.viewport.clientHeight || targetH;
    frameWidth = nextFrameW;
    frameHeight = nextFrameH;

    const dpr = window.devicePixelRatio || 1;
    const pixelW = Math.max(1, Math.round(frameWidth * dpr));
    const pixelH = Math.max(1, Math.round(frameHeight * dpr));
    if (modal.previewCanvas.width !== pixelW || modal.previewCanvas.height !== pixelH) {
      modal.previewCanvas.width = pixelW;
      modal.previewCanvas.height = pixelH;
    }
    modal.previewCanvas.style.width = `${frameWidth}px`;
    modal.previewCanvas.style.height = `${frameHeight}px`;
  };

  const getBaseScale = () => Math.max(frameWidth / orientedW, frameHeight / orientedH);

  const getBounds = () => {
    const scaledW = orientedW * displayScale;
    const scaledH = orientedH * displayScale;
    const minX = scaledW > frameWidth ? frameWidth - scaledW : (frameWidth - scaledW) / 2;
    const maxX = scaledW > frameWidth ? 0 : minX;
    const minY = scaledH > frameHeight ? frameHeight - scaledH : (frameHeight - scaledH) / 2;
    const maxY = scaledH > frameHeight ? 0 : minY;
    return {
      minX,
      maxX,
      minY,
      maxY
    };
  };

  const applyBounds = () => {
    const { minX, maxX, minY, maxY } = getBounds();
    imageX = clamp(imageX, minX, maxX);
    imageY = clamp(imageY, minY, maxY);
  };

  const updateZoomLabel = () => {
    modal.zoomValue.textContent = `${Math.round(zoom * 100)}%`;
  };

  const renderPreview = () => {
    syncFrameMetrics();
    const ctx = getCanvasContext();
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, frameWidth, frameHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      orientedCanvas,
      imageX,
      imageY,
      orientedW * displayScale,
      orientedH * displayScale
    );
  };

  const setZoom = (nextZoom, preserveCenter = true) => {
    syncFrameMetrics();
    const previousScale = displayScale > 0 ? displayScale : getBaseScale() * zoom;
    const focusX = preserveCenter
      ? (frameWidth / 2 - imageX) / previousScale
      : orientedW / 2;
    const focusY = preserveCenter
      ? (frameHeight / 2 - imageY) / previousScale
      : orientedH / 2;

    zoom = clamp(nextZoom, minZoom, maxZoom);
    displayScale = getBaseScale() * zoom;
    imageX = frameWidth / 2 - focusX * displayScale;
    imageY = frameHeight / 2 - focusY * displayScale;
    applyBounds();
    modal.zoomSlider.value = `${zoom}`;
    updateZoomLabel();
    renderPreview();
  };

  const resetView = () => {
    zoom = 1;
    modal.zoomSlider.value = '1';
    updateZoomLabel();
    syncFrameMetrics();
    displayScale = getBaseScale() * zoom;
    imageX = (frameWidth - orientedW * displayScale) / 2;
    imageY = (frameHeight - orientedH * displayScale) / 2;
    applyBounds();
    renderPreview();
  };

  const refreshOrientation = () => {
    orientedCanvas = createOrientedCanvas({ sourceImage, rotation, mirrored });
    orientedW = orientedCanvas.width;
    orientedH = orientedCanvas.height;
    resetView();
  };

  const teardown = () => {
    modal.root.classList.remove('is-open');
    modal.root.setAttribute('aria-hidden', 'true');
    modal.viewport.classList.remove('is-dragging');
    document.body.style.overflow = previousBodyOverflow;

    modal.viewport.removeEventListener('pointerdown', onPointerDown);
    modal.viewport.removeEventListener('pointermove', onPointerMove);
    modal.viewport.removeEventListener('pointerup', onPointerUp);
    modal.viewport.removeEventListener('pointercancel', onPointerUp);
    modal.zoomSlider.removeEventListener('input', onZoomSliderInput);
    modal.zoomInBtn.removeEventListener('click', onZoomIn);
    modal.zoomOutBtn.removeEventListener('click', onZoomOut);
    modal.rotateButtons.forEach((button) => {
      button.removeEventListener('click', onRotateClick);
    });
    modal.mirrorBtn.removeEventListener('click', onMirrorToggle);
    modal.closeBtn.removeEventListener('click', onCancel);
    modal.cancelBtn.removeEventListener('click', onCancel);
    modal.applyBtn.removeEventListener('click', onApply);
    modal.root.removeEventListener('click', onBackdropClick);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
  };

  const settle = (callback) => {
    if (settled) return;
    settled = true;
    teardown();
    callback();
  };

  const onApply = () => {
    const sw = Math.min(orientedW, frameWidth / displayScale);
    const sh = Math.min(orientedH, frameHeight / displayScale);
    const sx = clamp((-imageX) / displayScale, 0, Math.max(0, orientedW - sw));
    const sy = clamp((-imageY) / displayScale, 0, Math.max(0, orientedH - sh));
    settle(() => resolve({
      cropSource: orientedCanvas,
      sx,
      sy,
      sw,
      sh
    }));
  };

  const onCancel = () => {
    settle(() => reject(createCropCancelledError()));
  };

  const onBackdropClick = (event) => {
    if (event.target === modal.root) {
      onCancel();
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    draggingPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragImageStartX = imageX;
    dragImageStartY = imageY;
    modal.viewport.classList.add('is-dragging');
    modal.viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (draggingPointerId !== event.pointerId) return;
    imageX = dragImageStartX + (event.clientX - dragStartX);
    imageY = dragImageStartY + (event.clientY - dragStartY);
    applyBounds();
    renderPreview();
  };

  const onPointerUp = (event) => {
    if (draggingPointerId !== event.pointerId) return;
    if (modal.viewport.hasPointerCapture(event.pointerId)) {
      modal.viewport.releasePointerCapture(event.pointerId);
    }
    modal.viewport.classList.remove('is-dragging');
    draggingPointerId = null;
  };

  const onResize = () => {
    const safeScale = displayScale > 0 ? displayScale : 1;
    const focusX = (frameWidth / 2 - imageX) / safeScale;
    const focusY = (frameHeight / 2 - imageY) / safeScale;
    syncFrameMetrics();
    displayScale = getBaseScale() * zoom;
    imageX = frameWidth / 2 - focusX * displayScale;
    imageY = frameHeight / 2 - focusY * displayScale;
    applyBounds();
    renderPreview();
  };

  const onZoomSliderInput = (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    setZoom(value, true);
  };

  const onZoomIn = () => {
    setZoom(zoom + zoomStep, true);
  };

  const onZoomOut = () => {
    setZoom(zoom - zoomStep, true);
  };

  const onRotateClick = (event) => {
    const value = Number(event.currentTarget.dataset.rotation);
    if (!Number.isFinite(value)) return;
    rotation = value;
    modal.rotateButtons.forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.rotation) === rotation);
    });
    refreshOrientation();
  };

  const onMirrorToggle = () => {
    mirrored = !mirrored;
    modal.mirrorBtn.classList.toggle('is-active', mirrored);
    modal.mirrorBtn.setAttribute('aria-pressed', mirrored ? 'true' : 'false');
    modal.mirrorBtn.textContent = mirrored ? 'Horizontal: ON' : 'Horizontal: OFF';
    refreshOrientation();
  };

  modal.viewport.addEventListener('pointerdown', onPointerDown);
  modal.viewport.addEventListener('pointermove', onPointerMove);
  modal.viewport.addEventListener('pointerup', onPointerUp);
  modal.viewport.addEventListener('pointercancel', onPointerUp);
  modal.zoomSlider.addEventListener('input', onZoomSliderInput);
  modal.zoomInBtn.addEventListener('click', onZoomIn);
  modal.zoomOutBtn.addEventListener('click', onZoomOut);
  modal.rotateButtons.forEach((button) => {
    button.addEventListener('click', onRotateClick);
  });
  modal.mirrorBtn.addEventListener('click', onMirrorToggle);
  modal.closeBtn.addEventListener('click', onCancel);
  modal.cancelBtn.addEventListener('click', onCancel);
  modal.applyBtn.addEventListener('click', onApply);
  modal.root.addEventListener('click', onBackdropClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  requestAnimationFrame(() => {
    resetView();
    modal.applyBtn.focus();
  });
});

export const cropAndCompressImageToDataURL = async (file, opts = {}) => {
  const targetW = Number(opts.targetWidth ?? 356);
  const targetH = Number(opts.targetHeight ?? 200);
  const maxBytes = Number(opts.maxBytes ?? 800 * 1024);
  const mimeType = opts.mimeType ?? 'image/jpeg';
  const useManualCrop = opts.enableManualCrop !== false;

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
  let cropSource = img;

  const cropRect = useManualCrop
    ? await requestManualCropRect({ sourceImage: img, targetW, targetH })
    : centerCropRect({ srcW, srcH, targetW, targetH });

  if (cropRect.cropSource) {
    cropSource = cropRect.cropSource;
  }

  const { sx, sy, sw, sh } = cropRect;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('No se pudo inicializar canvas.');

  // Favor quality on downscale
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cropSource, sx, sy, sw, sh, 0, 0, targetW, targetH);

  // If toBlob is unavailable, fallback to data URL encoding directly from canvas.
  if (typeof canvas.toBlob !== 'function') {
    return canvas.toDataURL(mimeType, 0.9);
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
