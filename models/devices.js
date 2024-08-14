// models/device.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
    macAddress: { type: String, unique: true },
    //userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Device = mongoose.model('Device', DeviceSchema);
module.exports = Device;
