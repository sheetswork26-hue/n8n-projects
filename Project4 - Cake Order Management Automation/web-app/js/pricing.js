/**
 * قواعد التسعير منفصلة عن عرض الصفحة وإرسال الطلب.
 */
import { AREAS, CAKE_OPTIONS } from './config.js';
import { area, city, cakeType, cakeSize, discountType, discountValue, fulfillmentMethod } from './dom.js';

export function getSelectedAreaPolicy() {
  return (AREAS[city.value] || []).find(item => item.name === area.value) || null;
}

export function getSelectedCakeSize() {
  return (CAKE_OPTIONS[cakeType.value] || []).find(item => item.value === cakeSize.value) || null;
}

export function calculateOrderTotals(addOnsTotalEGP = 0, cakeDesignExtraEGP = 0) {
  const selectedSize = getSelectedCakeSize();
  const areaPolicy = getSelectedAreaPolicy();
  const cakeSubtotal = selectedSize ? Number(selectedSize.price) : 0;
  const deliveryFee = fulfillmentMethod.value === 'delivery' && areaPolicy
    ? Number(areaPolicy.fee)
    : 0;
  const type = discountType.value;
  const inputValue = type === 'none' ? 0 : Math.max(0, Number(discountValue.value) || 0);
  const addOnsTotal = Math.max(0, Number(addOnsTotalEGP) || 0);
  const cakeDesignExtra = Math.max(0, Number(cakeDesignExtraEGP) || 0);
  const preDiscountTotal = cakeSubtotal + cakeDesignExtra + addOnsTotal + deliveryFee;

  let discountAmount = 0;
  if (type === 'percentage') {
    discountAmount = preDiscountTotal * Math.min(inputValue, 100) / 100;
  } else if (type === 'amount') {
    discountAmount = Math.min(inputValue, preDiscountTotal);
  }

  discountAmount = Math.round(discountAmount * 100) / 100;
  const total = Math.max(0, preDiscountTotal - discountAmount);

  return {
    cakeSubtotal,
    cakeDesignExtraEGP: Math.round(cakeDesignExtra * 100) / 100,
    addOnsTotalEGP: addOnsTotal,
    deliveryFee,
    preDiscountTotal,
    discountType: type,
    discountInputValue: inputValue,
    discountAmountEGP: discountAmount,
    totalOrderEGP: Math.round(total * 100) / 100
  };
}
