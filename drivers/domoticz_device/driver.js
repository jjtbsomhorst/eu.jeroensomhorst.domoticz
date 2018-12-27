'use strict';

const Homey = require('homey');
const Domoticz = require('domoticz');
const DEVICE_DEFAULT_NAME = "Domoticz device";
const POLL_TASK_NAME = "DomoticzStatusPoller";

class DomoticzDriver extends Homey.Driver{

    onInit(){
        console.log("Initialize driver");
        let d = this.getDomoticz();

        if(d) {
            this._intervalId = setInterval(() => {
                this.onCronRun();
            }, 1000);
        }

    }

    onCronRun(){
        let devices = this.getDevices();

        if(devices.length === 0){ // only continue if we have devices;
            console.log("No devices configured yet. Skip");
            return true;
        }
        let domoticz = this.getDomoticz();
        if(!domoticz){
            console.error("Domoticz not initialized");
            return true;
        }

        // put devices in map based on idx;

        let deviceMap = new Map();

        devices.forEach((d)=>{
            deviceMap.set(d.getData().idx,d);
        });

        this.getDomoticz().findDevice(null, null, null).then((result) => {
            // for each device update state;
                result.forEach((element) => {
                    if(deviceMap.has(element.idx)){ // found the device
                        let device = deviceMap.get(element.idx);
                        this._updateInternalState(device,element);
                    }
                });
            }).catch((error) => {
                console.error('Unable to retrieve state of devices');
                console.error(error);
            });


        console.log("-------");
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
                       console.log('Error while updating device in domoticz');
                       console.log(error);
                   });
               break;


           }
        });

    }

    _updateInternalState(device,data){
        device.getCapabilities().forEach((element)=>{
            switch(element){
                case 'onoff':
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
                    device.setCapabilityValue(element,parseFloat(data.CounterToday.split(" ")[0]));
                    break;
                case "measure_power":
                    device.setCapabilityValue(element,parseFloat(data.Usage.split(" ")[0]));
                    break;
                case "meter_power":
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
            console.log("retrieve settings");
            this.retrieveSettings(data,callback);
        });

        socket.on('validate',(data,callback)=>{
           console.log("validate settings");
           this.validateSettings(data,callback);
        });

        socket.on('list_devices',(data,callback)=>{
            console.log("List devices");
            this.onPairListDevices(data,callback);
        })




    }

    validateSettings(data,callback){
        console.log('lets validate the credentials');
        console.log(data);
        let settings = data;
        let d = new Domoticz(data.username,data.password,data.host,data.port);
        d.findDevice(null,null,null).then((result)=>{
            if(result != null){
                console.log("result!!!");
                console.log(result);
            }
            console.log('credentials are possibly correct');
            this.saveSettings(data);
            callback(null,'OK');
        }).catch((error)=>{
            console.log("Credentials are incorrect do something!!");
            callback(error,null);
        });
    }

    saveSettings(data){
        Homey.ManagerSettings.set('domotics_config',data);
    }


    retrieveSettings(data,callback){
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

        return capabilities;
    }

    onPairListDevices( data, callback ) {
        console.log("On pair list devices");
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
            callback(null,devices);
        }).catch((error)=>{
           console.log("Error whilre reading devicelist");
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