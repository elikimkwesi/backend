//mongodb
require('./config/db');

const express = require('express');
const app = express();
const router = express.Router();
const cors = require('cors');
const port = 5000;

const UserRouter = require('./api/User');
const deviceRoute = require('./api/devices')
const averagesRouter = require('./api/averages')

const mqtt_listener = require('./api/mqtt')

app.use(cors());
app.use(express.json());



const test_route = router.get('/', (req, res) => {
  res.json('OK');
});

//routes
app.use('/user', UserRouter);
app.use('/api/averages', averagesRouter);
app.use('/api/device/', deviceRoute)
app.use('/', test_route);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

mqtt_listener();
