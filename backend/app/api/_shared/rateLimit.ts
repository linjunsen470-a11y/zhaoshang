type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

export function getClientIp(request: Request) {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/**
 * Small single-instance limiter for the MVP deployment. The reverse proxy must
 * replace, rather than append untrusted, forwarding headers.
 */
export function takeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  if (buckets.size >= MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey)
    }
  }

  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    if (!current && buckets.size >= MAX_BUCKETS) return { allowed: false, retryAfterSeconds: 60 }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  current.count += 1
  return {
    allowed: current.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}
