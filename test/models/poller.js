var helper = require('../../support/spec_helper')
  , expect = require('chai').expect
  , Poller = helper.model('poller')
  , Feed   = helper.model('feed')
;

describe("Poller model", function() {
  beforeEach(function() {
    this.poller = new Poller();
    this.sinon.stub(this.poller, 'requeue', function(){});
  });

  describe("#updateOneFeed", function() {
    beforeEach(function() {
      this.feed = new Feed();

      this.sinon.stub(this.feed, 'pull', function(done){
        done();
      });

      this.sinon.stub(Feed, 'getOutdated', function(done){
        done(null, this.feed);
      }.bind(this));
    });

    it("calls publish on an outdated feed", function(done) {
      this.poller.updateOneFeed(function(err, feed){
        expect(err).to.not.exist;

        expect(Feed.getOutdated).to.have.been.called;
        expect(this.feed.pull).to.have.been.called;

        done();
      }.bind(this));
    });

    it("queues itself to run again", function(done) {
      this.poller.updateOneFeed(function(err, feed){
        expect(err).to.not.exist;

        expect(this.poller.requeue).to.have.been.calledWith(0);

        done();
      }.bind(this));
    });

    describe("when there are no outdated feeds", function() {
      beforeEach(function() {
        this.feed = null;
      });

      it("queues itself up to run again", function(done) {
        this.poller.updateOneFeed(function(err, feed){
          expect(err).to.not.exist;

          expect(this.poller.requeue).to.have.been.calledWith(30 * 1000);

          done();
        }.bind(this));
      });
    });
  });

  describe("#requeue", function() {
    beforeEach(function() {
      this.sinon.stub(global, 'setTimeout', function(done, delay){
        done();
      });

      this.poller.requeue.restore();

      this.sinon.stub(this.poller, 'updateOneFeed', function(done) {
        done();
      });
    });

    it("updates another feed after an interval", function(done) {
      this.poller.requeue(10);
      expect(global.setTimeout).to.have.been.calledOnce;
      expect(global.setTimeout.firstCall.args[1]).to.equal(10);
      expect(this.poller.updateOneFeed).to.have.been.calledOnce;

      this.poller.requeue(0);
      expect(global.setTimeout).to.have.been.calledTwice;
      expect(global.setTimeout.secondCall.args[1]).to.equal(0);
      expect(this.poller.updateOneFeed).to.have.been.calledTwice;

      done();
    });
  });

  describe("#start", function() {
    it("queues itself", function() {
      this.poller.start();

      expect(this.poller.requeue).to.have.been.calledWith(0);
    });
  });
});
