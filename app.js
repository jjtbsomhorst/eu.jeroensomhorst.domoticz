'use strict';

const Homey = require('homey');

// enable for profiling
//require('inspector').open(9229, '0.0.0.0', false)
class DomoticzApp extends Homey.App {

	onInit() {

		this.doLog('Domoticz app started');
		this.doLog("Version: "+this.manifest.version);

		Homey.on('unload',()=>{
			this.doLog('Domoticz app unloaded');
		});
		Homey.on('memwarn',()=>{
			this.doLog('Domoticz app memory warning!');
			// Force garbage collection
			try{
				global.gc();
			}catch(e){}

		});


	}
	doError(msg){

		this.doLog("Error: "+msg);

	}

	doLog(msg){
		if(msg instanceof Object){
			this.log(JSON.stringify(msg));
		}else{
			this.log(msg);
		}
	}
}

module.exports = DomoticzApp;