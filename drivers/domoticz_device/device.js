'use strict';

const Homey = require('homey');

class DomoticzDevice extends Homey.Device{
    onInit(){
        console.log("DomoticzDevice initialized");
        this.registerMultipleCapabilityListener(this.getCapabilities(),(values,opts)=>{
            this.onCapabilityChange(values,opts);
        },500); // every half second
    }

    onAdded(){

    }

    onDeleted(){

    }

    onCapabilityChange(values,opts){
        console.log("Capabilities have changed");
        console.log("-----");
        console.log(values);
        console.log("-----");
        console.log(opts);
        console.log("-----");
        this.getDriver().updateExternalState(values,this);
        //this.driver.updateState(values,this.getData().idx); // update the state on domoticz side.
    }

}

module.exports = DomoticzDevice;