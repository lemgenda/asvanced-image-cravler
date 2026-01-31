const axios = require('axios');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');
const { RateLimiter } = require('rate-limiter-flexible');
const { v4: uuidv4 } = require('uuid');

class ImageCrawler {
    constructor(options = {}) {
        this.options = {
            maxDepth: options.maxDepth || 2,
            maxPages: options.maxPages || 50,
            categoryMode: options.categoryMode || 'path',
            imageTypes: options.imageTypes || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            minWidth: options.minWidth || 100,
            minHeight: options.minHeight || 100,
            maxSizeKB: options.maxSizeKB || 10240, // 10MB
            quality: options.quality || 80,
            detectDuplicates: options.detectDuplicates !== false,
            rateLimit: {
                requests: options.rateLimit?.requests || 10,
                perSeconds: options.rateLimit?.perSeconds || 1
            },
            ...options
        };

        // Rate limiter for external requests
        this.rateLimiter = new RateLimiter({
            points: this.options.rateLimit.requests,
            duration: this.options.rateLimit.perSeconds
        });

        // Cache for visited URLs and image hashes
        this.visitedUrls = new Set();
        this.imageHashes = new Map();
        this.images = new Map(); // category -> [images]
    }

    async crawl(startUrl) {
        console.log(`Starting crawl: ${startUrl}`);
        
        this.visitedUrls.clear();
        this.imageHashes.clear();
        this.images.clear();

        const baseUrl = new URL(startUrl);
        
        await this.crawlPage(startUrl, baseUrl, 0);
        
        // Organize images into categories
        this.organizeImagesByCategory();
        
        return {
            success: true,
            totalImages: this.getTotalImages(),
            categories: this.getCategoryStats(),
            imagesByCategory: Object.fromEntries(this.images),
            summary: {
                url: startUrl,
                depth: this.options.maxDepth,
                duplicatesFound: this.getDuplicateCount(),
                filteredImages: this.getFilteredCount()
            }
        };
    }

    async crawlPage(url, baseUrl, depth) {
        if (depth > this.options.maxDepth) return;
        if (this.visitedUrls.has(url)) return;
        if (this.visitedUrls.size >= this.options.maxPages) return;

        try {
            // Apply rate limiting
            await this.rateLimiter.consume(url);

            console.log(`Crawling: ${url} (depth: ${depth})`);
            this.visitedUrls.add(url);

            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const contentType = response.headers['content-type'] || '';
            if (!contentType.includes('text/html')) {
                return; // Skip non-HTML content
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

                // Crawl links with some concurrency control
                const concurrency = 3;
                for (let i = 0; i < links.length; i += concurrency) {
                    const batch = links.slice(i, i + concurrency);
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

        $('img').each(async (i, element) => {
            try {
                let imgSrc = $(element).attr('src') || $(element).attr('data-src');
                if (!imgSrc) return;

                // Convert to absolute URL
                const absoluteUrl = new URL(imgSrc, pageUrl).href;
                
                // Check if it's an allowed image type
                const extension = this.getFileExtension(absoluteUrl);
                if (!this.options.imageTypes.includes(extension.toLowerCase())) {
                    return;
                }

                // Get image info and check quality
                const imageInfo = await this.getImageInfo(absoluteUrl);
                if (!imageInfo) return;

                // Check size constraints
                if (imageInfo.width < this.options.minWidth || 
                    imageInfo.height < this.options.minHeight) {
                    console.log(`Skipping small image: ${absoluteUrl} (${imageInfo.width}x${imageInfo.height})`);
                    return;
                }

                // Check file size
                if (imageInfo.size > this.options.maxSizeKB * 1024) {
                    console.log(`Skipping large image: ${absoluteUrl} (${(imageInfo.size / 1024).toFixed(2)}KB)`);
                    return;
                }

                // Check for duplicates
                if (this.options.detectDuplicates) {
                    const hash = await this.calculateImageHash(absoluteUrl, imageInfo);
                    if (this.imageHashes.has(hash)) {
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

                this.images.get(category).push({
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
                    downloaded: false
                });

            } catch (error) {
                console.error(`Error processing image:`, error.message);
            }
        });
    }

    async getImageInfo(imageUrl) {
        try {
            // Apply rate limiting for image requests
            await this.rateLimiter.consume(imageUrl);

            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
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
                    buffer: buffer
                };
            } catch (error) {
                // If sharp fails, return default dimensions
                return {
                    width: 100,
                    height: 100,
                    size: size,
                    buffer: buffer
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
            
            return hash;
        } catch (error) {
            // Fallback to simple hash
            return crypto.createHash('md5')
                .update(imageUrl)
                .update(imageInfo.size.toString())
                .digest('hex');
        }
    }

    determineCategory(pageUrl, pageTitle, pagePath) {
        switch (this.options.categoryMode) {
            case 'path':
                // Use URL path segments for categories
                const pathSegments = pagePath.split('/').filter(s => s);
                if (pathSegments.length > 0) {
                    return pathSegments[0]; // First path segment as category
                }
                return 'homepage';
            
            case 'page':
                // Use page title for categories
                if (pageTitle) {
                    return pageTitle.substring(0, 30).replace(/[^\w\s]/gi, '');
                }
                return 'untitled';
            
            case 'domain':
                // Use subdomain or domain
                const url = new URL(pageUrl);
                const hostname = url.hostname;
                const parts = hostname.split('.');
                if (parts.length > 2) {
                    return parts[0]; // Subdomain
                }
                return 'main';
            
            default:
                return 'uncategorized';
        }
    }

    organizeImagesByCategory() {
        // Already organized during extraction
    }

    getFileExtension(url) {
        const pathname = new URL(url).pathname;
        const match = pathname.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
        return match ? match[1].toLowerCase() : '';
    }

    generateFilename(imageUrl, pageTitle) {
        const urlObj = new URL(imageUrl);
        const pathname = urlObj.pathname;
        const basename = path.basename(pathname);
        
        if (basename && basename.includes('.')) {
            return basename;
        }
        
        // Generate filename from page title and hash
        const cleanTitle = pageTitle.substring(0, 50).replace(/[^\w\s]/gi, '_');
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
                avgHeight: Math.round(images.reduce((sum, img) => sum + img.height, 0) / images.length)
            };
        }
        return stats;
    }

    getDuplicateCount() {
        return this.visitedUrls.size - this.getTotalImages();
    }

    getFilteredCount() {
        // This would need to track filtered images separately
        return 0;
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
                        if (this.options.quality < 100) {
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

        return await zip.generateAsync({ type: 'nodebuffer' });
    }

    async downloadImage(imageUrl) {
        try {
            await this.rateLimiter.consume(imageUrl);
            
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            return {
                buffer: Buffer.from(response.data),
                size: response.data.length
            };
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    }
}

module.exports = { ImageCrawler };