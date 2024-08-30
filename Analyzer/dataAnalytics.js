const UserDataAnalytics = require('../models/UserDataAnalytics');

const optimalConditions = {
    temperature: { min: 18, max: 24 },
    humidity: { min: 40, max: 60 },
    soilMoisture: { min: 20, max: 50 }
};

const sendAlert = (message) => {
    console.log('Alert:', message);
    // Here, you could integrate with an email service, SMS service, or push notification service to send alerts to users.
};

const checkConditions = (data) => {
    const { soilMoisture, humidity, temperature } = data;

    // Check temperature
    if (temperature < optimalConditions.temperature.min || temperature > optimalConditions.temperature.max) {
        sendAlert(`Temperature of ${temperature}°C is out of the optimal range (${optimalConditions.temperature.min}°C - ${optimalConditions.temperature.max}°C).`);
    }

    // Check humidity
    if (humidity < optimalConditions.humidity.min || humidity > optimalConditions.humidity.max) {
        sendAlert(`Humidity of ${humidity}% is out of the optimal range (${optimalConditions.humidity.min}% - ${optimalConditions.humidity.max}%).`);
    }

    // Check soil moisture
    if (soilMoisture < optimalConditions.soilMoisture.min || soilMoisture > optimalConditions.soilMoisture.max) {
        sendAlert(`Soil Moisture of ${soilMoisture}% is out of the optimal range (${optimalConditions.soilMoisture.min}% - ${optimalConditions.soilMoisture.max}%).`);
    }
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

const calculateAverages = async (period) => {
    const now = new Date();
    let start, groupBy;

    switch (period) {
        case 'day':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            groupBy = { $minute: '$timestamp' };
            break;
        case 'week':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            groupBy = { $dayOfWeek: '$timestamp' };
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            groupBy = { $week: '$timestamp' };
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            groupBy = { $month: '$timestamp' };
            break;
        default:
            throw new Error('Invalid period');
    }

    const results = await UserDataAnalytics.aggregate([
        { $match: { timestamp: { $gte: start, $lt: now } } },
        {
            $group: {
                _id: groupBy,
                avgTemperature: { $avg: '$temperature' },
                avgHumidity: { $avg: '$humidity' },
                avgSoilMoisture: { $avg: '$soilMoisture' }
            }
        },
        { $sort: { _id: 1 } }  // Sorting by the group (hour, day, week, etc.)
    ]).allowDiskUse(true);

    if (results.length > 0) {
        results.forEach(result => {
            const { avgTemperature, avgHumidity, avgSoilMoisture } = result;

            // Check temperature
            if (avgTemperature < optimalConditions.temperature.min || avgTemperature > optimalConditions.temperature.max) {
                sendAlert(`Average Temperature of ${avgTemperature}°C is out of the optimal range (${optimalConditions.temperature.min}°C - ${optimalConditions.temperature.max}°C).`);
            }

            // Check humidity
            if (avgHumidity < optimalConditions.humidity.min || avgHumidity > optimalConditions.humidity.max) {
                sendAlert(`Average Humidity of ${avgHumidity}% is out of the optimal range (${optimalConditions.humidity.min}% - ${optimalConditions.humidity.max}%).`);
            }

            // Check soil moisture
            if (avgSoilMoisture < optimalConditions.soilMoisture.min || avgSoilMoisture > optimalConditions.soilMoisture.max) {
                sendAlert(`Average Soil Moisture of ${avgSoilMoisture}% is out of the optimal range (${optimalConditions.soilMoisture.min}% - ${optimalConditions.soilMoisture.max}%).`);
            }
        });

        return results.map(result => ({
            period: result._id,
            avgTemperature: result.avgTemperature,
            avgHumidity: result.avgHumidity,
            avgSoilMoisture: result.avgSoilMoisture
        }));
    } else {
        throw new Error(`No data available for the selected period`);
    }
};

module.exports = {
    analyzeAndStoreData,
    calculateAverages
};
