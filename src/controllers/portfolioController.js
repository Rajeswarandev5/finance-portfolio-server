const portfolioService = require('../services/portfolioService');

/**
 * Handle GET /api/portfolio
 */
async function getPortfolio(req, res) {
    try {
        const data = await portfolioService.getPortfolioAggregated();
        res.json(data);
    } catch (error) {
        console.error("Error in getPortfolio controller:", error);
        res.status(500).json({ error: "Data temporarily unavailable" });
    }
}

module.exports = { getPortfolio };
