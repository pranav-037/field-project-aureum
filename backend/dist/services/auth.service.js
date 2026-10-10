"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const index_1 = require("../index");
const jsonwebtoken_1 = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || 'aureum-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
class AuthService {
    // In a real app, we would hash passwords. For this basic app, we'll store them plainly
    // but this is ONLY for demonstration - NEVER do this in production!
    static async register(email, password, name, role = 'VIEWER') {
        // Check if user already exists
        const existingUser = await index_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        // Create user
        const user = await index_1.prisma.user.create({
            data: {
                email,
                name,
                role,
                password: password || '',
            },
        });
        // Generate JWT token
        const token = (0, jsonwebtoken_1.sign)({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Return user without password
        const { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt } = user;
        return {
            token,
            user: { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt }
        };
    }
    static async login(email, password) {
        // Find user by email
        const user = await index_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        // Generate JWT token
        const token = (0, jsonwebtoken_1.sign)({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Return user without password
        const { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt } = user;
        return {
            token,
            user: { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt }
        };
    }
    static verifyToken(token) {
        try {
            const decoded = (0, jsonwebtoken_1.verify)(token, JWT_SECRET);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map