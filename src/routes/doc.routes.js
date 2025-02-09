const express = require('express');
const Doc = require('../models/doc.model');
const Flash = require('../models/flash.model');
const User = require('../models/user.model');
const auth = require('../middleware/auth.middleware');
const router = express.Router();

// Create doc
router.post('/', auth, async (req, res) => {
  try {
    const { title, summary } = req.body;
    const doc = new Doc({
      title,
      summary,
      userId: req.userId,
      flashCards: []
    });
    await doc.save();

    // Add the document to the user's docs array
    const user = await User.findById(req.userId);
    if (user) {
      user.docs.push(doc._id);
      await user.save();
    }

    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ message: 'Could not create doc', error: error.message });
  }
});

// Get all docs for user
router.get('/', auth, async (req, res) => {
  try {
    const docs = await Doc.find({ userId: req.userId })
      .populate('flashCards', 'type difficulty')
      .select('title summary createdAt flashCardCount');
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch docs', error: error.message });
  }
});

// Get single doc with all flash cards
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Doc.findOne({ _id: req.params.id, userId: req.userId })
      .populate('flashCards');
    if (!doc) {
      return res.status(404).json({ message: 'Doc not found' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch doc', error: error.message });
  }
});

// Update doc
router.patch('/:id', auth, async (req, res) => {
  try {
    const { title, summary } = req.body;
    const doc = await Doc.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title, summary },
      { new: true }
    ).populate('flashCards');
    if (!doc) {
      return res.status(404).json({ message: 'Doc not found' });
    }
    res.json(doc);
  } catch (error) {
    res.status(400).json({ message: 'Could not update doc', error: error.message });
  }
});

// Helper function to delete a doc and its flash cards
const deleteDocAndFlashCards = async (docId) => {
  // Delete all associated flash cards
  await Flash.deleteMany({ docId });
  // Delete the doc
  await Doc.findByIdAndDelete(docId);
};

// Delete doc and its flash cards
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Doc.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Doc not found' });
    }

    const user = await User.findById(doc.userId);
    if (user) {
      user.docs = user.docs.filter(docId => docId.toString() !== doc._id.toString());
      await user.save();
    }

    await deleteDocAndFlashCards(doc._id);

    // Remove the document ID from the user's docs array
    const user = await User.findById(doc.userId);
    if (user) {
      user.docs = user.docs.filter(docId => docId.toString() !== doc._id.toString());
      await user.save();
    }
    res.json({ message: 'Doc and associated flash cards deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete doc', error: error.message });
  }
});

// Export the helper function
module.exports = router;
