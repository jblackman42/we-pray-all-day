const express = require('express');
const navigation = express.Router();
const ical = require('ical-generator');
const fs = require('fs')
const path = require('path')

const { ensureAuthenticated, checkUserGroups } = require('../middleware/authorize');

//home page
navigation.get('/', (req, res) => {
  res.render('pages/home')
})

navigation.get('/signup', (req, res) => {
  res.render('pages/sign-up')
})
navigation.get('/leaders', (req, res) => {
  res.render('pages/leaders')
})
navigation.get('/notaboutus', (req, res) => {
  res.render('pages/not-about-us')
})
navigation.get('/login', (req, res) => {
  res.render('pages/login', {error: null})
})
navigation.get('/register', (req, res) => {
  res.render('pages/register')
})
navigation.get('/dashboard', ensureAuthenticated, checkUserGroups, (req, res) => {
  res.render('pages/dashboard')
})

navigation.get('/logout', (req, res) => {
  try {
      req.session.user = null;
      req.session.access_token = null;
      res.redirect('/')
  } catch(err) {
      res.status(500).send({error: 'internal server error'})
  }
})

navigation.get('/guide', (req, res) => {
  const filename = 'Apr-May 2023.pdf'
  fs.readFile(path.join(__dirname, '..', 'views', 'assets', 'guides', filename), function (err,data){
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