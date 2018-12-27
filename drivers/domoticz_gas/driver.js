'use strict';

const Homey = require('homey');
const Domoticz = require('domoticz');

const DEVICETYPE = 4;
const SUBTYPE = 'Gas';
const DEVICE_DEFAULT_NAME = "Domoticz Gas meter";

class DomoticzPowerDriver extends Homey.Driver {
    
    onInit(){
        this.log('Entering DomoticzGasDriver ');
        let d = new Domoticz();
        this.domoticz = d.fromSettings();
    }

    getReadings(device){
        this.domoticz.findDevice(DEVICETYPE,SUBTYPE,device.getData().idx).then((result)=>{
            device.updateState(result);
        }).catch((error)=>{
            console.error('Unable to retrieve device data');
        });
    }

    onPairListDevices( data, callback ) {
        
        let devices = [];

        this.domoticz.findDevice(DEVICETYPE,SUBTYPE).then((result)=>{
            
            devices.push({
                "name": result.name || DEVICE_DEFAULT_NAME,
                "data": {
                    "id": this.domoticz.getHostString()+":"+DEVICETYPE+":"+SUBTYPE+":"+result.idx,
                    "idx": result.idx,
                }

            });
            callback( null, devices );
        }).catch((error)=>{
            console.log('error while reading devicelist');
            callback(false,null);
        });
    }

}

module.exports = DomoticzPowerDriver;