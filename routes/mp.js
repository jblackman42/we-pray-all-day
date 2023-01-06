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
    
    access_token = data.access_token;
    return access_token;
}

//home page
router.get('/Prayer_Schedules', async (req, res) => {
    if (!access_token) await authorize();

    try {
        const data = await axios({
            method: 'get',
            url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        })
            .then(response => response.data);
        
        res.status(200).send({Prayer_Schedules: data}).end();
    } catch (err) {
        res.status(500).send({error: err}).end();
    }
})

module.exports = router;