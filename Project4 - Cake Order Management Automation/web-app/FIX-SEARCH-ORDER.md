# Lozz Cake – إصلاح البحث عن أوردر

## التعديل الأساسي
- صفحة التعديل تستخدم `POST https://cloudfare.ziad-n8n.cfd/webhook/get-order`.
- ملف `n8n-workflows/02-get-order.json` أصبح Workflow PostgreSQL وليس Google Sheets، ومسار Webhook مضبوط على `get-order`.
- صفحة `edit-order.html` تقرأ `orderCode` و`phone` من Query String وتضعهما في حقول البحث تلقائيًا، بدون تنفيذ البحث تلقائيًا.

## خطوات التشغيل
1. استورد `n8n-workflows/02-get-order.json` إلى n8n.
2. افتح عقدة PostgreSQL المسماة `Find Order in PostgreSQL` واختر Credential قاعدة البيانات الصحيحة (مثلاً `lead_management`). ملف JSON لا يحتوي على بيانات اعتمادك السرية.
3. تأكد أن الجداول والأعمدة المستخدمة موجودة: `orders`, `order_addons`, `order_images`، وبالأسماء الموجودة في SQL داخل العقدة.
4. احفظ الـ Workflow وفعّله Active.
5. افتح صفحة التعديل وجرب البحث.

## اختبار الرابط
`edit-order.html?orderCode=123456-c&phone=01000000000`
ستظهر القيم داخل الحقول؛ اضغط «بحث عن الطلب».

## ملاحظة مهمة
الملف القديم الخاص بـ Google Sheets موجود داخل `n8n-workflows/legacy-google-sheets/` ولا تستخدمه مع قاعدة PostgreSQL.
