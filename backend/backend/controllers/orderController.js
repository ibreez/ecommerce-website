const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');

const orderController = {
  // Place new order (user)
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, payment_method, shipping_address, phone, notes } = req.body;
      const user_id = req.user.id;

      // Validate items and calculate total
      let total_amount = 0;
      const validatedItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product_id);
        if (!product) {
          return res.status(400).json({ error: `Product with ID ${item.product_id} not found` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for product ${product.name}` });
        }

        const itemTotal = product.price * item.quantity;
        total_amount += itemTotal;

        validatedItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: product.price
        });
      }

      // Create order
      const orderId = await Order.create({
        user_id,
        total_amount,
        payment_method,
        shipping_address,
        phone,
        notes,
        items: validatedItems
      });

      const order = await Order.findById(orderId);
      res.status(201).json({
        message: 'Order placed successfully',
        order
      });

      // Send Telegram notification (non-blocking)
      const telegramService = require('../../utils/telegram');
      telegramService.sendOrderNotification(order).catch(err => {
        console.error('Telegram notify failed for order', orderId, err);
      });
    } catch (error) {
      console.error('Order create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user's own orders
  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { limit } = req.query;
      
      const orders = await Order.findByUserId(userId, limit);
      
      res.json({ orders });
    } catch (error) {
      console.error('Get user orders error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get single order (user can only see their own, admin can see all)
  async getById(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if user can access this order
      if (req.user.role === 'user' && order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json({ order });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all orders (admin only)
  async adminList(req, res) {
    try {
      const { status, payment_method, limit } = req.query;
      
      const filters = {};
      if (status) filters.status = status;
      if (payment_method) filters.payment_method = payment_method;
      if (limit) filters.limit = limit;

      const orders = await Order.findAll(filters);
      
      res.json({ orders });
    } catch (error) {
      console.error('Admin orders list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update order status (admin only)
  async updateStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const oldStatus = order.status;

      const updated = await Order.updateStatus(id, status);
      if (!updated) {
        return res.status(400).json({ error: 'Failed to update order status' });
      }

      const updatedOrder = await Order.findById(id);

      // Send Telegram notification if status changed to confirmed (non-blocking)
      if (oldStatus !== 'confirmed' && status === 'confirmed') {
        const telegramService = require('../../utils/telegram');
        telegramService.sendOrderNotification(updatedOrder).catch(err => {
          console.error('Telegram notify failed for order', id, err);
        });
      }

      res.json({
        message: 'Order status updated successfully',
        order: updatedOrder
      });
    } catch (error) {
      console.error('Order status update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = orderController;