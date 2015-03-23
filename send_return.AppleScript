on run argv
	tell Application "Messages" to activate
	delay 0.25
	tell application "System Events"
		tell process "Messages"
			delay 0.1
			keystroke return
		end tell
		delay 0.1
		set visible of process "Messages" to false
	end tell
end run
