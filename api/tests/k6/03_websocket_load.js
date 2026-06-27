import { check, sleep, group } from 'k6';
import ws from 'k6/ws';
import { Rate, Trend } from 'k6/metrics';
import { WS_URL } from './00_config.js';

const wsConnSuccess = new Rate('ws_connection_success');
const wsMsgReceived = new Trend('ws_messages_received');
const wsSessionDuration = new Trend('ws_session_duration_ms');

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // ramp up to 5 concurrent WS
    { duration: '20s', target: 5 },
    { duration: '10s', target: 10 },  // ramp up to 10
    { duration: '20s', target: 10 },
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    ws_connection_success: ['rate>0.8'],
  },
};

export default function () {
  const url = `${WS_URL}`;

  group('WebSocket Conexión a Cocina', function () {
    const startTime = Date.now();
    let msgCount = 0;

    const res = ws.connect(url, null, function (socket) {
      socket.on('open', function () {
        wsConnSuccess.add(1);
      });

      socket.on('message', function (data) {
        msgCount++;
        // Verificar que el mensaje es JSON válido
        try {
          const msg = JSON.parse(data);
          // Podríamos validar la estructura aquí si es necesario
        } catch (e) {
          console.warn(`WS mensaje no JSON: ${data}`);
        }
      });

      socket.on('error', function (e) {
        console.error(`WS error: ${e}`);
      });

      socket.on('close', function () {
        const duration = Date.now() - startTime;
        wsSessionDuration.add(duration);
        wsMsgReceived.add(msgCount);
      });

      // Mantener conexión abierta por 30 segundos
      socket.setTimeout(function () {
        socket.close();
      }, 30000);
    });

    check(res, {
      'conexión WebSocket exitosa': (r) => r && r.status === 101,
    });

    sleep(1);
  });
}
