const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');

router.post('/', async (req, res) => {
    const logging = 1;
    const {Address_Line, City, State, Church_Name, Postal_Code, Phone, First_Name, Last_Name, Email, Prayer_Requests, Pattern, Username, Password} = req.body;
    // get access token
    // make address
    // make household
    // make contact
    // make user
    // set user password
    // add user to user group
    let accessToken, address, household, contact, user, group, community;
    try {
        // get access token ---------------------------------------- //
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
        accessToken = access_token;
        // make address -------------------------------------------- //
        address = await axios({
            method: 'post',
            url: `${process.env.BASE_URL}/tables/Addresses`,
            headers: {
                "Content-Type": "Application/JSON",
                "Authorization": `Bearer ${access_token}`
            },
            data: [{
                "Address_Line_1": Address_Line,
                "City": City,
                "State/Region": State,
                "Postal_Code": Postal_Code,
                "Country_Code": "USA"
            }]
        })
            .then(response => response.data[0]);
        if (logging) console.log('address created')
        // make household ------------------------------------------ //
        household = await axios({
            method: 'post',
            url: `${process.env.BASE_URL}/tables/Households`,
            headers: {
                "Content-Type": "Application/JSON",
                "Authorization": `Bearer ${access_token}`
            },
            data: [{
                "Household_Name": Church_Name,
                "Address_ID": address.Address_ID,
                "Home_Phone": Phone,
                "Congregation_ID": 10,
                "Household_Source_ID": 63,
                "Household_Preferences": null,
                "Home_Phone_Unlisted": false,
                "Home_Address_Unlisted": false,
                "Bulk_Mail_Opt_Out": false,
                "Repeats_Annually": false
            }]
        })
            .then(response => response.data[0]);
            if (logging) console.log('household created')
        // make contact -------------------------------------------- //
        contact = await axios({
            method: 'post',
            url: `${process.env.BASE_URL}/tables/Contacts`,
            headers: {
                "Content-Type": "Application/JSON",
                "Authorization": `Bearer ${access_token}`
            },
            data: [{
                "Display_Name": `${Last_Name}, ${First_Name}`,
                "First_Name": First_Name,
                "Last_Name": Last_Name,
                "Nickname": First_Name,
                "Email_Address": Email,
                "Mobile_Phone": Phone,
                "Company": true,
                "Company_Name": Church_Name,
                "Household_ID": household.Household_ID
            }]
        })
            .then(response => response.data[0]);
            if (logging) console.log('contact created')
        // make user ----------------------------------------------- //
        user = await axios({
            method: 'post',
            url: `${process.env.BASE_URL}/tables/dp_Users`,
            headers: {
                "Content-Type": "Application/JSON",
                "Authorization": `Bearer ${access_token}`
            },
            data: [{
                "User_Name": Username,
                "Display_Name": `${Last_Name}, ${First_Name}`,
                "Admin": false,
                "Contact_ID": contact.Contact_ID
            }]
        })
            .then(response => response.data[0]);
        if (logging) console.log('user created')
        // add to user group --------------------------------------- //
        group = await axios({
            method: 'post',
            url: `${process.env.BASE_URL}/tables/dp_User_User_Groups`,
            headers: {
                "Content-Type": "Application/JSON",
                "Authorization": `Bearer ${access_token}`
            },
            data: [{
                "User_ID": user.User_ID,
                "User_Group_ID": process.env.AUTHORIZED_USER_GROUP_ID    
            }]
        })
            .then(response => response.data[0]);
        console.log(group)
        if (logging) console.log('added user to group')
        // set user password --------------------------------------- //
        await axios({
            method: 'post',
            url: `${process.env.BASE_URL}/users/${user.User_ID}/set-user-password`,
            headers: {
                "Content-Type": "Application/JSON",
                "Authorization": `Bearer ${access_token}`
            },
            data: {
                "NewPassword": Password
            }
        })
        if (logging) console.log('set new password')

        community = await axios({
            method: 'post',
            url: `${process.env.BASE_URL}/tables/Prayer_Communities`,
            headers: {
                "Content-Type": "Application/JSON",
                "Authorization": `Bearer ${access_token}`
            },
            data: [{
                "Contact_ID": contact.Contact_ID,
                "Address_ID": address.Address_ID,
                "Prayer_Points": Prayer_Requests,
                "Start_Date": new Date(),
                "End_Date": null,
                "Pattern": Pattern
            }]
        })
        if (logging) console.log('created community')
        
        res.sendStatus(200)
    } catch(err) {
        // if something goes wrong it will delete anything that was just made
        if (logging) console.log('something went wrong: deleting everything')
        if (contact) {
            // updates contact to remove household and user id
            // this prevents circular errors when deleting
            await axios({
                method: 'put',
                url: `${process.env.BASE_URL}/tables/Contacts`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                data: [
                    {
                        Contact_ID: contact.Contact_ID,
                        Household_ID: null,
                        User_Account: null
                    }
                ]
            })
            await axios({
                method: 'delete',
                url: `${process.env.BASE_URL}/tables/Contacts/${contact.Contact_ID}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            .catch(err => console.log('failed to delete contact'))
        }
        if (user) {
            // deletes user if one was made
            await axios({
                method: 'delete',
                url: `${process.env.BASE_URL}/tables/dp_Users/${user.User_ID}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            .catch(err => console.log('failed to delete user'))
        }
        if (household) {
            // deletes household if one was made
            await axios({
                method: 'delete',
                url: `${process.env.BASE_URL}/tables/Households/${household.Household_ID}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            .catch(err => console.log('failed to delete household'))
        }
        if (address) {
            // deleted address if one was made
            await axios({
                method: 'delete',
                url: `${process.env.BASE_URL}/tables/Addresses/${address.Address_ID}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            .catch(err => console.log('failed to delete address: ', err))
        }
        if (community) {
            // delete community if one was made
            await axios({
                method: 'delete',
                url: `${process.env.BASE_URL}/tables/Prayer_Communities/${community.Prayer_Community_ID}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            })
        }
        res.status(500).send({error: "Internal Server Error. Try Again or Contact Us"}).end();
    }
})

module.exports = router;