import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import Book from '../models/Book.js';
import BookPage from '../models/BookPage.js';
import ReadingProgress from '../models/ReadingProgress.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseEpub } from '../services/epubParser.js';

const router = Router();

const upload = multer({
  dest: '/tmp/opencode/epub-uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/epub+zip' || file.originalname.endsWith('.epub')) {
      cb(null, true);
    } else {
      cb(new Error('Only EPUB files are accepted'));
    }
  },
});

// -- Helpers --

const bucketName = 'epubs';

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName });
}

// -- Routes --

// GET /api/books — get current book metadata + both users' progress
router.get('/', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findOne({ coupleId: req.user.coupleId }).sort({ uploadedAt: -1 });
    if (!book) return res.json({ book: null });

    const [progress, counterpartProgress] = await Promise.all([
      ReadingProgress.findOne({ bookId: book._id, userId: req.user.id, coupleId: req.user.coupleId }),
      ReadingProgress.findOne({ bookId: book._id, userId: { $ne: req.user.id }, coupleId: req.user.coupleId }),
    ]);

    let counterpart = null;
    if (counterpartProgress) {
      const user = await User.findById(counterpartProgress.userId).select('displayName username');
      if (user) {
        counterpart = {
          displayName: user.displayName || user.username,
          currentPage: counterpartProgress.currentPage,
        };
      }
    }

    return res.json({
      book: {
        _id: book._id,
        title: book.title,
        author: book.author,
        totalPages: book.totalPages,
        uploadedBy: book.uploadedBy,
        uploadedAt: book.uploadedAt,
      },
      progress: progress ? { currentPage: progress.currentPage } : { currentPage: 0 },
      counterpart,
    });
  } catch (err) {
    console.error('Get book error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/books/page/:num — get page content (0-indexed)
router.get('/page/:num', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findOne({ coupleId: req.user.coupleId }).sort({ uploadedAt: -1 });
    if (!book) return res.status(404).json({ error: 'No book uploaded' });

    const pageNum = parseInt(req.params.num, 10);
    if (isNaN(pageNum) || pageNum < 0 || pageNum >= book.totalPages) {
      return res.status(400).json({ error: `Page must be 0–${book.totalPages - 1}` });
    }

    const page = await BookPage.findOne({ bookId: book._id, pageNumber: pageNum, coupleId: req.user.coupleId });
    if (!page) return res.status(404).json({ error: 'Page not found' });

    res.json({ content: page.content, pageNumber: pageNum, totalPages: book.totalPages });
  } catch (err) {
    console.error('Get page error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/books/progress — get user's reading progress
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findOne({ coupleId: req.user.coupleId }).sort({ uploadedAt: -1 });
    if (!book) return res.json({ currentPage: 0 });

    const progress = await ReadingProgress.findOne({ bookId: book._id, userId: req.user.id, coupleId: req.user.coupleId });
    res.json({ currentPage: progress?.currentPage ?? 0 });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/books/progress — update user's reading progress
router.put('/progress', authMiddleware, async (req, res) => {
  try {
    const { currentPage } = req.body;
    const book = await Book.findOne({ coupleId: req.user.coupleId }).sort({ uploadedAt: -1 });
    if (!book) return res.status(404).json({ error: 'No book uploaded' });

    if (currentPage === undefined || currentPage < 0 || currentPage >= book.totalPages) {
      return res.status(400).json({ error: `currentPage must be 0–${book.totalPages - 1}` });
    }

    const progress = await ReadingProgress.findOneAndUpdate(
      { bookId: book._id, userId: req.user.id, coupleId: req.user.coupleId },
      { $set: { currentPage, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ currentPage: progress.currentPage });
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/books/upload — upload EPUB, parse, store
router.post('/upload', authMiddleware, upload.single('epub'), async (req, res) => {
  let tmpPath = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    tmpPath = req.file.path;

    // Check: only one book allowed
    const existing = await Book.findOne({ coupleId: req.user.coupleId });
    if (existing) {
      await fs.unlink(tmpPath).catch(() => {});
      return res.status(400).json({ error: 'A book already exists. Delete it first before uploading a new one.' });
    }

    // Read file
    const buffer = await fs.readFile(tmpPath);

    // Parse EPUB
    const { title, author, pages } = parseEpub(buffer);

    // Store file in GridFS
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: 'application/epub+zip',
    });
    await new Promise((resolve, reject) => {
      uploadStream.end(buffer);
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });
    const fileId = uploadStream.id;

    // Create book record
    const book = await Book.create({
      title,
      author,
      totalPages: pages.length,
      uploadedBy: req.user.id,
      gridfsId: fileId,
      coupleId: req.user.coupleId,
    });

    // Batch insert pages
    const pageDocs = pages.map((content, i) => ({
      bookId: book._id,
      pageNumber: i,
      content,
      coupleId: req.user.coupleId,
    }));
    await BookPage.insertMany(pageDocs);

    // Create initial progress for uploading user
    await ReadingProgress.create({
      bookId: book._id,
      userId: req.user.id,
      currentPage: 0,
      coupleId: req.user.coupleId,
    });

    // Clean up temp file
    await fs.unlink(tmpPath).catch(() => {});

    res.status(201).json({
      book: {
        _id: book._id,
        title: book.title,
        author: book.author,
        totalPages: book.totalPages,
      },
      currentPage: 0,
    });
  } catch (err) {
    if (tmpPath) await fs.unlink(tmpPath).catch(() => {});
    console.error('Upload error:', err);
    res.status(400).json({ error: err.message || 'Failed to upload EPUB' });
  }
});

// DELETE /api/books — delete the book, all pages, progress, and GridFS file
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findOne({ coupleId: req.user.coupleId }).sort({ uploadedAt: -1 });
    if (!book) return res.status(404).json({ error: 'No book to delete' });

    const bookId = book._id;

    // Delete pages
    await BookPage.deleteMany({ bookId, coupleId: req.user.coupleId });

    // Delete all reading progress for this book
    await ReadingProgress.deleteMany({ bookId, coupleId: req.user.coupleId });

    // Delete GridFS file
    if (book.gridfsId) {
      const bucket = getBucket();
      await bucket.delete(book.gridfsId).catch(() => {});
    }

    // Delete book record
    await Book.findOneAndDelete({ _id: bookId, coupleId: req.user.coupleId });

    res.json({ message: 'Book deleted' });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
