on run argv
	tell Application "Messages" to activate
	delay 0.25
	tell application "System Events"
		tell process "Messages"
			tell menu item 1 of menu 3 of menu bar 1
				click
			end tell
			delay 0.1
			set value of text field 1 of scroll area 3 of splitter group 1 of window 1 to item 1 of argv
			delay 0.1
			if item 4 of argv = "true" then
				delay 1.6
			end if
			keystroke return
			delay 0.1
			keystroke tab
			if item 3 of argv = "true" then -- extra tab for "full keyboard access"
				keystroke tab
			end if
			set value of text area 1 of scroll area 4 of splitter group 1 of window 1 to item 2 of argv
			delay 0.1
			keystroke return
			delay 0.1
			-- set visible to false
		end tell
		key down command
		keystroke tab
		key up command
	end tell

end run
