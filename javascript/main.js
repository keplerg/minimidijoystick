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
    'controllerCode': 3,
    'programChange': 4,
    'channelAftertouch': 5,
    'pitchBend': 6,
    'nothing': 7
}
var inputs;
var outputs;
var deviceId;
var statechange;


function onMIDISuccess(midiAccess) {
    inputs = midiAccess.inputs;
    outputs = midiAccess.outputs;
    statechange = midiAccess.onstatechange;
    for (output of outputs.values()) {
        var opt = document.createElement("option");
        opt.text = output.name;
        opt.value = output.id;
        document.getElementById("output-select").add(opt);
    }
}

function onMIDISelect(e) {
    deviceId = this.options[this.selectedIndex].value;
    var output = outputs.get(deviceId);
    if (output != undefined) {
        output.open().then(onPortOpen, onPortClosed);
    }
}

function onPortOpen(device) {
    console.log('opened!');
}

function onPortClosed(device) {
    console.log('failed!');
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

function selectProgram(program) {
    console.log('selected: '+program);
    for(let i = 0; i < 16; i++) {
        let el = document.getElementById('program-'+i);
        if (i == program) {
            sendMIDIMessage([0xC0, program]);
            el.style.backgroundColor = "green";
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
        console.log(sequence);
        output.send(sequence);
    }
}

function setPitchBend(preset, channel, direction, semitones, range) {
    var bendVal = Math.round((8191.5 / range) * semitones + 8191.5);
    var msb = Math.trunc(bendVal / 128);
    var lsb = bendVal - (msb * 128);
    sendMIDIMessage([0xB0, 0x44, preset]);
    sendMIDIMessage([0xB0, 0x40, (preset * 8) + directions[direction]]);
    sendMIDIMessage([0xB0, 0x41, channel + (actions['pitchBend'] * 8)]);
    sendMIDIMessage([0xB0, 0x43, msb]);
    sendMIDIMessage([0xB0, 0x42, lsb]);
    sendMIDIMessage([0xB0, 0x45, preset]);
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

    let el = document.getElementById("output-select");
    el.addEventListener("click", onMIDISelect, false);

    el = document.getElementById('nav-0');
    el.style.backgroundColor = "royalblue";
});
