#!/bin/bash
# Configuración inicial de Kong API Gateway
# Ejecutar después de levantar el stack: docker compose up -d kong
# Luego: bash deploy/kong/setup.sh

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"

echo "🔧 Configurando Kong API Gateway en $KONG_ADMIN_URL"

# 1. Crear upstream para la API Go (balanceo de carga)
curl -s -X PUT "$KONG_ADMIN_URL/upstreams/api-gateway" \
  --data "name=api-gateway" \
  --data "healthchecks.active.healthy.threshold=2" \
  --data "healthchecks.active.unhealthy.threshold=3" \
  --data "healthchecks.active.timeout=5"

# 2. Agregar target (la app Go)
curl -s -X POST "$KONG_ADMIN_URL/upstreams/api-gateway/targets" \
  --data "target=app:8080" \
  --data "weight=100"

# 3. Crear service
curl -s -X PUT "$KONG_ADMIN_URL/services/suavus-api" \
  --data "name=suavus-api" \
  --data "host=api-gateway" \
  --data "port=8080" \
  --data "protocol=http"

# 4. Crear route para GraphQL
curl -s -X POST "$KONG_ADMIN_URL/services/suavus-api/routes" \
  --data "name=graphql" \
  --data "paths[]=/graphql" \
  --data "paths[]=/query" \
  --data "methods[]=GET" \
  --data "methods[]=POST" \
  --data "methods[]=OPTIONS"

# 5. Rate limiting global (300 req/min)
curl -s -X POST "$KONG_ADMIN_URL/plugins" \
  --data "name=rate-limiting" \
  --data "config.second=5" \
  --data "config.minute=300" \
  --data "config.policy=local"

# 6. CORS plugin (evita tener que manejarlo en Go)
curl -s -X POST "$KONG_ADMIN_URL/services/suavus-api/plugins" \
  --data "name=cors" \
  --data "config.origins[1]=*" \
  --data "config.methods[1]=GET" \
  --data "config.methods[2]=POST" \
  --data "config.methods[3]=PUT" \
  --data "config.methods[4]=PATCH" \
  --data "config.methods[5]=DELETE" \
  --data "config.methods[6]=OPTIONS" \
  --data "config.headers[1]=Origin" \
  --data "config.headers[2]=Content-Type" \
  --data "config.headers[3]=Authorization" \
  --data "config.credentials=true"

echo "✅ Kong configurado correctamente"
echo "🌐 GraphQL: http://localhost:8000/query"
echo "📊 Admin API: http://localhost:8001"
