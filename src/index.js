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
  return session
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
