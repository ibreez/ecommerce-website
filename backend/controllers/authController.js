const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, hashPassword, comparePassword } = require('../utils/auth');

const authController = {
  // Register new user
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Create user
      const userId = await User.create({
        name,
        email,
        password_hash,
        role: 'user'
      });

      // Generate token
      const token = generateToken(userId, 'user');

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: userId,
          name,
          email,
          role: 'user'
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Temporary hardcoded test user
      if (email === 'test@example.com' && password === 'password123') {
        const token = generateToken(1, 'user');
        return res.json({
          message: 'Login successful',
          token,
          user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' }
        });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      // Ensure password_hash exists
      if (!user.password_hash) {
        console.error(`User ${email} has no password_hash or password field`);
        return res.status(500).json({ error: 'User password not found' });
      }

      // Check password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

      // Generate token
      const token = generateToken(user.id, user.role);

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user profile
  async profile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create admin user (admin/superadmin only)
  async adminCreate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Only superadmin can create other superadmins
      if (role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only superadmin can create superadmin users' });
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Create admin user
      const userId = await User.create({
        name,
        email,
        password_hash,
        role
      });

      res.status(201).json({
        message: 'Admin user created successfully',
        user: {
          id: userId,
          name,
          email,
          role
        }
      });
    } catch (error) {
      console.error('Admin create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // List admin users (superadmin only)
  async adminList(req, res) {
    try {
      const admins = await User.findAll('admin');
      const superadmins = await User.findAll('superadmin');
      
      res.json({
        admins: [...admins, ...superadmins]
      });
    } catch (error) {
      console.error('Admin list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete admin user (superadmin only)
  async adminDelete(req, res) {
    try {
      const { id } = req.params;

      // Prevent deleting self
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Get user to check if exists
      const userToDelete = await User.findById(id);
      if (!userToDelete) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Delete user
      const deleted = await User.delete(id);
      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete user' });
      }

      res.json({ message: 'Admin user deleted successfully' });
    } catch (error) {
      console.error('Admin delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user count for dashboard
  async getUserCount(req, res) {
    try {
      const current = await User.countCurrentMonth();
      const previous = await User.countPreviousMonth();

      res.json({
        success: true,
        current,
        previous
      });
    } catch (error) {
      console.error('Get user count error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
};

module.exports = authController;
