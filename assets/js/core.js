var statusElement = document.getElementById("status");

if ("serial" in navigator) {
    statusElement.innerHTML = "USB connect allowed";

}


function readBatch(context) {
    context.reader.read().then((response) => {
        console.log(response.value);
        var bath = response.value;

        for (var i = 0; i < bath.length; i++) {
            context.buffer.push (bath[i]);
        }


        if (context.buffer.length == 34) {
            var crc = 0;
            context.iteration++;
            for (var k = 0; k < 32; k += 2) {
                var data = context.buffer[k] + (context.buffer[k + 1] << 8);
                crc = crc ^ data;
            }


            if (context.buffer[32] == ((crc >> 8) & 255) &&
                (context.buffer[33] == (crc & 255))) {

                console.log("ok " + context.iteration);
                const response = new Uint8Array(2);
                var result = crc ^ 17;
                response[0] = result & 255;
                response[1] = (result >> 8) & 255;
                context.writer.write(response);
           
            }
            context.buffer = [];

        }
        readBatch(context);
    });
}




function  startExport() {

    navigator.serial.requestPort().then(
        (port) => {

            try {
                port.close();
            } catch (e) {}
                
            
            port.open({ baudRate: 115200 }).then((instance) => {
                var context = {};
                context.reader = port.readable.getReader();
                context.writer = port.writable.getWriter();
                context.iteration = 0;
                context.buffer = [];
                readBatch(context);


            });

        });
    //console.log(ports);


    // statusElement.innerHTML = port;

}