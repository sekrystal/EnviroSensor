/*
  MCP3008 ADC temperature and humidity reader

  Reads two channels of an MCP3008 analog-to-digital converter
  and prints them out. Reads temperature and humidity using
 the Analog Devices TMP36 and the Honeywell HIH-4030.
 
 Example derived from the datasheets, and from numerous examples,
 including Adafruit, Bildr, the Arduino forums, and others:
 TMP36 datasheet:http://www.ladyada.net/media/sensors/TMP35_36_37.pdf
 HIH-4030 datasheet:https://www.sparkfun.com/datasheets/Sensors/Weather/SEN-09569-HIH-4030-datasheet.pdf
 Adafruit on TMP36: http://learn.adafruit.com/tmp36-temperature-sensor/
 Bildr on HIH-4030: http://bildr.org/2012/11/hih4030-arduino/
 Arduino forum example for HIH-4030: http://forum.arduino.cc/index.php/topic,19961.0.html
 my own example for Arduino: https://github.com/tigoe/SensorExamples/blob/master/EnvironmentalSensors/TempHumiditySens$
 Circuit:
 * TMP36 on ADC input 0
 * HIH-4030 on ADC input 2

  created 3 March 2020
  by Tom Igoe
*/

//ORDER OF OPERATIONS:
//1. Variables/Constants
//2. Read Function
//3. Callback & Send function


// ORDER OF OPERATION 1
//Include my sensor, this allows me to import my humidity/temp data from device, from git repo code(this also defines sensor so I can call it later)
let sensor = require("node-dht-sensor");

let device = {};          // object for device characteristics
let readingInterval;      // interval to do readings (initialized at bottom)


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

//From Tom's Code: in order to send my requests I need
//1. To make sure it's communicating over the proper TLS (HTTPS is secure)
const https = require('https');
// change the hostname, macAddress, and sessionKey to mine (Thanks for the key, Tom)
let hostName = 'tigoe.io';
let macAddress = 'b8:27:eb:d8:52:fd';
let sessionKey = 'F9E3408B-ABE1-44AF-9F5B-96469C85B13D';

/*
        the callback function to be run when the server response comes in.
        this callback assumes a chunked response, with several 'data'
        events and one final 'end' response.
*/
function getServerResponse(response) {
    // when the final chunk comes in, print it out:
    response.on('end', function (data) {
        console.log(data);
    });
}

// Tom includes the following ADC code for sensors that don't have digital convertors, the sensor Cy gave me does, so I can comment it out

// // open two ADC channels:
// let tempSensor = mcpadc.open(0, sampleRate, addNewChannel);
// let humiditySensor = mcpadc.open(2, sampleRate, addNewChannel);

// // callback for ADC open() commands. Doesn't do anything here:
// function addNewChannel(error) {
//    if (error) throw error;


//I can also comment out the way Tom connects to his sensor, but i'll keep it in case I ever want to use a temp/humidity sensor that 

// // callback function for tempSensor.read():
// function getTemperature(error, reading) {
//    if (error) throw error;
//  // range is 0-1. Convert to Celsius (see TMP36 data sheet for details)
//    let temperature = (reading.value * supplyVoltage - 0.5) * 100;
//    // convert to a floating point number of 2 decimal point precision:
//    device.temperature = Number(temperature.toFixed(2));
// }

// // callback function for humiditySensor.read():
// function getHumidity(error, reading) {
//    if (error) throw error;
//    let rhSlope = 0.0062 * supplyVoltage; // humidity sensor slope
//    let rhOffset = 0.16 * supplyVoltage;  // humidity sensor offset

//    // convert to voltage:
//    var humidityVoltage = (reading.value / resolution) * supplyVoltage;
//    // convert to relative humidity (rH): 
//    var sensorRH = (humidityVoltage - rhOffset) / rhSlope;
//    // adjust for temperature:
//    var trueRH = sensorRH / (1.0546 - (0.00216 * device.temperature));
//    // convert to a floating point number of 2 decimal point precision:
//    device.humidity = Number(trueRH.toFixed(2));


// I drew from this section substantially in my sensorRead() function

// // // get sensor readings into the object called device:
// function getReadings() {
//     // get readings:
//     tempSensor.read(getTemperature);
//     humiditySensor.read(getHumidity);
//     // if they're both numbers:
//     if (!isNaN(device.temperature) && !isNaN(device.humidity)) {
//   // print them and send to server:
//        console.log(device);
//        sendToServer(JSON.stringify(device));
//        // stop reading:
//        clearInterval(readingInterval);
//     }
//  }
// }

//ORDER OF OPERATION 2
//I need to set up a function that reads my sensor, stores it in the "device" object, and sends that stored information
function sensorRead() {

    // Here I setup my callback function for the sensors, need to throw error for syntax 
    // I didn't really get this part so I learned more about err and why I use it here: https://www.joyent.com/node-js/production/design/errors
    //The sensor.read syntax comes from the proprietary library for my sensor https://github.com/momenso/node-dht-sensor
    // I used GPIO4 for my sensor reading (technically pin 7, but again, this was the repo syntax) because my sensor communicates over a 1-wire interface   
    sensor.read(11, 4, function (err, temperature, humidity) {
        // read the values of each device sensor, and establish them as numbers precise to two decimal points
        device.tempSensorVal = Number(temperature);
        device.humiditySensorVal = Number(humidity);
        if(!err){
            console.log(temperature);
            console.log(humidity);
        }
    });

    // Callback: If the feedback from the device sensors are numbers...
    if (!isNaN(device.tempSensorVal) && !isNaN(device.humiditySensorVal)) {
        // ...print them ... 
        console.log(device);
        //...and send to server as the device json object:
        sendToServer(JSON.stringify(device));
    // } else {
    //     console.log(device.tempSensorVal, device.humiditySensorVal);
    //     console.log(device);
    //     //...and send to server as the device json object:
    //     sendToServer(JSON.stringify(device));
    // }
    

    // From Tom's code:
    // assemble the HTTPS request and send it:
    function sendToServer(dataToSend) {
        // make the POST data a JSON object and stringify it:
        let postData = JSON.stringify({
            'macAddress': macAddress,
            'sessionKey': sessionKey,
            'data': dataToSend
        });

        // Note from Tom:

        /*
         set up the options for the request.
         the full URL in this case is:
         http://example.com:443/data
        */

        // This is the "polite" way to say "i'm sending you some node js info" to Tom's server   
        var options = {
            host: hostName,
            port: 443,
            path: '/data',
            method: 'POST',
            headers: {
                'User-Agent': 'nodejs',
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };

        var request = https.request(options, getServerResponse); // start it
        request.write(postData); // send the data
        request.end(); // end it

    }
}
}
function displayScreen() {
    //"Reset" display screen
    oled.clearDisplay();
    oled.setCursor(0, 0);
    // Adapted from Tom's code, to send humidtiy and temperature variables over
    let numTemp = String(device.tempSensorVal); 
    let numHum = String(device.humiditySensorVal);
    // Concatinate string to send for screen to represent
    oled.writeString(font, 1,  numTemp + '°C' + "\n" + numHum + '%', 1, true);
 }

 function doBoth(){
    sensorRead();
    displayScreen();
 }

// set an interval to keep running. The callback function (getReadings)P
// will clear the interval when it gets good readings:
readingInterval = setInterval(displayScreen, 1000);