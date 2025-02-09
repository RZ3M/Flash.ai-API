const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Doc = require('../models/doc.model');
const Flash = require('../models/flash.model');
const auth = require('../middleware/auth.middleware');
const router = express.Router();

// Validate user token and return user info
router.get('/', async (req, res) => {
  try {
    // Check if Authorization header exists
    if (!req.headers.authorization) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Extract token from Bearer header
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and exclude password
    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return success with user info
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        darkMode: user.darkMode
      }
    });
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
});

// register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists'
      });
    }

    const user = new User({
      username,
      email,
      password,
      darkMode: false,
      docs: []
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        darkMode: user.darkMode
      }
    });
  } catch (error) {
    res.status(400).json({ message: 'Registration failed', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        darkMode: user.darkMode
      }
    });
  } catch (error) {
    res.status(400).json({ message: 'Login failed' });
  }
});

// Update user information
router.patch('/update', auth, async (req, res) => {
  try {
    const { username, email, password, darkMode } = req.body;
    const updateFields = {};

    // Validate and add fields if they exist
    if (username !== undefined) {
      // Validate username format if needed
      if (username.length < 1) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 1 character long'
        });
      }
      updateFields.username = username;
    }

    if (email !== undefined) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: req.userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
      updateFields.email = email;
    }

    if (password !== undefined) {
      // Validate password strength if needed
      if (password.length < 1) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 1 character long'
        });
      }
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }

    if (darkMode !== undefined) {
      // Validate darkMode is boolean
      if (typeof darkMode !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'darkMode must be a boolean'
        });
      }
      updateFields.darkMode = darkMode;
    }

    // If no fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.userId,
      updateFields,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        darkMode: user.darkMode
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user information',
      error: error.message
    });
  }
});

// Delete user account and all associated data
router.delete('/delete', auth, async (req, res) => {
  try {
    // Find user's documents
    const docs = await Doc.find({ userId: req.userId });
    
    // Delete all flash cards associated with user's documents
    for (const doc of docs) {
      await Flash.deleteMany({ docId: doc._id });
    }
    
    // Delete all user's documents
    await Doc.deleteMany({ userId: req.userId });
    
    // Delete the user
    const user = await User.findByIdAndDelete(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User account and all associated data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user account',
      error: error.message
    });
  }
});

module.exports = router;
