function createRateLimiter(options) {
	const windowMs = options.windowMs;
	const max = options.max;
	const keyFn = options.keyGenerator || ((req) => req.ip || req.socket.remoteAddress || 'unknown');
	const buckets = new Map();

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
		const existing = buckets.get(key);

		if (!existing || existing.resetAt <= now) {
			buckets.set(key, {
				count: 1,
				resetAt: now + windowMs
			});
			return next();
		}

		existing.count += 1;
		if (existing.count <= max) {
			return next();
		}

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
