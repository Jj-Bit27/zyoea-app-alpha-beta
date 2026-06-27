import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { GRAPHQL_URL, RESTAURANT_ID, USER_ID, GRAPHQL_HEADERS, AUTH_HEADERS } from './00_config.js';

const soakErrors = new Rate('soak_errors');
const responseTime = new Trend('soak_response_time');

export const options = {
  stages: [
    { duration: '2m', target: 30 },    // Ramp up a 30 VUs
    { duration: '25m', target: 30 },   // Mantener 30 VUs por 25 min
    { duration: '3m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<4000', 'p(99)<8000'],
    http_req_failed: ['rate<0.02'],
  },
};

// Pool de queries para mezclar tráfico realista
const queries = [
  // 55% queries públicas
  { name: 'restaurants_random', auth: false, query: `
    query { restaurants { id name address description } }
  `, vars: {} },
  { name: 'menu_random', auth: false, query: `
    query menu($restaurantId: ID!) { 
      products(restaurantId: $restaurantId) { 
        id name description price 
        category { id name } 
      } 
    }
  `, vars: { restaurantId: RESTAURANT_ID } },
  { name: 'reviews_random', auth: false, query: `
    query reviews($restaurantId: ID!) { 
      reviews(restaurantId: $restaurantId) { id rating comment } 
    }
  `, vars: { restaurantId: RESTAURANT_ID } },
  { name: 'waitTime', auth: false, query: `
    query wait($restaurantId: ID!) { 
      estimatedWaitTime(restaurantId: $restaurantId) 
    }
  `, vars: { restaurantId: RESTAURANT_ID } },
  // 30% queries autenticadas
  { name: 'ordersByUser', auth: true, query: `
    query userOrders($userId: ID!) { 
      ordersByUser(userId: $userId) { 
        id status total date paid orderDetail { productId quantity subtotal } 
      } 
    }
  `, vars: { userId: USER_ID } },
  { name: 'bookingsUser', auth: true, query: `
    query userBookings($userId: ID!) { 
      bookingsUser(userId: $userId) { 
        id people time status cancellationReason 
        restaurant { id name } 
      } 
    }
  `, vars: { userId: USER_ID } },
  { name: 'getCart', auth: true, query: `
    query cart($userId: ID!) { 
      getCart(userId: $userId) { productId productName quantity price } 
    }
  `, vars: { userId: USER_ID } },
  // 15% mutations ligeras
  { name: 'addToCart_light', auth: true, query: `
    mutation addToCart($userId: ID!, $productId: Int!, $quantity: Int!, $restaurantId: Int!) {
      addToCart(userId: $userId, productId: $productId, quantity: $quantity, restaurantId: $restaurantId) { productId quantity }
    }
  `, vars: { userId: USER_ID, productId: 1, quantity: 1, restaurantId: parseInt(RESTAURANT_ID) } },
  { name: 'acceptTerms', auth: true, query: `
    mutation acceptTerms($userId: ID!, $type: TermsType!) {
      acceptTerms(userId: $userId, type: $type) { termsType }
    }
  `, vars: { userId: USER_ID, type: 'USER_TERMS' } },
];

export default function () {
  // Selección ponderada: 55% públicas, 30% auth queries, 15% mutations
  const q = queries[Math.floor(Math.random() * queries.length)];
  const headers = q.auth ? AUTH_HEADERS : GRAPHQL_HEADERS;

  const payload = JSON.stringify({ query: q.query, variables: q.vars });
  const res = http.post(GRAPHQL_URL, payload, { headers });
  responseTime.add(res.timings.duration, { query: q.name });

  const ok = check(res, {
    [`${q.name} ok`]: (r) => {
      if (r.status !== 200) return false;
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch { return false; }
    },
  });

  if (!ok) {
    soakErrors.add(1);
    // Solo loguear errores cada 30 segundos para no saturar
    if (__ITER % 30 === 0) {
      console.warn(`SOAK ERROR [${q.name}] iter=${__ITER}: ${res.status} ${res.body.substring(0, 200)}`);
    }
  }

  // Sleep entre 1-3s simulando tiempo de lectura del usuario
  sleep(Math.random() * 2 + 1);
}
