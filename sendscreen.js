
let sensor = require("node-dht-sensor");

let device = {};          // object for device characteristics
let readingInterval;      // interval to do readings (initialized at bottom)

let t = 0;
let h = 0;

//Return promise string for network status
var Wifi = require('rpi-wifi-connection');
var wifi = new Wifi();
 


// Now for Screen setup information
const i2c = require('i2c-bus');
const i2cBus = i2c.openSync(1);
const screen = require('oled-i2c-bus');
//Setting the font that my screen uses
const font = require('oled-font-5x7');
let opts = {
    width: 128,     // screen width
    height: 64,    // screen height
    address: 0x3C  // I2C address for my model
 };
// make an instance of the OLED library
let oled = new screen(i2cBus, opts);

const https = require('https');
let hostName = 'tigoe.io';
let macAddress = 'b8:27:eb:d8:52:fd';
let sessionKey = 'F9E3408B-ABE1-44AF-9F5B-96469C85B13D';


function getServerResponse(response) {
    // when the final chunk comes in, print it out:
    response.on('end', function (data) {
        console.log(data);
    });
}

function sensorRead() { 
    sensor.read(11, 4, function (err, temperature, humidity) {
        if (temperature != t || humidity != h) {
            oled.clearDisplay();
        }
        t= temperature;
        h= humidity;
        device.tempSensorVal = Number(temperature);
        device.humiditySensorVal = Number(humidity);
        if(!err){
            console.log(temperature);
            console.log(humidity);
        }
    });
    if (!isNaN(device.tempSensorVal) && !isNaN(device.humiditySensorVal)) {
        console.log(device, "sent");
    }
}

function displayScreen() {
    //"Reset" display screen
    oled.setCursor(0, 0);
    // Adapted from Tom's code, to send humidtiy and temperature variables over
    let numTemp = String(device.tempSensorVal); 
    let numHum = String(device.humiditySensorVal);
    //to get wifi status
    wifi.getStatus().then((status) => {
        console.log(status);
    //and print the screen!    
        oled.writeString(font, 1, "Temperature: " + numTemp + '°C' + "\n" + "Humidity: " + numHum + '%' + "\n" + status.ssid + "\n" + status.ip_address + "\n" + "PLEASE DON'T UNPLUG", 1, true);
    })
}

 function doBoth(){
    sensorRead();
    displayScreen();
 }

 sensorRead();
// set an interval to keep running. The callback function (getReadings)P
// will clear the interval when it gets good readings:
readingInterval = setInterval(doBoth, 1000);