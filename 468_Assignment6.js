/*
Name: Maddi Clark
KUID: 3162616
Date: 04/06/2026
Description: Creates an HTTP server that allows access to a file server
Input: None
Output: None
Collaborators: None
Other Sources: GeeksForGeeks
*/
const {createReadStream} = require('fs'); //imports file system node
const {stat, readdir} = require('fs').promises;  //imports file system with promises for stat and readdir functions
const mime = require('mime'); //imports mime node
const {rmdir, unlink} = require('fs').promises; //imports file system with promises for rmdir and unlink functions
const {createServer} = require('http'); //imports http node
const {mkdir} = require('fs').promises; //imports file system with promises for mkdir functions
createServer((request, response) => { //pulled from lecture slides
    //beginning of code to bypass CORS
    // Allow all domains
    response.setHeader('Access-Control-Allow-Origin', '*');
    // Allow HTTP methods
    response.setHeader('Access-Control-Allow-Methods', '*');
    // Allow headers
    response.setHeader('Access-Control-Allow-Headers', '*');
    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
    // End the response for OPTIONS requests immediately
    return response.end();
    }
//end of code to bypass CORS
    let handler = methods[request.method] || notAllowed;
    handler(request)
    .catch(error => {
        if (error.status != null) return error;
        return {body: String(error), status: 500};
    })
    .then(({body, status = 200, type = "text/plain"}) => {
        response.writeHead(status, {"Content-Type": type});
        if (body && body.pipe) body.pipe(response);
        else response.end(body);
    });
}).listen(8000);

const {parse} = require("url");
const {resolve, sep} = require("path");
const baseDirectory = process.cwd();
function urlPath(url) { //pulled from lecture slides
    let {pathname} = parse(url);
    let path =
    resolve(decodeURIComponent(pathname).slice(1));
    if (path != baseDirectory &&
            !path.startsWith(baseDirectory + sep)) {
        throw {status: 403, body: "Forbidden"};
    }
    return path;
}

async function notAllowed(request){ //pulled from lecture slides
    return {
        status: 405,
        body: `Method ${request.method} not allowed.`
    }; //returns status 405 and error message when a method is not allowed
}

methods.GET = async function(request){ //pulled from lecture slides
    let path = urlPath(request.url);
    let stats;
    try {
        stats = await stat(path);
    } catch (error) {
        if (error.code != "ENOENT") throw error;
        else return {status: 404, body: "File not found"};
    }
    if (stats.isDirectory()) {
        return {body: (await readdir(path)).join("\n")};
    } else {
        return {body: createReadStream(path),
            type: mime.getType(path)};
    }
};

function pipeStream(from, to) { //pulled from lecture slides
    return new Promise((resolve, reject) => {
        from.on("error", reject); //if theres an error when opening the file the stream fires an error event
        to.on("error", reject); //if the stream request fails fires another error event 
        to.on("finish", resolve); //closes pipestream when finished
        from.pipe(to);
    });
}

methods.PUT = async function(request){ //pulled from lecture slides
    let path = urlPath(request.url); //calls urlpath to get path to assign to path variable
    await pipeStream(request, createWriteStream(path)); //creates a writestream
    return {status: 204}; //returns code 204 
};

methods.DELETE = async function(request){ //pulled from lecture slides
    // translate the url into a file name
    let path = urlPath(request.url);
    // invoke stat object called stats
    let stats;
    // wait for stat to find the file
    try {
        stats = await stat(path);
    // handle a non-existent file name
    } catch (error) {
        if (error.code != "ENOENT") throw error;
        else return {status: 204};
    }
    // if the file name is a directory, remove it
    if (stats.isDirectory()) await rmdir(path);
    // if the file name is not a directory, remove it
    else await unlink(path);
    // report that the file deletion was successful
    return {status: 204};
};

methods.MKCOL = async function(request){ //chatGPT was used to understand this piece, "Explain a MKCOL method using HTTP and fs"
    let path = urlPath(request.url); //calls urlpath function to find a path to assign to path variable

    try {
        await mkdir(path); //uses await and calls fs function mkdir using path variable
        return {status: 204}; //returns 204 if mkdir is successful
    } catch(error) {
        if (error.code != "ENOENT") throw error; //if an error is caught that is not an ENOENT error, throws an error
        else return {status: 400}; //if its any other error, throws a 400 directory not found error
    }
};