const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const config = require('./config');
const apiRoutes = require('./api-routes');

const app = express();
const PORT = config.PORT;

// Ensure temp directory exists
fs.ensureDirSync(config.TEMP_DIR);

// Enhanced CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (config.CORS_ORIGINS.includes(origin) || 
            config.CORS_ORIGINS.includes('*') || 
            config.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.log(`CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: config.CORS_CREDENTIALS,
    optionsSuccessStatus: 200,
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Requested-With',
        'Accept'
    ],
    exposedHeaders: [
        'Content-Disposition',
        'X-Total-Count'
    ]
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'Request too large',
            message: 'The request payload exceeds the limit'
        });
    }
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(config.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Starting graceful shutdown...');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Starting graceful shutdown...');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
    console.log(`🔒 CORS Origins: ${config.CORS_ORIGINS.join(', ')}`);
    console.log(`🔄 Max Workers: ${config.MAX_WORKERS}`);
    console.log(`🕒 Request Timeout: ${config.REQUEST_TIMEOUT}ms`);
    console.log(`📦 Max ZIP Size: ${config.MAX_ZIP_SIZE_MB}MB`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit in production, allow the process to continue
    if (config.NODE_ENV === 'production') {
        // Log to external service
    } else {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;