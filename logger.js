/* Basic logging that people can read using a webbrowser.  Not really required, just nice.  */
var PuperGrep = require("pupergrep"),
    puper     = new PuperGrep(),
    manager   = puper.getLogReaderManager();

manager.addLog("server.log", "server.log", function(error) {
    if (error) {
        winston.info("Error adding test log", error);
        return;
    }

});

manager.addLog("forever.log", "forever.log", function (e) {
});

manager.addLog("foreverlogger.log", "foreverlogger.log", function (e) {
});

puper.listen(8080);
