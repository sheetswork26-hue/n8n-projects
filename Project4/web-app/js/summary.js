/**
 * ملخص الطلب بنسختين:
 * 1) نص منسق للنسخ والإرسال.
 * 2) عرض بصري منظم داخل صفحة الطلب.
 */
import { CAKE_OPTIONS, CAKE_TYPE_LABELS } from './config.js';
// Keep this shared utility independent from dom.js because edit-order.html
// does not contain the create-order form elements that dom.js initializes.
const formatEGP = value => {
  const amount = Number(value) || 0;
  return `${amount.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} جنيه`;
};
const formatTime = hour => {
  if (hour === 12) return '12 ظهرًا';
  if (hour < 12) return `${hour} صباحًا`;
  return `${hour - 12} مساءً`;
};

const FILLING_LABELS = {
  vanilla: 'فانيليا',
  chocolate: 'شوكولاتة',
  half_and_half: 'نصف فانيليا ونصف شوكولاتة'
};

const COVERING_LABELS = {
  sugar_paste: 'عجينة سكر',
  cream: 'كريمة'
};

const DISCOUNT_LABELS = {
  percentage: value => `خصم ${Number(value) || 0}%`,
  amount: () => 'خصم بمبلغ ثابت'
};

const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const nonNegativeMoney = value => Math.max(0, money(value));

function getAddOns(order) {
  if (Array.isArray(order.addOns)) return order.addOns;
  if (typeof order.addOns === 'string') {
    try {
      const parsed = JSON.parse(order.addOns);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getAddOnAmounts(item) {
  const quantity = Math.max(0, money(item.quantity));
  const unitPrice = Math.max(0, money(item.unitPrice));
  const designExtra = nonNegativeMoney(item.designExtraEGP);
  const calculatedBase = quantity * unitPrice;
  const savedTotal = Number(item.total);
  const total = Number.isFinite(savedTotal) && savedTotal >= 0
    ? savedTotal
    : calculatedBase + designExtra;
  // In the current schema, design extra is added once to the whole add-on row.
  const base = calculatedBase || Math.max(0, total - designExtra);
  return { quantity, unitPrice, base, designExtra, total };
}

function formatAddOnQuantity(quantity, unit) {
  const count = Math.max(0, money(quantity));
  const normalizedUnit = String(unit || 'وحدة').trim();

  // The quantity field counts packs for 12-piece options, not individual pieces.
  if (/^12\s*قطعة$/.test(normalizedUnit)) {
    const pieces = count * 12;
    return `${pieces} قطعة`;
  }

  if (normalizedUnit === 'قطعة') {
    return `${count} قطعة`;
  }

  if (normalizedUnit === 'كيلو') {
    return `${count} كيلو`;
  }

  return `${count} × ${normalizedUnit}`;
}

function formatOrderTime(from, to) {
  if (from === 'last') return 'آخر معاد';
  if (!from) return 'غير محدد';

  const fromLabel = formatTime(Number(from.slice(0, 2)));
  const toLabel = to ? formatTime(Number(to.slice(0, 2))) : '';
  return toLabel ? `${fromLabel} - ${toLabel}` : fromLabel;
}

export function formatArabicDate(dateValue) {
  if (!dateValue) return 'غير محدد';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  const dayName = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
  return `${dayName} ${dateValue}`;
}

function getOrderData(order) {
  const selectedSize = (CAKE_OPTIONS[order.cakeType] || [])
    .find(item => item.value === order.cakeSize);
  const cakeBase = nonNegativeMoney(order.basePriceEGP);
  const cakeDesignExtra = nonNegativeMoney(order.cakeDesignExtraEGP);
  const cakeTotal = cakeBase + cakeDesignExtra;
  const addOns = getAddOns(order);
  const addOnsTotal = order.addOnsTotalEGP !== undefined && order.addOnsTotalEGP !== null && order.addOnsTotalEGP !== ''
    ? nonNegativeMoney(order.addOnsTotalEGP)
    : addOns.reduce((sum, item) => sum + getAddOnAmounts(item).total, 0);
  const deliveryFee = nonNegativeMoney(order.deliveryFeeEGP);
  const discountAmount = nonNegativeMoney(order.discountAmountEGP);
  const calculatedTotal = Math.max(0, cakeTotal + addOnsTotal + deliveryFee - discountAmount);
  const totalOrder = order.totalOrderEGP !== undefined && order.totalOrderEGP !== null && order.totalOrderEGP !== ''
    ? nonNegativeMoney(order.totalOrderEGP)
    : calculatedTotal;
  const deposit = Math.min(totalOrder, nonNegativeMoney(order.depositEGP));
  const remaining = Math.max(0, totalOrder - deposit);

  return {
    selectedSize,
    cakeBase,
    cakeDesignExtra,
    cakeTotal,
    addOns,
    addOnsTotal,
    deliveryFee,
    discountAmount,
    totalOrder,
    deposit,
    remaining,
    discountType: order.discountType || 'none',
    discountInputValue: order.discountInputValue,
    fulfillmentLabel: order.fulfillmentMethod === 'pickup' ? 'استلام من مكان' : 'توصيل للعنوان',
    cakeTypeLabel: CAKE_TYPE_LABELS[order.cakeType] || order.cakeType || 'غير محدد',
    sizeLabel: selectedSize?.label || order.cakeSize || 'غير محدد',
    fillingLabel: FILLING_LABELS[order.filling] || order.filling || 'غير محدد',
    coveringLabel: COVERING_LABELS[order.covering] || order.covering || 'غير محدد'
  };
}

function formatPriceEquation(base, extra, total, baseLabel = 'السعر الأساسي') {
  const basePart = `${baseLabel}: ${formatEGP(base)}`;
  const extraPart = extra > 0 ? ` + زيادة التصميم: ${formatEGP(extra)}` : '';
  return `${basePart}${extraPart} = ${formatEGP(total)}`;
}

/** Plain-text money formatting used in the shareable order message. */
function formatSummaryMoney(value) {
  const amount = Number(value) || 0;
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} جنيه`;
}

/** Builds a readable plain-text summary for clipboard/sharing. */
export function makeOrderSummary(order) {
  const data = getOrderData(order);
  const discountLabel = DISCOUNT_LABELS[data.discountType]?.(data.discountInputValue) || 'خصم';
  const addOnAmounts = data.addOns.map(item => ({ item, ...getAddOnAmounts(item) }));
  const addOnsBaseTotal = addOnAmounts.reduce((sum, item) => sum + item.base, 0);
  const addOnsDesignTotal = addOnAmounts.reduce((sum, item) => sum + item.designExtra, 0);
  const addOnsSummary = addOnAmounts.map(({ item, quantity }) =>
    `${item.name || 'إضافة'} — الكمية: ${formatAddOnQuantity(quantity, item.unit)}`
  ).join('، ');
  const cakePriceLine = `التورتة: ${formatSummaryMoney(data.cakeBase)}${data.cakeDesignExtra > 0 ? ` + ${formatSummaryMoney(data.cakeDesignExtra)} تصميم` : ''} = ${formatSummaryMoney(data.cakeTotal)}`;
  const addOnsPriceLine = data.addOnsTotal > 0
    ? `إجمالي الإضافات: ${formatSummaryMoney(addOnsBaseTotal)}${addOnsDesignTotal > 0 ? ` + ${formatSummaryMoney(addOnsDesignTotal)} تصميم` : ''} = ${formatSummaryMoney(data.addOnsTotal)}`
    : null;

  const lines = [
    '🍰 ملخص طلب — تشير كيك',
    `كود الطلب: ${order.orderCode || 'غير متاح'}`,
    '━━━━━━━━━━━━━━━━━━',
    'بيانات العميل',
    `الاسم: ${order.name || 'غير محدد'}`,
    `رقم الموبايل: ${order.phone || 'غير محدد'}`,
    `المودريتور: ${order.moderatorName || 'غير محدد'}`,
    '',
    'بيانات التسليم',
    `طريقة الاستلام: ${data.fulfillmentLabel}`,
    ...(order.fulfillmentMethod === 'delivery' ? [
      `المحافظة: ${order.city === 'Cairo' ? 'القاهرة' : order.city === 'Giza' ? 'الجيزة' : order.city || 'غير محدد'}`,
      ...(order.area ? [`المنطقة: ${order.area}`] : []),
      ...(order.addressDetails ? [`العنوان: ${order.addressDetails}`] : [])
    ] : []),
    `يوم التسليم: ${formatArabicDate(order.deliveryDate)}`,
    `وقت التسليم: ${formatOrderTime(order.deliveryTimeFrom, order.deliveryTimeTo)}`,
    '',
    'ملخص الحساب',
    cakePriceLine,
    ...(addOnsPriceLine ? [addOnsPriceLine] : []),
    ...(data.deliveryFee > 0 ? [`رسوم التوصيل: ${formatSummaryMoney(data.deliveryFee)}`] : []),
    ...(data.discountAmount > 0 ? [`${discountLabel}: -${formatSummaryMoney(data.discountAmount)}`] : []),
    `الإجمالي النهائي: ${formatSummaryMoney(data.totalOrder)}`,
    `الديبوزيت المدفوع: ${formatSummaryMoney(data.deposit)}`,
    `المتبقي: ${formatSummaryMoney(data.remaining)}`,
    '',
    'تفاصيل الكيكة والإضافات',
    `نوع الكيكة والحجم: ${data.cakeTypeLabel} — ${data.sizeLabel}${addOnsSummary ? ` + التوابع (${addOnsSummary})` : ''}`, 
    `الحشو: ${data.fillingLabel}`,
    `التغطية: ${data.coveringLabel}`,
    `تفاصيل إضافية: ${String(order.details || '').trim() || 'لا يوجد'}`
  ];

  return lines.join('\n');
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function addFact(container, label, value) {
  const fact = createElement('div', 'summary-fact');
  fact.append(
    createElement('span', 'summary-fact-label', label),
    createElement('strong', 'summary-fact-value', value || 'غير محدد')
  );
  container.append(fact);
  return fact;
}

function createSection(title, className = '') {
  const section = createElement('section', `summary-panel${className ? ` ${className}` : ''}`);
  section.append(createElement('h3', 'summary-panel-title', title));
  return section;
}

function addPriceRow(container, label, base, extra, total, { subtitle = '', totalOnly = false } = {}) {
  const row = createElement('div', `summary-money-row${totalOnly ? ' summary-money-row-total-only' : ''}`);
  const description = createElement('div', 'summary-money-description');
  description.append(createElement('strong', 'summary-money-label', label));
  if (subtitle) description.append(createElement('small', 'summary-money-subtitle', subtitle));
  row.append(description);

  if (!totalOnly) {
    const equation = createElement('div', `summary-price-equation${extra > 0 ? '' : ' summary-price-equation-no-extra'}`);
    equation.append(createElement('span', 'summary-price-base', formatEGP(base)));
    if (extra > 0) {
      equation.append(
        createElement('span', 'summary-price-operator', '+'),
        createElement('span', 'summary-price-extra', `${formatEGP(extra)} تصميم`)
      );
    }
    equation.append(
      createElement('span', 'summary-price-operator', '='),
      createElement('strong', 'summary-price-total', formatEGP(total))
    );
    row.append(equation);
  } else {
    row.append(createElement('strong', 'summary-money-amount', formatEGP(total)));
  }
  container.append(row);
  return row;
}

/** Renders a polished responsive summary card in the success panel. */
export function renderOrderSummary(order, container) {
  if (!container) return;
  const data = getOrderData(order);
  container.replaceChildren();
  container.classList.add('summary-content');

  const identity = createSection('بيانات العميل', 'summary-identity-panel');
  const identityHeading = createElement('div', 'summary-identity-heading');
  identityHeading.append(createElement('span', 'summary-code-label', 'كود الطلب'));
  identityHeading.append(createElement('strong', 'summary-code-value', order.orderCode || 'غير متاح'));
  identity.prepend(identityHeading);
  const facts = createElement('div', 'summary-facts-grid');
  addFact(facts, 'الاسم', order.name || 'غير محدد');
  addFact(facts, 'رقم الموبايل', order.phone || 'غير محدد');
  addFact(facts, 'المودريتور', order.moderatorName || 'غير محدد');
  identity.append(facts);
  container.append(identity);

  const delivery = createSection('بيانات التسليم');
  const deliveryFacts = createElement('div', 'summary-facts-grid');
  addFact(deliveryFacts, 'طريقة الاستلام', data.fulfillmentLabel);
  if (order.fulfillmentMethod === 'delivery') {
    addFact(deliveryFacts, 'المحافظة', order.city === 'Cairo' ? 'القاهرة' : order.city === 'Giza' ? 'الجيزة' : order.city || 'غير محدد');
    if (order.area) addFact(deliveryFacts, 'المنطقة', order.area);
    if (order.addressDetails) addFact(deliveryFacts, 'العنوان', order.addressDetails);
  }
  addFact(deliveryFacts, 'يوم التسليم', formatArabicDate(order.deliveryDate));
  addFact(deliveryFacts, 'وقت التسليم', formatOrderTime(order.deliveryTimeFrom, order.deliveryTimeTo));
  delivery.append(deliveryFacts);
  container.append(delivery);

  const pricing = createSection('ملخص الحساب', 'summary-pricing-panel');
  addPriceRow(pricing, 'سعر التورتة', data.cakeBase, data.cakeDesignExtra, data.cakeTotal, {
    subtitle: data.cakeDesignExtra > 0 ? 'السعر الأساسي + زيادة التصميم' : 'السعر الأساسي'
  });
  if (data.addOnsTotal > 0) {
    const addonAmounts = data.addOns.map(item => getAddOnAmounts(item));
    const addonsBase = addonAmounts.reduce((sum, item) => sum + item.base, 0);
    const addonsDesign = addonAmounts.reduce((sum, item) => sum + item.designExtra, 0);
    addPriceRow(pricing, 'إجمالي الإضافات', addonsBase, addonsDesign, data.addOnsTotal, {
      subtitle: 'السعر الأساسي + زيادة التصميم'
    });
  }
  if (data.deliveryFee > 0) {
    addPriceRow(pricing, 'رسوم التوصيل', 0, 0, data.deliveryFee, { totalOnly: true });
  }
  if (data.discountAmount > 0) {
    const discountLabel = DISCOUNT_LABELS[data.discountType]?.(data.discountInputValue) || 'الخصم';
    const discountRow = createElement('div', 'summary-money-row summary-discount-row');
    discountRow.append(
      createElement('strong', 'summary-money-label', discountLabel),
      createElement('strong', 'summary-money-amount', `− ${formatEGP(data.discountAmount)}`)
    );
    pricing.append(discountRow);
  }
  const totalRow = createElement('div', 'summary-final-total');
  totalRow.append(
    createElement('span', 'summary-final-label', 'الإجمالي النهائي'),
    createElement('strong', 'summary-final-amount', formatEGP(data.totalOrder))
  );
  pricing.append(totalRow);
  const depositRow = createElement('div', 'summary-money-row');
  depositRow.append(
    createElement('strong', 'summary-money-label', 'الديبوزيت المدفوع'),
    createElement('strong', 'summary-money-amount', formatEGP(data.deposit))
  );
  pricing.append(depositRow);
  const remainingRow = createElement('div', 'summary-money-row');
  remainingRow.append(
    createElement('strong', 'summary-money-label', 'المتبقي'),
    createElement('strong', 'summary-money-amount', formatEGP(data.remaining))
  );
  pricing.append(remainingRow);
  container.append(pricing);

  const details = createSection('تفاصيل الكيكة والإضافات', 'summary-details-panel');
  const cakeTypeFact = createElement('div', 'summary-fact summary-cake-type-fact');
  cakeTypeFact.append(
    createElement('span', 'summary-fact-label', 'نوع الكيكة والحجم'),
    createElement('strong', 'summary-fact-value', `${data.cakeTypeLabel} — ${data.sizeLabel}`)
  );
  details.append(cakeTypeFact);

  const addonsFact = createElement('div', 'summary-extra-details summary-addons-detail');
  addonsFact.append(createElement('span', 'summary-fact-label', 'التوابع'));
  const addonsText = data.addOns.length
    ? data.addOns.map(item => {
        const amounts = getAddOnAmounts(item);
        return `${item.name || 'إضافة'} (${formatAddOnQuantity(amounts.quantity, item.unit)})`;
      }).join('، ')
    : 'لا توجد توابع';
  addonsFact.append(createElement('p', 'summary-extra-details-text', addonsText));
  details.append(addonsFact);

  const cakeFacts = createElement('div', 'summary-facts-grid');
  addFact(cakeFacts, 'الحشو', data.fillingLabel);
  addFact(cakeFacts, 'التغطية', data.coveringLabel);
  details.append(cakeFacts);

  const extraDetails = createElement('div', 'summary-extra-details');
  extraDetails.append(
    createElement('span', 'summary-fact-label', 'تفاصيل إضافية'),
    createElement('p', 'summary-extra-details-text', String(order.details || '').trim() || 'لا يوجد')
  );
  details.append(extraDetails);
  container.append(details);

}
