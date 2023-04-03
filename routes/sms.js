const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const { MessagingResponse } = require('twilio').twiml;

const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const minTime = 900 * 1000;//ms
    const { sendToNumber, message, sendDate } = req.body;

    const sendDateObj = sendDate ? new Date(sendDate) : new Date();
    if (!sendToNumber || !message || !(sendDateObj instanceof Date && !isNaN(sendDateObj))) return res.sendStatus(400);

    console.log(sendDateObj.getTime() - new Date().getTime())
    const isFuture = sendDateObj.getTime() - new Date().getTime() > minTime;
    console.log(isFuture)

    const body = isFuture ? {
      messagingServiceSid: process.env.TWILIO_SERVICE_SID,      
      to: sendToNumber ,
      body: message,  
      scheduleType: 'fixed',
      sendAt: sendDateObj.toISOString()
    }
    : {
      messagingServiceSid: process.env.TWILIO_SERVICE_SID,      
      to: sendToNumber ,
      body: message
    }

    const messageData = await client.messages 
      .create(body)
      // .then((message) => res.status(200).send(message).end())

    console.log(messageData.sid)
    res.status(200).send(messageData).end();
  } catch (err) {
    console.log(err)
    res.sendStatus(400)
  }
})

router.post('/sms', (req, res) => {
  const twiml = new MessagingResponse();

  twiml.message('The Robots are coming! Head for the hills!');

  res.type('text/xml').send(twiml.toString());

})



module.exports = router;