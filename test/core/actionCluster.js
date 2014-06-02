var should = require('should');
var actionheroPrototype = require(__dirname + "/../../actionhero.js").actionheroPrototype;

var actionhero1 = new actionheroPrototype();
var actionhero2 = new actionheroPrototype();
var actionhero3 = new actionheroPrototype();

var api_1;
var api_2;
var api_3;

var client1;
var client2;
var client3;

var configChanges = {
  1: {
    general: {id: 'test-server-1'},
    servers: {}
  },
  2: {
    general: {id: 'test-server-2'},
    servers: {}
  },
  3: {
    general: {id: 'test-server-3'},
    servers: {}
  }
}

var startAllServers = function(next){
  actionhero1.start({configChanges: configChanges[1]}, function(err, a1){
    actionhero2.start({configChanges: configChanges[2]}, function(err, a2){
      actionhero3.start({configChanges: configChanges[3]}, function(err, a3){
        api_1 = a1;
        api_2 = a2;
        api_3 = a3;
        next();
      });
    });
  });
}

var stopAllServers = function(next){
  actionhero1.stop(function(){
    actionhero2.stop(function(){
      actionhero3.stop(function(){
        next();
      });
    });
  });
}

var restartAllServers = function(next){
  actionhero1.restart(function(err, a1){
    actionhero2.restart(function(err, a2){
      actionhero3.restart(function(err, a3){
        api_1 = a1;
        api_2 = a2;
        api_3 = a3;
        next();
      });
    });
  });
}

describe('Core: Action Cluster', function(){

  describe('general actionCluster', function(){

    after(function(done){
      stopAllServers(function(){
        done();
      });
    });

    it('Start cluster server #1', function(done){
      actionhero1.start({configChanges: configChanges[1]}, function(err, api){
        api.should.be.an.Object;
        api.id.should.equal('test-server-1');
        done();
      });
    });

    it('Start cluster server #2', function(done){
      actionhero2.start({configChanges: configChanges[2]}, function(err, api){
        api.should.be.an.Object;
        api.id.should.equal('test-server-2');
        done();
      });
    });

    it('Start cluster server #3', function(done){
      actionhero3.start({configChanges: configChanges[3]}, function(err, api){
        api.should.be.an.Object;
        api.id.should.equal('test-server-3');
        done();
      });
    });
  
  });

  describe('servers', function(){

    before(function(done){
      startAllServers(function(){
        done();
      });
    })

    after(function(done){
      stopAllServers(function(){
        done();
      });
    });

    describe('say and clients on separate peers', function(){

      before(function(done){
        client1 = new api_1.specHelper.connection();
        client2 = new api_2.specHelper.connection();
        client3 = new api_3.specHelper.connection();

        client1.verbs('roomAdd','defaultRoom');
        client2.verbs('roomAdd','defaultRoom');
        client3.verbs('roomAdd','defaultRoom');

        setTimeout(function(){
          done();
        }, 500);
      });

      after(function(done){
        client1.destroy();
        client2.destroy();
        client3.destroy();
        setTimeout(function(){
          done();
        }, 500);
      });

      it('all connections can join the default room and client #1 can see them', function(done){
        client1.verbs('roomView', 'defaultRoom', function(err, data){
          data.room.should.equal('defaultRoom');
          data.membersCount.should.equal(3);
          done();
        });
      });

      it('all connections can join the default room and client #2 can see them', function(done){
        client2.verbs('roomView', 'defaultRoom', function(err, data){
          data.room.should.equal('defaultRoom');
          data.membersCount.should.equal(3);
          done();
        });
      });

      it('all connections can join the default room and client #3 can see them', function(done){
        client3.verbs('roomView', 'defaultRoom', function(err, data){
          data.room.should.equal('defaultRoom');
          data.membersCount.should.equal(3);
          done();
        });
      });

      it('clients can communicate across the cluster', function(done){
        if(api_1.config.redis.package == 'fakeredis'){
          // you can't communicate across the cluster with fakeredis
          done();
        } else {
          client1.verbs('say', ['defaultRoom', 'Hi', 'from', 'client', '1'], function(){
            setTimeout(function(){
              var message = client2.messages[(client2.messages.length - 1)];
              message.message.should.equal('Hi from client 1');
              message.room.should.equal('defaultRoom');
              message.from.should.equal(client1.id);
              done();
            }, 500);
          });
        }
      });

    });

    describe('shared cache', function(){

      it('peer 1 writes and peer 2 should read', function(done){
        api_1.cache.save('test_key', 'yay', null, function(err, save_resp){
          api_2.cache.load('test_key', function(err, value){
            value.should.equal('yay');
            done();
          })
        });
      });

      it('peer 3 deletes and peer 1 cannot read any more', function(done){
        api_3.cache.destroy('test_key', function(err, del_resp){
          api_1.cache.load('test_key', function(err, value){
            should.not.exist(value);
            done();
          })
        });
      });

    });

    describe('RPC', function(){

      afterEach(function(done){
        delete api_1.rpcTestMethod;
        delete api_2.rpcTestMethod;
        delete api_3.rpcTestMethod;
        done();
      })

      it('can call remote methods on all other servers in the cluster', function(done){
        if(api_1.config.redis.package == 'fakeredis'){
          // you can't communicate across the cluster with fakeredis
          done();
        }else{
          var data = {};
          api_1.rpcTestMethod = function(arg1, arg2, next){
            data[1] = [arg1, arg2]; next();
          }
          api_2.rpcTestMethod = function(arg1, arg2, next){
            data[2] = [arg1, arg2]; next();
          }
          api_3.rpcTestMethod = function(arg1, arg2, next){
            data[3] = [arg1, arg2]; next();
          }

          api_1.faye.doCluster('api.rpcTestMethod', ['arg1', 'arg2'], null, function(){
            // callback should work too!
            data[1][0].should.equal('arg1');
            data[1][1].should.equal('arg2');
            data[2][0].should.equal('arg1');
            data[2][1].should.equal('arg2');
            data[3][0].should.equal('arg1');
            data[3][1].should.equal('arg2');
            done();
          });
        }
      });

      it('can call remote methods only on one other cluster who holds a specific connectionId', function(done){
        if(api_1.config.redis.package == 'fakeredis'){
          // you can't communicate across the cluster with fakeredis
          done();
        }else{
          client1 = new api_1.specHelper.connection();

          var data = {};
          api_1.rpcTestMethod = function(arg1, arg2, next){
            data[1] = [arg1, arg2]; next();
          }
          api_2.rpcTestMethod = function(arg1, arg2, next){
            throw new Error('should not be here');
          }
          api_3.rpcTestMethod = function(arg1, arg2, next){
            throw new Error('should not be here');
          }

          setTimeout(function(){
            api_2.faye.doCluster('api.rpcTestMethod', ['arg1', 'arg2'], client1.id, function(){
              data[1][0].should.equal('arg1');
              data[1][1].should.equal('arg2');
              client1.destroy();
              done();
            });
          }, 200);
        }
      });

      it('can call remote methods on/about connections connected to other servers', function(done){
        if(api_1.config.redis.package == 'fakeredis'){
          // you can't communicate across the cluster with fakeredis
          done();
        }else{
          client1 = new api_1.specHelper.connection();
          should.not.exist(client1.auth);

          setTimeout(function(){
            api_2.connections.apply(client1.id, 'set', ['auth', true], function(err){
              setTimeout(function(){
                should.not.exist(err);
                client1.auth.should.equal(true);
                client1.destroy();
                done();
              }, 200);
            });
          }, 200);
        }
      })

    });

    describe('chat', function(){

      afterEach(function(done){
        api_1.chatRoom.destroy('newRoom', function(){
          // for(var i in api_1.faye.clusterCallbakTimeouts){
          //   clearTimeout( api_1.faye.clusterCallbakTimeouts[i] );
          //   delete api_1.faye.clusterCallbakTimeouts[i]
          //   delete api_1.faye.clusterCallbaks[i];
          // }
          process.nextTick(function(){ done(); })
        });
      });

      it('can check if rooms exist', function(done){
        api_1.chatRoom.exists('defaultRoom', function(err, found){
          found.should.equal(true);
          done()
        });
      });

      it('can check if a room does not exist', function(done){
        api_1.chatRoom.exists('missingRoom', function(err, found){
          found.should.equal(false);
          done()
        });
      });

      it('server can create new room', function(done){
        var room = 'newRoom';
        api_1.chatRoom.exists(room, function(err, found){
          found.should.equal(false);
          api_1.chatRoom.add(room, function(err){
            api_1.chatRoom.exists(room, function(err, found){
              found.should.equal(true);
              done();
            });
          });
        });
      });

      it('server cannot create already existing room', function(done){
        api_1.chatRoom.add('defaultRoom', function(err){
          String(err).should.equal('room exists');
          done();
        });
      });

      it('server can add connections to a room (local)', function(){
        client1 = new api_1.specHelper.connection();
        client1.rooms.length.should.equal(0);
        process.nextTick(function(){
          api_1.chatRoom.addMember(client1.id, 'defaultRoom', function(err, didAdd){
            didAdd.should.equal(true);
            client1.rooms[0].should.equal('defaultRoom');
            client1.destroy();
            done();
          });
        });
      });

      it('server can add connections to a room (remote)', function(done){
        if(api_1.config.redis.package == 'fakeredis'){
          // you can't communicate across the cluster with fakeredis
          done();
        }else{
          client2 = new api_2.specHelper.connection();
          client2.rooms.length.should.equal(0);
          setTimeout(function(){
            api_1.chatRoom.addMember(client2.id, 'defaultRoom', function(err, didAdd){
              didAdd.should.equal(true);
              client2.rooms[0].should.equal('defaultRoom');
              client2.destroy();
              done();
            });
          }, 200);
        }
      });

      it('will not re-add a member to a room', function(done){
        client1 = new api_1.specHelper.connection();
        client1.rooms.length.should.equal(0);
        process.nextTick(function(){
          api_1.chatRoom.addMember(client1.id, 'defaultRoom', function(err, didAdd){
            didAdd.should.equal(true);
            api_1.chatRoom.addMember(client1.id, 'defaultRoom', function(err, didAdd){
              err.should.equal('connection already in this room');
              didAdd.should.equal(false);
              client1.destroy();
              done();
            });
          });
        });
      });

      it('will not add a member to a non-existant room', function(done){
        client1 = new api_1.specHelper.connection();
        client1.rooms.length.should.equal(0);
        process.nextTick(function(){
          api_1.chatRoom.addMember(client1.id, 'newRoom', function(err, didAdd){
            err.should.equal('room does not exist');
            didAdd.should.equal(false);
            client1.destroy();
            done();
          });
        });
      });

      it('can add authorized members to secure rooms', function(done){
        api_1.chatRoom.add('newRoom', function(err){
          api_1.chatRoom.setAuthenticationPattern('newRoom', 'auth', true, function(err){
            client1 = new api_1.specHelper.connection();
            client1.auth = true;
            process.nextTick(function(){
              api_1.chatRoom.addMember(client1.id, 'newRoom', function(err, didAdd){
                didAdd.should.equal(true);
                client1.destroy();
                done();
              });
            });
          });
        });
      });

      it('will not add a member with bad auth to a secure room', function(done){
        api_1.chatRoom.add('newRoom', function(err){
          api_1.chatRoom.setAuthenticationPattern('newRoom', 'auth', true, function(err){
            client1 = new api_1.specHelper.connection();
            client1.auth = false;
            process.nextTick(function(){
              api_1.chatRoom.addMember(client1.id, 'newRoom', function(err, didAdd){
                didAdd.should.equal(false);
                client1.destroy();
                done();
              });
            });
          });
        });
      })

      it('server will not remove a member not in a room', function(done){
        client1 = new api_1.specHelper.connection();
        process.nextTick(function(){
          api_1.chatRoom.removeMember(client1.id, 'defaultRoom', function(err, didRemove){
            didRemove.should.equal(false);
            client1.destroy();
            done();
          });
        });
      });

      it('server can remove connections to a room (local)', function(done){
        client1 = new api_1.specHelper.connection();
        process.nextTick(function(){
          api_1.chatRoom.addMember(client1.id, 'defaultRoom', function(err, didAdd){
            didAdd.should.equal(true);
            api_1.chatRoom.removeMember(client1.id, 'defaultRoom', function(err, didRemove){
              didRemove.should.equal(true);
              client1.destroy();
              done();
            });
          });
        });
      });

      it('server can remove connections to a room (remote)', function(done){
        if(api_1.config.redis.package == 'fakeredis'){
          // you can't communicate across the cluster with fakeredis
          done();
        }else{
          client2 = new api_2.specHelper.connection();
          setTimeout(function(){
            api_1.chatRoom.addMember(client2.id, 'defaultRoom', function(err, didAdd){
              didAdd.should.equal(true);
              setTimeout(function(){
                api_1.chatRoom.removeMember(client2.id, 'defaultRoom', function(err, didRemove){
                  didRemove.should.equal(true);
                  client2.destroy();
                  done();
                });
              }, 200);
            });
          }, 200);
        }
      });
      
      it('server can destroy a room and connections will be removed', function(done){
        client1 = new api_1.specHelper.connection();
        process.nextTick(function(){
          api_1.chatRoom.add('newRoom', function(err){
            api_1.chatRoom.addMember(client1.id, 'newRoom', function(err, didAdd){
              didAdd.should.equal(true);
              client1.rooms[0].should.equal('newRoom');
              process.nextTick(function(){
                api_1.chatRoom.destroy('newRoom', function(err){
                  client1.rooms.length.should.equal(0);
                  client1.messages[1].message.should.equal('this room has been deleted');
                  client1.messages[1].room.should.equal('newRoom');
                  client1.destroy();
                  done();
                });
              });
            });
          });
        });
      });

      it('can get a list of room members', function(done){
        client1 = new api_1.specHelper.connection();
        client1.rooms.length.should.equal(0);
        process.nextTick(function(){
          api_1.chatRoom.addMember(client1.id, 'defaultRoom', function(err, didAdd){
            api_1.chatRoom.roomStatus('defaultRoom', function(err, data){
              data.room.should.equal('defaultRoom');
              data.membersCount.should.equal(1);
              client1.destroy();
              done();
            });            
          });
        });
      })

      it('server can re-authenticate all connections within a room')
      it('server change auth for a room and all connections will be checked')

    });

  });

});
