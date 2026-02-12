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
const PORT = process.env.PORT ? Number(process.env.PORT) : 80;

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
const MAX_BODY_LENGTH = 800;
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');
const PUBLIC_ROOT = path.resolve(__dirname, 'public');

// Ensure directories exist
const ensureDir = (dir) => {
    try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return true;
    } catch (e) {
        console.error(`Error creating ${dir}:`, e);
        return false;
    }
};

[DATA_DIR, IMAGE_UPLOAD_DIR, VIDEO_UPLOAD_DIR, DOC_UPLOAD_DIR].forEach(ensureDir);

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
    if (!fs.existsSync(SETTINGS_FILE)) {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ showClock: true, theme: 'dark' }, null, 2));
    }
    if (!fs.existsSync(AUDIT_FILE)) {
        fs.writeFileSync(AUDIT_FILE, '[]');
    }
    if (!fs.existsSync(USERS_FILE)) {
        const defaultUser = {
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'changeme',
            role: 'admin'
        };
        fs.writeFileSync(USERS_FILE, JSON.stringify([defaultUser], null, 2));
    }
} catch (e) { console.error("Error creating news.json:", e); }

// --- HELPERS ---
const resolveUploadPath = (urlPath) => {
    if (!urlPath || !urlPath.startsWith('/uploads/')) return null;
    const safeRelative = path.normalize(urlPath.replace(/^\//, ''));
    const absolutePath = path.join(PUBLIC_ROOT, safeRelative);
    return absolutePath.startsWith(PUBLIC_ROOT) ? absolutePath : null;
};

const loadSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
            const parsed = JSON.parse(raw || '{}');
            return {
                showClock: parsed.showClock !== false,
                theme: parsed.theme === 'light' ? 'light' : 'dark'
            };
        }
    } catch (e) {
        console.error('Failed to read settings:', e);
    }
    return { showClock: true, theme: 'dark' };
};

const loadAudit = () => {
    try {
        if (fs.existsSync(AUDIT_FILE)) {
            const raw = fs.readFileSync(AUDIT_FILE, 'utf8');
            return JSON.parse(raw || '[]');
        }
    } catch (e) {
        console.error('Failed to read audit:', e);
    }
    return [];
};

const appendAudit = (entry) => {
    try {
        const list = loadAudit();
        const payload = {
            type: entry.type || 'event',
            user: entry.user || 'ismeretlen',
            headline: entry.headline || '',
            message: entry.message || '',
            timestamp: new Date().toISOString()
        };
        list.unshift(payload);
        if (list.length > 500) list.length = 500; // cap to avoid unbounded growth
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(list, null, 2));
    } catch (e) {
        console.error('Failed to append audit:', e);
    }
};

const normalizeRole = (role) => {
    const allowed = ['admin', 'user', 'monitor', 'superadmin'];
    return allowed.includes(role) ? role : 'admin';
};

const loadUsers = () => {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const raw = fs.readFileSync(USERS_FILE, 'utf8');
            const users = JSON.parse(raw || '[]');
            return users.map(u => ({
                username: u.username,
                password: u.password,
                role: u.username === 'sziszi' ? 'superadmin' : normalizeRole(u.role)
            }));
        }
    } catch (e) {
        console.error('Failed to read users:', e);
    }
    return [];
};

const saveUsers = (users) => {
    const safe = users.map(u => ({
        username: u.username,
        password: u.password,
        role: u.username === 'sziszi' ? 'superadmin' : normalizeRole(u.role)
    }));
    fs.writeFileSync(USERS_FILE, JSON.stringify(safe, null, 2));
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
    const targets = new Set();

    if (item.image) {
        const imgPath = resolveUploadPath(item.image);
        if (imgPath) targets.add(imgPath);
    }

    if (Array.isArray(item.images)) {
        item.images.forEach((img) => {
            const imgPath = resolveUploadPath(img);
            if (imgPath) targets.add(imgPath);
        });
    }

    if (item.attachment) {
        const attachmentPath = resolveUploadPath(item.attachment);
        if (attachmentPath) targets.add(attachmentPath);
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

// Ensure upload destinations exist before handling files
const ensureUploadRoots = () => {
    const okImages = ensureDir(IMAGE_UPLOAD_DIR);
    const okVideos = ensureDir(VIDEO_UPLOAD_DIR);
    const okDocs = ensureDir(DOC_UPLOAD_DIR);
    return okImages && okVideos && okDocs;
};

// --- ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();
    const match = users.find(u => u.username === username && u.password === password);
    if (match) {
        const effectiveRole = match.username === 'sziszi' ? 'superadmin' : normalizeRole(match.role);
        appendAudit({ type: 'login', user: username, message: 'Sikeres bejelentkezés' });
        res.json({ success: true, role: effectiveRole });
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

app.get('/api/settings', (_req, res) => {
    const settings = loadSettings();
    res.json(settings);
});

app.post('/api/settings', (req, res) => {
    try {
        const { showClock, theme } = req.body || {};
        const safeSettings = {
            showClock: showClock !== false,
            theme: theme === 'light' ? 'light' : 'dark'
        };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(safeSettings, null, 2));
        res.json(safeSettings);
    } catch (e) {
        console.error('Failed to save settings:', e);
        res.status(500).json({ error: 'Beállítások mentése sikertelen.' });
    }
});

// --- AUDIT LOG ---
app.get('/api/audit', (_req, res) => {
    const list = loadAudit();
    res.json(list);
});

app.post('/api/audit', (req, res) => {
    const { type, user, headline, message } = req.body || {};
    appendAudit({ type, user, headline, message });
    res.json({ success: true });
});

// --- USER MANAGEMENT ---
app.get('/api/users', (_req, res) => {
    const users = loadUsers();
    res.json(users.map(u => ({ username: u.username, role: normalizeRole(u.role) })));
});

app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Felhasználónév és jelszó kötelező.' });
    const users = loadUsers();
    if (users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'Már létező felhasználónév.' });
    }
    const nextRole = username === 'sziszi' ? 'superadmin' : normalizeRole(role);
    if (nextRole === 'superadmin' && username !== 'sziszi') {
        return res.status(400).json({ error: 'A superadmin szerep csak a sziszi felhasználónak engedélyezett.' });
    }
    users.push({ username, password, role: nextRole });
    saveUsers(users);
    res.json({ success: true });
});

app.put('/api/users/:username', (req, res) => {
    const current = req.params.username;
    const { username, password, role } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Felhasználónév és jelszó kötelező.' });
    const users = loadUsers();
    const idx = users.findIndex(u => u.username === current);
    if (idx === -1) return res.status(404).json({ error: 'Felhasználó nem található.' });
    if (current !== username && users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'A megadott új felhasználónév már foglalt.' });
    }
    const nextRole = username === 'sziszi' ? 'superadmin' : normalizeRole(role);
    if (nextRole === 'superadmin' && username !== 'sziszi') {
        return res.status(400).json({ error: 'A superadmin szerep csak a sziszi felhasználónak engedélyezett.' });
    }
    users[idx] = { username, password, role: nextRole };
    saveUsers(users);
    res.json({ success: true });
});

app.delete('/api/users/:username', (req, res) => {
    const target = req.params.username;
    if (target === 'sziszi') {
        return res.status(400).json({ error: 'A sziszi felhasználó nem törölhető.' });
    }
    const users = loadUsers();
    const updated = users.filter(u => u.username !== target);
    if (updated.length === users.length) {
        return res.status(404).json({ error: 'Felhasználó nem található.' });
    }
    if (updated.length === 0) {
        return res.status(400).json({ error: 'Nem törölhető az utolsó felhasználó.' });
    }
    saveUsers(updated);
    res.json({ success: true });
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
            } else if (item.type === 'Képek' || item.type === 'Kép') {
                if (item.headline && item.headline.length > 50) {
                    return res.status(400).json({ error: "A címsor maximum 50 karakter lehet Képek típusnál." });
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

app.post('/api/upload/image', (req, res) => {
    if (!ensureUploadRoots()) return res.status(500).json({ error: 'Feltöltési könyvtár nem hozható létre.' });
    uploadImage.single('image')(req, res, (err) => {
        if (err) {
            console.error('Image upload failed:', err);
            return res.status(500).json({ error: 'Kép feltöltése sikertelen.' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file' });
        res.json({ success: true, url: `/uploads/images/${req.file.filename}` });
    });
});

app.post('/api/upload/video', (req, res) => {
    if (!ensureUploadRoots()) return res.status(500).json({ error: 'Feltöltési könyvtár nem hozható létre.' });
    uploadVideo.single('video')(req, res, (err) => {
        if (err) {
            console.error('Video upload failed:', err);
            return res.status(500).json({ error: 'Videó feltöltése sikertelen.' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file' });
        res.json({ success: true, url: `/uploads/videos/${req.file.filename}` });
    });
});

app.post('/api/upload/document', async (req, res) => {
    if (!ensureUploadRoots()) return res.status(500).json({ error: 'Feltöltési könyvtár nem hozható létre.' });

    uploadDoc.single('document')(req, res, async (err) => {
        if (err) {
            console.error('Document upload failed:', err);
            return res.status(500).json({ error: 'Dokumentum feltöltése sikertelen.' });
        }

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
            console.error('Document processing failed:', e);
            return res.status(500).json({ error: 'Dokumentum feldolgozása sikertelen.' });
        }
    });
});

// Health check for container orchestration
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));