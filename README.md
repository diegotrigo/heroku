To get started:

```
Install node.js

npm install put
npm install log4js
node server.js
```

To test (running locally)

```
telnet 127.0.0.1 8007
L123456
```

Should reply with some garbage (the binary version of the songs)

Navigate to 127.0.0.1:8080 with a webbrowser, press some of the buttons.  The telnet session should show "S0", "S1", etc coming up.
