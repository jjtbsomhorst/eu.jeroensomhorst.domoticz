'use strict';

const Homey = require('homey');

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

const CAPABILITY_CUMULATIVE_POWER_HIGH = "power_meter_cumulative_high";
const CAPABILITY_CUMULATIVE_POWER_LOW = "power_meter_cumulative_low";
const CAPABILITY_CUMULATIVE_GAS = "gas_meter_cumulative";
const CAPABILITY_MEASURE_VOLTAGE = "measure_voltage";
const CAPABILITY_MEASURE_RAIN = "measure_rain";
const CAPABILITY_METER_RAIN = "meter_rain";

class DomoticzDevice extends Homey.Device{
    onInit(){
        this.capabilities = this.getCapabilities();
        this.idx = this.getData().idx;

        this.registerMultipleCapabilityListener(this.capabilities,(values,opts)=>{
            this.onCapabilityChange(values,opts);
        }); // every half second

        this.getDriver().on('domoticzdata',(data)=>{
            if(data !== null && data.idx === this.idx){
                this._updateInternalState(data);
            }
        });

    }

    _updateInternalState(data){
        Homey.app.doLog("Update internal state of device");
        this.capabilities.forEach((element)=>{
            let oldValue = this.getCapabilityValue(element);
            let value = null;
            switch(element){
                case CAPABILITY_ONOFF:
                    value = (data.Status !== "Off");
                    break;
                case CAPABILITY_METER_GAS:
                    value = parseFloat(data.CounterToday.split(" ")[0]);
                    break;
                case CAPABILITY_CUMULATIVE_GAS:
                    if(data.hasOwnProperty("Data") && (data.Data != null && data.Data !== "")) {
                        value = parseFloat(data.Data);
                    }
                    break;
                case CAPABILITY_MEASURE_POWER:
                    const powerDelivery = data.UsageDeliv ? parseFloat(data.UsageDeliv.split(" ")[0]) : 0;
                    value = parseFloat(data.Usage.split(" ")[0]) - powerDelivery;
                    break;
                case CAPABILITY_METER_POWER:
                    value = parseFloat(data.CounterToday.split(" ")[0]);
                    break;
                case CAPABILITY_CUMULATIVE_POWER_HIGH:
                    if(data.hasOwnProperty("Data") && (data.Data !== null && data.Data!=="")){
                        value = DomoticzDevice.getMeterValue(data.Data,"T1");
                    }
                    break;
                case CAPABILITY_CUMULATIVE_POWER_LOW:
                    if(data.hasOwnProperty("Data") && (data.Data !== null && data.Data!=="")){
                        value = DomoticzDevice.getMeterValue(data.Data,"T2");
                    }
                    break;
                case CAPABILITY_TARGET_TEMPERATURE:
                    value = parseFloat(data.SetPoint);
                    break;
                case CAPABILITY_MEASURE_TEMPERATURE:
                    value = data.Temp;
                    break;
                case CAPABILITY_MEASURE_HUMIDITY:
                    value = data.Humidity;
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
                case CAPABILITY_METER_RAIN:
                    value = parseFloat(data.Rain);
                    break;
                case CAPABILITY_MEASURE_RAIN:
                    value = parseFloat(data.RainRate);
                    break;
                case CAPABILITY_MEASURE_VOLTAGE:
                    value = parseFloat(data.Voltage);
                    break;
            }
            if(value !== null && value !== oldValue){
                this.setCapabilityValue(element,value,(err)=>{
                    if(err){
                        Homey.app.doError(' ----- Unsuccessful updating capability ------');
                        Homey.app.doError(element);
                        Homey.app.doError(value);
                        Homey.app.doError(err);
                    }
                });
            }

        });
    }

    static getMeterValue(data, type){

        if(data == null || data === ""){
            return 0;
        }

        let rawData = data.split(";");

        switch(type){
            case 'T1':
                return parseFloat(rawData[0]);
            case 'T2':
                return parseFloat(rawData[1]);
            case 'R1':
                return 0;

            case 'R2':
                return 0;

        }
    }

    onAdded(){
    }

    onDeleted(){
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

module.exports = DomoticzDevice;
