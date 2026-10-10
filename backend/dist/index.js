"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
exports.prisma = new client_1.PrismaClient();
// Middleware
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Basic API route
app.get('/api', (req, res) => {
    res.json({ message: 'Aureum API is running!' });
});
// Health check
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await exports.prisma.user.count();
        res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), database: 'connected' });
    }
    catch (error) {
        res.status(500).json({ status: 'ERROR', message: 'Database connection failed', error: error.message });
    }
});
// Get all users (for testing)
app.get('/api/users', async (req, res) => {
    try {
        const users = await exports.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Create a user (for testing)
app.post('/api/users', async (req, res) => {
    try {
        const { email, name, role, password } = req.body;
        if (!email || !name) {
            return res.status(400).json({ error: 'Email and name are required' });
        }
        const user = await exports.prisma.user.create({
            data: {
                email,
                name,
                role: role || 'VIEWER',
                password: password || '',
            },
        });
        // Remove sensitive fields before sending response
        const { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt } = user;
        res.status(201).json({ id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});
// Get all artworks (for testing)
app.get('/api/artworks', async (req, res) => {
    try {
        const artworks = await exports.prisma.artwork.findMany({
            select: {
                id: true,
                title: true,
                artist: true,
                status: true,
                createdAt: true,
            },
        });
        res.json(artworks);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch artworks' });
    }
});
// Create an artwork (for testing)
app.post('/api/artworks', async (req, res) => {
    try {
        const { title, artist, year, medium, dimensions, ownerId } = req.body;
        if (!title || !artist || !ownerId) {
            return res.status(400).json({ error: 'Title, artist, and ownerId are required' });
        }
        const artwork = await exports.prisma.artwork.create({
            data: {
                title,
                artist,
                year: year || undefined,
                medium: medium || '',
                dimensions: dimensions || '',
                metadataCid: 'QmExampleCid',
                imageCids: '[]',
                documentCids: '[]',
                bindingReference: '',
                status: 'VERIFIED',
                ownerId,
            },
        });
        res.status(201).json(artwork);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create artwork' });
    }
});
// Get all transfers (for testing)
app.get('/api/transfers', async (req, res) => {
    try {
        const transfers = await exports.prisma.transfer.findMany({
            select: {
                id: true,
                artworkId: true,
                sellerId: true,
                buyerId: true,
                transferDate: true,
                priceVisibility: true,
                status: true,
                createdAt: true,
            },
        });
        res.json(transfers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transfers' });
    }
});
// Create a transfer (for testing)
app.post('/api/transfers', async (req, res) => {
    try {
        const { artworkId, sellerId, buyerId, transferDate, priceVisibility, txHash, blockNumber } = req.body;
        if (!artworkId || !sellerId || !transferDate) {
            return res.status(400).json({ error: 'Artwork ID, seller ID, and transfer date are required' });
        }
        const transfer = await exports.prisma.transfer.create({
            data: {
                artworkId,
                sellerId,
                buyerId: buyerId || null,
                transferDate: new Date(transferDate),
                priceVisibility: priceVisibility || 'PARTIES_AND_AUTHORISED',
                txHash: txHash || '0x' + '0'.repeat(64),
                blockNumber: blockNumber || 0,
                status: 'FINALIZED',
            },
        });
        res.status(201).json(transfer);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create transfer' });
    }
});
// Get a specific artwork by ID (for verification)
app.get('/api/artworks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const artwork = await exports.prisma.artwork.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                artist: true,
                year: true,
                medium: true,
                dimensions: true,
                metadataCid: true,
                imageCids: true,
                documentCids: true,
                bindingReference: true,
                status: true,
                ownerId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!artwork) {
            return res.status(404).json({ error: 'Artwork not found' });
        }
        res.json(artwork);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch artwork' });
    }
});
// Get transfers for a specific artwork (for verification)
app.get('/api/artworks/:artworkId/transfers', async (req, res) => {
    try {
        const { artworkId } = req.params;
        const transfers = await exports.prisma.transfer.findMany({
            where: { artworkId },
            select: {
                id: true,
                artworkId: true,
                sellerId: true,
                buyerId: true,
                transferDate: true,
                priceVisibility: true,
                txHash: true,
                blockNumber: true,
                status: true,
                createdAt: true,
            },
            orderBy: { transferDate: 'desc' },
        });
        res.json(transfers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transfers for artwork' });
    }
});
// Serve frontend static assets in production or when dist exists
const frontendDistPath = path_1.default.resolve(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDistPath)) {
    app.use(express_1.default.static(frontendDistPath));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api') || req.path === '/health') {
            return res.status(404).json({ error: 'Endpoint not found' });
        }
        res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
    });
}
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map