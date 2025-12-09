import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as uploadController from '../controllers/uploadController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Configure multer for memory storage (ImageKit uploads from buffer)
 * We no longer save to disk - files are uploaded directly to ImageKit
 */
const storage = multer.memoryStorage();

// File filter (images only)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF, and BMP are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10 // Max 10 files in batch upload
    }
});

/**
 * Upload Routes - ImageKit Cloud Storage
 * All routes require authentication and admin privileges
 */

// Upload single file to ImageKit
// Query params: ?type=product|review|variant|user (determines folder)
router.post(
    '/upload',
    authenticateToken,
    requireAdmin,
    upload.single('file'),
    uploadController.uploadFile
);

// Upload image from URL to ImageKit
// Body: { imageUrl: 'https://example.com/image.jpg', type: 'product' }
router.post(
    '/upload/url',
    authenticateToken,
    requireAdmin,
    uploadController.uploadFromUrlEndpoint
);

// Batch upload multiple files to ImageKit
// Query params: ?type=product|review|variant|user
router.post(
    '/upload/batch',
    authenticateToken,
    requireAdmin,
    upload.array('files', 10),
    uploadController.batchUploadFiles
);

// Check if file is duplicate before uploading
// Returns existing file info if duplicate found
router.post(
    '/upload/check-hash',
    authenticateToken,
    requireAdmin,
    upload.single('file'),
    uploadController.checkDuplicateHash
);

// Delete file from ImageKit
// Body: { fileId: 'abc123' } or { url: 'https://ik.imagekit.io/...' }
router.delete(
    '/upload',
    authenticateToken,
    requireAdmin,
    uploadController.deleteFile
);

export default router;
