const express = require('express');
const router = express.Router();
const deviceSchema = require('../models/devices');

router.post("/new-device-id", async (req, res) => {
    try {
        const {macAddress} = req.body;
        //console.log(macAddress)
        const device = await deviceSchema.findOne({ macAddress });
        //console.log(device)
        if (!device) {
            const newDevice = new deviceSchema({
                macAddress
            });
    
            await newDevice.save()
            .then(()=>{
                res.status(200).json('device added successfully')
            });
        }else{
            res.status(401).json('device exists');
        }

    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message,
        });
    }
});

module.exports = router;