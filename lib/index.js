var Validator, http, https, url;

url = require('url');

http = require('http');

https = require('https');

Validator = (function() {

  function Validator(ssoBase, serverBaseURL) {
    this.ssoBase = ssoBase;
    this.serverBaseURL = serverBaseURL;
    this.parsed = url.parse(this.ssoBase);
    if (this.parsed.protocol === 'http:') {
      this.client = http;
    } else {
      this.client = https;
    }
  }

  Validator.prototype.validate = function(request, ticket, callback) {
    var get, parsedURL, resolvedURL, service;
    resolvedURL = url.resolve(this.serverBaseURL, request.url);
    parsedURL = url.parse(resolvedURL, true);
    delete parsedURL.query.ticket;
    delete parsedURL.search;
    service = url.format(parsedURL);
    get = this.client.get({
      host: this.parsed.host,
      port: this.parsed.port,
      path: url.format({
        pathname: '/cas/validate',
        query: {
          ticket: ticket,
          service: service
        }
      })
    }, function(response) {
      var body;
      response.setEncoding('utf8');
      body = '';
      response.on('data', function(chunk) {
        return body += chunk;
      });
      return response.on('end', function() {
        var lines, user;
        lines = body.split('\n');
        if (lines.length >= 1) {
          if (lines[0] === 'no') {
            callback(null, null);
            return;
          } else if (lines[0] === 'yes' && lines.length >= 2) {
            user = {
              id: lines[1]
            };
            callback(user, null);
            return;
          }
        }
        callback(null, new Error('The response from the server was bad'));
      });
    });
    get.on('error', function(e) {
      console.error(e);
      return callback(null, e);
    });
  };

  return Validator;

})();

exports.getMiddleware = function(ssoBaseURL, serverBaseURL, options) {
  var loginURL, validator;
  if (options == null) options = {};
  loginURL = ssoBaseURL + '/login';
  validator = new Validator(ssoBaseURL, serverBaseURL);
  return function(req, res, next) {
    var redirectURL, service, ticket, user;
    if (req.session != null) {
      if (req.session.authenticatedUser != null) {
        req.authenticatedUser = req.session.authenticatedUser;
        next();
        return;
      }
    }
    ticket = req.param('ticket');
    if (ticket != null) {
      return user = validator.validate(req, ticket, function(user, error) {
        if (req.session != null) req.session.authenticatedUser = user;
        req.authenticatedUser = user;
        next();
      });
    } else {
      redirectURL = url.parse(loginURL, true);
      service = serverBaseURL + req.url;
      redirectURL.query.service = service;
      return res.redirect(url.format(redirectURL));
    }
  };
};
