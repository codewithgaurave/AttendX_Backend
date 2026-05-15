const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://digitalgurucse_db_user:58iI7qGgGznPqOTm@cluster0.iw8iuah.mongodb.net/attendancex?appName=Cluster0";

async function checkEmployees() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('attendancex');
    const employeesCollection = db.collection('employees');
    
    // Check all employees
    const employees = await employeesCollection.find({}).toArray();
    console.log(`\nTotal Employees: ${employees.length}`);
    
    // Check employees for admin 69ea63ee3001e1ebde762e57
    const myEmployees = await employeesCollection.find({ adminId: "69ea63ee3001e1ebde762e57" }).toArray();
    console.log(`\nEmployees for admin 69ea63ee3001e1ebde762e57: ${myEmployees.length}`);
    myEmployees.forEach(e => {
      console.log(`- ${e.name} (${e.employeeCode}) - isActive: ${e.isActive}, isDeleted: ${e.isDeleted || 'undefined'}`);
    });
    
    // Check employees for admin 69ea63ee3001e1ebde762e57 with isActive: true
    const activeEmployees = await employeesCollection.find({ adminId: "69ea63ee3001e1ebde762e57", isActive: true }).toArray();
    console.log(`\nActive Employees (isActive: true): ${activeEmployees.length}`);
    activeEmployees.forEach(e => {
      console.log(`- ${e.name} (${e.employeeCode})`);
    });
    
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkEmployees();
