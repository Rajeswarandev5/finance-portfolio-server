require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const portfolioRoutes = require('./routes/portfolioRoutes');
const socketHandler = require('./websockets/socketHandler');

app.use(cors());
app.use(express.json());

app.use('/api/portfolio', portfolioRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

// Initialize Socket.io with the HTTP server
socketHandler.initSocket(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
