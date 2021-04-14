import {ozonDevice} from './lib/OzonDevice.js';

var device = ozonDevice;

/* handle connection button */
async function onConnectClick() {
    try {
        document.getElementById("connectButton").disabled = true;
        document.getElementById("disconnectButton").disabled = false;

        /* a log callback can be registered to see debug data */
        device.logCallback = console.log;

        /* register callbacks for notifications */
        device.touchNotificationCallback = handleTouchNotifications;
        device.batteryNotificationCallback = handleBatteryNotifications;
        
        /* bluetooth characteristics take some time to become available so
           register callbacks to handle when they are good to go */
        device.hapticsAlertCharAvailableCallback = function(){document.getElementById('hapticsService').disabled = false;};
        device.ledCharAvailableCallback = function(){document.getElementById('ledService').disabled = false;}

        /* begin bluetooth connection process */
        device.connect();

      } catch(error) {
        toastUser('Argh! ' + error);
        onDisconnected();
      }

}

/* handle disconnection button */
async function onDisconnectClick() {
    try{
        server.disconnect();
    } catch(error){
        toastUser("ERROR! " + error);
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
})


async function onMovementCharClick(checked){
    try{
        if(movementChar){
            if(checked){
                gyro_data = {x:[],y:[],z:[], time:[]};
                acc_data = {x:[],y:[],z:[], time:[]};
                await movementChar.startNotifications();
                toastUser('Movement updates enabled!');
                updatePlotHandle = setInterval(updatePlot,100);
            } else {
                await movementChar.stopNotifications();
                toastUser('Movement updates Disabled!');
                clearInterval(updatePlotHandle);
            }
        }
    } catch(error) {
        toastUser("ERROR! " + error);
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

var batteryLevel = 0;
var batteryState = 0;

function handleTouchNotifications(buttons){

    let state = [
        buttons.btn0 ? '1':'0', 
        buttons.btn1 ? '1':'0',
        buttons.btn2 ? '1':'0',
        buttons.btn3 ? '1':'0'];
    document.getElementById('touchStatus').innerHTML = 'Touch Status [' + state.join('-') + ']';
}

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

    document.getElementById('batteryStatus').innerHTML = 'Battery level: ' + level +' [' + batteryState + ']';
}

/* global defines */
const GYROSCOPE_RANGE = 250.0;
const ACCELEROMETER_RANGE = 8.0;
const PLOT_RANGE = 100;
const TIMESTAMP_STEP = 39e-6;

let gyro_data = {x:[],y:[],z:[], time:[]};
let acc_data = {x:[],y:[],z:[], time:[]};

var gyro_layout = {
    title: 'Gyroscope Data',
    xaxis: {
        title: 'timestamp',
    },
    yaxis: {
        title: 'deg/s',
        range: [-GYROSCOPE_RANGE/2., GYROSCOPE_RANGE/2.]
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
        range: [-ACCELEROMETER_RANGE/2., ACCELEROMETER_RANGE/2.]
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


function handleImuNotifications(event) {
    let value = event.target.value;
    
    function copy(src, len)  {
        var dst = new ArrayBuffer(len);
        new Uint8Array(dst).set(new Uint8Array(src));
        return dst;
    };


    var data_view = new DataView(copy(value.buffer, 16));

    let timestamp = data_view.getUint32(6*2,true) * TIMESTAMP_STEP;
    
    /* create gyro data */
    let gyro_x = value.getInt16(0, true) / 65536. * GYROSCOPE_RANGE;
    let gyro_y = value.getInt16(1*2, true) / 65536. * GYROSCOPE_RANGE;
    let gyro_z = value.getInt16(2*2, true) / 65536. * GYROSCOPE_RANGE;

    /* trim data  */
    gyro_data['x'].push(gyro_x);
    while(gyro_data['x'].length > PLOT_RANGE) gyro_data['x'].shift();

    gyro_data['y'].push(gyro_y);
    while(gyro_data['y'].length > PLOT_RANGE) gyro_data['y'].shift();
    
    gyro_data['z'].push(gyro_z);
    while(gyro_data['z'].length > PLOT_RANGE) gyro_data['z'].shift();

    gyro_data['time'].push(timestamp);
    while(gyro_data['time'].length > PLOT_RANGE) gyro_data['time'].shift();

    /* create acc data */
    let acc_x  = value.getInt16(3*2, true) /65536 * ACCELEROMETER_RANGE;
    let acc_y  = value.getInt16(4*2, true) /65536 * ACCELEROMETER_RANGE;
    let acc_z  = value.getInt16(5*2, true) /65536 * ACCELEROMETER_RANGE;

    /* trim data  */
    acc_data['x'].push(acc_x);
    while(acc_data['x'].length > PLOT_RANGE) acc_data['x'].shift();

    acc_data['y'].push(acc_y);
    while(acc_data['y'].length > PLOT_RANGE) acc_data['y'].shift();
    
    acc_data['z'].push(acc_z);
    while(acc_data['z'].length > PLOT_RANGE) acc_data['z'].shift();

    acc_data['time'].push(timestamp);
    while(acc_data['time'].length > PLOT_RANGE) acc_data['time'].shift();
}