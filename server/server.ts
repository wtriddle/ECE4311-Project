import * as express from "express";
import * as sqlite3 from "sqlite3";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as fs from "fs/promises";


// DB Init (executes right away)
const db = new sqlite3.Database(":memory:");    // In memory database for testing
const username = "test_name";                   // Testing username in row         
const password = "test_pass";                   // Testing password in row
db.serialize(() => {
    db.run("CREATE TABLE test_table (username TEXT, password TEXT)");                   // Create table
    db.run("INSERT INTO test_table VALUES (?,?) ", username, password);                 // Insert sample row
    db.run("INSERT INTO test_table VALUES (?,?) ", "test_name2", "test_pass2");         // Second row for testing
    db.each("SELECT rowid AS id, username, password FROM test_table", (err, row) => {   // View test row in console
        console.log(row.id + ": " + row.username + " " + row.password);
    });
});


// Interface for AuthQueryResults
interface AuthQueryResults {
    username: string
    password: string
    id: number
}
// Async authentication query
const async_auth_query=function(query, params): Promise<Array<AuthQueryResults>> {
    return new Promise(function(resolve, reject) {
        if(params == undefined) params=[]

        db.all(query, params, function(err, rows)  {
            if(err) reject("Read error: " + err.message)
            else {
                resolve(rows)
            }
        })
    }) 
}



// Authenticates a user from the SQLite3 database
// Return 0 when false find, return nonzero id when user authenticated
const auth = async (credentials: Array<string>):Promise<number> => {
    var id:number = 0;      // Id of user variable
    try {
        // SQLite3 query to search for row with correct username and password pair
        const query = `
            SELECT rowid 
            AS id, username, password 
            FROM test_table WHERE username = ? AND password = ?
        `
        // Apply asynchronous query and wait for id to be located
        const r = await async_auth_query(query, credentials);
        if (r.length == 0) {id = 0;           console.log(`Failed to authenticate user`);}
        else {              id = r[0].id;     console.log(`Authenticated user ${username} with id ${id}`)}
    }
    catch(err) {
        console.log(`There was an error at `, err);
    }

    // Return id result
    return id;
}

// NodeJS Express Server
const app = express();

// Plugins & Middleware
app.use(cors('*'));                                                 // Allow client requests
const URLencodedparams = bodyParser.urlencoded({extended:true});    // REST API body params
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

// Port setup & listening
const port = 4000;
app.listen(port, () => {
    console.log("server is running at ", port);
});


// Express REST API Methods
// Authenticates a user and return fields for the client
app.post("/authenticate", URLencodedparams, async (req, res) => {

    console.log("Recieved credentials:", req.body);
    const credentials = [req.body.username, req.body.password];
    const auth_res = await auth(credentials);                     // Returns id or 0 for no user found

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
});

// Uploads a file by base64 encoded format
app.post("/file", URLencodedparams, async (req, res) => {

    // Credentials loading
    console.log("Recieved credentials:", req.body);
    const credentials = [req.body.username, req.body.password];
    const auth_res: number = await auth(credentials);           // Returns id or 0 for no user found
    const base64image = req.body.image;                         // Image is on req.body.image

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
        catch (err) {
            console.log(err);
        }
    }
    else {
        return res.send({"message" : "success"});
    }
});


// Retrieves a file associated with user credentials
app.post("/get_file", URLencodedparams, async (req, res) => {

    // Credentials loading
    console.log("Recieved credentials:", req.body);
    const credentials = [req.body.username, req.body.password];
    const auth_res: number = await auth(credentials);                     // Returns id or 0 for no user found

    // Nonzero auth_res is user found
    if(auth_res != 0) 
    {
        try{
            // Async load the images
            let base64_image = "";
            const buff_data = await fs.readFile(`./images/${auth_res}.jpg`);
            base64_image = Buffer.from(buff_data).toString('base64');
            base64_image = "data:image/jpg;base64," + base64_image;
            console.log(base64_image);

            // Send base 64 data string
            return res.send({"image":base64_image, "message" : "success"});
        }
        catch (err) {
            console.log({"image":'0', "message" : "Error Failed"});
        }
    }
    else {
        return res.send({"image":'0', "message" : "Authentication Rejected"});
    }

});
