require("dotenv").config();
const axios = require("axios");

const BASE = "http://localhost:8000/api";
let saToken, admin1Token, admin2Token, admin3Token;
let admin1Id, admin2Id, admin3Id;
let office1Id, office2Id;
let emp1Id, emp2Id, emp3Id, emp4Id, emp5Id;

const log = (label, data) => {
  console.log(`\n✅ ${label}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};
const err = (label, e) => {
  console.log(`\n❌ ${label}: ${e.response?.data?.message || e.message}`);
  console.log(JSON.stringify(e.response?.data, null, 2));
};

async function run() {
  // ─── 1. SUPERADMIN LOGIN ───────────────────────────────────────────────
  try {
    const r = await axios.post(`${BASE}/auth/login`, {
      email: "superadmin@attendancex.com",
      password: "Admin@123",
      role: "superadmin",
    });
    saToken = r.data.token;
    log("SuperAdmin Login", { token: "OK", name: r.data.user.name });
  } catch (e) { err("SuperAdmin Login", e); return; }

  const saHeaders = { Authorization: `Bearer ${saToken}` };

  // ─── 2. CREATE 3 ADMINS ────────────────────────────────────────────────
  const admins = [
    { name: "Rahul Sharma", email: "rahul@techcorp.com", password: "Pass@123", phone: "9876543210", companyName: "TechCorp Pvt Ltd" },
    { name: "Priya Singh", email: "priya@designhub.com", password: "Pass@123", phone: "9876543211", companyName: "DesignHub Studio" },
    { name: "Amit Verma", email: "amit@retailzone.com", password: "Pass@123", phone: "9876543212", companyName: "RetailZone India" },
  ];

  for (let i = 0; i < admins.length; i++) {
    try {
      const r = await axios.post(`${BASE}/superadmin/admins`, admins[i], { headers: saHeaders });
      const id = r.data.admin._id;
      if (i === 0) admin1Id = id;
      if (i === 1) admin2Id = id;
      if (i === 2) admin3Id = id;
      log(`Create Admin ${i + 1}: ${admins[i].name}`, { id, qrGenerated: !!r.data.admin.qrCode });
    } catch (e) {
      // already exists - fetch id
      try {
        const all = await axios.get(`${BASE}/superadmin/admins`, { headers: saHeaders });
        const found = all.data.find(a => a.email === admins[i].email);
        if (found) {
          if (i === 0) admin1Id = found._id;
          if (i === 1) admin2Id = found._id;
          if (i === 2) admin3Id = found._id;
          log(`Admin ${i+1} already exists`, { id: found._id });
        }
      } catch(e2) { err(`Fetch Admin ${i+1}`, e2); }
    }
  }

  // ─── 3. GET ALL ADMINS ─────────────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/superadmin/admins`, { headers: saHeaders });
    log(`Get All Admins (count: ${r.data.length})`, r.data.map(a => ({ name: a.name, email: a.email, active: a.isActive })));
  } catch (e) { err("Get All Admins", e); }

  // ─── 4. ADMIN LOGINS ──────────────────────────────────────────────────
  for (const [email, label] of [
    ["rahul@techcorp.com", "Admin1"],
    ["priya@designhub.com", "Admin2"],
    ["amit@retailzone.com", "Admin3"],
  ]) {
    try {
      const r = await axios.post(`${BASE}/auth/login`, { email, password: "Pass@123", role: "admin" });
      if (label === "Admin1") admin1Token = r.data.token;
      if (label === "Admin2") admin2Token = r.data.token;
      if (label === "Admin3") admin3Token = r.data.token;
      log(`${label} Login`, { name: r.data.user.name });
    } catch (e) { err(`${label} Login`, e); }
  }

  // ─── 5. GEOCODE ADDRESS (Admin1) ──────────────────────────────────────
  try {
    const r = await axios.post(`${BASE}/admin/offices/geocode`,
      { address: "Connaught Place, New Delhi" },
      { headers: { Authorization: `Bearer ${admin1Token}` } }
    );
    log("Geocode Address Test", r.data);
  } catch (e) { err("Geocode Address", e); }

  // ─── 6. CREATE OFFICES ────────────────────────────────────────────────
  try {
    const r = await axios.post(`${BASE}/admin/offices`,
      { name: "TechCorp HQ", lat: 28.6315, long: 77.2167, radius: 500 },
      { headers: { Authorization: `Bearer ${admin1Token}` } }
    );
    office1Id = r.data._id;
    log("Admin1 Create Office", { id: office1Id, name: r.data.name, address: r.data.address, radius: r.data.radius });
  } catch (e) { err("Admin1 Create Office", e); }

  try {
    const r = await axios.post(`${BASE}/admin/offices`,
      { name: "DesignHub Studio", lat: 19.0760, long: 72.8777, radius: 300 },
      { headers: { Authorization: `Bearer ${admin2Token}` } }
    );
    office2Id = r.data._id;
    log("Admin2 Create Office", { id: office2Id, name: r.data.name, address: r.data.address });
  } catch (e) { err("Admin2 Create Office", e); }

  // ─── 7. CREATE EMPLOYEES ──────────────────────────────────────────────
  const employees = [
    {
      token: admin1Token, officeId: office1Id, adminId: admin1Id,
      data: {
        name: "Vikram Patel", email: "vikram@techcorp.com", phone: "9111111111",
        employeeCode: "TC001", designation: "Software Engineer", joiningDate: "2023-01-15",
        department: "Engineering", address: "Delhi", gender: "Male",
        workingHours: { startTime: "09:00", endTime: "18:00" }
      }
    },
    {
      token: admin1Token, officeId: office1Id, adminId: admin1Id,
      data: {
        name: "Sneha Gupta", email: "sneha@techcorp.com", phone: "9111111112",
        employeeCode: "TC002", designation: "Product Manager", joiningDate: "2023-03-01",
        department: "Product", gender: "Female",
        workingHours: { startTime: "10:00", endTime: "19:00" }
      }
    },
    {
      token: admin1Token, officeId: office1Id, adminId: admin1Id,
      data: {
        name: "Rohit Kumar", email: "rohit@techcorp.com", phone: "9111111113",
        employeeCode: "TC003", designation: "DevOps Engineer", joiningDate: "2022-06-10",
        workingHours: { startTime: "09:00", endTime: "18:00" }
      }
    },
    {
      token: admin2Token, officeId: office2Id, adminId: admin2Id,
      data: {
        name: "Ananya Joshi", email: "ananya@designhub.com", phone: "9222222221",
        employeeCode: "DH001", designation: "UI Designer", joiningDate: "2023-07-01",
        department: "Design", gender: "Female",
        workingHours: { startTime: "09:30", endTime: "18:30" }
      }
    },
    {
      token: admin2Token, officeId: office2Id, adminId: admin2Id,
      data: {
        name: "Karan Mehta", email: "karan@designhub.com", phone: "9222222222",
        employeeCode: "DH002", designation: "Graphic Designer", joiningDate: "2023-09-15",
        workingHours: { startTime: "09:30", endTime: "18:30" }
      }
    },
  ];

  const empIds = [];
  for (let i = 0; i < employees.length; i++) {
    const { token, officeId, data } = employees[i];
    try {
      const r = await axios.post(`${BASE}/admin/employees`,
        { ...data, officeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      empIds.push(r.data._id);
      log(`Create Employee ${i + 1}: ${data.name}`, { id: r.data._id, code: r.data.employeeCode, workingHours: r.data.workingHours });
    } catch (e) {
      err(`Create Employee ${i + 1}`, e);
      empIds.push(null);
    }
  }
  [emp1Id, emp2Id, emp3Id, emp4Id, emp5Id] = empIds;

  // ─── 8. GET EMPLOYEES LIST ────────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/admin/employees`, { headers: { Authorization: `Bearer ${admin1Token}` } });
    log(`Admin1 Employees (count: ${r.data.length})`, r.data.map(e => ({ name: e.name, code: e.employeeCode, office: e.officeId?.name })));
  } catch (e) { err("Get Employees", e); }

  // ─── 9. QR SCAN - GET EMPLOYEE LIST BY ADMIN ID ───────────────────────
  try {
    const r = await axios.get(`${BASE}/attendance/employees/${admin1Id}`);
    log(`QR Scan → Admin1 Employee List (count: ${r.data.length})`, r.data.map(e => ({ name: e.name, code: e.employeeCode })));
  } catch (e) { err("QR Scan Employee List", e); }

  // ─── 10. UPDATE WORKING HOURS ─────────────────────────────────────────
  if (emp1Id) {
    try {
      const r = await axios.patch(`${BASE}/admin/employees/${emp1Id}/working-hours`,
        { startTime: "09:00", endTime: "18:00" },
        { headers: { Authorization: `Bearer ${admin1Token}` } }
      );
      log("Update Working Hours (Emp1)", r.data);
    } catch (e) { err("Update Working Hours", e); }
  }

  // ─── 11. CHECK-IN (inside radius - Delhi office coords) ───────────────
  const delhiLat = 28.6315, delhiLong = 77.2167; // same as office = inside

  if (emp1Id) {
    try {
      const r = await axios.post(`${BASE}/attendance/checkin`, {
        employeeId: emp1Id,
        adminId: admin1Id,
        lat: delhiLat,
        long: delhiLong,
        selfie: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
      log("Emp1 Check-In", { message: r.data.message, withinRadius: r.data.withinRadius, distance: r.data.distance, location: r.data.location, time: r.data.attendance.checkIn.time });
    } catch (e) { err("Emp1 Check-In", e); }
  }

  if (emp2Id) {
    try {
      const r = await axios.post(`${BASE}/attendance/checkin`, {
        employeeId: emp2Id,
        adminId: admin1Id,
        lat: delhiLat + 0.0001,
        long: delhiLong + 0.0001,
        selfie: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
      log("Emp2 Check-In", { message: r.data.message, withinRadius: r.data.withinRadius, distance: r.data.distance });
    } catch (e) { err("Emp2 Check-In", e); }
  }

  if (emp3Id) {
    try {
      const r = await axios.post(`${BASE}/attendance/checkin`, {
        employeeId: emp3Id,
        adminId: admin1Id,
        lat: delhiLat + 0.0002,
        long: delhiLong + 0.0002,
        selfie: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
      log("Emp3 Check-In", { message: r.data.message, withinRadius: r.data.withinRadius, distance: r.data.distance });
    } catch (e) { err("Emp3 Check-In", e); }
  }

  // ─── 12. DUPLICATE CHECK-IN TEST ──────────────────────────────────────
  if (emp1Id) {
    try {
      await axios.post(`${BASE}/attendance/checkin`, {
        employeeId: emp1Id, adminId: admin1Id, lat: delhiLat, long: delhiLong, selfie: "x",
      });
      console.log("\n❌ Duplicate check-in should have been blocked!");
    } catch (e) {
      log("Duplicate Check-In Blocked ✓", { message: e.response?.data?.message });
    }
  }

  // ─── 13. OUTSIDE RADIUS TEST ──────────────────────────────────────────
  if (emp1Id) {
    // Temporarily use a far location to test - but emp1 already checked in today
    // So test with emp4 (Mumbai office) trying Delhi coords
    if (emp4Id) {
      try {
        await axios.post(`${BASE}/attendance/checkin`, {
          employeeId: emp4Id,
          adminId: admin2Id,
          lat: 28.6315, // Delhi coords but office is Mumbai
          long: 77.2167,
          selfie: "x",
        });
        console.log("\n❌ Outside radius check-in should have been blocked!");
      } catch (e) {
        log("Outside Radius Blocked ✓", { message: e.response?.data?.message, distance: e.response?.data?.distance, violation: e.response?.data?.violation });
      }
    }
  }

  // ─── 14. CHECK-OUT ────────────────────────────────────────────────────
  await new Promise(r => setTimeout(r, 2000)); // 2 sec gap

  if (emp1Id) {
    try {
      const r = await axios.post(`${BASE}/attendance/checkout`, {
        employeeId: emp1Id,
        lat: delhiLat,
        long: delhiLong,
        selfie: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
      const att = r.data.attendance;
      const checkInTime = new Date(att.checkIn.time);
      const checkOutTime = new Date(att.checkOut.time);
      const hoursWorked = ((checkOutTime - checkInTime) / 1000 / 60 / 60).toFixed(2);
      log("Emp1 Check-Out", {
        message: r.data.message,
        checkIn: att.checkIn.time,
        checkOut: att.checkOut.time,
        hoursWorked: `${hoursWorked} hrs`,
        location: r.data.location,
      });
    } catch (e) { err("Emp1 Check-Out", e); }
  }

  if (emp2Id) {
    try {
      const r = await axios.post(`${BASE}/attendance/checkout`, {
        employeeId: emp2Id,
        lat: delhiLat + 0.0001,
        long: delhiLong + 0.0001,
        selfie: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
      log("Emp2 Check-Out", { message: r.data.message });
    } catch (e) { err("Emp2 Check-Out", e); }
  }

  // ─── 15. DUPLICATE CHECK-OUT TEST ────────────────────────────────────
  if (emp1Id) {
    try {
      await axios.post(`${BASE}/attendance/checkout`, {
        employeeId: emp1Id, lat: delhiLat, long: delhiLong, selfie: "x",
      });
      console.log("\n❌ Duplicate check-out should have been blocked!");
    } catch (e) {
      log("Duplicate Check-Out Blocked ✓", { message: e.response?.data?.message });
    }
  }

  // ─── 16. ATTENDANCE REPORT (Admin1 today) ────────────────────────────
  try {
    const todayDate = new Date().toISOString().split("T")[0];
    const r = await axios.get(`${BASE}/attendance/report/${admin1Id}?date=${todayDate}`,
      { headers: { Authorization: `Bearer ${admin1Token}` } }
    );
    const { summary, present, absent } = r.data;
    log(`Attendance Report Today (${todayDate})`, summary);
    console.log("  --- Present ---");
    present.forEach(rec => {
      console.log(`  👤 ${rec.name} | In: ${rec.checkInTime || "—"} | Out: ${rec.checkOutTime || "—"} | Worked: ${rec.hoursWorked || "Still working"} | Late: ${rec.isLate ? rec.lateBy : "No"} | Status: ${rec.status}`);
    });
    console.log("  --- Absent ---");
    absent.forEach(rec => console.log(`  👤 ${rec.name} | Status: ${rec.status}`));
  } catch (e) { err("Attendance Report", e); }

  // ─── 17. EMPLOYEE MONTHLY ATTENDANCE ─────────────────────────────────
  if (emp1Id) {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const r = await axios.get(`${BASE}/attendance/employee/${emp1Id}?month=${month}`,
        { headers: { Authorization: `Bearer ${admin1Token}` } }
      );
      const { summary, records, employee: emp } = r.data;
      log(`${emp.name} Monthly Report (${month})`, summary);
      records.forEach(rec => {
        console.log(`  📅 ${rec.date} | In: ${rec.checkInTime || "—"} | Out: ${rec.checkOutTime || "—"} | Worked: ${rec.hoursWorked || "—"} | Late: ${rec.isLate ? rec.lateBy : "No"} | Status: ${rec.status}`);
      });
    } catch (e) { err("Employee Monthly Attendance", e); }
  }

  // ─── 18. TOGGLE ADMIN (deactivate/reactivate) ────────────────────────
  if (admin3Id) {
    try {
      const r = await axios.patch(`${BASE}/superadmin/admins/${admin3Id}/toggle`, {}, { headers: saHeaders });
      log("Toggle Admin3 (deactivate)", r.data);
      // reactivate
      const r2 = await axios.patch(`${BASE}/superadmin/admins/${admin3Id}/toggle`, {}, { headers: saHeaders });
      log("Toggle Admin3 (reactivate)", r2.data);
    } catch (e) { err("Toggle Admin", e); }
  }

  // ─── 19. GET ADMIN QR ─────────────────────────────────────────────────
  if (admin1Id) {
    try {
      const r = await axios.get(`${BASE}/superadmin/admins/${admin1Id}/qr`, { headers: saHeaders });
      log("Admin1 QR Code", { name: r.data.name, company: r.data.companyName, qrLength: r.data.qrCode?.length, qrGenerated: !!r.data.qrCode });
    } catch (e) { err("Get Admin QR", e); }
  }

  console.log("\n\n🎉 ALL TESTS COMPLETED!\n");
}

run().catch(console.error);
