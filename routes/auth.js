const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');

const { ensureAuthenticated } = require('../middleware/authorize');

const getToken = async () => {
    const data = await axios({
        method: 'post',
        url: `${process.env.BASE_URL}/oauth/connect/token`,
        data: qs.stringify({
            grant_type: "client_credentials",
            scope: "http://www.thinkministry.com/dataplatform/scopes/all",
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET
        })
    })
        .then(response => response.data)
    const {access_token} = data;
    return access_token;
}

router.post('/login', async (req, res) => {
    const {username, password, remember} = req.body;
    
    try {
        const login = await axios({
            method: 'post',
            url: `${process.env.BASE_URL}/oauth/connect/token`,
            data: qs.stringify({
                grant_type: "password",
                scope: "http://www.thinkministry.com/dataplatform/scopes/all openid offline_access",
                client_id: process.env.CLIENT_ID,
                username: username,
                password: password
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64')}`
            }
        })
            .then(response => response.data)
        
        const {access_token, token_type, refresh_token, expires_in} = login;

        const user = await axios({
            method: 'get',
            url: `${process.env.BASE_URL}/oauth/connect/userinfo`,
            headers: {
                'Authorization': `${token_type} ${access_token}`
            }
        })
            .then(response => response.data)
            .catch(err => console.log(err))

        req.session.user = user;
        req.session.access_token = access_token;
        // if user selected keep me logged in, set refresh token, otherwise set in to null
        req.session.refresh_token = remember ? refresh_token : null;
        
        res.status(200).send(user).end();
    } catch (err) {
        if (err.response && err.response.data.error_description) {
            res.status(403).send({error: err.response.data.error_description}).end();
        } else if (err.response && err.response.data) {
            res.status(403).send({error: err.response.data.error}).end();
        } else {
            console.log(err)
            res.status(500).send({error: 'internal server error'})
        }
    }
})

router.get('/logout', (req, res) => {
    try {
        req.session.user = null;
        req.session.access_token = null;
        req.session.refresh_token = null;
        res.redirect('/')
    } catch(err) {
        res.status(500).send({error: 'internal server error'})
    }
})

router.get('/user', (req, res) => {
    if (req.session.user) {
        res.send(req.session.user).end()
    } else {
        res.send(null).end()
    }
})

router.get('/group', ensureAuthenticated, async (req, res) => {
    try {
        const {user} = req.session;
        const access_token = await getToken();
        
        const group = await axios({
            method: 'get',
            url: `${process.env.BASE_URL}/tables/Prayer_Communities?$filter=Contact_ID=${user.ext_Contact_ID}`,
            headers: {
                "Content-Type": "Application/JSON",
                "Authorization": `Bearer ${access_token}`
            }
        })
            .then(response => response.data[0] || null)

        res.status(200).send(group).end();
    } catch(err) {
        res.status(500).send({err: err}).end();
    }
})

module.exports = router;