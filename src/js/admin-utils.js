export const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = (err) => reject(err);
  reader.readAsDataURL(file);
});

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
