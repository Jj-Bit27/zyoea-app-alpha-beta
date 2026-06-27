// Configuración compartida para todos los tests k6
export const BASE_URL = 'https://api.suavus.app';
export const GRAPHQL_URL = `${BASE_URL}/query`;
export const WS_URL = `wss://api.suavus.app/ws/orders?restaurantId=1`;

// Token JWT — usuario real rol "client", ID 9
export const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODI2ODUxOTAsInJlc3RhdXJhbnQiOjAsInJvbGUiOiJjbGllbnQiLCJzdWIiOjl9.BVZttHMIPB0hdGve8epMD95CF5RqD2pLkVaq4rVEZkE';

export const RESTAURANT_ID = '1';
export const USER_ID = '9';

export const GRAPHQL_HEADERS = {
  'Content-Type': 'application/json',
};

export const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};
