const mqtt = require('mqtt');
const { analyzeAndStoreData, calculateAverages } = require('../Analyzer/dataAnalytics');
require('dotenv').config();

// Define the connection options
const subscribeToTopic = () => {
    const clientId = 'diseasepred';
    const username = 'dkfosu';
    const password = 'eeee';

    let client;
    try {
        client = mqtt.connect('wss://b1bb4899.ala.eu-central-1.emqxsl.com:8084/mqtt', {
            clientId,
            username,
            password,
        });
    } catch (err) {
        console.error('MQTT connection error:', err);
    }

    const topic = 'plantmonitor';
    const qos = 1;

    try {
        client.subscribe(topic, { qos }, (err) => {
            if (err) {
                console.log('Subscription error:', err);
                return;
            } else {
                console.log(`Subscribed to topic ${topic}`);
            }
        });
    } catch (error) {
        console.log(error);
    }

    client.on('message', async (topic, payload) => {
        console.log('Received Message:', topic, payload.toString());
        await analyzeAndStoreData(topic, payload);
    });

    client.on('error', (err) => {
        console.log('Connection error:', err);
    });

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
    });

    client.on('close', () => {
        console.log('Connection closed');
    });

    client.on('offline', () => {
        console.log('Client is offline');
    });

    client.on('reconnect', () => {
        console.log('Reconnecting to MQTT broker....');
    });

    return client;
};

// Calculate averages for different periods
setInterval(() => calculateAverages('day'), 24 * 60 * 60 * 1000);  // Daily
setInterval(() => calculateAverages('week'), 7 * 24 * 60 * 60 * 1000);  // Weekly
setInterval(() => calculateAverages('month'), 30 * 24 * 60 * 60 * 1000);  // Monthly
setInterval(() => calculateAverages('year'), 365 * 24 * 60 * 60 * 1000);  // Yearly

module.exports = subscribeToTopic;
