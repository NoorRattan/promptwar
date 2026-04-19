"""Rate limiting configuration for the API."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],  # Global default — specific routes override this
    storage_uri="memory://",  # In-memory storage — resets on container restart
)
"""
Rate limiter using per-IP address tracking.

Storage note: Uses in-memory storage (not Redis) because:
1. Cloud Run may have multiple instances; rate limits are per-instance
2. Upstash Redis free tier (10K req/day) is reserved for application caching
3. Memory storage resets on cold start — acceptable for abuse prevention
4. For production multi-instance rate limiting, upgrade to Redis storage

Rate limit tiers defined at point of use:
- Auth endpoints: 5/minute  (login, register — prevent brute force)
- Write endpoints: 30/minute (density updates, order placement)
- Admin emergency: 10/minute (critical action — prevent accidental spam)
- Read endpoints: 100/minute (default — generous for real-time polling fallbacks)
"""

# Rate limit string constants
RATE_AUTH = "5/minute"  # Prevent brute force login
RATE_WRITE = "30/minute"  # General write limits
RATE_READ = "100/minute"  # High-frequency reads
RATE_EMERGENCY = "10/minute"  # Critical action — prevent accidental spam
RATE_DENSITY_UPDATE = "30/minute"  # Sensor density updates
RATE_ORDER = "20/minute"  # F&B ordering


def rate_limit_info(tier: str, reason: str) -> str:
    """
    Returns a rate limit string while documenting the reason.
    Used as: @limiter.limit(rate_limit_info(RATE_AUTH, "Prevent brute force login"))
    Note: slowapi only uses the returned string — the reason is for code documentation.
    """
    return tier
