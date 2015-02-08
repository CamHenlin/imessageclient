var fs = require("fs");
var path = require("path");
var applescript = require("../lib/applescript");

if (process.argv.length <= 2) {
  console.error("USAGE: " + path.basename(process.execPath) + " " + path.basename(__filename) + " something.applescript");
  console.error("    Try one of:");
  fs.readdirSync(__dirname).filter(function(file) {
    return path.extname(file) == '.applescript';
  }).forEach(function(file) {
    console.error("        " + file);
  });
} else {
  console.error('Executing "' + process.argv[2] + '"');
  applescript.execFile(process.argv[2], process.argv.slice(3), function(err, rtn) {
    console.error('    DONE!\n');
    if (err) {
      // Something went wrong!
      console.error("EXIT CODE: " + err.exitCode);
      console.error(err);
    } else {
      // If we got here, then there's probably some worthy content.
      console.error(rtn);
    }
  });  
}
