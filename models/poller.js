var Feed = require('./feed')
;

function Poller() {
  var self = {};

  self.updateOneFeed = function(done){
    Feed.getOutdated(function(err, feed){
      if (err) return done(err);

      if (!feed) {
        self.requeue(30 * 60 * 1000);
        return done();
      }

      feed.pull(function(err){
        self.requeue(0);

        done(err, feed);
      });
    });
  };

  self.requeue = function(delay){
    global.setTimeout(function(){
      this.updateOneFeed(function(err, feed){
        if (err) { console.error("ERROR: ", err, " while updating feed: ", feed); }
      });
    }.bind(this), delay);
  };

  return self;
}

module.exports = Poller;