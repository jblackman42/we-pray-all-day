const express = require('express');
const navigation = express.Router();
const ical = require('ical-generator');
const fs = require('fs')
const path = require('path')

//home page
navigation.get('/', (req, res) => {
  res.render('pages/home')
})

//home page
navigation.get('/signup', (req, res) => {
  res.render('pages/sign-up')
})

navigation.get('/guide', (req, res) => {
  fs.readFile(path.join(__dirname, '..', 'views', 'assets', 'guides', 'Feb-Mar 2023.pdf'), function (err,data){
      res.contentType("application/pdf").send(data);
  });
})

navigation.get('/calendar-invite', (req, res) => {
  const {start_date, end_date} = req.query;

  const Start_Date = new Date(start_date);
  const End_Date = new Date(Start_Date.getTime() + 3600000);
  
  const cal = ical({
    events: [
        {
            start: Start_Date,
            end: End_Date,
            summary: 'We Pray All Day',
            description: 'An hour spent in prayer for Maricopa County.'
        }
    ]
  });
  
  cal.serve(res);


  // res.send({msg: 'help me'})
})


module.exports = navigation;