var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
//  , util  = require('util')
  , url = require('url')
  , spawn = require('child_process').spawn
  , sutil = require('./sutil');

app.listen(1337);

var buffer = '';
var sockets = [];
var history = [];

function handler (req, res) {
  var urlHandler = sutil.getMap[url.parse(req.url).pathname] || sutil.not_found; //FIXME: put generic here
  res.simpleJSON = function(code, obj) {
    var body = JSON.stringify(obj);
    res.writeHead(code, {
    	'Content-Type': 'text/json',
    	'Content-Length': body.length
    });
    res.write(body);
    res.end();
  };
  urlHandler(req, res);
/*  
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
*/
}

function sendMessage(data) {
  //FUCK regex
  //maybe split by spaces up to the 4th space?
  var logLine = {};
  var splits = data.split(/ {1,99}/, 6); //only break between 1 and 99 space sin a row
    //FIXME: need to switch to logcat long to get everything safely
  logLine["date"] = splits[0];
  logLine["time"] = splits[1];
  logLine["process"] = splits[2]
  //Skip one, that isn't process
  logLine["priority"] = splits[4];
  logLine["tag"] = splits[5];
  //String.replace(pattern,string)
  //so data.replace(   , ''); //replace first 5 peices?
  //.split(/ {1,99} {1,99} {1,99} {1,99} {1,99}/, 7);

  //"01-24 09:57:20.077 16223 16241 I AmazonAppstore.ApplicationLockerImpl: PERFORMANCE done loading locker".replace(  /\.*s/,'');
  //FIXME: add this back
  logLine["message"] = data.replace(/[^ ]* {1,99}[^ ]* {1,99}[^ ]* {1,99}[^ ]* {1,99}[^ ]* {1,99}[^ ]* {1,99}/, '');

  //For debugging, shove the entire line in
  logLine["fullLine"] = data;
  history.push(logLine);
  if (history.length > 100) {
    //FIXME: cut off pieces
    //Definately need to add this or it chokes the browser.. yikes
  }
  //Now send it to every connected socket
  sockets.forEach(function(socket) {
    socket.emit('logcat', { buffer: logLine });
  });
}


//Track sockets
io.sockets.on('connection', function (socket) {
  sockets.push(socket);

    //FIXME: figure out ordering, might wind up adding items more than once?
    //history.forEach(function(logLine) {
    //    socket.emit('logcat', { buffer: logLine });
    //Looping through the history is a bad idea, lets just batch the entire thing up
        socket.emit('logcatHistory', { buffer: history });
    //});
  //mayeb end or close, dahl mentioned those in intro
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
    //How do they get application name????
    //From logcat -v threadtime
    //01-24 09:57:20.077 16223 16241 I AmazonAppstore.ApplicationLockerImpl: PERFORMANCE done loading locker
    //From eclipse
    //01-24 09:48:07.428: D/NotificationSyndication(23097): onAccessibilityEvent
    buffer = buffer + data; //Append...
    var lines = data.split('\n');
    //for(var x = 0; x < lines.length; x++) {
//    if (lines[lines.size - 1] != '') {
      //I think this doesn't matter, we either add an empty or we add incomplete and remove from processing
      buffer = lines.pop(); //removes last and adds to buffer
//    } else {
//      lines.pop(); //remove last cause its empty
//      buffer = ''; //clear buffer
//    }
    lines.forEach(function(line) {
      sendMessage(line);
      console.log('************LINE');
      //FIXME: Need ot check if ends with '/n' right and add to buffer
    });

    //FIXME: put rest of buffer back in
    console.log('*********');
    console.log(data);
  });
}

createLogcatProcess();
