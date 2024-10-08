const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dataAnalytics = new Schema({
    topic: String,
    soilMoisture: Number,
    atmosphericHumidity: Number,
    atmosphericTemperature: Number,
    waterLevel: Number,
    timestamp: { type: Date, default: Date.now }
})

const UserDataAnalytics = mongoose.model('DataAnalytics', dataAnalytics)
module.exports = UserDataAnalytics;