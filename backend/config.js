const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
    // Server Configuration
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // CORS Configuration
    CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
    CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
    
    // Crawler Configuration
    MAX_CRAWL_DEPTH: parseInt(process.env.MAX_CRAWL_DEPTH) || 3,
    MAX_PAGES: parseInt(process.env.MAX_PAGES) || 100,
    MAX_WORKERS: parseInt(process.env.MAX_WORKERS) || 4,
    REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT) || 10000,
    CONCURRENT_REQUESTS: parseInt(process.env.CONCURRENT_REQUESTS) || 5,
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    
    // Proxy Configuration
    USE_PROXY: process.env.USE_PROXY === 'true',
    PROXY_LIST: process.env.PROXY_LIST?.split(',').map(p => p.trim()) || [],
    PROXY_ROTATION_INTERVAL: parseInt(process.env.PROXY_ROTATION_INTERVAL) || 10000,
    
    // Database (for distributed crawling)
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/imagecrawler',
    
    // Security
    API_KEY: process.env.API_KEY,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    
    // Storage
    MAX_ZIP_SIZE_MB: parseInt(process.env.MAX_ZIP_SIZE_MB) || 100,
    TEMP_DIR: process.env.TEMP_DIR || path.join(__dirname, 'temp'),
    
    // Performance
    CACHE_TTL: parseInt(process.env.CACHE_TTL) || 3600,
    IMAGE_PROCESSING_TIMEOUT: parseInt(process.env.IMAGE_PROCESSING_TIMEOUT) || 30000,
};