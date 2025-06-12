const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  options: [{
    type: String,
    required: true
  }],
  results: {
    type: Map,
    of: {
      answer: String,
      user: {
        name: String,
        role: String
      }
    },
    default: {}
  },
  timeLimit: {
    type: Number,
    default: 60
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Poll', PollSchema); 