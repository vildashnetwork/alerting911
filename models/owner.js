// const mongoose = require('mongoose');

// const OwnerSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     phone: { type: String, default: '' },
//     createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Owner', OwnerSchema);




const mongoose = require('mongoose');

const OwnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Owner', OwnerSchema);
