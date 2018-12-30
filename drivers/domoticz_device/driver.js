'use strict';

const Homey = require('homey');
const Domoticz = require('domoticz');
const DEVICE_DEFAULT_NAME = "Domoticz device";

class DomoticzDriver extends Homey.Driver{

    onInit(){
        Homey.app.doLog("Initialize driver");
        let d = this.getDomoticz();

        if(d) {
            this._intervalId = setInterval(() => {
                this.onCronRun();
            }, 1000);

        }

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
        Homey.app.doLog("Update internal state of devices");
        this.getDomoticz().findDevice(null, null, null).then((result) => {
                Homey.app.doLog("Device info retrieved");
                Homey.app.doLog("------");
                Homey.app.doLog(result);
                Homey.app.doLog("------");
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
        let domoticz = this.getDomoticz();
        let idx = device.getData().idx;

        Object.keys(values).forEach((key)=>{
           switch(key){
               case 'onoff':
                   var switchcommand = (values[key] === true ? 'On' : 'Off');

                   this.domoticz.updateDevice('switchlight',idx,switchcommand,null).then((data)=>{

                   }).catch((error)=>{
                       Homey.app.doError('Error while updating device in domoticz');
                       Homey.app.doError(error);
                   });
               break;


           }
        });

    }

    _updateInternalState(device,data){
        Homey.app.doLog("Update internal state of device");
        Homey.app.doLog("Update capabilities");
        Homey.app.doLog("Device data: ");
        Homey.app.doLog(data);
        device.getCapabilities().forEach((element)=>{
            switch(element){
                case 'onoff':
                    Homey.app.doLog("OnOff capabilitie");
                    switch(data.Status){
                        case 'Off':
                            device.setCapabilityValue(element,false);
                            break;
                        default:
                            device.setCapabilityValue(element,true);
                            break;
                    }
                    break;
                case 'meter_gas':
                    Homey.app.doLog("meter_gas capabilitie");
                    device.setCapabilityValue(element,parseFloat(data.CounterToday.split(" ")[0]));
                    break;
                case "measure_power":
                    Homey.app.doLog("meter_gas capabilitie");
                    device.setCapabilityValue(element,parseFloat(data.Usage.split(" ")[0]));
                    break;
                case "meter_power":
                    Homey.app.doLog("meter_power capabilitie");
                    device.setCapabilityValue(element,parseFloat(data.CounterToday.split(" ")[0]));
                    break;
            }
        })

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
        })




    }

    validateSettings(data,callback){
        Homey.app.doLog("Lets validate credentials");
        Homey.app.doLog(data);
        let settings = data;
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
            Homey.app.doLog("Credentials are not correct or domoticz is not reachable");
            callback(error,null);
        });
    }

    saveSettings(data){
        Homey.app.doLog("Saving settings into Homey");
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
            default:
                return 'sensor';
        }


    }

    getDeviceCapabilities(deviceEntry){
        let capabilities = [];
        Homey.app.doLog("Get capabilities for device");
        Homey.app.doLog(deviceEntry);
        switch(deviceEntry.Type){
            case 'Humidity':
                capabilities.push('measure_humidity');
                break;
            case 'Light/Switch':
                capabilities.push('onoff');
                if(deviceEntry.hasOwnProperty('HaveDimmer') && deviceEntry.HaveDimmer === true && deviceEntry.DimmerType !== "none"){
                    capabilities.push('dim');
                }
                break;
            default:
                capabilities.push('onoff');
            break;
        }

        switch(deviceEntry.SubType){
            case 'Gas':
                capabilities.push('meter_gas');
                break;
            case 'Energy':
                capabilities.push('measure_power');
                capabilities.push('meter_power');
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

        let devices = [];


        domoticz.findDevice(null,null,null).then((result)=>{
            let devices = [];

            result.forEach((element)=>{
                if(keys.indexOf(element.idx) < 0 ) {

                    devices.push({
                        "name": element.Name || DEVICE_DEFAULT_NAME,
                        "class": this.getDeviceClass(element),
                        "capabilities": this.getDeviceCapabilities(element),
                        "data": {
                            id: this.guid(),
                            idx: element.idx,
                        }
                    });
                }
            });
            Homey.app.doLog("Devices found: ");
            Homey.app.doLog(devices);
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