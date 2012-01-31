var sys = require('sys'),
fs = require('fs'),
qs = require('querystring'),
url = require('url'),
sutil = exports;

sutil.getMap = [];

sutil.sessions = {};

sutil.createSession = function(nick) {
	var i, session;

	for (i in sutil.sessions) {
		session = sutil.sessions[i];
		if (session && session.nick === nick) {
			return null;
		}
	}

	session = {
		nick: nick,
		id: Math.floor(Math.random() * 999999999999).toString()
	};

	sutil.sessions[session.id] = session;
	return session;
};

sutil.get = function(path, handler) {
	sutil.getMap[path] = handler;
};

sutil.not_found = function(req, res) {
	var not_found_msg = 'Not Found';
     console.log('Not found: ' + req.url);
	res.writeHead(404, {
		'Content-Type': 'text/plain',
		'Content-Length': not_found_msg.length
	});
	res.write(not_found_msg);
	res.end();
};

sutil.staticHandler = function(filename) {
	var body;

	function loadResponseData(callback) {
		fs.readFile(filename, function(err, data) {
			if (err) {
				sys.debug('Error loading file ' + filename);
			} else {
				sys.debug('loading file ' + filename);
				body = data;
			}
			callback();
		});
	}

	return function(req, res) {
		loadResponseData(function() {
			res.writeHead(200, {
				'Content-Type': 'text/html',
				'Content-Length': body.length
			});
			res.write(body);
			res.end();
		});
	};

};

sutil.get('/', sutil.staticHandler('index.html'));
sutil.get('/jquery.dataTables.min.js', sutil.staticHandler('jquery.dataTables.min.js'));
sutil.get('/jquery.js', sutil.staticHandler('jquery.js'));
sutil.get('/style.css', sutil.staticHandler('style.css'));
sutil.get('/tables.css', sutil.staticHandler('tables.css'));
sutil.get('/jquery-ui-1.8.17.custom.css', sutil.staticHandler('trontastic/jquery-ui-1.8.17.custom.css'));
sutil.get('/images/ui-bg_gloss-wave_85_9fda58_500x100.png', sutil.staticHandler('trontastic/images/ui-bg_gloss-wave_85_9fda58_500x100.png'));
sutil.get('/images/ui-icons_b8ec79_256x240.png', sutil.staticHandler('trontastic/images/ui-icons_b8ec79_256x240.png'));
sutil.get('/images/ui-bg_glass_40_0a0a0a_1x400.png', sutil.staticHandler('trontastic/images/ui-bg_glass_40_0a0a0a_1x400.png'));

sutil.get('/join', function(req, res) {
	var nick = qs.parse(url.parse(req.url).query).nick,
	session;

	session = sutil.createSession(nick);
	if (!session) {
		res.simpleJSON(200, {
			error: 'Nick in use'
		});
		return;
	}

	res.simpleJSON(200, {
		nick: session.nick,
		id: session.id
	});
});

sutil.get('/who', function(req, res) {
	var nicks = [],
	i,
	session;

	for (i in sutil.sessions) {
		session = sutil.sessions[i];
		nicks.push(session.nick);
	}
	res.simpleJSON(200, {
		nicks: nicks
	});
});