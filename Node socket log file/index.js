const express = require("express");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const app = express();
const server = require('http').createServer(app);
var io  = require('socket.io')(server);

const port = process.env.PORT || "8000";
//log file name
const logFile = "file.txt";

//variable to save last n lines
var lastLines = [],tailifSize = 10;


//helper function for updating data
var updateData = (lastLines, line) => {
    var len = lastLines.length;
    if(len>=tailifSize){
        lastLines.shift();
    }
    lastLines.push(line);
}


const logStream = fs.createReadStream(logFile);

//interface for reading data line by line
const readInterface = readline.createInterface({
    input: logStream
});


//save the last 10 lines of a file in a variable when the server starts
readInterface.on('line', (line) => {
    updateData(lastLines,line);
})
.on('close', () => {
    logStream.close();

    //basic socket.io connection
    io.on('connection',(client) => {
        console.log("new user connected to the server.");
        client.emit('data',lastLines); // sends last 10 lines of file
    });
    
    //watch the file periodically for any changes in file
    fs.watchFile(logFile, (curr, prev) => {
        var prevSize = prev.size, currSize = curr.size;
        var len = currSize-prevSize;

        //check for change in size of file
        if(len>0){
            const stream = fs.createReadStream(logFile,{ start:prevSize });
            stream.on('data', (dataChunk) => {
                var updates = dataChunk.toString().replace(/^(\n)*/,'');
                var updatesArray = updates.split("\n");

                updatesArray.forEach((item,index) => {
                    updateData(lastLines,item);
                });

                console.log(updates);
                io.emit('data',updatesArray);
            });
        }
    });
})




app.get('/log', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

server.listen(port, () => {
    console.log("Server connected.listening to port:" + port);
});