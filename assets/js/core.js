


class AtacExport {
    constructor(options) {
        this.currentPort = undefined;
        this.iteration = 0;
        this.buffer = [];
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
                    this.buffer[4] == 17) {
                    //console.log("header");
                    var header = "";
                    for (var i = 6; i < 6 + 12; i++) {
                        header += String.fromCharCode(this.buffer[i]);
                    }

                    this.status.header = header;
                    this.status.isCorrect = false;
                    console.log("title '" + header + "'");
                    this.iteration = 0;
                }

                console.log("ok " + this.iteration);
                const response = new Uint8Array(2);
                var result = crc ^ 17;
                response[0] = result & 255;
                response[1] = (result >> 8) & 255;


                const writer = this.currentPort.writable.getWriter();
                await writer.write(response);
                writer.releaseLock();
               

            }
            this.buffer = [];
            this.updateStatus();
        }



    }
    async startExportAsync() {
        this.status.isConnected = false;
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
        var btnConnectElement = document.getElementById("btn_connect");
        var progressElement = document.getElementById("progress_status");
        var titleElement = document.getElementById("div_title");
        
        console.log(status);
        btnConnectElement.disabled = !status.isAllowed;


        var text = "";

        if (status.isAllowed) {
            text = "USB connect allowed";
        } else {
            text = "USB connect not allowed";
        }


        statusElement.innerHTML = text + " (" + (status.isConnected ? "connected" : "disconnected") + ")";

        titleElement.innerHTML = status.isCorrect ? status.header : "";

        progressElement.style.width = status.progress + '%';
        
       
    }
}
var atacExport = new AtacExport(options);