var applescript = require("../lib/applescript");

// Very basic AppleScript command. Returns the song name of each
// currently selected track in iTunes as an 'Array' of 'String's.
var script = 'tell application "iTunes" to get name of selection';

applescript.execString(script, function(err, rtn) {
  if (err) {
    // Something went wrong!
    throw err;
  }

  if (Array.isArray(rtn) && rtn.length > 0) {
    console.log("Currently selected tracks in \"iTunes\":");
    rtn.forEach(function(songName) {
      console.log("\t" + songName);
    });
  } else {
    console.log("No tracks are selected in \"iTunes\"...")
  }
});
