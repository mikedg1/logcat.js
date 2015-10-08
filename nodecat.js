var spawn = require('child_process').spawn,
    readline = require('readline')

var package = process.argv[2]; //FIXME: allow this to be set

var COLUMN_COUNT = process.stdout.columns;
if (!COLUMN_COUNT) COLUMN_COUNT = 160; //debug causes this?

var PADDING = "                                     ";
var TYPE_SIZE_PADDING = "     "; //FIXME: do this dynamically
var currentPid = -1;

function matchesPackage(pid) {
    //FIXME: implement
    pid = pid.trim();

    if (!package) {
        //Default behavior with no command line
        return true;
    }
    //if token is in named process return true
    
    if (pid == currentPid) {
        return true;
    }

    return false;
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

//FIXME: indent wrapping!
function scootAndPrint(aLine) {
    //FIXME: I think padding, doesn't tke into account the color characters!!!

    //Skip first line since this is pre-padded, horrible design, but it was quicker
    var firstRowLength = COLUMN_COUNT; //FIXME: not sure this is correct
    console.log(aLine.slice(0, firstRowLength)); //For debugging only show multi line!

    var restOfLine = aLine.slice(firstRowLength);
    var rowLength = COLUMN_COUNT - (PADDING.length + TYPE_SIZE_PADDING.length); //FIXME: move around, this is static, rename too
    var previousLine = '';
    while (restOfLine) {
        var paddingSize = PADDING.length + TYPE_SIZE_PADDING.length + 1;
        var paddedVersion = PADDING + TYPE_SIZE_PADDING + restOfLine; //.slice(-PADDING.length); //Needs to be full line padding!
        console.log(paddedVersion.substr(0, rowLength - 1)); //without the -1 we go to next line

        previousLine = restOfLine; //FIXME: use this to bump out broken lines, for example in exceptions!
        restOfLine = restOfLine.slice(rowLength - paddingSize);
    }
}

function processLogLine(line) {
    if (line != false) {
        if (line.indexOf("--------- beginning of") != 0) { //If we don't start with this parse it
            var line = line.trim();

            var tag = line.substr(2,line.indexOf('(') - 2);
            var type = TAG_TYPES[line.substr(0,1)];
            var firstParenthesis = line.indexOf('): ');
            var message = line.substr(firstParenthesis + 3);
            var pid = line.substr(line.indexOf('(') + 2, 4); //FIXME: not sure this sticks to 4 chars long
            if (matchesPackage(pid)) {
                //FIXME: breaks on parenthesis in tag!
                //'\033[1;31mbold red text\033[0m'
                if (!type) {
                    console.log('*********'+line); //This was a eftover from poor stdout reading, leaving to make sure it's still the case
                }
                tagColor = KNOWN_TAGS[tag];
                if (tagColor == null) {
                    tagColor = GREEN;
                }
                scootAndPrint(tag.paddingLeft().colorize(getColor(tag), BLACK, false) + ' ' + type + ' ' + message);
            }
        }
    }
}    

function createLogcatProcess() {
    var logcat = spawn('adb', ['logcat', '-v', 'brief']);

    linereader = readline.createInterface(logcat.stdout, logcat.stdin);

    linereader.on('line', function (line) {
      processLogLine(line);
    });
}

createLogcatProcess();

function listenForProcessChanges() {
    var ps = spawn('adb', ['shell', 'ps']);

    linereader = readline.createInterface(ps.stdout, ps.stdin);
    linereader.on('line', function (line) {
      var splits = line.split(/[ ,]+/);
      if (splits.length == 9) {
          var pid = splits[1];
          var name = splits[8];
          //console.log(pid+":"+name);
          if (name == package) {
              currentPid = pid;
          }
      }
      //FIXME: can there be many pids?
    });

    setTimeout(listenForProcessChanges, 5000); //Rerun to see if pid changed
    //FIXME: on close make sure we turn this off!
}
//>taskkill /F /IM adb.exe <--- in case we mess up big time

if (package) {
    listenForProcessChanges();
}