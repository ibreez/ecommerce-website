Electronics E-commerce Backend API
A comprehensive Node.js + Express.js backend for an electronics e-commerce platform with MySQL database integration.

Features
Authentication & Authorization: JWT-based auth with role management (user/admin/superadmin)
Product Management: Full CRUD operations with categories, images, and inventory
Order Processing: Complete order lifecycle with COD and bank transfer support
File Uploads: Product images and payment receipt handling with Multer
Review System: Product reviews with admin approval workflow
Settings Management: Configurable Telegram bot and email settings
Security: Helmet, rate limiting, input validation, and secure file handling
Quick Start
Setup Environment:

cp .env.example .env
# Edit .env with your database and configuration details
Install Dependencies:

npm install
Setup Database:

Create MySQL database
Run the schema from ../database/schema.sql
Start Server:

# Development
npm run dev

# Production
npm start
API Endpoints
Authentication (/api/auth)
POST /register - Register new user
POST /login - User login
GET /profile - Get user profile (protected)
POST /admin/create - Create admin user (admin/superadmin only)
GET /admin/list - List admin users (superadmin only)
DELETE /admin/:id - Delete admin user (superadmin only)
Categories (/api/categories)
GET / - List categories (public)
GET /:id - Get category by ID (public)
POST / - Create category (admin only)
PUT /:id - Update category (admin only)
DELETE /:id - Delete category (admin only)
Products (/api/products)
GET / - List products with filters (public)
GET /:id - Get product by ID (public)
GET /admin/list - List all products for admin (admin only)
POST / - Create product (admin only)
PUT /:id - Update product (admin only)
DELETE /:id - Delete product (admin only)
Orders (/api/orders)
POST / - Place new order (user)
GET /my-orders - Get user’s orders (user)
GET /:id - Get order details (user/admin)
GET /admin/list - List all orders (admin only)
PUT /:id/status - Update order status (admin only)
Receipts (/api/receipts)
POST /upload - Upload receipt for order (user)
GET /order/:order_id - Get receipts for order (user/admin)
DELETE /:id - Delete receipt (admin only)
Reviews (/api/reviews)
GET /product/:product_id - Get product reviews (public)
POST / - Add review (user)
GET /admin/list - List all reviews (admin only)
PUT /:id/approval - Approve/disapprove review (admin only)
DELETE /:id - Delete review (admin only)
Settings (/api/settings)
GET / - Get all settings (admin only)
PUT / - Update settings (admin only)
GET /telegram - Get Telegram settings (admin only)
PUT /telegram - Update Telegram settings (admin only)
File Upload Structure
uploads/
├── products/     # Product images
└── receipts/     # Payment receipts
Security Features
JWT Authentication: Secure token-based authentication
Role-based Access: User, admin, and superadmin roles
Input Validation: Express-validator for all inputs
File Upload Security: Type and size restrictions
Rate Limiting: Prevents API abuse
CORS Protection: Configurable cross-origin requests
Helmet Security: Various security headers
Database Models
User: Authentication and user management
Category: Product categorization
Product: Product catalog with inventory
Order: Order processing and tracking
OrderItem: Individual order line items
Receipt: Payment receipt file storage
Review: Product review system
Settings: Application configuration
Environment Variables
See .env.example for all required environment variables including:

Database connection details
JWT configuration
File upload settings
Email/SMTP configuration
Telegram bot settings
Development
The API includes comprehensive error handling, logging, and development-friendly features:

Detailed error messages in development mode
Request/response logging
Database connection testing
Health check endpoint
API documentation endpoint
Production Deployment
Set NODE_ENV=production
Configure production database
Set secure JWT secret
Configure proper CORS origins
Set up file upload directory permissions
Configure reverse proxy (nginx recommended)
API Testing
Use the health check endpoint to verify the API is running:

GET /api/health
Visit /api for endpoint documentation and API overview.