/**
 * التحقق من صحة بيانات الطلب.
 * لا يحتوي هذا الملف على كود العرض أو الإرسال.
 */
import { CAKE_OPTIONS, MIN_ADDRESS_LENGTH, MIN_NAME_LENGTH, PHONE_REGEX } from './config.js';
import {
  form, nameInput, phoneInput, moderatorName, fulfillmentMethod, city, area,
  addressDetails, deliveryDate, deliveryTimeFrom, deliveryTimeTo, cakeType,
  cakeSize, fillingError, coveringError, discountType, discountValue,
  discountError, setError, clearError, getTodayISODate
} from './dom.js';
import { getSelectedAreaPolicy, getSelectedCakeSize } from './pricing.js';

export function validateForm() {
  let isValid = true;

  form.querySelectorAll('input:not([type="radio"]), select, textarea').forEach(clearError);
  fillingError.hidden = true;
  coveringError.hidden = true;
  discountError.hidden = true;
  discountError.textContent = '';

  if (nameInput.value.trim().length < MIN_NAME_LENGTH) {
    setError(nameInput, `اكتب اسمك (${MIN_NAME_LENGTH} أحرف على الأقل).`);
    isValid = false;
  }

  if (!PHONE_REGEX.test(phoneInput.value.trim())) {
    setError(phoneInput, 'اكتب رقم موبايل مصري صحيح من 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.');
    isValid = false;
  }

  if (!moderatorName.value) {
    setError(moderatorName, 'اختار اسم المودريتور اللي بتعمل الطلب.');
    isValid = false;
  }

  if (fulfillmentMethod.value === 'delivery') {
    if (!city.value) {
      setError(city, 'اختار المحافظة.');
      isValid = false;
    }

    if (!area.value) {
      setError(area, 'اختار المنطقة.');
      isValid = false;
    }

    if (addressDetails.value.trim().length < MIN_ADDRESS_LENGTH) {
      setError(addressDetails, 'اكتب العنوان بالتفصيل، بما في ذلك رقم العقار والدور والشقة.');
      isValid = false;
    }
  }

  const today = getTodayISODate();
  if (!deliveryDate.value) {
    setError(deliveryDate, 'اختار يوم التسليم.');
    isValid = false;
  } else if (deliveryDate.value < today) {
    setError(deliveryDate, 'مينفعش تختار يوم سابق.');
    isValid = false;
  }

  if (!deliveryTimeFrom.value) {
    setError(deliveryTimeFrom, 'اختار وقت التسليم.');
    isValid = false;
  } else if (deliveryTimeFrom.value !== 'last') {
    if (!deliveryTimeTo.value) {
      setError(deliveryTimeTo, 'اختار نهاية وقت التسليم.');
      isValid = false;
    } else {
      const startHour = Number(deliveryTimeFrom.value.slice(0, 2));
      const endHour = Number(deliveryTimeTo.value.slice(0, 2));
      if (endHour - startHour < 2) {
        setError(deliveryTimeTo, 'لازم يكون الفرق بين البداية والنهاية ساعتين على الأقل.');
        isValid = false;
      }
    }
  }

  if (!cakeType.value || !CAKE_OPTIONS[cakeType.value]) {
    setError(cakeType, 'اختار نوع الكيكة.');
    isValid = false;
  }

  if (!getSelectedCakeSize()) {
    setError(cakeSize, 'اختار حجمًا من الأحجام المتاحة.');
    isValid = false;
  }

  if (!form.querySelector('input[name="filling"]:checked')) {
    fillingError.textContent = 'اختار الحشو.';
    fillingError.hidden = false;
    isValid = false;
  }

  if (!form.querySelector('input[name="covering"]:checked')) {
    coveringError.textContent = 'اختار التغطية.';
    coveringError.hidden = false;
    isValid = false;
  }

  if (discountType.value !== 'none') {
    const rawDiscount = discountValue.value.trim();
    const amount = Number(rawDiscount);
    const selectedSize = getSelectedCakeSize();
    const cakePrice = selectedSize ? Number(selectedSize.price) : 0;
    const deliveryFee = fulfillmentMethod.value === 'delivery'
      ? Number(getSelectedAreaPolicy()?.fee || 0)
      : 0;
    const addOnsTotal = [...document.querySelectorAll('#addOnsList .addon-row')].reduce((sum, row) => {
      const quantity = Number(row.querySelector('.addon-quantity')?.value || 0);
      const unitPrice = Number(row.querySelector('.addon-price')?.value || 0);
      const designExtra = Math.max(0, Number(row.querySelector('.addon-design-extra')?.value || 0));
      return sum + Math.max(0, quantity) * Math.max(0, unitPrice) + designExtra;
    }, 0);
    const cakeDesignExtra = Math.max(0, Number(document.getElementById('cakeDesignExtraEGP')?.value || 0));
    const maxDiscount = cakePrice + cakeDesignExtra + addOnsTotal + deliveryFee;

    if (!rawDiscount || !Number.isFinite(amount) || amount < 0) {
      setDiscountError('اكتب قيمة خصم صحيحة أكبر من أو تساوي صفر.');
      isValid = false;
    } else if (discountType.value === 'percentage' && amount > 100) {
      setDiscountError('نسبة الخصم لازم تكون من 0 إلى 100٪.');
      isValid = false;
    } else if (discountType.value === 'amount' && amount > maxDiscount) {
      setDiscountError('قيمة الخصم مينفعش تكون أكبر من إجمالي الطلب قبل الخصم.');
      isValid = false;
    }
  }

  return isValid;
}

function setDiscountError(message) {
  discountError.textContent = message;
  discountError.hidden = false;
  discountValue.setAttribute('aria-invalid', 'true');
}
