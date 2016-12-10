'use strict'

let path = require('path')
let should = require('should')
var ActionheroPrototype = require(path.join(__dirname, '/../../actionhero.js'))
var actionhero = new ActionheroPrototype()
var api

describe('Utils', () => {
  beforeAll((done) => {
    actionhero.start((error, a) => {
      expect(error).toBeNull()
      api = a
      done()
    })
  })

  afterAll((done) => {
    actionhero.stop(() => {
      done()
    })
  })

  it('utils.arrayUniqueify', (done) => {
    var a = [1, 2, 3, 3, 4, 4, 4, 5, 5, 5]
    api.utils.arrayUniqueify(a).should.eql([1, 2, 3, 4, 5])
    done()
  })

  describe('utils.hashMerge', () => {
    var A = {a: 1, b: 2}
    var B = {b: -2, c: 3}
    var C = {a: 1, b: {m: 10, n: 11}}
    var D = {a: 1, b: {n: 111, o: 22}}

    it('simple', (done) => {
      var Z = api.utils.hashMerge(A, B)
      Z.a.should.equal(1)
      Z.b.should.equal(-2)
      Z.c.should.equal(3)
      done()
    })

    it('directional', (done) => {
      var Z = api.utils.hashMerge(B, A)
      Z.a.should.equal(1)
      Z.b.should.equal(2)
      Z.c.should.equal(3)
      done()
    })

    it('nested', (done) => {
      var Z = api.utils.hashMerge(C, D)
      Z.a.should.equal(1)
      Z.b.m.should.equal(10)
      Z.b.n.should.equal(111)
      Z.b.o.should.equal(22)
      done()
    })
  })

  it('utils.objClone', (done) => {
    var a = {
      a: 1,
      b: 2,
      c: {
        first: 1,
        second: 2
      }
    }
    var b = api.utils.objClone(a)
    a.should.eql(b)
    delete a.a
    a.should.not.eql(b)
    done()
  })

  describe('#parseIPv6URI', () => {
    it('address and port', () => {
      var uri = '[2604:4480::5]:8080'
      var parts = api.utils.parseIPv6URI(uri)
      parts.host.should.equal('2604:4480::5')
      parts.port.should.equal(8080)
    })

    it('address without port', () => {
      var uri = '2604:4480::5'
      var parts = api.utils.parseIPv6URI(uri)
      parts.host.should.equal('2604:4480::5')
      parts.port.should.equal(80)
    })

    it('full uri', () => {
      var uri = 'http://[2604:4480::5]:8080/foo/bar'
      var parts = api.utils.parseIPv6URI(uri)
      parts.host.should.equal('2604:4480::5')
      parts.port.should.equal(8080)
    })

    it('failing address', () => {
      var uri = '[2604:4480:z:5]:80'
      try {
        var parts = api.utils.parseIPv6URI(uri)
        console.log(parts)
      } catch (e) {
        e.message.should.equal('failed to parse address')
      }
    })
  })
})
