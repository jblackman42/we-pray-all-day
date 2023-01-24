const express = require('express');
const app = express();

//middleware
app.use(express.json());
require('dotenv').config();

app.use(express.json({ limit: '16MB' }));
app.use(express.urlencoded({ extended: true }));

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use("/styles",express.static(__dirname + "/views/styles"));
app.use("/scripts",express.static(__dirname + "/views/scripts"));
app.use("/assets",express.static(__dirname + "/views/assets"));
// app.use("/README.md",express.static(__dirname + "/README.md"));

const port = process.env.PORT || 3000;

//imported functions
const {populate} = require('./populate')

//navigation routing
app.use('/', require('./routes/index'))
app.use('/api/v1', require('./routes/mp'))

const start = async () => {
    try {
        app.listen(port, console.log(`\n server is listening on port ${port}\n http://localhost:${port}`));
    } catch (error) { console.log(error) }
}
start();