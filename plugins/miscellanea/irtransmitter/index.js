'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;


module.exports = irtransmitter;
function irtransmitter(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}



irtransmitter.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

    return libQ.resolve();
}

irtransmitter.prototype.onStart = function() {
    var self = this;
	  var defer=libQ.defer();

    var device = self.getAdditionalConf("system_controller", "system", "device");
    if (device == "Raspberry PI") {
//        self.enablePIOverlay();
    }
//    self.logger.info('IR transmitter device query found: '+ JSON.stringify(device));
    self.logger.info('IR-Transmitter: Loaded configuration: ' + JSON.stringify(self.config.data));

    self.addVolumeScripts();
  	// Once the Plugin has successfull started resolve the promise
  	defer.resolve();

    return defer.promise;
};

irtransmitter.prototype.onStop = function() {
    var self = this;
    var defer=libQ.defer();

    self.removeVolumeScripts();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

irtransmitter.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------

irtransmitter.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;

    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {


            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};

irtransmitter.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

irtransmitter.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

irtransmitter.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

irtransmitter.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};

// Actual working methods ----------------------------------------------------

// Adapted from Allo Relay attenuator plugin  (alloSteppedVolumeAttenuator)

irtransmitter.prototype.addVolumeScripts = function() {
    var self = this;

    var enabled = true;
    var setVolumeScript = __dirname + '/setvolume.sh';
    var getVolumeScript = __dirname + '/getvolume.sh';
    var setMuteScript = __dirname + '/setmute.sh';
    var getMuteScript = __dirname + '/getmute.sh';
    var minVol = 0;
    var maxVol = 20;
    var mapTo100 = self.config.get('map_to_100', false);

    var data = {'enabled': enabled, 'setvolumescript': setVolumeScript, 'getvolumescript': getVolumeScript, 'setmutescript': setMuteScript,'getmutescript': getMuteScript, 'minVol': minVol, 'maxVol': maxVol, 'mapTo100': mapTo100};
    self.logger.info('Adding IR transmitter parameters'+ JSON.stringify(data));
    self.commandRouter.updateVolumeScripts(data);
};

irtransmitter.prototype.removeVolumeScripts = function() {
    var self = this;

    var enabled = false;
    var setVolumeScript = '';
    var getVolumeScript = '';
    var setMuteScript = '';
    var getMuteScript = '';
    var minVol = 0;
    var maxVol = 100;
    var mapTo100 = false;

    var data = {'enabled': enabled, 'setvolumescript': setVolumeScript, 'getvolumescript': getVolumeScript, 'setmutescript': setMuteScript,'getmutescript': getMuteScript, 'minVol': minVol, 'maxVol': maxVol, 'mapTo100': mapTo100};
    self.commandRouter.updateVolumeScripts(data);
};


// Adapted from ir_receiver plugin
irtransmitter.prototype.enablePIOverlay = function() {
    var defer = libQ.defer();
    var self = this;

    if (kernelMajor < '4' || (kernelMajor === '4' && kernelMinor < '19')) {
        if (!fs.existsSync('/proc/device-tree/lirc_rpi')) {
            self.logger.info('HAT did not load /proc/device-tree/lirc_rpi!');
            exec('/usr/bin/sudo /usr/bin/dtoverlay lirc-rpi gpio_out_pin=12', { uid: 1000, gid: 1000 },
                function (error, stdout, stderr) {
                    if(error != null) {
                        self.logger.info('Error enabling lirc-rpi overlay: ' + error);
                        defer.reject();
                    } else {
                        self.logger.info('lirc-rpi overlay enabled');
                        defer.resolve();
                    }
                });
        } else {
            self.logger.info('HAT already loaded /proc/device-tree/lirc_rpi!');
        }
    } else {
        if (fs.readdirSync('/proc/device-tree').find(function (fn) { return fn.startsWith(' gpio-ir-transmitter'); }) === undefined) {
            self.logger.info('HAT did not load /proc/device-tree/gpio-ir-transmitter!');
            exec('/usr/bin/sudo /usr/bin/dtoverlay gpio-ir-tx gpio_pin=12', { uid: 1000, gid: 1000 },
                function (error, stdout, stderr) {
                    if (error != null) {
                        self.logger.info('Error enabling gpio-ir-tx overlay: ' + error);
                        defer.reject();
                    } else {
                        self.logger.info('gpio-ir-tx overlay enabled');
                        defer.resolve();
                    }
                });
        } else {
            self.logger.info('HAT already loaded /proc/device-tree/gpio-ir-transmitter!');
        }
    }
    return defer.promise;
};

irtransmitter.prototype.powerToggle = function(data) {
    var defer = libQ.defer();
    var self = this;

    exec('/usr/bin/irsend SEND_ONCE CamAudioOne KEY_POWER', {uid:1000,gid:1000},
        function (error, stdout, stderr) {
            if(error != null) {
                self.logger.info('Error sending IR power toggle signal: '+error);
                defer.reject();
            } else {
                self.logger.info('Send IR power toggle signal');
                defer.resolve();
            }
        });

    return defer.promise;
};


irtransmitter.prototype.getAdditionalConf = function (type, controller, data) {
    var self = this;
    var confs = self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
    return confs;
};