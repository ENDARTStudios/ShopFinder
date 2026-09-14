# ShopFinder — Guia de Obtenção de Credenciais

> Documento operacional para configurar conectores reais com APIs de marketplace, distribuidores e fabricantes.

---

## DigiKey (Distributor)

**API**: Product Search API v4 (REST, OAuth2)
**Documentação**: https://developer.digikey.com/

### Passo a passo

1. Acesse https://developer.digikey.com/
2. Crie uma conta (gratuita para sandbox)
3. Vá em "My Apps" → "Create New App"
4. Preencha:
   - App Name: `ShopFinder`
   - Description: `Catalog Intelligence Platform`
   - Redirect URI: `http://localhost:3000/api/connectors/digikey/callback`
5. Anote o **Client ID** e **Client Secret**
6. Selecione as APIs: Product Search, Product Details
7. Escolha o ambiente: Sandbox (para teste) ou Production

### Variáveis de ambiente

```env
DIGIKEY_CLIENT_ID=your_client_id
DIGIKEY_CLIENT_SECRET=your_client_secret
DIGIKEY_API_BASE_URL=https://api.digikey.com  # Sandbox: https://sandbox.api.digikey.com
```

### Fluxo de autenticação

DigiKey usa OAuth2 Client Credentials flow:
1. POST para `https://api.digikey.com/v1/oauth/token` com `client_id` + `client_secret`
2. Recebe `access_token` (válido por 30 minutos)
3. Usa `access_token` no header `Authorization: Bearer <token>` nas chamadas de API
4. Quando expira, repete o passo 1

### Rate limits

- Sandbox: 100 requests/dia
- Production: 10.000 requests/dia (plano gratuito)

---

## Amazon SP-API (Marketplace)

**API**: Amazon Selling Partner API (SP-API)
**Documentação**: https://developer-docs.amazon.com/sp-api/

### Passo a passo

1. Acesse https://sellercentral.amazon.com/
2. Crie uma conta de vendedor (Individual ou Professional — Professional é necessário para SP-API)
3. Vá em "Settings" → "User Permissions" → "Authorize a Developer"
4. Registre sua aplicação em https://developer.amazon.com/sp-api
5. Selecione o tipo: "Private App" (para uso próprio)
6. Anote:
   - LWA Client ID
   - LWA Client Secret
   - AWS Access Key ID
   - AWS Secret Access Key
   - SP-API Role ARN

### Variáveis de ambiente

```env
AMAZON_LWA_CLIENT_ID=your_lwa_client_id
AMAZON_LWA_CLIENT_SECRET=your_lwa_client_secret
AMAZON_AWS_ACCESS_KEY_ID=your_access_key
AMAZON_AWS_SECRET_ACCESS_KEY=your_secret_key
AMAZON_SP_API_ROLE_ARN=your_role_arn
AMAZON_SP_API_ENDPOINT=https://sellingpartnerapi-na.amazon.com  # ou .eu / .fe
```

### Rate limits

- 1 request/segundo por aplicação (default)
- Burst: depende do endpoint

### Notas

- Amazon SP-API usa SigV4 (AWS Signature v4) para autenticação
- O fluxo é mais complexo que DigiKey — requer LWA token + SigV4 signing
- Recomendado usar a biblioteca `amazon-sp-api` (npm) para simplificar

---

## eBay (Marketplace)

**API**: eBay Browse API + Sell APIs
**Documentação**: https://developer.ebay.com/

### Passo a passo

1. Acesse https://developer.ebay.com/
2. Crie uma conta de desenvolvedor (gratuita)
3. Vá em "Application Keys" → "Create a Key Set"
4. Selecione: Sandbox (para teste) ou Production
5. Anote:
   - App ID (Client ID)
   - Dev ID
   - Cert ID (Client Secret)
6. Configure OAuth2 scopes: `https://api.ebay.com/oauth/api_scope` (Browse API)

### Variáveis de ambiente

```env
EBAY_CLIENT_ID=your_app_id
EBAY_CLIENT_SECRET=your_cert_id
EBAY_API_BASE_URL=https://api.ebay.com  # Sandbox: https://api.sandbox.ebay.com
EBAY_REDIRECT_URI=your_ru_name  # eBay Run Name
```

### Fluxo de autenticação

eBay usa OAuth2 Client Credentials:
1. POST para `https://api.ebay.com/identity/v1/oauth2/token` com Base64(client_id:client_secret)
2. Body: `grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope`
3. Recebe `access_token` (válido por 2 horas)
4. Usa no header: `Authorization: Bearer <token>`

### Rate limits

- 5.000 calls/dia (Sandbox)
- 10.000-50.000 calls/dia (Production, depende do app)

---

## AliExpress (Marketplace)

**API**: AliExpress Affiliate API
**Documentação**: https://portals.aliexpress.com (Affiliate Portal)

### Passo a passo

1. Acesse https://portals.aliexpress.com
2. Crie uma conta de afiliado
3. Vá em "API" → "Manage API"
4. Solicite acesso à API (requer aprovação manual)
5. Anote:
   - App Key
   - App Secret
   - Tracking ID

### Variáveis de ambiente

```env
ALIEXPRESS_APP_KEY=your_app_key
ALIEXPRESS_APP_SECRET=your_app_secret
ALIEXPRESS_TRACKING_ID=your_tracking_id
ALIEXPRESS_API_BASE_URL=https://api-sg.aliexpress.com
```

### Notas

- AliExpress API usa assinatura HMAC-MD5
- Disponibilidade limitada por região
- Recomendado para produtos chineses (Tier C manufacturers)

---

## Intel Ark (Manufacturer)

**API**: Intel Ark (não oficial — scraping ou API não documentada)
**Status**: Intel não tem API pública oficial para Ark. Opções:
1. Usar o conector Intel já implementado com fixtures (atual)
2. Scraping da página `https://ark.intel.com` (rate limit baixo, frágil)
3. Intel Developer Zone (https://software.intel.com/) — oferece algumas APIs mas não para Ark

### Recomendação

Manter o conector Intel com fixtures estruturadas até que:
- Intel publique uma API oficial, ou
- O scraper seja implementado com rate-limiting conservador (1 req/10s)

---

## AMD Product Master (Manufacturer)

**API**: AMD Product Master (não oficial)
**Status**: Similar ao Intel — AMD não tem API pública para catálogo de produtos.

### Recomendação

Mesma abordagem do Intel: fixtures estruturadas + eventual scraper.

---

## NVIDIA (Manufacturer)

**API**: NVIDIA não tem API pública para especificações de produtos.

### Recomendação

Fixtures estruturadas baseadas nas páginas oficiais de cada GPU em https://www.nvidia.com/en-us/geforce/graphics-cards/

---

## Variáveis de ambiente completas (.env.example)

```env
# Database
DATABASE_URL=file:./db/custom.db  # SQLite (dev)
# DATABASE_URL=postgresql://shopfinder:devpass@localhost:5432/shopfinder  # PostgreSQL (prod)

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Connectors — DigiKey
DIGIKEY_CLIENT_ID=
DIGIKEY_CLIENT_SECRET=
DIGIKEY_API_BASE_URL=https://api.digikey.com

# Connectors — Amazon
AMAZON_LWA_CLIENT_ID=
AMAZON_LWA_CLIENT_SECRET=
AMAZON_AWS_ACCESS_KEY_ID=
AMAZON_AWS_SECRET_ACCESS_KEY=
AMAZON_SP_API_ROLE_ARN=
AMAZON_SP_API_ENDPOINT=https://sellingpartnerapi-na.amazon.com

# Connectors — eBay
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_API_BASE_URL=https://api.ebay.com
EBAY_REDIRECT_URI=

# Connectors — AliExpress
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_TRACKING_ID=

# AI
OPENAI_API_KEY=

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# MinIO (Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```
