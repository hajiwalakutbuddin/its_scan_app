const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  cardId: { type: String, unique: true },
});

module.exports = mongoose.model('User', userSchema);