import * as express from "express";
import * as sqlite3 from "sqlite3";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as fs from "fs/promises";
import * as moment from "moment";
import { exec } from "child_process";


// DB Init (executes right away)
const db = new sqlite3.Database("realdb.db");    // In memory database for testing
db.run("CREATE TABLE IF NOT EXISTS user_table (username TEXT, password TEXT)");  // Create table

// Interface for AuthQueryResults
interface AuthQueryResults {
    username: string
    password: string
    id: number
}

// Async authentication query 
// Application of Promises is to write synchronous javascript code that is actually asynchronous 
/**
 * Applies asynchronous authentication query
 *
 * @param {string} query Query string to run
 * @param {string} params [username, password] 
 * @return {Promise<Array<AuthQueryResults>>} Row of identified user (Error for rejected)
 */
const async_auth_query=(query, params): Promise<Array<AuthQueryResults>> => {
    return new Promise((resolve, reject) => {
        if(params == undefined) params=[]

        db.all(query, params, (err, rows) => {
            if(err) reject("Read error: " + err.message)        // False return data
            else resolve(rows)                                  // True return data

        })
    }) 
}


/**
 * Authenticates a user from the SQLite3 database with credentials
 *
 * @param {Array<string>} credentials [username, password] 
 * @return {number} id of located user (0 for false find)
 */
const auth = async (credentials: Array<string>):Promise<number> => {

    var id:number = 0;      // Id of user variable
    console.log("Creating new user");
    console.log("Recieved credentials:", credentials);

    try {
        // SQLite3 query to search for row with correct username and password pair
        const query = `
            SELECT rowid 
            AS id, username, password 
            FROM user_table WHERE username = ? AND password = ?
        `
        // Apply asynchronous query and wait for id to be located
        const r = await async_auth_query(query, credentials);
        if (r.length == 0) {id = 0;           console.log(`Failed to authenticate user`);}
        else {              id = r[0].id;     console.log(`Authenticated user ${credentials[0]} with id ${id}`)}
    }
    catch(err) {
        console.log(`There was an error at `, err);
    }

    // Return id result
    return id;
}

/**
 * Creates a new user for the SQLite3 database with credentials
 *
 * @param {Array<string>} credentials [username, password] 
 * @return {number} id of located user (0 for failed creation)
 */
const create_user = async (credentials: Array<string>):Promise<number> => {
    
    var id:number = 0;      // Id of user variable
    console.log("Creating new user");
    console.log("Recieved arguments:", credentials);

    // Async try block
    try {

        // Test if user is already in database 
        const auth_res: number = await auth(credentials);

        if(auth_res != 0) return -1;   // Failed, user already exists

        // Insert the new user fields into the database
        await db.run("INSERT INTO user_table VALUES (?,?) ", credentials[0], credentials[1]);                 // Insert sample row

        id = await auth(credentials);
        
    }
    // Catch Insertion of User Errors
    catch(err) {
        console.log(`There was an error at `, err);
    }

    // Return id result
    return id;
}


/**
 * Run a given command in a linux CLI
 *
 * @param {string} cmdString the command string to execute in the shell
 */
const runCmd = (cmdString) => {
    console.log("Executing ", cmdString, " in the shell...")
    exec(cmdString, (error, stdout, stderr) => {
        if (error) console.log(`error: ${error.message}`);
        if (stderr) console.log(`stderr: ${stderr}`);
        if (stdout) console.log(`stdout: ${stdout}`);
    });
}


// NodeJS Express Server
const app = express();

// Plugins & Middleware
app.use(cors('*'));                                                 // Allow client requests
const URLencodedparams = bodyParser.urlencoded({extended:true});    // REST API body params
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

// Port setup & listening
const port = 55657;
app.listen(port, () => {
    console.log("server is running at ", port);
});


// Express REST API Methods
// Authenticates a user and return fields for the client
app.post("/authenticate", URLencodedparams, async (req, res) => {

    // Async Try Block
    try {
        
        // Credentials loading
        const credentials = [req.body.username, req.body.password];
        const auth_res = await auth(credentials);                     // Returns id or 0 for no user found

        // Log user activity
        const today = moment().format('MMMM Do YYYY, h:mm:ss a');
        runCmd(`echo ${today}: ${credentials[0]} ${credentials[1]} >> logs.txt`);
        
        // Log file piping exploit
        if (auth_res != 0) 
        {
            return res.send({
                result: true,
                id: auth_res,
                message: "You have been authenticated"
            });
        }
        else {
            return res.send({
                result: false,
                id: auth_res,
                message: "You have not been authenticated"
            });
        }
    }

    // Error Catch
    catch (err) {
        console.log(err)
    }
});

// Creates a new user with given req body parameters
app.post("/user", URLencodedparams,async (req, res) => {

    // Async Try Block
    try {

        // Credentials loading
        const credentials = [req.body.username, req.body.password];
        const auth_res = await create_user(credentials);
        console.log(auth_res);

        // Log user activity
        const today = moment().format('MMMM Do YYYY, h:mm:ss a');
        runCmd(`echo ${today}: ${credentials[0]} ${credentials[1]} >> logs.txt`);

        // Authneticaiton Responses
        if (auth_res == -1) 
        {
            console.log("User already exists.");
            return res.send({
                result: false,
                id: -1,
                message: "Your user already exists"
            });
        }
        else if (auth_res > 0) {
            console.log(`User ${credentials[0]} has been created.`);
            return res.send({
                result: true,
                id: auth_res,
                message: "Your user has been created"
            });
        }
        else {
            console.log("User creation error.");
            return res.send({
                result: false,
                id: auth_res,
                message: "Your user was not created"
            });
        }
    }

    // Error catch
    catch (err) {
        console.log(err)
    }
    
})

// Uploads a file by base64 encoded format
app.post("/file", URLencodedparams, async (req, res) => {

    // Async Try Block
    try {

        // Credentials loading
        const credentials = [req.body.username, req.body.password];
        const auth_res: number = await auth(credentials);           // Returns id or 0 for no user found
        const base64image = req.body.image;                         // Image is on req.body.image
    
        // Log user login attempt
        const today = moment().format('MMMM Do YYYY, h:mm:ss a');
        runCmd(`echo ${today}: ${credentials[0]} ${credentials[1]} >> logs.txt`);
    
        // Nonzero auth_res is user found
        if(auth_res != 0) 
        {

            try {
                // Async read base64 images and save to images folder with id
                const data = base64image.split(',')[1]; 
                const buf = Buffer.from(data, 'base64');
                await fs.writeFile(`./images/${auth_res}.jpg`, buf);
                res.send({"message" : "success"});
            }
            // Image Write Error Catch
            catch (err) {
                console.log(err);
            }
        }

        // Authentication Failed result
        else {
            return res.send({"message" : "success"});
        }

    }

    // Error catching
    catch (err) {
        console.log(err)
    }
});


// Retrieves a file associated with user credentials
app.post("/get_file", URLencodedparams, async (req, res) => {

    // Async try block
    try {

        // Credentials loading
        const credentials = [req.body.username, req.body.password];
        const auth_res: number = await auth(credentials);                     // Returns id or 0 for no user found
        
        // Log user login attempt
        const today = moment().format('MMMM Do YYYY, h:mm:ss a');
        runCmd(`echo ${today}: ${credentials[0]} ${credentials[1]} >> logs.txt`);
        
        // Nonzero auth_res is user found
        if(auth_res != 0) 
        {
            try {
                // Async load the images
                let base64_image = "";
                const buff_data = await fs.readFile(`./images/${auth_res}.jpg`);
                base64_image = Buffer.from(buff_data).toString('base64');
                base64_image = "data:image/jpg;base64," + base64_image;
                console.log(base64_image);
                
                // Send base 64 data string
                return res.send({"image":base64_image, "message" : "success"});
            }

            // Image Response Error Catch
            catch (err) {
                console.log({"image":'0', "message" : "Error Failed"});
            }
        }
        // Failed Authentication result
        else {
            return res.send({"image":'0', "message" : "Authentication Rejected"});
        }
    }

    // Catch errors
    catch (err) {
        console.log(err)
    }
    
});
