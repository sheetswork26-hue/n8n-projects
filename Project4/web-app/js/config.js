/**
 * إعدادات نموذج Cheer Cake.
 * عدّل الأسعار ومناطق التوصيل من هنا فقط.
 */

// عقد API الموحد لـ PostgreSQL + Cloudflare R2.
// للاختبار استبدل /webhook/ بـ /webhook-test/ بعد تشغيل Webhook في وضع Test.
const N8N_BASE_URL = 'https://cloudfare.ziad-n8n.cfd/webhook';
export const WEBHOOK_URL = `${N8N_BASE_URL}/create-order`;
export const GET_ORDER_WEBHOOK_URL = `${N8N_BASE_URL}/get-order`;
export const UPDATE_ORDER_WEBHOOK_URL = `${N8N_BASE_URL}/update-order`;
export const GET_ORDER_IMAGE_WEBHOOK_URL = `${N8N_BASE_URL}/get-order-image`;

export const AREAS = {
  Cairo: [
    { name: 'المقطم', fee: 150 },
    { name: 'الهضبة الوسطى', fee: 150 },
    { name: 'زهراء المعادي', fee: 150 },
    { name: 'المعراج', fee: 150 },
    { name: 'القطامية', fee: 150 },
    { name: 'التجمع', fee: 200 },
    { name: 'مدينة نصر', fee: 200 },
    { name: 'مصر الجديدة', fee: 200 },
    { name: 'المعادي', fee: 200 },
    { name: 'الزمالك', fee: 200 },
    { name: 'حدائق القبة', fee: 200 },
    { name: 'المنيل', fee: 200 },
    { name: 'الرحاب', fee: 200 },
    { name: 'صلاح سالم', fee: 200 },
    { name: 'جاردينيا', fee: 200 },
    { name: 'حلمية الزيتون', fee: 250 },
    { name: 'حدائق الزيتون', fee: 250 },
    { name: 'حدائق المعادي', fee: 250 },
    { name: 'جسر السويس', fee: 250 },
    { name: 'ألف مسكن', fee: 250 },
    { name: 'الزاوية', fee: 250 },
    { name: 'غمرة', fee: 250 },
    { name: 'النزهة الجديدة', fee: 250 },
    { name: 'المرج', fee: 250 },
    { name: 'السلام', fee: 250 },
    { name: 'مؤسسة الزكاة', fee: 250 },
    { name: 'عزبة النخل', fee: 250 },
    { name: 'عين شمس', fee: 250 },
    { name: 'المطرية', fee: 250 },
    { name: 'حلوان', fee: 250 },
    { name: 'دار السلام', fee: 250 },
    { name: 'العبور', fee: 250 },
    { name: 'مدينتي', fee: 250 },
    { name: 'الشروق', fee: 250 },
    { name: 'منطقة أخرى داخل القاهرة', fee: 350 }
  ],
  Giza: [
    { name: 'المهندسين', fee: 200 },
    { name: 'فيصل', fee: 250 },
    { name: 'الهرم', fee: 250 },
    { name: 'حدائق الأهرام', fee: 250 },
    { name: 'اللبيني', fee: 250 },
    { name: 'أكتوبر', fee: 250 },
    { name: 'الشيخ زايد', fee: 250 },
    { name: 'بولاق', fee: 250 },
    { name: 'كعابيش', fee: 250 },
    { name: 'طلبية', fee: 250 },
    { name: 'ترسا', fee: 250 },
    { name: 'إمبابة', fee: 250 },
    { name: 'منطقة أخرى داخل الجيزة', fee: 350 }
  ]
};

export const CAKE_OPTIONS = {
  single_tier: [
    { value: '2', label: 'تكفي شخصين', persons: '2', price: 550, note: 'كيكة بسيطة جدًا بدون تفاصيل ديكورية أو مجسمات' },
    { value: '4', label: 'تكفي 4 أشخاص', persons: '4', price: 650 },
    { value: '6', label: 'تكفي 6 أشخاص', persons: '6', price: 800 },
    { value: '8', label: 'تكفي 8 أشخاص', persons: '8', price: 950, note: 'أصغر حجم متاح على شكل قلب' },
    { value: '10', label: 'تكفي 10 أشخاص', persons: '10', price: 1100 },
    { value: '12', label: 'تكفي 12 شخصًا', persons: '12', price: 1350 },
    { value: '15-18', label: 'تكفي من 15 إلى 18 شخصًا', persons: '15–18', price: 1600 },
    { value: '20', label: 'تكفي 20 شخصًا', persons: '20', price: 1850 },
    { value: '30', label: 'تكفي 30 شخصًا', persons: '30', price: 2100 },
    { value: '40', label: 'تكفي 40 شخصًا', persons: '40', price: 2500 }
  ],
  two_tier: [
    { value: '12', label: 'تكفي 12 شخصًا', persons: '12', price: 1400 },
    { value: '15', label: 'تكفي 15 شخصًا', persons: '15', price: 1700 },
    { value: '20-25', label: 'تكفي من 20 إلى 25 شخصًا', persons: '20–25', price: 1900 },
    { value: '30-35', label: 'تكفي من 30 إلى 35 شخصًا', persons: '30–35', price: 2250 },
    { value: '40-45', label: 'تكفي من 40 إلى 45 شخصًا', persons: '40–45', price: 2750 },
    { value: '50-55', label: 'تكفي من 50 إلى 55 شخصًا', persons: '50–55', price: 3100 }
  ],
  three_tier: [
    { value: '25', label: 'تكفي 25 شخصًا', persons: '25', price: 2600 },
    { value: '35', label: 'تكفي 35 شخصًا', persons: '35', price: 3100 },
    { value: '45', label: 'تكفي 45 شخصًا', persons: '45', price: 3600 },
    { value: '55', label: 'تكفي 55 شخصًا', persons: '55', price: 4100 }
  ],
  rectangular_square: [
    { value: '40x60', label: 'مقاس 40 × 60 سم — تكفي من 50 إلى 60 شخصًا', dimensions: '40 × 60 سم', persons: '50–60', price: 4700, shape: 'مستطيلة' },
    { value: '40x30', label: 'مقاس 40 × 30 سم — تكفي من 25 إلى 30 شخصًا', dimensions: '40 × 30 سم', persons: '25–30', price: 2100, shape: 'مستطيلة' },
    { value: '30x30', label: 'مقاس 30 × 30 سم — تكفي من 20 إلى 25 شخصًا', dimensions: '30 × 30 سم', persons: '20–25', price: 2200, shape: 'يرجى تأكيد الشكل' },
    { value: '20x30', label: 'مقاس 20 × 30 سم — تكفي 15 شخصًا', dimensions: '20 × 30 سم', persons: '15', price: 1800, shape: 'مستطيلة' },
    { value: '40x40', label: 'مقاس 40 × 40 سم — تكفي 35 شخصًا', dimensions: '40 × 40 سم', persons: '35', price: 3300, shape: 'مربعة' },
    { value: '100_people', label: 'حجم يكفي 100 شخص', dimensions: 'حجم يكفي 100 شخص', persons: '100', price: 10000, shape: 'مستطيلة — يرجى تأكيد التفاصيل' },
    { value: '200_people', label: 'حجم يكفي 200 شخص', dimensions: 'حجم يكفي 200 شخص', persons: '200', price: 18000, shape: 'مستطيلة — يرجى تأكيد التفاصيل' }
  ],
  italian: [
    { value: '20x50', label: '20 × 50 سم', dimensions: '20 × 50 سم', price: 4000 },
    { value: '30x100', label: '30 × 100 سم', dimensions: '30 × 100 سم', price: 8000 }
  ]
};

export const CAKE_TYPE_LABELS = {
  single_tier: 'كيكة دور واحد',
  two_tier: 'كيكة دورين',
  three_tier: 'كيكة 3 أدوار',
  rectangular_square: 'كيكة مستطيلة أو مربعة',
  italian: 'كيكة إيطالي'
};

export const PHONE_REGEX = /^01[0125]\d{8}$/;
export const MIN_NAME_LENGTH = 3;
export const MIN_ADDRESS_LENGTH = 10;
export const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

