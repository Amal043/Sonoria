import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load Environment Variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[Sonoria Server] ERROR: JWT_SECRET env variable is missing.');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[Sonoria Server] ERROR: MONGODB_URI env variable is missing.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('[Sonoria Server] Connected to MongoDB Atlas successfully.'))
  .catch(err => {
    console.error('[Sonoria Server] Database connection error:', err);
  });

// Mongoose User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  likedSongs: { type: Array, default: [] },
  playlists: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// JWT Auth Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// AUTH API ENDPOINTS
// ----------------------------------------------------

// 1. Signup Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save User
    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      likedSongs: [],
      playlists: []
    });

    const savedUser = await newUser.save();

    // Create JWT
    const token = jwt.sign({ id: savedUser._id, email: savedUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        username: savedUser.username,
        email: savedUser.email,
        likedSongs: savedUser.likedSongs,
        playlists: savedUser.playlists
      }
    });

  } catch (error) {
    console.error('[Server Error] Signup:', error);
    res.status(500).json({ error: 'An error occurred during signup.' });
  }
});

// 2. Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find User
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Create JWT
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        username: user.username,
        email: user.email,
        likedSongs: user.likedSongs,
        playlists: user.playlists
      }
    });

  } catch (error) {
    console.error('[Server Error] Login:', error);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// 3. Get User Profile Route
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({
      user: {
        username: user.username,
        email: user.email,
        likedSongs: user.likedSongs,
        playlists: user.playlists
      }
    });
  } catch (error) {
    console.error('[Server Error] Get Profile:', error);
    res.status(500).json({ error: 'An error occurred fetching profile.' });
  }
});

// 4. Sync User Playlists and Liked Songs Route
app.post('/api/user/sync', authenticateToken, async (req, res) => {
  try {
    const { likedSongs, playlists } = req.body;

    // Validate structure (optional, but keep it simple)
    const updateFields = {};
    if (likedSongs !== undefined) updateFields.likedSongs = likedSongs;
    if (playlists !== undefined) updateFields.playlists = playlists;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('[Server Error] Sync User Data:', error);
    res.status(500).json({ error: 'An error occurred syncing data.' });
  }
});

// ----------------------------------------------------
// PRODUCTION BUILD STATIC SERVER FALLBACK
// ----------------------------------------------------
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Simple check api
  app.get('/', (req, res) => {
    res.send('[Sonoria API Backend] Running successfully on port ' + PORT);
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`[Sonoria Server] Running at http://localhost:${PORT}`);
});
