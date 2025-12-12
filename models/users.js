// const mongoose = require('mongoose');

// const ReportSchema = new mongoose.Schema({
//     ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
//     reporterName: { type: String, default: 'Anonymous' },
//     reporterPhone: { type: String, default: '' },
//     imageUrl: String,
//     imagePublicId: String,
//     location: { lat: Number, lng: Number, accuracy: Number },
//     address: String,
//     createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Report', ReportSchema);





const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    reporterName: { type: String, default: 'Anonymous' },
    reporterPhone: { type: String, default: '' },
    imageUrl: String,
    imagePublicId: String,
    location: { lat: Number, lng: Number, accuracy: Number },
    address: String,
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);
