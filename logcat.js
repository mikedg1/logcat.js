var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , util  = require('util')
  , spawn = require('child_process').spawn;

app.listen(1337);

var buffer = '';
var sockets = [];

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

function sendMessage(data) {
  //FUCK regex

  var logLine = {};
  var endOf = data.indexOf(' ', data.indexOf(' ') + 1);
  logLine["date"] = data.substring(0, endOf); //01-24 09:57:20.077
  var nextEndOf = data.indexOf(' ', endOf + 1);
  logLine["process"] = data.substring(endOf + 1, nextEndOf);
  endOf = nextEndOf;
  nextEndOf = data.indexOf(' ', endOf + 1);
  //Skip one
  endOf = nextEndOf;
  nextEndOf = data.indexOf(' ', endOf + 1);
  logLine["priority"] = data.substring(endOf + 1, nextEndOf);
  endOf = nextEndOf;
  nextEndOf = data.indexOf(' ', endOf + 1);
  logLine["tag"] = data.substring(endOf + 1, nextEndOf - 1); //Skip the colon
  logLine["message"] = data.substring(nextEndOf + 1, data.length);;

  sockets.forEach(function(socket) {
    socket.emit('logcat', { buffer: logLine });
    
  });
}


//Track sockets
io.sockets.on('connection', function (socket) {
  sockets.push(socket);

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
