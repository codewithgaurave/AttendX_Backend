const Admin = require("../models/Admin");
const MasterAdmin = require("../models/MasterAdmin");

// POST /api/admin/request-renewal - Admin requests renewal
exports.requestRenewal = async (req, res) => {
  try {
    const { message } = req.body;
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.isAccountValid) {
      return res.status(400).json({ message: "Account is still valid" });
    }

    if (admin.renewalRequested && !admin.renewalApproved) {
      return res.status(400).json({ message: "Renewal request already pending" });
    }

    await admin.requestRenewal(message);
    
    res.json({ 
      message: "Renewal request submitted successfully",
      requestDate: admin.renewalRequestDate
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/renewal-status - Check renewal status
exports.getRenewalStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      isExpired: admin.isExpired,
      validUntil: admin.validUntil,
      renewalRequested: admin.renewalRequested,
      renewalRequestDate: admin.renewalRequestDate,
      renewalApproved: admin.renewalApproved,
      renewalApprovedDate: admin.renewalApprovedDate,
      canScanAttendance: admin.canScanAttendance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/master/renewal-requests - Get all pending renewal requests
exports.getPendingRenewals = async (req, res) => {
  try {
    const renewalRequests = await Admin.find({
      renewalRequested: true,
      renewalApproved: false
    })
    .populate('createdBy', 'name email company')
    .populate('renewalRequestedBy', 'name email company')
    .sort({ renewalRequestDate: -1 });

    // Calculate demo usage for each admin
    const requestsWithDemoUsage = renewalRequests.map(admin => {
      let totalDemoUsed = 0;
      if (admin.accountType === 'demo' || !admin.accountType) {
        const startDate = admin.validFrom || admin.createdAt;
        const currentDate = new Date();
        const endDate = admin.validUntil < currentDate ? admin.validUntil : currentDate;
        totalDemoUsed = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        totalDemoUsed = Math.max(0, totalDemoUsed);
      }
      
      const adminObj = admin.toObject();
      adminObj.totalDemoUsed = totalDemoUsed;
      return adminObj;
    });

    res.json(requestsWithDemoUsage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/master/approve-renewal/:adminId - Approve renewal request
exports.approveRenewal = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { 
      validityDays = 30, 
      maxEmployees, 
      maxOffices, 
      paymentAmount, 
      paymentMethod 
    } = req.body;
    
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (!admin.renewalRequested) {
      return res.status(400).json({ message: "No renewal request found" });
    }

    // Convert to paid account and extend validity
    admin.accountType = 'paid';
    admin.validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
    admin.isExpired = false;
    admin.canScanAttendance = true;
    admin.isActive = true;
    admin.renewalRequested = false;
    admin.renewalApproved = true;
    admin.renewalApprovedDate = new Date();
    admin.renewalApprovedBy = req.user.id;
    admin.lastValidityCheck = new Date();
    
    // Update limits if provided
    if (maxEmployees) {
      admin.maxEmployees = parseInt(maxEmployees);
    }
    if (maxOffices) {
      admin.maxOffices = parseInt(maxOffices);
    }
    
    // Update payment info if provided
    if (paymentAmount) {
      admin.paymentAmount = parseFloat(paymentAmount);
      admin.lastPaymentDate = new Date();
    }
    if (paymentMethod) {
      admin.paymentMethod = paymentMethod;
    }
    
    await admin.save();
    
    res.json({ 
      message: "Renewal approved and upgraded to paid account successfully",
      newValidUntil: admin.validUntil,
      accountType: admin.accountType,
      maxEmployees: admin.maxEmployees,
      maxOffices: admin.maxOffices
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/master/reject-renewal/:adminId - Reject renewal request
exports.rejectRenewal = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { reason } = req.body;
    
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Reset renewal request fields
    admin.renewalRequested = false;
    admin.renewalApproved = false;
    admin.renewalMessage = null;
    admin.renewalRequestedBy = null;
    admin.renewalRequestDate = null;
    
    // Add rejection info
    admin.renewalRejected = true;
    admin.renewalRejectedDate = new Date();
    admin.renewalRejectedBy = req.user.id;
    admin.renewalRejectionReason = reason || "No reason provided";
    
    await admin.save();
    
    res.json({ 
      message: "Renewal request rejected",
      reason: reason || "No reason provided"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};