var helper = require('../../support/spec_helper')
  , expect = require('chai').expect
  , User   = helper.model('user')
  , Feed   = helper.model('feed')
  , async  = require('async')
  , _      = require('underscore')
;

describe("User model", function() {
  it("has basic attributes", function() {
    expect(this.user.email).to.exist;
    expect(this.user.email).to.be.like('default_user@example.com');
  });

  describe(".getOrCreateByProfileData", function() {
    beforeEach(function() {
      this.sampleData = {
        provider: 'google'
        , id: '114554347660386050321'
        , displayName: 'Sophie Foster'
        , name: {
          givenName: 'Sophie'
          , familyName: 'Foster'
        }
        , emails: [
          { value: 'sophie.foster@example.com' }
        ]
      };

      var self = this;
      this.sinon.spy(User, 'create');
      this.sinon.stub(User, 'getOrCreateByProviderId', function(provider, id, done){
        done(null, self.user);
      });
    });

    it("calls .getOrCreateByProviderId", function(done) {
      var self = this;
      User.getOrCreateByProfileData(this.sampleData, function(err, user){
        expect(User.getOrCreateByProviderId).to.have.been.calledWith('google', '114554347660386050321');
        expect(err).to.not.exist;
        expect(user).to.equal(self.user);

        done();
      });
    });

    describe("(user data)", function() {
      beforeEach(function() {
        this.sinon.spy(this.user, 'save');
      });

      describe("when the user data is up to date", function() {
        it("does not alter the user", function(done) {
          this.user.email = 'sophie.foster@example.com';

          var self = this;
          User.getOrCreateByProfileData(this.sampleData, function(err, user){
            expect(self.user.save).to.not.have.been.called;
            done();
          });
        });
      });

      describe("when the user data is NOT up to date", function() {
        it("updates the user", function(done) {
          var self = this;
          User.getOrCreateByProfileData(this.sampleData, function(err, user){
            expect(self.user.save).to.have.been.called;
            expect(self.user.email).to.be.like('sophie.foster@example.com');
            done();
          });
        });
      });
    });

    describe("when required values are missing", function() {
      it("returns an error and no user", function(done){
        User.getOrCreateByProfileData({}, function(err, user){
          expect(err).to.exist;
          expect(user).to.not.exist;
          expect(User.create).not.to.have.been.called;

          done();
        });
      });
    });
  });

  describe(".getOrCreateByProviderId", function() {
    beforeEach(function() {
      this.sinon.stub(User, 'create', function(args, done){
        done(null, {fake: "user"});
      });
    });

    describe("when a user exists with that provider/id", function() {
      beforeEach(function(done) {
        this.user.accounts = [
          { provider: 'google', id: '8675309' }
        ];
        this.user.save(done);
      });

      it("returns that user", function(done) {
        var self = this;
        User.getOrCreateByProviderId('google', '8675309', function(err, user){
          expect(err).to.not.exist;
          expect(user).to.exist;
          expect(user.id).to.be.like(this.user.id);
          expect(User.create).to.not.have.been.called;

          done();
        }.bind(this));
      });
    });

    describe("when a user does not exist with that provider/id", function() {
      it("creates a new user", function(done) {
        var self = this;
        User.getOrCreateByProviderId('google', '1234567', function(err, user){
          expect(User.create).to.have.been.calledWith({
            accounts: [
              { provider: 'google', id: '1234567' }
            ]
          });
          expect(err).to.not.exist;
          expect(user).to.be.like({fake: "user"});

          done();
        });
      });
    });
  });

  describe("#addFeed", function() {
    beforeEach(function(done) {
      Feed.create({
        name: '#addFeed'
        , url: 'http://f.example.com'
      }, function(err, feed){
        this.feed = feed;

        done(err);
      }.bind(this));
    });

    it("adds the feed to the user's feeds", function(done) {
      expect(this.user._feeds).to.have.length(0);

      this.user.addFeed(this.feed._id, function(err, user){
        expect(err).to.not.exist;

        expect(user._feeds).to.have.length(1);

        done();
      }.bind(this));
    });
  });

  describe("#getFeeds", function() {
    beforeEach(function(done) {
      var todo = [];

      todo.push(function(done){
        Feed.create({
          name: 'user feed'
          , url: 'http://g.example.com'
        }, function(err, feed){
          expect(err).to.not.exist;

          this.feed = feed;

          this.user.addFeed(feed, done);
        }.bind(this));
      }.bind(this));

      todo.push(function(done){
        Feed.create({
          name: 'other_feed'
          , url: 'http://h.example.com'
        }, function(err, feed){
          this.feed = feed;
          done(err);
        }.bind(this));
      }.bind(this));

      async.parallel(todo, done);
    });

    it("returns feed objects associated with the user", function(done) {
      this.user.getFeeds(function(err, feeds){
        expect(err).to.not.exist;

        expect(feeds).to.have.length(1);
        expect(_.pluck(feeds, 'name')).to.be.like(['user feed']);

        done();
      });
    });
  });

  describe("#removeFeed", function() {
    describe("when the user has that feed", function() {
      beforeEach(function(done) {
        this.user.addFeed(this.user.id, done);
      });

      it("removes the provided feed", function(done) {
        this.user.removeFeed(this.user.id, function(err, user){
          expect(err).to.not.exist;

          expect(user._feeds).to.have.length(0);

          done();
        });
      });
    });

    describe("when the user does not have that feed", function() {
      it("doesn't do anything", function(done) {
        this.user.removeFeed(this.user.id, function(err, user){
          expect(err).to.not.exist;

          expect(user._feeds).to.have.length(0);

          done();
        });
      });
    });
  });
});
