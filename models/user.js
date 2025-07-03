const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  cardId: { type: String, unique: true },
  age: Number,
  gender: String,
});

module.exports = mongoose.model('User', userSchema);