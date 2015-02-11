on run argv
	-- no activate
	tell application "System Events"
		tell process "Messages"
			tell menu item 1 of menu 3 of menu bar 1
				click
			end tell
			delay 0.1
			keystroke item 1 of argv
			delay 2.6
			key code 125
			keystroke return
			delay 0.1
			keystroke tab
			if item 3 of argv = "true" then -- extra tab for "full keyboard access"
				keystroke tab
			end if
			keystroke item 2 of argv
			delay 0.1
			keystroke return
			set visible to false
		end tell
	end tell
end run
