var spawn = require('child_process').spawn,
    readline = require('readline')

var package = process.argv[2]; 

var COLUMN_COUNT = process.stdout.columns ? process.stdout.columns : 160; //node-debug causes the column count to be null

var PADDING_COUNT = 30;
var TYPE_SIZE_PADDING = "     "; //FIXME: do this dynamically
var currentPid = -1;

function matchesPackage(pid) {
    pid = pid.trim();

    if (!package) {
        //Default behavior with no command line
        return true;
    }
    
    if (pid == currentPid) {
        return true;
    }

    return false;
}

function getRepeatingCharacters(char, length) {
    return Array(length + 1).join(char);
}
var PADDING = getRepeatingCharacters(' ', PADDING_COUNT);

//Plops the string right justified into the padding
String.prototype.paddingLeft = function () {
    return String(PADDING + this).slice(-PADDING.length);
};

String.prototype.colorize = function (fore, back, foreBright, backBright) {
    //'\033[1;31mbold red text\033[0m'
    var foreIntensity = 3 + (foreBright ? 6 : 0);
    var backIntensity = 4 + (backBright ? 6 : 0);

    return String('\033['+foreIntensity+fore+';'+backIntensity+back+ 'm' + this + '\033[0m'); //FIXME: is this correct?
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
    'V': ' V '.colorize(WHITE, BLACK, false, true),
    'D': ' D '.colorize(BLACK, BLUE, false, true),
    'I': ' I '.colorize(BLACK, GREEN, false, false, true),
    'W': ' W '.colorize(BLACK, YELLOW, false, true),
    'E': ' E '.colorize(BLACK, RED, false, true),
    'F': ' F '.colorize(BLACK, RED, false, true)
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
function scootAndPrint(aLine, plainMessage) {
    //FIXME: I think padding doesn't tke into account the color characters!!!

    //Skip first line since this is pre-padded, horrible design, but it was quicker
    var firstRowLength = COLUMN_COUNT; //FIXME: not sure this is correct
    console.log(aLine.slice(0, firstRowLength)); //For debugging only show multi line!

    var restOfLine = aLine.slice(firstRowLength);
    var rowLength = COLUMN_COUNT - (PADDING.length + TYPE_SIZE_PADDING.length); //FIXME: move around, this is static, rename too
    var previousLine = plainMessage; 

    while (restOfLine) {
        //FIXME: tabs get funky :( so maybe replace them all with spaces?
        var lastLineIndentation = previousLine.length - previousLine.trimLeft().length; //If lines get split, lets indent the second one to match so stuff like long exception lines look better
        var whitespaceIndentation = previousLine.substr(0, lastLineIndentation); //This catches tabs

        var paddingSize = PADDING.length + TYPE_SIZE_PADDING.length + 1 + lastLineIndentation;
        var paddedVersion = PADDING + TYPE_SIZE_PADDING + whitespaceIndentation + restOfLine; //.slice(-PADDING.length); //Needs to be full line padding!
        console.log(paddedVersion.substr(0, rowLength - 1)); //without the -1 we go to next line

        previousLine = restOfLine; //FIXME: use this to bump out broken lines, for example in exceptions!
        restOfLine = restOfLine.slice(rowLength - paddingSize);
    }
}

//FIXME: this is a mess, throw some regex at it
var previousTag = '';
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
                var printTag;
                if (previousTag == tag) {
                    //Don't show the tag
                    printTag = getRepeatingCharacters(' ', PADDING_COUNT);
                } else {
                    printTag = tag.paddingLeft().colorize(getColor(tag), BLACK, false, false)
                }
                scootAndPrint(printTag + ' ' + type + ' ' + message, message); //FIXME: consolidate this, shouldn't be sending in formatted message!
                previousTag = tag;
            }
        }
    }
}    

function createLogcatProcess() {
    var logcat = spawn('adb', ['logcat', '-v', 'brief']); //FIXME: convert to binary format -B, but i can't actually find specs for that

    linereader = readline.createInterface(logcat.stdout, logcat.stdin);

    linereader.on('line', function (line) {
      processLogLine(line);
    });
}

function listenForProcessChanges() {
    var ps = spawn('adb', ['shell', 'ps']);

    linereader = readline.createInterface(ps.stdout, ps.stdin);
    linereader.on('line', function (line) {
      var splits = line.split(/[ ,]+/);
      if (splits.length == 9) {
          var pid = splits[1];
          var name = splits[8];

          if (name == package) {
              currentPid = pid;
          }
      }
      //FIXME: can there be many pids for a single package?
    });

    setTimeout(listenForProcessChanges, 5000); //Rerun to see if pid changed
    //FIXME: on close make sure we turn this off!
}

//We only need to monitor PS if someone sent in a package via commandline
if (package) {
    listenForProcessChanges();
}

createLogcatProcess();