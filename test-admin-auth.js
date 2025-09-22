#!/bin/bash
# Script para probar autenticación y endpoints de admin

API_BASE="http://localhost:3001/api"

echo "🔐 Intentando autenticación..."

# 1. Intentar login con credenciales de prueba
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}')

echo "Respuesta de login: $LOGIN_RESPONSE"

# Extraer token (formato accessToken)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  # Intentar con otros formatos de token
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener token de autenticación"
  echo "Probando endpoints sin autenticación..."
  
  echo "\n📋 Probando endpoint Role sin auth..."
  curl -s "$API_BASE/admin/Role?page=1&pageSize=10"
  
  echo "\n🖼️  Probando endpoint ProductoImagen sin auth..."
  curl -s "$API_BASE/admin/ProductoImagen?page=1&pageSize=10"
  
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:20}..."

# 2. Probar endpoint de Role
echo "\n📋 Probando endpoint Role..."
ROLE_RESPONSE=$(curl -s "$API_BASE/admin/Role?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Respuesta Role: $ROLE_RESPONSE"

# 3. Probar endpoint de ProductoImagen
echo "\n🖼️  Probando endpoint ProductoImagen..."
IMAGEN_RESPONSE=$(curl -s "$API_BASE/admin/ProductoImagen?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Respuesta ProductoImagen: $IMAGEN_RESPONSE"

# 4. Verificar usuario actual
echo "\n👤 Verificando usuario actual..."
ME_RESPONSE=$(curl -s "$API_BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Usuario actual: $ME_RESPONSE"