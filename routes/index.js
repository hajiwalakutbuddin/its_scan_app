const express = require('express');
const router = express.Router();
const User = require('../models/User');
const xlsx = require('xlsx');
const path = require('path');

// Display form
router.get('/', async (req, res) => {
  res.render('index');
});

// admin dashboard
router.get('/admin', async (req, res) => {
  const query = {};
  if (req.query.date) {
    const start = new Date(req.query.date);
    const end = new Date(req.query.date);
    end.setDate(end.getDate() + 1);
    query.timestamp = { $gte: start, $lt: end };
  }

  const records = await Attendance.find(query)
    .sort({ timestamp: 1 })
    .populate('user');

  res.render('admin', { records });
});


// Handle scan
const Attendance = require('../models/Attendance');

router.post('/scan', async (req, res) => {
  const { cardId } = req.body;
  const user = await User.findOne({ cardId });

  if (user) {
    await Attendance.create({ user: user._id });
    res.render('index', { message: `Welcome, ${user.name}!` });
  } else {
    res.render('index', { message: "Card not recognized." });
  }
});


// View report
router.get('/report', async (req, res) => {
  const users = await User.find();
  res.render('report', { users });
});

// Export to Excel
const ExcelJS = require('exceljs');

router.get('/export', async (req, res) => {
  const users = await User.find();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  // Add header row
  worksheet.columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Card ID', key: 'cardId', width: 25 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  // Add data rows
  users.forEach(user => {
    worksheet.addRow({
      name: user.name,
      cardId: user.cardId,
      status: user.present ? 'Present' : 'Absent'
    });
  });

  // Set file path
  const filePath = path.join(__dirname, '..', 'exports', 'attendance_report.xlsx');

  // Write and send file
  await workbook.xlsx.writeFile(filePath);
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F75B5' }
  };

  res.download(filePath, 'attendance_report.xlsx');
});


module.exports = router;
