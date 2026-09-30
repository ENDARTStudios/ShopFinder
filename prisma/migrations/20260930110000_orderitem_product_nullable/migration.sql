-- OrderItem.productId nullable (J-004, auditoria jurídica 30/09/2026):
-- o pedido passa a registrar o efetivamente cobrado pela sessão Stripe mesmo
-- quando o produto deixou de existir no catálogo (productId null = link perdido,
-- provado pelos demais campos snapshot: sku/title/preço).
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
