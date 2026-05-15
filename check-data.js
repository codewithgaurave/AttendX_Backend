const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://digitalgurucse_db_user:58iI7qGgGznPqOTm@cluster0.iw8iuah.mongodb.net/attendancex?appName=Cluster0";

async function checkData() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('attendancex');
    
    // Check all admins
    const admins = await db.collection('admins').find({}).toArray();
    console.log('\nAll Admins:');
    admins.forEach(a => {
      console.log(`- ${a.name} (${a.phone}) - ID: ${a._id}`);
    });
    
    // Check all employees
    const employees = await db.collection('employees').find({}).toArray();
    console.log(`\nAll Employees (${employees.length}):`);
    employees.forEach(e => {
      console.log(`- ${e.name} (${e.employeeCode}) - adminId: ${e.adminId} - isDeleted: ${e.isDeleted}, isActive: ${e.isActive}`);
    });
    
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkData();
