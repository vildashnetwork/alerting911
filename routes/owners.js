// const express = require("express");
// const router = express.Router();
// const Owner = require("../models/owner.js");
// const Report = require("../models/users.js");
// const cloudinary = require('cloudinary').v2;
// const streamifier = require('streamifier');

// // ----------------- HELPERS -----------------
// function escapeHtml(s) {
//     if (!s) return '';
//     return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
// }

// // Placeholder reverse geocode functions
// async function reverseGeocodeGoogle(lat, lng) { return null; }
// async function reverseGeocodeNominatim(lat, lng) { return null; }

// // ----------------- ROUTES -----------------

// router.get('/', async (req, res) => {
//     const owners = await Owner.find().lean();
//     res.send('Submit page placeholder'); // replace with renderSubmitPage(owners)
// });

// router.get('/register-owner', (req, res) => {
//     res.send('Register owner page placeholder'); // replace with renderRegisterOwnerPage()
// });

// router.post('/api/register-owner', async (req, res) => {
//     const { name, phone } = req.body;
//     const owner = new Owner({ name: name || `Owner ${Date.now()}`, phone: phone || '' });
//     await owner.save();
//     res.json({ ok: true, owner });
// });

// router.get('/api/owners', async (req, res) => {
//     const owners = await Owner.find().lean();
//     res.json({ ok: true, owners });
// });

// router.post('/api/report', async (req, res) => {
//     try {
//         const upload = req.upload;
//         upload.single('image')(req, res, async function (err) {
//             if (err) return res.status(500).json({ ok: false, error: err.message });

//             const { ownerId, reporterName, reporterPhone, lat, lng, accuracy } = req.body;
//             let imageUrl = '', imagePublicId = '';

//             if (req.file && req.file.buffer && process.env.CLOUDINARY_API_KEY) {
//                 const result = await new Promise((resolve, reject) => {
//                     const cldStream = cloudinary.uploader.upload_stream({ folder: 'trash_reports' }, (err, result) => {
//                         if (err) reject(err); else resolve(result);
//                     });
//                     streamifier.createReadStream(req.file.buffer).pipe(cldStream);
//                 });
//                 imageUrl = result.secure_url;
//                 imagePublicId = result.public_id;
//             }

//             const report = new Report({
//                 ownerId: ownerId || null,
//                 reporterName: reporterName || 'Anonymous',
//                 reporterPhone: reporterPhone || '',
//                 imageUrl,
//                 imagePublicId,
//                 location: {
//                     lat: lat ? parseFloat(lat) : null,
//                     lng: lng ? parseFloat(lng) : null,
//                     accuracy: accuracy ? parseFloat(accuracy) : null
//                 }
//             });

//             await report.save();

//             // reverse geocode
//             if ((!report.address || report.address === '') && report.location && report.location.lat) {
//                 let addr = null;
//                 if (process.env.GOOGLE_MAPS_API_KEY) addr = await reverseGeocodeGoogle(report.location.lat, report.location.lng);
//                 if (!addr) addr = await reverseGeocodeNominatim(report.location.lat, report.location.lng);
//                 if (addr) { report.address = addr; await report.save(); }
//             }

//             // notify owner via socket
//             if (ownerId) {
//                 const payload = {
//                     reportId: report._id,
//                     reporterName: report.reporterName,
//                     reporterPhone: report.reporterPhone,
//                     imageUrl: report.imageUrl,
//                     location: report.location,
//                     address: report.address || null,
//                     createdAt: report.createdAt
//                 };
//                 req.io.to(`owner:${ownerId}`).emit('new_report', payload);
//             }

//             res.json({ ok: true, report });
//         });
//     } catch (err) {
//         console.error('report error', err);
//         res.status(500).json({ ok: false, error: err.message });
//     }
// });

// router.get('/owner/:id', async (req, res) => {
//     const owner = await Owner.findById(req.params.id).lean();
//     if (!owner) return res.status(404).send('Owner not found');
//     res.send('Owner dashboard placeholder'); // replace with renderOwnerDashboard(owner)
// });

// router.get('/api/owner/:id/stats', async (req, res) => {
//     const ownerId = req.params.id;
//     const now = new Date();
//     const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

//     const agg = await Report.aggregate([
//         { $match: { ownerId: require('mongoose').Types.ObjectId(ownerId), createdAt: { $gte: sixMonthsAgo } } },
//         { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
//         { $sort: { "_id.year": 1, "_id.month": 1 } }
//     ]);

//     const months = [];
//     for (let i = 5; i >= 0; i--) {
//         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
//         months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'short', year: 'numeric' }) });
//     }

//     const counts = months.map(m => {
//         const found = agg.find(a => a._id.year === m.year && a._id.month === m.month);
//         return found ? found.count : 0;
//     });

//     const totalThisMonth = counts[counts.length - 1];
//     const concurrent = req.io.sockets.adapter.rooms.get(`owner:${ownerId}`)?.size || 0;

//     res.json({ ok: true, months: months.map(m => m.label), counts, totalThisMonth, concurrent });
// });

// router.get('/api/owner/:id/reports', async (req, res) => {
//     const ownerId = req.params.id;
//     const reports = await Report.find({ ownerId }).sort({ createdAt: -1 }).limit(50).lean();
//     res.json({ ok: true, reports });
// });

// module.exports = router;








const express = require('express');
const router = express.Router();
const Owner = require('../models/owner.js');
const Report = require('../models/users.js');

// register owner (POST /api/owners/register)
router.post('/register', async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const owner = new Owner({ name, phone: phone || '' });
        await owner.save();
        res.json({ ok: true, owner });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/owners (list owners)
router.get('/', async (req, res) => {
    try {
        const owners = await Owner.find().lean();
        res.json({ ok: true, owners });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/owners/:id/reports  (owner reports)
router.get('/:id/reports', async (req, res) => {
    try {
        const ownerId = req.params.id;
        const reports = await Report.find({ ownerId }).sort({ createdAt: -1 }).limit(50).lean();
        res.json({ ok: true, reports });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/owners/:id/stats  (simple last 6 months counts)
router.get('/:id/stats', async (req, res) => {
    try {
        const ownerId = req.params.id;
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const agg = await Report.aggregate([
            { $match: { ownerId: require('mongoose').Types.ObjectId(ownerId), createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'short', year: 'numeric' }) });
        }

        const counts = months.map(m => {
            const found = agg.find(a => a._id.year === m.year && a._id.month === m.month);
            return found ? found.count : 0;
        });

        const totalThisMonth = counts[counts.length - 1];
        // get concurrent sockets for this room (if req.io available)
        const concurrent = req.io ? (req.io.sockets.adapter.rooms.get(`owner:${ownerId}`)?.size || 0) : 0;

        res.json({ ok: true, months: months.map(m => m.label), counts, totalThisMonth, concurrent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/owners/:ownerId/report/:reportId/acknowledge
router.post('/:ownerId/report/:reportId/acknowledge', async (req, res) => {
    try {
        const { ownerId, reportId } = req.params;
        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json({ ok: false, error: 'Report not found' });
        if (!report.ownerId || String(report.ownerId) !== String(ownerId)) {
            return res.status(403).json({ ok: false, error: 'Not authorized to acknowledge this report' });
        }

        report.acknowledged = true;
        report.acknowledgedAt = new Date();
        report.acknowledgedBy = ownerId;
        await report.save();

        const payload = {
            reportId: report._id,
            acknowledged: true,
            acknowledgedAt: report.acknowledgedAt,
            acknowledgedBy: ownerId
        };

        if (req.io) req.io.to(`owner:${ownerId}`).emit('report_acknowledged', payload);
        res.json({ ok: true, report });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
