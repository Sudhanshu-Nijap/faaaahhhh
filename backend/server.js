const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config({ path: path.join(__dirname, '.env') });

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
app.use('/api/vision', require('./routes/visionRoutes'));
app.use('/api/notify', require('./routes/notificationRoutes'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Global Socket Instance
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

server.listen(PORT, () => {
    console.log(`Sentinel Server Active on Port ${PORT}`);
});
