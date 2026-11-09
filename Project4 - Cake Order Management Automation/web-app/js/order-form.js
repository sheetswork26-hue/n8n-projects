/**
 * نقطة تشغيل نموذج الطلب وربط الأحداث بين عناصر الصفحة.
 * تفاصيل الإعدادات والتسعير والتحقق والملخص موجودة في ملفات منفصلة.
 */
import { AREAS, CAKE_OPTIONS, WEBHOOK_URL } from './config.js';
import { appendMultipartFields } from './multipart.js';
import {
  form, nameInput, phoneInput, city, area, addressDetails, fulfillmentMethod,
  deliveryAddressFields, deliveryDate, deliveryTimeFrom, deliveryTimeTo,
  moderatorName, discountType, discountValueField, discountValue,
  discountValueLabel, discountError, cakeType, cakeSize, sizeHint,
  basePriceNote, cakeBasePriceDisplay, cakeDesignExtraEGP, deliveryNotice, detailsInput, fillingError, coveringError,
  statusEl, submitBtn, orderSummary, summaryText, copySummaryBtn, copyStatus,
  cakeImageInput, cakeImageGallery, imagePreviewWrap, cakeImageError,
  depositImageInput, depositImageGallery, depositImagePreviewWrap, depositImageError,
  depositEGPInput, remainingEGPDisplay,
  addOnsList, addAddonBtn, addOnsTotalDisplay,
  clearError, setError, getTodayISODate, formatTime
} from './dom.js';
import { getSelectedAreaPolicy, getSelectedCakeSize, calculateOrderTotals } from './pricing.js';
import { validateForm } from './validation.js';
import { makeOrderSummary, renderOrderSummary } from './summary.js';
import { toApiOrder } from './localization.js';
import { generateOrderCode } from './order-code.js';
import { setupMultiImagePicker, validateMultiImagePickers } from './image-uploads.js';
import { initAddOns } from './add-ons.js';

let cakeImagesPicker;
let depositImagesPicker;
let addOnsController;
let latestOrderSummaryText = '';

initializeForm();

function initializeForm() {
  bindImageUploadEvents();
  addOnsController = initAddOns({ container: addOnsList, addButton: addAddonBtn, onChange: updateAddOnsDisplay });
  bindDeliveryEvents();
  bindCakeSelectionEvents();
  bindDiscountEvents();
  bindDepositEvents();
  bindValidationFeedback();
  bindSummaryCopyEvent();
  bindSubmitEvent();

  deliveryDate.min = getTodayISODate();
  setupTimeOptions();
  updateDiscountControls();
  updateDepositDisplay();
  updateFulfillmentFields();
}

// -----------------------------------------------------------------------------
// صور متعددة للكيكة وإيصال الديبوزيت
// -----------------------------------------------------------------------------
function bindImageUploadEvents() {
  cakeImagesPicker = setupMultiImagePicker({
    input: cakeImageInput, gallery: cakeImageGallery, error: cakeImageError,
    label: 'صور الكيكة'
  });
  depositImagesPicker = setupMultiImagePicker({
    input: depositImageInput, gallery: depositImageGallery, error: depositImageError,
    label: 'صور إيصال الديبوزيت'
  });
}

function updateAddOnsDisplay() {
  const total = addOnsController?.getTotal() || 0;
  addOnsTotalDisplay.textContent = `${total.toLocaleString('ar-EG')} جنيه`;
  updateDepositDisplay();
}

// -----------------------------------------------------------------------------
// التوصيل والاستلام ومواعيد التسليم
// -----------------------------------------------------------------------------
function bindDeliveryEvents() {
  city.addEventListener('change', populateAreas);
  area.addEventListener('change', () => {
    clearError(area);
    updateDeliveryNotice();
    updateDepositDisplay();
  });

  deliveryTimeFrom.addEventListener('change', () => {
    updateEndTimeOptions();
    clearError(deliveryTimeFrom);
    clearError(deliveryTimeTo);
  });
  deliveryTimeTo.addEventListener('change', () => clearError(deliveryTimeTo));
  deliveryDate.addEventListener('change', validateSelectedDate);
  fulfillmentMethod.addEventListener('change', () => { updateFulfillmentFields(); updateDepositDisplay(); });
}

function populateAreas() {
  const areaOptions = AREAS[city.value] || [];

  area.replaceChildren(new Option(city.value ? 'اختار المنطقة' : 'اختار المحافظة الأول', ''));
  areaOptions.forEach(item => area.add(new Option(item.name, item.name)));
  area.disabled = !city.value;
  deliveryNotice.textContent = '';
  clearError(area);
  updateDepositDisplay();
}

function updateDeliveryNotice() {
  const policy = getSelectedAreaPolicy();
  if (!policy) {
    deliveryNotice.textContent = '';
    return;
  }

  deliveryNotice.textContent = [200, 250].includes(policy.fee)
    ? 'ميعاد التوصيل بيكون خلال فترة زمنية متفق عليها، ومش مضمون في ساعة محددة.'
    : '';
}

function setupTimeOptions() {
  deliveryTimeFrom.replaceChildren(new Option('اختار وقت البداية', ''));
  for (let hour = 10; hour <= 18; hour += 1) {
    deliveryTimeFrom.add(new Option(formatTime(hour), `${String(hour).padStart(2, '0')}:00`));
  }
  deliveryTimeFrom.add(new Option('آخر معاد', 'last'));
  updateEndTimeOptions();
}

function updateEndTimeOptions() {
  const startValue = deliveryTimeFrom.value;
  const endField = deliveryTimeTo.closest('.field');
  const isLastTime = startValue === 'last';

  endField.hidden = isLastTime;
  deliveryTimeTo.replaceChildren(new Option(
    startValue && !isLastTime ? 'اختار ميعاد النهاية' : 'اختار ميعاد البداية الأول',
    ''
  ));

  if (!startValue || isLastTime) {
    deliveryTimeTo.disabled = true;
    deliveryTimeTo.required = false;
    deliveryTimeTo.value = '';
    return;
  }

  const startHour = Number(startValue.slice(0, 2));
  for (let hour = startHour + 2; hour <= 20; hour += 1) {
    deliveryTimeTo.add(new Option(formatTime(hour), `${String(hour).padStart(2, '0')}:00`));
  }

  deliveryTimeTo.disabled = false;
  deliveryTimeTo.required = true;
}

function validateSelectedDate() {
  clearError(deliveryDate);
  if (deliveryDate.value && deliveryDate.value < getTodayISODate()) {
    // نتحقق عند التغيير ومرة أخرى عند إرسال الطلب.
    setError(deliveryDate, 'مينفعش تختار يوم سابق.');
  }
}

function updateFulfillmentFields() {
  const isDelivery = fulfillmentMethod.value === 'delivery';
  deliveryAddressFields.hidden = !isDelivery;

  [city, area, addressDetails].forEach(element => {
    element.required = isDelivery;
    element.disabled = !isDelivery || (element === area && !city.value);
    if (!isDelivery) clearError(element);
  });

  // موعد الاستلام مطلوب سواء كان الطلب توصيلًا أو استلامًا من المكان.
  deliveryDate.required = true;
  deliveryDate.disabled = false;
  deliveryTimeFrom.required = true;
  deliveryTimeFrom.disabled = false;
  deliveryTimeTo.disabled = !deliveryTimeFrom.value || deliveryTimeFrom.value === 'last';
  deliveryTimeTo.required = Boolean(deliveryTimeFrom.value && deliveryTimeFrom.value !== 'last');

  if (!isDelivery) {
    city.value = '';
    area.replaceChildren(new Option('اختار المحافظة الأول', ''));
    area.disabled = true;
    addressDetails.value = '';
    deliveryNotice.textContent = '';
  }
}

// -----------------------------------------------------------------------------
// نوع الكيكة وحجمها
// -----------------------------------------------------------------------------
function bindCakeSelectionEvents() {
  cakeType.addEventListener('change', () => {
    cakeDesignExtraEGP.value = '0';
    updateCakeSizeOptions();
    updateDepositDisplay();
  });
  cakeSize.addEventListener('change', () => {
    cakeDesignExtraEGP.value = '0';
    updateSelectedSizeNote();
    updateDepositDisplay();
  });
  cakeDesignExtraEGP.addEventListener('input', updateAddOnsDisplay);
  cakeDesignExtraEGP.addEventListener('input', updateDepositDisplay);
}

function updateCakeSizeOptions() {
  const options = CAKE_OPTIONS[cakeType.value] || [];
  cakeSize.replaceChildren(new Option(
    options.length ? 'اختار الحجم المتاح' : 'اختار نوع الكيكة الأول',
    ''
  ));
  options.forEach(item => cakeSize.add(new Option(item.label, item.value)));
  cakeSize.disabled = options.length === 0;
  sizeHint.textContent = cakeType.value === 'italian'
    ? 'عدد الأشخاص لكيكة الإيطالي غير محدد.'
    : 'اختار حجمًا من الأحجام المتاحة.';
  basePriceNote.textContent = 'السعر الأساسي ثابت حسب النوع والحجم، ويمكن إضافة تكلفة اختيارية للتصميم.';
  cakeBasePriceDisplay.value = '';
  clearError(cakeType);
  clearError(cakeSize);
}

function updateSelectedSizeNote() {
  const selectedSize = getSelectedCakeSize();
  if (!selectedSize) {
    basePriceNote.textContent = 'اختار نوع الكيكة والحجم لعرض السعر الأساسي الثابت.';
    cakeBasePriceDisplay.value = '';
    clearError(cakeSize);
    return;
  }

  const details = [
    selectedSize.persons ? `عدد الأشخاص التقريبي: ${selectedSize.persons}.` : '',
    selectedSize.dimensions ? `المقاس: ${selectedSize.dimensions}.` : '',
    selectedSize.shape ? `الشكل: ${selectedSize.shape}.` : '',
    selectedSize.note || ''
  ].filter(Boolean);

  cakeBasePriceDisplay.value = String(selectedSize.price);
  basePriceNote.textContent = `السعر الأساسي الثابت: ${Number(selectedSize.price).toLocaleString('ar-EG')} جنيه. ${details.join(' ')}`;
  clearError(cakeSize);
}

// -----------------------------------------------------------------------------
// الخصم
// -----------------------------------------------------------------------------
function bindDiscountEvents() {
  discountType.addEventListener('change', updateDiscountControls);
  discountValue.addEventListener('input', () => {
    discountError.hidden = true;
    discountError.textContent = '';
    discountValue.removeAttribute('aria-invalid');
    updateDepositDisplay();
  });
}

function updateDiscountControls() {
  const isDiscountEnabled = discountType.value !== 'none';
  discountValueField.hidden = !isDiscountEnabled;
  discountValue.disabled = !isDiscountEnabled;
  discountValue.required = isDiscountEnabled;
  discountValueLabel.textContent = discountType.value === 'percentage'
    ? 'نسبة الخصم (%)'
    : 'قيمة الخصم بالجنيه';
  discountValue.placeholder = discountType.value === 'percentage' ? 'مثال: 10' : 'مثال: 100';
  discountError.hidden = true;
  discountError.textContent = '';
  discountValue.removeAttribute('aria-invalid');
  updateDepositDisplay();
}

// -----------------------------------------------------------------------------
// الديبوزيت والمتبقي
// -----------------------------------------------------------------------------
function bindDepositEvents() {
  depositEGPInput.addEventListener('input', updateDepositDisplay);
  depositEGPInput.addEventListener('change', updateDepositDisplay);
}

function updateDepositDisplay() {
  const deposit = Math.max(0, Number(depositEGPInput.value) || 0);
  const addOnsTotal = addOnsController?.getTotal() || 0;
  const cakeDesignExtra = Math.max(0, Number(cakeDesignExtraEGP.value) || 0);
  const totals = calculateOrderTotals(addOnsTotal, cakeDesignExtra);
  const remaining = Math.max(0, totals.totalOrderEGP - deposit);
  remainingEGPDisplay.value = `${remaining.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} جنيه`;
}

// -----------------------------------------------------------------------------
// تحسين تجربة التحقق من الحقول
// -----------------------------------------------------------------------------
function bindValidationFeedback() {
  form.querySelectorAll('input:not([type="radio"]), select, textarea').forEach(element => {
    if (element === deliveryDate) {
      element.addEventListener('input', () => clearError(element));
      return; // حدث change الخاص بالتاريخ يتحقق من القيمة قبل مسح الخطأ.
    }
    element.addEventListener('input', () => clearError(element));
    element.addEventListener('change', () => clearError(element));
  });

  form.querySelectorAll('input[name="filling"]').forEach(element => {
    element.addEventListener('change', () => { fillingError.hidden = true; });
  });
  form.querySelectorAll('input[name="covering"]').forEach(element => {
    element.addEventListener('change', () => { coveringError.hidden = true; });
  });
}

// -----------------------------------------------------------------------------
// تجهيز البيانات وملخص الطلب
// -----------------------------------------------------------------------------
function getOrderPayload(orderCode) {
  const selectedSize = getSelectedCakeSize();
  const addOns = addOnsController?.getAddOns() || [];
  const cakeDesignExtra = Math.max(0, Number(cakeDesignExtraEGP.value) || 0);
  const totals = calculateOrderTotals(addOnsController?.getTotal() || 0, cakeDesignExtra);
  const selectedFilling = form.querySelector('input[name="filling"]:checked');
  const selectedCovering = form.querySelector('input[name="covering"]:checked');

  return {
    orderCode,
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    moderatorName: moderatorName.value,
    fulfillmentMethod: fulfillmentMethod.value,
    city: fulfillmentMethod.value === 'delivery' ? city.value : null,
    area: fulfillmentMethod.value === 'delivery' ? area.value : null,
    addressDetails: fulfillmentMethod.value === 'delivery' ? addressDetails.value.trim() : null,
    deliveryDate: deliveryDate.value,
    deliveryTimeFrom: deliveryTimeFrom.value,
    deliveryTimeTo: deliveryTimeFrom.value === 'last' ? null : deliveryTimeTo.value,
    cakeType: cakeType.value,
    cakeSize: cakeSize.value,
    dimensions: selectedSize?.dimensions || null,
    numberOfTiers: getNumberOfTiers(cakeType.value),
    basePriceEGP: selectedSize?.price ?? 0,
    cakeDesignExtraEGP: cakeDesignExtra,
    addOns,
    addOnsTotalEGP: totals.addOnsTotalEGP,
    deliveryFeeEGP: totals.deliveryFee,
    discountType: totals.discountType,
    discountInputValue: totals.discountInputValue,
    discountAmountEGP: totals.discountAmountEGP,
    totalOrderEGP: totals.totalOrderEGP,
    depositEGP: Math.max(0, Number(depositEGPInput.value) || 0),
    remainingEGP: Math.max(0, totals.totalOrderEGP - Math.max(0, Number(depositEGPInput.value) || 0)),
    filling: selectedFilling?.value || null,
    covering: selectedCovering?.value || null,
    details: detailsInput.value.trim(),
    submittedAt: new Date().toISOString()
  };
}

function getNumberOfTiers(type) {
  const tierCountByType = {
    single_tier: 1,
    two_tier: 2,
    three_tier: 3
  };
  return tierCountByType[type] ?? null;
}

// -----------------------------------------------------------------------------
// نسخ ملخص الطلب
// -----------------------------------------------------------------------------
function bindSummaryCopyEvent() {
  copySummaryBtn.addEventListener('click', copyOrderSummary);
}

async function copyOrderSummary() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(latestOrderSummaryText);
    } else {
      copySummaryUsingFallback();
    }
    copyStatus.textContent = 'تم النسخ بنجاح ✓';
    copyStatus.className = 'copy-status success';
  } catch (error) {
    copyStatus.textContent = 'تعذر النسخ تلقائيًا. حدّد الملخص وانسخه يدويًا.';
    copyStatus.className = 'copy-status failure';
  }
}

function copySummaryUsingFallback() {
  const temporaryTextarea = document.createElement('textarea');
  temporaryTextarea.value = latestOrderSummaryText;
  temporaryTextarea.style.position = 'fixed';
  temporaryTextarea.style.opacity = '0';
  document.body.appendChild(temporaryTextarea);
  temporaryTextarea.select();
  const copied = document.execCommand('copy');
  temporaryTextarea.remove();
  if (!copied) throw new Error('Clipboard copy was not available');
}

// -----------------------------------------------------------------------------
// إرسال الطلب إلى n8n
// -----------------------------------------------------------------------------
function bindSubmitEvent() {
  form.addEventListener('submit', submitOrder);
}

async function submitOrder(event) {
  event.preventDefault();
  resetSubmissionFeedback();

  if (!validateImageBeforeSubmit()) return;

  if (!validateForm() || !validateDepositAmount()) {
    statusEl.textContent = 'راجع البيانات المطلوبة والمحددة بالأعلى.';
    statusEl.classList.add('failure');
    form.querySelector('[aria-invalid="true"]')?.focus({ preventScroll: true });
    return;
  }

  const orderCode = generateOrderCode();
  const order = getOrderPayload(orderCode);
  latestOrderSummaryText = makeOrderSummary(order);
  renderOrderSummary(order, summaryText);
  orderSummary.hidden = false;
  copyStatus.textContent = '';
  setSubmittingState(true);

  try {
    await sendOrder(order);
    statusEl.textContent = 'تم إرسال الطلب. تقدر تراجع ملخص الطلب وتنسخه من الأسفل.';
    statusEl.classList.add('success');
  } catch (error) {
    statusEl.textContent = 'الملخص جاهز، لكن لم نتمكن من تأكيد إرسال الطلب. تأكد من إعدادات Webhook وCORS في n8n.';
    statusEl.classList.add('failure');
    console.error('Order submission failed:', error);
  } finally {
    setSubmittingState(false);
    orderSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function resetSubmissionFeedback() {
  latestOrderSummaryText = '';
  orderSummary.hidden = true;
  summaryText.replaceChildren();
  statusEl.className = 'status';
  statusEl.textContent = '';
  copyStatus.textContent = '';
}

function validateImageBeforeSubmit() {
  // صورة الكيكة مطلوبة في كل طلب جديد، بينما صور إيصال الديبوزيت اختيارية.
  if (cakeImagesPicker.getFiles().length === 0) {
    cakeImageError.textContent = 'لازم ترفع صورة واحدة على الأقل للكيكة قبل إرسال الطلب.';
    cakeImageError.hidden = false;
    statusEl.textContent = 'إضافة صورة الكيكة مطلوبة لإكمال الطلب.';
    statusEl.classList.add('failure');
    cakeImageInput.focus({ preventScroll: true });
    cakeImageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  if (!cakeImageError.hidden || !depositImageError.hidden) {
    statusEl.textContent = 'راجع الصور المرفوعة؛ لازم تكون JPG أو PNG أو WEBP وبحد أقصى 8 ميجابايت للصورة.';
    statusEl.classList.add('failure');
    return false;
  }
  return validateMultiImagePickers([cakeImagesPicker, depositImagesPicker]);
}

function validateDepositAmount() {
  const deposit = Number(depositEGPInput.value || 0);
  const total = calculateOrderTotals(
    addOnsController?.getTotal() || 0,
    Math.max(0, Number(cakeDesignExtraEGP.value) || 0)
  ).totalOrderEGP;
  clearError(depositEGPInput);
  if (!Number.isFinite(deposit) || deposit < 0) {
    setError(depositEGPInput, 'اكتب قيمة ديبوزيت صحيحة أكبر من أو تساوي صفر.');
    return false;
  }
  const hasDepositReceipt = depositImagesPicker.getFiles().length > 0;
  if (hasDepositReceipt && deposit <= 0) {
    setError(depositEGPInput, 'بما إنك أضفت صورة إيصال، لازم تكتب قيمة الديبوزيت المدفوعة.');
    return false;
  }
  if (deposit > total) {
    setError(depositEGPInput, 'قيمة الديبوزيت مينفعش تكون أكبر من إجمالي الطلب.');
    return false;
  }
  return true;
}

function setSubmittingState(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  submitBtn.textContent = isSubmitting ? 'جاري تجهيز وإرسال الطلب…' : 'إرسال طلب الكيكة ←';
}

async function sendOrder(order) {
  // كل خاصية تُرسل كحقل مستقل. الحقول المركبة فقط (مثل addOns) تُرسل JSON string.
  const apiOrder = toApiOrder(order, latestOrderSummaryText);
  const formData = new FormData();
  appendMultipartFields(formData, apiOrder);

  statusEl.textContent = 'جاري تجهيز وضغط الصور قبل الرفع…';
  const cakeStats = await cakeImagesPicker.appendTo(formData, 'cakeImage');
  const depositStats = await depositImagesPicker.appendTo(formData, 'depositImage');
  const originalBytes = cakeStats.originalBytes + depositStats.originalBytes;
  const uploadedBytes = cakeStats.uploadedBytes + depositStats.uploadedBytes;
  if (originalBytes > 0) {
    const savedPercent = Math.max(0, Math.round((1 - uploadedBytes / originalBytes) * 100));
    console.info(`Image upload preparation: ${(originalBytes / 1024 / 1024).toFixed(2)} MB → ${(uploadedBytes / 1024 / 1024).toFixed(2)} MB (${savedPercent}% smaller)`);
  }
  statusEl.textContent = 'تم تجهيز الصور. جاري رفع الطلب…';

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    body: formData
  });

  const responseText = await response.text();
  let result = {};
  if (responseText) {
    try { result = JSON.parse(responseText); }
    catch { throw new Error('الرد من n8n ليس JSON صالحًا. راجع Respond to Webhook.'); }
  }
  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Webhook returned HTTP ${response.status}`);
  }
  return result;
}
