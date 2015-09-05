var //app = require('http').createServer(handler),
    //io = require('socket.io').listen(app),
    //url = require('url'),
    spawn = require('child_process').spawn;
    //sutil = require('./sutil');

var buffer = ''; //Left overs for when we read from stdout/logcat

var package = ""; //FIXME: allow this to be set

function matchesPackage(token) {
    //FIXME: implement
    if (package.length == 0) {
        //Default behavior with no command line
        return true;
    }
    //if token is in named process return true
    var index = package.find(':');

//  return (token in catchall_package) if index == -1 else (token[:index] in catchall_package)
}

String.prototype.paddingLeft = function () {
    var paddingValue = "                                     ";
    return String(paddingValue + this).slice(-paddingValue.length);
};

String.prototype.colorize = function (fore, back, bright) {
    //'\033[1;31mbold red text\033[0m'
    var foreIntensity = 3 + (bright ? 6 : 0);
    var backIntensity = 4 + (bright ? 6 : 0);

    return String('\033[1;'+foreIntensity+fore+';'+backIntensity+back+ 'm' + this + '\033[0m');
};

var BLACK = '0';
var RED = '1';
var GREEN = '2';
var YELLOW = '3';
var BLUE = '4';
var MAGENTA = '5';
var CYAN = '6';
var WHITE = '7';

//FIXME: These should be bright and thin!
var TAG_TYPES = {
    'V': ' V '.colorize(WHITE, BLACK, true),
    'D': ' D '.colorize(BLACK, BLUE, true),
    'I': ' I '.colorize(BLACK, GREEN, true),
    'W': ' W '.colorize(BLACK, YELLOW, true),
    'E': ' E '.colorize(BLACK, RED, true),
    'F': ' F '.colorize(BLACK, RED, true)
}

var LAST_USED = [RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN];
var KNOWN_TAGS = {
    'dalvikvm': WHITE,
    'Process': WHITE,
    'ActivityManager': WHITE,
    'ActivityThread': WHITE,
    'AndroidRuntime': CYAN,
    'jdwp': WHITE,
    'StrictMode': WHITE,
    'DEBUG': YELLOW
};

//FIXME: indent wrapping!
function getColor(tag) {
    if (KNOWN_TAGS[tag] == null) { //If its not in known tags
        KNOWN_TAGS[tag] = LAST_USED[0]; //Make the color equal to the last used color and add it to known tags
    }
        
    var color = KNOWN_TAGS[tag];
    if (LAST_USED.indexOf(color) != -1) { //Messing up here caue of numbers and strings
        //Move to bottom of the list!
        var index = LAST_USED.indexOf(color);
        
        if (index > -1) {
            LAST_USED.splice(index, 1); //FIXME: Think this is messing up!
        }
        
        //LAST_USED.remove(color)
        LAST_USED.push(color);
    }
    
    return color
}

function createLogcatProcess() {
    var logcat = spawn('adb', ['logcat', '-v', 'brief']);
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
        //console.log("Line:"+ line);
            if (line != false) {
                if (line.indexOf("--------- beginning of") != 0) { //If we don't start with this parse it
                    var line = line.trim();
                    if (matchesPackage(line)) {
                        //console.log("\033[1;31mbold red text\033[0m\n");
                        var tag = line.substr(2,line.indexOf('(') - 2);
                        var type = TAG_TYPES[line.substr(0,1)];
                        var firstParenthesis = line.indexOf('): ');
                        var message = line.substr(firstParenthesis + 3);
                        //FIXME: breaks on parenthesis in tag!
                        //console.log(tag);
                        //console.log(type);
                        //console.log(message);
                        //V/AlarmManager(  468): Pkg: android
                        //console.log(line); //Don't print out the extra '\n'
                        //'\033[1;31mbold red text\033[0m'
                        if (!type) {
                            //line.substr(0,1);
                            //FIXME: maybe im reading wrong? was getting some crashes here... hmmm
                            console.log('*********'+line);
                        }
                        tagColor = KNOWN_TAGS[tag];
                        if (tagColor == null) {
                            tagColor = GREEN;
                        }
                        console.log(tag.paddingLeft().colorize(getColor(tag), BLACK, false) + ' ' + type + ' ' + message);
                    }
                }
            }
            //console.log('************LINE');
        });

        //console.log('*********');
        //console.log(data);
    });
}

createLogcatProcess();