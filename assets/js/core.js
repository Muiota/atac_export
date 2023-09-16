var statusElement = document.getElementById("status");

if ("serial" in navigator) {
    statusElement.innerHTML = "USB connect allowed";

}


async function readBatch(bath, context) {
    //context.reader.read().then((response) => {
    console.log(bath);
        //var bath = response.value;

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

                if (context.buffer[0] == 255 &&
                    context.buffer[1] == 255 &&
                    context.buffer[2] == 255 &&
                    context.buffer[3] == 255 &&
                    context.buffer[4] == 17) {
                    //console.log("header");
                    var header = "";
                    for (var i = 6; i < 6+ 12; i++) {
                        header += String.fromCharCode(context.buffer[i]);
                    }



                    console.log("title '" + header+ "'");
                    context.iteration = 0;
                }

                console.log("ok " + context.iteration);
                const response = new Uint8Array(2);
                var result = crc ^ 17;
                response[0] = result & 255;
                response[1] = (result >> 8) & 255;
                

                const writer = context.port.writable.getWriter();
                await writer.write(response);
                writer.releaseLock();

            }
            context.buffer = [];

        }
      //  readBatch(context);
    
}





    async function startExportAsync() {


        var port = await navigator.serial.requestPort();
        var instance = await port.open({ baudRate: 115200 });
        var context = {};
        context.iteration = 0;
        context.buffer = [];
        context.port = port;

        while (port.readable) {
            const reader = port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        // |reader| has been canceled.
                        break;
                    }
                    if (value) {
                        await readBatch(value, context);
                    }

                    
                }
            } catch (error) {
                console.error(error);
            } finally {
                reader.releaseLock();
            }
        }


        readBatch(context);


    }




function startExport() {

    startExportAsync().then((result) => {});

    return;
    navigator.serial.requestPort().then(
        (port) => {

            try {

                port.close();
            } catch (e) { }


            port.open({ baudRate: 115200 }).then((instance) => {
                var context = {};
                context.reader = port.readable.getReader();
                context.writer = port.writable.getWriter();
                context.iteration = 0;
                context.buffer = [];
                readBatch(context);


            });

        });

//document.getElementById("export").onclick =

    //console.log(ports);


    // statusElement.innerHTML = port;

}