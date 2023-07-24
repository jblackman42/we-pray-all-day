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
        '$filter': `DATEDIFF(day, GETDATE(), '${date}') = 0 AND Message_SID IS NOT NULL`,
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
        '$select': `Prayer_Schedule_ID, Prayer_Schedules.[First_Name], Prayer_Schedules.[Last_Name], Prayer_Schedules.[Start_Date], Phone, WPAD_Community_ID_Table.[Reminder_Text], Message_Status, Message_SID`,
      },
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.data)
  
    
    for (const prayer of currPrayers) {
      const { First_Name, Last_Name, Start_Date, Message_SID, Phone, Prayer_Community_ID, Company_Name, Reminder_Text } = prayer;

      const defaultPrayerPoints = 'Our Hearts & Homes\nThe Church\nSalvations\nOur State\nOur Nation\nAll the Earth\nYour Church'

      const textBody = `Hi ${First_Name}! It's your time to pray!\nHere are some things to pray about:\n\n${Reminder_Text || defaultPrayerPoints}\n\nAccess the full prayer guide here:\nhttps://rb.gy/clhwr1\n\nThis text reminder is brought to you by We Pray All Day.\nReply 'STOP' to unsubscribe.`;
      
      await client.messages
        .create({
          body: textBody,
          messagingServiceSid: process.env.TWILIO_SERVICE_SID,
          // to: Phone,
          to: '530-551-8112',
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




router.get('/daily-texts', async (req, res) => {
  const { ids } = req.query;

  if (!ids) return res.status(400).send({error: 'Missing Parameter: ids'}).end();
  
  try {
    const prayer_schedules = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      params: {
        $select: `Prayer_Schedule_ID, First_name, Phone`,
        $filter: `Cancelled=0 AND Prayer_Schedule_ID IN (${ids})`
      },
      headers: {
        'Content-Type': 'Application/Json',
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    })
      .then(response => response.data)

    for (const prayer of prayer_schedules) {
      const { First_name, Phone } = prayer;
      
      // const textBody = `Hi ${First_Name}! It's your time to pray!\nHere are some things to pray about:\n\n${Reminder_Text || defaultPrayerPoints}\n\nAccess the full prayer guide here:\nhttps://rb.gy/clhwr1\n\nThis text reminder is brought to you by We Pray All Day.\nReply 'STOP' to unsubscribe.`;
      const textBody = `Hello ${First_name}! Here's a reminder that your time of prayer is tomorrow. Thank you for being a part of We Pray All Day.\n\nReply 'STOP' to unsubscribe`;
      
      await client.messages
        .create({
          body: textBody,
          messagingServiceSid: process.env.TWILIO_SERVICE_SID,
          // to: Phone,
          to: '530-551-8112',
          // to: '720-984-7345',
        })
    }

    res.status(200).send({msg: 'Texts sent successfully'}).end();
  } catch (error) {
    console.error(error);
    res.status(500).send({error: 'Internal Server Error'}).end();
  }
})




module.exports = router;