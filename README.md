🕷️ Advanced Image Crawler
==========================

A powerful, feature-rich web crawler specifically designed for downloading and organizing images from websites. This tool provides intelligent image extraction with advanced filtering, duplicate detection, and organized storage.

[https://img.shields.io/badge/Advanced-Image%20Crawler-blue](https://img.shields.io/badge/Advanced-Image%20Crawler-blue)[https://img.shields.io/badge/Node.js-18+-green](https://img.shields.io/badge/Node.js-18+-green)[https://img.shields.io/badge/License-MIT-yellow](https://img.shields.io/badge/License-MIT-yellow)

✨ Features
----------

### 🎯 **Core Crawling**

*   **Multi-threaded crawling** with configurable depth and concurrency
    
*   **Intelligent URL discovery** following same-domain links
    
*   **Robots.txt respect** with automatic parser
    
*   **Rate limiting** to prevent IP blocking
    
*   **Request queueing** with configurable delays
    

### 🖼️ **Image Processing**

*   **Smart duplicate detection** using perceptual hashing
    
*   **Image filtering** by size, dimensions, and type
    
*   **Quality optimization** with configurable compression
    
*   **Multiple format support** (JPG, PNG, GIF, WebP, SVG)
    
*   **Batch downloading** with progress tracking
    

### 🗂️ **Organization**

*   **Automatic categorization** (path-based, page-based, domain-based)
    
*   **Structured folder hierarchy**: site/category/images/
    
*   **Comprehensive metadata** collection
    
*   **Manifest generation** with crawl statistics
    
*   **Export options** (JSON, ZIP, individual categories)
    

### 🔧 **Advanced Features**

*   **Proxy support** with rotation and health checking
    
*   **Distributed crawling** across multiple workers
    
*   **RESTful API** for integration
    
*   **Real-time progress monitoring**
    
*   **Configurable request headers** and user agents
    

### 🎨 **User Interface**

*   **Modern, responsive design** with dark mode
    
*   **Real-time statistics** and progress bars
    
*   **Image preview** with thumbnails
    
*   **Advanced filtering** and search options
    
*   **Keyboard shortcuts** for power users
    
*   **Export and download management**
    

📋 Prerequisites
----------------

*   **Node.js** 18.0.0 or higher
    
*   **npm** 8.0.0 or higher
    
*   **Redis** (optional, for distributed crawling)
    
*   **MongoDB** (optional, for history storage)
    

🚀 Installation
---------------

### Method 1: Quick Start (Development)

```
# Clone the repository
git clone https://github.com/yourusername/image-crawler.git
cd image-crawler

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
# (Frontend uses CDN for libraries, no npm install needed)

# Start the backend server
cd ../backend
npm start

# Open frontend/index.html in your browser
```

### Method 2: Docker Deployment (Production)
```
# Build and start all services
docker-compose -f docker/docker-compose.yml up --build -d

# Check logs
docker-compose logs -f

# Access the application at http://localhost:3000
```

### Method 3: Manual Setup with Redis and MongoDB
```
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start MongoDB
docker run -d -p 27017:27017 mongo:6

# Install and configure backend
cd backend
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your settings
nano .env

# Start the server
npm start
```

⚙️ Configuration
----------------

### Environment Variables (.env)

```
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
CORS_CREDENTIALS=false

# Crawler Configuration
MAX_CRAWL_DEPTH=3
MAX_PAGES=100
MAX_WORKERS=4
REQUEST_TIMEOUT=10000
CONCURRENT_REQUESTS=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Proxy Configuration
USE_PROXY=false
PROXY_LIST=http://proxy1:8080,http://proxy2:8080
PROXY_ROTATION_INTERVAL=10000

# Database
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/imagecrawler

# Security
API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-key-here

# Storage
MAX_ZIP_SIZE_MB=100
TEMP_DIR=./temp
```

### Frontend Settings

Settings are stored in browser localStorage and can be accessed through the Settings modal:

*   Advanced Crawling options
    
*   Proxy configuration
    
*   Rate limiting
    
*   Image filtering preferences
    
*   Download options
    

🎮 Usage
--------

### Web Interface

1.  **Start Crawling**
    
    *   Enter a URL in the input field
        
    *   Configure options (depth, filters, etc.)
        
    *   Click "Start Crawling" or press Ctrl+Enter
        
2.  **Monitor Progress**
    
    *   Real-time progress bar
        
    *   Image count and statistics
        
    *   Current page being crawled
        
    *   Speed and ETA estimates
        
3.  **Download Images**
    
    *   **All Site Images**: Download everything as a single ZIP
        
    *   **All Categories**: Download each category separately
        
    *   **By Page**: Download images organized by source page
        
    *   **Selected Only**: Manually select specific images
        
4.  **Export Data**
    
    *   Export crawl metadata as JSON
        
    *   Export activity logs
        
    *   Save configurations as presets
        

### API Usage

The crawler provides a RESTful API at /api:

```
// Example API calls
const API_BASE = 'http://localhost:3000/api';

// Start a crawl
const response = await fetch(`${API_BASE}/crawl`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({
        url: 'https://example.com',
        options: {
            maxDepth: 3,
            distributed: true,
            useProxy: true
        }
    })
});

// Get task status
const task = await fetch(`${API_BASE}/tasks/${taskId}`);

// Download results
const download = await fetch(`${API_BASE}/download/all`, {
    method: 'POST',
    headers: { 'X-API-Key': 'your-api-key' }
});
```

### Command Line

```
# Using curl
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"url": "https://example.com"}'

# Download results
curl -X POST http://localhost:3000/api/download/all \
  -H "X-API-Key: your-key" \
  --output images.zip
```

🗂️ Project Structure
---------------------

```
image-crawler/
├── frontend/                 # Frontend application
│   ├── index.html           # Main HTML file
│   ├── style.css            # Complete CSS styles
│   └── script.js            # Main JavaScript application
├── backend/                  # Backend server
│   ├── server.js            # Express server setup
│   ├── crawler.js           # Main crawler logic
│   ├── proxy-manager.js     # Proxy management
│   ├── cluster-manager.js   # Distributed crawling
│   ├── api-routes.js        # REST API routes
│   ├── config.js            # Configuration loader
│   └── package.json         # Node.js dependencies
├── docker/                  # Docker configuration
│   ├── Dockerfile          # Application Dockerfile
│   ├── docker-compose.yml  # Multi-service setup
│   └── nginx/              # Nginx configuration
├── data/                   # Persistent data storage
├── temp/                  # Temporary files
└── ssl/                   # SSL certificates
```

🔧 Advanced Configuration
-------------------------

### Proxy Setup

1.  **Enable proxies** in settings or .env file
    
2.  **Add proxy list** (one per line):

```
http://user:pass@proxy1:8080
socks5://proxy2:1080
http://proxy3:3128
```
    
3.  **Configure rotation** interval (default: 10 seconds)
    
4.  **Test proxies** using the built-in testing tool
    

### Distributed Crawling

1.  **Enable distributed mode** in settings
    
2.  **Configure Redis** connection in .env
    
3.  **Set worker count** based on available CPUs
    
4.  **Monitor cluster status** in the UI
    

### Image Filtering

Configure filters in the UI or API:

*   **Minimum dimensions**: Filter small images
    
*   **Maximum file size**: Prevent downloading large files
    
*   **Image types**: Select which formats to download
    
*   **Quality optimization**: Reduce file size with compression
    
*   **Duplicate detection**: Skip identical images
    

📊 Monitoring
-------------

### Health Checks
```
# Check API health
curl http://localhost:3000/api/health

# Check Redis
redis-cli ping

# Check MongoDB
mongosh --eval "db.runCommand({ping:1})"
```

### Logs

```
# View application logs
pm2 logs image-crawler  # if using PM2

# View Docker logs
docker-compose logs -f

# Access Redis logs
docker logs crawler-redis
```

### Metrics

The application provides:

*   Real-time crawling statistics
    
*   Memory usage monitoring
    
*   Request rate tracking
    
*   Error rates and retry counts
    
*   Proxy health status
    

🛡️ Security Considerations
---------------------------

1.  **Rate Limiting**: Prevents abuse and IP blocking
    
2.  **CORS Configuration**: Restrict API access to trusted origins
    
3.  **API Authentication**: Optional API key protection
    
4.  **Input Validation**: Sanitize all URLs and parameters
    
5.  **Request Timeouts**: Prevent hanging connections
    
6.  **Memory Limits**: Protect against memory exhaustion
    
7.  **File Size Limits**: Prevent large file downloads
    

🔄 Performance Optimization
---------------------------

### Tuning Options

1.  **Concurrent Requests**: Adjust based on target site tolerance
    
2.  **Request Delay**: Add delays between requests
    
3.  **Worker Count**: Scale based on CPU cores
    
4.  **Cache Settings**: Configure Redis TTL and memory limits
    
5.  **Image Processing**: Adjust quality and compression settings
    

### Recommended Settings

*   **Small sites**: 5 concurrent requests, 100ms delay
    
*   **Medium sites**: 3 concurrent requests, 200ms delay
    
*   **Large sites**: 2 concurrent requests, 500ms delay
    
*   **API-heavy sites**: 1 concurrent request, 1000ms delay
    

🚨 Troubleshooting
------------------

### Common Issues

1.  **CORS errors**

```
// Check CORS configuration in .env
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```
    
2.  **Rate Limiting Issues**
    
    *   Reduce CONCURRENT\_REQUESTS
        
    *   Increase REQUEST\_DELAY
        
    *   Check target site's robots.txt
        
3.  **Memory Issues**
    
    *   Reduce MAX\_PAGES
        
    *   Increase REQUEST\_TIMEOUT
        
    *   Enable distributed crawling
        
4.  **Proxy Issues**
    
    *   Test proxies individually
        
    *   Check authentication credentials
        
    *   Verify network connectivity
        

### Debug Mode

Enable debug logging in settings or .env:

```
NODE_ENV=development
DEBUG=crawler*
```

📈 Scaling
----------

### Vertical Scaling

*   Increase MAX\_WORKERS based on CPU cores
    
*   Adjust CONCURRENT\_REQUESTS per worker
    
*   Configure Redis memory limits
    

### Horizontal Scaling

1.  Deploy multiple backend instances
    
2.  Use load balancer (Nginx configuration provided)
    
3.  Configure shared Redis instance
    
4.  Set up MongoDB replica set
    

### Load Balancing

```
# Example Nginx configuration
upstream backend {
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
```
🤝 Contributing
---------------

1.  **Fork the repository**
    
2.  **Create a feature branch**
```
git checkout -b feature/amazing-feature
```
    
3.  **Commit your changes**
```
git commit -m 'Add amazing feature'
```
4.  **Push to the branch**
```
git push origin feature/amazing-feature
``` 
5.  **Open a Pull Request**
    

### Development Guidelines

*   Follow existing code style
    
*   Add tests for new features
    
*   Update documentation
    
*   Ensure backward compatibility
    

📄 License
----------

This project is licensed under the MIT License - see the [LICENSE](https://LICENSE) file for details.

🙏 Acknowledgments
------------------

*   **cheerio** for HTML parsing
    
*   **sharp** for image processing
    
*   **axios** for HTTP requests
    
*   **JSZip** for archive creation
    
*   **Express** for the web server
    
*   **All contributors** and users
    

📞 Support
----------

*   **Issues**: [GitHub Issues](https://github.com/yourusername/image-crawler/issues)
    
*   **Documentation**: [Wiki](https://github.com/yourusername/image-crawler/wiki)
    
*   **Email**: support@example.com
    

🚀 Roadmap
----------

*   Browser extension
    
*   Scheduled crawling
    
*   Cloud storage integration
    
*   Machine learning for image categorization
    
*   Video frame extraction
    
*   PDF content extraction
    
*   API rate limit analytics
    
*   Mobile application
    

**⭐ Star this repository if you find it useful!**

**🐛 Found a bug?** Please open an issue on GitHub.

**💡 Have a feature request?** We'd love to hear your ideas!

_Built with ❤️ for developers and content creators_