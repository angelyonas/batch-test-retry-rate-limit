export const API_BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';

export const API_HEADERS = {
  ...(process.env.VTEX_APP_KEY && { 'X-VTEX-API-AppKey': process.env.VTEX_APP_KEY }),
  ...(process.env.VTEX_APP_TOKEN && { 'X-VTEX-API-AppToken': process.env.VTEX_APP_TOKEN }),
};

export const TEST_RATE_LIMIT_URL = process.env.TEST_RATE_LIMIT_URL || '/api/test-endpoint';

export const TEST_RATE_LIMIT_LOOPS = Number(process.env.TEST_RATE_LIMIT_LOOPS) || 10;

export const TEST_RATE_LIMIT_REQUESTS_PER_INTERVAL = Number(process.env.TEST_RATE_LIMIT_REQUESTS_PER_INTERVAL) || 5;

export const TEST_RATE_LIMIT_INTERVAL = Number(process.env.TEST_RATE_LIMIT_INTERVAL) || 60000; // 1 minute in milliseconds
