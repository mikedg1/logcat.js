var //app = require('http').createServer(handler),
    //io = require('socket.io').listen(app),
    //url = require('url'),
    spawn = require('child_process').spawn;
    //sutil = require('./sutil');
var logcat = require('adbkit-logcat');
 
// Retrieve a binary log stream 
var proc = spawn('adb', ['logcat', '-B']);

var buffer = ''; //Left overs for when we read from stdout/logcat

var package = ""; //FIXME: allow this to be set


var COLUMN_COUNT = process.stdout.columns;
var PADDING = "                                     ";
var TYPE_SIZE_PADDING = "     "; //FIXME: do this dynamically

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

//Plops the string right justified into the padding
String.prototype.paddingLeft = function () {
    return String(PADDING + this).slice(-PADDING.length);
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

function scootAndPrint(aLine) {
    //Skip first line since this is pre-padded, horrible design, but it was quicker
    var firstRowLength = COLUMN_COUNT; //FIXME: not sure this is correct
    //console.log(aLine.slice(0, firstRowLength)); //For debugging only show multi line!

    var restOfLine = aLine.slice(firstRowLength);
    var rowLength = COLUMN_COUNT - (PADDING + TYPE_SIZE_PADDING); //FIXME: move around, this is static, rename too
    while (restOfLine) {
    console.log(aLine.slice(0, firstRowLength)); //For debugging only show multi line!
        var paddedVersion = String(PADDING + TYPE_SIZE_PADDING + restOfLine); //.slice(-PADDING.length); //Needs to be full line padding!
        console.log(paddedVersion);

        restOfLine = restOfLine.slice(rowLength);
    }
}

function createLogcatProcess() {
    var proc = spawn('adb', ['logcat', '-B']);

    reader = logcat.readStream(proc.stdout);
    reader.on('entry', function(entry) {
        //console.log(entry.message);
        if (matchesPackage(entry)) {
            //console.log("\033[1;31mbold red text\033[0m\n");
            var tag = entry.tag;
            var type = TAG_TYPES[logcat.Priority.toLetter(entry.priority)];
            //var firstParenthesis = line.indexOf('): ');
            var message = entry.message;

            if (!type) {
                //line.substr(0,1);
                //FIXME: maybe im reading wrong? was getting some crashes here... hmmm
//console.log('*********'+entry.message);
            }
            tagColor = KNOWN_TAGS[tag];
            if (tagColor == null) {
                tagColor = GREEN;
            }
            console.log(tag);
            //scootAndPrint(tag.paddingLeft().colorize(getColor(tag), BLACK, false) + ' ' + type + ' ' + message);
        }
        

    });
     
    // Make sure we don't leave anything hanging 
    process.on('exit', function() {
      proc.kill();
    });

}

createLogcatProcess();