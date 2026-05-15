const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');

async function check() {
  try {
    await mongoose.connect('mongodb://localhost:27017/attendzo');
    console.log('Connected to MongoDB');
    
    const admin = await Admin.findOne({ phone: '9696559848' });
    console.log('Admin found:', admin ? admin.name : 'NOT FOUND');
    if (admin) {
      console.log('Admin ID:', admin._id);
      console.log('Admin phone:', admin.phone);
    }
    
    const employees = await Employee.find({});
    console.log('\nAll employees in database:', employees.length);
    employees.forEach(e => {
      console.log(`- ${e.name} (${e.employeeCode}) - adminId: ${e.adminId} - isActive: ${e.isActive} - isDeleted: ${e.isDeleted}`);
    });
    
    if (admin) {
      const myEmployees = await Employee.find({ adminId: admin._id });
      console.log('\nEmployees for this admin:', myEmployees.length);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
