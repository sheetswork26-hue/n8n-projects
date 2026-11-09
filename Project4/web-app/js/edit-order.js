/** صفحة البحث عن طلب وتعديله عبر API موحد في n8n + PostgreSQL + Cloudflare R2. */
import { AREAS, CAKE_OPTIONS, CAKE_TYPE_LABELS, PHONE_REGEX, GET_ORDER_WEBHOOK_URL, UPDATE_ORDER_WEBHOOK_URL, GET_ORDER_IMAGE_WEBHOOK_URL } from './config.js';
import { appendMultipartFields } from './multipart.js';
import { toApiOrder, normalizeApiOrder, formatPayloadTime } from './localization.js';
import { initAddOns } from './add-ons.js';
import { setupMultiImagePicker } from './image-uploads.js';
import { makeOrderSummary } from './summary.js';

const $ = (id) => document.getElementById(id);
const lookupForm = $('lookupForm');
const editForm = $('editForm');
const lookupBtn = $('lookupBtn');
const saveBtn = $('saveBtn');
const lookupStatus = $('lookupStatus');
const saveStatus = $('saveStatus');
const deliveryFields = $('deliveryFields');
const city = $('city');
const area = $('area');
const fulfillmentMethod = $('fulfillmentMethod');
const deliveryDate = $('deliveryDate');
const deliveryTimeFrom = $('deliveryTimeFrom');
const deliveryTimeTo = $('deliveryTimeTo');
const deliveryTimeToField = $('deliveryTimeToField');
const cakeType = $('cakeType');
const cakeSize = $('cakeSize');
const discountType = $('discountType');
const discountInputValue = $('discountInputValue');
const basePriceEGP = $('basePriceEGP');
const cakeDesignExtraEGP = $('cakeDesignExtraEGP');
const deliveryFeeEGP = $('deliveryFeeEGP');
const discountAmountEGP = $('discountAmountEGP');
const totalOrderEGP = $('totalOrderEGP');
const addOnsTotalEGP = $('addOnsTotalEGP');
const addOnsList = $('addOnsList');
const addAddonBtn = $('addAddonBtn');
const addOnsTotalDisplay = $('addOnsTotalDisplay');
const depositEGP = $('depositEGP');
const remainingEGP = $('remainingEGP');
const filling = $('filling');
const covering = $('covering');
const orderIdInput = $('orderId');
const orderCodeInput = $('orderCode');
const originalPhoneInput = $('originalPhone');
const submittedAtInput = $('submittedAt');
const cakeImageInput = $('cakeImage');
const cakeImageGallery = $('cakeImageGallery');
const cakeImagePreviewWrap = $('cakeImagePreviewWrap');
const cakeImageError = $('cakeImageError');
const depositImageInput = $('depositImage');
const depositImageGallery = $('depositImageGallery');
const depositImagePreviewWrap = $('depositImagePreviewWrap');
const depositImageError = $('depositImageError');

let cakeImagesPicker;
let depositImagesPicker;
let addOnsController;
let originalOrder = null;
let loadingRecord = false;
let preserveLoadedPricing = true;

initialize();

function initialize() {
  // دعم فتح صفحة التعديل برابط يحتوي على بيانات البحث.
  // مثال: edit-order.html?orderCode=123456-c&phone=01000000000
  const searchParams = new URLSearchParams(window.location.search);
  const queryOrderCode = searchParams.get('orderCode');
  const queryPhone = searchParams.get('phone');
  if (queryOrderCode && !$('lookupCode').value) $('lookupCode').value = queryOrderCode.trim();
  if (queryPhone && !$('lookupPhone').value) $('lookupPhone').value = queryPhone.trim();

  deliveryDate.min = localISODate();
  setupStartTimes();
  city.addEventListener('change', () => { preserveLoadedPricing = false; populateAreas(''); });
  area.addEventListener('change', () => { preserveLoadedPricing = false; recalculateTotals(); });
  fulfillmentMethod.addEventListener('change', () => { preserveLoadedPricing = false; updateFulfillmentFields(); });
  deliveryTimeFrom.addEventListener('change', () => {
    updateEndTimes('');
  });
  cakeType.addEventListener('change', () => { preserveLoadedPricing = false; cakeDesignExtraEGP.value = '0'; populateCakeSizes(''); });
  cakeSize.addEventListener('change', () => { preserveLoadedPricing = false; cakeDesignExtraEGP.value = '0'; recalculateTotals(); });
  discountType.addEventListener('change', () => {
    if (discountType.value === 'none') discountInputValue.value = '0';
    recalculateTotals();
  });
  discountInputValue.addEventListener('input', recalculateTotals);
  cakeDesignExtraEGP.addEventListener('input', recalculateTotals);
  depositEGP.addEventListener('input', () => {
    // وجود عربون يفعّل حالة التأكيد تلقائيًا، مع بقاء الحالة قابلة للتغيير يدويًا بعد ذلك.
    const deposit = Math.max(0, Number(depositEGP.value) || 0);
    const status = $('orderStatus');
    if (deposit > 0) {
      status.value = 'تم التأكيد';
    } else if (status.value === 'تم التأكيد') {
      status.value = 'قيد التأكيد';
    }
    recalculateTotals();
  });
  lookupForm.addEventListener('submit', lookupOrder);
  editForm.addEventListener('submit', saveOrder);
  $('cancelBtn').addEventListener('click', closeOrder);
  cakeImagesPicker = setupMultiImagePicker({ input: cakeImageInput, gallery: cakeImageGallery, error: cakeImageError, label: 'صور الكيكة', loadExistingImage: loadExistingImagePreview });
  depositImagesPicker = setupMultiImagePicker({ input: depositImageInput, gallery: depositImageGallery, error: depositImageError, label: 'صور إيصال العربون', loadExistingImage: loadExistingImagePreview });
  addOnsController = initAddOns({ container: addOnsList, addButton: addAddonBtn, onChange: () => recalculateTotals() });
}

async function lookupOrder(event) {
  event.preventDefault();
  setStatus(lookupStatus, '', '');

  const orderCode = $('lookupCode').value.trim().toLowerCase();
  const phone = $('lookupPhone').value.trim();
  if (!/^\d{6}-c$/.test(orderCode)) {
    setStatus(lookupStatus, 'اكتب كود الطلب بالشكل 123456-c.', 'failure');
    return;
  }
  if (!PHONE_REGEX.test(phone)) {
    setStatus(lookupStatus, 'اكتب رقم موبايل مصري صحيح مكوّن من 11 رقم.', 'failure');
    return;
  }

  setLoading(lookupBtn, true, 'جاري البحث…', 'بحث عن الطلب');
  try {
    const response = await postForm(GET_ORDER_WEBHOOK_URL, { orderCode, phone });
    const result = await parseResponse(response);
    // يدعم شكل الـ API القياسي { success, order }، وكذلك الرد القديم
    // الذي يعيد حقول الطلب مباشرة في المستوى الرئيسي.
    const responseData = Array.isArray(result) ? result[0] : result;
    const orderPayload = responseData?.order
      ?? responseData?.data?.order
      ?? (responseData?.id !== undefined || responseData?.orderCode || responseData?.order_code ? responseData : null);

    // بعض إصدارات Workflow ترجع سجل PostgreSQL مباشرة أو داخل Array
    // بدون success/order wrapper؛ وجود سجل يحمل id يعتبر نتيجة بحث ناجحة.
    const lookupSucceeded = responseData?.success === true || Boolean(orderPayload?.id !== undefined);

    if (!response.ok || !lookupSucceeded || !orderPayload) {
      throw new Error(responseData?.message || 'لم يتم العثور على طلب مطابق للكود ورقم الموبايل.');
    }
    originalOrder = normalizeApiOrder(orderPayload);
    populateForm(originalOrder);
    editForm.hidden = false;
    setStatus(lookupStatus, 'تم العثور على الطلب. راجع البيانات قبل الحفظ.', 'success');
    editForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Order lookup failed:', error);
    setStatus(lookupStatus, error.message || 'تعذّر البحث عن الطلب. راجع Webhook وإعدادات CORS.', 'failure');
    editForm.hidden = true;
  } finally {
    setLoading(lookupBtn, false, 'جاري البحث…', 'بحث عن الطلب');
  }
}

function populateForm(row) {
  loadingRecord = true;
  preserveLoadedPricing = true;
  cakeImagesPicker.clear();
  depositImagesPicker.clear();
  orderIdInput.value = stringValue(row.id ?? row.orderId ?? row.order_id);
  orderCodeInput.value = stringValue(row.orderCode ?? row.order_code);
  originalPhoneInput.value = normalizeStoredPhone(stringValue(row.phone ?? row.customerPhone ?? row.customer_phone));
  $('visibleOrderCode').textContent = orderCodeInput.value;
  submittedAtInput.value = stringValue(row.submittedAt) || new Date().toISOString();
  $('name').value = stringValue(row.name);
  $('phone').value = normalizeStoredPhone(stringValue(row.phone));
  $('moderatorName').value = stringValue(row.moderatorName);

  fulfillmentMethod.value = row.fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery';
  city.value = ['Cairo', 'Giza'].includes(row.city) ? row.city : '';
  populateAreas(stringValue(row.area));
  $('addressDetails').value = stringValue(row.addressDetails);
  basePriceEGP.value = String(numberValue(row.basePriceEGP, 0));
  cakeDesignExtraEGP.value = String(numberValue(row.cakeDesignExtraEGP, 0));
  deliveryFeeEGP.value = String(numberValue(row.deliveryFeeEGP, 0));
  deliveryDate.value = parseApiDate(stringValue(row.deliveryDate));
  deliveryDate.min = localISODate();

  setupStartTimes();
  deliveryTimeFrom.value = parseApiTime(stringValue(row.deliveryTimeFrom), true);
  updateEndTimes(parseApiTime(stringValue(row.deliveryTimeTo), false));
  updateFulfillmentFields();

  cakeType.value = Object.hasOwn(CAKE_OPTIONS, row.cakeType)
    ? row.cakeType
    : (findKeyByValue(CAKE_TYPE_LABELS, stringValue(row.cakeType)) || '');
  populateCakeSizes(stringValue(row.cakeSize));
  filling.value = row.filling || 'vanilla';
  covering.value = row.covering || 'cream';
  $('details').value = stringValue(row.details);
  addOnsController.setAddOns(row.addOns || []);

  discountType.value = ['none', 'percentage', 'amount'].includes(row.discountType) ? row.discountType : 'none';
  discountInputValue.value = numberValue(row.discountInputValue, 0);
  depositEGP.value = numberValue(row.depositEGP, 0);
  const storedStatus = stringValue(row.orderStatus);
  // توحيد الحالات القديمة مع الحالات الثلاث المعتمدة حاليًا.
  $('orderStatus').value = storedStatus === 'ملغي'
    ? 'ملغي'
    : (['تم التأكيد', 'مؤكد', 'confirmed'].includes(storedStatus) ? 'تم التأكيد' : 'قيد التأكيد');
  cakeImagesPicker.setExistingImages(row.images?.cake || []);
  depositImagesPicker.setExistingImages(row.images?.deposit || []);
  loadingRecord = false;
  preserveLoadedPricing = true;
  recalculateTotals();
}

function populateAreas(selectedArea) {
  const previous = selectedArea || area.value;
  area.replaceChildren(new Option(city.value ? 'اختار المنطقة' : 'اختار المحافظة الأول', ''));
  (AREAS[city.value] || []).forEach(item => area.add(new Option(item.name, item.name)));
  area.disabled = !city.value;
  area.value = previous && [...area.options].some(option => option.value === previous) ? previous : '';
  recalculateTotals();
}

function setupStartTimes() {
  const previous = deliveryTimeFrom.value;
  deliveryTimeFrom.replaceChildren(new Option('اختار وقت البداية', ''));
  for (let hour = 10; hour <= 18; hour += 1) {
    deliveryTimeFrom.add(new Option(formatTime(hour), `${String(hour).padStart(2, '0')}:00`));
  }
  deliveryTimeFrom.add(new Option('آخر معاد', 'last'));
  if (previous && [...deliveryTimeFrom.options].some(option => option.value === previous)) deliveryTimeFrom.value = previous;
}

function updateEndTimes(selectedEnd) {
  const start = deliveryTimeFrom.value;
  const isLast = start === 'last';
  deliveryTimeToField.hidden = isLast;
  deliveryTimeTo.replaceChildren(new Option(isLast || !start ? 'مش مطلوب' : 'اختار ميعاد النهاية', ''));
  if (!start || isLast) {
    deliveryTimeTo.disabled = true;
    deliveryTimeTo.required = false;
    deliveryTimeTo.value = '';
    return;
  }
  const startHour = Number(start.slice(0, 2));
  for (let hour = startHour + 2; hour <= 20; hour += 1) {
    deliveryTimeTo.add(new Option(formatTime(hour), `${String(hour).padStart(2, '0')}:00`));
  }
  deliveryTimeTo.disabled = false;
  deliveryTimeTo.required = true;
  if (selectedEnd && [...deliveryTimeTo.options].some(option => option.value === selectedEnd)) deliveryTimeTo.value = selectedEnd;
  recalculateTotals();
}

function populateCakeSizes(selectedLabel) {
  const previous = selectedLabel || cakeSize.value;
  const choices = CAKE_OPTIONS[cakeType.value] || [];
  cakeSize.replaceChildren(new Option(cakeType.value ? 'اختار الحجم' : 'اختار نوع الكيكة الأول', ''));
  choices.forEach(item => cakeSize.add(new Option(item.label, item.value)));
  cakeSize.disabled = choices.length === 0;
  let selected = choices.find(item => item.label === previous);
  if (!selected) selected = choices.find(item => item.value === previous);
  cakeSize.value = selected?.value || '';
  recalculateTotals();
}

function updateFulfillmentFields() {
  const isDelivery = fulfillmentMethod.value === 'delivery';
  deliveryFields.hidden = !isDelivery;
  city.required = isDelivery;
  area.required = isDelivery;
  $('addressDetails').required = isDelivery;
  city.disabled = !isDelivery;
  area.disabled = !isDelivery || !city.value;
  $('addressDetails').disabled = !isDelivery;
  deliveryDate.required = true;
  deliveryTimeFrom.required = true;
  recalculateTotals();
}

function recalculateTotals() {
  if (loadingRecord) return;
  const size = getSelectedSize();
  const areaPolicy = (AREAS[city.value] || []).find(item => item.name === area.value);
  const cakePrice = preserveLoadedPricing
    ? numberValue(basePriceEGP.value, size?.price ?? 0)
    : (size ? Number(size.price) : numberValue(originalOrder?.basePriceEGP, 0));
  const deliveryFee = preserveLoadedPricing
    ? numberValue(deliveryFeeEGP.value, 0)
    : (fulfillmentMethod.value === 'delivery' ? Number(areaPolicy?.fee || 0) : 0);
  const cakeDesignExtra = Math.max(0, numberValue(cakeDesignExtraEGP.value, 0));
  const addOnsTotal = addOnsController?.getTotal() || 0;
  const subtotal = cakePrice + cakeDesignExtra + addOnsTotal + deliveryFee;
  const input = discountType.value === 'none' ? 0 : Math.max(0, Number(discountInputValue.value) || 0);
  let discount = 0;
  if (discountType.value === 'percentage') discount = subtotal * Math.min(input, 100) / 100;
  if (discountType.value === 'amount') discount = Math.min(input, subtotal);
  discount = roundMoney(discount);
  const total = roundMoney(Math.max(0, subtotal - discount));
  const deposit = Math.min(Math.max(0, Number(depositEGP.value) || 0), total);

  basePriceEGP.value = String(cakePrice);
  addOnsTotalEGP.value = String(addOnsTotal);
  addOnsTotalDisplay.textContent = `${addOnsTotal.toLocaleString('ar-EG')} جنيه`;
  deliveryFeeEGP.value = String(deliveryFee);
  discountAmountEGP.value = String(discount);
  totalOrderEGP.value = String(total);
  remainingEGP.value = String(roundMoney(total - deposit));
  if (Number(depositEGP.value) > total) depositEGP.value = String(total);
}

async function saveOrder(event) {
  event.preventDefault();
  setStatus(saveStatus, '', '');
  if (!cakeImageError.hidden || !depositImageError.hidden) {
    setStatus(saveStatus, 'راجع الصور المرفوعة؛ لازم تكون JPG أو PNG أو WEBP وبحد أقصى 8 ميجابايت للصورة.', 'failure');
    return;
  }
  // لازم يفضل في الطلب صورة كيكة واحدة على الأقل: قديمة محتفظ بها أو صورة جديدة.
  const retainedCakeImages = cakeImagesPicker?.getExistingImageIds().length || 0;
  const newCakeImages = cakeImagesPicker?.getFiles().length || 0;
  if (retainedCakeImages + newCakeImages < 1) {
    cakeImageError.textContent = 'لازم تحتفظ بصورة واحدة للكيكة على الأقل أو تضيف صورة جديدة قبل حفظ التعديلات.';
    cakeImageError.hidden = false;
    cakeImageInput.focus();
    setStatus(saveStatus, 'إضافة صورة واحدة للكيكة على الأقل مطلوبة لحفظ التعديلات.', 'failure');
    return;
  }
  cakeImageError.hidden = true;
  cakeImageError.textContent = '';
  const validationMessage = validateEditForm();
  if (validationMessage) {
    setStatus(saveStatus, validationMessage, 'failure');
    return;
  }

  setLoading(saveBtn, true, 'جاري حفظ التعديلات…', 'حفظ التعديلات');
  try {
    const size = getSelectedSize();
    const internalOrder = {
      orderCode: orderCodeInput.value,
      name: $('name').value.trim(),
      phone: $('phone').value.trim(),
      moderatorName: $('moderatorName').value,
      fulfillmentMethod: fulfillmentMethod.value,
      city: fulfillmentMethod.value === 'delivery' ? city.value : '',
      area: fulfillmentMethod.value === 'delivery' ? area.value : '',
      addressDetails: fulfillmentMethod.value === 'delivery' ? $('addressDetails').value.trim() : '',
      deliveryDate: deliveryDate.value,
      deliveryTimeFrom: deliveryTimeFrom.value,
      deliveryTimeTo: deliveryTimeFrom.value === 'last' ? '' : deliveryTimeTo.value,
      cakeType: cakeType.value,
      cakeSize: cakeSize.value,
      dimensions: size?.dimensions || '',
      numberOfTiers: ({ single_tier: 1, two_tier: 2, three_tier: 3 })[cakeType.value] || '',
      basePriceEGP: numberValue(basePriceEGP.value, 0),
      cakeDesignExtraEGP: numberValue(cakeDesignExtraEGP.value, 0),
      addOns: addOnsController?.getAddOns() || [],
      addOnsTotalEGP: numberValue(addOnsTotalEGP.value, 0),
      deliveryFeeEGP: numberValue(deliveryFeeEGP.value, 0),
      discountType: discountType.value,
      discountInputValue: discountType.value === 'none' ? 0 : numberValue(discountInputValue.value, 0),
      discountAmountEGP: numberValue(discountAmountEGP.value, 0),
      totalOrderEGP: numberValue(totalOrderEGP.value, 0),
      // Include deposit and remaining BEFORE generating orderSummary.
      // Otherwise makeOrderSummary falls back to a zero deposit and stale balance.
      depositEGP: numberValue(depositEGP.value, 0),
      remainingEGP: numberValue(remainingEGP.value, 0),
      filling: filling.value,
      covering: covering.value,
      details: $('details').value.trim(),
      submittedAt: submittedAtInput.value
    };
    const payload = toApiOrder(internalOrder, makeOrderSummary(internalOrder));
    // فرض صيغة الوقت العربية 12 ساعة في Payload صفحة التعديل فقط.
    // مثال: 13:00 تصبح 1:00 م، و 09:00 تصبح 9:00 ص.
    // اختيار آخر معاد يظل بالقيمة النصية المتفق عليها.
    payload.deliveryTimeFrom = formatPayloadTime(internalOrder.deliveryTimeFrom);
    payload.deliveryTimeTo = internalOrder.deliveryTimeFrom === 'last'
      ? null
      : formatPayloadTime(internalOrder.deliveryTimeTo);

    // الحالة جزء صريح من الـ payload المرسل إلى n8n.
    payload.orderStatus = ['تم التأكيد', 'قيد التأكيد', 'ملغي'].includes($('orderStatus').value)
      ? $('orderStatus').value
      : 'قيد التأكيد';
    payload.lastUpdatedAt = new Date().toISOString();
    payload.orderId = orderIdInput.value.trim();
    payload.originalPhone = originalPhoneInput.value.trim();
    payload.submittedAt = originalOrder?.submittedAt || submittedAtInput.value || new Date().toISOString();
    payload.imagesToKeep = {
      cake: cakeImagesPicker.getExistingImageIds(),
      deposit: depositImagesPicker.getExistingImageIds()
    };

    const response = await postEditOrderForm(UPDATE_ORDER_WEBHOOK_URL, payload, [cakeImagesPicker, depositImagesPicker]);
    const result = await parseResponse(response);
    if (!response.ok || result.success !== true) {
      throw new Error(result.message || 'لم يتم حفظ التعديلات.');
    }
    if (result.order) {
      originalOrder = normalizeApiOrder(result.order);
      populateForm(originalOrder);
    } else {
      originalOrder = { ...originalOrder, ...payload };
    }
    setStatus(saveStatus, `تم تحديث الطلب ${orderCodeInput.value} بنجاح.`, 'success');
  } catch (error) {
    console.error('Order update failed:', error);
    setStatus(saveStatus, error.message || 'تعذّر حفظ التعديلات. راجع إعدادات Webhook وCORS.', 'failure');
  } finally {
    setLoading(saveBtn, false, 'جاري حفظ التعديلات…', 'حفظ التعديلات');
  }
}

function validateEditForm() {
  if (!orderIdInput.value.trim()) return 'رقم الطلب الداخلي غير موجود. ابحث عن الطلب مرة أخرى.';
  if (!originalPhoneInput.value.trim() || !PHONE_REGEX.test(originalPhoneInput.value.trim())) return 'رقم الموبايل الأصلي غير صالح. ابحث عن الطلب مرة أخرى.';
  const name = $('name').value.trim();
  const phone = $('phone').value.trim();
  if (name.length < 3) return 'اكتب اسم العميل (3 حروف على الأقل).';
  if (!PHONE_REGEX.test(phone)) return 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.';
  if (!$('moderatorName').value) return 'اختار اسم المودريتور.';
  if (!deliveryDate.value) return 'اختار تاريخ التسليم.';
  if (deliveryDate.value < localISODate()) return 'مينفعش تختار تاريخ تسليم سابق.';
  if (!deliveryTimeFrom.value) return 'اختار وقت التسليم من.';
  if (deliveryTimeFrom.value !== 'last') {
    if (!deliveryTimeTo.value) return 'اختار وقت التسليم إلى.';
    if (Number(deliveryTimeTo.value.slice(0, 2)) - Number(deliveryTimeFrom.value.slice(0, 2)) < 2) return 'الفترة لازم تكون ساعتين على الأقل.';
  }
  if (fulfillmentMethod.value === 'delivery') {
    if (!city.value) return 'اختار المحافظة.';
    if (!area.value) return 'اختار المنطقة.';
    if ($('addressDetails').value.trim().length < 10) return 'اكتب العنوان بالتفصيل (10 حروف على الأقل).';
  }
  if (!cakeType.value || !getSelectedSize()) return 'اختار نوع الكيكة والحجم.';
  if (discountType.value !== 'none') {
    const amount = Number(discountInputValue.value);
    if (!Number.isFinite(amount) || amount < 0) return 'اكتب قيمة خصم صحيحة.';
    if (discountType.value === 'percentage' && amount > 100) return 'نسبة الخصم لا يمكن أن تزيد عن 100٪.';
    if (discountType.value === 'amount' && amount > (Number(basePriceEGP.value) + Number(cakeDesignExtraEGP.value) + Number(addOnsTotalEGP.value) + Number(deliveryFeeEGP.value))) return 'الخصم أكبر من إجمالي الطلب قبل الخصم.';
  }
  if (Number(depositEGP.value) < 0) return 'المبلغ المدفوع لا يمكن أن يكون سالبًا.';
  return '';
}

function getSelectedSize() {
  return (CAKE_OPTIONS[cakeType.value] || []).find(item => item.value === cakeSize.value) || null;
}

function parseApiDate(value) {
  if (!value) return '';
  const text = normalizeDigits(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const months = {
    'يناير':'01','فبراير':'02','مارس':'03','أبريل':'04','ابريل':'04','مايو':'05','يونيو':'06','يوليو':'07',
    'أغسطس':'08','اغسطس':'08','سبتمبر':'09','أكتوبر':'10','اكتوبر':'10','نوفمبر':'11','ديسمبر':'12'
  };
  const match = text.match(/(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)\s+(\d{4})/);
  return match ? `${match[3]}-${months[match[2]]}-${match[1].padStart(2,'0')}` : '';
}

function parseApiTime(value, isStart) {
  const text = normalizeDigits(value).trim();
  if (!text) return '';
  if (text === 'last' || text.includes('آخر معاد') || text.includes('اخر معاد')) return isStart ? 'last' : '';
  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text)) return text;

  // دعم Payload بصيغة 12 ساعة مثل: 1:30 م أو 9:00 ص.
  const twelveHour = text.match(/^(\d{1,2}):(\d{2})\s*(ص|م|صباحا|صباحًا|مساء|مساءً|مساءاً)$/);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minutes = twelveHour[2];
    const suffix = twelveHour[3];
    if (hour < 1 || hour > 12) return '';
    if (suffix === 'م' || suffix.startsWith('مساء')) hour = hour === 12 ? 12 : hour + 12;
    else hour = hour === 12 ? 0 : hour;
    if (hour < 10 || hour > 20) return '';
    return `${String(hour).padStart(2, '0')}:${minutes}`;
  }

  const match = text.match(/(\d{1,2})/);
  if (!match) return '';
  let hour = Number(match[1]);
  if (text.includes('مساء')) hour = hour === 12 ? 12 : hour + 12;
  else if (text.includes('ظهر')) hour = 12;
  else if (text.includes('صباح')) hour = hour === 12 ? 0 : hour;
  if (!Number.isInteger(hour) || hour < 10 || hour > 20) return '';
  return `${String(hour).padStart(2,'0')}:00`;
}

function findKeyByValue(mapping, value) {
  return Object.keys(mapping).find(key => mapping[key] === value) || '';
}
function normalizeStoredPhone(value) {
  const digits = normalizeDigits(value).replace(/\D/g, '');
  return digits.length === 10 && /^1[0125]/.test(digits) ? `0${digits}` : digits;
}
function normalizeDigits(value) {
  const eastern = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return String(value ?? '').replace(/[٠-٩]/g, d => String(eastern.indexOf(d))).replace(/[۰-۹]/g, d => String(persian.indexOf(d)));
}
function formatTime(hour) {
  if (hour === 12) return '12 ظهرًا';
  if (hour < 12) return `${hour} صباحًا`;
  return `${hour - 12} مساءً`;
}
function localISODate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function roundMoney(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function numberValue(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function stringValue(value) { return value === null || value === undefined ? '' : String(value); }
function setStatus(element, message, type) { element.textContent = message; element.className = `status${type ? ` ${type}` : ''}`; }
function setLoading(button, loading, loadingText, normalText) { button.disabled = loading; button.textContent = loading ? loadingText : normalText; }
async function loadExistingImagePreview(imageInfo) {
  // لو n8n رجّع الصورة كـ Data URL، اعرضها مباشرة بدون طلب Webhook إضافي.
  if (typeof imageInfo?.dataUrl === 'string' && imageInfo.dataUrl.startsWith('data:image/')) {
    return imageInfo.dataUrl;
  }
  if (!originalOrder?.orderCode || !originalOrder?.phone || !imageInfo?.id) {
    throw new Error('Missing order/image identity');
  }
  const data = new FormData();
  data.append('imageId', String(imageInfo.id));
  data.append('orderCode', String(originalOrder.orderCode));
  data.append('phone', String(originalOrder.phone));
  const response = await fetch(GET_ORDER_IMAGE_WEBHOOK_URL, { method: 'POST', body: data });
  if (!response.ok) throw new Error(`Image preview failed: ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Image endpoint did not return an image');
  return URL.createObjectURL(blob);
}

async function postEditOrderForm(url, values, imagePickers = []) {
  const data = new FormData();
  appendMultipartFields(data, values);
  for (const picker of imagePickers) {
    if (picker) await picker.appendTo(data, picker === cakeImagesPicker ? 'cakeImage' : 'depositImage');
  }
  return fetch(url, { method: 'POST', body: data });
}

async function postForm(url, values) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) data.append(key, String(value));
  });
  return fetch(url, { method: 'POST', body: data });
}
async function parseResponse(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new Error('الرد من n8n ليس JSON صالحًا. راجع إعدادات Respond to Webhook.'); }
}
function closeOrder() {
  editForm.hidden = true;
  originalOrder = null;
  setStatus(saveStatus, '', '');
  lookupForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
