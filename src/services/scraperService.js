const axios = require("axios");
const cheerio = require("cheerio");
const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"]
});

//  Browser headers (needed for fallback scraping)

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
};

//  Retry Helper (handles cloud/network instability)
async function retry(fn, retries = 2, delay = 1000) {
    try {
        return await fn();
    } catch (err) {
        if (retries === 0) throw err;
        await new Promise((res) => setTimeout(res, delay));
        return retry(fn, retries - 1, delay);
    }
}

// FALLBACK SCRAPER (Used only if API fails)

async function scrapeYahooFallback(symbol) {
    try {
        const url = `https://finance.yahoo.com/quote/${symbol}`;
        const response = await axios.get(url, { headers: HEADERS });

        const $ = cheerio.load(response.data);

        let priceStr = $(
            `fin-streamer[data-symbol="${symbol}"][data-field="regularMarketPrice"]`
        )
            .first()
            .text();

        if (!priceStr) {
            priceStr = $('[data-testid="qsp-price"]').first().text();
        }

        if (!priceStr) {
            priceStr = $("fin-streamer.livePrice").first().text();
        }

        if (priceStr) {
            const price = parseFloat(priceStr.replace(/,/g, ""));
            if (!isNaN(price)) return price;
        }

        console.warn(`Fallback scraping failed for ${symbol}`);
        return null;
    } catch (error) {
        console.error(`Fallback scrape error (${symbol}):`, error.message);
        return null;
    }
}

async function getYahooFinanceCMP(symbol) {
    try {
        const quote = await retry(() =>
            yahooFinance.quote(symbol)
        );

        const price =
            quote.regularMarketPrice ??
            quote.preMarketPrice ??
            quote.postMarketPrice ??
            null;

        if (price != null) {
            return price;
        }

        console.warn(`API price missing, using fallback for ${symbol}`);
        return await scrapeYahooFallback(symbol);
    } catch (error) {
        console.error(`Yahoo API failed (${symbol}):`, error.message);
        return await scrapeYahooFallback(symbol);
    }
}

async function getGoogleFinanceMetrics(symbol, exchange = "") {
    try {
        const ticker = exchange ? `${symbol}:${exchange}` : symbol;
        const url = `https://www.google.com/finance/quote/${ticker}`;

        const response = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(response.data);

        let peRatio = null;
        let earnings = null;

        const stats = $("div.gyFHrc");

        stats.each((_, el) => {
            const label = $(el)
                .find(".mfs7Fc")
                .text()
                .trim()
                .toLowerCase();

            const value = $(el).find(".P6K39c").text().trim();

            if (label === "p/e ratio") {
                peRatio = parseFloat(value.replace(/,/g, ""));
            }
        });

        // EPS from yahoo-finance2 (more reliable)
        const quote = await retry(() =>
            yahooFinance.quote(symbol)
        );

        earnings = quote.epsTrailingTwelveMonths ?? null;

        return {
            peRatio: isNaN(peRatio) ? null : peRatio,
            earnings: earnings,
        };
    } catch (error) {
        console.error(
            `Google Finance scrape failed (${symbol}):`,
            error.message
        );

        return {
            peRatio: null,
            earnings: null,
        };
    }
}

//  Aggregate Stock Data

async function fetchStockData(symbol, exchange = "") {
    const [cmp, metrics] = await Promise.all([
        getYahooFinanceCMP(symbol),
        getGoogleFinanceMetrics(symbol, exchange),
    ]);

    return {
        symbol,
        cmp,
        peRatio: metrics.peRatio,
        earnings: metrics.earnings,
    };
}

module.exports = {
    fetchStockData,
    getYahooFinanceCMP,
    getGoogleFinanceMetrics,
};