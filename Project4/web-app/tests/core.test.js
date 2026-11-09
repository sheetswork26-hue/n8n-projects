import test from 'node:test';
import assert from 'node:assert/strict';

const elements = new Map();

globalThis.document = {
  getElementById(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        value: '',
        parentElement: { querySelector: () => null }
      });
    }
    return elements.get(id);
  }
};

const { calculateOrderTotals } = await import('../js/pricing.js');
const { makeOrderSummary } = await import('../js/summary.js');
const { toApiOrder, normalizeApiOrder, formatPayloadTime } = await import('../js/localization.js');
const { generateOrderCode } = await import('../js/order-code.js');
const { appendMultipartFields } = await import('../js/multipart.js');

function setValues(values) {
  for (const [id, value] of Object.entries(values)) {
    elements.get(id).value = value;
  }
}

test('API payload sends Arabic pickup label and normalizes it back for the form', () => {
  const payload = toApiOrder({
    orderCode: '654321-c',
    fulfillmentMethod: 'pickup'
  });

  assert.equal(payload.fulfillmentMethod, 'استلام من مكان');
  assert.equal(normalizeApiOrder(payload).fulfillmentMethod, 'pickup');
});

test('API payload sends Arabic label when delivery time is last', () => {
  const payload = toApiOrder({
    orderCode: '123456-c',
    deliveryTimeFrom: 'last',
    deliveryTimeTo: '',
  });
  assert.equal(payload.deliveryTimeFrom, 'اخر معاد');
  assert.equal(payload.deliveryTimeTo, null);

  const regularPayload = toApiOrder({
    orderCode: '123456-c',
    deliveryTimeFrom: '12:00',
    deliveryTimeTo: '15:00',
  });
  assert.equal(regularPayload.deliveryTimeFrom, '12:00 م');
  assert.equal(regularPayload.deliveryTimeTo, '3:00 م');
  assert.equal(toApiOrder({ deliveryTimeFrom: '10:00', deliveryTimeTo: '11:00' }).deliveryTimeFrom, '10:00 ص');
  assert.equal(formatPayloadTime('00:30'), '12:30 ص');
  assert.equal(formatPayloadTime('13:45'), '1:45 م');
});

test('خصم النسبة يتحسب على سعر الكيكة والتوصيل معًا', () => {
  setValues({
    city: 'Cairo',
    area: 'التجمع',
    fulfillmentMethod: 'delivery',
    cakeType: 'single_tier',
    cakeSize: '2',
    discountType: 'percentage',
    discountValue: '10'
  });

  const totals = calculateOrderTotals();
  assert.equal(totals.cakeSubtotal, 550);
  assert.equal(totals.deliveryFee, 200);
  assert.equal(totals.preDiscountTotal, 750);
  assert.equal(totals.discountAmountEGP, 75);
  assert.equal(totals.totalOrderEGP, 675);
});


test('الإضافات تدخل في الإجمالي والخصم', () => {
  setValues({
    city: 'Cairo', area: 'التجمع', fulfillmentMethod: 'delivery',
    cakeType: 'single_tier', cakeSize: '2', discountType: 'percentage', discountValue: '10'
  });
  const totals = calculateOrderTotals(380);
  assert.equal(totals.cakeSubtotal, 550);
  assert.equal(totals.addOnsTotalEGP, 380);
  assert.equal(totals.deliveryFee, 200);
  assert.equal(totals.preDiscountTotal, 1130);
  assert.equal(totals.discountAmountEGP, 113);
  assert.equal(totals.totalOrderEGP, 1017);
});


test('زيادة تصميم التورتة تدخل في الإجمالي والخصم بدون تغيير السعر الأساسي', () => {
  setValues({
    city: 'Cairo', area: 'التجمع', fulfillmentMethod: 'delivery',
    cakeType: 'single_tier', cakeSize: '2', discountType: 'amount', discountValue: '50'
  });
  const totals = calculateOrderTotals(380, 100);
  assert.equal(totals.cakeSubtotal, 550);
  assert.equal(totals.cakeDesignExtraEGP, 100);
  assert.equal(totals.preDiscountTotal, 1230);
  assert.equal(totals.discountAmountEGP, 50);
  assert.equal(totals.totalOrderEGP, 1180);
});

test('الاستلام من المكان لا يضيف رسوم توصيل', () => {
  setValues({
    fulfillmentMethod: 'pickup',
    discountType: 'percentage',
    discountValue: '10'
  });

  const totals = calculateOrderTotals();
  assert.equal(totals.deliveryFee, 0);
  assert.equal(totals.discountAmountEGP, 55);
  assert.equal(totals.totalOrderEGP, 495);
});

test('ملخص الطلب يعرض الكود العشوائي واسم يوم التسليم', () => {
  const summary = makeOrderSummary({
    orderCode: '482915-c',
    name: 'عميل تجريبي',
    phone: '01000000000',
    moderatorName: 'فاطمة',
    fulfillmentMethod: 'pickup',
    deliveryDate: '2026-10-25',
    deliveryTimeFrom: 'last',
    deliveryTimeTo: null,
    basePriceEGP: 550,
    cakeDesignExtraEGP: 75,
    deliveryFeeEGP: 0,
    discountType: 'percentage',
    discountInputValue: 10,
    discountAmountEGP: 62.5,
    totalOrderEGP: 562.5,
    cakeType: 'single_tier',
    cakeSize: '2',
    filling: 'vanilla',
    covering: 'cream',
    details: ''
  });

  assert.match(summary, /^🍰 ملخص طلب — تشير كيك\nكود الطلب: 482915-c/);
  assert.match(summary, /يوم التسليم: الأحد 2026-10-25/);
  assert.match(summary, /وقت التسليم: آخر معاد/);
  assert.match(summary, /التورتة: 550 جنيه \+ 75 جنيه تصميم = 625 جنيه/);
  assert.doesNotMatch(summary, /رسوم التوصيل:/);
  assert.match(summary, /الإجمالي النهائي: 562.5 جنيه/);
  assert.doesNotMatch(summary, /صورة مرجعية/);
});


test('ملخص تعديل الطلب يعكس العربون والمتبقي الحاليين بدل قيم قديمة', () => {
  const summary = makeOrderSummary({
    orderCode: '490671-c', name: 'زياد', phone: '01067461252', moderatorName: 'امنية',
    fulfillmentMethod: 'delivery', city: 'Cairo', area: 'صلاح سالم', addressDetails: 'ياسين 22 الدور الارضي',
    deliveryDate: '2026-11-07', deliveryTimeFrom: '11:00', deliveryTimeTo: '15:00',
    cakeType: 'single_tier', cakeSize: '12', filling: 'vanilla', covering: 'cream', details: 'زياد 24',
    basePriceEGP: 1350, cakeDesignExtraEGP: 100,
    addOns: [{ name: 'كب كيك', quantity: 1, unit: '12 قطعة', unitPrice: 380, designExtraEGP: 23, total: 403 }],
    addOnsTotalEGP: 403, deliveryFeeEGP: 200,
    discountType: 'percentage', discountInputValue: 10, discountAmountEGP: 205.3,
    totalOrderEGP: 1847.7, depositEGP: 400, remainingEGP: 1447.7
  });

  assert.match(summary, /الإجمالي النهائي: 1,847\.7 جنيه/);
  assert.match(summary, /الديبوزيت المدفوع: 400 جنيه/);
  assert.match(summary, /المتبقي: 1,447\.7 جنيه/);
  assert.doesNotMatch(summary, /الديبوزيت المدفوع: 0 جنيه/);
});

test('ملخص الطلب يجمع تفاصيل التوابع مع تفاصيل الكيكة ويعرض السعر بصيغة موحدة', () => {
  const summary = makeOrderSummary({
    orderCode: '123456-c', name: 'عميلة', phone: '01000000000', moderatorName: 'فاطمة',
    fulfillmentMethod: 'delivery', city: 'Cairo', area: 'التجمع', addressDetails: 'شارع تجريبي',
    deliveryDate: '2026-10-30', deliveryTimeFrom: '12:00', deliveryTimeTo: '14:00',
    basePriceEGP: 1800, cakeDesignExtraEGP: 100, addOnsTotalEGP: 430,
    addOns: [{ name: 'كب كيك', quantity: 1, unit: '12 قطعة', unitPrice: 380, designExtraEGP: 50, total: 430 }],
    deliveryFeeEGP: 200, discountType: 'none', discountAmountEGP: 0, totalOrderEGP: 2530,
    cakeType: 'single_tier', cakeSize: '2', filling: 'vanilla', covering: 'cream', details: ''
  });

  assert.match(summary, /التورتة: 1,800 جنيه \+ 100 جنيه تصميم = 1,900 جنيه/);
  assert.match(summary, /رسوم التوصيل: 200 جنيه/);
  assert.ok(summary.indexOf('تفاصيل الكيكة والإضافات') < summary.indexOf('كب كيك'));
  assert.match(summary, /إجمالي الإضافات: 380 جنيه \+ 50 جنيه تصميم = 430 جنيه/);
  assert.match(summary, /نوع الكيكة والحجم: كيكة دور واحد — تكفي شخصين \+ التوابع/);
  assert.doesNotMatch(summary, /\nالحجم:/);
  assert.doesNotMatch(summary.split('ملخص الحساب')[1].split('تفاصيل الكيكة والإضافات')[0], /كب كيك/);
});

test('API يرسل بيانات قياسية مناسبة لـ PostgreSQL بدل القيم العربية المعروضة', () => {
  const payload = toApiOrder({
    orderCode: '482915-c', name: 'زياد', phone: '01000000000', moderatorName: 'أمنية',
    fulfillmentMethod: 'delivery', city: 'Cairo', area: 'حلمية الزيتون', addressDetails: 'شارع تجريبي',
    deliveryDate: '2026-10-30', deliveryTimeFrom: '12:00', deliveryTimeTo: '15:00',
    cakeType: 'two_tier', cakeSize: '20-25', numberOfTiers: 2,
    basePriceEGP: '1900', cakeDesignExtraEGP: '100', addOnsTotalEGP: '1276',
    addOns: [{ productId: 'cookies_dozen', name: 'كوكيز', unit: '12 قطعة', quantity: 3, unitPrice: 320, designExtraEGP: 23, total: 983 }],
    deliveryFeeEGP: '250', discountType: 'percentage', discountInputValue: '10',
    discountAmountEGP: '352.6', totalOrderEGP: '3173.4', filling: 'vanilla', covering: 'cream'
  });

  assert.equal(payload.orderCode, '482915-c');
  assert.equal(payload.fulfillmentMethod, 'delivery');
  assert.equal(payload.city, 'Cairo');
  assert.equal(payload.deliveryDate, '2026-10-30');
  assert.equal(payload.deliveryTimeFrom, '12:00 م');
  assert.equal(payload.deliveryTimeTo, '3:00 م');
  assert.equal(payload.cakeType, 'two_tier');
  assert.equal(payload.cakeSize, '20-25');
  assert.equal(payload.numberOfTiers, 2);
  assert.equal(payload.basePriceEGP, 1900);
  assert.equal(payload.discountType, 'percentage');
  assert.deepEqual(payload.addOns[0], {
    productId: 'cookies_dozen', productName: 'كوكيز', unit: '12 قطعة', quantity: 3,
    unitPriceEGP: 320, designExtraEGP: 23, totalEGP: 983
  });
  assert.equal(Object.hasOwn(payload, 'cakeImageNamesJSON'), false);
  assert.equal(Object.hasOwn(payload, 'addOnsJSON'), false);
});

test('كود الطلب رقم عشوائي من ستة أرقام وينتهي بـ -c', () => {
  const code = generateOrderCode();
  assert.match(code, /^\d{6}-c$/);
  const number = Number(code.slice(0, 6));
  assert.ok(number >= 100000 && number <= 999999);
});

test('ملخص التوابع يحول باكيتين 12 قطعة إلى 24 قطعة في الرسالة المنسوخة', () => {
  const summary = makeOrderSummary({
    orderCode: 'test-quantity', name: 'عميل تجريبي', phone: '01000000000',
    moderatorName: 'أمنية', fulfillmentMethod: 'pickup',
    deliveryDate: '2026-11-05', deliveryTimeFrom: '12', deliveryTimeTo: '16',
    basePriceEGP: 3500, cakeDesignExtraEGP: 100,
    addOns: [{ name: 'كيك سايكل', quantity: 2, unit: '12 قطعة', unitPrice: 550, designExtraEGP: 50, total: 1150 }],
    addOnsTotalEGP: 1150, deliveryFeeEGP: 0, discountType: 'none',
    discountInputValue: 0, discountAmountEGP: 0, totalOrderEGP: 4750,
    cakeType: 'single_tier', cakeSize: '2', filling: 'vanilla', covering: 'cream', details: ''
  });
  assert.match(summary, /كيك سايكل — الكمية: 24 قطعة/);
  assert.doesNotMatch(summary, /الكمية: 2 × 12 قطعة/);
});


test('API يحتفظ بملخص الطلب الجاهز للنسخ داخل orderSummary', () => {
  const readySummary = '🍰 ملخص طلب — تشير كيك\nالإجمالي النهائي: 3,600 جنيه';
  const payload = toApiOrder({
    orderCode: '123456-c', fulfillmentMethod: 'pickup', cakeType: 'single_tier', cakeSize: '2'
  }, readySummary);
  assert.equal(payload.orderSummary, readySummary);
});

test('صفحة التعديل تطبع استجابة API مع بيانات الصور القديمة كمراجع قابلة للتحميل', () => {
  const order = normalizeApiOrder({
    orderCode: '123456-c', customerName: 'عميل', customerPhone: '01000000000',
    fulfillmentMethod: 'delivery', city: 'Cairo', deliveryDate: '2026-10-30',
    deliveryTimeFrom: '12:00', cakeType: 'two_tier', cakeSize: '20-25',
    addOns: [{ product_id: 'cookies_dozen', product_name: 'كوكيز', unit: '12 قطعة', quantity: 2, unit_price_egp: 320, total_egp: 640 }],
    images: {
      cake: [{ id: 41, file_name: 'cake.png', mime_type: 'image/png', file_size_bytes: 1000 }],
      deposit: [{ id: 42, file_name: 'receipt.jpg', mime_type: 'image/jpeg', file_size_bytes: 2000 }]
    }
  });
  assert.equal(order.name, 'عميل');
  assert.equal(order.phone, '01000000000');
  assert.equal(order.deliveryDate, '2026-10-30');
  assert.equal(order.addOns[0].productId, 'cookies_dozen');
  assert.equal(order.addOns[0].unitPrice, 320);
  assert.equal(order.images.cake[0].id, 41);
  assert.equal(order.images.deposit[0].fileName, 'receipt.jpg');
});


test('Multipart يرسل كل الحقول الأساسية منفصلة ولا ينشئ body.order', () => {
  const form = new FormData();
  appendMultipartFields(form, {
    orderCode: '553592-c',
    name: 'زياد',
    totalOrderEGP: 3006,
    dimensions: null,
    addOns: [{ productId: 'cakesicle_dozen', quantity: 1 }]
  });

  assert.equal(form.get('orderCode'), '553592-c');
  assert.equal(form.get('name'), 'زياد');
  assert.equal(form.get('totalOrderEGP'), '3006');
  assert.equal(form.get('dimensions'), '');
  assert.deepEqual(JSON.parse(form.get('addOns')), [{ productId: 'cakesicle_dozen', quantity: 1 }]);
  assert.equal(form.has('order'), false);
});
