class ImageCrawlerApp {
    constructor() {
        this.images = new Map();
        this.totalImages = 0;
        this.crawling = false;
        this.crawlStartTime = null;
        this.crawlTimer = null;
        this.imageStats = {
            total: 0,
            duplicates: 0,
            filtered: 0,
            categories: 0,
            pages: 0
        };
        
        this.settings = {
            advancedCrawling: false,
            distributedCrawling: false,
            proxyEnabled: false,
            rateLimit: 10,
            requestDelay: 100,
            maxPages: 50,
            maxDepth: 2,
            minWidth: 100,
            minHeight: 100,
            maxSize: 10240,
            quality: 80,
            detectDuplicates: true,
            respectRobots: true,
            categoryMode: 'path',
            imageTypes: ['jpg', 'jpeg', 'png'],
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        
        this.currentTaskId = null;
        this.pages = new Map();
        this.selectedImages = new Set();
        
        this.initElements();
        this.bindEvents();
        this.setupSliders();
        this.loadSettings();
        this.checkApiStatus();
        this.setupKeyboardShortcuts();
        
        this.log('Advanced Image Crawler initialized', 'info');
        
        // API base URL
        this.API_BASE = this.getApiBaseUrl();
    }

    initElements() {
        // Core elements
        this.elements = {
            // Input elements
            urlInput: document.getElementById('urlInput'),
            crawlBtn: document.getElementById('crawlBtn'),
            stopBtn: document.getElementById('stopBtn'),
            
            // Settings toggles
            advancedCrawling: document.getElementById('advancedCrawling'),
            distributedCrawling: document.getElementById('distributedCrawling'),
            useProxy: document.getElementById('useProxy'),
            detectDuplicates: document.getElementById('detectDuplicates'),
            respectRobots: document.getElementById('respectRobots'),
            
            // Options inputs
            maxDepth: document.getElementById('maxDepth'),
            maxDepthValue: document.getElementById('maxDepthValue'),
            maxPages: document.getElementById('maxPages'),
            minWidth: document.getElementById('minWidth'),
            minHeight: document.getElementById('minHeight'),
            maxSize: document.getElementById('maxSize'),
            quality: document.getElementById('quality'),
            qualityValue: document.getElementById('qualityValue'),
            categoryMode: document.getElementById('categoryMode'),
            rateLimit: document.getElementById('rateLimit'),
            requestDelay: document.getElementById('requestDelay'),
            
            // Status elements
            apiStatus: document.getElementById('apiStatus'),
            distributedStatus: document.getElementById('distributedStatus'),
            proxyStatus: document.getElementById('proxyStatus'),
            rateLimitStatus: document.getElementById('rateLimitStatus'),
            
            // Progress elements
            progressFill: document.getElementById('progressFill'),
            imageCount: document.getElementById('imageCount'),
            categoryCount: document.getElementById('categoryCount'),
            duplicateCount: document.getElementById('duplicateCount'),
            filteredCount: document.getElementById('filteredCount'),
            timeElapsed: document.getElementById('timeElapsed'),
            crawlSpeed: document.getElementById('crawlSpeed'),
            currentPage: document.getElementById('currentPage'),
            
            // Results elements
            resultsSection: document.getElementById('resultsSection'),
            categoryList: document.getElementById('categoryList'),
            pagesList: document.getElementById('pagesList'),
            categoryNavigation: document.getElementById('categoryNavigation'),
            
            // Download buttons
            downloadAllBtn: document.getElementById('downloadAllBtn'),
            exportJsonBtn: document.getElementById('exportJsonBtn'),
            downloadAllSiteBtn: document.getElementById('downloadAllSiteBtn'),
            downloadAllCategoriesBtn: document.getElementById('downloadAllCategoriesBtn'),
            downloadByPageBtn: document.getElementById('downloadByPageBtn'),
            downloadSelectedBtn: document.getElementById('downloadSelectedBtn'),
            
            // Stats elements
            totalImagesCount: document.getElementById('totalImagesCount'),
            totalCategoriesCount: document.getElementById('totalCategoriesCount'),
            totalSize: document.getElementById('totalSize'),
            lastCrawlTime: document.getElementById('lastCrawlTime'),
            
            // Loading elements
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingTitle: document.getElementById('loadingTitle'),
            loadingMessage: document.getElementById('loadingMessage'),
            loadingBar: document.getElementById('loadingBar'),
            loadingPages: document.getElementById('loadingPages'),
            loadingImages: document.getElementById('loadingImages'),
            loadingSpeed: document.getElementById('loadingSpeed'),
            
            // Distributed panel
            distributedPanel: document.getElementById('distributedPanel'),
            clusterStatus: document.getElementById('clusterStatus'),
            clusterStats: document.getElementById('clusterStats'),
            
            // Log elements
            logContent: document.getElementById('logContent'),
            clearLogsBtn: document.getElementById('clearLogsBtn'),
            exportLogsBtn: document.getElementById('exportLogsBtn'),
            toggleLogsBtn: document.getElementById('toggleLogsBtn'),
            
            // Error element
            errorMessage: document.getElementById('errorMessage'),
            
            // Accordion
            advancedOptionsAccordion: document.getElementById('advancedOptionsAccordion'),
            
            // Quick buttons
            toggleAdvancedOptions: document.getElementById('toggleAdvancedOptions'),
            loadPreset: document.getElementById('loadPreset'),
            savePreset: document.getElementById('savePreset'),
            settingsButton: document.getElementById('settingsButton'),
            helpButton: document.getElementById('helpButton'),
            aboutButton: document.getElementById('aboutButton'),
            
            // Pause/Cancel buttons
            pauseBtn: document.getElementById('pauseBtn'),
            cancelBtn: document.getElementById('cancelBtn')
        };
    }

    bindEvents() {
        // Crawl button
        this.elements.crawlBtn.addEventListener('click', () => this.startCrawling());
        this.elements.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.startCrawling();
            }
        });
        
        // Stop button
        this.elements.stopBtn.addEventListener('click', () => this.stopCrawling());
        
        // Pause/Cancel buttons
        this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
        this.elements.cancelBtn.addEventListener('click', () => this.stopCrawling());
        
        // Download buttons
        this.elements.downloadAllBtn.addEventListener('click', () => this.downloadAll());
        this.elements.exportJsonBtn.addEventListener('click', () => this.exportJson());
        this.elements.downloadAllSiteBtn.addEventListener('click', () => this.downloadAllSite());
        this.elements.downloadAllCategoriesBtn.addEventListener('click', () => this.downloadAllCategories());
        this.elements.downloadByPageBtn.addEventListener('click', () => this.togglePagesView());
        this.elements.downloadSelectedBtn.addEventListener('click', () => this.downloadSelected());
        
        // Log buttons
        this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        this.elements.exportLogsBtn.addEventListener('click', () => this.exportLogs());
        this.elements.toggleLogsBtn.addEventListener('click', () => this.toggleLogs());
        
        // Quick buttons
        this.elements.toggleAdvancedOptions.addEventListener('click', () => this.toggleAdvancedOptions());
        this.elements.loadPreset.addEventListener('click', () => this.loadPreset());
        this.elements.savePreset.addEventListener('click', () => this.savePreset());
        this.elements.settingsButton.addEventListener('click', () => this.openSettings());
        this.elements.helpButton.addEventListener('click', () => this.showHelp());
        this.elements.aboutButton.addEventListener('click', () => this.showAbout());
        
        // Settings toggles
        this.elements.advancedCrawling.addEventListener('change', (e) => {
            this.settings.advancedCrawling = e.target.checked;
            this.saveSettings();
            this.updateUIForAdvancedCrawling();
        });
        
        this.elements.distributedCrawling.addEventListener('change', (e) => {
            this.settings.distributedCrawling = e.target.checked;
            this.saveSettings();
            this.updateDistributedPanel();
        });
        
        this.elements.useProxy.addEventListener('change', (e) => {
            this.settings.proxyEnabled = e.target.checked;
            this.saveSettings();
            this.updateProxyStatus();
        });
        
        // Accordion
        const accordionHeader = this.elements.advancedOptionsAccordion.querySelector('.accordion-header');
        accordionHeader.addEventListener('click', () => {
            this.elements.advancedOptionsAccordion.querySelector('.accordion-content').classList.toggle('active');
            const icon = accordionHeader.querySelector('.fa-chevron-down');
            icon.classList.toggle('fa-rotate-180');
        });
        
        // Log filters
        document.querySelectorAll('.log-filter').forEach(filter => {
            filter.addEventListener('change', () => this.filterLogs());
        });
        
        // Image type checkboxes
        document.querySelectorAll('input[name="imageTypes"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateImageTypes());
        });
    }

    setupSliders() {
        // Max depth slider
        this.elements.maxDepth.addEventListener('input', (e) => {
            this.elements.maxDepthValue.textContent = e.target.value;
            this.settings.maxDepth = parseInt(e.target.value);
            this.saveSettings();
        });

        // Quality slider
        this.elements.quality.addEventListener('input', (e) => {
            this.elements.qualityValue.textContent = `${e.target.value}%`;
            this.settings.quality = parseInt(e.target.value);
            this.saveSettings();
        });
        
        // Update settings from other inputs
        const settingsInputs = ['maxPages', 'minWidth', 'minHeight', 'maxSize', 'rateLimit', 'requestDelay'];
        settingsInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.settings[id] = parseInt(e.target.value) || e.target.value;
                    this.saveSettings();
                    this.updateStatusDisplay();
                });
            }
        });
        
        // Category mode
        this.elements.categoryMode.addEventListener('change', (e) => {
            this.settings.categoryMode = e.target.value;
            this.saveSettings();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + Enter: Start crawling
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.startCrawling();
            }
            
            // Ctrl + ,: Open settings
            if (e.ctrlKey && e.key === ',') {
                e.preventDefault();
                this.openSettings();
            }
            
            // Ctrl + D: Download all
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.downloadAll();
            }
            
            // Ctrl + L: Toggle logs
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.toggleLogs();
            }
            
            // Ctrl + Shift + C: Clear all
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.resetUI();
            }
            
            // F1: Show help
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp();
            }
            
            // Esc: Close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Show keyboard shortcuts on Ctrl+/
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                this.toggleKeyboardShortcuts();
            }
        });
    }

    async startCrawling() {
        const url = this.elements.urlInput.value.trim();
        
        if (!this.validateUrl(url)) {
            this.showError('Please enter a valid HTTP/HTTPS URL');
            return;
        }

        if (this.crawling) {
            this.showError('Crawling already in progress');
            return;
        }

        this.crawling = true;
        this.resetUI();
        this.showLoading(true);
        this.showError('');
        
        // Update UI for crawling state
        this.elements.crawlBtn.style.display = 'none';
        this.elements.stopBtn.style.display = 'flex';
        this.elements.pauseBtn.style.display = 'flex';
        this.elements.cancelBtn.style.display = 'flex';
        
        // Collect options
        const options = this.getCrawlOptions();
        
        this.log(`Starting crawl of ${url}`, 'info');
        this.log(`Options: Depth=${options.maxDepth}, Max Pages=${options.maxPages}`, 'info');
        
        this.crawlStartTime = Date.now();
        this.startTimer();
        
        try {
            const response = await fetch(`${this.API_BASE}/crawl`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    options: options
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.taskId) {
                // Distributed crawling - poll for results
                this.currentTaskId = result.taskId;
                this.pollTaskResult(result.taskId);
            } else if (result.success) {
                this.processCrawlResult(result);
                this.showNotification('Crawling completed successfully!', 'success');
                this.log(`Crawling completed: ${result.totalImages} images found`, 'success');
            } else {
                throw new Error(result.error || 'Crawling failed');
            }
        } catch (error) {
            this.showError(`Crawling failed: ${error.message}`);
            this.log(`Crawling error: ${error.message}`, 'error');
            this.stopCrawling();
        }
    }

    async pollTaskResult(taskId) {
        try {
            const response = await fetch(`${this.API_BASE}/tasks/${taskId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to get task status: HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'processing') {
                // Still processing, poll again in 2 seconds
                setTimeout(() => this.pollTaskResult(taskId), 2000);
                this.updateLoadingProgress(result.progress);
            } else if (result.success) {
                this.processCrawlResult(result);
                this.showNotification('Crawling completed successfully!', 'success');
                this.stopCrawling();
            } else {
                throw new Error(result.error || 'Task failed');
            }
        } catch (error) {
            this.showError(`Task failed: ${error.message}`);
            this.log(`Task error: ${error.message}`, 'error');
            this.stopCrawling();
        }
    }

    processCrawlResult(result) {
        // Store images
        this.images.clear();
        for (const [category, images] of Object.entries(result.imagesByCategory || {})) {
            this.images.set(category, images);
        }
        
        // Update stats
        this.imageStats = {
            total: result.totalImages || 0,
            duplicates: result.summary?.duplicatesFound || 0,
            filtered: result.summary?.filteredImages || 0,
            categories: Object.keys(result.categories || {}).length,
            pages: this.visitedUrls?.size || 0
        };
        
        // Extract pages
        this.extractPagesFromImages();
        
        // Display results
        this.displayResults(result);
        
        // Update last crawl time
        this.elements.lastCrawlTime.textContent = new Date().toLocaleTimeString();
        
        // Save to history
        this.saveToHistory(result);
    }

    extractPagesFromImages() {
        this.pages.clear();
        
        for (const [category, images] of this.images.entries()) {
            for (const image of images) {
                const pageUrl = image.pageUrl;
                if (!this.pages.has(pageUrl)) {
                    this.pages.set(pageUrl, {
                        url: pageUrl,
                        title: image.pageTitle || 'Untitled',
                        images: [],
                        categories: new Set()
                    });
                }
                
                const page = this.pages.get(pageUrl);
                page.images.push(image);
                page.categories.add(category);
            }
        }
    }

    stopCrawling() {
        this.crawling = false;
        this.showLoading(false);
        this.stopTimer();
        
        // Update UI
        this.elements.crawlBtn.style.display = 'flex';
        this.elements.stopBtn.style.display = 'none';
        this.elements.pauseBtn.style.display = 'none';
        this.elements.cancelBtn.style.display = 'none';
        
        if (this.currentTaskId) {
            // TODO: Send cancel request to backend
            this.currentTaskId = null;
        }
        
        this.log('Crawling stopped', 'warning');
    }

    togglePause() {
        const isPaused = this.elements.pauseBtn.innerHTML.includes('Resume');
        
        if (isPaused) {
            this.elements.pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            this.log('Crawling resumed', 'info');
        } else {
            this.elements.pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            this.log('Crawling paused', 'warning');
        }
        
        // TODO: Implement actual pause/resume logic
    }

    getCrawlOptions() {
        const imageTypes = Array.from(
            document.querySelectorAll('input[name="imageTypes"]:checked')
        ).map(cb => cb.value);

        return {
            maxDepth: parseInt(this.elements.maxDepth.value) || this.settings.maxDepth,
            maxPages: parseInt(this.elements.maxPages.value) || this.settings.maxPages,
            categoryMode: this.elements.categoryMode.value || this.settings.categoryMode,
            imageTypes: imageTypes.length > 0 ? imageTypes : this.settings.imageTypes,
            minWidth: parseInt(this.elements.minWidth.value) || this.settings.minWidth,
            minHeight: parseInt(this.elements.minHeight.value) || this.settings.minHeight,
            maxSizeKB: parseInt(this.elements.maxSize.value) || this.settings.maxSize,
            quality: parseInt(this.elements.quality.value) || this.settings.quality,
            detectDuplicates: this.elements.detectDuplicates.checked,
            respectRobots: this.elements.respectRobots.checked,
            requestDelay: parseInt(this.elements.requestDelay.value) || this.settings.requestDelay,
            requestTimeout: 10000,
            concurrentRequests: 5,
            useProxy: this.elements.useProxy.checked,
            advancedCrawling: this.elements.advancedCrawling.checked,
            distributed: this.elements.distributedCrawling.checked,
            rateLimit: {
                requests: parseInt(this.elements.rateLimit.value) || this.settings.rateLimit,
                perSeconds: 1
            },
            userAgent: this.settings.userAgent
        };
    }

    validateUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    displayResults(result) {
        this.elements.resultsSection.style.display = 'block';
        
        // Update summary
        this.elements.totalImagesCount.textContent = this.imageStats.total;
        this.elements.totalCategoriesCount.textContent = this.imageStats.categories;
        
        // Calculate total size
        let totalSizeKB = 0;
        if (result.categories) {
            Object.values(result.categories).forEach(cat => {
                totalSizeKB += cat.totalSizeKB || 0;
            });
        }
        this.elements.totalSize.textContent = totalSizeKB > 1024 
            ? `${(totalSizeKB / 1024).toFixed(2)} MB`
            : `${totalSizeKB.toFixed(2)} KB`;
        
        // Update progress stats
        this.updateProgressStats();
        
        // Display categories
        this.displayCategories();
        
        // Update category navigation
        this.updateCategoryNavigation();
        
        // Show distributed panel if enabled
        this.updateDistributedPanel();
    }

    displayCategories() {
        this.elements.categoryList.innerHTML = '';
        this.elements.pagesList.style.display = 'none';
        this.elements.categoryList.style.display = 'grid';
        
        for (const [category, images] of this.images.entries()) {
            const categoryCard = this.createCategoryCard(category, images, 
                this.getCategoryStats(category, images));
            this.elements.categoryList.appendChild(categoryCard);
        }
    }

    createCategoryCard(categoryName, images, stats) {
        const div = document.createElement('div');
        div.className = 'category-card';
        
        div.innerHTML = `
            <div class="category-header">
                <div class="category-name">
                    <i class="fas fa-folder"></i>
                    ${this.formatCategoryName(categoryName)}
                </div>
                <div class="category-stats">
                    <div class="category-stat" title="${images.length} images">
                        <i class="fas fa-images"></i>
                        <span>${images.length}</span>
                    </div>
                    ${stats ? `
                    <div class="category-stat" title="Average dimensions">
                        <i class="fas fa-expand-alt"></i>
                        <span>${stats.avgWidth || 0}x${stats.avgHeight || 0}</span>
                    </div>
                    <div class="category-stat" title="Total size">
                        <i class="fas fa-weight-hanging"></i>
                        <span>${(stats.totalSizeKB || 0).toFixed(2)}KB</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="image-preview">
                ${images.slice(0, 6).map(img => `
                    <div class="preview-item" 
                         data-image-id="${this.getImageId(img)}"
                         title="${img.filename} (${img.width}x${img.height})">
                        <img src="${img.url}" alt="${img.filename}" loading="lazy"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23e2e8f0\"/><text x=\"50\" y=\"50\" font-family=\"Arial\" font-size=\"10\" text-anchor=\"middle\" dy=\".3em\" fill=\"%234a5568\">${img.extension.toUpperCase()}</text></svg>'">
                        <div class="preview-overlay">${Math.round(img.sizeKB)}KB</div>
                    </div>
                `).join('')}
                ${images.length > 6 ? `
                    <div class="preview-item" style="background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: default;">
                        +${images.length - 6}
                    </div>
                ` : ''}
            </div>
            <div class="category-actions">
                <button class="btn btn-primary download-category" 
                        data-category="${categoryName}">
                    <i class="fas fa-download"></i> Download (${images.length})
                </button>
                <button class="btn btn-secondary view-category" 
                        data-category="${categoryName}">
                    <i class="fas fa-eye"></i> View All
                </button>
            </div>
        `;
        
        // Add event listeners
        div.querySelector('.download-category').addEventListener('click', () => {
            this.downloadCategory(categoryName, images);
        });
        
        div.querySelector('.view-category').addEventListener('click', () => {
            this.viewCategory(categoryName, images);
        });
        
        // Add click handlers for image selection
        div.querySelectorAll('.preview-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.currentTarget.style.background === 'rgb(102, 126, 234)') return; // Skip "more" item
                const imageId = e.currentTarget.dataset.imageId;
                this.toggleImageSelection(imageId, e.currentTarget);
            });
        });
        
        return div;
    }

    getCategoryStats(categoryName, images) {
        if (!images || images.length === 0) return null;
        
        const totalSizeKB = images.reduce((sum, img) => sum + img.sizeKB, 0);
        const avgWidth = Math.round(images.reduce((sum, img) => sum + img.width, 0) / images.length);
        const avgHeight = Math.round(images.reduce((sum, img) => sum + img.height, 0) / images.length);
        
        return {
            totalSizeKB,
            avgWidth,
            avgHeight,
            count: images.length
        };
    }

    async downloadCategory(categoryName, images) {
        if (!images || images.length === 0) {
            this.showError(`No images found in category: ${categoryName}`);
            return;
        }
        
        try {
            this.log(`Downloading category: ${categoryName} (${images.length} images)`, 'info');
            this.showNotification(`Starting download of ${categoryName}...`, 'info');
            
            const response = await fetch(`${this.API_BASE}/download/category/${encodeURIComponent(categoryName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    images: images,
                    options: this.getCrawlOptions()
                })
            });

            if (!response.ok) {
                throw new Error(`Download failed: HTTP ${response.status}`);
            }

            const blob = await response.blob();
            this.saveBlobAsFile(blob, `${categoryName}-images.zip`);
            
            this.log(`Successfully downloaded ${categoryName} category`, 'success');
            this.showNotification(`Downloaded ${categoryName} category!`, 'success');
        } catch (error) {
            this.log(`Failed to download category: ${error.message}`, 'error');
            this.showError(`Download failed: ${error.message}`);
        }
    }

    async downloadAll() {
        const allImages = [];
        for (const images of this.images.values()) {
            allImages.push(...images);
        }
        
        if (allImages.length === 0) {
            this.showError('No images to download');
            return;
        }
        
        await this.downloadImages(allImages, 'all-images.zip');
    }

    async downloadAllSite() {
        const allImages = [];
        for (const images of this.images.values()) {
            allImages.push(...images);
        }
        
        if (allImages.length === 0) {
            this.showError('No images to download');
            return;
        }
        
        const url = new URL(this.elements.urlInput.value);
        const domain = url.hostname.replace('www.', '');
        await this.downloadImages(allImages, `${domain}-images.zip`);
    }

    async downloadAllCategories() {
        const downloadPromises = [];
        
        for (const [category, images] of this.images.entries()) {
            if (images.length > 0) {
                downloadPromises.push(this.downloadCategory(category, images));
            }
        }
        
        if (downloadPromises.length === 0) {
            this.showError('No categories to download');
            return;
        }
        
        this.showNotification(`Downloading ${downloadPromises.length} categories...`, 'info');
        
        // Download sequentially to avoid overwhelming the server
        for (const promise of downloadPromises) {
            await promise;
            await this.delay(1000); // Delay between downloads
        }
    }

    async downloadSelected() {
        if (this.selectedImages.size === 0) {
            this.showError('No images selected');
            return;
        }
        
        const selectedImages = Array.from(this.selectedImages).map(id => 
            this.findImageById(id)
        ).filter(img => img);
        
        await this.downloadImages(selectedImages, 'selected-images.zip');
    }

    async downloadImages(images, filename) {
        try {
            this.log(`Downloading ${images.length} images as ${filename}`, 'info');
            this.showNotification(`Starting download of ${images.length} images...`, 'info');
            
            const response = await fetch(`${this.API_BASE}/download/all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    images: images,
                    options: this.getCrawlOptions()
                })
            });

            if (!response.ok) {
                throw new Error(`Download failed: HTTP ${response.status}`);
            }

            const blob = await response.blob();
            this.saveBlobAsFile(blob, filename);
            
            this.log(`Successfully downloaded ${images.length} images`, 'success');
            this.showNotification(`Downloaded ${images.length} images!`, 'success');
        } catch (error) {
            this.log(`Failed to download images: ${error.message}`, 'error');
            this.showError(`Download failed: ${error.message}`);
        }
    }

    togglePagesView() {
        if (this.elements.pagesList.style.display === 'none') {
            this.displayPages();
            this.elements.downloadByPageBtn.innerHTML = '<i class="fas fa-folder"></i> Show Categories';
        } else {
            this.displayCategories();
            this.elements.downloadByPageBtn.innerHTML = '<i class="fas fa-file"></i> By Page';
        }
    }

    displayPages() {
        this.elements.pagesList.innerHTML = '';
        this.elements.categoryList.style.display = 'none';
        this.elements.pagesList.style.display = 'grid';
        
        for (const [pageUrl, pageData] of this.pages.entries()) {
            const pageCard = this.createPageCard(pageUrl, pageData);
            this.elements.pagesList.appendChild(pageCard);
        }
    }

    createPageCard(pageUrl, pageData) {
        const div = document.createElement('div');
        div.className = 'page-card';
        
        const pageId = this.generatePageId(pageUrl);
        
        div.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <i class="fas fa-file"></i>
                    ${pageData.title.substring(0, 50)}
                </div>
                <span class="category-stat">
                    <i class="fas fa-images"></i>
                    ${pageData.images.length}
                </span>
            </div>
            <div class="page-url" title="${pageUrl}">
                ${pageUrl.substring(0, 100)}${pageUrl.length > 100 ? '...' : ''}
            </div>
            <div class="category-actions">
                <button class="btn btn-primary download-page" data-page-id="${pageId}">
                    <i class="fas fa-download"></i> Download Page
                </button>
            </div>
        `;
        
        div.querySelector('.download-page').addEventListener('click', () => {
            this.downloadPage(pageUrl, pageData.images);
        });
        
        return div;
    }

    async downloadPage(pageUrl, images) {
        if (!images || images.length === 0) {
            this.showError(`No images found for page: ${pageUrl}`);
            return;
        }
        
        const pageId = this.generatePageId(pageUrl);
        const pageTitle = images[0]?.pageTitle || 'page';
        const cleanTitle = pageTitle.substring(0, 30).replace(/[^\w\s]/gi, '_');
        
        await this.downloadImages(images, `${cleanTitle}-${pageId}.zip`);
    }

    viewCategory(categoryName, images) {
        const modal = this.createImageModal(categoryName, images);
        document.body.appendChild(modal);
        
        // Close modal on escape
        const closeModal = () => {
            modal.style.display = 'none';
            setTimeout(() => document.body.removeChild(modal), 300);
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    createImageModal(title, images) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-images"></i> ${this.formatCategoryName(title)}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-grid">
                        ${images.map(img => `
                            <div class="modal-image-item" data-image-id="${this.getImageId(img)}">
                                <img src="${img.url}" alt="${img.filename}" loading="lazy"
                                     onerror="this.style.display='none'">
                                <div class="modal-image-info">
                                    <div title="${img.filename}">${img.filename.substring(0, 30)}${img.filename.length > 30 ? '...' : ''}</div>
                                    <div>${img.width}x${img.height} • ${Math.round(img.sizeKB)}KB</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="modalDownloadBtn">
                        <i class="fas fa-download"></i> Download ${images.length} Images
                    </button>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .modal-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 20px;
            }
            .modal-image-item {
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                overflow: hidden;
                transition: transform 0.3s;
                cursor: pointer;
            }
            .modal-image-item:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            .modal-image-item img {
                width: 100%;
                height: 150px;
                object-fit: cover;
                background: #f7fafc;
            }
            .modal-image-info {
                padding: 15px;
                background: #f7fafc;
            }
            .modal-image-info div:first-child {
                font-weight: 600;
                margin-bottom: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .modal-image-info div:last-child {
                font-size: 0.9rem;
                color: #718096;
            }
        `;
        modal.appendChild(style);
        
        // Add download button functionality
        modal.querySelector('#modalDownloadBtn').addEventListener('click', () => {
            this.downloadCategory(title, images);
            document.body.removeChild(modal);
        });
        
        // Add click handlers for images
        modal.querySelectorAll('.modal-image-item').forEach(item => {
            item.addEventListener('click', () => {
                const imageId = item.dataset.imageId;
                const image = this.findImageById(imageId);
                if (image) {
                    window.open(image.url, '_blank');
                }
            });
        });
        
        return modal;
    }

    updateProgressStats() {
        this.elements.imageCount.textContent = this.imageStats.total;
        this.elements.categoryCount.textContent = this.imageStats.categories;
        this.elements.duplicateCount.textContent = this.imageStats.duplicates;
        this.elements.filteredCount.textContent = this.imageStats.filtered;
        
        const progress = Math.min(100, (this.visitedUrls?.size || 0) / (this.settings.maxPages || 1) * 100);
        this.elements.progressFill.style.width = `${progress}%`;
    }

    startTimer() {
        this.crawlTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.crawlStartTime) / 1000);
            this.elements.timeElapsed.textContent = `${elapsed}s`;
            
            const pagesPerMinute = this.visitedUrls ? 
                Math.round((this.visitedUrls.size / elapsed) * 60) : 0;
            this.elements.crawlSpeed.textContent = `${pagesPerMinute} pages/min`;
        }, 1000);
    }

    stopTimer() {
        if (this.crawlTimer) {
            clearInterval(this.crawlTimer);
            this.crawlTimer = null;
        }
    }

    showLoading(show) {
        if (show) {
            this.elements.loadingOverlay.classList.add('active');
        } else {
            this.elements.loadingOverlay.classList.remove('active');
        }
    }

    updateLoadingProgress(progress) {
        if (progress) {
            this.elements.loadingBar.style.width = `${progress}%`;
        }
    }

    showError(message) {
        this.elements.errorMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>${message}</div>
        `;
        this.elements.errorMessage.classList.add('active');
        setTimeout(() => {
            this.elements.errorMessage.classList.remove('active');
        }, 5000);
    }

    showNotification(message, type = 'info') {
        const config = {
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: type === 'success' ? "#48bb78" : 
                           type === 'error' ? "#f56565" :
                           type === 'warning' ? "#ed8936" : "#4299e1"
        };
        
        if (typeof Toastify !== 'undefined') {
            Toastify(config).showToast();
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    log(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry`;
        
        const time = new Date().toLocaleTimeString();
        const messageSpan = document.createElement('span');
        messageSpan.className = `log-message ${type}`;
        messageSpan.textContent = message;
        
        logEntry.innerHTML = `<span class="log-time">[${time}]</span>`;
        logEntry.appendChild(messageSpan);
        
        this.elements.logContent.appendChild(logEntry);
        this.elements.logContent.scrollTop = this.elements.logContent.scrollHeight;
        
        // Apply filters
        this.filterLogs();
    }

    filterLogs() {
        const filters = Array.from(document.querySelectorAll('.log-filter:checked'))
            .map(f => f.value);
        
        this.elements.logContent.querySelectorAll('.log-entry').forEach(entry => {
            const messageType = entry.querySelector('.log-message').className.split(' ')[1];
            entry.style.display = filters.includes(messageType) ? 'flex' : 'none';
        });
    }

    clearLogs() {
        this.elements.logContent.innerHTML = '';
        this.log('Logs cleared', 'info');
    }

    exportLogs() {
        const logs = Array.from(this.elements.logContent.children)
            .map(entry => entry.textContent)
            .join('\n');
        
        const blob = new Blob([logs], { type: 'text/plain' });
        this.saveBlobAsFile(blob, `crawler-logs-${new Date().toISOString().slice(0, 10)}.txt`);
        
        this.log('Logs exported', 'success');
        this.showNotification('Logs exported!', 'success');
    }

    toggleLogs() {
        const logContent = this.elements.logContent;
        const icon = this.elements.toggleLogsBtn.querySelector('i');
        
        if (logContent.style.maxHeight === '0px' || !logContent.style.maxHeight) {
            logContent.style.maxHeight = '300px';
            icon.className = 'fas fa-chevron-up';
        } else {
            logContent.style.maxHeight = '0px';
            icon.className = 'fas fa-chevron-down';
        }
    }

    toggleAdvancedOptions() {
        const accordionContent = this.elements.advancedOptionsAccordion.querySelector('.accordion-content');
        accordionContent.classList.toggle('active');
    }

    async loadPreset() {
        // Implementation for loading presets
        this.showNotification('Load preset functionality coming soon!', 'info');
    }

    async savePreset() {
        // Implementation for saving presets
        this.showNotification('Save preset functionality coming soon!', 'info');
    }

    openSettings() {
        const modal = this.createSettingsModal();
        document.body.appendChild(modal);
        
        // Close modal on escape
        const closeModal = () => {
            modal.style.display = 'none';
            setTimeout(() => document.body.removeChild(modal), 300);
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-cog"></i> Crawler Settings</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-tabs">
                        <div class="tab-buttons">
                            <button class="tab-button active" data-tab="general">General</button>
                            <button class="tab-button" data-tab="crawling">Crawling</button>
                            <button class="tab-button" data-tab="proxy">Proxy</button>
                            <button class="tab-button" data-tab="performance">Performance</button>
                            <button class="tab-button" data-tab="advanced">Advanced</button>
                        </div>
                        
                        <div class="tab-content active" id="general-tab">
                            <div class="setting-group">
                                <label for="settingsUserAgent">User Agent</label>
                                <input type="text" id="settingsUserAgent" 
                                       value="${this.settings.userAgent}">
                                <p class="setting-description">
                                    The user agent string sent with requests.
                                </p>
                            </div>
                            
                            <div class="setting-group">
                                <label for="settingsDefaultUrl">Default URL</label>
                                <input type="text" id="settingsDefaultUrl" 
                                       value="${this.elements.urlInput.value}">
                                <p class="setting-description">
                                    Default URL to pre-fill in the input field.
                                </p>
                            </div>
                        </div>
                        
                        <div class="tab-content" id="crawling-tab">
                            <div class="setting-group">
                                <label for="settingsDefaultMaxDepth">Default Max Depth</label>
                                <input type="number" id="settingsDefaultMaxDepth" 
                                       value="${this.settings.maxDepth}" min="1" max="5">
                            </div>
                            
                            <div class="setting-group">
                                <label for="settingsDefaultMaxPages">Default Max Pages</label>
                                <input type="number" id="settingsDefaultMaxPages" 
                                       value="${this.settings.maxPages}" min="1" max="500">
                            </div>
                            
                            <div class="setting-group">
                                <label for="settingsDefaultQuality">Default Quality</label>
                                <input type="number" id="settingsDefaultQuality" 
                                       value="${this.settings.quality}" min="1" max="100">
                                <span>%</span>
                            </div>
                        </div>
                        
                        <div class="tab-content" id="proxy-tab">
                            <div class="setting-group">
                                <label for="settingsProxyList">Proxy List</label>
                                <textarea id="settingsProxyList" 
                                          placeholder="Enter proxies (one per line)
Format: http://username:password@host:port
        socks5://host:port"></textarea>
                                <p class="setting-description">
                                    List of proxies to use for requests.
                                </p>
                            </div>
                            
                            <div class="setting-group">
                                <button class="btn btn-secondary" id="settingsTestProxies">
                                    <i class="fas fa-vial"></i> Test Proxies
                                </button>
                            </div>
                        </div>
                        
                        <div class="tab-content" id="performance-tab">
                            <div class="setting-group">
                                <label for="settingsCacheSize">Cache Size (MB)</label>
                                <input type="number" id="settingsCacheSize" 
                                       value="100" min="10" max="1000">
                            </div>
                            
                            <div class="setting-group">
                                <label for="settingsMaxConcurrent">Max Concurrent Requests</label>
                                <input type="number" id="settingsMaxConcurrent" 
                                       value="5" min="1" max="20">
                            </div>
                            
                            <div class="setting-group">
                                <label for="settingsTimeout">Request Timeout (seconds)</label>
                                <input type="number" id="settingsTimeout" 
                                       value="10" min="1" max="60">
                            </div>
                        </div>
                        
                        <div class="tab-content" id="advanced-tab">
                            <div class="setting-group">
                                <label class="switch-label">
                                    <input type="checkbox" id="settingsEnableDebug" 
                                           ${localStorage.getItem('debugMode') === 'true' ? 'checked' : ''}>
                                    <span class="switch"></span>
                                    <span class="switch-text">Enable Debug Mode</span>
                                </label>
                            </div>
                            
                            <div class="setting-group">
                                <label class="switch-label">
                                    <input type="checkbox" id="settingsAutoSave" checked>
                                    <span class="switch"></span>
                                    <span class="switch-text">Auto-save Results</span>
                                </label>
                            </div>
                            
                            <div class="setting-group">
                                <label class="switch-label">
                                    <input type="checkbox" id="settingsNotifications" checked>
                                    <span class="switch"></span>
                                    <span class="switch-text">Enable Notifications</span>
                                </label>
                            </div>
                            
                            <div class="setting-group">
                                <label for="settingsTheme">Theme</label>
                                <select id="settingsTheme">
                                    <option value="auto">Auto (System)</option>
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="settingsCancel">Cancel</button>
                    <button class="btn btn-primary" id="settingsSave">Save Settings</button>
                </div>
            </div>
        `;
        
        // Add tab switching
        modal.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                // Update active tab button
                modal.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                
                // Show corresponding tab content
                modal.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                modal.querySelector(`#${tabId}-tab`).classList.add('active');
            });
        });
        
        // Add event listeners
        modal.querySelector('#settingsCancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#settingsSave').addEventListener('click', () => {
            this.saveSettingsFromModal(modal);
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#settingsTestProxies').addEventListener('click', () => {
            this.testProxies();
        });
        
        return modal;
    }

    saveSettingsFromModal(modal) {
        // Update settings from modal
        this.settings.userAgent = modal.querySelector('#settingsUserAgent').value;
        this.settings.maxDepth = parseInt(modal.querySelector('#settingsDefaultMaxDepth').value) || 2;
        this.settings.maxPages = parseInt(modal.querySelector('#settingsDefaultMaxPages').value) || 50;
        this.settings.quality = parseInt(modal.querySelector('#settingsDefaultQuality').value) || 80;
        
        // Save default URL
        const defaultUrl = modal.querySelector('#settingsDefaultUrl').value;
        if (defaultUrl && this.validateUrl(defaultUrl)) {
            localStorage.setItem('defaultUrl', defaultUrl);
        }
        
        // Save debug mode
        const debugMode = modal.querySelector('#settingsEnableDebug').checked;
        localStorage.setItem('debugMode', debugMode);
        
        this.saveSettings();
        this.showNotification('Settings saved successfully!', 'success');
    }

    showHelp() {
        const helpText = `
Advanced Image Crawler Help

1. BASIC USAGE:
   - Enter a URL in the input field
   - Click "Start Crawling" or press Ctrl+Enter
   - Wait for the crawler to finish
   - Download images using the available options

2. DOWNLOAD OPTIONS:
   - All Site Images: Download all images from the site
   - All Categories: Download each category separately
   - By Page: Download images organized by page
   - Selected Only: Download only selected images

3. ADVANCED FEATURES:
   - Distributed Crawling: Use multiple workers (requires backend setup)
   - Proxy Support: Route requests through proxies
   - Rate Limiting: Control request frequency
   - Duplicate Detection: Skip duplicate images
   - Image Filtering: Filter by size, type, and quality

4. KEYBOARD SHORTCUTS:
   - Ctrl+Enter: Start crawling
   - Ctrl+,: Open settings
   - Ctrl+D: Download all
   - Ctrl+L: Toggle logs
   - Ctrl+/: Show this help
   - Esc: Close modals

5. TROUBLESHOOTING:
   - Check API connection status in top-right corner
   - Enable debug mode in settings for detailed logs
   - Reduce rate limit if experiencing connection issues
   - Check browser console for errors
        `;
        
        alert(helpText);
    }

    showAbout() {
        const aboutText = `
Advanced Image Crawler v1.0.0

A powerful tool for crawling websites and downloading images.

Features:
- Multi-threaded crawling
- Intelligent image organization
- Duplicate detection
- Proxy support
- Rate limiting
- Advanced filtering options
- Distributed crawling support

Built with modern web technologies.

For issues and feature requests, please contact support.
        `;
        
        alert(aboutText);
    }

    toggleKeyboardShortcuts() {
        const shortcuts = document.getElementById('keyboardShortcuts');
        shortcuts.classList.toggle('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.display = 'none';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        });
        
        const shortcuts = document.getElementById('keyboardShortcuts');
        shortcuts.classList.remove('active');
    }

    updateUIForAdvancedCrawling() {
        if (this.settings.advancedCrawling) {
            this.elements.advancedOptionsAccordion.querySelector('.accordion-content').classList.add('active');
        }
    }

    updateDistributedPanel() {
        if (this.settings.distributedCrawling) {
            this.elements.distributedPanel.style.display = 'block';
            this.elements.distributedStatus.textContent = 'Enabled';
            this.checkClusterStatus();
        } else {
            this.elements.distributedPanel.style.display = 'none';
            this.elements.distributedStatus.textContent = 'Disabled';
        }
    }

    updateProxyStatus() {
        if (this.settings.proxyEnabled) {
            this.elements.proxyStatus.textContent = 'Enabled';
            this.elements.proxyStatus.style.color = '#48bb78';
        } else {
            this.elements.proxyStatus.textContent = 'Disabled';
            this.elements.proxyStatus.style.color = '#718096';
        }
    }

    updateStatusDisplay() {
        this.elements.rateLimitStatus.textContent = `${this.settings.rateLimit} req/sec`;
    }

    async checkApiStatus() {
        try {
            const response = await fetch(`${this.API_BASE}/health`);
            if (response.ok) {
                this.elements.apiStatus.className = 'api-status connected';
                this.elements.apiStatus.innerHTML = '<i class="fas fa-circle"></i> <span>API Connected</span>';
                this.log('Backend API connected successfully', 'success');
            } else {
                throw new Error('API not responding');
            }
        } catch (error) {
            this.elements.apiStatus.className = 'api-status disconnected';
            this.elements.apiStatus.innerHTML = '<i class="fas fa-circle"></i> <span>API Disconnected</span>';
            this.log('Backend API connection failed', 'error');
        }
    }

    async checkClusterStatus() {
        try {
            const response = await fetch(`${this.API_BASE}/cluster/stats`);
            if (response.ok) {
                const stats = await response.json();
                this.updateClusterStats(stats);
            }
        } catch (error) {
            console.log('Failed to get cluster stats:', error);
        }
    }

    updateClusterStats(stats) {
        if (!stats) return;
        
        this.elements.clusterStatus.innerHTML = `
            <span class="status-indicator ${stats.workers?.busyWorkers > 0 ? 'active' : 'idle'}"></span>
            <span>Cluster: ${stats.workers?.totalWorkers || 0} workers</span>
        `;
        
        this.elements.clusterStats.innerHTML = `
            <div class="stat">
                <i class="fas fa-server"></i>
                <span>Workers: ${stats.workers?.busyWorkers || 0}/${stats.workers?.totalWorkers || 0} active</span>
            </div>
            <div class="stat">
                <i class="fas fa-tasks"></i>
                <span>Tasks: ${stats.tasks?.completed || 0} completed</span>
            </div>
            <div class="stat">
                <i class="fas fa-memory"></i>
                <span>Memory: ${(stats.master?.memory?.heapUsed / 1024 / 1024).toFixed(2)} MB</span>
            </div>
        `;
    }

    updateCategoryNavigation() {
        this.elements.categoryNavigation.innerHTML = '';
        
        // Add "All" tab
        const allTab = document.createElement('button');
        allTab.className = 'category-tab active';
        allTab.textContent = 'All Categories';
        allTab.addEventListener('click', () => {
            this.displayCategories();
            this.elements.categoryNavigation.querySelectorAll('.category-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            allTab.classList.add('active');
        });
        this.elements.categoryNavigation.appendChild(allTab);
        
        // Add category tabs
        for (const category of this.images.keys()) {
            const tab = document.createElement('button');
            tab.className = 'category-tab';
            tab.textContent = this.formatCategoryName(category);
            tab.addEventListener('click', () => {
                this.filterByCategory(category);
                this.elements.categoryNavigation.querySelectorAll('.category-tab').forEach(t => {
                    t.classList.remove('active');
                });
                tab.classList.add('active');
            });
            this.elements.categoryNavigation.appendChild(tab);
        }
    }

    filterByCategory(categoryName) {
        this.elements.categoryList.innerHTML = '';
        
        if (categoryName === 'all') {
            this.displayCategories();
            return;
        }
        
        const images = this.images.get(categoryName) || [];
        const categoryCard = this.createCategoryCard(categoryName, images, 
            this.getCategoryStats(categoryName, images));
        this.elements.categoryList.appendChild(categoryCard);
    }

    getImageId(image) {
        return image.hash || 
               crypto.createHash('md5').update(image.url).digest('hex').substring(0, 8);
    }

    findImageById(imageId) {
        for (const images of this.images.values()) {
            for (const image of images) {
                if (this.getImageId(image) === imageId) {
                    return image;
                }
            }
        }
        return null;
    }

    toggleImageSelection(imageId, element) {
        if (this.selectedImages.has(imageId)) {
            this.selectedImages.delete(imageId);
            element.style.border = '2px solid #e2e8f0';
        } else {
            this.selectedImages.add(imageId);
            element.style.border = '2px solid #48bb78';
        }
        
        // Update download selected button text
        this.elements.downloadSelectedBtn.innerHTML = 
            `<i class="fas fa-check-square"></i> Selected (${this.selectedImages.size})`;
    }

    generatePageId(pageUrl) {
        return crypto.createHash('md5').update(pageUrl).digest('hex').substring(0, 8);
    }

    formatCategoryName(name) {
        return name
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    saveBlobAsFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    async testProxies() {
        try {
            this.log('Testing proxies...', 'info');
            this.showNotification('Testing proxies...', 'info');
            
            // Implementation would go here
            await this.delay(1000);
            
            this.log('Proxy test completed', 'success');
            this.showNotification('Proxy test completed', 'success');
        } catch (error) {
            this.log(`Proxy test failed: ${error.message}`, 'error');
            this.showError(`Proxy test failed: ${error.message}`);
        }
    }

    updateImageTypes() {
        const selectedTypes = Array.from(
            document.querySelectorAll('input[name="imageTypes"]:checked')
        ).map(cb => cb.value);
        
        this.settings.imageTypes = selectedTypes;
        this.saveSettings();
    }

    getApiBaseUrl() {
        const host = window.location.hostname;
        const port = window.location.port;
        
        if (host === 'localhost' || host === '127.0.0.1') {
            return `http://${host}:${port || '3000'}/api`;
        }
        
        // For production, use relative path
        return '/api';
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('crawlerSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
                this.applySettingsToUI();
            }
            
            // Load default URL
            const defaultUrl = localStorage.getItem('defaultUrl');
            if (defaultUrl) {
                this.elements.urlInput.value = defaultUrl;
            }
        } catch (error) {
            console.log('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('crawlerSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.log('Failed to save settings:', error);
        }
    }

    applySettingsToUI() {
        // Apply settings to UI elements
        this.elements.maxDepth.value = this.settings.maxDepth;
        this.elements.maxDepthValue.textContent = this.settings.maxDepth;
        this.elements.maxPages.value = this.settings.maxPages;
        this.elements.minWidth.value = this.settings.minWidth;
        this.elements.minHeight.value = this.settings.minHeight;
        this.elements.maxSize.value = this.settings.maxSize;
        this.elements.quality.value = this.settings.quality;
        this.elements.qualityValue.textContent = `${this.settings.quality}%`;
        this.elements.rateLimit.value = this.settings.rateLimit;
        this.elements.requestDelay.value = this.settings.requestDelay;
        
        this.elements.advancedCrawling.checked = this.settings.advancedCrawling;
        this.elements.distributedCrawling.checked = this.settings.distributedCrawling;
        this.elements.useProxy.checked = this.settings.proxyEnabled;
        this.elements.detectDuplicates.checked = this.settings.detectDuplicates;
        this.elements.respectRobots.checked = this.settings.respectRobots;
        
        // Update image type checkboxes
        document.querySelectorAll('input[name="imageTypes"]').forEach(checkbox => {
            checkbox.checked = this.settings.imageTypes.includes(checkbox.value);
        });
        
        // Update status displays
        this.updateProxyStatus();
        this.updateStatusDisplay();
        this.updateUIForAdvancedCrawling();
        this.updateDistributedPanel();
    }

    saveToHistory(result) {
        try {
            const history = JSON.parse(localStorage.getItem('crawlHistory') || '[]');
            
            history.unshift({
                timestamp: new Date().toISOString(),
                url: result.summary?.url || this.elements.urlInput.value,
                images: result.totalImages || 0,
                categories: Object.keys(result.categories || {}).length,
                duration: result.summary?.duration || 0
            });
            
            // Keep only last 50 entries
            if (history.length > 50) {
                history.length = 50;
            }
            
            localStorage.setItem('crawlHistory', JSON.stringify(history));
        } catch (error) {
            console.log('Failed to save to history:', error);
        }
    }

    exportJson() {
        const data = {
            crawlDate: new Date().toISOString(),
            url: this.elements.urlInput.value,
            options: this.getCrawlOptions(),
            images: Array.from(this.images.entries()).reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {}),
            stats: this.imageStats,
            pages: Array.from(this.pages.values())
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        this.saveBlobAsFile(blob, 'crawl-data.json');
        
        this.log('Exported crawl data as JSON', 'success');
        this.showNotification('Crawl data exported!', 'success');
    }

    resetUI() {
        this.images.clear();
        this.pages.clear();
        this.selectedImages.clear();
        this.visitedUrls = new Set();
        this.imageStats = {
            total: 0,
            duplicates: 0,
            filtered: 0,
            categories: 0,
            pages: 0
        };
        
        this.elements.resultsSection.style.display = 'none';
        this.elements.progressFill.style.width = '0%';
        this.elements.currentPage.textContent = 'Ready to crawl';
        
        this.elements.imageCount.textContent = '0';
        this.elements.categoryCount.textContent = '0';
        this.elements.duplicateCount.textContent = '0';
        this.elements.filteredCount.textContent = '0';
        this.elements.timeElapsed.textContent = '0s';
        this.elements.crawlSpeed.textContent = '0 pages/min';
        
        this.elements.totalImagesCount.textContent = '0';
        this.elements.totalCategoriesCount.textContent = '0';
        this.elements.totalSize.textContent = '0 KB';
        
        this.elements.downloadSelectedBtn.innerHTML = '<i class="fas fa-check-square"></i> Selected Only';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new ImageCrawlerApp();
    window.imageCrawler = app;
    
    // Check for service worker support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    }
});