var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    url = require('url'),
    spawn = require('child_process').spawn,
    sutil = require('./sutil');

app.listen(1337);

var buffer = ''; //Left overs for when we read from stdout/logcat
var sockets = []; //All socket.io connections
var history = []; //All logcat lines, used to send recent history to a new client

function handler(req, res) {
    var urlHandler = sutil.getMap[url.parse(req.url).pathname] || sutil.not_found; //FIXME: put generic here
    res.simpleJSON = function (code, obj) {
        var body = JSON.stringify(obj);
        res.writeHead(code, {
            'Content-Type': 'text/json',
            'Content-Length': body.length
        });
        res.write(body);
        res.end();
    };
    urlHandler(req, res);
}

function sendMessage(data) {
    var logLine = {};
    var splits = data.split(/ {1,99}/, 6); //only break between 1 and 99 space sin a row
    //FIXME: need to switch to logcat long to get everything safely
    logLine["date"] = splits[0];
    logLine["time"] = splits[1];
    logLine["process"] = splits[2]
    //Skip one, that isn't process
    logLine["priority"] = splits[4];
    logLine["tag"] = splits[5];
    logLine["message"] = data.replace(/[^ ]* {1,99}[^ ]* {1,99}[^ ]* {1,99}[^ ]* {1,99}[^ ]* {1,99}[^ ]* {1,99}/, '');

    //For debugging, shove the entire line in
    logLine["fullLine"] = data;

    //Now add this line to history so we can send it to new clients
    history.push(logLine);
    if (history.length > 100) {
        //FIXME: cut off pieces
        //Definately need to add this or it chokes the browser.. yikes
    }
    //Now send it to every connected socket
    sockets.forEach(function (socket) {
        socket.emit('logcat', {
            buffer: logLine
        });
    });
}

//Track sockets
io.sockets.on('connection', function (socket) {
    sockets.push(socket);

    //Looping through the history is a bad idea, lets just batch the entire thing up
    socket.emit('logcatHistory', {
        buffer: history
    });
    //});
    //mayeb end or close, ryan dahl mentioned those in intro
    //Not sure difference between end, close, disconnect
    socket.on('disconnect', function () {
        console.log('Disconnected');
        var i = sockets.indexOf(socket);
        delete sockets[i];
    });
});


function createLogcatProcess() {
    var logcat = spawn('adb', ['logcat', '-v', 'threadtime']);
    logcat.stdout.setEncoding('utf8'); //Check that this does anything
    logcat.stdout.on('data', function (data) {
        //How does eclipse get application name???? ps grep pid?
        //From logcat -v threadtime
        //01-24 09:57:20.077 16223 16241 I AmazonAppstore.ApplicationLockerImpl: PERFORMANCE done loading locker
        //From eclipse
        //01-24 09:48:07.428: D/NotificationSyndication(23097): onAccessibilityEvent
        buffer = buffer + data; //Append...
        var lines = data.split('\n');
        buffer = lines.pop(); //removes last and adds to buffer
        lines.forEach(function (line) {
        console.log("Line:"+ line);
            if (line != false) {
                if (line.indexOf("--------- beginning of") != 0) { //If we don't start with this parse it
                  sendMessage(line);
                }
            }
            //console.log('************LINE');
        });

        //console.log('*********');
        //console.log(data);
    });
}

createLogcatProcess();