export const parseApiError = (data: any): string => {
  if (!data) return 'An unexpected error occurred.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.message) return data.message;
  
  if (typeof data === 'object') {
    const messages: string[] = [];
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (Array.isArray(val)) {
        messages.push(`${key !== 'non_field_errors' ? `${key}: ` : ''}${val.join(' ')}`);
      } else if (typeof val === 'string') {
        messages.push(`${key !== 'non_field_errors' ? `${key}: ` : ''}${val}`);
      }
    }
    if (messages.length > 0) return messages.join(' | ');
  }
  
  return 'Request failed. Please check your inputs.';
};
