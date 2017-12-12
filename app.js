if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var os = require('os');
var he = require('he');
var striptags = require('striptags');

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
            var reaction = user.name + " reacted with " + message.reaction;
            bot.api.conversations.history({channel: message.item.channel, latest: message.item.ts, inclusive: true, limit:1}, function(err, response) {
                var orig_message = response.messages[0].text;
                reaction += " to this message: " + orig_message;
                console.log(reaction);
            });
        });
    }
});

/** Support incoming web requests **/
controller.setupWebserver(3000, function(err, express_webserver) {
    express_webserver.get('/', function(req, res) {
        res.send('I am a bot');

        var msg = {
            type: "message",
            channel: "C4AB39ABH", // TODO this should be configurable
            text: "Someone rang? (I received a web request)"
        };
        bot.say(msg);
    });

    express_webserver.post('/stackoverflow/incoming', function(req, res) {
        console.log(req.body);
        // only handling the event type "new-question" so far
        var q;

        if(typeof req.body.data !== 'undefined' 
            && typeof req.body.data.question !== 'undefined') {
            q = req.body.data.question;

            var text = "<" + q.link + "| view on stackoverflow> or <https://sodashboard.mybluemix.net/home.html#edit?" + q.question_id + "| view on the dashboard>";
            if(q.body) {
                text += "\n" + striptags(q.body.substring(0,300));
                if(q.body.length > 300) {
                    text += " ...";
                }
            }

            var msg1 = {
                title: he.decode(q.title),
                color: "#e09900",
                text: text,
                fields:
                    [
                    {
                        title: "Author",
                        value: q.owner.display_name,
                        short: true
                    },
                    {   title:"Tagged",
                        value: q.tags.join(", "),
                        short:true
                    }
                    ]
            };
            var msg = {
                type: "message",
                channel: "C4AB39ABH", // TODO this should be configurable
                attachments: [ msg1 ]
            };
            bot.say(msg);
            res.send('OK');
        } else {
            res.status(400);
            res.send('This endpoint expects a specific data structure; see docs');
        }
    });
});
