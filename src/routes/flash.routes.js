const express = require('express');
const Flash = require('../models/flash.model');
const Doc = require('../models/doc.model');
const auth = require('../middleware/auth.middleware');
const router = express.Router();

// Create flash card for a specific doc
router.post('/:docId', auth, async (req, res) => {
  try {
    // First verify the doc exists and belongs to the user
    const doc = await Doc.findOne({ _id: req.params.docId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Doc not found' });
    }

    const flash = new Flash({
      ...req.body,
      docId: doc._id
    });

    // Validate flash card based on type
    if (flash.type === 'multiple_choice' && 
        (!flash.multipleChoice || !flash.multipleChoice.options || 
         flash.multipleChoice.options.filter(opt => opt.isCorrect).length !== 1)) {
      return res.status(400).json({ message: 'Multiple choice cards must have exactly one correct answer' });
    }

    if (flash.type === 'matching' && 
        (!flash.matching || !flash.matching.pairs || flash.matching.pairs.length < 2)) {
      return res.status(400).json({ message: 'Matching cards must have at least two pairs' });
    }

    await flash.save();

    // Add flash card reference to doc
    doc.flashCards.push(flash._id);
    await doc.save();

    res.status(201).json(flash);
  } catch (error) {
    res.status(400).json({ message: 'Could not create flash card', error: error.message });
  }
});

// Get all flash cards for a specific doc
router.get('/doc/:docId', auth, async (req, res) => {
  try {
    // Verify doc belongs to user
    const doc = await Doc.findOne({ _id: req.params.docId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Doc not found' });
    }

    const flashCards = await Flash.find({ docId: doc._id })
      .sort({ createdAt: -1 });
    res.json(flashCards);
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch flash cards', error: error.message });
  }
});

// Get single flash card
router.get('/:id', auth, async (req, res) => {
  try {
    const flash = await Flash.findById(req.params.id);
    if (!flash) {
      return res.status(404).json({ message: 'Flash card not found' });
    }

    // Verify the doc belongs to the user
    const doc = await Doc.findOne({ _id: flash.docId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Flash card not found' });
    }

    res.json(flash);
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch flash card', error: error.message });
  }
});

// Update flash card
router.patch('/:id', auth, async (req, res) => {
  try {
    const flash = await Flash.findById(req.params.id);
    if (!flash) {
      return res.status(404).json({ message: 'Flash card not found' });
    }

    // Verify the doc belongs to the user
    const doc = await Doc.findOne({ _id: flash.docId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Flash card not found' });
    }

    // Update the flash card
    Object.assign(flash, req.body);

    // Validate based on type
    if (flash.type === 'multiple_choice' && 
        (!flash.multipleChoice || !flash.multipleChoice.options || 
         flash.multipleChoice.options.filter(opt => opt.isCorrect).length !== 1)) {
      return res.status(400).json({ message: 'Multiple choice cards must have exactly one correct answer' });
    }

    if (flash.type === 'matching' && 
        (!flash.matching || !flash.matching.pairs || flash.matching.pairs.length < 2)) {
      return res.status(400).json({ message: 'Matching cards must have at least two pairs' });
    }

    await flash.save();
    res.json(flash);
  } catch (error) {
    res.status(400).json({ message: 'Could not update flash card', error: error.message });
  }
});

// Delete flash card
router.delete('/:id', auth, async (req, res) => {
  try {
    const flash = await Flash.findById(req.params.id);
    if (!flash) {
      return res.status(404).json({ message: 'Flash card not found' });
    }

    // Verify the doc belongs to the user
    const doc = await Doc.findOne({ _id: flash.docId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Flash card not found' });
    }

    // Remove flash card reference from doc
    doc.flashCards = doc.flashCards.filter(id => !id.equals(flash._id));
    await doc.save();

    // Delete the flash card
    await Flash.findByIdAndDelete(flash._id);

    res.json({ message: 'Flash card deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete flash card', error: error.message });
  }
});

module.exports = router;
