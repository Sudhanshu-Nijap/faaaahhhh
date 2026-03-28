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
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Simple request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('DB Error:', err));

// Routes
const scanRoutes = require('./routes/scanRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

// --- CRITICAL DISPATCH OVERRIDE (MOUNTED FIRST TO PREVENT 404) ---
app.post('/api/pulse', async (req, res) => {
    try {
        const { reportId } = req.body;
        const ScanReport = require('./models/ScanReport');
        const reportExporter = require('./services/reportExporter');
        const fs = require('fs');

        const report = await ScanReport.findById(reportId);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        
        const targetWebhook = process.env.DISCORD_WEBHOOK_URL;
        if (!targetWebhook) return res.status(400).json({ error: 'Webhook missing' });

        // 1. Generate Latest PDF Snapshot
        console.log(`[Pulse]: Generating PDF for ${reportId}...`);
        const pdfUrl = await reportExporter.generatePDF(reportId);
        const pdfPath = path.join(__dirname, pdfUrl);

        if (!fs.existsSync(pdfPath)) {
            throw new Error('PDF Generation failed: File not found.');
        }

        const hostname = new URL(report.url).hostname;

        // 2. Prepare Webhook Payload
        const embed = {
            title: `🛡️ Sentinel AI Dispatch: ${hostname}`,
            url: `http://localhost:5173/report/${report._id}`,
            description: `Neural analysis complete for **${report.url}**`,
            color: 0xFF007F,
            fields: [
                { name: '❤️ Health Score', value: `${report.healthScore || 'N/A'}`, inline: true },
                { name: '📄 Nodes Scanned', value: `${report.pagesCrawled || 1}`, inline: true },
                { name: '🚨 Findings', value: `${(report.brokenLinks?.length || 0) + (report.consoleErrors?.length || 0)} Anomalies`, inline: true }
            ],
            footer: { text: 'Sentinel Pulse Pipeline' },
            timestamp: new Date()
        };

        // 3. Dispatch Multipart Payload via Native Fetch (Node v22+)
        const { Blob } = require('buffer');
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify({
            content: `⚡ **Dispatch Received:** Tactical report for **${hostname}** ready for review.\n🔗 [Direct Link](http://localhost:5173/report/${report._id})`,
            embeds: [embed]
        }));
        
        const pdfBuffer = fs.readFileSync(pdfPath);
        formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), `Sentinel-Report-${hostname}.pdf`);

        console.log(`[Pulse]: Dispatching to Discord...`);
        const response = await fetch(targetWebhook, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Discord API Rejected Dispatch: ${response.status} ${errBody}`);
        }

        res.json({ message: 'Neural Pulse & PDF Dispatched Successfully.' });
    } catch (e) {
        console.error('[Pulse Critical Failure]:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.use('/api', scanRoutes.router);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);


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
    server.listen(PORT, () => {
        console.log(`Sentinel Server Active on Port ${PORT}`);
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
