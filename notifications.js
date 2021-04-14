import {ozonDevice} from './lib/OzonDevice.js';

var device = ozonDevice;

/* handle connection button */
async function onConnectClick() {
    try {
        document.getElementById("connectButton").disabled = true;
        document.getElementById("disconnectButton").disabled = false;

        /* a log callback can be registered to see debug data */
        device.logCallback = console.log;

        /* registed device disconnected callback */
        device.onDisconnectCallback = onDisconnected;

        /* register callbacks for notifications */
        device.touchNotificationCallback = handleTouchNotifications;
        device.batteryNotificationCallback = handleBatteryNotifications;
        device.imuDataNotificationCallback = handleImuNotifications;
        
        /* bluetooth characteristics take some time to become available so
           register callbacks to handle when they are good to go */
        device.hapticsAlertCharAvailableCallback = function(){document.getElementById('hapticsService').disabled = false;};
        device.ledCharAvailableCallback = function(){document.getElementById('ledService').disabled = false;}
        device.imuDataCharAvailableCallback = function(){
            document.getElementById('enMovement').disabled = false;
            document.getElementById("imuServiceWatermark").style.display = "none";
        }

        /* begin bluetooth connection process */
        device.connect();

      } catch(error) {
        toastUser('ERROR! ' + error);
      }

}


function onDisconnected(){
    /* set buttons back to default state */
    document.getElementById("connectButton").disabled = false;
    document.getElementById("disconnectButton").disabled = true;
    document.getElementById('enMovement').disabled = true;
    
    /* disable services */
    document.getElementById('ledService').disabled = true;
    document.getElementById('hapticsService').disabled = true;

    document.getElementById("batteryServiceWatermark").style.display = "initial";
    document.getElementById("imuServiceWatermark").style.display = "initial";
    document.getElementById("touchWatermark").style.display = "initial";

    /* disable all intervals */
    if(updatePlotHandle)
        clearInterval(updatePlotHandle);

    toastUser("Device Disconnected!");
}

let toastHandle;

function toastUser(text){
    if(toastHandle)
        clearTimeout(toastHandle);
    var toast = document.getElementById("snackbar");
    toast.innerHTML = text;
    // Add the "show" class to DIV
    toast.className = "show";

    // After 3 seconds, remove the show class from DIV
    toastHandle = setTimeout(function(){ 
        toast.className = toast.className.replace("show", "");
        toastHandle = null; 
    }, 3000);
}

document.addEventListener('DOMContentLoaded', 
    function(event) {
        // do stuff after website has loaded
        const enMovementCheckbox = document.getElementById('enMovement');
        enMovementCheckbox.addEventListener('change', (event) => {
            onMovementCharClick(event.currentTarget.checked);
        })
        // connect buttons 
        document.getElementById('connectButton').onclick = onConnectClick;
        document.getElementById('hapticsButton').onclick = onHapticsClick;
        document.getElementById('ledButton').onclick = onLedClick;
        document.getElementById('disconnectButton').onclick = function(){ device.disconnect() };
})

var updatePlotHandle;
const PLOT_UPDATE_RATE = 200;
async function onMovementCharClick(checked){
    if(checked){
        gyro_data = {x:[],y:[],z:[], time:[]};
        acc_data = {x:[],y:[],z:[], time:[]};
        device.setImuNotifications(true);
        toastUser('Movement updates enabled!');
        updatePlotHandle = setInterval(updatePlot,PLOT_UPDATE_RATE);
    } else {
        device.setImuNotifications(false);
        toastUser('Movement updates Disabled!');
        clearInterval(updatePlotHandle);
    }
}

function onLedClick(){
    const option = document.getElementById('ledWaveform').value
    const value = parseInt(option);
    device.blink(value);
}

function onHapticsClick(){
    const option = document.getElementById('hapticsWaveform').value
    const value = parseInt(option);
    ozonDevice.vibrate(value);
}


function handleTouchNotifications(buttons){

    let state = [
        buttons.btn0 ? '1':'0', 
        buttons.btn1 ? '1':'0',
        buttons.btn2 ? '1':'0',
        buttons.btn3 ? '1':'0'];
    document.getElementById('touchStatus').innerHTML = 'Touch Status [' + state.join('-') + ']';
}


var batteryLevel = 0;
var batteryState = 0;

function handleBatteryNotifications(value) {
    if(value.level)
        batteryLevel = value.level;
    else if (value.state){
        batteryState = value.state;
    }
    var level;
    if(batteryLevel < 25)           level = '[□ □ □]';
    else if (batteryLevel < 50)     level = '[■ □ □]';
    else if (batteryLevel < 75)     level = '[■ ■ □]';
    else                            level = '[■ ■ ■]';

    document.getElementById("batteryServiceWatermark").style.display = "none";
    document.getElementById('batteryStatus').innerHTML = 'Battery level: ' + level +' [' + batteryState + ']';
}

/* global defines */
const PLOT_RANGE = 100;

let gyro_data = {x:[],y:[],z:[], time:[]};
let acc_data = {x:[],y:[],z:[], time:[]};

var gyro_layout = {
    title: 'Gyroscope Data',
    xaxis: {
        title: 'timestamp',
    },
    yaxis: {
        title: 'deg/s',
        range: [-device.GYROSCOPE_RANGE/2., device.GYROSCOPE_RANGE/2.]
    }
};

Plotly.newPlot('gyro', [{
    y: gyro_data['x'],
    mode: 'lines',
    name: 'x axis'
},
{
    y: gyro_data['y'],
    mode: 'lines',
    name: 'y axis'
},
{
    y: gyro_data['z'],
    mode: 'lines',
    name: 'z axis'
}], gyro_layout);


var acc_layout = {
    title: 'Accelerometer Data',
    xaxis: {
        title: 'timestamp',
    },
    yaxis: {
        title: 'g (9.81m/s^2)',
        range: [-device.ACCELEROMETER_RANGE/2., device.ACCELEROMETER_RANGE/2.]
    },
};

Plotly.newPlot('acc', [{
    y: acc_data['x'],
    x: acc_data['time'],
    mode: 'lines',
    name: 'x axis'
},
{
    y: acc_data['y'],
    x: acc_data['time'],
    mode: 'lines',
    name: 'y axis'
},
{
    y: acc_data['z'],
    x: acc_data['time'],
    mode: 'lines',
    name: 'z axis'
}],acc_layout);
  

function updatePlot(){
    /* uptdate gyro plot */
    var gyro_update = {
        y: [ gyro_data['x'], gyro_data['y'], gyro_data['z'] ],
        x: [ gyro_data['time'],gyro_data['time'],gyro_data['time']]
        };

    Plotly.update('gyro', gyro_update);

    /* uptdate acc plot */
    var acc_update = {
        y: [ acc_data['x'], acc_data['y'], acc_data['z'] ],
        x: [ acc_data['time'],acc_data['time'],acc_data['time']]
        };

    Plotly.update('acc', acc_update);
}


function handleImuNotifications(data) {
    /* trim data  */
    gyro_data['x'].push(data.gyro.x);
    while(gyro_data['x'].length > PLOT_RANGE) gyro_data['x'].shift();

    gyro_data['y'].push(data.gyro.x);
    while(gyro_data['y'].length > PLOT_RANGE) gyro_data['y'].shift();
    
    gyro_data['z'].push(data.gyro.x);
    while(gyro_data['z'].length > PLOT_RANGE) gyro_data['z'].shift();

    gyro_data['time'].push(data.timestamp);
    while(gyro_data['time'].length > PLOT_RANGE) gyro_data['time'].shift();

    /* trim data  */
    acc_data['x'].push(data.acc.x);
    while(acc_data['x'].length > PLOT_RANGE) acc_data['x'].shift();

    acc_data['y'].push(data.acc.y);
    while(acc_data['y'].length > PLOT_RANGE) acc_data['y'].shift();
    
    acc_data['z'].push(data.acc.z);
    while(acc_data['z'].length > PLOT_RANGE) acc_data['z'].shift();

    acc_data['time'].push(data.timestamp);
    while(acc_data['time'].length > PLOT_RANGE) acc_data['time'].shift();
}