import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { GRAPHQL_URL, RESTAURANT_ID, USER_ID, GRAPHQL_HEADERS, AUTH_HEADERS } from './00_config.js';

// Métricas personalizadas
const queryDuration = new Trend('graphql_query_duration');
const queryErrors = new Rate('graphql_query_errors');
const mutationErrors = new Rate('graphql_mutation_errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '1m', target: 10 },    // steady
    { duration: '30s', target: 30 },   // ramp up
    { duration: '1m', target: 30 },    // steady
    { duration: '30s', target: 50 },   // ramp up
    { duration: '1m', target: 50 },    // steady
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    graphql_query_errors: ['rate<0.02'],
  },
};

function graphQLQuery(name, query, variables, headers) {
  const payload = JSON.stringify({ query, variables });
  const res = http.post(GRAPHQL_URL, payload, { headers });
  queryDuration.add(res.timings.duration, { query: name });

  const success = check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} sin errors`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch { return false; }
    },
  });

  if (!success) {
    queryErrors.add(1);
    console.warn(`${name} FAILED: ${res.status} ${res.body}`);
  }

  return res;
}

export default function () {
  const isAuth = __VU > 10; // VUs 1-10 son anónimos, VUs 11+ son autenticados
  const headers = isAuth ? AUTH_HEADERS : GRAPHQL_HEADERS;

  group('Queries de lectura', function () {
    // 1. Listar restaurantes (pública)
    graphQLQuery(
      'restaurants',
      `query { restaurants { id name address description } }`,
      {},
      headers,
    );

    sleep(1);

    // 2. Menú completo del restaurante (pública)
    graphQLQuery(
      'products',
      `query menu($restaurantId: ID!) { 
        products(restaurantId: $restaurantId) { 
          id name description price status image
          category { id name }
        } 
      }`,
      { restaurantId: RESTAURANT_ID },
      headers,
    );

    sleep(1);

    // 3. Reseñas del restaurante (pública)
    graphQLQuery(
      'reviews',
      `query reviews($restaurantId: ID!) { 
        reviews(restaurantId: $restaurantId) { 
          id rating comment date 
          user { id name } 
        } 
      }`,
      { restaurantId: RESTAURANT_ID },
      headers,
    );

    sleep(1);

    // 4. Tiempo de espera estimado (pública)
    graphQLQuery(
      'estimatedWaitTime',
      `query wait($restaurantId: ID!) { 
        estimatedWaitTime(restaurantId: $restaurantId) 
      }`,
      { restaurantId: RESTAURANT_ID },
      headers,
    );

    sleep(1);

    // 5. Categorías (pública)
    graphQLQuery(
      'categories',
      `query cats($restaurantId: ID!) { 
        categories(restaurantId: $restaurantId) { 
          id name 
        } 
      }`,
      { restaurantId: RESTAURANT_ID },
      headers,
    );

    sleep(1);

    // 6. Queries autenticadas (solo si tenemos token)
    if (isAuth) {
      // Órdenes del usuario
      graphQLQuery(
        'ordersByUser',
        `query userOrders($userId: ID!) { 
          ordersByUser(userId: $userId) { 
            id status total date paid
            orderDetail { productId quantity subtotal }
          } 
        }`,
        { userId: USER_ID },
        AUTH_HEADERS,
      );

      sleep(1);

      // Reservas del usuario
      graphQLQuery(
        'bookingsUser',
        `query userBookings($userId: ID!) { 
          bookingsUser(userId: $userId) { 
            id people time status cancellationReason
            restaurant { id name }
          } 
        }`,
        { userId: USER_ID },
        AUTH_HEADERS,
      );

      sleep(1);
    }
  });
}
