const axios = require('axios');
const express = require('express');
const router = express.Router();
const qs = require('qs');
// const IP = require('ip');
const ical = require('ical-generator');
const schedule = require('node-schedule');

let access_token;
const authorize = async () => {
    const data = await axios({
        method: 'post',
        url: 'https://my.pureheart.org/ministryplatformapi/oauth/connect/token',
        data: qs.stringify({
            grant_type: 'client_credentials',
            scope: 'http://www.thinkministry.com/dataplatform/scopes/all',
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET
        })
    })
        .then(response => response.data)
        .catch(err => console.log(err))
    
    //automatically gets a new access token when the current one expires
    setTimeout(async () => await authorize(), data.expires_in * 1000)
    access_token = data.access_token;
    return access_token;
}

router.get('/Prayer_Schedules', async (req, res) => {
    if (!access_token) await authorize();
    const {$filter} = req.query;

    try {
        const data = await axios({
            method: 'get',
            url: `https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules${$filter ? `?$filter=${$filter}` : ''}`,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.data);
        
        res.status(200).send({Prayer_Schedules: data}).end();
    } catch (err) {
        res.status(500).send({error: err}).end();
    }
})

router.post('/Prayer_Schedules', async (req, res) => {
    if (!access_token) await authorize();
    console.log('is this working')

    try {
        const {First_Name, Last_Name, Start_Date, End_Date, Email, Phone, Community_ID} = req.body;
        if (!First_Name || !Start_Date || !End_Date || !Email || !Phone || !Community_ID) throw new Error('missing parameters')
        const data = await axios({
            method: 'post',
            url: `https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules`,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            data: [{
                First_Name: First_Name,
                Last_Name: Last_Name || null,
                Start_Date: Start_Date,
                End_Date: End_Date,
                Email: Email,
                Phone: Phone,
                Community_ID: Community_ID
            }]
        })
            .then(response => response.data);

        res.status(200).send(data).end();
    } catch (error) {
        console.error(error)
        res.status(500).send({error}).end();
    }
})

router.get('/Communities', async (req, res) => {
    if (!access_token) await authorize();
    const {$select} = req.query;

    try {
        const data = await axios({
            method: 'get',
            url: `https://my.pureheart.org/ministryplatformapi/tables/Communities${$select ? `?$select=${$select}` : ''}`,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.data);
        
        res.status(200).send({Communities: data}).end();
    } catch (error) {
        res.status(500).send(error).end();
    }
})

router.post('/confirmation-email', async (req, res) => {
    if (!access_token) await authorize();
    
    const {Recipient_Name, Recipient_Email, Recipient_Phone, Start_Date, End_Date, Community_ID} = req.body;

    const startDate = new Date(Start_Date)
    const endDate = new Date(End_Date)

    //gets date/time 5 mins before startDate
    const textNotifyDate = new Date(startDate.getTime() - (5 * 60 * 1000))
    
    const job = schedule.scheduleJob(textNotifyDate, async() => {
        await axios({
            method: 'post',
            url: 'https://my.pureheart.org/ministryplatformapi/texts',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            data: {
                "FromPhoneNumberId": 1,
                "Message": `
Hello ${Recipient_Name},

It's your time to pray!
                `,
                "ToPhoneNumbers": 
                [Recipient_Phone]
            }
        })
    })
    
    axios({
        method: 'post',
        url: 'https://my.pureheart.org/ministryplatformapi/messages',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
        },
        data: {
            "FromAddress": { "DisplayName": "We Pray All Day", "Address": "noreply@pureheart.org" },
            "ToAddresses": 
            [ 
                { "DisplayName": Recipient_Name, "Address": Recipient_Email }
            ],
            "ReplyToAddress": { "DisplayName": "noreply@pureheart.org", "Address": "noreply@pureheart.org" },
            "Subject": `🙏 We Pray All Day`,
            "Body": `<style>
                        body, html {
                            margin: 0;
                            padding: 0;
                            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        }
                        .container {
                            max-width: 768px;
                            margin: 0 auto;
                            background-color: #f1f2f6;
                        }
                        .container .img-container {
                            background-color: #0eb2f1;
                            color: white;
                            display: grid;
                            place-items: center;
                            font-size: 1.2rem;
                            padding: 1rem;
                        }
                        .container .img-container img {
                            width: 384px;
                            max-width: 90%;
                            margin: 0 auto;
                        }
                        .container .img-container p {
                            margin: 0;
                            font-weight: bold;
                            text-align: center;
                        }
                        
                        .container .content {
                            max-width: 90%;
                            margin: 0 auto;
                            padding: 1rem;
                        }
                        .container .content p {
                            margin: 0;
                        }
                        .container .btn-container {
                            width: 100%;
                            display: flex;
                            justify-content: center;
                        }
                        .container a {
                            font-size: 1rem;
                            font-weight: bold;
                            border: none;
                            color: white;
                            background-color: #0eb2f1;
                            padding: .5rem 1rem;
                            border-radius: 4px;
                            cursor: pointer;
                            text-decoration: none;
                        }
                    </style>
                    <body>
                        <div class="container">
                            <div class="img-container">
                                <img src="https://www.pureheart.org/wp-content/uploads/2023/01/logo.png" alt="We Pray All Day">
                                <p>Thanks for signing up to pray</p>
                            </div>
                            <div class="content">
                                <p>Hi {Name},</p>
                                <br>
                                <p>We are so honored that you would pray with us! We have high expectations that God is going to do immeasurably more than we could ever seek ask or imagine!</p>
                                <br>
                                <p>To help you remember your prayer time, add this to your calendar! It's simple all you gotta do is click it and accept 😁</p>
                                <br>
                                <p>We will text you 5 minutes before your scheduled time of prayer with more information.</p>
                                <br>
                                <p style="text-align: center;">${startDate.toDateString()}</p>
                                <p style="text-align: center;">${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}</p>
                                <br>
                                <div class="btn-container">
                                    <a target="_blank" href="${process.env.DOMAIN_NAME}/calendar-invite/?start_date=${startDate.toUTCString()}&end_date=${endDate.toUTCString()}">Add to Calendar</a>
                                </div>
                            </div>
                        </div>
                    </body>`
        }
    })

    res.status(200).end();
})

const cal = ical({
    events: [
        {
            start: new Date(),
            end: new Date(new Date().setHours(new Date().getHours() + 1)),
            summary: 'We Pray All Day',
            description: 'An hour spent in prayer for Maricopa County.'
        }
    ]
});

router.get('/test', (req, res) => {
    cal.serve(res);
})

module.exports = router;