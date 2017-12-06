if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var os = require('os');

var controller = Botkit.slackbot({
// debug: true,
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

/*** Respond to people talking to the bot ***/

controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function(bot, message) {
    bot.api.users.info({user: message.user}, function(err, response) {
        user = response.user;
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

controller.hears(['what channel', 'channel ID'], 'direct_message,direct_mention,mention', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

/*** Understand reactions ***/

controller.on('reaction_added', function(bot, message) {

    // we really only care about "our" channel but we'll get events from them all!
    if(message.item.channel && message.item.channel == "C4AB39ABH") {  // TODO configurable channel name please
        bot.api.users.info({user: message.user}, function(err, response) {
            user = response.user;
            var msg = {
                type: "message",
                channel: "C4AB39ABH", // TODO this should be configurable
                text: user.name + " reacted with " + message.reaction
            }
            bot.api.conversations.history({channel: message.item.channel, latest: message.item.ts, inclusive: true, limit:1}, function(err, response) {
                var orig_message = response.messages[0].text;
                console.log(orig_message);
                msg.text += " to this message: " + orig_message;
                bot.say(msg);
            });
        });
    }
});



/** Support incoming web requests **/
controller.setupWebserver(3000, function(err, express_webserver) {
    express_webserver.get('/', function(req, res) {
        res.send('I am a bot');

        var msg1 = {title: "Going fancy message styleee", color: "#0099cc", author: "Lorna", text: "This is the real message"};
        var msg = {
            type: "message",
            channel: "C4AB39ABH", // TODO this should be configurable
            text: "You pinged me!  Ouch!",
            attachments: [ msg1 ]
        };
        bot.say(msg);
    });
});
