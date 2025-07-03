const mongoose = require('mongoose');
const User = require('./models/User');
const users = require('./users.json');

mongoose.connect('mongodb://localhost:27017/attendance')
  .then(async () => {
    await User.deleteMany({});
    await User.insertMany(users);
    console.log('✅ Users inserted');
    process.exit();
  })
  .catch(err => console.error('❌ Error inserting users:', err));
