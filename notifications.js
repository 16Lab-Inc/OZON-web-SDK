import {ozonDevice} from './lib/OzonDevice.js';

var device = ozonDevice;

/* handle connection button */
async function onConnectClick() {
    try {
        toastUser("Connecting to device!");

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
        device.touchCharAvailableCallback = function(){
            document.getElementById("touchWatermark").style.display = "none";
            document.getElementById("enTouch").disabled = false;
        };

        /* begin bluetooth connection process */
        if (!await device.connect()){
            throw("Couldn't connect to device!");
        }
        toastUser("Device connected!");

      } catch(error) {
        onDisconnected();
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
    document.getElementById("enTouch").disabled = true;

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

/* global defines */
const PLOT_RANGE = 50;


document.addEventListener('DOMContentLoaded', 
    function(event) {
        // do stuff after website has loaded
        const enMovementCheckbox = document.getElementById('enMovement');
        enMovementCheckbox.addEventListener('change', (event) => {
            onMovementCharClick(event.currentTarget.checked);
        })

        const enTouch = document.getElementById('enTouch');
        enTouch.addEventListener('change', (event) => {
            onTouchCharClick(event.currentTarget.checked);
        });
        // connect buttons 
        document.getElementById('connectButton').onclick = onConnectClick;
        document.getElementById('hapticsButton').onclick = onHapticsClick;
        document.getElementById('ledButton').onclick = onLedClick;
        document.getElementById('disconnectButton').onclick = function(){ try{device.disconnect()}catch{onDisconnected();} };
})


var updatePlotHandle;
const PLOT_UPDATE_RATE = 200;
async function onMovementCharClick(checked){
    if(checked){
        gyro_data = {x:[],y:[],z:[], time:[]};
        acc_data = {x:[],y:[],z:[], time:[]};
        device.setImuNotifications(true);
        toastUser('Movement updates enabled!');
        updatePlotHandle = true;
        window.requestAnimationFrame(updatePlot);

    } else {
        device.setImuNotifications(false);
        toastUser('Movement updates Disabled!');
        updatePlotHandle = false;
    }
}

function onTouchCharClick(checked){
    device.setTouchNotifications(checked);
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
    if(batteryLevel < 25)           level = '[??? ??? ???]';
    else if (batteryLevel < 50)     level = '[??? ??? ???]';
    else if (batteryLevel < 75)     level = '[??? ??? ???]';
    else                            level = '[??? ??? ???]';

    document.getElementById("batteryServiceWatermark").style.display = "none";
    document.getElementById('batteryStatus').innerHTML = 'Battery level: ' + level +' [' + batteryState + ']';
}

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

const gyro_plot = [{
    y: gyro_data['x'],
    type: "scattergl",
    mode: 'lines',
    name: 'x axis',
    showlegend: false
},
{
    y: gyro_data['y'],
    type: "scattergl",
    mode: 'lines',
    name: 'y axis',
    showlegend: false
},
{
    y: gyro_data['z'],
    type: "scattergl",
    mode: 'lines',
    name: 'z axis',
    showlegend: false
}]

Plotly.react('gyro', gyro_data, gyro_layout);



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


const acc_plot = [{
    y: acc_data['x'],
    x: acc_data['time'],
    type: "scattergl",
    mode: 'lines',
    name: 'x axis',
    showlegend: false
},
{
    y: acc_data['y'],
    x: acc_data['time'],
    type: "scattergl",
    mode: 'lines',
    name: 'y axis',
    showlegend: false
},
{
    y: acc_data['z'],
    x: acc_data['time'],
    type: "scattergl",
    mode: 'lines',
    name: 'z axis',
    showlegend: false
}];

Plotly.react('acc', acc_plot, acc_layout);
  
var prev_timestep = 0;
function updatePlot(timestep){
 /*   
    acc_plot[0].y = acc_data.x
    acc_plot[0].x = acc_data.time
    acc_plot[1].y = acc_data.y
    acc_plot[1].x = acc_data.time
    acc_plot[2].y = acc_data.z
    acc_plot[2].x = acc_data.time
*/
    acc_layout.xaxis.range = [acc_data.time[0],acc_data.time[acc_data.time.length-1]]
    acc_layout.datarevision = acc_layout.datarevision + 1;
    Plotly.react('acc', acc_plot, acc_layout);

    gyro_plot[0].y = gyro_data.x
    gyro_plot[0].x = gyro_data.time
    gyro_plot[1].y = gyro_data.y
    gyro_plot[1].x = gyro_data.time
    gyro_plot[2].y = gyro_data.z
    gyro_plot[2].x = gyro_data.time

    gyro_layout.xaxis.range = [gyro_data.time[0],gyro_data.time[gyro_data.time.length-1]]
    gyro_layout.datarevision = gyro_layout.datarevision + 1;
    Plotly.react('gyro', gyro_plot, gyro_layout);

    try{
        const acc_time = tf.tensor1d(acc_data.time);
        const acc_time_diff = acc_time.slice(1,-1)
                                       .sub(acc_time
                                       .slice(0,acc_time.size-1));
        const avg_time = acc_time_diff.sum().div(acc_time_diff.size);
        const avg_latency = (avg_time.dataSync()/1e-3).toFixed(0);
        tf.disposeVariables();
        var fps = (1/(timestep-prev_timestep)/1e-3).toFixed(0);
        document.getElementById('fps_counter').innerHTML = "update Rate: " + fps + ' FPS' + ' ' + avg_latency + ' ms';
        prev_timestep = timestep;

    } catch (error){
        toastUser("Error!" + error);
    };
    if(updatePlotHandle)
        window.requestAnimationFrame(updatePlot);
}


function handleImuNotifications(data) {
    /* trim data  */
    gyro_data['x'].push(data.gyro.x);
    while(gyro_data['x'].length > PLOT_RANGE) gyro_data['x'].shift();

    gyro_data['y'].push(data.gyro.y);
    while(gyro_data['y'].length > PLOT_RANGE) gyro_data['y'].shift();
    
    gyro_data['z'].push(data.gyro.z);
    while(gyro_data['z'].length > PLOT_RANGE) gyro_data['z'].shift();

    gyro_data['time'].push(data.timestamp);
    while(gyro_data['time'].length > PLOT_RANGE) gyro_data['time'].shift();

    /* trim data  */
    acc_plot[0].y.push(data.acc.x);
    while(acc_plot[0].y.length > PLOT_RANGE) acc_plot[0].y.shift();

    acc_plot[1].y.push(data.acc.y);
    while(acc_plot[1].y.length > PLOT_RANGE) acc_plot[1].y.shift();
    
    acc_plot[2].y.push(data.acc.z);
    while(acc_plot[2].y.length > PLOT_RANGE)acc_plot[2].y.shift();

    acc_data['time'].push(data.timestamp);
    while(acc_data['time'].length > PLOT_RANGE) acc_data['time'].shift();

    acc_plot[0].x = acc_data.time
    acc_plot[1].x = acc_data.time
    acc_plot[2].x = acc_data.time

    acc_layout.xaxis.range = [acc_data.time[0],acc_data.time[acc_data.time.length-1]]
    acc_layout.datarevision = acc_layout.datarevision + 1;
}