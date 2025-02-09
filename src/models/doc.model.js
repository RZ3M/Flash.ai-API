const mongoose = require('mongoose');

const docSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flashCards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flash'
  }]
}, {
  timestamps: true  // This automatically adds createdAt and updatedAt fields
});

// Virtual field to get the number of flash cards
docSchema.virtual('flashCardCount').get(function() {
  return this.flashCards.length;
});

// When converting to JSON, include virtuals
docSchema.set('toJSON', { virtuals: true });
docSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Doc', docSchema);
