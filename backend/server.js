const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { ImageCrawler } = require('./crawler');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API Routes
app.post('/api/crawl', async (req, res) => {
    try {
        const { url, options } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Validate URL
        try {
            new URL(url);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Create crawler instance
        const crawler = new ImageCrawler(options);
        
        // Start crawling
        const result = await crawler.crawl(url);
        
        res.json(result);
    } catch (error) {
        console.error('Crawling error:', error);
        res.status(500).json({ 
            error: 'Crawling failed', 
            message: error.message 
        });
    }
});

app.post('/api/download', async (req, res) => {
    try {
        const { images, options } = req.body;
        
        if (!images || !Array.isArray(images)) {
            return res.status(400).json({ error: 'Images array is required' });
        }

        const crawler = new ImageCrawler(options);
        const zipBuffer = await crawler.createZip(images);
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=images.zip');
        res.send(zipBuffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Download failed', 
            message: error.message 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});