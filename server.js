//mongodb
require('./config/db');

<<<<<<< HEAD
const express = require('express');
const app = express();
const router = express.Router();
const cors = require('cors');
const port = 5000;

const UserRouter = require('./api/User');
const mqtt_listener = require('./api/mqtt');

app.use(cors());
app.use(express.json());

const test_route = router.get('/', (req, res) => {
  res.json('OK');
});

app.use('/user', UserRouter);
=======
const app = require('express')();
const router = require('express').Router();
const port = 5000;

const UserRouter = require('./api/User');
const mqtt_listener = require('./api/mqtt')
// for accepting post form data
const bodyParser = require('express').json;
app.use(bodyParser());

//app.use(cors());

 const test_route = router.get('/', (req, res)=>{
  res.json('OK');
})


app.use('/user', UserRouter)
>>>>>>> b913c834adfa81a4bca77b45bea2ec3c6df5a445
app.use('/', test_route);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
<<<<<<< HEAD
});

mqtt_listener();
=======
})

mqtt_listener();
>>>>>>> b913c834adfa81a4bca77b45bea2ec3c6df5a445
