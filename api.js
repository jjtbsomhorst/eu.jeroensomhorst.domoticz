'use strict';


const Homey = require('homey');
const Domoticz = require('domoticz');

module.exports = [
    {
        method: 'POST',
        path: 'validate',
        fn: function(req,callback){
            let args = req.body;
            var dm = new Domoticz(args.username,args.password,args.host,args.port);
            dm.doLogin().then((data)=>{
                callback(null,true);
            }).catch((error)=>{
                callback(null,false);
            });
        }
    }
];