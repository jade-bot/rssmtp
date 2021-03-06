var mongoose   = require('mongoose')
  , Schema     = mongoose.Schema
  , mmh3       = require('murmurhash3')
  , _          = require('underscore')
  , nodemailer = require('nodemailer')
;

var schema = new Schema({
  description: { type: String, required: true, 'default': '' }
  , title:     { type: String, required: true, 'default': '' }
  , link:      { type: String, required: true, 'default': '' }
  , date:      { type: Date, 'default': Date.now }
  , hash:      { type: String, required: true }
  , _feed:     { type: Schema.Types.ObjectId, ref: 'Feed', required: true }
}, {
  //autoIndex: false
});

schema.index({ hash: 1 });

schema.statics.getOrCreate = function(attr, done){
  var toHash = [
    'title: ',  attr.title
    , 'desc: ', attr.description
    , 'feed: ', attr._feed
    , 'link: ', attr.link
  ].join("");

  mmh3.murmur128Hex(toHash, function(err, hash){
    if (err) return done(err);

    attr = _.extend({}, attr, { hash: hash });

    this.findOne({hash: hash}, function(err, article){
      if (err) return done(err);
      if (article) return done(err, article, false);

      this.create(attr, function(err, article){
        done(err, article, true);
      });
    }.bind(this));
  }.bind(this));
};

schema.methods.sendTo = function(feed, users, done) {
  this.asEmailOptions(feed, users, function(err, options){
    var settings = {
      secureConnection: process.env.APP_SMTP_SSL || ''
      , host: process.env.APP_SMTP_HOST || ''
      , port: process.env.APP_SMTP_PORT || ''
    };

    var auth = {
      user: process.env.APP_SMTP_FROM || ''
      , pass: process.env.APP_SMTP_PASS || ''
    };

    if (auth.user && auth.pass) {
      settings.auth = auth;
    }

    var mailer = nodemailer.createTransport("SMTP", settings);
    mailer.sendMail(options, function(err){
      done(err);
    });
  });
};

schema.methods.asEmailOptions = function(feed, users, done) {
  var recipients = _.pluck(users, 'email');
  var feedName = feed.name.replace(/[:<@>,]+/g, '_');
  var from = ['RSS - ', feedName, " <", process.env.APP_SMTP_FROM, ">"].join('');

  var html = [
    '<h1><a href="', this.link, '">', this.title || '', '</a></h1>',
    this.description,
    '<br><br><a href="http://rssmtp.firetaco.com/feed/', feed.id, '">unsubscribe</a>'
  ].join('');

  var data = {
    from: from
    , to: from
    , bcc: recipients
    , subject: this.title.replace(/[:]/g, '_')
    , date: this.date
    , headers: {
      "List-ID": [feed.id, process.env.APP_FQDN].join('.')
      , "List-Unsubscribe": ['http://', process.env.APP_FQDN, '/feed/', feed.id].join('')
      , "List-Subscribe": ['http://', process.env.APP_FQDN, '/feed/', feed.id].join('')
    }
    , html: html
    , generateTextFromHTML: true
  };
  done(null, data);
};

var Article = module.exports = mongoose.model('Article', schema);
