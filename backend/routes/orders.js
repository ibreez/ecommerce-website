const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../utils/auth');
const { uploadReceipt } = require('../utils/fileUpload');
const {
  createOrder,
  getUserOrders,
  getUserOrdersWithItems,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  uploadReceipt: uploadReceiptController,
  getOrderCount,
  getOrderRevenue,
  updateAdminNotes,
  getPendingOrders
} = require('../controllers/orderController');

// User routes
router.post('/', authenticateToken, createOrder);
router.get('/user', authenticateToken, getUserOrders);
router.get('/user/expanded', authenticateToken, getUserOrdersWithItems);

// Dashboard routes
router.get('/count', authenticateToken, requireAdmin, getOrderCount);
router.get('/revenue', authenticateToken, requireAdmin, getOrderRevenue);
router.get('/pending', authenticateToken, requireAdmin, getPendingOrders);

router.get('/:id', authenticateToken, getOrderById);
router.patch('/:id/cancel', authenticateToken, cancelOrder);
router.post('/:id/receipt', authenticateToken, uploadReceipt, uploadReceiptController);

// Admin routes
router.get('/admin/list', authenticateToken, requireAdmin, getAllOrders);
router.put('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);
router.put('/:id/notes', authenticateToken, requireAdmin, updateAdminNotes);

module.exports = router;
