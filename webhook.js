const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const apiaiApp = require('apiai')('16315278f9854468a6154ed7d96b50dc');

var client_id = '6ee98b04355d4b93931acaa8e2f62bc1'; 
var client_secret = 'd852a1726cd44c5393e819f76658f3f7';
var redirect_uri = 'https://pretentious-pally.herokuapp.com/callback';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
  res.send("Deployed!");
  //this is a test
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

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
  console.log(req.body);
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
  console.log(req.body);
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

app.get('/callback', (req, res) =>{
  sendTextMessage(res, "You succeeded in authenticating!");
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