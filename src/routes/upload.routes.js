const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth.middleware');
const { extractTextFromFile } = require('../services/file-processing.service');
const { generateFlashCards } = require('../services/google-ai.service');
const Doc = require('../models/doc.model');
const Flash = require('../models/flash.model');
const User = require('../models/user.model');
const router = express.Router();

// Configure multer for file upload
const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  }
});

// Upload and process file
router.post('/', auth, (req, res, next) => {
  console.log('Request body:', req.body);
  console.log('Request file:', req.body.file);
  console.log('Content type:', req.headers['content-type']);
  next();
}, upload.single('file'), async (req, res) => {
  try {
    console.log('After multer - req.file:', req.file);
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if file type is supported
    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];

    if (!supportedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        message: 'Unsupported file type',
        supportedTypes
      });
    }

    // Extract text from file
    const extractedText = await extractTextFromFile(req.file);
    
    // Generate flash cards using Google AI
    const aiResponse = await generateFlashCards(req.file);
    
    if (!aiResponse.success) {
      return res.status(500).json({ 
        message: 'Failed to generate flash cards',
        error: aiResponse.error 
      });
    }

    // Create new document
    const doc = new Doc({
      title: req.body.title || 'Untitled Document',
      summary: aiResponse.data.summary,
      userId: req.userId
    });

    // Create flash cards
    const flashCardPromises = aiResponse.data.flashCards.map(async (cardData) => {
      const flash = new Flash({
        ...cardData,
        docId: doc._id
      });
      await flash.save();
      return flash._id;
    });

    // Wait for all flash cards to be created
    const flashCardIds = await Promise.all(flashCardPromises);

    // Add flash card references to doc
    doc.flashCards = flashCardIds;
    await doc.save();

    // Add the document to the user's docs array
    const user = await User.findById(req.userId);
    if (user) {
      user.docs.push(doc._id);
      await user.save();
    }

    res.status(201).json({
      message: 'Document and flash cards created successfully',
      doc,
      flashCardCount: flashCardIds.length
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ 
      message: 'Error processing file',
      error: error.message 
    });
  }
});

module.exports = router;
