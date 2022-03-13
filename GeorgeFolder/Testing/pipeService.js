const { exec } = require("child_process");

function runCmd(cmdString, error, stdout, stderr) {
    exec(cmdString, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

// Simple Example
var teststr = "sample.txt"
runCmd(`cd Testing && cat ${teststr}`);

// Maliciious Injection
var teststr = "sample.txt && echo 'Get Hacked' > hacked.txt"
runCmd(`cd Testing && cat ${teststr}`);

// Prevent this by showing better debugging on the console but please make a client interface thats better.