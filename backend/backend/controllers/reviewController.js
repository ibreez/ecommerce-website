const { validationResult } = require('express-validator');
const Review = require('../models/Review');
const Product = require('../models/Product');

const reviewController = {
  // Add new review (user)
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { product_id, rating, comment } = req.body;
      const user_id = req.user.id;

      // Check if product exists
      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if user already reviewed this product
      const existingReview = await Review.findUserReviewForProduct(user_id, product_id);
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this product' });
      }

      const reviewId = await Review.create({
        user_id,
        product_id,
        rating,
        comment
      });

      const review = await Review.findById(reviewId);
      res.status(201).json({
        message: 'Review submitted successfully. It will be visible after approval.',
        review
      });
    } catch (error) {
      console.error('Review create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get reviews for a product (public - approved only)
  async getByProductId(req, res) {
    try {
      const { product_id } = req.params;
      
      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const reviews = await Review.findByProductId(product_id, true);
      
      res.json({ reviews });
    } catch (error) {
      console.error('Get product reviews error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all reviews for admin
  async adminList(req, res) {
    try {
      const { approved, product_id, limit } = req.query;
      
      const filters = {};
      if (approved !== undefined) filters.approved = approved === 'true';
      if (product_id) filters.product_id = product_id;
      if (limit) filters.limit = limit;

      const reviews = await Review.findAll(filters);
      
      res.json({ reviews });
    } catch (error) {
      console.error('Admin reviews list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Approve/disapprove review (admin)
  async updateApproval(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { is_approved } = req.body;

      const review = await Review.findById(id);
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }

      const updated = await Review.updateApproval(id, is_approved);
      if (!updated) {
        return res.status(400).json({ error: 'Failed to update review approval' });
      }

      const updatedReview = await Review.findById(id);
      res.json({
        message: `Review ${is_approved ? 'approved' : 'disapproved'} successfully`,
        review: updatedReview
      });
    } catch (error) {
      console.error('Review approval update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete review (admin)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const review = await Review.findById(id);
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }

      const deleted = await Review.delete(id);
      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete review' });
      }

      res.json({ message: 'Review deleted successfully' });
    } catch (error) {
      console.error('Review delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = reviewController;