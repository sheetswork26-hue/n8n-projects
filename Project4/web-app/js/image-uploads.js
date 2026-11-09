import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from './config.js';

/**
 * مدير صور متعدد: الملفات الجديدة التي سترفع إلى R2 + الصور القديمة المسترجعة من API.
 * الصور القديمة لا يعاد رفعها؛ نرسل IDs الصور التي احتفظ المستخدم بها فقط.
 */
// ضغط الصور الكبيرة في المتصفح قبل رفعها إلى n8n.
// WebP يدعم الشفافية ويقلل حجم صور الكيك والإيصالات.
async function prepareImageForUpload(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const maxEdge = 1800;
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxEdge / longestEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const needsCompression = scale < 1 || file.size > 450 * 1024;
    if (!needsCompression) return file;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.84));
    if (!blob || blob.type !== 'image/webp') return file;
    if (scale === 1 && blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: file.lastModified
    });
  } catch (error) {
    console.warn(`Image compression skipped for ${file.name}:`, error);
    return file;
  } finally {
    bitmap?.close?.();
  }
}

export function setupMultiImagePicker({ input, gallery, error, label, loadExistingImage = null }) {
  let files = [];
  let existingImages = [];
  let existingPreviewUrls = new Map();
  let renderVersion = 0;

  input.multiple = true;
  input.addEventListener('change', () => {
    const incoming = [...(input.files || [])];
    const invalid = incoming.find(file => !ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE);
    if (invalid) {
      error.textContent = !ALLOWED_IMAGE_TYPES.includes(invalid.type)
        ? `${label}: اختار صور JPG أو PNG أو WEBP فقط.`
        : `${label}: حجم كل صورة لازم يكون 8 ميجابايت أو أقل.`;
      error.hidden = false;
      input.value = '';
      syncInput();
      return;
    }

    error.textContent = '';
    error.hidden = true;
    const seen = new Set(files.map(file => `${file.name}:${file.size}:${file.lastModified}`));
    for (const file of incoming) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (!seen.has(key)) { files.push(file); seen.add(key); }
    }
    syncInput();
    render();
  });

  function syncInput() {
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
  }

  function releaseExistingPreview(id) {
    const url = existingPreviewUrls.get(String(id));
    if (url) URL.revokeObjectURL(url);
    existingPreviewUrls.delete(String(id));
  }

  function render() {
    const version = ++renderVersion;
    gallery.replaceChildren();
    const allHidden = files.length === 0 && existingImages.length === 0;
    gallery.hidden = allHidden;
    const wrapper = gallery.closest('.image-preview-wrap, .edit-image-preview');
    if (wrapper) wrapper.hidden = allHidden;

    existingImages.forEach(imageInfo => {
      const card = document.createElement('div');
      card.className = 'image-thumb existing-image-thumb';
      const image = document.createElement('img');
      image.alt = `${label} محفوظة`;
      image.loading = 'lazy';
      const cachedUrl = existingPreviewUrls.get(String(imageInfo.id));
      if (cachedUrl) {
        image.src = cachedUrl;
      } else if (typeof loadExistingImage === 'function') {
        loadExistingImage(imageInfo).then(url => {
          if (!url) throw new Error('Empty image preview URL');
          if (version !== renderVersion || !existingImages.some(item => String(item.id) === String(imageInfo.id))) {
            URL.revokeObjectURL(url);
            return;
          }
          existingPreviewUrls.set(String(imageInfo.id), url);
          image.src = url;
        }).catch(() => {
          image.alt = 'تعذر تحميل معاينة الصورة';
          caption.textContent = `${imageInfo.fileName || 'صورة'} — تعذر تحميل المعاينة`;
        });
      } else {
        image.alt = 'معاينة الصورة غير متاحة';
      }

      const caption = document.createElement('span');
      caption.textContent = imageInfo.fileName || 'صورة محفوظة';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'استبعاد';
      remove.className = 'remove-image-button';
      remove.setAttribute('aria-label', `استبعاد ${imageInfo.fileName || 'الصورة'}`);
      remove.addEventListener('click', () => {
        existingImages = existingImages.filter(item => String(item.id) !== String(imageInfo.id));
        releaseExistingPreview(imageInfo.id);
        render();
      });
      card.append(image, caption, remove);
      gallery.append(card);
    });

    files.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'image-thumb new-image-thumb';
      const image = document.createElement('img');
      image.alt = `${label} ${index + 1}`;
      const url = URL.createObjectURL(file);
      image.src = url;
      image.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
      image.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
      const caption = document.createElement('span');
      caption.textContent = `${file.name} — جديد`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'حذف';
      remove.className = 'remove-image-button';
      remove.addEventListener('click', () => {
        files.splice(index, 1);
        syncInput();
        render();
      });
      card.append(image, caption, remove);
      gallery.append(card);
    });
  }

  return {
    getFiles: () => [...files],
    getExistingImages: () => existingImages.map(item => ({ ...item })),
    getExistingImageIds: () => existingImages.map(item => String(item.id)),
    setExistingImages(images = []) {
      for (const id of existingPreviewUrls.keys()) URL.revokeObjectURL(existingPreviewUrls.get(id));
      existingPreviewUrls.clear();
      existingImages = Array.isArray(images) ? images.filter(item => item?.id !== undefined && item?.id !== null).map(item => ({ ...item })) : [];
      render();
    },
    async appendTo(formData, prefix) {
      let originalBytes = 0;
      let uploadedBytes = 0;
      for (let index = 0; index < files.length; index += 1) {
        const original = files[index];
        originalBytes += original.size;
        const optimized = await prepareImageForUpload(original);
        uploadedBytes += optimized.size;
        formData.append(`${prefix}_${index + 1}`, optimized, optimized.name);
      }
      return { originalBytes, uploadedBytes };
    },
    clear() {
      files = [];
      existingImages = [];
      for (const url of existingPreviewUrls.values()) URL.revokeObjectURL(url);
      existingPreviewUrls.clear();
      syncInput();
      render();
      error.hidden = true;
      error.textContent = '';
    }
  };
}

export function validateMultiImagePickers(pickers) {
  return pickers.every(picker => picker.getFiles().every(file =>
    ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_SIZE
  ));
}
