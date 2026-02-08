// server.js

// set up ======================================================================
const express = require('express');
const reload = require('reload');
const app = express();


// configuration ===============================================================
// use public folder for js, css, imgs, etc
app.use(express.static("static"));
app.use(express.static(`${__dirname}/ui-react/build`));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Read the .env-file
require('dotenv').config();

// Initialize WiFi configuration
const initWiFi = require('./app/init-wifi');
initWiFi().catch(err => console.error('WiFi initialization error:', err));

// routes ======================================================================
require("./app/routes.js")(app);

// launch ======================================================================
const port = process.env.PORT || 8080;

const theserver = app.listen(port, function() {
	// call controller functions -------------------------------------------------
	const io = require('socket.io')(theserver);

	// controller if using room lists
	const controller = require('./app/socket-controller.js')(io);

	// log something so we know the server is working correctly
	console.log(`Started on port: ${port}`);
});

