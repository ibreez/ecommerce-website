const { validationResult } = require('express-validator');
const Review = require('../models/Review');

const reviewController = {
  // Create new review
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { product_id, rating, comment } = req.body;
      const user_id = req.user.id;

      // Check if user already reviewed this product
      const existingReview = await Review.findByUserAndProduct(user_id, product_id);
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
        message: 'Review created successfully',
        review
      });
    } catch (error) {
      console.error('Review create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get reviews for a product
  async getProductReviews(req, res) {
    try {
      const { productId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const offset = (page - 1) * limit;
      const reviews = await Review.findByProduct(productId, { limit: parseInt(limit), offset });
      
      res.json({ reviews });
    } catch (error) {
      console.error('Get product reviews error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update review
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { rating, comment } = req.body;
      const user_id = req.user.id;

      // Check if review exists and belongs to user
      const existingReview = await Review.findById(id);
      if (!existingReview) {
        return res.status(404).json({ error: 'Review not found' });
      }

      if (existingReview.user_id !== user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await Review.update(id, { rating, comment });
      if (!updated) {
        return res.status(400).json({ error: 'Failed to update review' });
      }

      const review = await Review.findById(id);
      res.json({
        message: 'Review updated successfully',
        review
      });
    } catch (error) {
      console.error('Review update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete review
  async delete(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      // Check if review exists and belongs to user
      const existingReview = await Review.findById(id);
      if (!existingReview) {
        return res.status(404).json({ error: 'Review not found' });
      }

      if (existingReview.user_id !== user_id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
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