'use strict';

const Homey = require('homey');
const Domoticz = require('domoticz');

const DEVICETYPE = 4;
const SUBTYPE = 'Energy';
const DEVICE_DEFAULT_NAME = "Domoticz Power meter";

class DomoticzPowerDriver extends Homey.Driver {
    
    onInit(){
        this.log('Enetering DomoticzPowerDriver ');
        let d = new Domoticz();
        this.domoticz = d.fromSettings();
    }

    getReadings(device){
        console.log("Retrieve readings for device ");
        this.domoticz.findDevice(DEVICETYPE,SUBTYPE,device.getData().idx).then((result)=>{
            device.updateState(result);
        }).catch((error)=>{
            console.error('Unable to retrieve device data');
        });
    }

    onPairListDevices( data, callback ) {
        console.log("On pair list devices");
        
        
        let devices = [];

        this.domoticz.findDevice(DEVICETYPE,SUBTYPE).then((result)=>{
            console.log("Devices retrieved");
            console.log( result);
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