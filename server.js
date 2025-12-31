const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// --- SAFETY NET (Prevents Restart Loops) ---
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR:', err);
    console.log('Keeping process alive to prevent Docker restart loop...');
});

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
// Allow CDN assets (React/Tailwind/Babel) and external images; disable default CSP/COEP that blocked display page
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// --- PATHS ---
const DATA_DIR = path.resolve(__dirname, 'public/data');
const IMAGE_UPLOAD_DIR = path.resolve(__dirname, 'public/uploads/images');
const VIDEO_UPLOAD_DIR = path.resolve(__dirname, 'public/uploads/videos');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const SEED_DEFAULT_IMAGE = path.resolve(__dirname, 'data/default.jpg');
const PUBLIC_DEFAULT_IMAGE = path.join(DATA_DIR, 'default.jpg');

// Ensure directories exist
[DATA_DIR, IMAGE_UPLOAD_DIR, VIDEO_UPLOAD_DIR].forEach(dir => {
    try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) { console.error(`Error creating ${dir}:`, e); }
});

// Seed default image into public/data if present in repo root
try {
    if (fs.existsSync(SEED_DEFAULT_IMAGE) && !fs.existsSync(PUBLIC_DEFAULT_IMAGE)) {
        fs.copyFileSync(SEED_DEFAULT_IMAGE, PUBLIC_DEFAULT_IMAGE);
    }
} catch (e) { console.error('Error seeding default image:', e); }

// Init Data File
try {
    if (!fs.existsSync(NEWS_FILE)) {
        fs.writeFileSync(NEWS_FILE, '[]');
    }
} catch (e) { console.error("Error creating news.json:", e); }

const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGE_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1000) + path.extname(file.originalname))
});
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEO_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1000) + path.extname(file.originalname))
});

const uploadImage = multer({ storage: imageStorage });
const uploadVideo = multer({ storage: videoStorage });

// --- ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const validUser = process.env.ADMIN_USERNAME || 'admin';
    const validPass = process.env.ADMIN_PASSWORD || 'changeme';
    if (username === validUser && password === validPass) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/news', (req, res) => {
    try {
        const data = fs.readFileSync(NEWS_FILE, 'utf8');
        res.json(JSON.parse(data || '[]'));
    } catch (e) { res.json([]); }
});

app.post('/api/news', (req, res) => {
    try {
        const list = req.body;
        for (const item of list) {
            if (item.type === 'Videó') {
                if (!item.headline || !item.image) {
                    return res.status(400).json({ error: "Videó közzétételéhez címsor és fájl megadása is kötelező!" });
                }
                if (item.headline.length > 15) {
                    return res.status(400).json({ error: "Videó címe maximum 15 karakter lehet." });
                }
            } else {
                if (item.headline && item.headline.length > 30) {
                    return res.status(400).json({ error: "A címsor maximum 30 karakter lehet." });
                }
                if (item.body && item.body.length > 500) {
                    return res.status(400).json({ error: "A tartalom maximum 500 karakter lehet." });
                }
            }
        }
        fs.writeFileSync(NEWS_FILE, JSON.stringify(list, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/news/:id', (req, res) => {
    try {
        const idToDelete = parseInt(req.params.id);
        const raw = fs.readFileSync(NEWS_FILE, 'utf8');
        let list = JSON.parse(raw || '[]');
        list = list.filter(item => item.id !== idToDelete);
        fs.writeFileSync(NEWS_FILE, JSON.stringify(list, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Delete failed" });
    }
});

app.delete('/api/news', (req, res) => {
    try {
        fs.writeFileSync(NEWS_FILE, '[]');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Delete all failed" });
    }
});

app.post('/api/upload/image', uploadImage.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ success: true, url: `/uploads/images/${req.file.filename}` });
});

app.post('/api/upload/video', uploadVideo.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ success: true, url: `/uploads/videos/${req.file.filename}` });
});

// Health check for container orchestration
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));