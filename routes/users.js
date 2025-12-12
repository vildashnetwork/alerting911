const express = require('express');
const router = express.Router();
const Report = require('../models/users.js');
const Owner = require('../models/owner.js');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// escape helper (optional)
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]); }

// placeholder reverse geocode (implement if you want)
async function reverseGeocodeGoogle(lat, lng) { return null; }
async function reverseGeocodeNominatim(lat, lng) { return null; }

// GET /api/users/owners
router.get('/owners', async (req, res) => {
    try {
        const owners = await Owner.find().lean();
        res.json({ ok: true, owners });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/users/report
router.post('/report', async (req, res) => {
    try {
        const upload = req.upload; // from server.js
        upload.single('image')(req, res, async function (err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });

            const { ownerId, reporterName, reporterPhone, lat, lng, accuracy } = req.body;
            if (!ownerId) return res.status(400).json({ ok: false, error: 'ownerId required' });

            let imageUrl = '', imagePublicId = '';
            if (req.file && req.file.buffer && process.env.CLOUDINARY_API_KEY) {
                const result = await new Promise((resolve, reject) => {
                    const cldStream = cloudinary.uploader.upload_stream({ folder: 'trash_reports' }, (err, result) => {
                        if (err) reject(err); else resolve(result);
                    });
                    streamifier.createReadStream(req.file.buffer).pipe(cldStream);
                });
                imageUrl = result.secure_url;
                imagePublicId = result.public_id;
            }

            const report = new Report({
                ownerId,
                reporterName: reporterName || 'Anonymous',
                reporterPhone: reporterPhone || '',
                imageUrl,
                imagePublicId,
                location: {
                    lat: lat ? parseFloat(lat) : null,
                    lng: lng ? parseFloat(lng) : null,
                    accuracy: accuracy ? parseFloat(accuracy) : null
                }
            });

            await report.save();

            // reverse geocode if desired (left as placeholders)
            if ((!report.address || report.address === '') && report.location && report.location.lat) {
                let addr = null;
                if (process.env.GOOGLE_MAPS_API_KEY) addr = await reverseGeocodeGoogle(report.location.lat, report.location.lng);
                if (!addr) addr = await reverseGeocodeNominatim(report.location.lat, report.location.lng);
                if (addr) { report.address = addr; await report.save(); }
            }

            // emit to owner room
            if (ownerId && req.io) {
                const payload = {
                    reportId: report._id,
                    reporterName: report.reporterName,
                    reporterPhone: report.reporterPhone,
                    imageUrl: report.imageUrl,
                    location: report.location,
                    address: report.address || null,
                    createdAt: report.createdAt,
                    acknowledged: report.acknowledged
                };
                req.io.to(`owner:${ownerId}`).emit('new_report', payload);
            }

            res.json({ ok: true, report });
        });
    } catch (err) {
        console.error('User report error', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/users/my-reports?phone=...
router.get('/my-reports', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ ok: false, error: 'Phone number required' });
        const reports = await Report.find({ reporterPhone: phone }).sort({ createdAt: -1 }).limit(50).lean();
        res.json({ ok: true, reports });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/users/report/:id
router.get('/report/:id', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).lean();
        if (!report) return res.status(404).json({ ok: false, error: 'Report not found' });
        res.json({ ok: true, report });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
