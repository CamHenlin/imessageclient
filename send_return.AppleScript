on run argv
	tell application "System Events"
		tell Application "Messages" to activate
		tell process "Messages"
			delay 0.1
			keystroke return
		end tell
		delay 0.1
		set visible of process "Messages" to false
	end tell
end run
