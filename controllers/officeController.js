const Office = require("../models/Office");
const Admin = require("../models/Admin");
const { validateOfficeLocation, geocodeAddress } = require("../utils/geofence");

// POST /api/admin/offices
exports.createOffice = async (req, res) => {
  try {
    // Check admin validity and limits
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    console.log('Admin account check:', {
      id: admin._id,
      accountType: admin.accountType,
      isActive: admin.isActive,
      isExpired: admin.isExpired,
      validUntil: admin.validUntil,
      isAccountValid: admin.isAccountValid,
      maxOffices: admin.maxOffices
    });

    if (!admin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please renew your subscription.",
        expired: true,
        accountType: admin.accountType,
        validUntil: admin.validUntil
      });
    }

    const currentOffices = await Office.countDocuments({ adminId: req.user.id });
    console.log('Office count check:', { currentOffices, maxOffices: admin.maxOffices });
    
    if (currentOffices >= admin.maxOffices) {
      return res.status(400).json({ 
        message: `Maximum ${admin.maxOffices} offices allowed for your ${admin.accountType} account. Current: ${currentOffices}/${admin.maxOffices}`,
        limitReached: true,
        currentCount: currentOffices,
        maxAllowed: admin.maxOffices,
        accountType: admin.accountType
      });
    }

    const { name, address, lat, long, radius } = req.body;
    console.log('Office creation data:', { name, address, lat, long, radius });

    // Validate required fields
    if (!name || !lat || !long) {
      return res.status(400).json({ message: "Name, latitude, and longitude are required" });
    }

    // Validate lat/long ranges
    if (lat < -90 || lat > 90 || long < -180 || long > 180) {
      return res.status(400).json({ message: "Invalid latitude/longitude values" });
    }

    // Try to validate lat/long on Google Maps (optional)
    let geoValidation = { valid: true, address: address };
    try {
      geoValidation = await validateOfficeLocation(lat, long);
      console.log('Geo validation result:', geoValidation);
    } catch (error) {
      console.log('Google Maps validation failed, proceeding without validation:', error.message);
    }

    const office = await Office.create({
      adminId: req.user.id,
      name,
      address: geoValidation.address || address,
      lat: parseFloat(lat),
      long: parseFloat(long),
      radius: parseInt(radius) || 100,
      placeId: geoValidation.placeId,
    });

    console.log('Office created successfully:', office._id);
    res.status(201).json(office);
  } catch (err) {
    console.error('Office creation error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/offices
exports.getOffices = async (req, res) => {
  try {
    // Check admin validity
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    console.log('Getting offices for admin:', {
      adminId: req.user.id,
      adminEmail: admin.email,
      accountType: admin.accountType
    });

    if (!admin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please renew your subscription.",
        expired: true,
        accountType: admin?.accountType,
        validUntil: admin?.validUntil
      });
    }

    const offices = await Office.find({ adminId: req.user.id });
    console.log('Found offices:', offices.length, offices.map(o => ({ id: o._id, name: o.name })));
    
    res.json(offices);
  } catch (err) {
    console.error('Get offices error:', err);
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/offices/:id
exports.updateOffice = async (req, res) => {
  try {
    const { lat, long } = req.body;

    // Re-validate if lat/long changed
    if (lat && long) {
      const geoValidation = await validateOfficeLocation(lat, long);
      if (!geoValidation.valid)
        return res.status(400).json({ message: "Invalid office location coordinates" });
      req.body.address = geoValidation.address;
      req.body.placeId = geoValidation.placeId;
    }

    const office = await Office.findOneAndUpdate(
      { _id: req.params.id, adminId: req.user.id },
      req.body,
      { new: true }
    );
    if (!office) return res.status(404).json({ message: "Office not found" });
    res.json(office);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/offices/clear-all (for debugging)
exports.clearAllOffices = async (req, res) => {
  try {
    const result = await Office.deleteMany({ adminId: req.user.id });
    console.log('Cleared offices for admin:', req.user.id, 'Count:', result.deletedCount);
    res.json({ message: `Cleared ${result.deletedCount} offices`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Clear offices error:', err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/offices/:id
exports.deleteOffice = async (req, res) => {
  try {
    const office = await Office.findOneAndDelete({ _id: req.params.id, adminId: req.user.id });
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }
    console.log('Deleted office:', office.name, 'for admin:', req.user.id);
    res.json({ message: "Office deleted" });
  } catch (err) {
    console.error('Delete office error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/offices/geocode  → address se lat/long dhundo
exports.geocodeOfficeAddress = async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ message: "Address required" });

    const result = await geocodeAddress(address);
    if (!result) return res.status(404).json({ message: "Location not found" });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
