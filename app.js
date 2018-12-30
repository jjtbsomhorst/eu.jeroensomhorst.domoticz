'use strict';

const Homey = require('homey');

class DomoticzApp extends Homey.App {
	
	onInit() {
		this.logArray = [];

		let log = this.getLogs();
		if(log != null && log != undefined && log !== ""){
			try{
				this.logArray = JSON.parse(log);
			}catch(error){

			}
		}

		this.doLog('Domoticz app started');

		Homey.on('unload',()=>{
			this.doLog('Domoticz app unloaded');
			this.saveLog();
		});
		Homey.on('memwarn',()=>{
			this.doLog('Domoticz app memory warning!');
		});
		// Force garbage collection
		this.intervalIdGc = setInterval(() => {
			global.gc();
		}, 1000 * 60 * 10);

	}

	deleteLogs(){
        return this.deleteLog();
	}

	getLogs() {
	    return this.logArray;
	}

	doError(msg){
		this.log("ERROR: ");
		this.doLog(msg);
		this.saveLog();
	}

	doLog(msg){
		let date = new Date();
		let line = date.toLocaleString()+": "+msg;
		if(msg instanceof Object){
			line = date.toLocaleString()+": "+JSON.stringify(msg);
		}

		this.log(line);
		this.logArray.push(line);
		if(this.logArray.length > 500){ // only persist 500 lines
			this.logArray.shift();
		}
	}

	saveLog(){
		Homey.ManagerSettings.set('domoticzlog',JSON.stringify(this.logArray));
	}

	deleteLog(){
		Homey.ManagerSettings.unset('domoticzlog');
		return true;
	}
}

module.exports = DomoticzApp;