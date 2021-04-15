/* BLE services */
const IMU_SERVICE = BluetoothUUID.getService("f000aa80-0451-4000-b000-000000000000");
const LED_SERVICE = BluetoothUUID.getService("f000ee80-0451-4000-b000-000000000000");
const HAPTICS_SERVICE = BluetoothUUID.getService("00001802-0000-1000-8000-00805f9b34fb");
const BATTERY_SERVICE = BluetoothUUID.getService("battery_service");
const TOUCH_SERVICE = BluetoothUUID.getService("f000ffe0-0451-4000-b000-000000000000");

const serviceList = [IMU_SERVICE, LED_SERVICE, HAPTICS_SERVICE, BATTERY_SERVICE, TOUCH_SERVICE];

/* BLE characteristics */
const MOVEMENT_DATA_CHARACTERISTIC = BluetoothUUID.getCharacteristic("f000aa81-0451-4000-b000-000000000000");
const ALERT_LEVEL_CHARACTERISTIC = BluetoothUUID.getCharacteristic("alert_level");
const BATTERY_LEVEL_CHARACTERISTIC = BluetoothUUID.getCharacteristic("battery_level");
const BATTERY_STATE_CHARACTERISTIC = BluetoothUUID.getCharacteristic("f000ffb2-0451-4000-b000-000000000000");
//const CHARGER_STATE_CHARACTERISTIC = BluetoothUUID.getCharacteristic("ff000ee1-0000-1000-8000-77332aadd550");
const TOUCH_STATE_CHARACTERISTIC = BluetoothUUID.getCharacteristic("f000ffe1-0451-4000-b000-000000000000");



class OzonDeviceClass{
    /* BLE objects */
    device;
    server;
    services;

    /* callbacks */
    logCallback;
    onDisconnectCallback;

    /* notification callbacks */
    touchNotificationCallback;
    batteryNotificationCallback;
    imuDataNotificationCallback;

    /* characteristic available callbacks */
    hapticsAlertCharAvailableCallback;
    ledCharAvailableCallback;
    imuDataCharAvailableCallback;
    touchCharAvailableCallback;

    /* characteristics */
    movementChar;
    ledChar;
    hapticsChar;
    batteryLevelChar;
    batteryStateChar;
    touchChar;

    /* imu constants */
    GYROSCOPE_RANGE = 250.0;
    ACCELEROMETER_RANGE = 8.0;
    TIMESTAMP_STEP = 39e-6;

    constructor(){
    }

    async connect(){
        try {
            this.log('Requesting Bluetooth Device...');
            this.device = await navigator.bluetooth.requestDevice({filters:[{namePrefix: "OZON"}],
                optionalServices: serviceList});
            
            this.device.addEventListener('gattserverdisconnected', onDisconnected);
            
            this.log('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();
    
            this.log('Collecting Services...');
            this.services = await this.server.getPrimaryServices();
    
            
            // check for IMU service 
            const imu_service = this.services.find(service => service.uuid == IMU_SERVICE);
            if(imu_service)
                this.handleImuService(imu_service);
            
            // check for LED service 
            const led_service = this.services.find(service => service.uuid == LED_SERVICE);
            if(led_service)
                this.handleLedService(led_service);
            

            // check for haptics service 
            const haptics_service = this.services.find(service => service.uuid == HAPTICS_SERVICE);
            if(haptics_service)
                this.handleHapticsService(haptics_service);
            
            // check for battery service 
            const battery_service = this.services.find(service => service.uuid == BATTERY_SERVICE);
            if(battery_service)
                this.handleBatteryService(battery_service);
    

            // check for touch service 
            const touch_service = this.services.find(service => service.uuid == TOUCH_SERVICE);
            if(touch_service)
                this.handleTouchService(touch_service);
            

            this.log('Connected!');
            return true;
          } catch(error) {
            this.log('Argh! ' + error);
            return false;
          }
    }

    disconnect(){
        this.server.disconnect();
    }

    /* IMU service related functions */
    async handleImuService(imu_service){
        this.log("Found IMU Service!");
        const characteristics = await imu_service.getCharacteristics();
    
        this.movementChar = characteristics.find(char => char.uuid == MOVEMENT_DATA_CHARACTERISTIC);
        if(this.movementChar){
            this.log("Found Movement Characteristic!");
            this.movementChar.addEventListener('characteristicvaluechanged',
                handleImuNotifications);
            if(this.imuDataCharAvailableCallback)
                this.imuDataCharAvailableCallback();
        }
    }

    setImuNotifications(enNotifications){
        if(enNotifications)
            this.movementChar.startNotifications();
        else
            this.movementChar.stopNotifications();
    }
    
    /* LED service related functions */
    async handleLedService(led_service){
        this.log("Found LED Service");
        const characteristics = await led_service.getCharacteristics();

        this.ledChar = characteristics.find(char => char.uuid == ALERT_LEVEL_CHARACTERISTIC);
        if (this.ledChar){
            this.log("Found Led Characteristic!");
            if(this.ledCharAvailableCallback)
                this.ledCharAvailableCallback();
        }
    }

    blink(alert_level){
        switch(alert_level){
            case 0: case 1: case 2:
                this.ledChar.writeValue(new Uint8Array([alert_level]));
                break;
            default: this.log("ERROR! Blink Pattern not supported!")
        }
    }
    
    /* haptics service related methods */
    async handleHapticsService(haptics_service){
        this.log("Found Haptics Service");
        const characteristics = await haptics_service.getCharacteristics();
        
        this.hapticsChar = characteristics.find(char => char.uuid == ALERT_LEVEL_CHARACTERISTIC);
        if (this.hapticsChar){
            this.log("Found HapticsCharacteristic!");
            if(this.hapticsAlertCharAvailableCallback)
                this.hapticsAlertCharAvailableCallback();
        }
    }

    vibrate(alert_level){
        switch(alert_level){
            case 0: case 1: case 2:
                this.hapticsChar.writeValue(new Uint8Array([alert_level]));
                break;
            default: this.log("ERROR! Vibration Pattern not supported!");
        }
    }

    /* battery service related methods */
    async handleBatteryService(battery_service){
        this.log("Found Battery Service");
        const characteristics = await battery_service.getCharacteristics();
    
        this.batteryLevelChar = characteristics.find(char => char.uuid == BATTERY_LEVEL_CHARACTERISTIC);
        this.batteryStateChar = characteristics.find(char => char.uuid == BATTERY_STATE_CHARACTERISTIC);
    
        if (this.batteryLevelChar){
            this.log("Found Battery Level Characteristic!");
            this.batteryLevelChar.addEventListener('characteristicvaluechanged',
                                                handleBatteryNotifications);
            this.batteryLevelChar.startNotifications();
            this.batteryLevelChar.readValue();
        }
    
        if(this.batteryStateChar){
            this.log("Found Battery State Characteristic!");
            this.batteryStateChar.addEventListener('characteristicvaluechanged',
                                                handleBatteryNotifications);
            this.batteryStateChar.startNotifications();
            this.batteryStateChar.readValue();
        }
    }
    
    async handleTouchService(touch_service){
        this.log("Found Touch Service!");
        const characteristics = await touch_service.getCharacteristics();
    
        this.touchChar = characteristics.find(char => char.uuid == TOUCH_STATE_CHARACTERISTIC);
        if(this.touchChar){
            this.log("Found Touch Characteristic!");
            this.touchChar.addEventListener('characteristicvaluechanged',
                handleTouchNotifications);
            this.touchChar.startNotifications();
            if(this.touchCharAvailableCallback)
                this.touchCharAvailableCallback();
        }
    }
    
    log(msg){
        if(this.logCallback)
            this.logCallback(msg);
    }
}

function handleBatteryNotifications(event) {
    let value = event.target.value.getUint8(0);
    let ret_val;

    if(event.target.uuid == BATTERY_LEVEL_CHARACTERISTIC){
        ret_val = {"level": value}
    } else if (event.target.uuid == BATTERY_STATE_CHARACTERISTIC){
        let state;
        switch (value) {
            case 3:
                state = 'CHARGING';
                break;
            default:
                state = 'DISCHARGING';
                break;
        }
        ret_val = {"state": state};
    }
    if(ozonDevice.batteryNotificationCallback)
        ozonDevice.batteryNotificationCallback(ret_val);
}

function copy(src, len)  {
    var dst = new ArrayBuffer(len);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
};

function handleImuNotifications(event) {
    if(ozonDevice.imuDataNotificationCallback){
        let value = event.target.value;  

        var data_view = new DataView(copy(value.buffer, 16));

        let timestamp = data_view.getUint32(6*2,true) * ozonDevice.TIMESTAMP_STEP;
        
        /* create gyro data */
        let gyro_x = value.getInt16(0, true) / 65536. * ozonDevice.GYROSCOPE_RANGE;
        let gyro_y = value.getInt16(1*2, true) / 65536. * ozonDevice.GYROSCOPE_RANGE;
        let gyro_z = value.getInt16(2*2, true) / 65536. * ozonDevice.GYROSCOPE_RANGE;

        /* create acc data */
        let acc_x  = value.getInt16(3*2, true) /65536 * ozonDevice.ACCELEROMETER_RANGE;
        let acc_y  = value.getInt16(4*2, true) /65536 * ozonDevice.ACCELEROMETER_RANGE;
        let acc_z  = value.getInt16(5*2, true) /65536 * ozonDevice.ACCELEROMETER_RANGE;
        
        let ret_val ={
            gyro: {
                x: gyro_x,
                y: gyro_y,
                z: gyro_z
            },
            acc: {
                x: acc_x,
                y: acc_y,
                z: acc_z
            },
            "timestamp": timestamp
        }
        ozonDevice.imuDataNotificationCallback(ret_val);
    }
}

function handleTouchNotifications(event){
    let value = event.target.value.getUint8(0);
    let state = {btn0: value & 0x01, 
                 btn1: value & 0x02,
                 btn2: value & 0x04,
                 btn3: value & 0x08};
    if(ozonDevice.touchNotificationCallback)
        ozonDevice.touchNotificationCallback(state);
}

function onDisconnected(){
    if(ozonDevice.onDisconnectCallback)
        ozonDevice.onDisconnectCallback();
}

export var ozonDevice = new OzonDeviceClass();