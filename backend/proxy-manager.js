const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const config = require('./config');

class ProxyManager {
    constructor() {
        this.proxies = config.PROXY_LIST;
        this.currentProxyIndex = 0;
        this.proxyStats = new Map();
        this.blacklist = new Set();
        this.rotationInterval = config.PROXY_ROTATION_INTERVAL;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
    }

    getCurrentProxy() {
        if (!config.USE_PROXY || this.proxies.length === 0) {
            return null;
        }
        
        // Skip blacklisted proxies
        let attempts = 0;
        while (this.blacklist.has(this.proxies[this.currentProxyIndex]) && attempts < this.proxies.length) {
            this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
            attempts++;
        }
        
        return this.proxies[this.currentProxyIndex];
    }

    rotateProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    }

    blacklistProxy(proxyUrl) {
        this.blacklist.add(proxyUrl);
        console.log(`Proxy blacklisted: ${proxyUrl}`);
    }

    markProxySuccess(proxyUrl) {
        const stats = this.proxyStats.get(proxyUrl) || { successes: 0, failures: 0 };
        stats.successes++;
        this.proxyStats.set(proxyUrl, stats);
    }

    markProxyFailure(proxyUrl) {
        const stats = this.proxyStats.get(proxyUrl) || { successes: 0, failures: 0 };
        stats.failures++;
        this.proxyStats.set(proxyUrl, stats);
        
        if (stats.failures > 3) {
            this.blacklistProxy(proxyUrl);
        }
    }

    createAgent(proxyUrl) {
        if (!proxyUrl) return null;
        
        try {
            if (proxyUrl.startsWith('socks')) {
                return new SocksProxyAgent(proxyUrl);
            } else {
                return new HttpsProxyAgent(proxyUrl);
            }
        } catch (error) {
            console.error(`Error creating proxy agent for ${proxyUrl}:`, error);
            return null;
        }
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async testProxy(proxyUrl) {
        try {
            const agent = this.createAgent(proxyUrl);
            const response = await axios.get('https://httpbin.org/ip', {
                httpsAgent: agent,
                timeout: 5000
            });
            
            console.log(`Proxy ${proxyUrl} test successful:`, response.data);
            return true;
        } catch (error) {
            console.log(`Proxy ${proxyUrl} test failed:`, error.message);
            return false;
        }
    }

    async testAllProxies() {
        console.log('Testing all proxies...');
        const results = [];
        
        for (const proxy of this.proxies) {
            const isWorking = await this.testProxy(proxy);
            results.push({ proxy, isWorking });
            
            if (!isWorking) {
                this.blacklist.add(proxy);
            }
        }
        
        return results;
    }

    getProxyStats() {
        const stats = [];
        for (const [proxy, data] of this.proxyStats.entries()) {
            stats.push({
                proxy,
                successes: data.successes,
                failures: data.failures,
                successRate: data.successes + data.failures > 0 
                    ? (data.successes / (data.successes + data.failures) * 100).toFixed(2) 
                    : 0,
                isBlacklisted: this.blacklist.has(proxy)
            });
        }
        return stats;
    }

    clearBlacklist() {
        this.blacklist.clear();
        console.log('Proxy blacklist cleared');
    }
}

module.exports = { ProxyManager };