const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://digitalgurucse_db_user:58iI7qGgGznPqOTm@cluster0.iw8iuah.mongodb.net/attendancex?appName=Cluster0";

async function fixEmployees() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('attendancex');
    const employeesCollection = db.collection('employees');
    
    // Update employees where isActive is false to true (for admin Gaurav)
    const result = await employeesCollection.updateMany(
      { 
        adminId: "69ea63ee3001e1ebde762e57",
        isActive: false 
      },
      { $set: { isActive: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} employees - isActive set to true`);
    
    // Check employees for this admin
    const employees = await employeesCollection.find(
      { adminId: "69ea63ee3001e1ebde762e57" }
    ).toArray();
    
    console.log(`\nEmployees for admin Gaurav (69ea63ee3001e1ebde762e57):`);
    employees.forEach(e => {
      console.log(`- ${e.name} (${e.employeeCode}) - isActive: ${e.isActive}, isDeleted: ${e.isDeleted || 'undefined'}`);
    });
    
    await client.close();
    console.log('\nDone! Employees fixed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixEmployees();
