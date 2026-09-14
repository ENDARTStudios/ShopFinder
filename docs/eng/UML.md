# UML — Diagrama de Classes e Sequência

Fonte de verdade: `prisma/schema.prisma` (36 modelos). Diagramas em Mermaid.

## 1. Diagrama de classes — Núcleo de domínio

```mermaid
classDiagram
    class Store {
        +String id
        +String slug
        +String name
        +String defaultCurrencyCode
    }
    class User {
        +String id
        +String email
        +String passwordHash
        +JSON roles
        +String storeId
        +resolvePermissions() List~Permission~
    }
    class Customer {
        +String id
        +String email
        +String storeId
    }
    class Product {
        +String id
        +String slug
        +String storeId
        +BigInt priceMinor
        +String currencyCode
        +DateTime deletedAt
    }
    class Variant {
        +String id
        +String productId
        +String sku
    }
    class ProductOffer {
        +String id
        +String productId
        +String supplierId
        +BigInt priceMinor
        +Boolean active
    }
    class Supplier {
        +String id
        +String name
        +String connectorKey
    }
    class Cart {
        +String id
        +String customerId
    }
    class CartItem {
        +String id
        +String cartId
        +String sku
        +Int quantity
    }
    class CheckoutSession {
        +String id
        +String stripeSessionId
        +String cartId
    }
    class Order {
        +String id
        +String number
        +String storeId
        +OrderStatus status
        +BigInt totalMinor
    }
    class OrderItem {
        +String id
        +String orderId
        +String productOfferId
        +Int quantity
    }
    class Payment {
        +String id
        +String orderId
        +PaymentStatus status
    }
    class SyncJob {
        +String id
        +String supplierId
        +SyncStatus status
    }
    class WebhookEvent {
        +String id
        +String provider
        +String eventType
        +String payloadHash
    }
    class OutboxEvent {
        +String id
        +String aggregateType
        +String eventType
    }

    Store "1" --> "*" User : emprega
    Store "1" --> "*" Product
    Store "1" --> "*" Order
    Product "1" --> "*" Variant
    Product "1" --> "*" ProductOffer
    Supplier "1" --> "*" ProductOffer
    Supplier "1" --> "*" SyncJob
    Customer "1" --> "0..1" Cart
    Cart "1" --> "*" CartItem
    Cart "1" --> "0..1" CheckoutSession
    CheckoutSession "1" --> "0..1" Order : gera
    Order "1" --> "*" OrderItem
    OrderItem "*" --> "0..1" ProductOffer : resolve
    Order "1" --> "*" Payment
    Order "1" --> "0..*" OutboxEvent
    WebhookEvent "1" --> "0..1" Order : idempotência
```

## 2. Sequência — Checkout + Webhook Stripe (caminho crítico)

```mermaid
sequenceDiagram
    actor C as Cliente
    participant UI as Next.js App
    participant API as /api/checkout-session
    participant S as Stripe
    participant WH as /api/webhook
    participant DB as Prisma/Postgres
    participant FX as fx.ts (cotação BRL)

    C->>UI: Adiciona itens (Cart drawer)
    C->>UI: "Finalizar compra"
    UI->>API: POST /api/checkout-session {items[sku,qty]}
    API->>FX: USD→BRL (cache Redis, TTL)
    API->>S: Cria Checkout Session (metadata.items)
    S-->>API: session.id
    API-->>UI: url de checkout
    C->>S: Paga
    S->>WH: checkout.session.completed (assinado)
    WH->>WH: Verifica assinatura HMAC (STRIPE_WEBHOOK_SECRET)
    WH->>DB: Idempotência: Order.number = session.id?
    alt já processado
        WH-->>S: 200 (noop)
    else novo
        WH->>DB: Upsert Customer
        WH->>DB: Para cada sku: resolve ProductOffer mais barata
        WH->>DB: Cria Order + OrderItems (transação)
        WH->>DB: Grava OutboxEvent(order.created)
        WH-->>S: 200
    end
    UI->>UI: /checkout/success consulta /api/checkout-status
```

## 3. Sequência — Pipeline de sincronização de fornecedor

```mermaid
sequenceDiagram
    participant Admin as Admin UI (/admin/pipeline)
    participant Jobs as @workspace/jobs
    participant Conn as Connector (ebay|aliexpress|...)
    participant DB as Postgres
    Admin->>Jobs: dispara SyncJob
    Jobs->>DB: SyncJob(running) + SyncExecutionLog
    loop páginas de resultados
        Jobs->>Conn: search(term, page)
        Conn-->>Jobs: ofertas normalizadas
        Jobs->>DB: Upsert ProductOffer + PriceHistory
    end
    Jobs->>DB: SyncJob(success|error) + log final
    Jobs-->>Admin: status atualizado (polling /api/admin/pipeline/status)
```

## 4. Sequência — Autenticação e autorização

```mermaid
sequenceDiagram
    actor U as Usuário
    participant MW as src/middleware.ts
    participant NA as NextAuth (Credentials+JWT)
    participant APP as resolvePermissions()
    U->>MW: GET /admin/*
    MW->>NA: withAuth — valida JWT
    alt sem sessão
        MW-->>U: redirect /login
    else autenticado
        MW-->>APP: libera rota
        APP->>APP: User.roles (JSON) → Permissions
        APP-->>U: 403 se sem permissão
    end
```
