const axios = require('axios');
const cheerio = require('cheerio');
const YahooFinance = require("yahoo-finance2").default;


// Constants for Headers to simulate a real browser request
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};

 //Scrape Yahoo Finance for Current Market Price (CMP)
async function getYahooFinanceCMP(symbol) {
    try {
        const url = `https://finance.yahoo.com/quote/${symbol}`;
        const response = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(response.data);

        // Try different known selectors for Yahoo Finance price
        // 1. fin-streamer tag
        let priceStr = $(`fin-streamer[data-symbol="${symbol}"][data-field="regularMarketPrice"]`).first().text();
        
        // 2. Alternative if fin-streamer empty
        if (!priceStr) {
            priceStr = $('[data-testid="qsp-price"]').first().text();
        }

        if (!priceStr) {
            priceStr = $('fin-streamer.livePrice').first().text();
        }

        // Clean up formatting (e.g., "1,234.56" -> "1234.56")
        if (priceStr) {
            const price = parseFloat(priceStr.replace(/,/g, ''));
            if (!isNaN(price)) return price;
        }

        console.warn(`Could not extract CMP for ${symbol} on Yahoo Finance`);
        return null;
    } catch (error) {
        console.error(`Error scraping Yahoo Finance for ${symbol}:`, error.message);
        return null;
    }
}

const fs = require("fs");
//Scrape Google Finance for Financial Metrics (P/E Ratio, Earnings)
async function getGoogleFinanceMetrics(symbol, exchange = '') {
    try {
        const ticker = exchange ? `${symbol}:${exchange}` : symbol;
        const url = `https://www.google.com/finance/quote/${ticker}`;
        
        const response = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(response.data);

        let peRatio = null;
        let earnings = null;

        // Google Finance usually has a table or list for "Key stats"
        // We look for divs containing "P/E ratio"
        const stats = $('div.gyFHrc');

stats.each((_, el) => {
    const label = $(el).find('.mfs7Fc').text().trim().toLowerCase();
    const value = $(el).find('.P6K39c').text().trim();

    if (label === 'p/e ratio') {
        peRatio = parseFloat(value.replace(/,/g, ''));
    }
});

const yahooFinance = new YahooFinance();

    const quote = await yahooFinance.quote(symbol);
    earnings = quote.epsTrailingTwelveMonths ?? null

    return {
        peRatio: isNaN(peRatio) ? null : peRatio,
        earnings: isNaN(earnings) ? null : earnings
    };

    } catch (error) {
         console.error(`Error scraping Google Finance for ${symbol}:`, error.message);
         return {
             peRatio: null,
             earnings: null
         };
    }
}

// Fetch Aggregated Stock Data for a symbol

async function fetchStockData(symbol, exchange = '') {
    const [cmp, metrics] = await Promise.all([
        getYahooFinanceCMP(symbol),
        getGoogleFinanceMetrics(symbol, exchange)
    ]);

    return {
        symbol,
        cmp,
        peRatio: metrics.peRatio,
        earnings: metrics.earnings
    };
}

module.exports = {
    fetchStockData,
    getYahooFinanceCMP,
    getGoogleFinanceMetrics
};
