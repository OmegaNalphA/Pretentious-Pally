const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const apiaiApp = require('apiai')('16315278f9854468a6154ed7d96b50dc');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

app.get('/', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'pally') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  console.log("get webhook");
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'pally') {
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