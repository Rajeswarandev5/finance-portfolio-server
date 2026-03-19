# Financial Portfolio Backend API

Backend service built with Node.js and Express that aggregates financial data from external sources (Yahoo Finance and Google Finance), processes portfolio calculations, and exposes an API and Socket.IO connection for frontend consumption.

## Features Layer

- **Data Aggregation**: Fetches Current Market Price (CMP) from Yahoo Finance and P/E Ratio & Earnings from Google Finance.
- **Real-Time Data**: Uses `Socket.IO` to emit updated portfolio payloads every 15 seconds.
- **REST API**: Provides a fallback `GET /api/portfolio` endpoint.
- **Caching**: Utilizes an in-memory cache to prevent excessive scraping and avoid rate-limiting issues.
- **Portfolio Engine**: Calculates Investment, Present Value, Gain/Loss, Portfolio %, and Sector Summaries on the fly.

## Tech Stack

- **Node.js + Express**: Core server and API routing.
- **Axios & Cheerio**: Web scraping Yahoo and Google Finance for live metrics.
- **Socket.IO**: Real-time duplex connection for pushing UI updates.
- **Dotenv**: Environment configuration.

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Ensure an `.env` file exists at the root.
   ```env
   PORT=5000
   ```

3. **Run the Server (Development)**
   ```bash
   npm run dev
   ```

4. **Run the Server (Production)**
   ```bash
   npm start
   ```

## API Endpoint Reference

### `GET /api/portfolio`

Returns the aggregated JSON of the mock-holdings combined with the live financial data scraped continuously via background jobs.

**Example Response**:
```json
{
  "totalPortfolioValue": 10500.50,
  "stocks": [
    {
      "symbol": "AAPL",
      "exchange": "NASDAQ",
      "sector": "Technology",
      "quantity": 15,
      "avgPrice": 155.00,
      "cmp": 178.50,
      "peRatio": 28.5,
      "earnings": 6.13,
      "investment": 2325,
      "presentValue": 2677.5,
      "gainLoss": 352.5,
      "portfolioPercentage": "25.50%"
    }
  ],
  "sectorSummary": [
    {
      "sector": "Technology",
      "investment": 4805,
      "presentValue": 5500,
      "gainLoss": 695,
      "portfolioPercentage": "52.38%"
    }
  ]
}
```

## WebSocket Connection (Socket.IO)

The server emits a real-time event named `portfolioUpdate` every 15 seconds.

**Usage on Frontend:**
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("portfolioUpdate", (data) => {
    console.log("Live update received:", data);
});

socket.on("portfolioError", (error) => {
    console.error("Server encountered scraping issues:", error);
});
```
https://finance-portfolio-server-production.up.railway.app/
