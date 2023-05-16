const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const getAccessToken = async () => {
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
  return data.access_token;
}

router.post('/', (req, res) => {
  const { toNumber, messageBody, sendAt } = req.body;

  try {
    const secondsBetween = Math.abs(new Date(sendAt).getTime() - new Date().getTime()) / 1000
    const validSchedule = secondsBetween > 900 && secondsBetween < 604800;
  
    // if (!validSchedule) return res.status(400).send('invalid time value').end();
  
    const textData = sendAt && validSchedule ? {
      body: messageBody,
      messagingServiceSid: process.env.TWILIO_SERVICE_SID,
      to: toNumber,
      sendAt: new Date(sendAt).toISOString(),
      scheduleType: 'fixed'
    } : {
      body: messageBody,
      messagingServiceSid: process.env.TWILIO_SERVICE_SID,
      to: toNumber
    }

    client.messages
      .create(textData)
      .then(message => res.send(message.sid));
  } catch(err) {
    res.status(500).send(err).end();
  }
})

router.get('/check-texts', async (req, res) => {

  const { date } = req.query;
  
  if (!date) return res.status(400).send({err: 'no date provided'}).end();

  try {

    const currentPrayers = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      params: {
        '$filter': `DATE(GETDATE()) = DATE(${date}) AND Message_SID IS NOT NULL`,
        '$select': `Prayer_Schedule_ID, Message_Status, Message_SID`
      },
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.data);

    for (const prayer of currentPrayers) {

      const status = await client.messages(prayer.Message_SID)
        .fetch()
        .then(message => message.status);

      const deliveredStatuses = ['sent', 'delivered', 'read'];
      const scheduledStatuses = ['accepted', 'scheduled', 'queued', 'sending']

      prayer.Message_Status = deliveredStatuses.includes(status) ? 3 : scheduledStatuses.includes(status) ? 2 : 4;
    }

    await axios({
      method: 'put',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      data: currentPrayers,
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.data)

    res.send(currentPrayers)

  } catch (err) {
    console.error(err)
    res.status(500).send(err).end();
  }
})

router.get('/send-texts', async (req, res) => {
  const {ids} = req.query;
  
  if (!ids) return res.status(400).send({err: 'no prayer schedule ids provided'}).end();

  try {
    const updatedPrayers = [];
    const currPrayers = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      params: {
        '$filter': `Prayer_Schedule_ID IN ${ids} AND Message_SID IS NULL`,
        '$select': `Prayer_Schedule_ID, Prayer_Schedules.[First_Name], Prayer_Schedules.[Last_Name], Prayer_Schedules.[Start_Date], Phone, Prayer_Schedules.[Prayer_Community_ID], Prayer_Community_ID_Table_Contact_ID_Table.[Company_Name], Message_Status, Message_SID`,
      },
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.data)
  
    
    for (const prayer of currPrayers) {
      const { First_Name, Last_Name, Start_Date, Message_SID, Phone, Prayer_Community_ID, Company_Name } = prayer;
      
      await client.messages
        .create({
          body: `${First_Name} ${Last_Name}\n${Phone}\n${Company_Name}\n\nNow using SQL jobs`,
          messagingServiceSid: process.env.TWILIO_SERVICE_SID,
          to: '5305518112'
          // to: Phone
        })
        .then(message => {
          prayer.Message_SID = message.sid;
          prayer.Message_Status = 2;
          updatedPrayers.push(prayer)
        })
        .catch(err => {
          console.error(err)
        })
    }
  
    
    // update records in MP
    await axios({
      method: 'put',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      data: updatedPrayers,
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    })
  
    res.send(updatedPrayers);
  } catch (error) {
    console.error(error)
    res.status(500).send(error).end();
  }
})

module.exports = router;