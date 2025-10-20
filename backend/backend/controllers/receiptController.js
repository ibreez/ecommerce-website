const { validationResult } = require('express-validator');
const Receipt = require('../models/Receipt');
const Order = require('../models/Order');
const fs = require('fs').promises;
const path = require('path');

const receiptController = {
  // Upload receipt for order (user)
  async upload(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { order_id } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'Receipt file is required' });
      }

      // Check if order exists and belongs to user (or user is admin)
      const order = await Order.findById(order_id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check ownership (users can only upload receipts for their own orders)
      if (req.user.role === 'user' && order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Only allow receipts for bank transfer orders
      if (order.payment_method !== 'bank_transfer') {
        return res.status(400).json({ error: 'Receipts can only be uploaded for bank transfer orders' });
      }

      const receiptId = await Receipt.create({
        order_id,
        file_path: `/uploads/receipts/${req.file.filename}`,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      });

      const receipt = await Receipt.findById(receiptId);
      res.status(201).json({
        message: 'Receipt uploaded successfully',
        receipt
      });
    } catch (error) {
      console.error('Receipt upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get receipts for an order
  async getByOrderId(req, res) {
    try {
      const { order_id } = req.params;

      // Check if order exists and user has access
      const order = await Order.findById(order_id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check access permissions
      if (req.user.role === 'user' && order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const receipts = await Receipt.findByOrderId(order_id);
      
      res.json({ receipts });
    } catch (error) {
      console.error('Get receipts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete receipt (admin only)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const receipt = await Receipt.findById(id);
      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }

      // Delete file from filesystem
      try {
        const filePath = path.join(__dirname, '..', receipt.file_path);
        await fs.unlink(filePath);
      } catch (fileError) {
        console.warn('Could not delete receipt file:', fileError.message);
      }

      const deleted = await Receipt.delete(id);
      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete receipt' });
      }

      res.json({ message: 'Receipt deleted successfully' });
    } catch (error) {
      console.error('Receipt delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = receiptController;