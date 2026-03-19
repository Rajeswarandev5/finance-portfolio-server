const scraperService = require('./scraperService');

// In-memory cache store
// Format: { 'AAPL:NASDAQ': { data: {}, timestamp: Date.now() } }
const cacheStore = {};

// Cache duration (e.g., 60 seconds)
const CACHE_DURATION_MS = 60 * 1000;

// Get stock data from cache or scrape if expired/missing.

async function getCachedStockData(symbol, exchange = '') {
    const key = exchange ? `${symbol}:${exchange}` : symbol;
    
    if (cacheStore[key]) {
        const timeElapsed = Date.now() - cacheStore[key].timestamp;
        if (timeElapsed < CACHE_DURATION_MS && cacheStore[key].data.cmp !== null) {
            // Return cached version if valid and valid CMP exists
            return cacheStore[key].data;
        }
    }

    try {
        const freshData = await scraperService.fetchStockData(symbol, exchange);
        
        // Cache the fresh data even if cmp is null to avoid spamming the scraper every ms if failure occurs
        // If it's a failure (null cmp), maybe cache for a shorter time. But standard duration is okay to prevent rate limit.
        cacheStore[key] = {
            data: freshData,
            timestamp: Date.now()
        };
        
        return freshData;
    } catch (error) {
        console.error(`Cache/Scraper Error for ${key}:`, error.message);
        // Fallback to stale cache if available
        if (cacheStore[key]) {
            return cacheStore[key].data;
        }
        return {
            symbol,
            cmp: null,
            peRatio: null,
            earnings: null,
            error: "Data temporarily unavailable"
        };
    }
}

// Invalidate a specific cache key

function invalidateCache(symbol, exchange = '') {
    const key = exchange ? `${symbol}:${exchange}` : symbol;
    if (cacheStore[key]) {
        delete cacheStore[key];
    }
}

module.exports = {
    getCachedStockData,
    invalidateCache
};
