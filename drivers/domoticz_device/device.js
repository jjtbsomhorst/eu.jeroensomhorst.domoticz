'use strict';

const Homey = require('homey');

class DomoticzDevice extends Homey.Device{
    onInit(){
        Homey.app.doLog("DomoticzDriver initialized");
        Homey.app.doLog("Data: ");
        Homey.app.doLog(this.getData());
        this.registerMultipleCapabilityListener(this.getCapabilities(),(values,opts)=>{
            this.onCapabilityChange(values,opts);
        },500); // every half second
    }

    onAdded(){

    }

    onDeleted(){

    }

    onCapabilityChange(values,opts){
        Homey.app.doLog("Capabilities have changed");
        Homey.app.doLog("-----");
        Homey.app.doLog(values);
        Homey.app.doLog("-----");
        Homey.app.doLog(opts);
        Homey.app.doLog("-----");
        if(this.getDriver().updateExternalState(values,this)){
            return Promise.resolve(true);
        }else{
            return Promise.resolve(false);
        }

    }

}

module.exports = DomoticzDevice;