const Order = require('../models/Order');
const Product = require('../models/Product');
const Receipt = require('../models/Receipt');
const emailService = require('../utils/email');
const telegramService = require('../utils/telegram');

// Clean, single implementation
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, shipping_address, phone, payment_method, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required' });
    }

    if (!shipping_address || !phone || !payment_method) {
      return res.status(400).json({ success: false, message: 'Shipping address, phone, and payment method are required' });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product with ID ${item.product_id} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for product ${product.name}` });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.price
      });
    }

    const orderId = await Order.create({
      user_id: userId,
      items: validatedItems,
      total_amount: totalAmount,
      shipping_address,
      phone,
      payment_method,
      notes: notes || null,
      status: 'pending'
    });

    const order = await Order.getById(orderId);

    try { await emailService.sendOrderConfirmation(order, req.user.email); await emailService.sendAdminNotification(order); } catch (e) { console.error('Email send failed', e); }
    try { await telegramService.sendOrderNotification(order); } catch (e) { console.error('Telegram send failed', e); }

    res.status(201).json({ success: true, message: 'Order created successfully', order: { id: orderId, total_amount: totalAmount, status: 'pending' } });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    const orders = await Order.getByUserIdWithItems(userId);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

const getUserOrdersWithItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.getByUserIdWithItems(userId);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get user orders with items error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const order = await Order.getByIdWithItems(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    const orders = await Order.getAll({ limit: parseInt(limit), offset, status });
    res.json({ success: true, orders: orders.orders, pagination: { page: parseInt(page), limit: parseInt(limit), total: orders.total } });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const currentOrder = await Order.getById(id);
    if (!currentOrder) return res.status(404).json({ success: false, message: 'Order not found' });
    const oldStatus = currentOrder.status;
    await Order.updateStatus(id, status);
    const updatedOrder = await Order.getById(id);
    try { await telegramService.sendStatusUpdate(updatedOrder, oldStatus, status); } catch (e) { console.error('Telegram status notify failed', e); }
    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const order = await Order.getByIdWithItems(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ success: false, message: 'Access denied' });
    if (order.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending orders can be cancelled' });

    // Restore product stock
    for (const item of order.items) {
      await Product.update(item.product_id, { stock: item.product.stock + item.quantity });
    }

    await Order.updateStatus(id, 'cancelled');
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};

const uploadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'Receipt file is required' });
    const order = await Order.getById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const receiptPath = `/uploads/receipts/${req.file.filename}`;
    await Receipt.create({ order_id: id, file_path: receiptPath, uploaded_by: req.user.id });
    res.json({ success: true, message: 'Receipt uploaded successfully', receipt_path: receiptPath });
  } catch (error) {
    console.error('Upload receipt error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload receipt' });
  }
};

const getOrderCount = async (req, res) => {
  try {
    const current = await Order.countCurrentMonth();
    const previous = await Order.countPreviousMonth();

    res.json({
      success: true,
      current,
      previous
    });
  } catch (error) {
    console.error('Get order count error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

const getOrderRevenue = async (req, res) => {
  try {
    const current = await Order.revenueCurrentMonth();
    const previous = await Order.revenuePreviousMonth();

    res.json({
      success: true,
      current,
      previous
    });
  } catch (error) {
    console.error('Get order revenue error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

const updateAdminNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const order = await Order.getById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await Order.updateAdminNotes(id, admin_notes);

    res.json({ success: true, message: 'Admin notes updated successfully' });
  } catch (error) {
    console.error('Update admin notes error:', error);
    res.status(500).json({ success: false, message: 'Failed to update admin notes' });
  }
};

const getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.getPendingOrders();
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get pending orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending orders' });
  }
};

module.exports = { createOrder, getUserOrders, getUserOrdersWithItems, getOrderById, getAllOrders, updateOrderStatus, uploadReceipt, cancelOrder, getOrderCount, getOrderRevenue, updateAdminNotes, getPendingOrders };
