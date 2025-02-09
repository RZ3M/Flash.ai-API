const mongoose = require('mongoose');

const multipleChoiceSchema = new mongoose.Schema({
  options: [{
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    }
  }]
});

const matchingSchema = new mongoose.Schema({
  pairs: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }]
});

const flashSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['multiple_choice', 'fill_in_blank', 'matching']
  },
  question: {
    type: String,
    required: function() {
      return this.type !== 'matching';
    },
    trim: true
  },
  answer: {
    type: String,
    required: function() {
      return this.type === 'fill_in_blank';
    }
  },
  multipleChoice: {
    type: multipleChoiceSchema,
    required: function() {
      return this.type === 'multiple_choice';
    }
  },
  matching: {
    type: matchingSchema,
    required: function() {
      return this.type === 'matching';
    }
  },
  difficulty: {
    type: Number,
    required: true,
    enum: [1, 2, 3],
    default: 1
  },
  docId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doc',
    required: true
  }
}, {
  timestamps: true
});

// Validate that multiple choice cards have exactly one correct answer
flashSchema.pre('save', function(next) {
  if (this.type === 'multiple_choice') {
    const correctAnswers = this.multipleChoice.options.filter(option => option.isCorrect);
    if (correctAnswers.length !== 1) {
      next(new Error('Multiple choice cards must have exactly one correct answer'));
    }
  }
  next();
});

// Validate that matching cards have at least two pairs
flashSchema.pre('save', function(next) {
  if (this.type === 'matching' && this.matching.pairs.length < 2) {
    next(new Error('Matching cards must have at least two pairs'));
  }
  next();
});

module.exports = mongoose.model('Flash', flashSchema);
