/**
 * مراجع عناصر الصفحة والدوال العامة الخاصة بالتعامل مع الـ DOM.
 * الهدف: تجميع الوصول للعناصر ورسائل الأخطاء في مكان واحد.
 */

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required HTML element was not found: #${id}`);
  }
  return element;
}

export const form = getElement('orderForm');
export const nameInput = getElement('name');
export const phoneInput = getElement('phone');
export const city = getElement('city');
export const area = getElement('area');
export const addressDetails = getElement('addressDetails');
export const fulfillmentMethod = getElement('fulfillmentMethod');
export const deliveryAddressFields = getElement('deliveryAddressFields');
export const deliveryDate = getElement('deliveryDate');
export const deliveryTimeFrom = getElement('deliveryTimeFrom');
export const deliveryTimeTo = getElement('deliveryTimeTo');
export const moderatorName = getElement('moderatorName');
export const discountType = getElement('discountType');
export const discountValueField = getElement('discountValueField');
export const discountValue = getElement('discountValue');
export const discountValueLabel = getElement('discountValueLabel');
export const discountError = getElement('discountError');
export const cakeType = getElement('cakeType');
export const cakeSize = getElement('cakeSize');
export const sizeHint = getElement('sizeHint');
export const basePriceNote = getElement('basePriceNote');
export const cakeBasePriceDisplay = getElement('cakeBasePriceDisplay');
export const cakeDesignExtraEGP = getElement('cakeDesignExtraEGP');
export const deliveryNotice = getElement('deliveryNotice');
export const detailsInput = getElement('details');
export const fillingError = getElement('fillingError');
export const coveringError = getElement('coveringError');
export const statusEl = getElement('status');
export const submitBtn = getElement('submitBtn');
export const orderSummary = getElement('orderSummary');
export const summaryText = getElement('summaryText');
export const copySummaryBtn = getElement('copySummaryBtn');
export const copyStatus = getElement('copyStatus');
export const cakeImageInput = getElement('cakeImage');
export const cakeImageGallery = getElement('cakeImageGallery');
export const imagePreviewWrap = getElement('imagePreviewWrap');
export const cakeImageError = getElement('cakeImageError');
export const depositEGPInput = getElement('depositEGP');
export const remainingEGPDisplay = getElement('remainingEGP');
export const depositImageInput = getElement('depositImage');
export const depositImageGallery = getElement('depositImageGallery');
export const depositImagePreviewWrap = getElement('depositImagePreviewWrap');
export const depositImageError = getElement('depositImageError');

/** يعرض رسالة خطأ ويربطها بالحقل. */
export function setError(element, message) {
  element.setAttribute('aria-invalid', 'true');
  const error = element.parentElement?.querySelector('.error');
  if (!error) return;

  error.textContent = message;
  error.hidden = false;
}

/** يمسح رسالة الخطأ من الحقل. */
export function clearError(element) {
  element.removeAttribute('aria-invalid');
  const error = element.parentElement?.querySelector('.error');
  if (!error) return;

  error.textContent = '';
  error.hidden = true;
}

/** يرجّع تاريخ اليوم بالتوقيت المحلي بصيغة YYYY-MM-DD. */
export function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** يحوّل الساعة بنظام 24 ساعة إلى نص عربي. */
export function formatTime(hour) {
  if (hour === 12) return '12 ظهرًا';
  if (hour < 12) return `${hour} صباحًا`;
  return `${hour - 12} مساءً`;
}

/** ينسّق المبلغ بالجنيه المصري. */
export function formatEGP(value) {
  const amount = Number(value) || 0;
  return `${amount.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} جنيه`;
}

export const addOnsList = getElement('addOnsList');
export const addAddonBtn = getElement('addAddonBtn');
export const addOnsTotalDisplay = getElement('addOnsTotalDisplay');
