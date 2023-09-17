
const COMPOSITION_PRESET_QNT = 4;


const STORE_MAP_INSTRUMENT_TIMELINE_SIZE = 512;
const STORE_MAP_PRESET_SIZE = 1024;
const STORE_MAP_SONG_LIST_HEADER = 8192;
const STORE_MAP_SONG_COUNT = 100;

const SONG_PRESET_SIZE = 49152;

const COMPOSITION_INSTRUMENT_QNT = 4;

const COMPOSITION_TOTAL_PATTERN_LEN = 256;

const GuitarPresetItem = 642;
const CompositionPatternItem = 258;
const DrumPatternsSetting = 12276;
const BassPatternsSetting = 4896;
const SynthPatternsSetting = 15048;
const AutomationPatternsSetting = 2592;
const LfoSettings = 36;
const CompositionGlobalSettings = 98;
const COMPLEX_LFO_QNT = 3;

class AtacExport {
    constructor(options) {
        
        this.currentPort = undefined;
        this.iteration = 0;
        this.buffer = [];
        this.result = [];
        this.globalCrc = 0;
        this.status = {
            isConnected: false,
            isAllowed: false,
            progress: 0,
            isCorrect: false,
            header: ""
        }
        if (options) {
            if (options.statusCallback) {
                this.statusCallback = options.statusCallback;
            }
        }

        this.updateStatus();
    }

    async readBatch(bath) {
        console.log(bath);
    
        for (var i = 0; i < bath.length; i++) {
            this.buffer.push(bath[i]);
        }


        if (this.buffer.length == 34) {
            var crc = 0;
            this.iteration++;

            this.status.progress = Math.floor( this.iteration* 0.0771604938271605);

            for (var k = 0; k < 32; k += 2) {
                var data = this.buffer[k] + (this.buffer[k + 1] << 8);
                crc = crc ^ data;
            }


            if (this.buffer[32] == ((crc >> 8) & 255) &&
                (this.buffer[33] == (crc & 255))) {

                if (this.buffer[0] == 255 &&
                    this.buffer[1] == 255 &&
                    this.buffer[2] == 255 &&
                    this.buffer[3] == 255 &&
                    this.buffer[4] == 17 &&
                    this.buffer[5] == 0) {
                    //console.log("header");
                    var header = "";
                    for (var i = 6; i < 6 + 12; i++) {
                        header += String.fromCharCode(this.buffer[i]);
                    }

                    this.status.header = header;
                    this.status.isCorrect = false;
                    this.result = [];
                    console.log("title '" + header + "'");
                    this.iteration = 0;
                }
                else {
                    for (var i = 0; i < 32; i++) {
                        this.result.push(this.buffer[i]);
                    }

                        
                }
                console.log("ok " + this.iteration);
                const response = new Uint8Array(2);
                var result = crc ^ 17;
                response[0] = result & 255;
                response[1] = (result >> 8) & 255;


                const writer = this.currentPort.writable.getWriter();
                await writer.write(response);
                writer.releaseLock();

                if (this.iteration == 1296 && this.result.length == 41472) {
                    this.status.isCorrect = true;
                 //   this.checkCrc();
                }

            }
            this.buffer = [];
            this.updateStatus();
        }



    }
    async startExportAsync() {
        this.status.isConnected = false;
        this.status.error = undefined;
        this.iteration = 0;
        this.buffer = [];
        this.status.isCorrect = false;
        this.updateStatus();
        this.currentPort = undefined;

        var port = await navigator.serial.requestPort();
        var instance = await port.open({ baudRate: 115200 });
        this.status.isConnected = true;
        this.updateStatus();
        this.currentPort = port;

        while (this.currentPort && this.currentPort.readable) {
            const reader = this.currentPort.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        // |reader| has been canceled.
                        break;
                    }
                    if (value) {
                        await this.readBatch(value);
                    }


                }
            } catch (error) {
                console.error(error);
                this.status.error = error;
                this.status.isConnected = false;
                this.updateStatus();
            } finally {
                reader.releaseLock();
            }
        }
    }




    startConnect() {
        this.status.isConnected = false;
        if (this.status.isAllowed) {

            this.startExportAsync().then((result) => { });
        }
    }

    checkCrc() {
        this.globalCrc = 0;

        this.checkCrcPart(0, this.result.length);
        this.status.isCorrect = this.globalCrc == 0;
        return;

        var seek = 0;
        for (var item = 0; item < COMPOSITION_PRESET_QNT; item++)
        {
            this.checkCrcPart(seek + item * STORE_MAP_PRESET_SIZE, GuitarPresetItem);
        }
        seek += STORE_MAP_PRESET_SIZE * COMPOSITION_PRESET_QNT;


        for (var item = 0; item < COMPOSITION_INSTRUMENT_QNT; item++)
        {         
            this.checkCrcPart(seek + item * STORE_MAP_INSTRUMENT_TIMELINE_SIZE, CompositionPatternItem);         
        }
        seek += STORE_MAP_INSTRUMENT_TIMELINE_SIZE * COMPOSITION_INSTRUMENT_QNT;


        this.checkCrcPart(seek, DrumPatternsSetting);

        seek += DrumPatternsSetting;
        this.checkCrcPart(seek, BassPatternsSetting);
        seek += BassPatternsSetting;

        this.checkCrcPart(seek, SynthPatternsSetting);
        seek += SynthPatternsSetting;
        this.checkCrcPart(seek, AutomationPatternsSetting);
        seek += AutomationPatternsSetting;

        for (var item = 0; item < COMPLEX_LFO_QNT; item++)
        {           
            this.checkCrcPart(seek + item * LfoSettings, LfoSettings);
        }
        seek += COMPLEX_LFO_QNT * LfoSettings;
        this.checkCrcPart(seek, CompositionGlobalSettings);

        this.status.isCorrect = this.globalCrc == 0;
    }

    checkCrcPart(start, size) {
        for (var k = start; k < start + size; k += 2) {
            var data = this.result[k] + (this.result[k + 1] << 8);
            this.globalCrc = this.globalCrc ^ data;
        }
    }

    updateStatus() {


        this.status.isAllowed = "serial" in navigator;

        

       
        if (this.statusCallback) {
            
            this.statusCallback(this.status);
        }       
    }

}


var options = {
    statusCallback: function (status) {

        var statusElement = document.getElementById("div_status");
        var errorElement = document.getElementById("div_error");
        var btnConnectElement = document.getElementById("btn_connect");
        var btnExportElement = document.getElementById("btn_export");
        var progressElement = document.getElementById("progress_status");
        var titleElement = document.getElementById("div_title");
        
        console.log(status);
        btnConnectElement.disabled = !status.isAllowed || status.isConnected;


        var text = "";

        if (status.isAllowed) {
            text = "USB connect allowed";
        } else {
            text = "USB connect not allowed";
        }

        errorElement.innerHTML = status.error ? status.error : "";
        statusElement.innerHTML = text + " (" + (status.isConnected ? "connected" : "disconnected") + ")";

        titleElement.innerHTML = status.isCorrect ? status.header : "";

        progressElement.style.width = status.progress + '%';

        btnExportElement.disabled = !status.isConnected || !status.isCorrect;
        
       
    }
}
var atacExport = new AtacExport(options);