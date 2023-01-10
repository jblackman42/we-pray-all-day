const axios = require('axios');
const express = require('express');
const router = express.Router();
const qs = require('qs');
// const IP = require('ip');

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
    
    const {Recipient_Name, Recipient_Email, Start_Date, End_Date, Community_ID} = req.body;
    console.log(req.body)

    res.status(200).end();
})

module.exports = router;