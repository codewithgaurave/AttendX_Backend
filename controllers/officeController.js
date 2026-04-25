const Office = require("../models/Office");
const Admin = require("../models/Admin");
const { validateOfficeLocation, geocodeAddress } = require("../utils/geofence");

// POST /api/admin/offices
exports.createOffice = async (req, res) => {
  try {
    // Check admin validity and limits
    const admin = await Admin.findById(req.user.id);
    if (!admin || !admin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please renew your subscription.",
        expired: true
      });
    }

    const currentOffices = await Office.countDocuments({ adminId: req.user.id });
    if (currentOffices >= admin.maxOffices) {
      return res.status(400).json({ 
        message: `Maximum ${admin.maxOffices} offices allowed for your ${admin.accountType} account`,
        limitReached: true
      });
    }

    const { name, address, lat, long, radius } = req.body;

    // Validate lat/long on Google Maps
    const geoValidation = await validateOfficeLocation(lat, long);
    if (!geoValidation.valid)
      return res.status(400).json({ message: "Invalid office location coordinates" });

    const office = await Office.create({
      adminId: req.user.id,
      name,
      address: geoValidation.address || address,
      lat,
      long,
      radius,
      placeId: geoValidation.placeId,
    });

    res.status(201).json(office);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/offices
exports.getOffices = async (req, res) => {
  try {
    // Check admin validity
    const admin = await Admin.findById(req.user.id);
    if (!admin || !admin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please renew your subscription.",
        expired: true,
        accountType: admin?.accountType,
        validUntil: admin?.validUntil
      });
    }

    const offices = await Office.find({ adminId: req.user.id });
    
    res.json({ 
      offices, 
      subscription: {
        accountType: admin.accountType,
        validUntil: admin.validUntil,
        maxOffices: admin.maxOffices,
        currentOffices: offices.length,
        isExpired: admin.isExpired
      }
    });
  } catch (err) {
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

// DELETE /api/admin/offices/:id
exports.deleteOffice = async (req, res) => {
  try {
    await Office.findOneAndDelete({ _id: req.params.id, adminId: req.user.id });
    res.json({ message: "Office deleted" });
  } catch (err) {
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
