# Lozz Cake API contract — n8n + PostgreSQL + Cloudflare R2

The frontend sends `multipart/form-data`. **Every scalar order property is an independent field under `body`**. There is no `body.order` wrapper.

## 1. Create order

**Method/path:** `POST /webhook/lozz-cake/create-order`  
**Content-Type:** `multipart/form-data` (the browser sets the boundary automatically)

Example Webhook body:

```json
{
  "orderCode": "553592-c",
  "name": "زياد",
  "phone": "01000000000",
  "moderatorName": "امنية",
  "fulfillmentMethod": "delivery",
  "city": "Cairo",
  "area": "حدائق الزيتون",
  "addressDetails": "شارع تجريبي",
  "deliveryDate": "2026-10-30",
  "deliveryTimeFrom": "11:00 ص",
  "deliveryTimeTo": "2:00 م",
  "cakeType": "two_tier",
  "cakeSize": "15",
  "dimensions": "",
  "numberOfTiers": "2",
  "filling": "vanilla",
  "covering": "cream",
  "details": "تفاصيل الطلب",
  "basePriceEGP": "1700",
  "cakeDesignExtraEGP": "130",
  "addOns": "[{\\"productId\\":\\"cakesicle_dozen\\",\\"productName\\":\\"كيك سايكل\\",\\"unit\\":\\"12 قطعة\\",\\"quantity\\":1,\\"unitPriceEGP\\":550,\\"designExtraEGP\\":10,\\"totalEGP\\":560}]",
  "addOnsTotalEGP": "560",
  "deliveryFeeEGP": "250",
  "discountType": "percentage",
  "discountInputValue": "10",
  "discountAmountEGP": "251",
  "totalOrderEGP": "2259",
  "orderSummary": "ملخص الطلب...",
  "submittedAt": "2026-10-30T13:10:56.431Z"
}
```

Multipart form fields are strings by definition. The n8n normalization Code node should convert numeric fields to numbers, convert empty optional values to `null`, and parse `addOns` into an array.

Files are separate Binary properties:
- `cakeImage_1`, `cakeImage_2`, ... (optional)
- `depositImage_1`, `depositImage_2`, ... (optional)

Images are resized to a maximum 1800 px edge and converted to WebP in the browser when beneficial. Use the actual uploaded Binary metadata for the stored filename, MIME type, and byte size.

## 2. n8n normalization node

Place a Code node immediately after the Webhook. Set it to **Run Once for All Items**:

```javascript
const item = $input.first();
const body = item.json.body ?? {};

const numericFields = [
  'numberOfTiers',
  'basePriceEGP',
  'cakeDesignExtraEGP',
  'addOnsTotalEGP',
  'deliveryFeeEGP',
  'discountInputValue',
  'discountAmountEGP',
  'totalOrderEGP',
  'depositEGP',
  'remainingEGP'
];

const normalized = { ...body };

for (const key of numericFields) {
  if (normalized[key] === undefined || normalized[key] === '') {
    normalized[key] = null;
  } else {
    const value = Number(normalized[key]);
    if (!Number.isFinite(value)) throw new Error(`Invalid numeric field: ${key}`);
    normalized[key] = value;
  }
}

for (const key of ['dimensions']) {
  if (normalized[key] === '') normalized[key] = null;
}

for (const key of ['addOns', 'imagesToKeep']) {
  if (typeof normalized[key] === 'string' && normalized[key] !== '') {
    try {
      normalized[key] = JSON.parse(normalized[key]);
    } catch {
      throw new Error(`Invalid JSON field: ${key}`);
    }
  }
}

normalized.addOns ??= [];

return [{
  json: normalized,
  binary: item.binary ?? {}
}];
```

After this node, use direct expressions such as `{{$json.name}}`, `{{$json.totalOrderEGP}}`, and `{{$json.addOns}}`. Images remain under `$binary`.

## 3. Search an order for editing

**Method/path:** `POST /webhook/get-order`  
**Content-Type:** `multipart/form-data`

Fields:
- `orderCode`
- `phone`

Success response:

```json
{
  "success": true,
  "order": {
    "id": "123",
    "orderCode": "123456-c",
    "name": "Customer name",
    "phone": "01000000000",
    "moderatorName": "Moderator",
    "fulfillmentMethod": "delivery",
    "city": "Cairo",
    "area": "Area name",
    "addressDetails": "Full address",
    "deliveryDate": "2026-10-30",
    "deliveryTimeFrom": "12:00",
    "deliveryTimeTo": "15:00",
    "cakeType": "two_tier",
    "cakeSize": "20-25",
    "dimensions": null,
    "numberOfTiers": 2,
    "filling": "vanilla",
    "covering": "cream",
    "details": "Additional notes",
    "basePriceEGP": 1900,
    "cakeDesignExtraEGP": 100,
    "addOnsTotalEGP": 0,
    "deliveryFeeEGP": 250,
    "discountType": "percentage",
    "discountInputValue": 10,
    "discountAmountEGP": 225,
    "totalOrderEGP": 2025,
    "depositEGP": 0,
    "remainingEGP": 2025,
    "orderStatus": "قيد التأكيد",
    "orderSummary": "Copy-ready Arabic order summary",
    "submittedAt": "2026-10-30T11:22:01.621Z",
    "addOns": [],
    "images": {
      "cake": [{ "id": "501", "fileName": "cake-reference.png", "mimeType": "image/png", "fileSizeBytes": 1200000 }],
      "deposit": []
    }
  }
}
```

The response uses camelCase keys. `deliveryDate` is `YYYY-MM-DD`; payload times use 12-hour Arabic format such as `11:00 ص` and `2:00 م`. The special last-time value is `اخر معاد` for the start time. Enum values are API codes such as `delivery`, `Cairo`, `two_tier`, `vanilla`, `cream`, and `percentage`. For pickup, the frontend sends `fulfillmentMethod: "استلام من مكان"`; normalize this to the database value `pickup` in n8n before inserting/updating `orders` (the database schema still expects `delivery` or `pickup`). Image metadata must not expose R2 credentials or private object keys.

Each `addOns` item uses `productId`, `productName`, `unit`, `quantity`, `unitPriceEGP`, `designExtraEGP`, and `totalEGP`.

## 4. Download an existing image preview

**Method/path:** `POST /webhook/get-order-image`

Fields:
- `imageId`
- `orderCode`
- `phone`

Return the image bytes as a binary response with the correct `Content-Type`. Validate the image belongs to the identified order before downloading its known R2 object key. Keep the R2 bucket private.

## 5. Update an order

**Method/path:** `POST /webhook/lozz-cake/update-order`

All scalar order fields are independent multipart fields, same as create. Additional fields:
- `depositEGP`
- `remainingEGP`
- `orderStatus`
  - Allowed values: `تم التأكيد`, `قيد التأكيد`, `ملغي`. A positive `depositEGP` automatically sets `تم التأكيد` in the edit page, but the moderator can manually choose any of the three statuses.
- `lastUpdatedAt`
- `imagesToKeep`: JSON string containing `{ "cake": ["501"], "deposit": ["610"] }`
- New `cakeImage_N` and `depositImage_N` Binary files, if any.

`imagesToKeep` is authoritative. Verify each retained ID belongs to this order and the expected image type. Mark omitted image rows inactive and set `deleted_at`; upload new files and create new `order_images` rows.

## 6. Data mapping and storage

- Main scalar fields map to `orders` (camelCase API names map to snake_case columns).
- Parse the `addOns` field into an array and insert rows into `order_addons`.
- Upload each Binary property to R2 using an explicit object key, then store the object key and file metadata in `order_images`.
- Use explicit object-key upload/download operations. Do not use bucket listing / `ListObjectsV2`; the tested R2 integration did not support it.
- Keep R2 private. Never place R2 Access Key ID or Secret Access Key in browser JavaScript.
- For updates, update the order and replace add-ons transactionally. If an R2 upload succeeds but the DB write fails, remove newly uploaded objects as compensation.

## 7. CORS and response

JSON endpoints should return `{ "success": true|false, ... }`. The image endpoint returns binary image data on success. Allow the Live Server origin (for example `http://127.0.0.1:5500`) and the production frontend origin in n8n CORS settings.

Do not manually set the browser `Content-Type` header for `FormData`; the browser must supply the multipart boundary.
