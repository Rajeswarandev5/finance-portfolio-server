const { Server } = require('socket.io');
const portfolioService = require('../services/portfolioService');

let ioInstance;
let refreshInterval;

//Initialize Socket.io and attach to HTTP server
function initSocket(server) {
    ioInstance = new Server(server, {
        cors: {
            origin: "*", 
            methods: ["GET", "POST"]
        }
    });

    ioInstance.on('connection', (socket) => {
        console.log(`Frontend Connected: ${socket.id}`);
        // Immediately send latest data on connect
        emitPortfolioData();

        socket.on('disconnect', () => {
            console.log(`Frontend Disconnected: ${socket.id}`);
        });
    });

    startBackgroundRefresh(15000); // 15 seconds
}

 //Central function to evaluate portfolio data

async function emitPortfolioData() {
    if (!ioInstance) return;

    try {
        const aggregatedData = await portfolioService.getPortfolioAggregated();
        ioInstance.emit('portfolioUpdate', aggregatedData);
    } catch (error) {
        console.error("Error generating portfolio data for sockets:", error);
        ioInstance.emit('portfolioError', { error: "Failed to evaluate portfolio data" });
    }
}
//Interval runner to emit stock updates
function startBackgroundRefresh(intervalMs) {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        console.log("Running background refresh...");
        emitPortfolioData();
    }, intervalMs);
}
  
module.exports = {
    initSocket,
    emitPortfolioData
};
