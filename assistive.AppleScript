on run argv
	if item 1 of argv = "true" then
		tell application "System Events"
			tell process "Messages"
				tell menu bar 1
					click
				end tell
			end tell
		end tell
		return
	end if
	tell application "System Events" to if not UI elements enabled then
		tell me
			activate
			display dialog "This program requires OS X Assistive Access, which is currently disabled." & return & return & "Opening Assistive Access now... (You may be asked to enter your password.)" & return & return & "note: to run locally, enable access to Terminal or iTerm2, to run over SSH, enable access to sshd_keygen_wrapper." buttons {"OK"} default button 1 with icon 1
		end tell
		tell application "System Preferences"
			activate
			set securityPane to pane id "com.apple.preference.security"
			tell securityPane to reveal anchor "Privacy_Accessibility"
			activate
		end tell
	end if

end run