var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");
var dir = process.env.HOME + '/Library/Messages/';
var file = process.env.HOME + '/Library/Messages/chat.db';
var blessed = require("blessed");
var beep = require('beepbeep');
var applescript = require("./applescript/lib/applescript.js");
var exec = require('exec');

var exists = fs.existsSync(file);
if (exists) {
	console.log("we have a file to monitor!");
} else {
	console.log("no dice!");
}

// discover if we are running and old version of OS X or not
var OLD_OSX = false;
var os = require('os');
if (os.release().split('.')[0] === "12") { // 12 is 10.8 Mountain Lion, which does not have named group chats
	OLD_OSX = true;
}

// discover whether the keyboard setting "Full Keyboard Access" is set to
// "Text boxes and lists only" -- error or 1 or less
// "All controls" (takes 2 tabs instead of one switching between elements in Messages.app) -- 2 or more
var FULL_KEYBOARD_ACCESS = false; // false for text boxes and lists, true for all controls
exec('defaults read NSGlobalDomain AppleKeyboardUIMode', function(err, out, code) {
	if (err instanceof Error) {
		// return because we already have false set and error means text boxes and lists only
		return;
	}

	if (parseInt(out) > 1) {
		FULL_KEYBOARD_ACCESS = true;
	}
});

// read the Messages.app sqlite db
var db = new sqlite3.Database(file);

// Create a screen object and name it.
var screen = blessed.screen();
screen.title = 'iMessages';

// internally used variables
var LAST_SEEN_ID = 0;
var LAST_SEEN_CHAT_ID = 0;
var ID_MISMATCH = false;
var SELECTED_CHATTER = "";
var MY_APPLE_ID = "";
var sending = false;


// blessed code
var chatList = blessed.list({
	parent: screen,
	width: '25%',
	height: '100%',
	top: '0',
	right: '0',
	align: 'center',
	fg: 'blue',
	label: 'Conversations',
	border: {
		type: 'line'
	},
	selectedBg: 'green',

	// Allow mouse support
	mouse: true,

	// Allow key support (arrow keys + enter)
	keys: true
});

var selectedChatBox = blessed.box({
	parent: screen,
	// Possibly support:
	align: 'center',
	fg: 'blue',
	height: '5%',
	width: '75%',
	top: '0',
	left: '0',
	content: ""
});

var inputBox = blessed.textarea({
	parent: screen,
	// Possibly support:
	// align: 'center',
	fg: 'blue',
	height: '15%',
	label: 'iMessage',
	border: {
		type: 'line'
	},
	width: '75%',
	bottom: '0',
	left: '0'
});

var outputBox = blessed.list({
	parent: screen,
	// Possibly support:
	// align: 'center',
	fg: 'blue',
	height: '82%',
	border: {
		type: 'line'
	},
	width: '75%',
	top: '5%',
	left: '0',

	// Allow mouse support
	mouse: true,

	// Allow key support (arrow keys + enter)
	keys: true
});

// load initial chats list
getChats();

// Allow scrolling with the mousewheel (manually).

chatList.on('wheeldown', function() {
	chatList.down();
});

chatList.on('wheelup', function() {
	chatList.up();
});

outputBox.on('wheeldown', function() {
	outputBox.down();
});

outputBox.on('wheelup', function() {
	outputBox.up();
});

// Select the first item.
chatList.select(0);

screen.key('q', function(ch, key) {
	return process.exit(0);
});

screen.key('tab', function(ch, key) {
	if (chatList.focused) {
		inputBox.focus();
	} else {
		chatList.focus();
	}

	screen.render();
});

screen.key(',', function(ch, key) {
	outputBox.up();
	screen.render();
});

screen.key('.', function(ch, key) {
	outputBox.down();
	screen.render();
});

screen.key('n', function(ch, key) {
	var newChatBox = blessed.textarea({
		parent: screen,
		// Possibly support:
		// align: 'center',
		fg: 'blue',
		height: '15%',
		border: {
			type: 'line'
		},
		width: '75%',
		top: '35%',
		left: '12.5%',
		label: "New Conversation - type in contact iMessage info and hit enter"
	});

	newChatBox.on('focus', function() {
		newChatBox.readInput(function(data) {});

		newChatBox.key('enter', function(ch, key) {
			var sendTo = newChatBox.getValue();
			newChatBox.detach();
			inputBox.focus();
			selectedChatBox.setContent(sendTo);
			SELECTED_CHATTER = sendTo;
			screen.render();
		});

		newChatBox.key('esc', function(ch, key) {
			newChatBox.detach();
			chatList.focus();
			screen.render();
		});

		newChatBox.key('tab', function(ch, key) {

		});
	});
	newChatBox.focus();

	screen.render();
})

inputBox.on('focus', function() {
	inputBox.readInput(function(data) {});

	inputBox.key('enter', function(ch, key) {
		var message = inputBox.getValue();
		sendMessage(selectedChatBox.content, message);
		inputBox.setValue("");
	});

	inputBox.key('tab', function(ch, key) {
		inputBox.unkey('enter');
		chatList.focus();
	});
});

chatList.on('select', function(data) {
	selectedChatBox.setContent(chatList.getItem(data.index-2).content);
	SELECTED_CHATTER = chatList.getItem(data.index-2).content;

	// handle special case for chats:
	if (SELECTED_CHATTER.indexOf('-chat') > -1) {
		SELECTED_CHATTER = 'chat'+SELECTED_CHATTER.split('-chat')[1];
	}
	getAllMessagesInCurrentChat();
	screen.render();
});

function getChats() {
	db.serialize(function() {
		var arr = [];
		var SQL = "SELECT DISTINCT message.date, handle.id, chat.chat_identifier, chat.display_name  FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.is_from_me = 0 AND message.service = 'iMessage' ORDER BY message.date DESC";
		if (OLD_OSX) {
			SQL = "SELECT DISTINCT message.date, handle.id, chat.chat_identifier FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.is_from_me = 0 AND message.service = 'iMessage' ORDER BY message.date DESC";
		}
		db.all(SQL, function(err, rows) {
			if (err) throw err;
			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
				if (row.chat_identifier === null) {
					if (arr.indexOf(row.id) < 0 && row.id !== "" && typeof(row.id) !== "undefined") {
						arr.push(row.id);
					}
				} else if (arr.indexOf(row.chat_identifier) < 0 && arr.indexOf(row.display_name+'-'+row.chat_identifier) < 0) {
					if (row.chat_identifier.indexOf('chat') > -1) {
						if (row.display_name && row.display_name !== "" && typeof(row.display_name) !== "undefined" || OLD_OSX) {
							arr.push(row.display_name+'-'+row.chat_identifier);
						}

					} else {
						if (row.chat_identifier && row.chat_identifier !== "" && typeof(row.chat_identifier) !== "undefined") {
							arr.push(row.chat_identifier);
						}
					}

				}
			}
			chatList.setItems(arr);
			screen.render();
		});
	});
}

function getAllMessagesInCurrentChat() {
	var SQL = "";
	if (SELECTED_CHATTER.indexOf('chat') > -1) { // this is a group chat
		SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND chat.chat_identifier = '"+SELECTED_CHATTER+"' ORDER BY message.date DESC LIMIT 500";
	} else { // this is one person
		SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND handle.id = '"+SELECTED_CHATTER+"' ORDER BY message.date DESC LIMIT 500";
	}

	db.serialize(function() {
		var arr = [];
		db.all(SQL, function(err, rows) {
			if (err) throw err;
			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
				LAST_SEEN_CHAT_ID = row.ROWID;
				arr.push(((!row.is_from_me) ? row.id : "me") + ": " + row.text);
				if (row.is_from_me) {
					MY_APPLE_ID = row.id;
				}
			}
			outputBox.setItems(arr.reverse());
			outputBox.select(rows.length);

			screen.render();
		});
	});
}

function sendMessage(to, message) {
	if (sending) { return; }
	sending = true;

	if (to.indexOf('chat') > -1) {
		applescript.execFile(__dirname+'/sendmessage.AppleScript', [[to.split('-chat')[0]], message, FULL_KEYBOARD_ACCESS], function(err, result) {
			if (err) {
				throw err;
			}

			screen.render();
			sending = false;
		}.bind(this));
	} else {
		applescript.execFile(__dirname+'/sendmessage_single.AppleScript', [[to], message, FULL_KEYBOARD_ACCESS], function(err, result) {
			if (err) {
				throw err;
			}

			screen.render();
			sending = false;
		}.bind(this));
	}

}

setInterval(function() {
	db.serialize(function() {
		db.all("SELECT MAX(ROWID) AS max FROM message", function(err, rows) {
			if (rows) {
				var max = rows[0].max;
				if (max > LAST_SEEN_ID) {
					LAST_SEEN_ID = max;
					// console.log('new message! update clients!');
					var ID_MISMATCH = true;
					// beep();
					getChats();
					getAllMessagesInCurrentChat();
				}
			}
		}.bind(this));
	}.bind(this));
}, 250);