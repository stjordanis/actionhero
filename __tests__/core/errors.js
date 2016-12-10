'use strict'

let path = require('path')
var ActionheroPrototype = require(path.join(__dirname, '/../../actionhero.js'))
var actionhero = new ActionheroPrototype()
var api

describe('Core: Errors', () => {
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

  it('returns string errors properly', (done) => {
    api.specHelper.runAction('notARealAction', {}, (response) => {
      expect(response.error).toBe('Error: unknown action or invalid apiVersion')
      done()
    })
  })

  it('returns Error object properly', (done) => {
    api.config.errors.unknownAction = () => {
      return new Error('error test')
    }
    api.specHelper.runAction('notARealAction', {}, (response) => {
      expect(response.error).toBe('Error: error test')
      done()
    })
  })

  it('returns generic object properly', (done) => {
    api.config.errors.unknownAction = () => {
      return {code: 'error111', reason: 'busted'}
    }
    api.specHelper.runAction('notARealAction', {}, (response) => {
      expect(response.error.code).toBe('error111')
      expect(response.error.reason).toBe('busted')
      done()
    })
  })
})
