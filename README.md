# terminal-based iMessage client for Mac OS X

note: if you would like a web-based iMessage client, check out [iMessageWebClient](https://github.com/CamHenlin/iMessageWebClient)

![iMessage client screenshot](https://github.com/CamHenlin/imessageclient/raw/master/screenshot.png "screenshot of the iMessage client in action")

## requirements:
- nodejs
- Apple iMessages account signed in to Messages.app

## How to run on your Mac:
Firstly, at the very minimum, you will have to enable assistive access to Terminal.app or iTerm2. If you want to run this over ssh, you will also need to enable access to sshd-keygen-wrapper. Next:
```bash
git clone https://github.com/CamHenlin/imessageclient.git

cd imessageclient

npm install

node app
```

## How to use:
- After starting, you should see your existing conversations on the right. Select one by pressing the up and down arrows, then press enter to load the conversation.
- Once you have loaded a conversation, press the tab key to select the text entry field and type whatever you want to say.
- Once you are ready to send your message, press the enter key. You should see the Messages app flash for a moment and send your message and then you should see it appear in the terminal.
- In the text entry field, if you press tab, you will be brought back to the conversation selection list so you can select another conversation.
- When you are selecting conversation, you can press the Q key to quit
- To start a new conversation, press the N key while the message list is selected. To cancel, press escape.
- You can toggle other services that you might have enabled in your Messages client by hitting the R button with the contact list selected
- Press E button with contacts list highlighted to send an enter command to Messages.app, useful if it looks like your messages aren't being sent and you're running over ssh, clears most Messages.app dialogs and errors

## This is clunky!
It seems to me that there is a way to access private APIs within OS X to send messages without the use of Messages.app, but I haven't figured out how to do so yet. Maybe you can help out and contribute? You can make this less clunky by helping out with this project [nodeprivatemessageskit](https://github.com/camhenlin/nodeprivatemessageskit)

## Why did you make this?
Why not?


Sister project is available at: [iMessageWebClient](https://github.com/CamHenlin/iMessageWebClient)

![made with a mac](http://henlin.org/mac.gif "made with a mac")
