'use strict';

const Homey = require('homey');
class DomoticzPowerDevice extends Homey.Device{
    
    async onInit(){
        this.log('Power meter initialize');
        this._driver = this.getDriver();
        this._intervalId = setInterval(()=>{
            this.doPoll();
        },10000);
        //  
        // start cron job
        //  in cron Get driver
        //  get data from driver
        //  fill capability values
        //  done
    }
    updateState(result){
        
        let meterPower = parseFloat(result.CounterToday.split(" ")[0]);
        let lastMeasurePower = parseFloat(result.Usage.split(" ")[0]);
     
        this.setCapabilityValue('measure_power',lastMeasurePower);
		this.setCapabilityValue('meter_power',meterPower);
    }
    
    onAdded(){
        
    }
    onDeleted()
    {
        clearInterval(this._intervalId);
        // get interval key 
        // stop interval and remove key
    }
    
    doPoll(){
        this._driver.getReadings(this);
    }

}

module.exports = DomoticzPowerDevice;