const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://digitalgurucse_db_user:58iI7qGgGznPqOTm@cluster0.iw8iuah.mongodb.net/attendancex?appName=Cluster0";

async function testQuery() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('attendancex');
    const employeesCollection = db.collection('employees');
    
    // Test exact query
    const adminId = new ObjectId("69ea63ee3001e1ebde762e57");
    console.log('Searching for adminId:', adminId);
    
    const employees = await employeesCollection.find({ 
      adminId: adminId,
      isActive: true,
      isDeleted: false
    }).toArray();
    
    console.log('Employees found:', employees.length);
    employees.forEach(e => {
      console.log(`- ${e.name} (${e.employeeCode}) - isActive: ${e.isActive}, isDeleted: ${e.isDeleted || 'undefined'}`);
    });
    
    // Also check without isDeleted filter
    const employeesNoFilter = await employeesCollection.find({ 
      adminId: adminId,
      isActive: true
    }).toArray();
    
    console.log('\nEmployees without isDeleted filter:', employeesNoFilter.length);
    employeesNoFilter.forEach(e => {
      console.log(`- ${e.name} (${e.employeeCode}) - isActive: ${e.isActive}, isDeleted: ${e.isDeleted || 'undefined'}`);
    });
    
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testQuery();
