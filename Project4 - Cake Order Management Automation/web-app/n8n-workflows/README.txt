Lozz Cake — إعداد Webhooks لـ n8n

مهم: ملفات JSON الموجودة داخل legacy-google-sheets/ هي Workflows قديمة مبنية على Google Sheets. احتفظنا بها للرجوع فقط؛ لا تستوردها في إعداد PostgreSQL + Cloudflare R2 الحالي.

عقد الـ API التي أصبحت صفحات HTML تستخدمها:
1) POST /webhook/lozz-cake/create-order
2) POST /webhook/lozz-cake/get-order
3) POST /webhook/lozz-cake/get-order-image
4) POST /webhook/lozz-cake/update-order

شرح شكل الطلب والاستجابة، أسماء حقول Binary، وقواعد الاحتفاظ بالصور موجود في API-CONTRACT.md.
مخطط PostgreSQL موجود في ../database/schema.sql.

تنبيه: ملفات الـ Workflows الجديدة نفسها لم تُنشأ أو تُستورد تلقائيًا؛ يلزم بناؤها في n8n وربط PostgreSQL Credentials وR2 S3 Credentials الخاصة بحسابك. لا تضع مفاتيح R2 داخل ملفات HTML أو JavaScript.
