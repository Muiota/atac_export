
class AtacExport {
    constructor(options) {
        
        this.currentPort = undefined;
        this.iteration = 0;
        this.lastIteration = 0;
        this.buffer = [];
        this.result = [];
        this.timeoutTimer = undefined;
        this.currentExportCrc = 0;
        this.status = {
            isExportMode: false,
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
		
		
		navigator.serial.addEventListener("disconnect", (event) => {
			console.log(event);
    // TODO: Remove |event.target| from the UI.
    // If the serial port was opened, a stream error would be observed as well.
});

navigator.serial.addEventListener("connect", (event) => {
		console.log(event);
		// this.startListenerCore(event.target);
    // TODO: Remove |event.target| from the UI.
    // If the serial port was opened, a stream error would be observed as well.
});
    }

    async readBatch(bath) {
        console.log(bath);
    
        for (var i = 0; i < bath.length; i++) {
            this.buffer.push(bath[i]);
        }


        if (this.status.isExportMode) {
            this.updateTimeoutTimer();
            if (this.buffer.length == 2) {
              
                var check = this.buffer[0] + (this.buffer[1] << 8);
                            
                var result = this.currentExportCrc ^ check;
                console.log("import check ");
                console.log(this.buffer);
                console.log("Crc ");
                console.log(result);
                if (result == 17) {
                    this.status.error = "";
                    if (this.iteration < 1296) {

                        const request = new Uint8Array(34);

                        for (var k = 0; k < 32; k++) {
                            request[k] = this.result[this.iteration * 32 + k];
                        }
                        this.status.progress = Math.floor(this.iteration * 0.0771604938271605);

                        for (var k = 0; k < 32; k += 2) {
                            var data = request[k] + (request[k + 1] << 8);
                            crc = crc ^ data;
                        }
                        request[32] = crc & 255;
                        request[33] = (crc >> 8) & 255;
                        this.currentExportCrc = crc;
                        const writer = this.currentPort.writable.getWriter();
                        await writer.write(request);
                        writer.releaseLock();

                    } else {
                        this.status.isExportMode = false;
                    }

                } else {
                    this.status.error = "Invalid confirm response";
                    this.status.isExportMode = false;                   
                }

                this.iteration++;

               
               
                this.buffer = [];
                this.updateStatus();
            }

        }
        else {

            if (this.buffer.length == 34) {
                var crc = 0;
                this.iteration++;

                this.status.progress = Math.floor(this.iteration * 0.0771604938271605);

                for (var k = 0; k < 32; k += 2) {
                    var data = this.buffer[k] + (this.buffer[k + 1] << 8);
                    crc = crc ^ data;
                }


                if (this.buffer[32] == ((crc >> 8) & 255) &&
                    (this.buffer[33] == (crc & 255))) {
                    this.status.error = "";
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


    }

    startExport() {        
        if (this.status.isConnected && this.status.isCorrect) {

            this.startExportAsync().then((result) => { });
        }
    }

    updateTimeoutTimer() {

        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = undefined;
        }
        if (this.status.isExportMode) {
            this.lastIteration = this.iteration;
            var that = this;
            this.timeoutTimer = setTimeout(function () {
                if (that.lastIteration == that.iteration) {
                    that.status.error = "Export timeout";
                    that.status.isExportMode = false;
                    that.updateStatus();
                }
            }, 5000);
        }
    }


    async startExportAsync() {

        if (this.status.isConnected && this.status.isCorrect) {

        

            const request = new Uint8Array(34);
            request[0] = 255;
            request[1] = 255;
            request[2] = 255;
            request[3] = 255;
            request[4] = 17;
            request[5] = 0;
            var crc = 0;
            for (var k = 0; k < 32; k += 2) {
                var data = request[k] + (request[k + 1] << 8);
                crc = crc ^ data;
            }
            request[32] = crc & 255;
            request[33] = (crc >> 8) & 255;
            this.status.isExportMode = true;
            this.status.progress = 0;
            this.currentExportCrc = crc;
            this.iteration = 0;
            
            const writer = this.currentPort.writable.getWriter();
            await writer.write(request);
			
			//await writer.write(request);
			
            writer.releaseLock();
            this.updateTimeoutTimer();
            this.updateStatus();


        }


    }

	async closePortAsync(port) {		
		if (port.readable || port.writable ) {			  
			await port.close();			  
		}
	}

    async startListenAsync() {
        this.status.isExportMode = false;
        this.status.isConnected = false;
        this.status.error = undefined;
        this.iteration = 0;
        this.buffer = [];
        //this.status.isCorrect = false;
        this.updateStatus();
        this.currentPort = undefined;

        var port = await navigator.serial.requestPort({});
		await this.closePortAsync(port); 
        var instance = await port.open({ baudRate: 115200 });
		
		
		await this.startListenerCore(port);
		

        
    }


  async startDisconnectAsync() {
	  if (this.currentPort) {
	   this.status.isConnected = false;
        this.status.error = undefined;
		
		       
			   if (this.reader && this.currentPort.readable && this.currentPort.readable.locked) {
				   //const reader = this.currentPort.readable.getReader();
					this.reader.releaseLock();
					//this.currentPort.readable.cancel();
			   }

      
	   if (this.currentPort.writable && this.currentPort.writable.locked) {
		   //const writer = this.currentPort.writable.getWriter();
			this.currentPort.writable.cancel();
	   }

		
       await this.closePortAsync(this.currentPort); 	     
	  }
    }

	async startListenerCore(port) {
		
		this.status.isConnected = true;
        this.updateStatus();
        this.currentPort = port;

        while (this.currentPort && this.currentPort.readable) {
            this.reader = this.currentPort.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await this.reader.read();
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
				this.currentPort.close();
            } finally {
                this.reader.releaseLock();
            }
        }
		
	}


    startConnect() {
        this.status.isConnected = false;
        if (this.status.isAllowed) {

            this.startListenAsync().then((result) => { });
        }
    }


	saveToFile() {
		var a = document.createElement("a");
		document.body.appendChild(a);
		a.style = "display: none";
		var blob = new Blob([this.result]);
		var url = window.URL.createObjectURL(blob);
		a.href = url;
		a.download = this.status.header.trim() + ".atac";
		a.click();
		window.URL.revokeObjectURL(url);
	}

	
	loadFromFile(e) {
		var file = e.files[0];
		if (!file) {
			return;
		}
		var reader = new FileReader();
		var that = this;
		reader.onload = function(e) {
			var contents = e.target.result;
			if (contents) {
					var arr = contents.split(",");
					if (arr.length == 41472) {
						that.result = arr;
						that.status.isCorrect = true;
						that.status.header = file.name.split(".atac")[0];
					}
				
			}
			that.updateStatus();
			};
		reader.readAsText(file);
	}


   startDisconnect() {
        this.status.isConnected = false;
        if (this.status.isAllowed) {

            this.startDisconnectAsync().then((result) => { });
        }
    }

    

    checkCrcPart(start, size) {
        var crc = 0;
        for (var k = start; k < start + size; k += 2) {
            var data = this.result[k] + (this.result[k + 1] << 8);
            crc = crc ^ data;
        }
        return crc;
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
		var btnDisconnectElement = document.getElementById("btn_disconnect");
        var btnExportElement = document.getElementById("btn_export");
		
		var btnSaveElement = document.getElementById("btn_save")
		var btnLoadElement = document.getElementById("btn_load")
		
        var progressElement = document.getElementById("progress_status");
        var titleElement = document.getElementById("div_title");

        //console.log(status);
        btnConnectElement.disabled = !status.isAllowed || status.isConnected;
		btnDisconnectElement.disabled = ! btnConnectElement.disabled ;

        btnConnectElement.hidden = btnConnectElement.disabled;
		btnDisconnectElement.hidden = btnDisconnectElement.disabled;


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

        btnExportElement.disabled = !status.isConnected || !status.isCorrect || status.isExportMode;
		btnSaveElement.disabled = btnExportElement.disabled;
		btnLoadElement.disabled = !status.isConnected;
        if (status.isExportMode) {
            progressElement.classList.add("bg-danger");
        } else {
            progressElement.classList.remove("bg-danger");
        }
        

        
       
    }
}
var atacExport = new AtacExport(options);