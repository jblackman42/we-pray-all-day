const express = require('express');
const navigation = express.Router();

//home page
navigation.get('/', (req, res) => {
  res.render('pages/home')
})

//home page
navigation.get('/signup', (req, res) => {
  res.render('pages/sign-up')
})


module.exports = navigation;