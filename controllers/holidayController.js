const Holiday = require("../models/Holiday");

exports.getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = { adminId: req.user.id };
    if (year) filter.date = { $regex: `^${year}` };
    const holidays = await Holiday.find(filter).sort({ date: 1 });
    res.json(holidays);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createHoliday = async (req, res) => {
  try {
    const { name, date, type } = req.body;
    if (!name || !date) return res.status(400).json({ message: "Name and date required" });
    const holiday = await Holiday.create({ adminId: req.user.id, name, date, type });
    res.status(201).json(holiday);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Holiday already exists on this date" });
    res.status(500).json({ message: err.message });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOneAndUpdate(
      { _id: req.params.id, adminId: req.user.id },
      req.body, { new: true }
    );
    if (!holiday) return res.status(404).json({ message: "Not found" });
    res.json(holiday);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteHoliday = async (req, res) => {
  try {
    await Holiday.findOneAndDelete({ _id: req.params.id, adminId: req.user.id });
    res.json({ message: "Holiday deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
