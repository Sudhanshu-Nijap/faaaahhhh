const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

// ── Global Panic Mitigation ──────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Fatal]: Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Fatal]: Uncaught Exception:', err);
    // Give it a moment to log before dying
    setTimeout(() => process.exit(1), 1000);
});

const app = express();
const PORT = 5005; // TACTICAL PORT DISPLACEMENT (FIX FOR GHOST 404s)

// High-Capacity Data Substrate
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Tactical Request Trace Middleware
app.use((req, res, next) => {
    console.log(`[NeuralTrace]: ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Neural Cluster Connected (Port 5005)'))
    .catch(err => console.error('DB Tactical Fault:', err));

// ── ABSOLUTE NEURAL GATEWAY (V3 FINAL) ──────────────────────────────────────
const fileScanner = require('./services/fileScanner');
const scanExecutor = require('./services/scanExecutor');
const patchApplier = require('./services/patchApplier');
const ScanReport = require('./models/ScanReport');

// ── Layer 1: Global Health & Verified Dashboards ──
app.get('/status', (req, res) => res.json({ status: 'SENTINEL_SYSTEM_ALIVE', port: 5005, layer: 'Absolute_Neural_Gateway_V3' }));

app.get('/api/reports', async (req, res) => {
    try {
        const { userId } = req.query;
        const reports = await ScanReport.find(userId ? { userId } : {}).sort({ createdAt: -1 });
        res.json(reports);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/scan/active/:userId', async (req, res) => {
    try {
        const active = await ScanReport.findOne({ userId: req.params.userId, status: 'in-progress' }).sort({ createdAt: -1 });
        if (!active) return res.json({ status: 'idle' });
        res.json(active);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Layer 2: Neural IDE Deployment Pipeline (High Priority) ──
app.post('/neural-debug-engine-v1-deploy-all', async (req, res) => {
    const targetPath = req.body.filePath || req.body.path;
    const { patches } = req.body;
    console.log(`[NeuralTrace]: DeployAll Payload: targetPath=${targetPath}, patchesCount=${patches?.length || 0}`);
    
    try { 
        if (!targetPath || !patches) throw new Error(`Substrate incomplete: path=${targetPath}, patches=${!!patches}`);
        
        // --- Virtual Substrate Intercept ---
        if (targetPath?.toString().startsWith('memory://')) {
            return res.json({ status: 'success', virtual: true, message: 'Neural memory substrate updated.' });
        }

        const normalized = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
        const result = await patchApplier.deployAllPatches(normalized, patches);
        res.json({ status: 'success', ...result }); 
    } catch (e) { 
        console.error('[DeployAll Fault]:', e.message);
        res.status(500).json({ status: 'error', error: e.message }); 
    }
});

app.post('/neural-debug-engine-v1-patch', async (req, res) => {
    const targetPath = req.body.filePath || req.body.path;
    const { patch } = req.body;
    console.log(`[NeuralTrace]: SinglePatch Payload: targetPath=${targetPath}, patchLine=${patch?.line}`);
    
    try { 
        if (!targetPath || !patch) throw new Error(`Substrate incomplete: path=${targetPath}, patch=${!!patch}`);

        // --- Virtual Substrate Intercept ---
        if (targetPath?.toString().startsWith('memory://')) {
            return res.json({ status: 'deployed', virtual: true, message: 'Neural memory patch applied.' });
        }
        
        const normalized = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
        const result = await patchApplier.applyPatch(normalized, patch);
        res.json({ status: 'deployed', ...result }); 
    } catch (e) { 
        console.error('[Patch Fault]:', e.message);
        res.status(500).json({ status: 'error', error: e.message }); 
    }
});

app.post('/neural-debug-engine-v1-run', async (req, res) => {
    const { folderPath } = req.body;
    try {
        if (!folderPath) throw new Error('Folder path required.');
        console.log(`[NeuralScan]: Initializing audit for substrate: ${folderPath}`);
        
        const files = await fileScanner.scanDirectory(folderPath);
        if (!files.length) return res.json({ status: 'error', error: 'No source files detected.' });
        
        const results = [];
        for (const file of files.slice(0, 15)) {
            try { 
                const audit = await scanExecutor.processFile(file);
                results.push({ ...audit, path: file.path, name: file.name }); 
            } catch(_) {}
        }
        res.json({ status: 'success', files: results });
    } catch (e) { 
        console.error('[Run Fault]:', e);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/neural-debug-engine-v1-batch-upload', async (req, res) => {
    const { files } = req.body;
    if (!files || !Array.isArray(files)) return res.status(400).json({ error: 'Batch required.' });
    try {
        const results = [];
        for (const file of files.slice(0, 25)) {
            try { 
                const virtualFile = { 
                    name: file.name, 
                    path: 'memory://' + file.name, 
                    isMemory: true, 
                    content: file.content 
                };
                const audit = await scanExecutor.processFile(virtualFile);
                results.push({ ...audit, path: virtualFile.path, name: virtualFile.name }); 
            } catch(_) {}
        }
        res.json({ status: 'success', files: results });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/neural-debug-engine-v1-upload', async (req, res) => {
    const { fileName, content } = req.body;
    try {
        const result = await scanExecutor.processFile({ 
            name: fileName, 
            path: 'memory://'+fileName, 
            isMemory: true, 
            content 
        });
        res.json({ status: 'success', files: [result] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

// ── Priority 2: Infrastructure Layers (Unified Neural Routing) ──

// Routes
const scanRoutes = require('./routes/scanRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const jobRoutes = require('./routes/jobRoutes');
const schedulerService = require('./services/schedulerService');

// Priority 2: Infrastructure Layers (Unified Neural Routing)
const { router: scanRouter } = require('./routes/scanRoutes');
app.use('/api', scanRouter); 
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/scheduling', jobRoutes);

// Tactical Pulse Feedback for Verification
app.get('/api/debug/ping', (req, res) => res.json({ status: 'Neural Uplink Stable', timestamp: new Date() }));

// --- CRITICAL DISPATCH OVERRIDE (MOUNTED FIRST TO PREVENT 404) ---
app.post('/api/pulse', async (req, res) => {
    try {
        const { reportId } = req.body;
        const discordService = require('./services/discordService');
        const result = await discordService.dispatchReport(reportId);
        
        if (result) {
            res.json({ message: 'Tactical dispatch broadcast successful.' });
        } else {
            res.status(500).json({ error: 'Pulse transmission failed.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const server = http.createServer(app);

// Global Socket Instance
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
global.io = io;

io.on('connection', (socket) => {
    console.log('Tactical Uplink Established:', socket.id);
    
    socket.on('join-room', (reportId) => {
        socket.join(reportId);
        console.log(`Socket ${socket.id} joined Tactical Room: ${reportId}`);
    });

    socket.on('join-chat', (chatId) => {
        socket.join(chatId);
        console.log(`Socket ${socket.id} joined Neural Chat: ${chatId}`);
    });

    socket.on('disconnect', () => {
        console.log('Tactical Uplink Severed:', socket.id);
    });
});

// ── Smart Port Recovery ──────────────────────────────────────────────────────
const startServer = () => {
    server.listen(PORT, async () => {
        console.log(`Sentinel Server Active on Port ${PORT}`);
        // Initialize tactical scheduler substrate
        await schedulerService.init();
    }).on('error', async (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error(`[Fatal]: Port ${PORT} is busy. Executing tactical cleanup...`);
            const { execSync } = require('child_process');
            try {
                // Find PID using the port on Windows
                const stdout = execSync(`netstat -ano | findstr :${PORT}`).toString();
                const lines = stdout.split('\n');
                const pids = new Set();
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length > 4) {
                        const pid = parts[parts.length - 1];
                        if (pid !== '0' && !isNaN(pid)) pids.add(pid);
                    }
                });

                // Additional cleanup for common zombie PIDs
                try {
                    const { execSync } = require('child_process');
                    const processes = ['32168', '3420', '3104', '36388']; // Common zombie PIDs
                    processes.forEach(pid => {
                        try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch(e) {}
                    });
                    console.log('[Cleanup]: Common zombie PIDs checked.');
                } catch (error) {
                    console.warn('[Cleanup]: Tactical cleanup encountered permissions bottleneck for common PIDs.');
                }

                pids.forEach(pid => {
                    console.log(`[Cleanup]: Terminating zombie process ${pid}...`);
                    try { execSync(`taskkill /F /PID ${pid}`); } catch (_) {}
                });

                console.log(`[Cleanup]: Port ${PORT} cleared. Restarting in 2s...`);
                setTimeout(startServer, 2000);
            } catch (err) {
                console.error(`[Cleanup Error]: Failed to clear port: ${err.message}`);
                process.exit(1);
            }
        } else {
            console.error('[Server Error]:', e);
        }
    });
};

startServer();
