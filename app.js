const express = require('express');
const app = express();
var session = require('express-session');
const cors = require('cors');

//middleware
app.use(express.json());
require('dotenv').config();

app.use(cors({
    origin: '*'
}));

if(process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https')
        res.redirect(`https://${req.header('host')}${req.url}`)
        else
        next()
    })
}

app.use(express.json({ limit: '16MB' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1) // trust first proxy

const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use("/styles",express.static(__dirname + "/views/styles"));
app.use("/styles-widgets",express.static(__dirname + "/views/styles-widgets"));
app.use("/scripts",express.static(__dirname + "/views/scripts"));
app.use("/assets",express.static(__dirname + "/views/assets"));
// app.use("/README.md",express.static(__dirname + "/README.md"));

const port = process.env.PORT || 3000;

//imported functions

//navigation routing
app.use('/', require('./routes/index'))
app.use('/api/v1', require('./routes/mp'))
app.use('/api/auth', require('./routes/auth'));
app.use('/api/register', require('./routes/register'));
app.use('/api/sms', require('./routes/sms'));
app.use('/api/twilio', require('./routes/twilio'));

const start = async () => {
    try {
        app.listen(port, console.log(`\n server is listening on port ${port}\n http://localhost:${port}`));
    } catch (error) { console.log(error) }
}
start();