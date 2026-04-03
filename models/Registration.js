const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  fullName:       { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true },
  phone:          { type: String, required: true },
  college:        { type: String, required: true },
  department:     { type: String, required: true },
  year:           { type: String, required: true },
  event:          { type: String, required: true },
  teamName:       { type: String, default: '' },
  teamSize:       { type: Number, default: 1 },
  registrationId: { type: String, unique: true },
  status:         { type: String, default: 'confirmed' },
  registeredAt:   { type: Date, default: Date.now }
});

// Auto-generate registration ID
registrationSchema.pre('save', function (next) {
  if (!this.registrationId) {
    this.registrationId = 'MC2026-' + Date.now().toString().slice(-6);
  }
  next();
});

module.exports = mongoose.model('Registration', registrationSchema);