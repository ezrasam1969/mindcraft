const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
require('dotenv').config();

const app = express();

// ─── CORS Configuration ────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Middleware ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

const Registration = require('../models/Registration');

// ─── MongoDB Connection (cached for Vercel serverless) ─────────
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  console.log('✅ MongoDB Connected');
  return cached.conn;
};

// ─── Routes ────────────────────────────────────────────────────

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// POST /api/register — Submit registration
app.post('/api/register', async (req, res) => {
  try {
    await connectDB();
    const { fullName, email, phone, college, department, year, event, teamName, teamSize } = req.body;

    // Duplicate check
    const existing = await Registration.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `⚠️ This email is already registered (ID: ${existing.registrationId})`
      });
    }

    const reg = new Registration({ fullName, email, phone, college, department, year, event, teamName, teamSize });
    await reg.save();

    res.status(201).json({
      success: true,
      message: '🎉 Registration Successful!',
      registrationId: reg.registrationId,
      name: reg.fullName,
      event: reg.event
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '⚠️ Server error. Please try again.' });
  }
});

// GET /api/check/:email — Check if email is already registered
app.get('/api/check/:email', async (req, res) => {
  try {
    await connectDB();
    const reg = await Registration.findOne({ email: req.params.email.toLowerCase() });
    res.json({ exists: !!reg, registrationId: reg?.registrationId || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/registrations — Admin: view all registrations
app.get('/api/registrations', async (req, res) => {
  try {
    await connectDB();
    const all = await Registration.find().sort({ registeredAt: -1 });
    res.json({ success: true, count: all.length, data: all });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/ai-tip — Gemini AI preparation tip
app.post('/api/ai-tip', async (req, res) => {
  try {
    const { eventName, participantName } = req.body;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      return res.json({
        success: true,
        tip: `🚀 Great choice, ${participantName}! For ${eventName}, focus on hands-on practice, review past competition formats, and collaborate with your peers. You've got this!`
      });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a friendly tech-fest mentor. A participant named "${participantName}" just registered for the "${eventName}" event at MINDCRAFT 2026 tech fest. Give them ONE short, personalized, motivating preparation tip (2-3 sentences max). Be specific to the event type. Use an encouraging tone with one emoji at the start.`;

    const result = await model.generateContent(prompt);
    const tip = result.response.text();

    res.json({ success: true, tip });
  } catch (error) {
    console.error('AI Tip error:', error.message);
    res.json({
      success: true,
      tip: `💡 Pro tip: Start preparing early, study past ${req.body.eventName || 'event'} challenges, and don't forget to rest well before the big day!`
    });
  }
});

// ─── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server live at http://localhost:${PORT}`));

module.exports = app; // Required for Vercel serverless