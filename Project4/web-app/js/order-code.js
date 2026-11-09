/**
 * إنشاء كود عشوائي للطلب بالشكل 123456-c.
 * ملاحظة: التوليد العشوائي وحده لا يضمن عدم تكرار الكود بين كل الطلبات.
 */
export function generateOrderCode() {
  const values = new Uint32Array(1);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
    const sixDigitNumber = 100000 + (values[0] % 900000);
    return `${sixDigitNumber}-c`;
  }

  // احتياطي للبيئات القديمة التي لا توفر Web Crypto.
  const sixDigitNumber = Math.floor(100000 + Math.random() * 900000);
  return `${sixDigitNumber}-c`;
}
