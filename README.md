# terminal-based iMessage client for Mac OS X

![iMessage client screenshot](https://github.com/CamHenlin/imessageclient/raw/master/screenshot.png "screenshot of the iMessage client in action")

## requirements:
- nodejs
- Apple iMessages account signed in to Messages.app

## How to run on your Mac:
> git clone https://github.com/CamHenlin/imessageclient.git
>
> cd imessageclient
>
> node app
>

## How to use:
- After starting, you should see your existing conversations on the right. Select one by pressing the up and down arrows, then press enter to load the conversation.
- Once you have loaded a conversation, press the tab key to select the text entry field and type whatever you want to say.
- Once you are ready to send your message, press the enter key. You should see the Messages app flash for a moment and send your message and then you should see it appear in the terminal.
- In the text entry field, if you press tab, you will be brought back to the conversation selection list so you can select another conversation.
- When you are selecting conversation, you can press the Q key to quit

## This is clunky!
It seems to me that there is a way to access private APIs within OS X to send messages without the use of Messages.app, but I haven't figured out how to do so yet. Maybe you can help out and contribute?

## Why did you make this?
Why not?


`note: "applescript" module in node_modules directory is modified, should probably be moved out of modules directory`
