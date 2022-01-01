const directions = {
    'pressEast': 0,
    'pressWest': 1,
    'pressSouth': 2,
    'pressNorth': 3,
    'releaseEast': 4,
    'releaseWest': 5,
    'releaseSouth': 6,
    'releaseNorth': 7
}
const actions = {
    'noteOff': 0,
    'noteOn': 1,
    'keyAftertouch': 2,
    'controlChange': 3,
    'programChange': 4,
    'channelAftertouch': 5,
    'pitchBend': 6,
    'nothing': 7
}
const actionFields = {
    'noteOff': ['note','octave','velocity'],
    'noteOn': ['note','octave','velocity'],
    'keyAftertouch': ['note','octave','pressure'],
    'controlChange': ['control-function','value'],
    'programChange': ['value'],
    'channelAftertouch': ['pressure'],
    'pitchBend': ['range','semitones'],
    'nothing': []
}
var inputs;
var outputs;
var deviceId;


function onMIDISuccess(midiAccess) {
    inputs = midiAccess.inputs;
    outputs = midiAccess.outputs;
    midiAccess.onstatechange = onMIDIStateChange;
    onMIDIStateChange();
}

function onMIDIStateChange(e) {
    if (e != undefined) {
        inputs = e.target.inputs;
        outputs = e.target.outputs;
    }
    document.getElementById("connected-state").firstChild.className = 'led-red';
    for (output of outputs.values()) {
        if (output.name.substr(0, 17).toLowerCase() == "minimidi joystick") {
            deviceId = output.id;
            document.getElementById("connected-state").firstChild.className = 'led-green';
            output.open().then(onPortOpen, onPortClosed);
        }
    }
}

function onPortOpen(device) {
    console.log('opened!');
}

function onPortClosed(device) {
    console.log('failed!');
}

function onProgramActionSelect(e) {
    let action = this.options[this.selectedIndex].value;
    displayActionFields('program', action);
}

function onRealtimeActionSelect(e) {
    let action = this.options[this.selectedIndex].value;
    displayActionFields('realtime', action);
}

function displayActionFields(screen, action) {
    let allFields = ['note','octave','velocity','pressure','control-function','value','range','semitones'];
    let fields = actionFields[action];
    for (const field of allFields) {
        let el = document.getElementById(screen+'-'+field+'-label');
        if (fields.includes(field)) {
            el.style.display = 'inline-block';
        } else {
            el.style.display = 'none';
        }
    }
}

function onProgramSend(e) {
    let presetSelect = document.getElementById('program-preset');
    let preset = parseInt(presetSelect.options[presetSelect.selectedIndex].value);
    let directionSelect = document.getElementById('program-direction');
    let direction = parseInt(directions[directionSelect.options[directionSelect.selectedIndex].value]);
    let channelSelect = document.getElementById('program-channel');
    let channel = parseInt(channelSelect.options[channelSelect.selectedIndex].value);
    let actionSelect = document.getElementById('program-action');
    let action = actionSelect.options[actionSelect.selectedIndex].value;
    programAction(preset, direction, channel, action);
}

function onRealtimeSend(e) {
    let directionSelect = document.getElementById('realtime-direction');
    let direction = parseInt(directions[directionSelect.options[directionSelect.selectedIndex].value]);
    let channelSelect = document.getElementById('realtime-channel');
    let channel = parseInt(channelSelect.options[channelSelect.selectedIndex].value);
    let actionSelect = document.getElementById('realtime-action');
    let action = actionSelect.options[actionSelect.selectedIndex].value;
    realtimeAction(direction, channel, action);
}

function navSelect(screen) {
    document.getElementById('screens').style.marginLeft = (-100 * screen) + '%';
    for(let i = 0; i < 3; i++) {
        let el = document.getElementById('nav-'+i);
        if (i == screen) {
            el.style.backgroundColor = "royalblue";
        } else {
            el.style.backgroundColor = "transparent";
        }
    }
}

function selectPreset(preset) {
    for(let i = 0; i < 16; i++) {
        let el = document.getElementById('preset-'+i);
        if (i == preset) {
            el.style.backgroundColor = "lime";
            sendMIDIMessage([192, preset]);
            setTimeout('document.getElementById("preset-'+i+'").style.backgroundColor = "green"', 100);
        } else {
            el.style.backgroundColor = "transparent";
        }
    }
}

function onMIDIFailure() {
    document.querySelector('#splash').innerHTML = 'Error: Could not access MIDI devices. Connect a device and refresh to try again.';
}

function sendMIDIMessage(sequence) {
    var output = outputs.get(deviceId);
    if (output != undefined) {
        let outputSequence = '['
        let first = true;
        for (const byte of sequence) {
            if (first) {
                first = false;
            } else {
                outputSequence += ', ';
            }
            if (byte < 16) {
                outputSequence += '0x0';
            } else {
                outputSequence += '0x';
            }
            outputSequence += byte.toString(16).toUpperCase();
        }
        outputSequence += ']'
        console.log(outputSequence + ' [' + sequence + ']');
        output.send(sequence);
    }
}

function programAction(preset, direction, channel, action) {
    let allFields = ['note','octave','velocity','pressure','control-function','value','range','semitones'];
    let fields = actionFields[action];
    let values = {};
    for (const field of allFields) {
        if (fields.includes(field)) {
            let el = document.getElementById('program-'+field);
            values[field] = parseInt(el.value);
        }
    }
    console.log(values);
    sendMIDIMessage([176, 44, preset]);
    sendMIDIMessage([176, 40, (preset * 8) + direction]);
    sendMIDIMessage([176, 41, (actions[action] * 16) + channel]);
    switch (action) {
        case 'noteOff':
        case 'noteOn':
            let note = values['note'] + values['octave'] * 12;
            sendMIDIMessage([176, 42, note]);
            sendMIDIMessage([176, 43, values['velocity']]);
            break;
        case 'keyAftertouch':
            let note2 = values['note'] + values['octave'] * 12;
            sendMIDIMessage([176, 42, note2]);
            sendMIDIMessage([176, 43, values['pressure']]);
            break;
        case 'controlChange':
            sendMIDIMessage([176, 42, values['control-function']]);
            sendMIDIMessage([176, 43, values['value']]);
            break;
        case 'programChange':
            sendMIDIMessage([176, 42, values['value']]);
            break;
        case 'channelAftertouch':
            sendMIDIMessage([176, 42, values['pressure']]);
            break;
        case 'pitchBend':
            let bendVal = Math.round((8191.5 / values['range']) * values['semitones'] + 8191.5);
            let msb = Math.trunc(bendVal / 128);
            let lsb = bendVal - (msb * 128);
            sendMIDIMessage([176, 42, lsb]);
            sendMIDIMessage([176, 43, msb]);
            break;
    }
    sendMIDIMessage([176, 45, preset]);
}

function realtimeAction(direction, channel, action) {
    let allFields = ['note','octave','velocity','pressure','control-function','value','range','semitones'];
    let fields = actionFields[action];
    let values = {};
    for (const field of allFields) {
        if (fields.includes(field)) {
            let el = document.getElementById('realtime-'+field);
            values[field] = parseInt(el.value);
        }
    }
    console.log(values);
    sendMIDIMessage([176, 16 + direction, (actions[action] * 16) + channel]);
    switch (action) {
        case 'noteOff':
        case 'noteOn':
            let note = values['note'] + values['octave'] * 12;
            sendMIDIMessage([176, 24 + direction, note]);
            sendMIDIMessage([176, 32 + direction, values['velocity']]);
            break;
        case 'keyAftertouch':
            let note2 = values['note'] + values['octave'] * 12;
            sendMIDIMessage([176, 24 + direction, note2]);
            sendMIDIMessage([176, 32 + direction, values['pressure']]);
            break;
        case 'controlChange':
            sendMIDIMessage([176, 24 + direction, values['control-function']]);
            sendMIDIMessage([176, 32 + direction, values['value']]);
            break;
        case 'programChange':
            sendMIDIMessage([176, 24 + direction, values['value']]);
            break;
        case 'channelAftertouch':
            sendMIDIMessage([176, 24 + direction, values['pressure']]);
            break;
        case 'pitchBend':
            let bendVal = Math.round((8191.5 / values['range']) * values['semitones'] + 8191.5);
            let msb = Math.trunc(bendVal / 128);
            let lsb = bendVal - (msb * 128);
            sendMIDIMessage([176, 24 + direction, lsb]);
            sendMIDIMessage([176, 32 + direction, msb]);
            break;
    }
}

window.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM fully loaded and parsed');
    if (navigator.requestMIDIAccess) {
        console.log('This browser supports WebMIDI!');
        navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
        console.log('WebMIDI is not supported in this browser.');
        document.querySelector('nav').innerHTML = '';
        document.querySelector('#programs').innerHTML = 'Error: No WebMIDI support.';
    }

    el = document.getElementById("program-action");
    el.addEventListener("click", onProgramActionSelect, false);

    el = document.getElementById("program-send");
    el.addEventListener("click", onProgramSend, false);

    el = document.getElementById("realtime-action");
    el.addEventListener("click", onRealtimeActionSelect, false);

    el = document.getElementById("realtime-send");
    el.addEventListener("click", onRealtimeSend, false);

    el = document.getElementById('nav-0');
    el.style.backgroundColor = "royalblue";
});
