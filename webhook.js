const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const apiaiApp = require('apiai')('16315278f9854468a6154ed7d96b50dc');

var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '6ee98b04355d4b93931acaa8e2f62bc1'; 
var client_secret = 'd852a1726cd44c5393e819f76658f3f7';
var redirect_uri = 'https://pretentious-pally.herokuapp.com/callback';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(cookieParser());

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

app.get('/', (req, res) => {
  console.log("Deployed!");
  res.send("Deployed!");
  //this is a test
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname + '/html/test.html'));
})

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  console.log("get webhook");
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

app.post('/', (req, res) => {
  console.log("post non");
  //console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
  console.log("post");
  // console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.post('/ai', (req, res) => {
  // console.log("AI");

  // if (req.body.result.action === 'weather') {
  //   console.log("weather");
  // }
  // if (req.body.result.action === 'recommend') {
  //   console.log("recommend");
  //   //sendTextMessage(res, "hello");
  // }

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  console.log("we are here");
  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));

});

function sendTextMessage(res, text){
  let msg = text;
  return res.json({
    speech: msg,
    displayText: msg,
    source: 'recommend'
  });
}

function sendMessage(event) {
  console.log("Sending Message");
  let sender = event.sender.id;
  let text = event.message.text;

  let apiai = apiaiApp.textRequest(text, {
    sessionId: 'talk'
  });

  apiai.on('response', (response) => {
    let aiText = response.result.fulfillment.speech;

    request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: 'EAAaYGGf5AUUBABDtjZCJZChGMwG6EeWRc1Xk7A0NkWqKLiE0lfp4Q84DROZCE9uM9eyIZBVmmioDqmdag7m4NOaFK1Lra3C9IIZCYFUDihLspWdro3en6WEjrpJUhVTdPZBOmNTqZAJjPQGCCU7HiIjW8EvweSzythnQBDEt2kgUwZDZD'},
      method: 'POST',
      json: {
        recipient: {id: sender},
        message: {text: aiText}
      }
    }, function (error, response) {
      if (error) {
          console.log('Error sending message: ', error);
      } else if (response.body.error) {
          console.log('Error: ', response.body.error);
      }
    });
  });

  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();

}