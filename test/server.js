var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var errorhandler = require('errorhandler');
var server = express();

var cas = require('../lib/index');
var auth = cas.getMiddleware('https://www.mpxreach.com/cas', 'http://10.0.0.8:8888');


server.use(cookieParser());
server.use(session({ 'secret':'Modern Major General', 
                      saveUninitialized: true,
                      resave: true}));
server.use(errorhandler());

var router = express.Router();


router.get('/', auth, function(request,response){
        if(!request.session.authenticatedUser) {
                console.log("weird");
                console.dir(request.session);
        } else {
             console.dir(request.session);
            var username = request.session.authenticatedUser.id;
            response.send("<html><head></head><body>Logged in as " + username + "</body></html>");
        }
        
});

server.use('/', router);

server.listen(8888);
