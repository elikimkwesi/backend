// api/mqtt.js
const mqtt = require('mqtt');
const { analyzeAndStoreData } = require('../Analyzer/dataAnalytics');

const mqttListener = () => {
    const clientId = 'yourClientId';
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;
    const brokerUrl = process.env.MQTT_BROKER_URL;

    const client = mqtt.connect(brokerUrl, {
        clientId,
        username,
        password,
    });

    const topic = 'harvestifyfarm';

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        client.subscribe(topic, { qos: 1 }, (err) => {
            if (err) {
                console.error('Subscription error:', err.message);
            } else {
                console.log(`Subscribed to topic ${topic}`);
            }
        });
    });

    client.on('message', (topic, payload) => {
        const message = payload.toString();
        console.log('Received message:', topic, message);
        analyzeAndStoreData(topic, message);
    });

    client.on('error', (err) => {
        console.error('MQTT error:', err.message);
    });

    client.on('close', () => {
        console.log('MQTT connection closed');
    });

    client.on('offline', () => {
        console.log('MQTT client is offline');
    });

    client.on('reconnect', () => {
        console.log('Reconnecting to MQTT broker...');
    });
};

module.exports = mqttListener;
