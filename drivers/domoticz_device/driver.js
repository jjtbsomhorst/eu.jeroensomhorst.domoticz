'use strict';

const Homey = require('homey');
const Domoticz = require('domoticz');

const CAPABILITY_TARGET_TEMPERATURE = 'target_temperature';
const CAPABILITY_MEASURE_TEMPERATURE = 'measure_temperature';
const CAPABILITY_MEASURE_POWER = 'measure_power';
const CAPABILITY_METER_POWER = 'meter_power';
const CAPABILITY_MEASURE_HUMIDITY = 'measure_humidity';
const CAPABILITY_METER_GAS = 'meter_gas';
const CAPABILITY_ONOFF = 'onoff';
const CAPABILITY_FANSPEED = 'fan_speed';
const CAPABILITY_WIND_ANGLE = 'measure_wind_angle';
const CAPABILITY_WIND_STRENGTH = 'measure_wind_strength';

const CAPABILITY_CUMULATIVE_POWER_HIGH = "power_meter_cumulative_high";
const CAPABILITY_CUMULATIVE_POWER_LOW = "power_meter_cumulative_low";
const CAPABILITY_CUMULATIVE_GAS = "gas_meter_cumulative";
const CAPABILITY_MEASURE_VOLTAGE = "measure_voltage";
const CAPABILITY_MEASURE_RAIN = "measure_rain";
const CAPABILITY_METER_RAIN = "meter_rain";

const DEVICE_DEFAULT_NAME = "Domoticz device";



const CRONTASK_GETDEVICESTATE = "eu.jeroensomhorst.domoticz.cron.devicestate";


class DomoticzDriver extends Homey.Driver{


    onInit(){
        Homey.app.doLog("Initialize driver");

        Homey.ManagerCron.unregisterTask(CRONTASK_GETDEVICESTATE);

        this.initTask();
    }

    initTask(){
        Homey.ManagerCron.getTask(CRONTASK_GETDEVICESTATE)
            .then(task => {

                Homey.app.doLog("The task exists: " + CRONTASK_GETDEVICESTATE);
                task.on('run', () => this.onCronRun());
            })
            .catch(err => {
                if (err.code === 404) {
                    this.log("The task has not been registered yet, registering task: " + CRONTASK_GETDEVICESTATE);
                    Homey.ManagerCron.registerTask(CRONTASK_GETDEVICESTATE, "*/10 * * * * *", {})
                        .then(task => {
                            task.on('run', () => this.onCronRun());
                        })
                        .catch(err => {
                            Homey.app.doError(`problem with registering cronjob: ${err.message}`);
                        });
                } else {
                    Homey.app.doError(`other cron error: ${err.message}`);
                }
            });
    }



    onCronRun(){
        if(this.getDevices().length > 0) {
            this.getDomoticz().getDeviceData(null).then((result) => {
                try {
                    result.forEach((element) => {
                        this.emit("domoticzdata", element);
                    });

                } catch (e) {
                }
            }).catch((error) => {
                this.emit("domoticzdataerror", error);
                Homey.app.doError('Unable to retrieve state of device');
                Homey.app.doError(error);
            });
        }
    }

    updateExternalState(values,device){
        Homey.app.doLog('Update external state of the device');
        Homey.app.doLog(values);

        let idx = device.getData().idx;

        Object.keys(values).forEach((key)=>{
           switch(key){
               case CAPABILITY_ONOFF:
                   let switchcommand = (values[key] === true ? 'On' : 'Off');

                   this.domoticz.updateDevice('switchlight',idx,switchcommand,null).then((data)=>{
                        Homey.app.doLog('Succesfully updated state external');
                        Homey.app.doLog(data);
                        return true;
                   }).catch((error)=>{
                       Homey.app.doError('Error while updating device in domoticz');
                       Homey.app.doError(error);
                       return false;
                   });
               break;
               case CAPABILITY_TARGET_TEMPERATURE:
                   this.domoticz.updateDevice('setsetpoint',idx,values[key],null).then((data)=>{
                        Homey.app.doLog('Succesfully updated state external');
                        Homey.app.doLog(data);
                   }).catch((error)=>{
                       Homey.app.doError('Error while updating setpoint in domoticz');
                       Homey.app.doError(error);
                    });
                    break;
               default:
                   return true;
           }
        });

    }

    getDomoticz(){
        if(this.domoticz == null){
            Homey.app.doLog('Initialize new domoticz class');
            this.domoticz = Domoticz.fromSettings();
        }
        return this.domoticz;
    }

    onPair(socket){
        socket.on('start',(data,callback)=>{
            Homey.app.doLog("Start pairing. Retrieve connect settings");

            DomoticzDriver.retrieveSettings(data,callback);
        });

        socket.on('validate',(data,callback)=>{
           Homey.app.doLog("Validate new connection settings");
           this.validateSettings(data,callback);
        });

        socket.on('list_devices',(data,callback)=>{
            this.onPairListDevices(data,callback);
        });

        socket.on('domoticz_list_devices',(data,callback)=>{
            this.onPairListDevices(data,callback);
        });
    }

    validateSettings(data,callback){
        Homey.app.doLog("Validating credentials");
        Homey.app.doLog(data);
        let d = new Domoticz(data.username,data.password,data.host,data.port);
        d.findDevice(null,null,null).then((result)=>{
            if(result != null){
                Homey.app.doLog("Retrieve data");
                Homey.app.doLog(result);

            }
            Homey.app.doLog("save settings");
            this.saveSettings(data);
            callback(null,'OK');
        }).catch((error)=>{
            Homey.app.doLog("Credentials are not correct or domoticz is not reachable!");
            callback(error,null);
        });
    }

    saveSettings(data){
        Homey.ManagerSettings.set('domotics_config',data);
    }


    static retrieveSettings(data,callback){
        Homey.app.doLog("Retrieve current settings from Homey store");
        let settings = Homey.ManagerSettings.get('domotics_config');
        if(settings === undefined || settings === null){
            settings = {
                "username": "",
                "password": "",
                "host": "",
                "port": "",
            }
        }

        callback(null,settings);
    }

    static getDeviceClass(deviceEntry){
        switch(deviceEntry.Type){
            case 'Humidity':
                return 'sensor';
            case 'Light/Switch':
                return 'light';
            case 'Thermostat':
                return 'thermostat';
            default:
                return 'sensor';
        }
    }

    static getDeviceCapabilities(deviceEntry){
        let capabilities = new Set();
        switch(deviceEntry.Type){
            case "Humidity":
                capabilities.add(CAPABILITY_MEASURE_HUMIDITY);
                break;
            case "Temp":
                capabilities.add(CAPABILITY_MEASURE_TEMPERATURE);
                break;
            case "Temp + Humidity":
                capabilities.add(CAPABILITY_MEASURE_TEMPERATURE);
                capabilities.add(CAPABILITY_MEASURE_HUMIDITY);
                break;
            case "Light/Switch":
            case "Lighting 1":
            case "Lighting2":
            case "Lighting 2":
                capabilities.add(CAPABILITY_ONOFF);
                if(deviceEntry.hasOwnProperty("HaveDimmer") && deviceEntry.HaveDimmer === true && deviceEntry.DimmerType !== "none"){
                    capabilities.add("dim");
                }
                break;
            case "Color Switch":
                // TODO need to find a way to dimm the lights.
                capabilities.add(CAPABILITY_ONOFF);
                break;
            case "Wind":
                capabilities.add(CAPABILITY_WIND_ANGLE);
                capabilities.add(CAPABILITY_WIND_STRENGTH);
                break;
            case "Rain":
                if(deviceEntry.hasOwnProperty("Rain")){
                    capabilities.add(CAPABILITY_MEASURE_RAIN);
                }

                if(deviceEntry.hasOwnProperty("RainRate")){
                    capabilities.add(CAPABILITY_METER_RAIN);
                }
                break;
            case "Security":
                break;
            case "Usage":
                if(deviceEntry.SubType === "Electric"){
                    capabilities.add(CAPABILITY_MEASURE_POWER);
                }
                break;


        }

        switch(deviceEntry.SubType){
            case "Gas":
                capabilities.add(CAPABILITY_METER_GAS);
                capabilities.add(CAPABILITY_CUMULATIVE_GAS);
                break;
                case "Energy":
                capabilities.add(CAPABILITY_MEASURE_POWER);
                capabilities.add(CAPABILITY_METER_POWER);
                capabilities.add(CAPABILITY_CUMULATIVE_POWER_HIGH);
                capabilities.add(CAPABILITY_CUMULATIVE_POWER_LOW);
                break;
            case "WTGR800":
                if(deviceEntry.hasOwnProperty("Humidity")){
                    capabilities.add(CAPABILITY_MEASURE_HUMIDITY);
                }

                if(deviceEntry.hasOwnProperty("Temp" )){
                    capabilities.add(CAPABILITY_MEASURE_TEMPERATURE);
                }
                break;
            case "Fan":
                capabilities.add(CAPABILITY_FANSPEED);
                break;
            case "SetPoint":
                capabilities.add(CAPABILITY_TARGET_TEMPERATURE);
                break;
            case "Voltage":
                capabilities.add(CAPABILITY_MEASURE_VOLTAGE);
                break;
        }
        return capabilities;
    }

    onPairListDevices( data, callback ) {
        Homey.app.debug  =true;
        Homey.app.doLog("On pair list devices");


        if(this.getDomoticz() === null || this.getDomoticz() === undefined){
            Homey.app.dolog("Domoticz not initialized correctly?");
            callback(false,"kapot");
            return;
        }


        this.getDomoticz().getDeviceData(null).then((result)=>{
            Homey.app.doLog("Devices found");
            Homey.app.doLog("We got some results.");
            let currentDevices = [];
            this.getDevices().forEach((device)=>{
                console.log("Device : "+device.idx);
                currentDevices.push(device.idx);
            });

            Homey.app.doLog("current devices registered:");
            Homey.app.doLog(currentDevices.length);

            let devices = [];
            result.forEach((element)=>{
                Homey.app.doLog("idx:"+element.idx);
                if(currentDevices.indexOf(element.idx) === -1 ){
                //if(!deviceList.has(element.idx)){
                    let capabilities = DomoticzDriver.getDeviceCapabilities(element);
                    let deviceClass = DomoticzDriver.getDeviceClass(element);
                    if(capabilities.size > 0 && deviceClass != null){
                        devices.push({
                            "name": element.Name || DEVICE_DEFAULT_NAME,
                            "class": deviceClass,
                            "capabilities": Array.from(capabilities),
                            "data": {
                                id: this.guid(),
                                idx: element.idx,
                                hardwareName: element.HardwareName,
                                hardwareType: element.HardwareTypeVal
                            }
                        });
                    }
                }
            });

            Homey.app.doLog("Devices found: ");
            Homey.app.doLog(devices.length);
            Homey.app.debug=false;
            callback(null,devices);
    }).catch((error)=>{
        Homey.app.doLog("Error while retrieving devicelist");
        Homey.app.doLog(error);
       callback(false,error);
    });
        Homey.app.debug  =false;
    }

    guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }


}

module.exports = DomoticzDriver;