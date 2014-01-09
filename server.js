var net = require('net');
var fs = require('fs')
var http = require("http");
var logger = console;

/* Be nice about including stuff that is non standard */
try {
	var Put = require('put');
} catch (error) {
	logger.error("Cannot load put.  Do 'npm install put' to get put.  This is required");
	process.exit(1);
}

try {
	log4js = require('log4js'); 
	log4js.loadAppender('file');
	log4js.addAppender(log4js.appenders.file('server.log'), 'server');
	logger = log4js.getLogger('server');
} catch (error) {
	logger.error("Could not load log4js module.  do 'npm install log4js' for better logging");
}
 

OP_LENGTH = 1
LOGIN_LENGTH = 6
SERVER_PORT = 8007

ALLOW_ANY_LOGIN = true; // Allow anybody to login regardless of whether they have a valid client Id
/* If we want to have a predefined list of which clients are allowed to login, make this a bit smarter
	like reading from a file or a database .
	Client IDs are currently 6 characters, you will need to modify LOGIN_LENGTH if you change that */
function getClients() {
	clients = {"TESTAB" : {}}
}


/* Load in the songs from the songs.json file */
function loadSongs() {
	try {
		input = fs.readFileSync("songs.json");
		try {
			/* Songs is a format containing multiple songs, song.json is output from the sequencer */
			songs = JSON.parse(input);
			songs = songs["songs"];
			_song = JSON.parse(fs.readFileSync("song.json"));
			logger.info("songs.json file loaded successfully");
		} catch (error) {
			logger.error("Could not parse songs.json file as json " + error);
		} 
	} catch (error) {
		logger.error("No songs.json file found, using demo song data");
	}
}

/* Trigger a song to play on a particular client */
function playSong(socket, song) {
	socket.write("S");
	socket.write(song);
}

function broadcastSong(song) {
	logger.info("Playing song: " + song);
	var plays = 0;
	for (var client in clients) {
		if (clients[client].connected) {
			playSong(clients[client].connected, song);
			plays++;
		}
	}
	logger.info("Played song to " + plays + " clients");
	return plays;
}

/* Send one song to a client with a given socket */
function sendSong(socket, song) {
	socket.write("T");
	p = Put().word8be(song["memory_bank"]).word8be(song["num_tracks"]);
	for (var i=0; i<4; i++) {
		p.word8be(song["tracks"][i]["num_keyframes"]);
		p.pad(1);
		for (var keyframe=0; keyframe<16; keyframe++) {
			if (song["tracks"][i]["keyframes"].length > keyframe) {
				p.word16le(song["tracks"][i]["keyframes"][keyframe]["start_time"]);
				p.word16le(song["tracks"][i]["keyframes"][keyframe]["duration"]);
				p.word8le(song["tracks"][i]["keyframes"][keyframe]["vibration"]);
				p.word8le(song["tracks"][i]["keyframes"][keyframe]["interpolate"]);
			} else {
				p.word16le(0);
				p.word16le(0);
				p.word8le(0);
				p.word8le(0);
			}
		}
	}
	p.write(socket);
}

/* Send the list of startup songs to the client */
function sendSongs(socket) {
	loadSongs(); // Todo: only do this once, not for every client that logs in
	sendSong(socket, _song);
	sendSong(socket, songs[0]);
	sendSong(socket, songs[0]);
	sendSong(socket, songs[0]);
	sendSong(socket, songs[0]);
	//sendSong(socket, songs[0]);
}

/* Receives an operand on the socket.
	An operand is just a single character written on the socket from the client that signals something
	they want to do.  For this service the only thing the client can do is login.
	Returns whether we should try reading more data from the socket */
function receiveOperand(socket) {

	logger.info("Reading operand");
	operand = socket.read(OP_LENGTH);
	if (operand == null) { 
		logger.info("No operand to read yet");
		return false;
	}

	switch (operand.toString()) {
		case 'L':
			logger.info("Login attempt");
			socket._mode = 1;
			break;
		default:
			logger.info("Unknown operation received: " + operand.toString());
			break;
	}

	return true;

}

/* Replies to a login message:
	L0 login unsuccessful
	L1 login successful
	L2 already logged in 
	*/
function receiveLogin(socket) {
	data = socket.read(LOGIN_LENGTH);
	if (data == null) {
		logger.info("Not enough data for login");
		return false;
	} 
	logger.info("Received login");

	var credentials = data.toString();
	if (credentials in clients || ALLOW_ANY_LOGIN) {
		logger.info("Client logged in");
		socket.write("L1");
		clients[credentials] = {}
		clients[credentials].connected = socket;
		socket._credentials = credentials;
		sendSongs(socket);
	} else {
		logger.info("Login not accepted");
		socket.write("L0");
	}

	logger.info(data.toString());
	socket._mode = 0;
	return true;
}

function closeSocket(socket) {
	/* Can't remember if this is necessary or not? */
	if (socket._credentials != null) {
		clients[socket._credentials].connected = 0;
	}
	
}

/* Main server loop */
var server = net.createServer(function(socket) { 

	logger.info('Client connected');

 	/* What state this socket is in.  
  		0 = Waiting for any data
  		1 = Waiting to read Login data */
 	socket._mode = 0;
 	socket._frameLength = 0;
 	socket._credentials = null;

	socket.on('readable', function () {

		try {
			moreData = false;
			do {
			  	switch (socket._mode) {
			  		case 0:
			  			moreData = receiveOperand(socket);
			  			break;
			  		case 1:
			  			moreData = receiveLogin(socket);
			  			break;
			  	}
			} while (moreData);
		} catch (error) {
			logger.error("Client read error, disconnecting: " + error);
			closeSocket(socket);
		}

	});

	socket.on('error', function () {
		logger.error("Client has errored");
		closeSocket(socket);
	})

	socket.on('close', function () {
		logger.info("Client has disconnected");
		closeSocket(socket);
	});

});


/* ----------------------------------------------------
                  Run the server 
   ---------------------------------------------------- */
getClients();

server.listen(SERVER_PORT, function() {
	logger.info('Server listening on port ' + SERVER_PORT);
});


/* The quick and dirty html server for triggering songs */
var index = fs.readFileSync('index.html');
http.createServer(function (req, res) {
	logger.info(req.url);
	if (req.url.match(/^\/$/)) {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(index);
	}
	if (req.url.match(/\/play.*/)) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.write("{'plays' : " + broadcastSong(req.url[req.url.length - 1]).toString() + "}");
	}
	res.end();
}).listen(8080);
