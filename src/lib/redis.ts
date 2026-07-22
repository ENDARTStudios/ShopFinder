import { Redis } from '@upstash/redis'
import { logger } from './logger'

let redisInstance: Redis | null = null

/**
 * Obtém instância singleton do Redis (Upstash)
 * Retorna null se variáveis de ambiente não estiverem configuradas
 * Nunca lança erro em inicialização — falha graciosamente
 */
export function getRedisClient(): Redis | null {
  if (redisInstance) {
    return redisInstance
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    logger.warn('Redis not configured: UPSTASH_REDIS_REST_URL or TOKEN missing')
    return null
  }

  try {
    redisInstance = new Redis({
      url,
      token,
      // Timeout curto para não travar o app se Redis estiver lento
      signal: AbortSignal.timeout(5000),
    })
    logger.info('Redis client initialized successfully')
    return redisInstance
  } catch (error) {
    logger.error('Failed to initialize Redis', {
      error: error instanceof Error ? error.message : '[REDACTED]',
    })
    return null
  }
}

/**
 * Verifica conectividade do Redis com timeout
 * @returns Latência em ms ou null se falhar
 */
export async function checkRedisHealth(): Promise<{ status: 'ok' | 'degraded' | 'not_configured'; latencyMs?: number }> {
  const client = getRedisClient()

  if (!client) {
    return { status: 'not_configured' }
  }

  try {
    const start = Date.now()
    await client.ping('health_check')
    const latency = Date.now() - start

    // Timeout máximo de 1500ms considerado degraded
    if (latency > 1500) {
      logger.warn('Redis latency high', { latencyMs: latency })
      return { status: 'degraded', latencyMs: latency }
    }

    return { status: 'ok', latencyMs: latency }
  } catch (error) {
    logger.error('Redis health check failed', {
      error: error instanceof Error ? error.message : '[REDACTED]',
    })
    return { status: 'degraded' }
  }
}
