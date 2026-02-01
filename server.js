const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

const fsPromises = fs.promises;

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
const DOC_UPLOAD_DIR = path.resolve(__dirname, 'public/uploads/docs');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const SEED_DEFAULT_IMAGE = path.resolve(__dirname, 'data/default.jpg');
const PUBLIC_DEFAULT_IMAGE = path.join(DATA_DIR, 'default.jpg');
const MAX_BODY_LENGTH = 2000;
const PUBLIC_ROOT = path.resolve(__dirname, 'public');

// Ensure directories exist
[DATA_DIR, IMAGE_UPLOAD_DIR, VIDEO_UPLOAD_DIR, DOC_UPLOAD_DIR].forEach(dir => {
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

// --- HELPERS ---
const resolveUploadPath = (urlPath) => {
    if (!urlPath || !urlPath.startsWith('/uploads/')) return null;
    const safeRelative = path.normalize(urlPath.replace(/^\//, ''));
    const absolutePath = path.join(PUBLIC_ROOT, safeRelative);
    return absolutePath.startsWith(PUBLIC_ROOT) ? absolutePath : null;
};

const deleteFileIfExists = async (absolutePath) => {
    if (!absolutePath) return;
    try {
        await fsPromises.unlink(absolutePath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Failed to delete file:', absolutePath, err);
        }
    }
};

const cleanupMedia = async (item) => {
    const targets = [];

    if (item.image) {
        const imgPath = resolveUploadPath(item.image);
        if (imgPath) targets.push(imgPath);
    }

    if (item.attachment) {
        const attachmentPath = resolveUploadPath(item.attachment);
        if (attachmentPath) targets.push(attachmentPath);
    }

    for (const filePath of targets) {
        await deleteFileIfExists(filePath);
    }
};

const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGE_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1000) + path.extname(file.originalname))
});
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEO_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1000) + path.extname(file.originalname))
});
const docStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, DOC_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1000) + path.extname(file.originalname))
});

const uploadImage = multer({ storage: imageStorage });
const uploadVideo = multer({ storage: videoStorage });
const uploadDoc = multer({ storage: docStorage });

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
                if (item.body && item.body.length > MAX_BODY_LENGTH) {
                    return res.status(400).json({ error: `A tartalom maximum ${MAX_BODY_LENGTH} karakter lehet.` });
                }
            }
        }
        fs.writeFileSync(NEWS_FILE, JSON.stringify(list, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/news/:id', async (req, res) => {
    try {
        const idToDelete = parseInt(req.params.id, 10);
        const raw = await fsPromises.readFile(NEWS_FILE, 'utf8');
        const list = JSON.parse(raw || '[]');

        const itemToDelete = list.find(item => item.id === idToDelete);
        if (!itemToDelete) {
            return res.status(404).json({ error: 'Item not found' });
        }

        await cleanupMedia(itemToDelete);

        const updated = list.filter(item => item.id !== idToDelete);
        await fsPromises.writeFile(NEWS_FILE, JSON.stringify(updated, null, 2));
        res.json({ success: true });
    } catch (e) {
        console.error('Delete failed:', e);
        res.status(500).json({ error: "Delete failed" });
    }
});

app.delete('/api/news', async (req, res) => {
    try {
        const raw = await fsPromises.readFile(NEWS_FILE, 'utf8');
        const list = JSON.parse(raw || '[]');

        await Promise.all(list.map(item => cleanupMedia(item)));

        await fsPromises.writeFile(NEWS_FILE, '[]');
        res.json({ success: true });
    } catch (e) {
        console.error('Delete all failed:', e);
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

app.post('/api/upload/document', uploadDoc.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file' });

        const filePath = req.file.path;
        const ext = path.extname(req.file.originalname || '').toLowerCase();

        let text = '';
        let tableData = null;

        if (ext === '.pdf') {
            const data = await fsPromises.readFile(filePath);
            const parsed = await pdfParse(data);
            text = (parsed.text || '').trim();
        } else if (ext === '.docx') {
            const parsed = await mammoth.extractRawText({ path: filePath });
            text = (parsed.value || '').trim();
        } else if (ext === '.txt') {
            text = (await fsPromises.readFile(filePath, 'utf8')).toString();
        } else if (ext === '.xlsx' || ext === '.csv') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            tableData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) || [];
        } else {
            return res.status(400).json({ error: 'Nem támogatott dokumentumtípus. (pdf, docx, xlsx, csv, txt)' });
        }

        // Avoid writing unusably long content back to the caller
        if (text && text.length > MAX_BODY_LENGTH) {
            text = text.slice(0, MAX_BODY_LENGTH);
        }

        return res.json({ success: true, url: `/uploads/docs/${req.file.filename}`, text, tableData });
    } catch (e) {
        console.error('Document upload failed:', e);
        return res.status(500).json({ error: 'Dokumentum feldolgozása sikertelen.' });
    }
});

// Health check for container orchestration
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));