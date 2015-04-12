var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");
var dir = process.env.HOME + '/Library/Messages/';
var file = process.env.HOME + '/Library/Messages/chat.db';
var blessed = require("blessed");
var applescript = require("./applescript/lib/applescript.js");
var exec = require('exec');
var glob = require('glob');
var imessagemodule = require("imessagemodule");

// blessed elements
var chatList;
var selectedChatBox;
var inputBox;
var outputBox;

var exists = fs.existsSync(file);
if (!exists) {
	setTimeout(function() {
		outputBox.setItems(["Looks like there was a problem opening Messages.app's SQLite database.", "Open an issue at https://github.com/CamHenlin/imessageclient/issues"]);
		screen.render();
	}, 250);
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

// make sure assistive access is set up
function assistiveAccessCheck() {
	// first check if assistive access is turned on
	applescript.execFile(__dirname+'/assistive.AppleScript', [true], function(err, result) {
		if (err) {
			try {
				outputBox.setItems(["This program requires OS X Assistive Access, which is currently disabled.", "Opening Assistive Access now... (You may be asked to enter your password.)", "note: to run locally, enable access to Terminal or iTerm2, to run over SSH, enable access to sshd_keygen_wrapper."]);
				screen.render();
				applescript.execFile(__dirname+'/assistive.AppleScript', [false], function(err, result) {});
			} catch (error) {
				// I believe this might happen with old versions of OS X
				console.log('if you are seeing this text, please file an issue at https://github.com/CamHenlin/imessageclient/issues including your OS X version number and any problems you are encountering.')
			}
		}
	});
};

// read the Messages.app sqlite db
var db = new sqlite3.Database(file);

// Create a screen object and name it.
var screen = blessed.screen();
screen.title = 'iMessages';

// internally used variables
var LAST_SEEN_ID = 0;
var LAST_SEEN_CHAT_ID = 0;
var ID_MISMATCH = false;
var SELECTED_CHATTER = ""; // could be phone number or email address or groupchat id
var SELECTED_CHATTER_NAME = ""; // should be a firstname and lastname if selected chatter exists in addressbook
var GROUPCHAT_SELECTED = false;
var SELECTED_GROUP = ""; // stores actual group title
var MY_APPLE_ID = "";
var ENABLE_OTHER_SERVICES = false;
var sending = false;
var chatSet = false;

// blessed code
chatList = blessed.list({
	parent: screen,
	width: '25%',
	height: '100%',
	top: '0',
	right: '0',
	align: 'center',
	fg: 'cyan',
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

// box on right with list of open chats
selectedChatBox = blessed.box({
	parent: screen,
	// Possibly support:
	align: 'center',
	fg: 'cyan',
	height: '5%',
	width: '75%',
	top: '0',
	left: '0',
	content: ""
});

// box at bottom for chat input
inputBox = blessed.textbox({
	parent: screen,
	// Possibly support:
	// align: 'center',
	fg: 'cyan',
	height: '15%',
	label: 'iMessage',
	border: {
		type: 'line'
	},
	width: '75%',
	bottom: '0',
	left: '0'
});

// main chat box
outputBox = blessed.list({
	parent: screen,
	// Possibly support:
	// align: 'center',
	fg: 'cyan',
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

// make sure we have assistive access enabled
assistiveAccessCheck();

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

// q button quits
screen.key('q', function(ch, key) {
	return process.exit(0);
});

// e button sends enter to Messages.app
screen.key('e', function(ch, key) {
	applescript.execFile(__dirname + '/send_return.AppleScript', [], function(err, result) {
		if (err) {
			throw err;
		}

		screen.render();
	});
});

// tab button switches focus
screen.key('tab', function(ch, key) {
	if (chatList.focused) {
		inputBox.focus();
	} else {
		chatList.focus();
	}

	screen.render();
});

// r button enables other services
screen.key('r', function(ch, key) {
	if (ENABLE_OTHER_SERVICES) {
		ENABLE_OTHER_SERVICES = false;
	} else {
		ENABLE_OTHER_SERVICES = true;
	}

	getChats();
	screen.render();
});

// not 100% sure why this doesnt work, should scroll up conversation
screen.key(',', function(ch, key) {
	outputBox.up();
	screen.render();
});

// not 100% sure why this doesnt work, should scroll down conversation
screen.key('.', function(ch, key) {
	outputBox.down();
	screen.render();
});

// n creates a new conversation
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

// handler for input textbox focus
var inputBoxFocusHandler = function() {
	inputBox.readInput(function(data) {});

	inputBox.key('enter', function(ch, key) {
		if (SELECTED_CHATTER === "") {
			return;
		}

		var message = inputBox.getValue();
		sendMessage(SELECTED_CHATTER, message);
		inputBox.setValue("");
		inputBox.unkey('enter');

		inputBoxFocusHandler();
	});

	inputBox.key('tab', function(ch, key) {
		inputBox.unkey('enter');
		chatList.focus();
	});
};

inputBox.on('focus', inputBoxFocusHandler);

// handler for when a conversation is selected
chatList.on('select', function(data) {
	chatSet = true;
	// we don't want to try to get the name of groupchats
	if (chatList.getItem(data.index-2).content.indexOf('-chat') > -1) {
		GROUPCHAT_SELECTED = true;
		// so group chats can be whatever the selection was
		selectedChatBox.setContent(chatList.getItem(data.index-2).content);
	} else {
		GROUPCHAT_SELECTED = false;
		if (!isNaN(parseInt(chatList.getItem(data.index-2).content))) { // we only want numbers, this is an ok way to filter them. emails for other services or icloud accounts will break this for now
			getNameFromPhone(chatList.getItem(data.index-2).content, function (name) {
				if (name && name !== "Undefined ") { // "Undefined " can happen on the case of there being a contact with no first or lastname, but a phone number and some other contact info
					selectedChatBox.setContent(name);
				} else {
					selectedChatBox.setContent(chatList.getItem(data.index-2).content);
				}

				screen.render();
			});
		} else {			// so group chats can be whatever the selection was
			selectedChatBox.setContent(chatList.getItem(data.index-2).content);
		}
	}


	SELECTED_CHATTER = chatList.getItem(data.index-2).content;

	// handle special case for chats:
	if (SELECTED_CHATTER.indexOf('-chat') > -1) {
		SELECTED_GROUP = SELECTED_CHATTER;
		SELECTED_CHATTER = 'chat'+SELECTED_CHATTER.split('-chat')[1];
	}
	getAllMessagesInCurrentChat();
	screen.render();
});

function getNameFromPhone(phone, callback) {
	phone = phone.replace(/\(/g,'').replace(/\)/g,'').replace(/\-/g,'').replace(/\ /g,'').replace(/\+/g,'');
	// need to make a like statement so we can get the following phone, which is now in the format
	// 11231231234 into 1%123%123%1234
	// NOTE: this will probably not work for other countries since I assume they store their address differently?
	// fall back to phone number for that case for now
	// 1%
	phone = phone.substr(0, 1) + '%' + phone.substr(1);
	// 1%123
	phone = phone.substr(0, 5) + '%' + phone.substr(5);
	// 1%123%123
	phone = phone.substr(0, 9) + '%' + phone.substr(9);
	// comment out if you want to debug for another locality:
	// throw new Error(phone);

	glob(process.env.HOME + '/Library/Application\ Support/AddressBook/**/AddressBook-v22.abcddb', function (er, files) {
		var found = false;

		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			var db = new sqlite3.Database(file);

			db.serialize(function() {
				var SQL = 'SELECT * FROM ZABCDCONTACTINDEX LEFT OUTER JOIN ZABCDPHONENUMBER ON ZABCDCONTACTINDEX.ZCONTACT = ZABCDPHONENUMBER.ZOWNER LEFT OUTER JOIN ZABCDEMAILADDRESS ON ZABCDEMAILADDRESS.ZOWNER = ZABCDCONTACTINDEX.ZCONTACT LEFT OUTER JOIN ZABCDMESSAGINGADDRESS ON ZABCDMESSAGINGADDRESS.ZOWNER = ZABCDCONTACTINDEX.ZCONTACT LEFT OUTER JOIN ZABCDRECORD ON ZABCDRECORD.Z_PK = ZABCDCONTACTINDEX.ZCONTACT WHERE ZFULLNUMBER LIKE "%'+phone+'%"';
				db.all(SQL, function(err, rows) {
					if (rows.length > 0) {
						found = true;
						callback(rows[0].ZFIRSTNAME + ' ' + ((rows[0].ZLASTNAME) ? rows[0].ZLASTNAME : ""));
					}
				});
			});
		}

		setTimeout(function() {
			if (found) {
				return;
			} else {
				callback();
			}
		}, 250);
	});
}

function getChats() {
	db.serialize(function() {
		var arr = [];
		var SQL = "SELECT DISTINCT message.date, handle.id, chat.chat_identifier, chat.display_name  FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.is_from_me = 0 AND message.service = 'iMessage' ORDER BY message.date DESC";
		if (OLD_OSX) {
			SQL = "SELECT DISTINCT message.date, handle.id, chat.chat_identifier FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.is_from_me = 0 AND message.service = 'iMessage' ORDER BY message.date DESC";
		}

		if (ENABLE_OTHER_SERVICES) {
			SQL = SQL.replace("AND message.service = 'iMessage'", "");
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
	if (GROUPCHAT_SELECTED) { // this is a group chat
		SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND chat.chat_identifier = '"+SELECTED_CHATTER+"' ORDER BY message.date DESC LIMIT 500";
	} else { // this is one person
		SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND handle.id = '"+SELECTED_CHATTER+"' ORDER BY message.date DESC LIMIT 500";
	}

	if (ENABLE_OTHER_SERVICES) {
		SQL = SQL.replace("message.service = 'iMessage' AND ", "");
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

	if (GROUPCHAT_SELECTED) {
		imessagemodule.sendMessage(SELECTED_GROUP.split('-chat')[0], message);
	} else {
		imessagemodule.sendMessage(to, message);
	}
}

setInterval(function() {
	// don't do anything until the user has selected a chat
	if (chatSet) {
		db.serialize(function() {
			db.all("SELECT MAX(ROWID) AS max FROM message", function(err, rows) {
				if (rows) {
					var max = rows[0].max;
					if (max > LAST_SEEN_ID) {
						LAST_SEEN_ID = max;
						// console.log('new message! update clients!');
						var ID_MISMATCH = true;
						getChats();
						getAllMessagesInCurrentChat();
					}
				}
			}.bind(this));
		}.bind(this));
	}
}, 250);


