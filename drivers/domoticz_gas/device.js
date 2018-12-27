'use strict';

const Homey = require('homey');
class DomoticzGasDevice extends Homey.Device{
    
    async onInit(){
        this._driver = this.getDriver();
        this._intervalId = setInterval(()=>{
            this.doPoll();
        },10000);
        
    }
    updateState(result){
        let metergas = parseFloat(result.CounterToday.split(" ")[0]);
       
        this.setCapabilityValue('meter_gas',metergas);
    }
    
    onAdded(){
        this.log('GAS: On add device');
    }
    onDeleted()
    {
        this.log('GAS: Device removal');
        clearInterval(this._intervalId);
    }
    
    doPoll(){
        this._driver.getReadings(this);
    }

}

module.exports = DomoticzGasDevice;