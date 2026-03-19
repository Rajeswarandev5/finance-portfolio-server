const cacheService = require('./cacheService');

// Mock User Holdings
const MY_HOLDINGS = [
    { symbol: 'AAPL', exchange: 'NASDAQ', sector: 'Technology', quantity: 15, avgPrice: 155.00 },
    { symbol: 'MSFT', exchange: 'NASDAQ', sector: 'Technology', quantity: 8, avgPrice: 310.00 },
    { symbol: 'JNJ', exchange: 'NYSE', sector: 'Healthcare', quantity: 20, avgPrice: 155.50 },
    { symbol: 'PG', exchange: 'NYSE', sector: 'Consumer Goods', quantity: 12, avgPrice: 140.00 },
    { symbol: 'TSLA', exchange: 'NASDAQ', sector: 'Automotive', quantity: 5, avgPrice: 180.00 },
    { symbol: 'GOOGL', exchange: 'NASDAQ', sector: 'Technology', quantity: 10, avgPrice: 135.00 },
    { symbol: 'NVDA', exchange: 'NASDAQ', sector: 'Technology', quantity: 6, avgPrice: 450.00 }
];


//  Calculate the portfolio metrics
//  Returns the final API JSON structure
let limit;

async function initLimiter() {
    if (!limit) {
        const { default: pLimit } = await import("p-limit");
        limit = pLimit(3);
    }
}
async function getPortfolioAggregated() {
    await initLimiter();
    // 1. Fetch live data with controlled concurrency
    const stockPromises = MY_HOLDINGS.map((holding) =>
        limit(async () => {

            const liveData = await cacheService.getCachedStockData(
                holding.symbol,
                holding.exchange
            );

            const investment = holding.quantity * holding.avgPrice;

            let presentValue = null;
            let gainLoss = null;

            if (liveData.cmp) {
                presentValue = holding.quantity * liveData.cmp;
                gainLoss = presentValue - investment;
            }

            return {
                ...holding,
                ...liveData,
                investment,
                presentValue,
                gainLoss,
                portfolioPercentage: 0
            };
        })
    );

    // waits for all limited tasks
    const evaluatedStocks = await Promise.all(stockPromises);

    // 2. Aggregate Totals & Sector Calculation

    let totalPortfolioValue = 0;
    const sectorTotalsMap = {};

    evaluatedStocks.forEach(stock => {
        const actualPv = stock.presentValue || 0;

        totalPortfolioValue += actualPv;

        if (!sectorTotalsMap[stock.sector]) {
            sectorTotalsMap[stock.sector] = {
                presentValue: 0,
                investment: 0
            };
        }

        sectorTotalsMap[stock.sector].presentValue += actualPv;
        sectorTotalsMap[stock.sector].investment += stock.investment;
    });

    // 3. Portfolio % per Stock

    const finalStocks = evaluatedStocks.map(stock => {
        const actualPv = stock.presentValue || 0;

        return {
            ...stock,
            portfolioPercentage:
                totalPortfolioValue > 0
                    ? ((actualPv / totalPortfolioValue) * 100).toFixed(2) + "%"
                    : "0%"
        };
    });

    // 4. Sector Summary

    const sectorSummary = Object.keys(sectorTotalsMap).map(sector => {
        const stats = sectorTotalsMap[sector];

        const gainLoss =
            stats.presentValue > 0
                ? stats.presentValue - stats.investment
                : null;

        return {
            sector,
            investment: stats.investment,
            presentValue: stats.presentValue,
            gainLoss,
            portfolioPercentage:
                totalPortfolioValue > 0
                    ? ((stats.presentValue / totalPortfolioValue) * 100).toFixed(2) + "%"
                    : "0%"
        };
    });

    return {
        totalPortfolioValue,
        stocks: finalStocks,
        sectorSummary
    };
}


module.exports = {
    getPortfolioAggregated,
    MY_HOLDINGS
};
