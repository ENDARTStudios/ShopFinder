/**
 * @workspace/database/unit-of-work/repository-factory
 *
 * Creates repository instances bound to a specific transaction client.
 * Each transaction gets a fresh set of repositories sharing the same TX context.
 */

import type { PrismaClient } from "@prisma/client";
import type { RepositoryRegistry } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "./event-collector";
import { PrismaProductRepository } from "../repositories/product-repository";
import { PrismaCategoryRepository } from "../repositories/category-repository";
import { PrismaVariantRepository } from "../repositories/variant-repository";
import { PrismaInventoryRepository } from "../repositories/inventory-repository";
import { PrismaCustomerRepository } from "../repositories/customer-repository";
import { PrismaCartRepository } from "../repositories/cart-repository";
import { PrismaCheckoutSessionRepository } from "../repositories/checkout-session-repository";
import { PrismaOrderRepository } from "../repositories/order-repository";
import { PrismaPaymentRepository } from "../repositories/payment-repository";
import { PrismaSupplierRepository } from "../repositories/supplier-repository";
import { PrismaSupplierOrderRepository } from "../repositories/supplier-order-repository";
import { PrismaProductOfferRepository } from "../repositories/product-offer-repository";

export interface RepositoryFactory {
  createRegistry(tx: TransactionClient, collector: EventCollector): RepositoryRegistry;
}

export class PrismaRepositoryFactory implements RepositoryFactory {
  constructor(private readonly prisma: PrismaClient) {}

  createRegistry(tx: TransactionClient, collector: EventCollector): RepositoryRegistry {
    return {
      productRepository: new PrismaProductRepository(tx, collector),
      categoryRepository: new PrismaCategoryRepository(tx, collector),
      variantRepository: new PrismaVariantRepository(tx, collector),
      inventoryRepository: new PrismaInventoryRepository(tx, collector),
      customerRepository: new PrismaCustomerRepository(tx, collector),
      cartRepository: new PrismaCartRepository(tx, collector),
      checkoutSessionRepository: new PrismaCheckoutSessionRepository(tx, collector),
      orderRepository: new PrismaOrderRepository(tx, collector),
      paymentRepository: new PrismaPaymentRepository(tx, collector),
      supplierRepository: new PrismaSupplierRepository(tx, collector),
      supplierOrderRepository: new PrismaSupplierOrderRepository(tx, collector),
      productOfferRepository: new PrismaProductOfferRepository(tx, collector)
    };
  }
}
