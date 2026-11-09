/** Add-on catalog and repeatable order rows shared by create/edit pages. */
export const ADD_ON_OPTIONS = [
  { id: 'cupcake_piece', name: 'كب كيك', unit: 'قطعة', price: 35 },
  { id: 'cupcake_dozen', name: 'كب كيك', unit: '12 قطعة', price: 380 },
  { id: 'filled_cupcake_piece', name: 'كب كيك محشي', unit: 'قطعة', price: 50 },
  { id: 'filled_cupcake_dozen', name: 'كب كيك محشي', unit: '12 قطعة', price: 550 },
  { id: 'donut_piece', name: 'دونتس', unit: 'قطعة', price: 35 },
  { id: 'donut_dozen', name: 'دونتس', unit: '12 قطعة', price: 380 },
  { id: 'filled_donut_piece', name: 'دونتس محشي', unit: 'قطعة', price: 50 },
  { id: 'filled_donut_dozen', name: 'دونتس محشي', unit: '12 قطعة', price: 550 },
  { id: 'cake_pops_piece', name: 'كيك بوبس', unit: 'قطعة', price: 30 },
  { id: 'cake_pops_dozen', name: 'كيك بوبس', unit: '12 قطعة', price: 320 },
  { id: 'cookies_piece', name: 'كوكيز', unit: 'قطعة', price: 30 },
  { id: 'cookies_dozen', name: 'كوكيز', unit: '12 قطعة', price: 320 },
  { id: 'icing_cookies_piece', name: 'كوكيز آيسنج', unit: 'قطعة', price: 40 },
  { id: 'icing_cookies_dozen', name: 'كوكيز آيسنج', unit: '12 قطعة', price: 450 },
  { id: 'cakesicle_piece', name: 'كيك سايكل', unit: 'قطعة', price: 50 },
  { id: 'cakesicle_dozen', name: 'كيك سايكل', unit: '12 قطعة', price: 550 },
  { id: 'oreo_piece', name: 'أوريو', unit: 'قطعة', price: 25 },
  { id: 'oreo_dozen', name: 'أوريو', unit: '12 قطعة', price: 260 },
  { id: 'gateau_piece', name: 'جاتوه شوكولاتة أو فانيليا بنفس ثيم الكيك', unit: 'قطعة', price: 45 },
  { id: 'gateau_dozen', name: 'جاتوه شوكولاتة أو فانيليا بنفس ثيم الكيك', unit: '12 قطعة', price: 500 },
  { id: 'mini_sandwich_mix_kg', name: 'ميني سندوتش ميكس جبن ولانشون', unit: 'كيلو', price: 350 },
  { id: 'mini_sandwich_chicken_kg', name: 'ميني سندوتش استربس أو شاورما فراخ', unit: 'كيلو', price: 500 },
  { id: 'mini_sandwich_meat_kg', name: 'ميني سندوتش لحوم (كفتة أو شاورما لحمة)', unit: 'كيلو', price: 650 },
  { id: 'mini_pizza_kg', name: 'ميني بيتزا', unit: 'كيلو', price: 280 }
];

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function parseAddOns(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function initAddOns({ container, addButton, initial = [], onChange = () => {} }) {
  container.replaceChildren();
  const rows = [];

  const getAddOns = () => rows.map(row => {
    const option = ADD_ON_OPTIONS.find(item => item.id === row.product.value);
    const quantity = Math.max(0, Number(row.quantity.value) || 0);
    const unitPrice = Number(option?.price) || 0;
    const designExtraEGP = money(Math.max(0, Number(row.designExtra.value) || 0));
    return {
      productId: option?.id || '',
      name: option?.name || '',
      unit: option?.unit || '',
      quantity,
      unitPrice,
      designExtraEGP,
      total: money(quantity * unitPrice + designExtraEGP)
    };
  }).filter(item => item.productId && item.quantity > 0);

  const emit = () => onChange(getAddOns());

  const refreshRow = row => {
    const option = ADD_ON_OPTIONS.find(item => item.id === row.product.value);
    row.basePrice.value = option ? String(option.price) : '';
    row.unit.textContent = option ? `السعر الأساسي لكل ${option.unit} — ثابت` : 'اختار الإضافة';
    const quantity = Math.max(0, Number(row.quantity.value) || 0);
    const baseTotal = quantity * (Number(option?.price) || 0);
    const designExtra = Math.max(0, Number(row.designExtra.value) || 0);
    row.total.textContent = `${money(baseTotal + designExtra).toLocaleString('ar-EG')} جنيه`;
  };

  const addRow = data => {
    const wrap = document.createElement('div');
    wrap.className = 'addon-row';
    const product = document.createElement('select');
    product.className = 'addon-product';
    product.setAttribute('aria-label', 'نوع الإضافة');
    product.add(new Option('اختار الإضافة', ''));
    ADD_ON_OPTIONS.forEach(option => product.add(new Option(`${option.name} — ${option.unit} (${option.price} جنيه)`, option.id)));

    const quantity = document.createElement('input');
    quantity.className = 'addon-quantity'; quantity.type = 'number'; quantity.min = '1'; quantity.step = '1'; quantity.value = String(data?.quantity ?? 1);
    quantity.setAttribute('aria-label', 'الكمية');

    const basePrice = document.createElement('input');
    basePrice.className = 'addon-price'; basePrice.type = 'number'; basePrice.readOnly = true;
    basePrice.setAttribute('aria-label', 'السعر الأساسي الثابت');

    const designExtra = document.createElement('input');
    designExtra.className = 'addon-design-extra'; designExtra.type = 'number'; designExtra.min = '0'; designExtra.step = '0.01'; designExtra.value = String(data?.designExtraEGP ?? 0);
    designExtra.setAttribute('aria-label', 'زيادة التصميم للصنف');
    designExtra.placeholder = '0';

    const unit = document.createElement('small'); unit.className = 'addon-unit';
    const total = document.createElement('strong'); total.className = 'addon-row-total';
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-addon-button'; remove.textContent = 'حذف';

    if (data?.productId && ADD_ON_OPTIONS.some(option => option.id === data.productId)) product.value = data.productId;
    const matched = ADD_ON_OPTIONS.find(option => option.id === product.value);
    if (matched && data && data.designExtraEGP === undefined && data.unitPrice !== undefined) {
      // Preserve the total of legacy orders whose add-on unit price was manually edited.
      const oldTotal = Number(data.total);
      if (Number.isFinite(oldTotal)) {
        designExtra.value = String(Math.max(0, money(oldTotal - (Number(data.quantity) || 0) * matched.price)));
      } else if (Number(data.unitPrice) !== matched.price) {
        designExtra.value = String(Math.max(0, money((Number(data.quantity) || 0) * (Number(data.unitPrice) - matched.price))));
      }
    }

    const productField = document.createElement('label'); productField.className = 'addon-product-field'; productField.append('الإضافة', product);
    const quantityField = document.createElement('label'); quantityField.className = 'addon-quantity-field'; quantityField.append('الكمية', quantity);
    const priceField = document.createElement('label'); priceField.className = 'addon-price-field'; priceField.append('السعر الأساسي (ثابت)', basePrice, unit);
    const designField = document.createElement('label'); designField.className = 'addon-design-field'; designField.append('زيادة التصميم للصنف (اختياري)', designExtra);
    const totalField = document.createElement('div'); totalField.className = 'addon-total-field';
    const totalLabel = document.createElement('span'); totalLabel.textContent = 'إجمالي الصنف';
    totalField.append(totalLabel, total);
    wrap.append(productField, quantityField, priceField, designField, totalField, remove);
    container.append(wrap);
    const row = { wrap, product, quantity, basePrice, designExtra, unit, total };
    rows.push(row);

    product.addEventListener('change', () => {
      designExtra.value = '0';
      refreshRow(row); emit();
    });
    quantity.addEventListener('input', () => { refreshRow(row); emit(); });
    designExtra.addEventListener('input', () => { refreshRow(row); emit(); });
    remove.addEventListener('click', () => {
      const index = rows.indexOf(row); if (index >= 0) rows.splice(index, 1);
      wrap.remove(); emit();
    });
    refreshRow(row);
  };

  (Array.isArray(initial) ? initial : parseAddOns(initial)).forEach(addRow);
  addButton.addEventListener('click', () => addRow());
  return {
    getAddOns,
    getTotal: () => money(getAddOns().reduce((sum, item) => sum + item.total, 0)),
    setAddOns(items) {
      rows.splice(0, rows.length); container.replaceChildren();
      parseAddOns(items).forEach(addRow); emit();
    }
  };
}
