const express = require('express');
const router = express.Router();
const path = require('path');
const ExcelJS = require('exceljs');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// ...existing code...

// View report
router.get('/report', async (req, res) => {
  const allUsers = await User.find();
  
  // Get today's date range (UTC)
  const today = new Date();
  const startOfDay = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ));
  const endOfDay = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() + 1
  ));

  // Find today's attendance records
  const todayRecords = await Attendance.find({
    timestamp: { $gte: startOfDay, $lt: endOfDay },
  }).populate('user');

  // const presentUserIds = todayRecords.map(r => r.user._id.toString());
  const presentUserIds = todayRecords
  .filter(r => r.user) 
  .map(r => r.user._id.toString());

  // Attach present status to each user
  const usersWithStatus = allUsers.map(user => ({
    name: user.name,
    cardId: user.cardId,
    age: user.age,
    gender: user.gender, 
    present: presentUserIds.includes(user._id.toString())
  }));
  
  res.render('report', { users: usersWithStatus });
});

// Display form
router.get('/admin', async (req, res) => {
  const allUsers = await User.find();

  const selected = req.query.date ? new Date(req.query.date) : new Date();
  selected.setHours(0, 0, 0, 0);
  const nextDay = new Date(selected);
  nextDay.setDate(selected.getDate() + 1);

  const todayRecords = await Attendance.find({
    timestamp: { $gte: selected, $lt: nextDay },
  }).populate('user');

  // const presentUserIds = todayRecords.map(r => r.user._id.toString());
  const presentUserIds = todayRecords
  .filter(r => r.user) // Only keep records with a valid user
  .map(r => r.user._id.toString());

  const usersWithStatus = allUsers.map(user => ({
    name: user.name,
    cardId: user.cardId,
    age: user.age,
    gender: user.gender,
    status: presentUserIds.includes(user._id.toString()) ? 'Present' : 'Absent',
  }));

  
  const presentUsers = usersWithStatus.filter(u => u.status === 'Present');
  const absentUsers = usersWithStatus.filter(u => u.status === 'Absent');

  res.render('admin', {
    presentUsers,
    absentUsers
  });
});


// Handle scan
router.post('/scan', async (req, res) => {
  const { cardId, selectedDate } = req.body;
  const user = await User.findOne({ cardId });

  if (!user) {
    return res.render('index', {
      message: "Card not recognized.",
      selectedDate, // pass this back
    });
  }

  const selectedTimestamp = new Date(selectedDate);

  // Check if already marked for selected date
  const start = new Date(Date.UTC(
    selectedTimestamp.getUTCFullYear(),
    selectedTimestamp.getUTCMonth(),
    selectedTimestamp.getUTCDate()
  ));
  const end = new Date(Date.UTC(
    selectedTimestamp.getUTCFullYear(),
    selectedTimestamp.getUTCMonth(),
    selectedTimestamp.getUTCDate() + 1
  ));

  const alreadyMarked = await Attendance.findOne({
    user: user._id,
    timestamp: { $gte: start, $lt: end }
  });

  if (alreadyMarked) {
    return res.render('index', {
      message: `${user.name} is already marked present for ${selectedDate}`,
      selectedDate,
    });
  }

  const attendance = await Attendance.create({
    user: user._id,
    timestamp: selectedTimestamp,
  });

  res.render('index', {
    message: `✅ ${user.name} marked present for ${selectedDate}`,
    selectedDate,
  });
});


// Home route
router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.render('index', { selectedDate: today });
});

router.get('/add-user', (req, res) => {
  res.render('add-user');
});
// Handle deleting a user
router.post('/admin/delete-user', async (req, res) => {
  const { cardId } = req.body;
  try {
    await User.findOneAndDelete({ cardId });
    res.redirect('/all-users');
  } catch (err) {
    res.status(400).send('Error deleting user');
  }
});
//all-users route
router.get('/all-users', async (req, res) => {
  const users = await User.find({});
  res.render('all-users', { users });
});

// Handle adding a new user
router.post('/add-user', async (req, res) => {
  const { name, cardId, age, gender } = req.body;
  try {
    await User.create({ name, cardId, age, gender }); // include gender
    res.redirect('/admin');
  } catch (err) {
    res.status(400).send('Error adding user');
  }
});

// Export to Excel
router.get('/export', async (req, res) => {
  const allUsers = await User.find();

  // Get today's date range (UTC)
  const today = new Date();
  const startOfDay = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ));
  const endOfDay = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() + 1
  ));

  // Find today's attendance records
  const todayRecords = await Attendance.find({
    timestamp: { $gte: startOfDay, $lt: endOfDay },
  }).populate('user');

  const presentUserIds = todayRecords.map(r => r.user._id.toString());

  // Attach present status to each user
  const usersWithStatus = allUsers.map(user => ({
    name: user.name,
    cardId: user.cardId,
    status: presentUserIds.includes(user._id.toString()) ? 'Present' : 'Absent'
  }));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  // Add header row
  worksheet.columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Card ID', key: 'cardId', width: 25 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  // Add data rows
  usersWithStatus.forEach(user => {
    worksheet.addRow(user);
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F75B5' }
  };

  // Set file path
  const filePath = path.join(__dirname, '..', 'exports', 'attendance_report.xlsx');

  // Write and send file
  await workbook.xlsx.writeFile(filePath);

  res.download(filePath, 'attendance_report.xlsx');
});


module.exports = router;
//export all users to Excel
router.get('/export-all-users', async (req, res) => {
  const users = await User.find({});

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('All Users');

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Card ID', key: 'cardId', width: 20 }
  ];

  users.forEach(user => {
    worksheet.addRow({ name: user.name, cardId: user.cardId });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=all_users.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});
