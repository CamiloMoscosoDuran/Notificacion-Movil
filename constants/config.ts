const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const defaultApiUrl = 'http://3.228.41.49:30082';

export const API_BASE_URL = (configuredApiUrl || defaultApiUrl).replace(/\/+$/, '');