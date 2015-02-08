var spawn = require("child_process").spawn;
exports.Parsers = require("./applescript-parser");
var parse = exports.Parsers.parse;

// Path to 'osascript'. By default search PATH.
exports.osascript = "osascript";

// Execute a *.applescript file.
exports.execFile = function execFile(file, args, callback) {
  if (!Array.isArray(args)) {
    callback = args;
    args = [];
  }
  return runApplescript(file, args, callback);
}

// Execute a String as AppleScript.
exports.execString = function execString(str, callback) {
  return runApplescript(str, callback);
}



function runApplescript(strOrPath, args, callback) {
  var isString = false;
  if (!Array.isArray(args)) {
    callback = args;
    args = [];
    isString = true;
  }

  // args get added to the end of the args array
  args.push("-ss"); // To output machine-readable text.
  if (!isString) {
    // The name of the file is the FIRST arg if 'execFile' was called.
    // args.push(strOrPath);
    var temp = [strOrPath];
    for (var i = 0; i < args.length; i++) {
      temp.push(args[i]);
    }
    args = temp;
  }
  var interpreter = spawn(exports.osascript, args);

  bufferBody(interpreter.stdout);
  bufferBody(interpreter.stderr);

  interpreter.on('exit', function(code) {
    var result = parse(interpreter.stdout.body);
    var err;
    if (code) {
      // If the exit code was something other than 0, we're gonna
      // return an Error object.
      err = new Error(interpreter.stderr.body);
      err.appleScript = strOrPath;
      err.exitCode = code;
    }
    if (callback) {
      callback(err, result, interpreter.stderr.body);
    }
  });

  if (isString) {
    // Write the given applescript String to stdin if 'execString' was called.
    interpreter.stdin.write(strOrPath);
    interpreter.stdin.end();
  }
}

function bufferBody(stream) {
  stream.body = "";
  stream.setEncoding("utf8");
  stream.on("data", function(chunk) { stream.body += chunk; });
}
