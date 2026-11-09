import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');

test('رسوم التوصيل تحافظ على عرض المبلغ ولا تسمح بتكسير الرقم عموديًا', () => {
  assert.match(css, /\.summary-money-row\.summary-money-row-total-only\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content/s);
  assert.match(css, /\.summary-money-row\.summary-money-row-total-only\s+\.summary-money-amount\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.summary-money-row\.summary-money-row-total-only\s+\.summary-money-amount\s*\{[^}]*overflow-wrap:\s*normal/s);
});

test('تفاصيل الأسعار تتحول إلى تخطيط مرن للشاشات الصغيرة', () => {
  assert.match(css, /@media\s*\(max-width:\s*600px\)\s*\{[^}]*\.summary-money-row:not\(\.summary-money-row-total-only\)\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /@media\s*\(max-width:\s*600px\)\s*\{[\s\S]*?\.summary-price-equation,[\s\S]*?\.summary-addon-equation\s*\{[^}]*flex-wrap:\s*wrap/s);
});
