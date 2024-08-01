//mongodb
require('./config/db');

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
app.use('/', test_route);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
})

mqtt_listener();