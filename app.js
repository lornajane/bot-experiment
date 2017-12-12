if (!process.env.SLACK_BOT_TOKEN) {
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
    token: process.env.SLACK_BOT_TOKEN
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

controller.hears(['what channel', 'channel ID'], 'direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Current channel ID: ' + message.channel);
});

/*** Understand reactions ***/

controller.on('reaction_added', function(bot, message) {

    // we really only care about "our" channel but we'll get events from them all!
    if(message.item.channel && message.item.channel == process.env.SLACK_CHANNEL_ID) {
        bot.api.users.info({user: message.user}, function(err, response) {
            user = response.user;
            var reaction = user.name + " reacted with " + message.reaction;
            bot.api.conversations.history({channel: message.item.channel, latest: message.item.ts, inclusive: true, limit:1}, function(err, response) {
                var orig_message = response.messages[0];
                if(orig_message.text) {
                    reaction += " to this message: " + orig_message.text;
                } else {
                    reaction += " to this message: " + orig_message.attachments[0].title;
                }
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
            channel: process.env.SLACK_CHANNEL_ID,
            text: "Someone rang? (I received a web request)"
        };
        bot.say(msg);
    });

    express_webserver.post('/stackoverflow/incoming', function(req, res) {
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
                channel: process.env.SLACK_CHANNEL_ID,
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
