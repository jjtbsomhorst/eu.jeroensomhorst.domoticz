'use strict';

const Homey = require('homey');
const Domoticz = require('domoticz');
const DEVICE_DEFAULT_NAME = "Domoticz device";

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

class DomoticzDriver extends Homey.Driver{

    onInit(){
        Homey.app.doLog("Initialize driver");
        let d = this.getDomoticz();
        if(d) {
            this._intervalId = setInterval(() => {
                this.onCronRun();
            }, 1000);

        }

        this.lastUpdates = new Map();

    }

    onCronRun(){
        Homey.app.doLog("Retrieve devices");
        let devices = this.getDevices();

        if(devices.length === 0){ // only continue if we have devices;
            Homey.app.doLog("No devices configured yet. Skip");
            return true;
        }
        let domoticz = this.getDomoticz();
        if(!domoticz){
            Homey.app.doLog("Domoticz api not initialized");
            return false;
        }

        // put devices in map based on idx;

        let deviceMap = new Map();

        devices.forEach((d)=>{
            deviceMap.set(d.getData().idx,d);
        });
        //Homey.app.doLog("Update internal state of devices");
        this.getDomoticz().findDevice(null, null, null).then((result) => {
                //Homey.app.doLog("Device info retrieved");
                //Homey.app.doLog("------");
                //Homey.app.doLog(result);
                //Homey.app.doLog("------");
                result.forEach((element) => {
                    if(deviceMap.has(element.idx)){ // found the device

                        let device = deviceMap.get(element.idx);
                        this._updateInternalState(device,element);
                    }
                });
            }).catch((error) => {
                Homey.app.doError('Unable to retrieve state of devices');
                Homey.app.doError(error);
            });

    }

    updateExternalState(values,device){
        Homey.app.doLog('Update external state of the device');
        Homey.app.doLog(values);

        let idx = device.getData().idx;

        Object.keys(values).forEach((key)=>{
           switch(key){
               case CAPABILITY_ONOFF:
                   var switchcommand = (values[key] === true ? 'On' : 'Off');

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

    _updateInternalState(device,data){



        if(this.lastUpdates.has(data.idx)){
            let timeStamp = this.lastUpdates.get(data.idx);

            if(timeStamp === data.LastUpdate){
                //Homey.app.doLog('Ignore device update for '+data.idx);
                return true;
            }
        }
        Homey.app.doLog("Update internal state of device");
        Homey.app.doLog("Device: ");
        Homey.app.doLog(device);

        device.getCapabilities().forEach((element)=>{

            let value = null;

            switch(element){
                case CAPABILITY_ONOFF:
                    switch(data.Status){
                        case 'Off':
                            value = false;
                            break;
                        default:
                            value = true;

                            break;
                    }
                    break;
                case CAPABILITY_METER_GAS:
                    value = parseFloat(data.CounterToday.split(" ")[0]);

                    break;
                case CAPABILITY_MEASURE_POWER:
                    value = parseFloat(data.Usage.split(" ")[0]);

                    break;
                case CAPABILITY_METER_POWER:
                    value = parseFloat(data.CounterToday.split(" ")[0]);

                    break;
                case CAPABILITY_TARGET_TEMPERATURE:
                    value = parseFloat(data.SetPoint);
                    break;
                case CAPABILITY_MEASURE_TEMPERATURE:
                    value = data.Temp;
                    break;
                case CAPABILITY_FANSPEED:
                    let rpm = data.Data.toLowerCase();
                    rpm = rpm.replace('RPM','');
                    rpm = rpm.trim();
                    value = parseFloat(rpm);
                    break;
                case CAPABILITY_WIND_ANGLE:
                    let windAngle = data.Data.split(";");
                    value = parseFloat(windAngle[0]);
                    break;
                case CAPABILITY_WIND_STRENGTH:
                    let windStrength = data.Data.split(";");
                    value = parseFloat(windStrength[3])/10;
                    value = value * 3.6;
                    break;
            }

            if(value !== null){
                device.setCapabilityValue(element,value,(err)=>{
                   if(err){
                       Homey.app.doError(' ----- Unsuccesfull updating capability ------');
                       Homey.app.doError(element);
                       Homey.app.doError(value);
                       Homey.app.doError(err);
                   }
                });
            }

        });


        this.lastUpdates.set(data.idx,data.LastUpdate);
    }

    getDomoticz(){
        if(this.domoticz == null){
            this.domoticz = new Domoticz().fromSettings();
        }

        return this.domoticz;
    }

    onPair(socket){
        socket.on('start',(data,callback)=>{
            Homey.app.doLog("Start pairing. Retrieve connect settings");

            this.retrieveSettings(data,callback);
        });

        socket.on('validate',(data,callback)=>{
           Homey.app.doLog("Validate new connection settings");
           this.validateSettings(data,callback);
        });

        socket.on('list_devices',(data,callback)=>{
            Homey.app.doLog("List new devices");
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


    retrieveSettings(data,callback){
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

    getDeviceClass(deviceEntry){
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

    getDeviceCapabilities(deviceEntry){
        let capabilities = [];
        Homey.app.doLog("Get capabilities for device");
        Homey.app.doLog(deviceEntry.idx);
        switch(deviceEntry.Type){
            case 'Humidity':
                capabilities.push(CAPABILITY_MEASURE_HUMIDITY);
                break;
            case 'Temp':
                capabilities.push(CAPABILITY_MEASURE_TEMPERATURE);
                break;
            case 'Light/Switch':
            case 'Lighting2':
            case 'Lighting 2':
                capabilities.push(CAPABILITY_ONOFF);
                if(deviceEntry.hasOwnProperty('HaveDimmer') && deviceEntry.HaveDimmer === true && deviceEntry.DimmerType !== "none"){
                    capabilities.push('dim');
                }

                capabilities.push(CAPABILITY_ONOFF);
                break;
            case 'Color Switch':
                // TODO need to find a way to dimm the lights.
                capabilities.push(CAPABILITY_ONOFF);
                break;
            case 'Wind':
                capabilities.push(CAPABILITY_WIND_ANGLE);
                capabilities.push(CAPABILITY_WIND_STRENGTH);
                break;

        }

        switch(deviceEntry.SubType){
            case 'Gas':
                capabilities.push(CAPABILITY_METER_GAS);
                break;
            case 'Energy':
                capabilities.push(CAPABILITY_MEASURE_POWER);
                capabilities.push(CAPABILITY_METER_POWER);
                break;
            case 'Fan':
                capabilities.push(CAPABILITY_FANSPEED);
                break;
            case 'SetPoint':
                capabilities.push(CAPABILITY_TARGET_TEMPERATURE);
                break;
        }
        Homey.app.doLog("Capabilities found: ");
        Homey.app.doLog(capabilities);

        return capabilities;
    }

    onPairListDevices( data, callback ) {
        Homey.app.doLog("On pair list devices");
        let currentDevices = this.getDevices();
        let domoticz = this.getDomoticz();
        if(!domoticz){
            callback(false,"kapot");
            return;
        }

        let keys = [];
        currentDevices.forEach((d)=>{
            keys.push(d.getData().idx);
        });

        domoticz.findDevice(null,null,null).then((result)=>{
            let devices = [];

            result.forEach((element)=>{
                if(keys.indexOf(element.idx) < 0 ) {
                    if(element.hasOwnProperty('Used') && element.Used === 1){

                        let capabilities = this.getDeviceCapabilities(element);
                        let deviceClass = this.getDeviceClass(element);
                        Homey.app.doLog(capabilities);
                        Homey.app.doLog(deviceClass);

                        if(capabilities.length > 0 && deviceClass != null){
                            devices.push({
                                "name": element.Name || DEVICE_DEFAULT_NAME,
                                "class": deviceClass,
                                "capabilities": capabilities,
                                "data": {
                                    id: this.guid(),
                                    idx: element.idx,
                                }
                            });
                        }else{
                            Homey.app.doLog("Could not determine device class or capabilities for device");
                            Homey.app.doLog(element);
                        }


                    }


                }
            });
            Homey.app.doLog("Devices found: ");
            Homey.app.doLog(devices.length);
            callback(null,devices);
        }).catch((error)=>{
            Homey.app.doLog("Error while retrieving devicelist");
            Homey.app.doLog(error);
           callback(false,error);
        });
    }

    guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }


}

module.exports = DomoticzDriver;