const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

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
