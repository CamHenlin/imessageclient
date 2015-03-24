on run argv
	tell Application "Messages" to activate
	delay 0.25
	tell application "System Events"
		tell process "Messages"
			delay 0.1
			keystroke return
		end tell
		delay 0.1
			delay 0.1
			-- set visible to false
		key down command
		keystroke tab
		key up command
	end tell
end run
