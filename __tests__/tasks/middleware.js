'use strict'

var should = require('should')
let path = require('path')
var ActionheroPrototype = require(path.join(__dirname, '/../../actionhero.js'))
var actionhero = new ActionheroPrototype()
var api

var taskParams = {
  foo: 'bar'
}

var middleware = {
  name: 'test-middleware',
  priority: 1000,
  global: false,
  preProcessor: function (next) {
    try {
      var params = this.args[0]
      params.should.be.equal(taskParams)
      params.test = true
      next()
    } catch (e) {
      next(e)
    }
  },
  postProcessor: function (next) {
    try {
      var worker = this.worker
      var params = this.args[0]
      params.test.should.be.equal(true) // Requires disableParamScrubbing or that `test` be a valid param
      var result = worker.result
      result.result.should.equal('done')
      result.result = 'fin'

      next(null, result)
    } catch (e) {
      next(e)
    }
  },
  preEnqueue: function (next) {
    var params = this.args[0]
    if (params.invalid) {
      return next(new Error('Invalid Parameter'), false)
    }
    next()
  }
}

describe('Test: Task Middleware', () => {
  beforeAll((done) => {
    actionhero.start((error, a) => {
      api = a

      api.tasks.addMiddleware(middleware)

      api.tasks.tasks.middlewareTask = {
        name: 'middlewareTask',
        description: 'middlewaretask',
        queue: 'default',
        frequency: 0,
        middleware: ['test-middleware'],
        run: function (api, params, next) {
          params.test.should.exist
          next(null, {result: 'done'})
        }
      }

      api.tasks.jobs.middlewareTask = api.tasks.jobWrapper('middlewareTask')

      done(error)
    })
  })

  afterAll((done) => {
    api.tasks.globalMiddleware = []
    actionhero.stop(() => {
      done()
    })
  })

  it('can modify parameters before a task and modify result after task completion', (done) => {
    api.specHelper.runFullTask('middlewareTask', taskParams, function (error, response) {
      expect(error).toBeNull()
      response.result.should.equal('fin')

      done()
    })
  })

  it('should reject task with improper params', (done) => {
    api.tasks.enqueue('middlewareTask', {invalid: true}, 'test', function (error, toRun) {
      should.exist(error)
      error.message.should.equal('Invalid Parameter')
      api.tasks.queued('test', 0, 10, function (error, tasks) {
        expect(error).toBeNull()
        tasks.length.should.equal(0)
        done()
      })
    })
  })
})
