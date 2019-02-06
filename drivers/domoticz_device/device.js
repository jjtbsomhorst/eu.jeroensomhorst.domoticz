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
        this.getDriver().onDeviceAdd(this);
    }

    onDeleted(){
        this.getDriver().onDeviceRemove(this);
    }

    onCapabilityChange(values,opts){
        // noinspection JSUnresolvedVariable
        Homey.app.doLog("Capabilities have changed");
        // noinspection JSUnresolvedVariable
        Homey.app.doLog("-----");
        // noinspection JSUnresolvedVariable
        Homey.app.doLog(values);
        // noinspection JSUnresolvedVariable
        Homey.app.doLog("-----");
        // noinspection JSUnresolvedVariable
        Homey.app.doLog(opts);
        // noinspection JSUnresolvedVariable
        Homey.app.doLog("-----");
        // noinspection JSUnresolvedVariable
        if(this.getDriver().updateExternalState(values,this)){
            return Promise.resolve(true);
        }else{
            return Promise.resolve(false);
        }

    }

}

// noinspection JSUnresolvedVariable
module.exports = DomoticzDevice;