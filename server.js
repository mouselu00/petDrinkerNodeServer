//express server pack
// cros:https://www.jianshu.com/p/f219ff84c5e5
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');


//raspberry pi Access point setup pack
const piWifi = require('pi-wifi');

//mqtt pack
var mqtt = require('mqtt');

// Raspberry pi GPIO and serail port
const Gpio = require('onoff').Gpio;
const SerialPort = require('serialport');
const ReadLine = SerialPort.parsers.Readline;

// Shell Execetu Module
const Exec = require('child_process').exec;

// global variable
const app = express();
const interface = "wlan1";
const broker_link = "mqtt://broker.mqttdashboard.com";
const broker_link2 = "ws://test.mosquitto.org";
const broker_port = "";
const broker_port2 = "8080";
const broker_sub = "/";
const broker_sub2 = "/mqtt";
const borker_clientID = Math.random().toString(36).substr(2, 9);
const topic_list = ["petDrinker/mode", "petDrinker/now"];
const btnPin = 4;
const usbPort = '/dev/ttyACM0';
const baudRate = 115200;
var btnStatus = false;
const serialParser = new ReadLine("\n\r\g");
const serialPort = new SerialPort(usbPort, {
    baudRate: baudRate
}, function (err) {
    if (err) {
        return console.log(`error serial port : ${err.message}`)
    }
})
serialPort.pipe(serialParser);
const piBtn = new Gpio(btnPin, 'in', 'falling');
var AP_Status = 1; //1 = on , 0 = off , 2 = restart

// express middleware use setup
app.use(express.static(path.join(__dirname, 'dist')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

// express accapt all http header data passing (CROS)
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


// express route handle
app.get('/', function (req, res) {
    res.sendfile(__dirname + "/dist/index.html")
})

app.get('/scanWifi', (req, res) => {
    piWifi.status(interface, function (err, status) {
        if (err) {
            console.log(err.message);
        } else {
            piWifi.setCurrentInterface(interface, function (err) {
                if (err) {
                    console.log(err.message);
                } else {
                    piWifi.scan(function (err, foundNetwork) {
                        if (!err) {
                            res.json(foundNetwork)
                            // console.log(foundNetwork);
                        }
                    })
                }
            })
        }
    })
});

app.get('/statusConnection', (req, res) => {
    piWifi.status(interface, function (err, status) {
        if (err) {
            console.log(err.message);
            res.json({
                ssid: "",
                deviceNumber: ""
            })

        } else {
            // res.json({ssid:status.ssid});
            try {
                let wifiConfigDetail = fs.readFileSync(path.resolve(__dirname, 'public/documents/wificonfig.json'));
                let wifiConfigJson = JSON.parse(wifiConfigDetail);
                console.log("JSON FILE" + wifiConfigJson);
                res.json({
                    ssid: status.ssid,
                    deviceNumber: wifiConfigJson.device
                })
            } catch (err) {
                console.log("Fail fail" + err);
                res.json({
                    ssid: status.ssid,
                    deviceNumber: ""
                })
            }

        }
    })
});

app.post('/setWifi', (req, res) => {
    let deviceDetail = `{"ssid":"${req.body.ssid}" , "pass":"${req.body.pass}" , "device":"${req.body.device}"}`;
    piWifi.connectTo({
        ssid: req.body.ssid,
        password: req.body.pass
    }, function (err) {
        if (!err) { //Network created correctly
            setTimeout(function () {
                piWifi.check(req.body.ssid, function (err, status) {
                    if (!err && status.connected) {
                        console.log('Connected to the network !');
                        fs.writeFileSync(path.resolve(__dirname, 'public/documents/wificonfig.json'), deviceDetail);
                        res.json({
                            connectionStatus: true,
                            message: '連線成功'
                        });
                        //client.reconnect();

                    } else {
                        console.log('Unable to connect to the network !');
                        res.json({
                            connectionStatus: false,
                            message: '連線無線網路失敗'
                        });
                    }
                });
            }, 3000);
        } else {
            p
            console.log('Unable to create the network .');
            res.json({
                connectionStatus: false,
                message: '連線無線網路失敗'
            });
        }
    });
    console.log(deviceDetail);

});

// arduino communication
serialPort.on('open', function (err) {
    if (err) {
        console.log("serial port no open")
    } else {
        console.log('Arduino SerialPort is Open');
        serialPort.write('value'); // will NOT be received on the other end of the port.

        let initMode = fs.readFileSync(path.resolve(__dirname, 'public/documents/modeconfig.json'));
        let initModeJson = JSON.parse(initMode);
        let initModeJsonToArduinoData = `{${initModeJson.tempMode}${initModeJson.waterMode}${initModeJson.lightMode}}`;
        let allInitJsonToArduinoData = `${initModeJsonToArduinoData}${initModeJsonToArduinoData}`;
        let modeDataToBroker = `{"tempMode":${initModeJson.tempMode} , "waterMode":${initModeJson.waterMode}, "lightMode":${initModeJson.lightMode}}`;

        let wificonfigFile = fs.readFileSync(path.resolve(__dirname, 'public/documents/wificonfig.json'));
        let wifiConfigJson = JSON.parse(wificonfigFile);
        let publishLinks = `${wifiConfigJson.device}/${topic_list[0]}`

        console.log(`init Mode to arduino : ${allInitJsonToArduinoData}`);
        setTimeout(function () {
            writeToArduino(allInitJsonToArduinoData)
            client.publish(publishLinks, modeDataToBroker, {
                qos: 1,
                retain: true
            }, (err) => {
                if (err) {
                    console.log(err)
                }
                console.log("send to broker")
            });
        }, 5000);
    }
})

//serialPort.on('open', function () {
serialParser.on('data', function (data) {
    try {
        console.log(`Arduino serial Data :${data}`);
        let jsonData = JSON.parse(data);
        let nowData = `{"tempNow":${jsonData.tempNow} , "waterNow":${jsonData.waterNow}}`;
        let modeData = `{"tempMode":${jsonData.tempMode} , "waterMode":${jsonData.waterMode}, "lightMode":${jsonData.lightMode}}`;


        let wificonfigFile = fs.readFileSync(path.resolve(__dirname, 'public/documents/wificonfig.json'));
        let wifiConfigJson = JSON.parse(wificonfigFile);
        let publishLinksNow = `${wifiConfigJson.device}/${topic_list[1]}`
        let publishLinksMode = `${wifiConfigJson.device}/${topic_list[0]}`


        if (client.connected) {
            client.publish(publishLinksNow, nowData, {
                qos: 1,
                retain: true
            });
            if (!readModeFile(jsonData)) {
                console.log(`!!!!!!!!!mode is not same`)
                fs.writeFileSync(path.resolve(__dirname, 'public/documents/modeconfig.json'), modeData);

                client.publish(publishLinksMode, modeData, {
                    qos: 1,
                    retain: true
                }, (err) => {
                    if (err) {
                        console.log(err)
                    }
                });
            } else {
                console.log(`!!!!!!!!mode is same`)
            }
        }
    } catch (err) {
        console.log(`error get data from arduino: ${err}`)
    }
})
//})

function readModeFile(jsonDataFromArduino) {
    try {
        let sameMode = false;
        let modeConfig = fs.readFileSync(path.resolve(__dirname, 'public/documents/modeconfig.json'));
        let modeConfigJson = JSON.parse(modeConfig);
        if (parseInt(jsonDataFromArduino.tempMode) == parseInt(modeConfigJson.tempMode) && parseInt(jsonDataFromArduino.waterMode) == parseInt(modeConfigJson.waterMode) && parseInt(jsonDataFromArduino.lightMode) == parseInt(modeConfigJson.lightMode)) {
            sameMode = true;
        }
        // console.log(`device and online mode is some?:${sameMode}`)
        return sameMode;
    } catch (err) {
        throw err;
    }
}

function writeToArduino(writeData) {
    try {
        serialPort.write(writeData.toString(), function (err) {
            if (err) {
                return console.log(`error pass to arduino : ${err.message}`)
            }
            console.log(`pass to arduino success!!:${writeData}`)
        })
    } catch (err) {
        throw err
    }
}


//mqtt setup
const client = mqtt.connect(`${broker_link2}:${broker_port2}/${broker_sub2}`, {
    clientId: borker_clientID,
});

client.on("connect", function () {
    console.log('connectiing....')
    if (client.connected) {
        console.log("connected!");
        let wificonfigFile = fs.readFileSync(path.resolve(__dirname, 'public/documents/wificonfig.json'));
        let wifiConfigJson = JSON.parse(wificonfigFile);

        if (wifiConfigJson.device != "") {
            let sub_1 = `${wifiConfigJson.device}/${topic_list[0]}`
            let sub_2 = `${wifiConfigJson.device}/${topic_list[1]}`
            client.subscribe(sub_1, {
                qos: 1
            })
            client.subscribe(sub_2, {
                qos: 1
            })
        }
    }
})

client.on("error", function (er) {
    console.log("Connetion Fail" + er);
    process.exit(1)
});

if (client.connected) {
    //public logic code here...
    console.log("")
}

client.on('message', function (topic, message, packet) {
    console.log("message is " + message);
    console.log("topic is " + topic);

    let wificonfigFile = fs.readFileSync(path.resolve(__dirname, 'public/documents/wificonfig.json'));
    let wifiConfigJson = JSON.parse(wificonfigFile);
    let publishLinksMode = `${wifiConfigJson.device}/${topic_list[0]}`
    if (topic == publishLinksMode) {
        let jsonMode = JSON.parse(message);
        if (!readModeFile(jsonMode)) {
            //write to arduino
            let passToArduinoData = `{${jsonMode.tempMode}${jsonMode.waterMode}${jsonMode.lightMode}}{${jsonMode.tempMode}${jsonMode.waterMode}${jsonMode.lightMode}}`;
            let writeToModeConfigFile = `{"tempMode":${jsonMode.tempMode} ,"waterMode":${jsonMode.waterMode} ,"lightMode":${jsonMode.lightMode}}`;
            console.log(`pass to arduino : ${passToArduinoData}${passToArduinoData}`);
            // serialPort.write(passToArduinoData, function (err) {
            //     if (err) {
            //         return console.log(`error pass to arduino : ${err.message}`)
            //     }
            //     console.log(`pass to arduino success!!`)
            // })
            writeToArduino(passToArduinoData)
            //write to modeconfig.json
            fs.writeFileSync(path.resolve(__dirname, 'public/documents/modeconfig.json'), writeToModeConfigFile);
        }


    }
});

// USB Send data to Arduino here...
const Gpio_rgb = require('pigpio').Gpio;
const ledRed = new Gpio_rgb(17 , {mode:Gpio.OUTPUT});
const ledGreen = new Gpio_rgb(27 , {mode:Gpio.OUTPUT});
const ledBlue = new Gpio_rgb(22 , {mode:Gpio.OUTPUT});

if(AP_Status){ 
	ledRed.digitalWrite(0);
	ledGreen.digitalWrite(0);
	ledBlue.digitalWrite(1);
}

piBtn.watch(function (err, value) {
    if (err) {
        throw err
    } else {
        
        AP_Status = !AP_Status;
	
	//ledRed.pwmWrite(255);
	ledRed.digitalWrite(0);
	ledGreen.digitalWrite(0);
	ledBlue.digitalWrite(0)
	if(AP_Status){
		Exec('sudo /etc/init.d/hostapd start' , (err , stdout ,stderr) => {
			console.log(stdout);
			console.log(stderr);
			if(err!=null){
				console.log(`error:${err}`);
			}
		})
		ledRed.digitalWrite(0);
		ledGreen.digitalWrite(0);
		ledBlue.digitalWrite(1);	
	}else{
		Exec('sudo /etc/init.d/hostapd stop', (err, stdout, stderr) => {
	            console.log(`${stdout}`);
	            console.log(`${stderr}`);
        	    if (err != null) {
                	console.log(`error :${err}`)
            	   }
        	});

		//ledRed.digitalWrite(0);
		ledGreen.digitalWrite(0);
		ledBlue.digitalWrite(0);
	}
	
        console.log("btn click", AP_Status);
	//Exec('echo 123' , function(err , stdout , stderr){        
    }
})

process.on('SIGINT', function () {
    piBtn.unexport();
})

// express server run setup
const server = app.listen(8081, () => {
    // var host = server.address().address;
    var host = "127.0.0.1"; //192.168.104.1
    var port = server.address().port;
    console.log(`http://${host}:${port}`);
})
