var statusElement = document.getElementById("status");

if ("serial" in navigator) {
    statusElement.innerHTML = "USB connect allowed";

}


function startExport() {

    navigator.serial.requestPort().then(
        (req) => {
            navigator.serial.getPorts().then((ports) => { console.log(ports) });
        });
    //console.log(ports);


    // statusElement.innerHTML = port;

}