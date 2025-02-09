const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const docRoutes = require('./routes/doc.routes');
const flashRoutes = require('./routes/flash.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('src/public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/flash', flashRoutes);
app.use('/api/upload', uploadRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
