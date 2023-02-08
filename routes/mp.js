const axios = require('axios');
const express = require('express');
const router = express.Router();
const qs = require('qs');

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
    
    // //automatically gets a new access token when the current one expires
    // setTimeout(async () => await authorize(), data.expires_in * 1000)
    access_token = data.access_token;
    return access_token;
}

router.get('/Prayer_Schedules', async (req, res) => {
    await authorize();

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
    await authorize();

    try {
        const {First_Name, Last_Name, Start_Date, End_Date, Email, Phone, Community_ID} = req.body;
        const parsedPhoneNumber = Phone.split('').filter(a=>Number.isInteger(parseInt(a))).join('');
        console.log(parsedPhoneNumber)
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
                Phone: parsedPhoneNumber,
                Prayer_Community_ID: Community_ID
            }]
        })
            .then(response => response.data);

        res.status(200).send(data).end();
    } catch (error) {
        console.error(error)
        res.status(500).send({error}).end();
    }
})

router.get('/Prayer_Communities', async (req, res) => {
    await authorize();

    const {$select} = req.query;

    try {
        const data = await axios({
            method: 'get',
            url: `https://my.pureheart.org/ministryplatformapi/procs/api_MPP_GetPrayerCommunities`,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.data[0]);
        
        res.status(200).send({Communities: data}).end();
    } catch (error) {
        res.status(500).send(error).end();
    }
})

router.post('/Communities', async (req, res) => {
    await authorize();

    try {
        const {First_Name, Last_Name, Email, Phone, Community_Name, City, State, Start_Date, Pattern, Prayer_Points} = req.body;
        if (!First_Name || !Email || !Phone || !Community_Name || !State || !City || !Start_Date || !Pattern || !Prayer_Points) throw new Error('missing parameters')
        const data = await axios({
            method: 'post',
            url: `https://my.pureheart.org/ministryplatformapi/tables/Communities`,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            data: [{
                First_Name: First_Name,
                Last_Name: Last_Name,
                Email: Email,
                Phone: Phone,
                Community_Name: Community_Name,
                City: State,
                State: City,
                Start_Date: Start_Date,
                Pattern: Pattern,
                Prayer_Points: Prayer_Points
            }]
        })
            .then(response => response.data);

        res.status(200).send(data).end();
    } catch (error) {
        console.error(error)
        res.status(500).send({error}).end();
    }
})

router.post('/confirmation-email', async (req, res) => {
    await authorize();
    
    const {Recipient_Name, Recipient_Email, Recipient_Phone, Start_Date, Time_String, Community_ID} = req.body;
    const parsedPhoneNumber = Recipient_Phone.split('').filter(a=>Number.isInteger(parseInt(a))).join('');

    const startDate = Start_Date ? new Date(Start_Date) : new Date()

    function toIsoString(date) {
        var tzo = -date.getTimezoneOffset(),
            dif = tzo >= 0 ? '+' : '-',
            pad = function(num) {
                return (num < 10 ? '0' : '') + num;
            };
      
        return date.getFullYear() +
            '-' + pad(date.getMonth() + 1) +
            '-' + pad(date.getDate()) +
            'T' + pad(date.getHours()) +
            ':' + pad(date.getMinutes()) +
            ':' + pad(date.getSeconds()) +
            dif + pad(Math.floor(Math.abs(tzo) / 60)) +
            ':' + pad(Math.abs(tzo) % 60);
    }

    //gets date/time 5 mins before startDate
    const textNotifyDate = new Date(startDate.getTime() - (5 * 60 * 1000))
    
    const job = await axios({
        method: 'post',
        url: 'https://my.pureheart.org/ministryplatformapi/texts',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        data: {
            "FromPhoneNumberId": 1,
            "Message": `🙏 Hello ${Recipient_Name}\nIt's your time to pray!\n\n🏡❤️ Our Hearts & Homes\n⛪️ The Church\n✝️ Salvations\n🌱 Our State\n🌎 Our Nation\n🌍 All the Earth\n⛪️ Your Church\n\nFull prayer guide BELOW!\n⬇️ ⬇️\n\n https://rb.gy/clhwr1 \n\n Reply STOP to unsubscribe`,
            // "Message": `Hello ${Recipient_Name}\nIt's your gosh darn time to pray`,
            "StartDate": toIsoString(textNotifyDate),
            "ToPhoneNumbers": [parsedPhoneNumber]
        }
    })
        .then(response => response.data)
        .catch(err => console.error(err))

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
            "Body": `
                <style>
                    body, html {margin: 0;padding: 0;font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;}.container {max-width: 768px;margin: 0 auto;background-color: #f1f2f6;}.container .img-container {background-color: #2e2d2b;color: white;display: grid;place-items: center;font-size: 1.2rem;padding: 1rem;}.container .img-container img {width: 300px;max-width: 90%;margin: 0 auto;}.container .img-container p {margin: 0;font-weight: bold;}.container #banner {width: 100%;background: #fcbb09;color: white;margin: 0;padding: 1rem 0;text-align: center;text-transform: uppercase;font-weight: bold;}.container .content {max-width: 90%;margin: 0 auto;padding: 1rem;}.container .content p {margin: 0;}.container .btn-container {width: 100%;display: flex;justify-content: center;}.container a {text-decoration: none;font-size: 1rem;font-weight: bold;border: none;color: white;background-color: #fcbb09;padding: .5rem 1rem;border-radius: 4px;cursor: pointer;}
                </style>
                <body>
                    <div class="container">
                        <div class="img-container"><img src="http://weprayallday.com/assets/final-logo-transparent.png" alt="We Pray All Day"></div>
                        <p id="banner">Thanks for signing up to pray</p>
                        <div class="content"><p>Hi ${Recipient_Name},</p><br><p>We are so honored that you would pray with us! We have high expectations that God is going to do immeasurably more than we could ever seek ask or imagine!</p><br><p>To help you remember your prayer time, add this to your calendar! It's simple all you gotta do is click it and accept 😁</p><br><p>We will text you 5 minutes before your scheduled time of prayer with more information.</p><br><p style="text-align: center;">${startDate.toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"})}</p><p style="text-align: center;">${Time_String}</p><br><div class="btn-container"><a href="${process.env.DOMAIN_NAME}/calendar-invite/?start_date=${startDate.toUTCString()}" target="_blank">Add to Calendar</a></div></div>
                    </div>
                </body>`
        }
    })

    res.status(200).end();
})

router.get('/populate', async (req, res) => {
    await authorize();
    //get all scheduled prayer times after right now
    //create a text job for 5 mins before each prayer time
    // GET PRAYER SCHEDULES AFTER NOW ----------------------------
        const schedules = await axios({
            method: 'get',
            url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules?$filter=DATEADD(minute,5,GETDATE())<Start_Date',
            headers: {
                'content-type': 'application/json',
                'authorization': `Bearer ${access_token}`
            }
        })
            .then(response => response.data)
            .catch(err => console.error(err))
    // -----------------------------------------------------------

    // CREATE TEXT JOBS ------------------------------------------
        for (let i = 0; i < schedules.length; i ++) {
            const {First_Name, Last_Name, Start_Date, Phone} = schedules[i];

            const startDate = new Date(Start_Date)
        
            function toIsoString(date) {
                var tzo = -date.getTimezoneOffset(),
                    dif = tzo >= 0 ? '+' : '-',
                    pad = function(num) {
                        return (num < 10 ? '0' : '') + num;
                    };
            
                return date.getFullYear() +
                    '-' + pad(date.getMonth() + 1) +
                    '-' + pad(date.getDate()) +
                    'T' + pad(date.getHours()) +
                    ':' + pad(date.getMinutes()) +
                    ':' + pad(date.getSeconds()) +
                    dif + pad(Math.floor(Math.abs(tzo) / 60)) +
                    ':' + pad(Math.abs(tzo) % 60);
            }
        
            //gets date/time 5 mins before startDate
            const textNotifyDate = new Date(startDate.getTime() - (5 * 60 * 1000))
            
            await axios({
                method: 'post',
                url: 'https://my.pureheart.org/ministryplatformapi/texts',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`
                },
                data: {
                    "FromPhoneNumberId": 1,
                    "Message": `🙏 Hello ${First_Name}\nIt's your time to pray!\n\n🏡❤️ Our Hearts & Homes\n⛪️ The Church\n✝️ Salvations\n🌱 Our State\n🌎 Our Nation\n🌍 All the Earth\n⛪️ Your Church\n\nFull prayer guide BELOW!\n⬇️ ⬇️\n\nhttps://weprayallday.com/guide`,
                    "StartDate": toIsoString(textNotifyDate),
                    "ToPhoneNumbers": 
                    [Phone]
                }
            })
                .catch(err => console.error(err))
        }
        console.log(schedules.length)
    // -----------------------------------------------------------

    console.log(`${schedules.length} jobs made`)
    res.status(200).send({created: schedules.length}).end();
})

router.post('/sequence', async (req, res) => {
    await authorize();
    const {totalOccurences, dayPosition, weekdays} = req.body;

    try {
        const sequence = await axios({
            method: 'get',
            url: `${process.env.BASE_URL}/tasks/generate-sequence?$type=Monthly&$totalOccurrences=${totalOccurences}&$dayPosition=${dayPosition}&$weekdays=${weekdays}`,
            headers: {
                'Content-Type': 'Application/Json',
                'Authorization': `Bearer ${access_token}`
            }
        })
            .then(response => response.data)
    
        res.status(200).send(sequence).end();
    } catch (err) {
        res.status(500).send(err).end();
    }
})

module.exports = router;