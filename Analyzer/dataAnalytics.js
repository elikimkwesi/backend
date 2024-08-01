require('dotenv').config();
const UserDataAnalytics = require('../models/UserDataAnalytics');

const optimalConditions = {
    temperature: { min: 18, max: 24 },
    humidity: { min: 40, max: 60 },
    soilMoisture: { min: 20, max: 50 }
};

const analyzeAndStoreData = async (topic, payload) => {
    try {
        const jsonMessage = JSON.parse(payload.toString());

        // Analyze and store the message
        const { soilMoisture, humidity, temperature, waterLevel } = jsonMessage;
        const data = new UserDataAnalytics({
            topic,
            soilMoisture,
            humidity,
            temperature,
            waterLevel,
            timestamp: new Date()
        });

        // Insert data into MongoDB
        await data.save();
        console.log('Data stored in MongoDB:', data);

        // Check if the current readings are within optimal conditions
        checkConditions(data);

    } catch (err) {
        console.error('Error processing message:', err);
    }
};

const checkConditions = (data) => {
    const alerts = [];

    if (data.temperature < optimalConditions.temperature.min || data.temperature > optimalConditions.temperature.max) {
        alerts.push(`Temperature out of optimal range: ${data.temperature}`);
    }
    if (data.humidity < optimalConditions.humidity.min || data.humidity > optimalConditions.humidity.max) {
        alerts.push(`Humidity out of optimal range: ${data.humidity}`);
    }
    if (data.soilMoisture < optimalConditions.soilMoisture.min || data.soilMoisture > optimalConditions.soilMoisture.max) {
        alerts.push(`Soil moisture out of optimal range: ${data.soilMoisture}`);
    }

    if (alerts.length > 0) {
        console.log('Alerts:', alerts);
        // You can add more code here to send alerts to the user, e.g., via email or push notifications
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
            start = new Date(now.setDate(now.getDate() - now.getDay()));
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
    ]);

    if (results.length > 0) {
        const { avgTemperature, avgHumidity, avgSoilMoisture } = results[0];
        console.log(`Averages for ${period}: Temperature: ${avgTemperature}, Humidity: ${avgHumidity}, Soil Moisture: ${avgSoilMoisture}`);
        checkConditions({ temperature: avgTemperature, humidity: avgHumidity, soilMoisture: avgSoilMoisture });
    } else {
        console.log(`No data available for ${period}`);
    }
};

module.exports = {
    analyzeAndStoreData,
    calculateAverages
};
