const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const users = [
  { name: 'Alice', cardId: 'A123' },
  { name: 'Bob', cardId: 'B456' },
  { name: 'Charlie', cardId: 'C789' },
];

async function seed() {
  await User.deleteMany({});
  await User.insertMany(users);
  console.log('Database seeded');
  mongoose.disconnect();
}

seed();
