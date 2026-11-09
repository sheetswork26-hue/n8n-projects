/**
 * تجهيز عقد البيانات الموحد بين صفحات الطلب و n8n.
 * القيم المرسلة هنا هي Codes / ISO / Numbers مناسبة للتخزين في PostgreSQL.
 * النص العربي الجاهز للنسخ يظل منفصلًا داخل orderSummary.
 */
import { CAKE_OPTIONS } from './config.js';

const numberOr = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

/** يحوّل وقت الواجهة 24 ساعة إلى صيغة Payload عربية 12 ساعة. */
export function formatPayloadTime(value) {
  const text = String(value ?? '').trim();
  if (!text || text === 'last') return text === 'last' ? 'اخر معاد' : null;

  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return text;

  const hour24 = Number(match[1]);
  const minutes = match[2];
  if (hour24 < 0 || hour24 > 23) return text;

  const suffix = hour24 < 12 ? 'ص' : 'م';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

/** يبني كائن الطلب القياسي الذي يوضع داخل multipart field باسم order. */
export function toApiOrder(order, orderSummary = '') {
  const selectedSize = (CAKE_OPTIONS[order.cakeType] || [])
    .find(item => item.value === order.cakeSize);

  const addOns = (Array.isArray(order.addOns) ? order.addOns : []).map(item => ({
    productId: String(item.productId || ''),
    productName: String(item.name ?? item.productName ?? ''),
    unit: String(item.unit || ''),
    quantity: numberOr(item.quantity, 0),
    unitPriceEGP: numberOr(item.unitPriceEGP ?? item.unitPrice, 0),
    designExtraEGP: numberOr(item.designExtraEGP, 0),
    totalEGP: numberOr(item.totalEGP ?? item.total, 0)
  }));

  return {
    orderCode: String(order.orderCode || ''),
    name: String(order.name || ''),
    phone: String(order.phone || ''),
    moderatorName: String(order.moderatorName || ''),
    fulfillmentMethod: order.fulfillmentMethod === 'pickup'
      ? 'استلام من مكان'
      : (order.fulfillmentMethod || 'delivery'),
    city: order.fulfillmentMethod === 'delivery' ? (order.city || null) : null,
    area: order.fulfillmentMethod === 'delivery' ? (order.area || null) : null,
    addressDetails: order.fulfillmentMethod === 'delivery' ? (order.addressDetails || null) : null,
    deliveryDate: order.deliveryDate || null,
    deliveryTimeFrom: formatPayloadTime(order.deliveryTimeFrom),
    deliveryTimeTo: order.deliveryTimeFrom === 'last' ? null : formatPayloadTime(order.deliveryTimeTo),
    cakeType: order.cakeType || null,
    cakeSize: order.cakeSize || null,
    dimensions: order.dimensions || selectedSize?.dimensions || null,
    numberOfTiers: order.numberOfTiers === '' || order.numberOfTiers === undefined
      ? null : numberOr(order.numberOfTiers, null),
    filling: order.filling || null,
    covering: order.covering || null,
    details: String(order.details || ''),
    basePriceEGP: numberOr(order.basePriceEGP),
    cakeDesignExtraEGP: numberOr(order.cakeDesignExtraEGP),
    addOns,
    addOnsTotalEGP: numberOr(order.addOnsTotalEGP),
    deliveryFeeEGP: numberOr(order.deliveryFeeEGP),
    discountType: order.discountType || 'none',
    discountInputValue: numberOr(order.discountInputValue),
    discountAmountEGP: numberOr(order.discountAmountEGP),
    totalOrderEGP: numberOr(order.totalOrderEGP),
    depositEGP: numberOr(order.depositEGP),
    remainingEGP: numberOr(order.remainingEGP),
    orderSummary: String(orderSummary || order.orderSummary || ''),
    submittedAt: order.submittedAt || new Date().toISOString()
  };
}

/**
 * يحوّل بيانات API القياسية إلى مفاتيح الإدخال الداخلية التي تستخدمها الصفحة.
 * يدعم أيضًا بعض القيم العربية من النسخ القديمة حتى لا تتعطل الطلبات القديمة.
 */
export function normalizeApiOrder(row = {}) {
  const fulfillmentMap = { 'توصيل للعنوان': 'delivery', 'استلام من مكان': 'pickup' };
  const cityMap = { 'القاهرة': 'Cairo', 'الجيزة': 'Giza' };
  const discountMap = {
    'بدون خصم': 'none',
    'خصم بنسبة مئوية (%)': 'percentage',
    'خصم بمبلغ ثابت (جنيه)': 'amount'
  };
  const fillingMap = { 'فانيليا': 'vanilla', 'شوكولاتة': 'chocolate', 'نصف فانيليا ونصف شوكولاتة': 'half_and_half' };
  const coveringMap = { 'عجينة سكر': 'sugar_paste', 'كريمة': 'cream' };

  return {
    ...row,
    orderCode: row.orderCode ?? row.order_code ?? '',
    name: row.name ?? row.customerName ?? row.customer_name ?? '',
    phone: row.phone ?? row.customerPhone ?? row.customer_phone ?? '',
    moderatorName: row.moderatorName ?? row.moderator_name ?? '',
    fulfillmentMethod: fulfillmentMap[row.fulfillmentMethod] || row.fulfillmentMethod || row.fulfillment_method || 'delivery',
    city: cityMap[row.city] || row.city || row.cityCode || row.city_code || '',
    area: row.area ?? '',
    addressDetails: row.addressDetails ?? row.address_details ?? '',
    deliveryDate: row.deliveryDateISO || row.delivery_date || row.deliveryDate || '',
    deliveryTimeFrom: row.deliveryTimeFrom ?? row.delivery_time_from ?? '',
    deliveryTimeTo: row.deliveryTimeTo ?? row.delivery_time_to ?? '',
    cakeType: row.cakeType ?? row.cake_type ?? '',
    cakeSize: row.cakeSize ?? row.cake_size ?? '',
    numberOfTiers: row.numberOfTiers ?? row.number_of_tiers ?? null,
    basePriceEGP: row.basePriceEGP ?? row.base_price_egp ?? 0,
    cakeDesignExtraEGP: row.cakeDesignExtraEGP ?? row.cake_design_extra_egp ?? 0,
    addOnsTotalEGP: row.addOnsTotalEGP ?? row.add_ons_total_egp ?? 0,
    deliveryFeeEGP: row.deliveryFeeEGP ?? row.delivery_fee_egp ?? 0,
    discountInputValue: row.discountInputValue ?? row.discount_input_value ?? 0,
    discountAmountEGP: row.discountAmountEGP ?? row.discount_amount_egp ?? 0,
    totalOrderEGP: row.totalOrderEGP ?? row.total_order_egp ?? 0,
    depositEGP: row.depositEGP ?? row.deposit_egp ?? 0,
    remainingEGP: row.remainingEGP ?? row.remaining_egp ?? 0,
    orderStatus: row.orderStatus ?? row.order_status ?? '',
    orderSummary: row.orderSummary ?? row.order_summary ?? '',
    submittedAt: row.submittedAt ?? row.submitted_at ?? '',
    filling: fillingMap[row.filling] || row.filling || 'vanilla',
    covering: coveringMap[row.covering] || row.covering || 'cream',
    discountType: discountMap[row.discountType] || row.discountType || row.discount_type || 'none',
    addOns: normalizeAddOns(row.addOns ?? row.add_ons ?? row.addOnsJSON ?? row.add_ons_json),
    images: normalizeImages(row.images ?? row.orderImages ?? {})
  };
}

function normalizeAddOns(value) {
  let items = value;
  if (typeof value === 'string') {
    try { items = JSON.parse(value); } catch { items = []; }
  }
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    productId: item.productId ?? item.product_id ?? '',
    name: item.name ?? item.productName ?? item.product_name ?? '',
    unit: item.unit || '',
    quantity: numberOr(item.quantity),
    unitPrice: numberOr(item.unitPrice ?? item.unitPriceEGP ?? item.unit_price_egp),
    designExtraEGP: numberOr(item.designExtraEGP ?? item.design_extra_egp),
    total: numberOr(item.total ?? item.totalEGP ?? item.total_egp)
  }));
}

function normalizeImages(value) {
  const normalize = (items, fallbackType) => (Array.isArray(items) ? items : []).map(item => ({
    id: item.id ?? item.imageId ?? item.image_id,
    imageType: item.imageType ?? item.image_type ?? fallbackType,
    fileName: item.fileName ?? item.file_name ?? 'صورة',
    mimeType: item.mimeType ?? item.mime_type ?? 'image/jpeg',
    fileSizeBytes: numberOr(item.fileSizeBytes ?? item.file_size_bytes, 0),
    // نحتفظ برابط Base64 لو الـ API حمّل الصور بالفعل من R2.
    ...(item.dataUrl ? { dataUrl: item.dataUrl } : {}),
    ...(item.objectKey ? { objectKey: item.objectKey } : {})
  })).filter(item => item.id !== undefined && item.id !== null);

  // الشكل الحالي: images: [{ id, imageType, fileName, dataUrl, ... }]
  if (Array.isArray(value)) {
    return {
      cake: normalize(value.filter(item => (item.imageType ?? item.image_type) === 'cake'), 'cake'),
      deposit: normalize(value.filter(item => (item.imageType ?? item.image_type) === 'deposit'), 'deposit')
    };
  }

  // الشكل القياسي: images: { cake: [], deposit: [] }
  const source = value && typeof value === 'object' ? value : {};
  const cake = source.cake ?? source.cakeImages ?? source.cake_images ?? [];
  const deposit = source.deposit ?? source.depositImages ?? source.deposit_images ?? [];
  return {
    cake: normalize(cake, 'cake'),
    deposit: normalize(deposit, 'deposit')
  };
}
