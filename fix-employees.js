const mongoose = require('mongoose');

async function fixEmployees() {
  try {
    await mongoose.connect('mongodb://localhost:27017/attendzo');
    console.log('Connected to MongoDB');
    
    // Update all employees where isDeleted is true to false
    const result = await mongoose.connection.db.collection('employees').updateMany(
      { isDeleted: true },
      { $set: { isDeleted: false } }
    );
    
    console.log(`Updated ${result.modifiedCount} employees - isDeleted set to false`);
    
    // Check employees for this admin
    const employees = await mongoose.connection.db.collection('employees').find(
      { adminId: new mongoose.Types.ObjectId('69ea63ee3001e1ebde762e57') }
    ).toArray();
    
    console.log(`\nEmployees for admin 69ea63ee3001e1ebde762e57:`);
    employees.forEach(e => {
      console.log(`- ${e.name} (${e.employeeCode}) - isDeleted: ${e.isDeleted}, isActive: ${e.isActive}`);
    });
    
    await mongoose.disconnect();
    console.log('\nDone!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixEmployees();
