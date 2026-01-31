const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');
const { RateLimiter } = require('rate-limiter-flexible');
const { v4: uuidv4 } = require('uuid');
const robotsParser = require('robots-parser');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

class ImageCrawler {
    constructor(options = {}) {
        this.options = {
            maxDepth: options.maxDepth || 2,
            maxPages: options.maxPages || 50,
            categoryMode: options.categoryMode || 'path',
            imageTypes: options.imageTypes || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            minWidth: options.minWidth || 100,
            minHeight: options.minHeight || 100,
            maxSizeKB: options.maxSizeKB || 10240,
            quality: options.quality || 80,
            detectDuplicates: options.detectDuplicates !== false,
            requestDelay: options.requestDelay || 100,
            requestTimeout: options.requestTimeout || 10000,
            concurrentRequests: options.concurrentRequests || 5,
            useProxy: options.useProxy || false,
            proxyManager: options.proxyManager || null,
            respectRobots: options.respectRobots !== false,
            userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            advancedCrawling: options.advancedCrawling || false,
            distributed: options.distributed || false,
            ...options
        };

        // Rate limiter
        this.rateLimiter = new RateLimiter({
            points: options.rateLimit?.requests || 10,
            duration: options.rateLimit?.perSeconds || 1
        });

        // Cache for visited URLs and image hashes
        this.visitedUrls = new Set();
        this.imageHashes = new Map();
        this.images = new Map();
        this.robotsParsers = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.stats = {
            totalImages: 0,
            duplicatesFound: 0,
            filteredImages: 0,
            failedDownloads: 0
        };
    }

    async crawl(startUrl) {
        console.log(`Starting crawl: ${startUrl}`);
        
        this.visitedUrls.clear();
        this.imageHashes.clear();
        this.images.clear();
        this.stats = {
            totalImages: 0,
            duplicatesFound: 0,
            filteredImages: 0,
            failedDownloads: 0,
            startTime: Date.now()
        };

        const baseUrl = new URL(startUrl);
        
        // Check robots.txt
        if (this.options.respectRobots) {
            const canCrawl = await this.checkRobotsTxt(startUrl);
            if (!canCrawl) {
                throw new Error('Crawling disallowed by robots.txt');
            }
        }
        
        await this.crawlPage(startUrl, baseUrl, 0);
        
        // Organize images into categories
        this.organizeImagesByCategory();
        
        this.stats.endTime = Date.now();
        this.stats.duration = this.stats.endTime - this.stats.startTime;
        
        return {
            success: true,
            totalImages: this.getTotalImages(),
            categories: this.getCategoryStats(),
            imagesByCategory: Object.fromEntries(this.images),
            stats: this.stats,
            summary: {
                url: startUrl,
                depth: this.options.maxDepth,
                duplicatesFound: this.stats.duplicatesFound,
                filteredImages: this.stats.filteredImages,
                duration: this.stats.duration
            }
        };
    }

    async crawlPage(url, baseUrl, depth) {
        if (depth > this.options.maxDepth) return;
        if (this.visitedUrls.has(url)) return;
        if (this.visitedUrls.size >= this.options.maxPages) return;

        try {
            console.log(`Crawling: ${url} (depth: ${depth}, visited: ${this.visitedUrls.size})`);
            this.visitedUrls.add(url);

            const response = await this.makeRequest(url);
            
            const contentType = response.headers['content-type'] || '';
            if (!contentType.includes('text/html')) {
                return;
            }

            const $ = cheerio.load(response.data);
            const currentDomain = new URL(url).hostname;

            // Extract images from current page
            await this.extractImages($, url, baseUrl);

            // Find and follow internal links
            if (depth < this.options.maxDepth) {
                const links = [];
                $('a[href]').each((i, element) => {
                    const href = $(element).attr('href');
                    if (!href) return;
                    
                    try {
                        const absoluteUrl = new URL(href, url).href;
                        const linkDomain = new URL(absoluteUrl).hostname;
                        
                        // Only follow links from same domain
                        if (linkDomain === currentDomain || 
                            linkDomain.endsWith(`.${currentDomain}`)) {
                            links.push(absoluteUrl);
                        }
                    } catch (error) {
                        // Skip invalid URLs
                    }
                });

                // Remove duplicates and already visited
                const uniqueLinks = [...new Set(links)].filter(link => !this.visitedUrls.has(link));
                
                // Crawl links with concurrency control
                const concurrency = this.options.concurrentRequests;
                for (let i = 0; i < uniqueLinks.length; i += concurrency) {
                    const batch = uniqueLinks.slice(i, i + concurrency);
                    await Promise.all(
                        batch.map(link => this.crawlPage(link, baseUrl, depth + 1))
                    );
                }
            }
        } catch (error) {
            console.error(`Error crawling ${url}:`, error.message);
        }
    }

    async extractImages($, pageUrl, baseUrl) {
        const pageTitle = $('title').text() || 'Untitled';
        const pagePath = new URL(pageUrl).pathname;

        const imagePromises = [];
        
        $('img').each((i, element) => {
            let imgSrc = $(element).attr('src') || $(element).attr('data-src');
            if (!imgSrc) return;

            imagePromises.push(this.processImage(imgSrc, pageUrl, pageTitle, pagePath));
        });

        // Also check for images in CSS backgrounds and other elements
        $('[style*="background-image"]').each((i, element) => {
            const style = $(element).attr('style');
            const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
            if (match) {
                imagePromises.push(this.processImage(match[1], pageUrl, pageTitle, pagePath));
            }
        });

        // Wait for all image processing to complete
        await Promise.allSettled(imagePromises);
    }

    async processImage(imgSrc, pageUrl, pageTitle, pagePath) {
        try {
            // Convert to absolute URL
            const absoluteUrl = new URL(imgSrc, pageUrl).href;
            
            // Check if it's an allowed image type
            const extension = this.getFileExtension(absoluteUrl);
            if (!this.options.imageTypes.includes(extension.toLowerCase())) {
                this.stats.filteredImages++;
                return;
            }

            // Get image info
            const imageInfo = await this.getImageInfo(absoluteUrl);
            if (!imageInfo) {
                this.stats.failedDownloads++;
                return;
            }

            // Check size constraints
            if (imageInfo.width < this.options.minWidth || 
                imageInfo.height < this.options.minHeight) {
                this.stats.filteredImages++;
                console.log(`Filtered small image: ${absoluteUrl} (${imageInfo.width}x${imageInfo.height})`);
                return;
            }

            // Check file size
            if (imageInfo.size > this.options.maxSizeKB * 1024) {
                this.stats.filteredImages++;
                console.log(`Filtered large image: ${absoluteUrl} (${(imageInfo.size / 1024).toFixed(2)}KB)`);
                return;
            }

            // Check for duplicates
            if (this.options.detectDuplicates) {
                const hash = await this.calculateImageHash(absoluteUrl, imageInfo);
                if (this.imageHashes.has(hash)) {
                    this.stats.duplicatesFound++;
                    console.log(`Skipping duplicate image: ${absoluteUrl}`);
                    return;
                }
                this.imageHashes.set(hash, absoluteUrl);
            }

            // Determine category
            const category = this.determineCategory(pageUrl, pageTitle, pagePath);

            // Store image data
            if (!this.images.has(category)) {
                this.images.set(category, []);
            }

            const imageData = {
                url: absoluteUrl,
                originalUrl: absoluteUrl,
                filename: this.generateFilename(absoluteUrl, pageTitle),
                width: imageInfo.width,
                height: imageInfo.height,
                sizeKB: Math.round(imageInfo.size / 1024 * 100) / 100,
                extension: extension,
                pageUrl: pageUrl,
                pageTitle: pageTitle,
                category: category,
                hash: this.options.detectDuplicates ? await this.calculateImageHash(absoluteUrl, imageInfo) : null,
                downloaded: false,
                timestamp: new Date().toISOString()
            };

            this.images.get(category).push(imageData);
            this.stats.totalImages++;

        } catch (error) {
            console.error(`Error processing image ${imgSrc}:`, error.message);
            this.stats.failedDownloads++;
        }
    }

    async getImageInfo(imageUrl) {
        try {
            const response = await this.makeRequest(imageUrl, {
                responseType: 'arraybuffer',
                timeout: this.options.requestTimeout
            });

            const buffer = Buffer.from(response.data);
            const size = buffer.length;

            // Try to get dimensions
            try {
                const metadata = await sharp(buffer).metadata();
                return {
                    width: metadata.width,
                    height: metadata.height,
                    size: size,
                    buffer: buffer,
                    format: metadata.format
                };
            } catch (error) {
                // If sharp fails, return default dimensions
                return {
                    width: 100,
                    height: 100,
                    size: size,
                    buffer: buffer,
                    format: this.getFileExtension(imageUrl)
                };
            }
        } catch (error) {
            console.error(`Error fetching image info for ${imageUrl}:`, error.message);
            return null;
        }
    }

    async calculateImageHash(imageUrl, imageInfo) {
        try {
            const buffer = imageInfo.buffer;
            
            // Create perceptual hash using sharp
            const resized = await sharp(buffer)
                .resize(8, 8, { fit: 'fill' })
                .grayscale()
                .raw()
                .toBuffer();
            
            const pixels = new Uint8Array(resized);
            let avg = 0;
            for (let i = 0; i < pixels.length; i++) {
                avg += pixels[i];
            }
            avg /= pixels.length;
            
            let hash = '';
            for (let i = 0; i < pixels.length; i++) {
                hash += pixels[i] > avg ? '1' : '0';
            }
            
            return crypto.createHash('md5').update(hash).digest('hex');
        } catch (error) {
            // Fallback to simple hash
            return crypto.createHash('md5')
                .update(imageUrl)
                .update(imageInfo.size.toString())
                .digest('hex');
        }
    }

    async makeRequest(url, options = {}) {
        const requestOptions = {
            timeout: options.timeout || this.options.requestTimeout,
            responseType: options.responseType || 'text',
            headers: {
                'User-Agent': this.options.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                ...options.headers
            }
        };

        // Add proxy support
        if (this.options.useProxy && this.options.proxyManager) {
            const proxy = this.options.proxyManager.getCurrentProxy();
            if (proxy) {
                let agent;
                if (proxy.startsWith('socks')) {
                    agent = new SocksProxyAgent(proxy);
                } else {
                    agent = new HttpsProxyAgent(proxy);
                }
                requestOptions.httpsAgent = agent;
                requestOptions.proxy = false;
            }
        }

        // Apply rate limiting
        await this.rateLimiter.consume(url);

        // Add delay between requests
        if (this.options.requestDelay > 0) {
            await this.delay(this.options.requestDelay);
        }

        const response = await axios(url, requestOptions);
        
        // Rotate proxy on success
        if (this.options.useProxy && this.options.proxyManager) {
            this.options.proxyManager.rotateProxy();
        }

        return response;
    }

    async checkRobotsTxt(url) {
        try {
            const urlObj = new URL(url);
            const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
            const domain = urlObj.hostname;
            
            if (!this.robotsParsers.has(domain)) {
                try {
                    const response = await axios.get(robotsUrl, {
                        timeout: 5000,
                        headers: { 'User-Agent': this.options.userAgent }
                    });
                    
                    const robots = robotsParser(robotsUrl, response.data);
                    this.robotsParsers.set(domain, robots);
                } catch (error) {
                    // If robots.txt doesn't exist or is inaccessible, assume crawling is allowed
                    this.robotsParsers.set(domain, null);
                }
            }
            
            const robots = this.robotsParsers.get(domain);
            if (robots) {
                return robots.isAllowed(url, this.options.userAgent);
            }
            
            return true;
        } catch (error) {
            console.error('Robots.txt check error:', error.message);
            return true;
        }
    }

    determineCategory(pageUrl, pageTitle, pagePath) {
        switch (this.options.categoryMode) {
            case 'path':
                const pathSegments = pagePath.split('/').filter(s => s);
                return pathSegments.length > 0 ? pathSegments[0] : 'homepage';
            
            case 'page':
                return pageTitle ? pageTitle.substring(0, 30).replace(/[^\w\s]/gi, '_') : 'untitled';
            
            case 'domain':
                const url = new URL(pageUrl);
                const parts = url.hostname.split('.');
                return parts.length > 2 ? parts[0] : 'main';
            
            default:
                return 'uncategorized';
        }
    }

    organizeImagesByCategory() {
        // Already organized during extraction
    }

    getFileExtension(url) {
        try {
            const pathname = new URL(url).pathname;
            const match = pathname.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
            return match ? match[1].toLowerCase() : '';
        } catch {
            return '';
        }
    }

    generateFilename(imageUrl, pageTitle) {
        const urlObj = new URL(imageUrl);
        const pathname = urlObj.pathname;
        const basename = path.basename(pathname);
        
        if (basename && basename.includes('.')) {
            // Clean the filename
            return basename.replace(/[^\w\.\-]/g, '_');
        }
        
        // Generate filename from page title and hash
        const cleanTitle = (pageTitle || 'image').substring(0, 50).replace(/[^\w\s]/gi, '_');
        const hash = crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 8);
        const extension = this.getFileExtension(imageUrl) || 'jpg';
        
        return `${cleanTitle}_${hash}.${extension}`;
    }

    getTotalImages() {
        let total = 0;
        for (const images of this.images.values()) {
            total += images.length;
        }
        return total;
    }

    getCategoryStats() {
        const stats = {};
        for (const [category, images] of this.images.entries()) {
            stats[category] = {
                count: images.length,
                totalSizeKB: images.reduce((sum, img) => sum + img.sizeKB, 0),
                avgWidth: Math.round(images.reduce((sum, img) => sum + img.width, 0) / images.length),
                avgHeight: Math.round(images.reduce((sum, img) => sum + img.height, 0) / images.length),
                pages: [...new Set(images.map(img => img.pageUrl))].length
            };
        }
        return stats;
    }

    async createZip(images) {
        const zip = new JSZip();
        
        // Group images by category
        const imagesByCategory = {};
        images.forEach(img => {
            if (!imagesByCategory[img.category]) {
                imagesByCategory[img.category] = [];
            }
            imagesByCategory[img.category].push(img);
        });

        // Download and add images to zip
        for (const [category, catImages] of Object.entries(imagesByCategory)) {
            const categoryFolder = zip.folder(category);
            
            for (const img of catImages) {
                try {
                    const imageData = await this.downloadImage(img.url);
                    if (imageData) {
                        // Apply quality optimization if specified
                        let finalBuffer = imageData.buffer;
                        if (this.options.quality < 100 && 
                            ['jpg', 'jpeg', 'webp'].includes(img.extension.toLowerCase())) {
                            finalBuffer = await sharp(imageData.buffer)
                                .jpeg({ quality: this.options.quality })
                                .toBuffer();
                        }
                        
                        categoryFolder.file(img.filename, finalBuffer);
                        img.downloaded = true;
                    }
                } catch (error) {
                    console.error(`Failed to download ${img.url}:`, error.message);
                }
            }
        }

        // Add a manifest file
        const manifest = {
            crawledAt: new Date().toISOString(),
            totalImages: images.length,
            categories: Object.keys(imagesByCategory),
            settings: this.options
        };
        
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        return await zip.generateAsync({ 
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
    }

    async downloadImage(imageUrl) {
        return this.getImageInfo(imageUrl);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getImagesByPage() {
        const pageImages = new Map();
        
        for (const [category, images] of this.images.entries()) {
            for (const image of images) {
                const pageUrl = image.pageUrl;
                if (!pageImages.has(pageUrl)) {
                    pageImages.set(pageUrl, {
                        url: pageUrl,
                        title: image.pageTitle,
                        images: []
                    });
                }
                pageImages.get(pageUrl).images.push(image);
            }
        }
        
        return Array.from(pageImages.values());
    }

    getStats() {
        return {
            ...this.stats,
            visitedPages: this.visitedUrls.size,
            uniqueImages: this.getTotalImages(),
            categories: this.images.size
        };
    }
}

module.exports = { ImageCrawler };