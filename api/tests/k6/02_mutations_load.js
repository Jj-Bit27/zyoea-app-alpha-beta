import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';
import { GRAPHQL_URL, RESTAURANT_ID, USER_ID, AUTH_HEADERS } from './00_config.js';

const mutationErrors = new Rate('mutation_errors');

export const options = {
  // Duración corta — no queremos llenar producción de datos basura
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    mutation_errors: ['rate<0.10'],
  },
  // Etiqueta para identificar estas requests en logs
};

// Contador global para generar datos únicos
let counter = 0;

function graphQLMutation(name, query, variables) {
  counter++;
  const payload = JSON.stringify({ query, variables });
  const res = http.post(GRAPHQL_URL, payload, { headers: AUTH_HEADERS });
  const tag = `${name}_${counter}`;

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
    mutationErrors.add(1);
    console.warn(`MUTATION ${name} FAILED [${tag}]: ${res.status} ${res.body}`);
  }

  return res;
}

export default function () {
  const ts = Date.now();
  const vu = __VU;
  const iter = __ITER;

  group('Mutations de escritura', function () {
    // 1. Crear reseña (30% — operación de bajo riesgo)
    if (Math.random() < 0.3) {
      graphQLMutation(
        'createReview',
        `mutation createReview($input: CreateReviewInput!) {
          createReview(input: $input) { id rating }
        }`,
        {
          input: {
            restaurant: parseInt(RESTAURANT_ID),
            user: parseInt(USER_ID),
            rating: Math.floor(Math.random() * 5) + 1,
            comment: `Load test review ${ts}_${vu}_${iter}`,
          },
        },
      );
      sleep(0.5);
    }

    // 2. Crear reserva (25% — fecha futura para no interferir con usuarios reales)
    if (Math.random() < 0.25) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 días en el futuro
      futureDate.setHours(14, 0, 0, 0); // 2 PM

      graphQLMutation(
        'createBooking',
        `mutation createBooking($input: CreateBookingInput!) {
          createBooking(input: $input) { id status time }
        }`,
        {
          input: {
            restaurant: parseInt(RESTAURANT_ID),
            user: parseInt(USER_ID),
            table: 1,
            people: Math.floor(Math.random() * 4) + 1,
            time: futureDate.toISOString(),
            status: 'pending',
          },
        },
      );
      sleep(0.5);
    }

    // 3. Agregar al carrito (25% — operación liviana, sin RLS)
    if (Math.random() < 0.25) {
      graphQLMutation(
        'addToCart',
        `mutation addToCart($userId: ID!, $productId: Int!, $quantity: Int!, $restaurantId: Int!) {
          addToCart(userId: $userId, productId: $productId, quantity: $quantity, restaurantId: $restaurantId) { productId quantity }
        }`,
        {
          userId: USER_ID,
          productId: Math.floor(Math.random() * 5) + 1,
          quantity: Math.floor(Math.random() * 3) + 1,
          restaurantId: parseInt(RESTAURANT_ID),
        },
      );
      sleep(0.5);
    }

    // 4. Aceptar términos (10% — idempotente, sin efecto secundario)
    if (Math.random() < 0.1) {
      graphQLMutation(
        'acceptTerms',
        `mutation acceptTerms($userId: ID!, $type: TermsType!) {
          acceptTerms(userId: $userId, type: $type) { termsType acceptedAt }
        }`,
        {
          userId: USER_ID,
          type: 'USER_TERMS',
        },
      );
      sleep(0.5);
    }

    // 5. Login (10% — simula login concurrente con credenciales que sabemos existen)
    if (Math.random() < 0.1) {
      graphQLMutation(
        'login',
        `mutation login($input: LoginInput!) {
          login(input: $input) { accessToken user { id name email } }
        }`,
        {
          input: {
            email: 'test@suavus.app',
            password: 'testpassword123',
          },
        },
      );
      sleep(0.5);
    }
  });

  sleep(1);
}
