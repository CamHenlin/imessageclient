on run argv
	-- no activate
	tell application "System Events"
		tell process "Messages"
			tell menu item "New Message" of menu "file" of menu bar 1
				click
			end tell
			delay 0.1
			keystroke item 1 of argv
			delay 0.1
			keystroke return
			delay 0.1
			keystroke tab
			keystroke item 2 of argv
			delay 0.1
			keystroke return
			set visible to false
		end tell
	end tell
end run
