
// 'parse' accepts a string that is expected to be the stdout stream of an
// osascript invocation. It reads the fist char of the string to determine
// the data-type of the result, and creates the appropriate type parser.
exports.parse = function(str) {
  if (str.length == 0) {
    return;
  }
  
  var rtn = parseFromFirstRemaining.call({
    value: str,
    index: 0
  });
  return rtn;
}

// Attemps to determine the data type of the next part of the String to
// parse. The 'this' value has a Object with 'value' as the AppleScript
// string to parse, and 'index' as the pointer to the current position
// of parsing in the String. This Function does not need to be exported???
function parseFromFirstRemaining() {
  var cur = this.value[this.index];
  switch(cur) {
    case '{':
      return exports.ArrayParser.call(this);
      break;
    case '"':
      return exports.StringParser.call(this);
      break;
    case 'a':
      if (this.value.substring(this.index, this.index+5) == 'alias') {
        return exports.AliasParser.call(this);
      }
      break;
    case '«':
      if (this.value.substring(this.index, this.index+5) == '«data') {
        return exports.DataParser.call(this);
      }
      break;
  }
  if (!isNaN(cur)) {
    return exports.NumberParser.call(this);
  }
  return exports.UndefinedParser.call(this);
}

// Parses an AppleScript "alias", which is really just a reference to a
// location on the filesystem, but formatted kinda weirdly.
exports.AliasParser = function() {
  this.index += 6;
  return "/Volumes/" + exports.StringParser.call(this).replace(/:/g, "/");
}

// Parses an AppleScript Array. Which looks like {}, instead of JavaScript's [].
exports.ArrayParser = function() {
  var rtn = [],
    cur = this.value[++this.index];
  while (cur != '}') {
    rtn.push(parseFromFirstRemaining.call(this));
    if (this.value[this.index] == ',') this.index += 2;
    cur = this.value[this.index];
  }
  this.index++;
  return rtn;
}

// Parses «data » results into native Buffer instances.
exports.DataParser = function() {
  var body = exports.UndefinedParser.call(this);
  body = body.substring(6, body.length-1);
  var type = body.substring(0,4);
  body = body.substring(4, body.length);
  var buf = new Buffer(body.length/2);
  var count = 0;
  for (var i=0, l=body.length; i<l; i += 2) {
    buf[count++] = parseInt(body[i]+body[i+1], 16);
  }
  buf.type = type;
  return buf;
}

// Parses an AppleScript Number into a native JavaScript Number instance.
exports.NumberParser = function() {
  return Number(exports.UndefinedParser.call(this));
}

// Parses a standard AppleScript String. Which starts and ends with "" chars.
// The \ char is the escape character, so anything after that is a valid part
// of the resulting String.
exports.StringParser = function(str) {
  var rtn = "",
    end = ++this.index,
    cur = this.value[end++];
  while(cur != '"') {
    if (cur == '\\') {
      rtn += this.value.substring(this.index, end-1);
      this.index = end++;
    }
    cur = this.value[end++];
  }
  rtn += this.value.substring(this.index, end-1);
  this.index = end;
  return rtn;
}

// When the "parseFromFirstRemaining" function can't figure out the data type
// of "str", then the UndefinedParser is used. It crams everything it sees
// into a String, until it finds a ',' or a '}' or it reaches the end of data.
var END_OF_TOKEN = /}|,|\n/;
exports.UndefinedParser = function() {
  var end = this.index, cur = this.value[end++];
  while (!END_OF_TOKEN.test(cur)) {
    cur = this.value[end++];
  }
  var rtn = this.value.substring(this.index, end-1);
  this.index = end-1;
  return rtn;
}
