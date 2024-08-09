// controllers/dataAnalytics.js
const UserDataAnalytics = require('../models/UserDataAnalytics');

const optimalConditions = {
    temperature: { min: 18, max: 24 },
    humidity: { min: 40, max: 60 },
    soilMoisture: { min: 20, max: 50 }
};

const analyzeAndStoreData = async (topic, payload) => {
    try {
        const jsonMessage = JSON.parse(payload);

        const { soilMoisture, humidity, temperature, waterLevel } = jsonMessage;
        const data = new UserDataAnalytics({
            topic,
            soilMoisture,
            humidity,
            temperature,
            waterLevel,
            timestamp: new Date()
        });

        await data.save();
        console.log('Data stored:', data);

        checkConditions(data);
    } catch (err) {
        console.error('Error processing message:', err.message);
    }
};

const checkConditions = (data) => {
    const alerts = [];

    if (data.temperature < optimalConditions.temperature.min || data.temperature > optimalConditions.temperature.max) {
        alerts.push(`Temperature out of range: ${data.temperature}`);
    }
    if (data.humidity < optimalConditions.humidity.min || data.humidity > optimalConditions.humidity.max) {
        alerts.push(`Humidity out of range: ${data.humidity}`);
    }
    if (data.soilMoisture < optimalConditions.soilMoisture.min || data.soilMoisture > optimalConditions.soilMoisture.max) {
        alerts.push(`Soil moisture out of range: ${data.soilMoisture}`);
    }

    if (alerts.length > 0) {
        console.log('Alerts:', alerts);
    }
};

const calculateAverages = async (period) => {
    const now = new Date();
    let start;

    switch (period) {
        case 'day':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            throw new Error('Invalid period');
    }

    const results = await UserDataAnalytics.aggregate([
        { $match: { timestamp: { $gte: start, $lt: now } } },
        {
            $group: {
                _id: null,
                avgTemperature: { $avg: '$temperature' },
                avgHumidity: { $avg: '$humidity' },
                avgSoilMoisture: { $avg: '$soilMoisture' }
            }
        }
    ]).allowDiskUse(true);

    if (results.length > 0) {
        const { avgTemperature, avgHumidity, avgSoilMoisture } = results[0];
        return {
            avgTemperature,
            avgHumidity,
            avgSoilMoisture
        };
    } else {
        throw new Error(`No data available for the selected period`);
    }
};

module.exports = {
    analyzeAndStoreData,
    calculateAverages
};
