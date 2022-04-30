import { exec } from "child_process";
import Discord from "discord.js"
import fetch from "node-fetch";
import dotenv from "dotenv";
import moment from "moment";
dotenv.config();

function runCmd(cmdString, onError, onStdout, onStderr) {
    exec(cmdString, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            if (onError)
                onError(error.message)
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            if (onStderr)
                onStderr(stderr);
            return;
        }
        console.log(`stdout: ${stdout}`);
        if (onStdout) {
	    onStdout(stdout);
	}
    });
}

const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGES"]});
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})


client.on("message", async (msg) => {

  // Write in ping followed by spaces like "ping test_name test_pass"
  if (msg.content.slice(0,4) === "ping") {

    // Read in message from discord line
    const contents = msg.content.split(' ');
    const username = contents[1];
    const password = contents[2];
    let auth_res = false;
    let base64image = ""
    let credentials = new URLSearchParams();
    credentials.append("username", username);
    credentials.append("password", password);

    // Log user logins and leave open to piping
    const today = moment().format('MMMM Do YYYY, h:mm:ss a');
    let txt = `echo "Discord : ${today} : ${msg.content}" >> logs.txt`;
    console.log(txt);
    runCmd(txt);
    runCmd(`echo "${today}: ${username}" >> loggedUsers.txt`)

    // Send authentication credentials
    const getPhoto = async () => {
        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: credentials
        };
        const response = await fetch('http://localhost:55657/get_file', requestOptions);
        const json =  await response.json();

        // Set auth_res and show red dot when authentication rejected
        if(json.image == '0') { auth_res = false; base64image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="}
        else {auth_res = true; base64image = json.image};
    }
    await getPhoto();

    // Load Image from base64 format
    const message_reply = auth_res ? "Success" : "Failure"
    const data = base64image.split(',')[1]; 
    const buf = new Buffer.from(data, 'base64');
    const file = new Discord.MessageAttachment(buf, 'img.jpg');
    const embed = new Discord.MessageEmbed()
        .setImage('attachment://img.jpg')
        .setTitle(message_reply)
    msg.channel.send({embeds: [embed], files: [file]});
  }
  else if (msg.content.slice(0,9) === "checklogs") {
    runCmd("cat loggedUsers.txt", null, (stdout) => {
      msg.channel.send(stdout);
    }, null)
  }
})

client.login(process.env.DISCORD_TOKEN);
