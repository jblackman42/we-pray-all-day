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

router.get('/schedule-texts', async (req, res) => {

  // get todays prayers
  // loop through all prayers
  // calculate time 5 mins before prayer time
  // schedule each prayer for calculated time

  const { date } = req.query;
  const texts = [];
  
  try {
    const scheduleDate = date ? new Date(date) : new Date();
    const todaysPrayers = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      params: {
        '$filter': `YEAR(Prayer_Schedules.[Start_Date]) = ${scheduleDate.getFullYear()} AND MONTH(Prayer_Schedules.[Start_Date]) = ${scheduleDate.getMonth() + 1} AND DAY(Prayer_Schedules.[Start_Date]) = ${scheduleDate.getDate() + 1} AND Message_SID IS NULL`,
        // '$filter': `YEAR(Prayer_Schedules.[Start_Date]) = 2023 AND MONTH(Prayer_Schedules.[Start_Date]) = 5 AND DAY(Prayer_Schedules.[Start_Date]) = 10`,
        '$select': `Prayer_Schedule_ID, Prayer_Schedules.[First_Name], Prayer_Schedules.[Start_Date], Phone, Prayer_Schedules.[Prayer_Community_ID], Prayer_Community_ID_Table_Contact_ID_Table.[Company_Name], Message_Status, Message_SID`,
        '$orderby': `Prayer_Schedules.[Start_Date]`
      },
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.data);
  
    for (const prayer of todaysPrayers) {
      const { First_Name, Start_Date, Phone, Prayer_Community_ID, Company_Name } = prayer;
      // get prayer start date minus 5 minutes
      const textScheduleTime = new Date(new Date(Start_Date).getTime() - (60000 * 5));
      
      const textData = {
        body: `🙏 Hello ${First_Name}\nIt's your time to pray!\n\n🏡❤️ Our Hearts & Homes\n⛪️ The Church\n✝️ Salvations\n🌱 Our State\n🌎 Our Nation\n🌍 All the Earth\n⛪️ Your Church\n\nFull prayer guide BELOW!\n⬇️ ⬇️\n\n https://rb.gy/clhwr1 \n\n Reply STOP to unsubscribe`,
        messagingServiceSid: process.env.TWILIO_SERVICE_SID,
        to: '5305518112',
        // to: Phone,
        // sendAt: textScheduleTime.toISOString(),
        // scheduleType: 'fixed'
      }
      
      await client.messages
        .create(textData)
        .then(message => {
          console.log(message.sid)
          prayer.Message_SID = message.sid;
          prayer.Message_Status = 2;
          texts.push(prayer)
        });
    }

    await axios({
      method: 'put',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      data: texts,
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.data)
  
    res.send(texts);
  } catch (err) {
    console.error(err)
    res.status(500).send(err).end();
  }
})

router.get('/check-text-statuses', async (req, res) => {
  try {

    const { date } = req.query;

    const scheduleDate = date ? `'${date}'` : 'GETDATE()'

    const currentPrayers = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      params: {
        '$filter': `YEAR(Prayer_Schedules.Start_Date) = YEAR(${scheduleDate}) AND MONTH(Prayer_Schedules.Start_Date) = MONTH(${scheduleDate}) AND DAY(Prayer_Schedules.Start_Date) = DAY(${scheduleDate}) AND DATEPART(HOUR, Prayer_Schedules.Start_Date) = DATEPART(HOUR, ${scheduleDate})`,
        // '$filter': `YEAR(Prayer_Schedules.[Start_Date]) = 2023 AND MONTH(Prayer_Schedules.[Start_Date]) = 5 AND DAY(Prayer_Schedules.[Start_Date]) = 10`,
        '$select': `Prayer_Schedule_ID, Prayer_Schedules.[First_Name], Prayer_Schedules.[Start_Date], Phone, Prayer_Schedules.[Prayer_Community_ID], Prayer_Community_ID_Table_Contact_ID_Table.[Company_Name], Message_Status, Message_SID`,
        '$orderby': `Prayer_Schedules.[Start_Date]`
      },
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.data);

    for (const prayer of currentPrayers) {
      if (!prayer.Message_SID) {
        prayer.Message_Status = 4;
        continue;
      }

      const status = await client.messages(prayer.Message_SID)
        .fetch()
        .then(message => message.status);

      console.log(status)

      const deliveredStatuses = ['sent', 'delivered', 'read'];

      prayer.Message_Status = deliveredStatuses.includes(status) ? 3 : 4;
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

module.exports = router;