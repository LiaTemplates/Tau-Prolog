// Tau-Prolog core plus all modules, exposed as window.pl for the macros.
const pl = require('tau-prolog')

require('tau-prolog/modules/lists')(pl)
require('tau-prolog/modules/random')(pl)
require('tau-prolog/modules/statistics')(pl)
require('tau-prolog/modules/dom')(pl)
require('tau-prolog/modules/js')(pl)
require('tau-prolog/modules/os')(pl)
require('tau-prolog/modules/charsio')(pl)
require('tau-prolog/modules/format')(pl)
require('tau-prolog/modules/promises')(pl)
require('tau-prolog/modules/concurrent')(pl)

// Like SWI-Prolog, every program gets library(lists) and not/1 without
// use_module. A program's own not/1 or append/3 still takes precedence.
const { Module, Rule, Term, Var, Num } = pl.type

new Module(
  'liascript',
  {
    'not/1': [new Rule(new Term('not', [new Var('G')]), new Term('\\+', [new Var('G')]))],
  },
  ['not/1'],
  { meta_predicates: { 'not/1': new Term('not', [new Num(0, false)]) } },
)

const DEFAULT_LIBRARIES = ['lists', 'liascript']

function useDefaults(thread, contextModule) {
  for (const name of DEFAULT_LIBRARIES) {
    pl.directive['use_module/1'](
      thread,
      new Term('use_module', [new Term('library', [new Term(name)])]),
      { context_module: contextModule },
    )
  }
}

// every new session
const create = pl.create
pl.create = function () {
  const session = create.apply(this, arguments)
  useDefaults(session.thread, 'user')
  // `not goal` without parentheses, as in many textbooks
  pl.directive['op/3'](session.thread, new Term('op', [new Num(900, false), new Term('fy'), new Term('not')]))
  // without an explicit step limit, only the time limit below applies
  if (session.limit === null) {
    session.limit = Number.MAX_SAFE_INTEGER
    session.thread.has_limit = true
    session.thread.current_limit = session.limit
  }
  return session
}

// Time limit per answer: an endless loop ends with the limit callback
// ("Limit exceeded.") instead of freezing the page. Asking for the next
// answer continues the search with a fresh time limit.
pl.time_limit = 2000 // ms
const { Thread } = pl.type
const again = Thread.prototype.again
Thread.prototype.again = function (reset_limit) {
  if (reset_limit !== false) this.deadline = Date.now() + pl.time_limit
  return again.apply(this, arguments)
}
const step = Thread.prototype.step
Thread.prototype.step = function () {
  if (this.deadline && Date.now() > this.deadline) this.current_limit = 0
  return step.apply(this, arguments)
}

// every module defined with :- module(Name, Exports)
const moduleDirective = pl.directive['module/2']
pl.directive['module/2'] = function (thread, atom, options) {
  const result = moduleDirective.apply(this, arguments)
  if (options && options.context_module && options.context_module !== 'user') {
    useDefaults(thread, options.context_module)
  }
  return result
}

window.pl = pl
