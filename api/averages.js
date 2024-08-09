// api/averages.js
const express = require('express');
const router = express.Router();
const { calculateAverages } = require('../Analyzer/dataAnalytics');

router.get('/', async (req, res) => {
    const { period } = req.query;

    try {
        const averages = await calculateAverages(period);
        res.json({
            status: "SUCCESS",
            data: averages
        });
    } catch (err) {
        res.status(400).json({
            status: "FAILED",
            message: err.message
        });
    }
});

module.exports = router;
