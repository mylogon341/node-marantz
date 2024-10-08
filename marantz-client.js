var telnet = require('telnet-client');
var connection = new telnet();
var events = require('events');

var myEmitter = new events.EventEmitter();

var state = {
    main: {
        isPowered: false,
        source: null,
        mainLevel: null,
        isMuted: false
    },
    aux: {
        isPowered: false,
        source: null,
        mainLevel: null,
        isMuted: false
    }
};

connection.on('close', function () {
    console.log('connection closed');
    process.exit();
});

connection.on('error', function (error) {
    console.log('connection error ' + error);
});

connection.on('data', function (data) {
    data = data.toString().trim();

    switch (data) {
        case 'SISAT/CBL':
            myEmitter.emit('source', 'PS4', 'main');
            state.main.source = 'PS4';
            console.log('Main Source: PS4');
            return;
        case 'SIGAME':
            myEmitter.emit('source', 'Apple TV', 'main');
            state.main.source = 'Apple TV';
            console.log('Main Source: Apple TV');
            return;
        case 'SIBD':
            myEmitter.emit('source', 'Switch', 'main');
            state.main.source = 'Switch';
            console.log('Main Source: Switch');
            return;
        case 'Z2SAT/CBL':
            myEmitter.emit('source', 'PS4', 'aux');
            state.aux.source = 'PS4';
            console.log('Aux Source: PS4');
            return;
        case 'Z2DVD':
            myEmitter.emit('source', 'Mac Mini', 'aux');
            state.aux.source = 'Mac Mini';
            console.log('Aux Source: Mac Mini');
            return;
        case 'Z2BD':
            myEmitter.emit('source', 'KVM Switch', 'aux');
            state.aux.source = 'KVM Switch';
            console.log('Aux Source: KVM Switch');
            return;
        case 'Z2OFF':
            myEmitter.emit('isPowered', false, 'aux');
            state.aux.isPowered = false;
            console.log('Aux Power: Off');
            return;
        case 'Z2ON':
            myEmitter.emit('isPowered', true, 'aux');
            state.aux.isPowered = true;
            console.log('Aux Power: On');
            return;
        case 'ZMOFF':
            myEmitter.emit('isPowered', false, 'main');
            state.main.isPowered = false;
            console.log('Main Power: Off');
            return;
        case 'ZMON':
            myEmitter.emit('isPowered', true, 'main');
            state.main.isPowered = true;
            console.log('Main Power: On');
            return;
        case 'MUOFF':
            myEmitter.emit('isMuted', false, 'main');
            state.main.isMuted = false;
            console.log('Main Mute: Off');
            return;
        case 'MUON':
            myEmitter.emit('isMuted', true, 'main');
            state.main.isMuted = true;
            console.log('Main Mute: On');
            return;
        case 'Z2MUOFF':
            myEmitter.emit('isMuted', false, 'aux');
            state.aux.isMuted = false;
            console.log('Aux Mute: Off');
            return;
        case 'Z2MUON':
            myEmitter.emit('isMuted', true, 'aux');
            state.aux.isMuted = true;
            console.log('Aux Mute: On');
            return;
    }
    if (data.indexOf('MV') == 0) {
        var main_vol = getVolume(data);
        if (main_vol !== false) {
            myEmitter.emit('volume', main_vol, 'main');
            state.main.mainLevel = main_vol;
            console.log('Main Volume: ' + main_vol);
            return;
        }
    }
    if (data.indexOf('Z2') == 0) {
        var aux_vol = getVolume(data);
        if (aux_vol !== false) {
            myEmitter.emit('volume', aux_vol, 'aux');
            state.aux.mainLevel = aux_vol;
            console.log('Aux Volume: ' + aux_vol);
            return;
        }
    }
    console.log('\t\t\t\tUnknown data: ' + data);
});

function getVolume(data) {
    var vol = data.substr(2);
    if (/^[0-9]{3}$/.test(vol)) {
        vol = vol.substring(0, 2);
        vol = parseFloat(vol);
        vol += 0.5;
        return vol;
    } else if (/^[0-9]{2}$/.test(vol)) {
        return parseFloat(vol);
    }
    return false;
}

var marantzHost = '192.168.1.52' // process.env.MARANTZ_HOST || 'marantz';

//TODO: add automatic reconnect logic
connection.connect({ host: marantzHost, shellPrompt: '' });

setTimeout(function () { connection.send('SI?\r'); }, 1000);
setTimeout(function () { connection.send('ZM?\r'); }, 2000);
setTimeout(function () { connection.send('MV?\r'); }, 3000);
setTimeout(function () { connection.send('MU?\r'); }, 4000);
setTimeout(function () { connection.send('Z2?\r'); }, 5000);
setTimeout(function () { connection.send('Z2MU?\r'); }, 6000);

module.exports.getState = function () {
    return state;
};

module.exports.setPower = function (device, isOn) {
    switch (device) {
        case 'main':
            if (isOn) {
                connection.send('ZMON\r'); //might be PWON
            } else {
                connection.send('ZMOFF\r'); //might be PWSTANDBY
            }
            return true;
        case 'aux':
            if (isOn) {
                connection.send('Z2ON\r');
            } else {
                connection.send('Z2OFF\r');
            }
            return true;
    }
    return false;
};

module.exports.setMute = function (device, isOn) {
    switch (device) {
        case 'main':
            if (isOn) {
                connection.send('MUON\r');
            } else {
                connection.send('MUOFF\r');
            }
            return true;
        case 'aux':
            if (isOn) {
                connection.send('Z2MUON\r');
            } else {
                connection.send('Z2MUOFF\r');
            }
            return true;
    }
    return false;
};

module.exports.volumeUp = function (device) {
    switch (device) {
        case 'main':
            connection.send('MVUP\r');
            return true;
        case 'aux':
            connection.send('Z2UP\r');
            return true;
    }
    return false;
};

module.exports.volumeDown = function (device) {
    switch (device) {
        case 'main':
            connection.send('MVDOWN\r');
            return true;
        case 'aux':
            connection.send('Z2DOWN\r');
            return true;
    }
    return false;
};

module.exports.setVolume = function (device, volume) {
    if (volume < 10) {
        volume = '0' + volume;
    }
    switch (device) {
        case 'main':
            connection.send('MV' + volume + '\r');
            return true;
        case 'aux':
            connection.send('Z2' + volume + '\r');
            return true;
    }
    return false;
};

module.exports.setSource = function (device, source) {
    var prefix = (device == 'main' ? 'SI' : 'Z2');
    switch (source) {
        case 'PS4':
            connection.send(prefix + 'SAT/CBL\r');
            break;
        case 'Apple TV':
            connection.send(prefix + 'GAME\r');
            break;
        case 'Switch':
            connection.send(prefix + 'BD\r');
            break;
        default:
            return false;
    }
    return true;
};

module.exports.on = function (key, callback) {
    myEmitter.on(key, callback);
};
