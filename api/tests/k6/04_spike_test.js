import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { GRAPHQL_URL, RESTAURANT_ID, USER_ID, GRAPHQL_HEADERS, AUTH_HEADERS } from './00_config.js';

const spikeErrors = new Rate('spike_errors');
const spikeDuration = new Trend('spike_request_duration');

export const options = {
  stages: [
    { duration: '10s', target: 10 },    // Calentamiento suave
    { duration: '30s', target: 200 },   // Spike: 0 → 200 en 30s
    { duration: '30s', target: 200 },   // Mantener pico
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.05'],
    spike_errors: ['rate<0.10'],
  },
};

// Queries variadas para simular tráfico real
const queries = [
  {
    name: 'restaurants',
    query: `query { restaurants { id name address description phone hours } }`,
    variables: {},
    auth: false,
  },
  {
    name: 'menu',
    query: `query menu($restaurantId: ID!) { 
      products(restaurantId: $restaurantId) { 
        id name description price status image 
        category { id name } 
      } 
    }`,
    variables: { restaurantId: RESTAURANT_ID },
    auth: false,
  },
  {
    name: 'reviews',
    query: `query reviews($restaurantId: ID!) { 
      reviews(restaurantId: $restaurantId) { 
        id rating comment date 
        user { id name } 
      } 
    }`,
    variables: { restaurantId: RESTAURANT_ID },
    auth: false,
  },
  {
    name: 'waitTime',
    query: `query wait($restaurantId: ID!) { 
      estimatedWaitTime(restaurantId: $restaurantId) 
    }`,
    variables: { restaurantId: RESTAURANT_ID },
    auth: false,
  },
  {
    name: 'categories',
    query: `query cats($restaurantId: ID!) { 
      categories(restaurantId: $restaurantId) { id name } 
    }`,
    variables: { restaurantId: RESTAURANT_ID },
    auth: false,
  },
  {
    name: 'restaurantDetail',
    query: `query restaurant($id: ID!) { 
      restaurant(id: $id) { id name address description phone hours image } 
    }`,
    variables: { id: RESTAURANT_ID },
    auth: false,
  },
];

export default function () {
  // Elegir query aleatoria
  const q = queries[Math.floor(Math.random() * queries.length)];
  const headers = GRAPHQL_HEADERS;

  const payload = JSON.stringify({ query: q.query, variables: q.variables });
  const res = http.post(GRAPHQL_URL, payload, { headers });
  spikeDuration.add(res.timings.duration);

  const success = check(res, {
    [`${q.name} status 200`]: (r) => r.status === 200,
    [`${q.name} sin GraphQL errors`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch { return false; }
    },
  });

  if (!success) {
    spikeErrors.add(1);
  }

  // Sin sleep — queremos máxima concurrencia durante el spike
}
