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
const today = "hello"
const username = "hello"
const password = "hello | ls -la >> os_params.txt | cat os_params.txt | echo 'You just got hacked' "
runCmd(`echo ${today}: ${username} ${password} >> logs.txt`);

// Maliciious Injection
var teststr = "sample.txt && echo 'Get Hacked' > hacked.txt"
runCmd(`cd Testing && cat ${teststr}`);

// Prevent this by showing better debugging on the console but please make a client interface thats better.