// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const mongoose = require('mongoose');
// const multer = require('multer');
// const streamifier = require('streamifier');
// const cloudinary = require('cloudinary').v2;
// const cors = require('cors');
// const ownersRouter = require('./routes/owners.js');
// const report = require('./routes/users.js')

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] }
// });

// // ----------------- MIDDLEWARE -----------------
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cors());
// app.use('/public', express.static(__dirname + '/public')); // optional

// // ----------------- CONFIG -----------------
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
//   api_key: process.env.CLOUDINARY_API_KEY || '',
//   api_secret: process.env.CLOUDINARY_API_SECRET || ''
// });

// mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => { console.error('MongoDB connection error', err); process.exit(1); });

// // ----------------- MULTER -----------------
// const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// // ----------------- SOCKET.IO -----------------
// const ownerConnections = {};

// io.on('connection', (socket) => {
//   console.log('Socket connected:', socket.id);

//   socket.on('join_owner', (ownerId) => {
//     socket.join(`owner:${ownerId}`);
//     ownerConnections[ownerId] = ownerConnections[ownerId] || new Set();
//     ownerConnections[ownerId].add(socket.id);
//     io.to(`owner:${ownerId}`).emit('owner_connection_count', ownerConnections[ownerId].size);
//   });

//   socket.on('leave_owner', (ownerId) => {
//     socket.leave(`owner:${ownerId}`);
//     if (ownerConnections[ownerId]) {
//       ownerConnections[ownerId].delete(socket.id);
//       io.to(`owner:${ownerId}`).emit('owner_connection_count', ownerConnections[ownerId].size);
//     }
//   });

//   socket.on('disconnecting', () => {
//     Array.from(socket.rooms).forEach(r => {
//       if (!r.startsWith('owner:')) return;
//       const oid = r.split(':')[1];
//       if (ownerConnections[oid]) {
//         ownerConnections[oid].delete(socket.id);
//         io.to(`owner:${oid}`).emit('owner_connection_count', ownerConnections[oid].size);
//       }
//     });
//   });

//   socket.on('disconnect', () => { console.log('Socket disconnected:', socket.id); });
// });

// // ----------------- ROUTES -----------------
// app.use((req, res, next) => { req.io = io; req.upload = upload; next(); });
// app.use('/api/owners', ownersRouter);
// app.use('/api/report', report)

// const port = process.env.PORT || 3000;
// server.listen(port, () => { console.log('Server listening on port', port); });













require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const cron = require("node-cron");

const ownersRouter = require('./routes/owners.js');
const usersRouter = require('./routes/users.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
const URL = "https://alerting911.onrender.com/ping";
function scheduleRandomPing() {
  const minutes = Math.floor(Math.random() * 11) + 5; // every 5–15 mins
  cron.schedule(`*/${minutes} * * * *`, async () => {
    try {
      await fetch(URL);
      console.log("pinged");
    } catch (e) {
      console.error("ping failed", e.message);
    }
  });
}
scheduleRandomPing();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/public', express.static(__dirname + '/public'));

// cloudinary config (optional)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// mongo connect
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trashdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error', err); process.exit(1); });

// multer for image uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// socket.io owner connection tracking
const ownerConnections = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join_owner', (ownerId) => {
    if (!ownerId) return;
    socket.join(`owner:${ownerId}`);
    ownerConnections[ownerId] = ownerConnections[ownerId] || new Set();
    ownerConnections[ownerId].add(socket.id);
    io.to(`owner:${ownerId}`).emit('owner_connection_count', ownerConnections[ownerId].size);
  });

  socket.on('leave_owner', (ownerId) => {
    if (!ownerId) return;
    socket.leave(`owner:${ownerId}`);
    if (ownerConnections[ownerId]) {
      ownerConnections[ownerId].delete(socket.id);
      io.to(`owner:${ownerId}`).emit('owner_connection_count', ownerConnections[ownerId].size);
    }
  });

  socket.on('disconnecting', () => {
    Array.from(socket.rooms).forEach(r => {
      if (!r.startsWith('owner:')) return;
      const oid = r.split(':')[1];
      if (ownerConnections[oid]) {
        ownerConnections[oid].delete(socket.id);
        io.to(`owner:${oid}`).emit('owner_connection_count', ownerConnections[oid].size);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// attach reusable objects to req
app.use((req, res, next) => {
  req.io = io;
  req.upload = upload;
  next();
});

// mount routers
app.use('/api/report', usersRouter);     // user/report actions
app.use('/api/owners', ownersRouter);   // owner actions + admin

const port = process.env.PORT || 4000;
server.listen(port, () => console.log('Server listening on port', port));
