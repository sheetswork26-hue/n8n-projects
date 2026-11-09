/**
 * Build multipart/form-data from a flat API object.
 * Scalar values become independent form fields. Nested arrays/objects are JSON strings
 * because multipart form fields are text; n8n can parse only those nested fields.
 */
export function appendMultipartFields(formData, values) {
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value === undefined) continue;

    if (value === null) {
      formData.append(key, '');
      continue;
    }

    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      formData.append(key, JSON.stringify(value));
      continue;
    }

    formData.append(key, String(value));
  }

  return formData;
}
