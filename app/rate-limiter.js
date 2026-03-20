/**
 * @file Rate Limiter – Request throttling for Express middleware.
 *
 * Implements a configurable rate limiter based on in-memory buckets.
 * Each client (identified by IP or a custom key function) gets its own
 * time window with a limited number of requests. Expired buckets are
 * periodically and per-request cleaned up.
 *
 * @module rate-limiter
 */

/**
 * Creates an Express middleware for request rate limiting.
 *
 * The middleware counts requests per client within a configurable
 * time window. When the limit is exceeded, HTTP 429 is returned.
 * A periodic cleanup timer removes expired buckets in the background.
 *
 * @param {Object} options – Configuration options.
 * @param {number} options.windowMs – Time window in milliseconds.
 * @param {number} options.max – Maximum number of allowed requests per time window.
 * @param {Function} [options.keyGenerator] – Function to determine the client key (default: IP address).
 * @param {number} [options.maxBuckets=10000] – Maximum number of simultaneously stored buckets.
 * @returns {Function} Express middleware function.
 */
function createRateLimiter(options) {
	const windowMs = options.windowMs;
	const max = options.max;
	const keyFn = options.keyGenerator || ((req) => req.ip || req.socket.remoteAddress || 'unknown');
	/** @type {Map<string, {count: number, resetAt: number}>} Per-client bucket store */
	const buckets = new Map();
	const maxBuckets = Number.isFinite(options.maxBuckets) && options.maxBuckets > 0 ? options.maxBuckets : 10000;

	// Periodic background cleanup of expired buckets
	// .unref() prevents the timer from keeping the Node.js process alive
	setInterval(() => {
		const now = Date.now();
		for (const [key, bucket] of buckets.entries()) {
			if (bucket.resetAt <= now) {
				buckets.delete(key);
			}
		}
	}, Math.max(windowMs, 10000)).unref();

	return function rateLimitMiddleware(req, res, next) {
		const now = Date.now();
		const key = keyFn(req);

		// Clean up expired buckets on every request
		for (const [bucketKey, bucket] of buckets.entries()) {
			if (bucket.resetAt <= now) {
				buckets.delete(bucketKey);
			}
		}

		// Memory overflow protection: remove oldest bucket when limit is reached
		if (buckets.size >= maxBuckets && !buckets.has(key)) {
			let oldestKey = null;
			let oldestResetAt = Number.POSITIVE_INFINITY;
			for (const [bucketKey, bucket] of buckets.entries()) {
				if (bucket.resetAt < oldestResetAt) {
					oldestResetAt = bucket.resetAt;
					oldestKey = bucketKey;
				}
			}
			if (oldestKey !== null) {
				buckets.delete(oldestKey);
			}
		}

		const existing = buckets.get(key);

		// New client or expired time window → create new bucket
		if (!existing || existing.resetAt <= now) {
			buckets.set(key, {
				count: 1,
				resetAt: now + windowMs
			});
			return next();
		}

		// Increment request counter and check if limit has not been reached
		existing.count += 1;
		if (existing.count <= max) {
			return next();
		}

		// Limit exceeded → return HTTP 429 with Retry-After header
		const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
		res.setHeader('Retry-After', String(Math.max(retryAfter, 1)));
		res.status(429).json({
			error: 'Too many requests',
			message: 'Rate limit exceeded. Please retry later.',
			retryAfterSeconds: Math.max(retryAfter, 1)
		});
	};
}

module.exports = {
	createRateLimiter
};
