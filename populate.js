const axios = require('axios');
const qs = require('qs');
const schedule = require('node-schedule');

const populate = async () => {
    //get access token
    //get all scheduled prayer times after right now
    //create a text job for 5 mins before each prayer time

    // GET ACCESS TOKEN ------------------------------------------
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
        
        const access_token = data.access_token;
    // -----------------------------------------------------------

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

        console.log(schedules)
    // -----------------------------------------------------------
    
    // CREATE TEXT JOBS ------------------------------------------
        for (let i = 0; i < schedules.length; i ++) {
            const {First_Name, Last_Name, Start_Date, Email, Phone} = schedules[i];
        
            const startDate = new Date(Start_Date)
        
            //gets date/time 5 mins before startDate
            const textNotifyDate = new Date(startDate.getTime() - (5 * 60 * 1000))
            
            const job = schedule.scheduleJob(textNotifyDate, async () => {
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
Hello ${First_Name} ${Last_Name},

It's your time to pray!
                        `,
                        "ToPhoneNumbers": 
                        [Phone]
                    }
                })
    })
        }
    // -----------------------------------------------------------

    console.log(`${schedules.length} jobs made`)
}

module.exports = {
    populate    
}