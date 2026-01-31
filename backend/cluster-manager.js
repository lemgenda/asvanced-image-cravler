const cluster = require('cluster');
const os = require('os');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

class ClusterManager {
    constructor() {
        this.isMaster = cluster.isMaster;
        this.workers = new Map();
        this.taskQueue = [];
        this.results = new Map();
        this.redis = null;
        
        if (this.isMaster) {
            this.initRedis();
            this.setupMaster();
        } else {
            this.setupWorker();
        }
    }

    async initRedis() {
        if (config.REDIS_URL) {
            this.redis = new Redis(config.REDIS_URL);
            
            this.redis.on('error', (error) => {
                console.error('Redis connection error:', error);
            });
            
            this.redis.on('connect', () => {
                console.log('Connected to Redis');
            });
        }
    }

    setupMaster() {
        const numWorkers = Math.min(os.cpus().length, config.MAX_WORKERS);
        console.log(`Master process ${process.pid} starting ${numWorkers} workers`);
        
        // Fork workers
        for (let i = 0; i < numWorkers; i++) {
            this.forkWorker();
        }
        
        // Handle worker events
        cluster.on('exit', (worker, code, signal) => {
            console.log(`Worker ${worker.process.pid} died`);
            this.workers.delete(worker.id);
            
            // Restart worker
            setTimeout(() => {
                this.forkWorker();
            }, 1000);
        });
        
        // Handle messages from workers
        cluster.on('message', (worker, message) => {
            this.handleWorkerMessage(worker, message);
        });
    }

    forkWorker() {
        const worker = cluster.fork();
        this.workers.set(worker.id, {
            pid: worker.process.pid,
            id: worker.id,
            busy: false,
            currentTask: null
        });
        
        worker.on('message', (message) => {
            this.handleWorkerMessage(worker, message);
        });
        
        return worker;
    }

    setupWorker() {
        console.log(`Worker ${process.pid} started`);
        
        // Listen for messages from master
        process.on('message', async (message) => {
            await this.handleMasterMessage(message);
        });
    }

    async handleWorkerMessage(worker, message) {
        switch (message.type) {
            case 'task_started':
                this.updateWorkerStatus(worker.id, true, message.taskId);
                break;
                
            case 'task_completed':
                this.updateWorkerStatus(worker.id, false, null);
                this.storeResult(message.taskId, message.result);
                break;
                
            case 'task_failed':
                this.updateWorkerStatus(worker.id, false, null);
                this.storeResult(message.taskId, { error: message.error });
                break;
                
            case 'progress':
                this.broadcastProgress(message.taskId, message.progress);
                break;
        }
    }

    async handleMasterMessage(message) {
        switch (message.type) {
            case 'start_task':
                try {
                    const { ImageCrawler } = require('./crawler');
                    const crawler = new ImageCrawler(message.options);
                    
                    process.send({
                        type: 'task_started',
                        taskId: message.taskId
                    });
                    
                    const result = await crawler.crawl(message.url);
                    
                    process.send({
                        type: 'task_completed',
                        taskId: message.taskId,
                        result: result
                    });
                } catch (error) {
                    process.send({
                        type: 'task_failed',
                        taskId: message.taskId,
                        error: error.message
                    });
                }
                break;
        }
    }

    updateWorkerStatus(workerId, busy, taskId) {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.busy = busy;
            worker.currentTask = taskId;
        }
    }

    storeResult(taskId, result) {
        this.results.set(taskId, result);
        
        // Also store in Redis for persistence
        if (this.redis) {
            this.redis.setex(`task:${taskId}`, 3600, JSON.stringify(result));
        }
    }

    async getResult(taskId) {
        // Check memory cache first
        if (this.results.has(taskId)) {
            return this.results.get(taskId);
        }
        
        // Check Redis
        if (this.redis) {
            const result = await this.redis.get(`task:${taskId}`);
            if (result) {
                return JSON.parse(result);
            }
        }
        
        return null;
    }

    broadcastProgress(taskId, progress) {
        // Broadcast progress to all connected clients via WebSocket
        // This would be handled by your WebSocket server
        console.log(`Task ${taskId} progress: ${progress}%`);
    }

    async distributeTask(url, options) {
        const taskId = uuidv4();
        
        // Find an available worker
        let availableWorker = null;
        for (const [workerId, workerInfo] of this.workers.entries()) {
            if (!workerInfo.busy) {
                availableWorker = cluster.workers[workerId];
                break;
            }
        }
        
        if (!availableWorker) {
            throw new Error('No available workers');
        }
        
        // Send task to worker
        availableWorker.send({
            type: 'start_task',
            taskId: taskId,
            url: url,
            options: options
        });
        
        return taskId;
    }

    async distributeBatchTasks(urls, options) {
        const taskIds = [];
        
        for (const url of urls) {
            try {
                const taskId = await this.distributeTask(url, options);
                taskIds.push(taskId);
            } catch (error) {
                console.error(`Failed to distribute task for ${url}:`, error);
            }
        }
        
        return taskIds;
    }

    getWorkerStats() {
        const stats = {
            totalWorkers: this.workers.size,
            busyWorkers: Array.from(this.workers.values()).filter(w => w.busy).length,
            idleWorkers: Array.from(this.workers.values()).filter(w => !w.busy).length,
            workers: Array.from(this.workers.values()).map(worker => ({
                id: worker.id,
                pid: worker.pid,
                busy: worker.busy,
                currentTask: worker.currentTask
            }))
        };
        
        return stats;
    }

    async getClusterStats() {
        const stats = {
            master: {
                pid: process.pid,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            },
            workers: this.getWorkerStats(),
            tasks: {
                pending: this.taskQueue.length,
                completed: this.results.size
            }
        };
        
        if (this.redis) {
            const redisInfo = await this.redis.info();
            stats.redis = {
                connected: true,
                memory: redisInfo.split('\n').find(line => line.startsWith('used_memory_human')),
                keys: await this.redis.dbsize()
            };
        }
        
        return stats;
    }
}

module.exports = { ClusterManager };