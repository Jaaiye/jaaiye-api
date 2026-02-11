const { HorizonClient } = require('@kisameholmes/horizon_node');
const { HorizonWinstonTransport } = require('@kisameholmes/horizon_node/winston');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

const horizon = new HorizonClient({
    apiKey: process.env.HORIZON_API_KEY || 'development_key',
    environment: process.env.NODE_ENV || 'development'
});

const horizonTransport = new HorizonWinstonTransport({
    apiKey: process.env.HORIZON_API_KEY || 'development_key',
    level: 'info'
});

module.exports = {
    horizon,
    horizonTransport
};
