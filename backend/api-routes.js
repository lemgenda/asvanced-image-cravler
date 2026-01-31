const express = require('express');
const router = express.Router();
const { ImageCrawler } = require('./crawler');
const { ProxyManager } = require('./proxy-manager');
const { ClusterManager } = require('./cluster-manager');
const config = require('./config');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');

// Initialize managers
const proxyManager = new ProxyManager();
const clusterManager = new ClusterManager();

// API Authentication Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];
    
    if (config.API_KEY && apiKey !== config.API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    }
    
    next();
};

// Rate limiting per endpoint
const crawlLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: 10,
    message: { error: 'Too many crawl requests' }
});

const apiLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: { error: 'Too many API requests' }
});

// Apply rate limiting to all routes
router.use(apiLimiter);

// Health Check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.NODE_ENV
    });
});

// Authentication
router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple authentication (replace with proper auth)
    if (username === 'admin' && password === 'admin') {
        const token = jwt.sign(
            { username, role: 'admin' },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Crawl API
router.post('/crawl', authenticate, crawlLimiter, async (req, res) => {
    try {
        const { url, options = {} } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        // Use distributed crawling if enabled
        let result;
        if (options.distributed && clusterManager.isMaster) {
            const taskId = await clusterManager.distributeTask(url, options);
            
            res.json({
                taskId,
                status: 'processing',
                message: 'Crawl task distributed to workers'
            });
            
            // Poll for result (in real implementation, use WebSocket)
            return;
        } else {
            // Use single instance crawling
            const crawler = new ImageCrawler({
                ...options,
                proxyManager: proxyManager
            });
            
            result = await crawler.crawl(url);
        }
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Crawling error:', error);
        res.status(500).json({ 
            error: 'Crawling failed', 
            message: error.message 
        });
    }
});

// Batch Crawl API
router.post('/crawl/batch', authenticate, async (req, res) => {
    try {
        const { urls, options = {} } = req.body;
        
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'URLs array is required' });
        }
        
        if (urls.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 URLs per batch' });
        }
        
        // Use distributed crawling for batch
        const taskIds = await clusterManager.distributeBatchTasks(urls, options);
        
        res.json({
            taskIds,
            total: urls.length,
            status: 'processing',
            message: 'Batch crawl tasks distributed'
        });
    } catch (error) {
        console.error('Batch crawl error:', error);
        res.status(500).json({ 
            error: 'Batch crawl failed', 
            message: error.message 
        });
    }
});

// Task Status API
router.get('/tasks/:taskId', authenticate, async (req, res) => {
    try {
        const { taskId } = req.params;
        const result = await clusterManager.getResult(taskId);
        
        if (!result) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({
            taskId,
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download APIs
router.post('/download/all', authenticate, async (req, res) => {
    try {
        const { images, options } = req.body;
        
        if (!images || !Array.isArray(images)) {
            return res.status(400).json({ error: 'Images array is required' });
        }
        
        const crawler = new ImageCrawler(options);
        const zipBuffer = await crawler.createZip(images);
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=all-images.zip');
        res.send(zipBuffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed', message: error.message });
    }
});

router.post('/download/category/:category', authenticate, async (req, res) => {
    try {
        const { category } = req.params;
        const { images } = req.body;
        
        if (!images || !Array.isArray(images)) {
            return res.status(400).json({ error: 'Images array is required' });
        }
        
        const crawler = new ImageCrawler();
        const zipBuffer = await crawler.createZip(images);
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${category}-images.zip`);
        res.send(zipBuffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed', message: error.message });
    }
});

router.post('/download/page/:pageId', authenticate, async (req, res) => {
    try {
        const { pageId } = req.params;
        const { images } = req.body;
        
        if (!images || !Array.isArray(images)) {
            return res.status(400).json({ error: 'Images array is required' });
        }
        
        const crawler = new ImageCrawler();
        const zipBuffer = await crawler.createZip(images);
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=page-${pageId}-images.zip`);
        res.send(zipBuffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed', message: error.message });
    }
});

// Proxy Management API
router.get('/proxies', authenticate, (req, res) => {
    const stats = proxyManager.getProxyStats();
    res.json({
        total: proxyManager.proxies.length,
        active: proxyManager.proxies.length - proxyManager.blacklist.size,
        blacklisted: proxyManager.blacklist.size,
        proxies: stats
    });
});

router.post('/proxies/test', authenticate, async (req, res) => {
    try {
        const results = await proxyManager.testAllProxies();
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/proxies/blacklist', authenticate, (req, res) => {
    proxyManager.clearBlacklist();
    res.json({ message: 'Proxy blacklist cleared' });
});

// Cluster Management API
router.get('/cluster/stats', authenticate, async (req, res) => {
    try {
        const stats = await clusterManager.getClusterStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/cluster/workers', authenticate, (req, res) => {
    const stats = clusterManager.getWorkerStats();
    res.json(stats);
});

// Settings API
router.get('/settings', authenticate, (req, res) => {
    // Return current settings (excluding sensitive data)
    const settings = {
        maxDepth: config.MAX_CRAWL_DEPTH,
        maxPages: config.MAX_PAGES,
        maxWorkers: config.MAX_WORKERS,
        requestTimeout: config.REQUEST_TIMEOUT,
        concurrentRequests: config.CONCURRENT_REQUESTS,
        useProxy: config.USE_PROXY,
        proxyCount: config.PROXY_LIST.length,
        rateLimit: {
            windowMs: config.RATE_LIMIT_WINDOW_MS,
            maxRequests: config.RATE_LIMIT_MAX_REQUESTS
        },
        maxZipSizeMB: config.MAX_ZIP_SIZE_MB,
        cacheTTL: config.CACHE_TTL
    };
    
    res.json(settings);
});

router.put('/settings', authenticate, async (req, res) => {
    try {
        const updates = req.body;
        
        // Validate and update settings
        // Note: In production, you'd want to persist these to a database
        // and reload the configuration
        
        res.json({
            success: true,
            message: 'Settings updated',
            updates
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// History API
router.get('/history', authenticate, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        // In production, fetch from database
        // For now, return mock data
        const history = [];
        
        res.json({
            total: history.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export API
router.post('/export/json', authenticate, async (req, res) => {
    try {
        const { data, filename = 'export.json' } = req.body;
        
        if (!data) {
            return res.status(400).json({ error: 'Data is required' });
        }
        
        const jsonData = JSON.stringify(data, null, 2);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(jsonData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// System Info API
router.get('/system/info', authenticate, (req, res) => {
    const os = require('os');
    
    const info = {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        freeMemory: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        nodeVersion: process.version,
        pid: process.pid
    };
    
    res.json(info);
});

module.exports = router;