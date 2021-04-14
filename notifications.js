/* BLE services */
const IMU_SERVICE = BluetoothUUID.getService("f000aa80-0451-4000-b000-000000000000");
const LED_SERVICE = BluetoothUUID.getService("f000ee80-0451-4000-b000-000000000000");
const HAPTICS_SERVICE = BluetoothUUID.getService("00001802-0000-1000-8000-00805f9b34fb");
const BATTERY_SERVICE = BluetoothUUID.getService("battery_service");

const serviceList = [IMU_SERVICE, LED_SERVICE, HAPTICS_SERVICE, BATTERY_SERVICE];

/* BLE characteristics */
const MOVEMENT_DATA_CHARACTERISTIC = BluetoothUUID.getCharacteristic("f000aa81-0451-4000-b000-000000000000");
const ALERT_LEVEL_CHARACTERISTIC = BluetoothUUID.getCharacteristic("alert_level");
const BATTERY_LEVEL_CHARACTERISTIC = BluetoothUUID.getCharacteristic("battery_level");
const BATTERY_STATE_CHARACTERISTIC = BluetoothUUID.getCharacteristic("f000ffb2-0451-4000-b000-000000000000");
const CHARGER_STATE_CHARACTERISTIC = BluetoothUUID.getCharacteristic("ff000ee1-0000-1000-8000-77332aadd550");

/* globals */
var movementChar;
var ledChar;
var hapticsChar;
var batteryLevelChar;
var batteryStateChar;

var updatePlotHandle;
var server;


async function handleImuService(imu_service){
    toastUser("Found IMU Service!");
    const characteristics = await imu_service.getCharacteristics();

    movementChar = characteristics.find(char => char.uuid == MOVEMENT_DATA_CHARACTERISTIC);
    if(movementChar){
        toastUser("Found Movement Characteristic!");
        movementChar.addEventListener('characteristicvaluechanged',
            handleImuNotifications);
        document.getElementById('enMovement').disabled = false;
        document.getElementById("imuServiceWatermark").style.display = "none";
    }
}

async function handleLedService(led_service){
    toastUser("Found LED Service");
    const characteristics = await led_service.getCharacteristics();
    
    ledChar = characteristics.find(char => char.uuid == ALERT_LEVEL_CHARACTERISTIC);
    if (ledChar){
        toastUser("Found Led Characteristic!");
        document.getElementById('ledService').disabled = false;
    }
}

async function handleHapticsService(haptics_service){
    toastUser("Found Haptics Service");
    const characteristics = await haptics_service.getCharacteristics();
    
    hapticsChar = characteristics.find(char => char.uuid == ALERT_LEVEL_CHARACTERISTIC);
    if (hapticsChar){
        toastUser("Found HapticsCharacteristic!");
        document.getElementById('hapticsService').disabled = false;
    }
}

async function handleBatteryService(battery_service){
    toastUser("Found Battery Service");
    const characteristics = await battery_service.getCharacteristics();

    batteryLevelChar = characteristics.find(char => char.uuid == BATTERY_LEVEL_CHARACTERISTIC);
    batteryStateChar = characteristics.find(char => char.uuid == BATTERY_STATE_CHARACTERISTIC);

    if (batteryLevelChar){
        toastUser("Found Battery Level Characteristic!");
        batteryLevelChar.addEventListener('characteristicvaluechanged',
                                        handleBatteryNotifications);
        await batteryLevelChar.startNotifications();
        document.getElementById("batteryServiceWatermark").style.display = "none";
    }

    if(batteryStateChar){
        toastUser("Found Battery State Characteristic!");
        batteryStateChar.addEventListener('characteristicvaluechanged',
                                        handleBatteryNotifications);
        await batteryStateChar.startNotifications();
    }
}


/* handle connection button */
async function onConnectClick() {
    try {
        document.getElementById("connectButton").disabled = true;
        document.getElementById("disconnectButton").disabled = false;


        toastUser('Requesting Bluetooth Device...');
        const device = await navigator.bluetooth.requestDevice({filters:[{namePrefix: "OZON"}],
            optionalServices: serviceList});
        
        device.addEventListener('gattserverdisconnected', onDisconnected);
        
        toastUser('Connecting to GATT Server...');
        server = await device.gatt.connect();

        toastUser('Collecting Services...');
        const services = await server.getPrimaryServices();

        /* check for IMU service */
        const imu_service = services.find(service => service.uuid == IMU_SERVICE);
        if(imu_service)
            handleImuService(imu_service);

        /* check for LED service */
        const led_service = services.find(service => service.uuid == LED_SERVICE);
        if(led_service)
            handleLedService(led_service);

        /* check for haptics service */
        const haptics_service = services.find(service => service.uuid == HAPTICS_SERVICE);
        if(haptics_service)
            handleHapticsService(haptics_service);

        /* check for battery service */
        const battery_service = services.find(service => service.uuid == BATTERY_SERVICE);
        if(battery_service)
            handleBatteryService(battery_service);

        toastUser('Connected!');
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

document.addEventListener('DOMContentLoaded', function(event) {
    // do stuff after website has loaded
    const enMovementCheckbox = document.getElementById('enMovement');
    enMovementCheckbox.addEventListener('change', (event) => {
    onMovementCharClick(event.currentTarget.checked);
})
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

async function onLedClick(){
    try{
        if(ledChar){
            const option = document.getElementById('ledWaveform').value
            const value = new Uint8Array([parseInt(option)])
            await ledChar.writeValue(value);
        }
    }catch(error){
        toastUser("ERROR! " + error);
    }
}

async function onHapticsClick(){
    try{
        if(hapticsChar){
            const option = document.getElementById('hapticsWaveform').value
            const value = new Uint8Array([parseInt(option)])
            await hapticsChar.writeValue(value);
        }
    }catch(error){
        toastUser("ERROR! " + error);
    }
}

var batteryLevel = 0;
var batteryState = 0;

function handleBatteryNotifications(event) {
    let value = event.target.value.getUint8(0);
    if(event.target.uuid == BATTERY_LEVEL_CHARACTERISTIC){
        batteryLevel = value;
    } else if (event.target.uuid == BATTERY_STATE_CHARACTERISTIC){
        batteryState = value;
    }
    let level;
    let state;

    if(batteryLevel < 25)           level = '[□ □ □]';
    else if (batteryLevel < 50)     level = '[■ □ □]';
    else if (batteryLevel < 75)     level = '[■ ■ □]';
    else                            level = '[■ ■ ■]';

    switch (batteryState) {
        case 3:
            state = 'CHARGING';
            break;
        default:
            state = 'DISCHARGING';
            break;
    }
    document.getElementById('batteryStatus').innerHTML = 'Battery level: ' + level +' [' + state + ']';
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