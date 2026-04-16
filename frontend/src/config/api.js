import { API_URL, SOCKET_URL } from './api';
// Production-Ready API Configuration for Sentinel QA
const API_URL = import.meta.env.VITE_API_URL || `${API_URL}`;

// Handle Protocol mapping for Sockets (http -> http, https -> https)
const SOCKET_URL = API_URL.replace(/\/api$/, '');

export { API_URL, SOCKET_URL };
