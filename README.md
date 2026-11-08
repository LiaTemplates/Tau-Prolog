<!--
author:    Andre Dietrich
email:     andre.dietrich@ovgu.de
version:   0.3.4
language:  en
narrator:  US English Female

script:    dist/index.js

logo:      http://tau-prolog.org/logo/tauprolog256.png

comment:   Template for integrating the [Tau-Prolog](http://tau-prolog.org/)
           interpreter, which runs on JavaScript, into LiaScript courses.
           Includes macros for loading programs, querying, appending rules,
           and checking quiz answers.

attribute: [Tau-Prolog](http://tau-prolog.org/)
           by [José Antonio Riaza Valverde](http://jariaza.es)
           is licensed under [BSD-3 Clause](http://tau-prolog.org/license)


@Tau.program
<script>
  var db = `@'input`;
  window['@0'] = {
    session: window.pl.create(),
    query: null,
    rslt: "",
    query_str: "",
    db: db
  };
  
  // Modules defined with :- module(Name, Exports) become loadable in every
  // other program via :- use_module(library(Name)). Built-in libraries stay.
  function share_modules(session) {
    var pl = window.pl;
    var own = pl.lia_user_modules = pl.lia_user_modules || {};
    for (var name in session.modules) {
      var mod = session.modules[name];
      if (name === "user" || name === "system" || mod.is_library || mod.lia_imported) continue;
      if (pl.modules.hasOwnProperty(name) && !own[name]) continue;
      own[name] = true;
      (function(name, mod) {
        var deps = Object.keys(mod.modules).filter(function(k) {
          return k !== "user" && k !== "system" && pl.modules.hasOwnProperty(k);
        });
        // every importing program gets its own view of the module
        Object.defineProperty(pl.modules, name, {
          configurable: true,
          enumerable: true,
          get: function() {
            var copy = Object.create(mod);
            copy.modules = {};
            copy.dependencies = deps;
            copy.lia_imported = true;
            return copy;
          }
        });
      })(name, mod);
    }
  }

  var result = null;
  window['@0']['session'].consult(db, {
    url: false,    // the program is text, never a URL or element id
    script: false,
    success: function() {
      result = "database '@0' loaded";
      share_modules(window['@0']['session']);
    },
    error: function(err) {
      var c_err = window.pl.flatten_error(err);
      var error = new LiaError("parsing program '@0' => " + err.args[0], 1);
      error.add_detail(0, c_err.type + " => " + c_err.found + "; expected => " + c_err.expected, "error", c_err.line - 1, c_err.column);
      throw error;
    }
  });
  
  result;
</script>
@end

@Tau.program_append
<script>
  var additional_db = `@'input`;
  
  try {
    var session = window['@0']['session'];
    if (!session) {
      throw {message: "'@0' has not been initialized. Use @Tau.program first."};
    }
  }
  catch(e) {
    throw {message: "'@0' has not been consulted. Use @Tau.program first."};
  }
  
  var result = null;
  session.consult(additional_db, {
    url: false,    // the program is text, never a URL or element id
    script: false,
    success: function() {
      // Append to stored database for @Tau.check compatibility
      window['@0']['db'] += "\n" + additional_db;
      result = "additional rules appended to '@0'";
    },
    error: function(err) {
      var c_err = window.pl.flatten_error(err);
      var error = new LiaError("parsing additional program for '@0' => " + err.args[0], 1);
      error.add_detail(0, c_err.type + " => " + c_err.found + "; expected => " + c_err.expected, "error", c_err.line - 1, c_err.column);
      throw error;
    }
  });
  
  result;
</script>
@end

@Tau.query: @Tau.run_(@0,false)

@Tau.trace: @Tau.run_(@0,true)

@Tau.run_
<script>
  var query = `@'input`;
  var trace = @1;
  var db = window['@0'];
  if (!db || !db.session) {
    throw {message: "'@0' has not been consulted. Use @Tau.program first."};
  }
  var session = db.session;
  var thread = session.thread;

  // collect write/1 output of this run
  var output_buffer = "";
  session.streams['user_output'].stream = {
    put: function(text) { output_buffer += text; return true; },
    flush: function() { return true; }
  };

  // print the resolution steps since the last answer to the console
  function show_trace() {
    var states = thread.debugger_states;
    var max = 500;
    for (; db.traced < states.length; db.traced++) {
      var i = db.traced, state = states[i];
      if (state.goal === null) continue;
      if (i >= max) {
        console.log("… " + (states.length - i) + " more steps not shown");
        db.traced = Infinity;
        break;
      }
      // show the query's own variable names instead of _1, _2, …
      var names = {};
      for (var name in state.substitution.links) {
        var value = state.substitution.links[name];
        if (window.pl.type.is_variable(value)) names[value.id] = new window.pl.type.Var(name);
      }
      var goal = state.goal.apply(new window.pl.type.Substitution(names));
      var redo = i > 0 && state.parent !== states[i - 1];
      console.log(String(i + 1).padStart(4) + (redo ? " ↩ " : "   ") + goal.toString({session: session, quoted: true}));
    }
  }

  function finish(text) {
    if (trace) {
      show_trace();
      console.log("     ⇒ " + text);
    }
    if (output_buffer) db.rslt += output_buffer + "\n";
    db.rslt += text + "\n";
    send.lia(db.rslt.trim());
  }

  var handlers = {
    success: function(answer) { finish(window.pl.format_answer(answer) + "."); },
    fail:    function() { finish("false."); },
    error:   function(err) { finish("Error: " + window.pl.flatten_error(err).type); },
    limit:   function() { finish("Limit exceeded."); }
  };

  thread.debugger = trace;
  var key = (trace ? "trace:" : "query:") + query;

  if (db.query == null || db.query_str != key) {
    // new query: start over
    db.query_str = key;
    db.query = null;
    db.rslt = "";
    db.traced = 0;
    session.query(query, {
      success: function(goal) {
        db.query = goal;
        session.answer(handlers);
      },
      error: function(err) {
        var c_err = window.pl.flatten_error(err);
        var error = new LiaError("parsing query for '@0' => " + err.args[0], 1);
        error.add_detail(0, c_err.type + " => " + c_err.found + "; expected => " + c_err.expected, "error", c_err.line - 1, c_err.column);
        throw error;
      }
    });
  } else {
    // same query again: next answer
    session.answer(handlers);
  }

  "LIA: wait";
</script>
@end

@Tau.check
<script>
  var db = null;
  try {
    db = window['@0']['db'];
  }
  catch(e) {
    throw {message: "'@0' has not been consulted"};
  }
  var session = window.pl.create();
  
  session.consult(db, {
    url: false,    // the program is text, never a URL or element id
    script: false,
    success: function() {
      session.query(`@1`.replace(/[.]/g, "") + ".", {
        success: function(goal) {
          session.answer({
            success: function(answer) {
              var rslt = window.pl.format_answer(answer);
              send.lia(rslt);
            },
            fail: function() {
              send.lia("false");
            },
            error: function(err) {
              send.lia(err.message);
            },
            limit: function() {
              send.lia("false");
            }
          });
        },
        error: function(err) {
          throw {message: "parsing query for '@0' => " + err.args[0]};
        }
      });
    },
    error: function(err) {
      throw {message: "parsing program '@0' => " + err.args[0]};
    }
  });
  
  "LIA: wait";
</script>
@end

@Tau
```prolog @0
@2
```
@Tau.program(@0)


```prolog Query:
@1
```
@Tau.query(@0)
@end

-->

# Tau-Prolog - Template


                         --{{0}}--
This document defines some basic macros for applying the JavaScript
[Tau-Prolog](http://tau-prolog.org) interpreter in
[LiaScript](https://LiaScript.github.io) to make Prolog programs in Markdown
executeable and editable.

__Try it on LiaScript:__

https://liascript.github.io/course/?https://raw.githubusercontent.com/liaTemplates/tau-prolog/master/README.md

__See the project on Github:__

https://github.com/liaTemplates/tau-prolog

                         --{{1}}--
There are three ways to use this template. The easiest way is to use the
`import` statement and the url of the raw text-file of the master branch or any
other branch or version. But you can also copy the required functionionality
directly into the header of your Markdown document, see therefor the
[last slide](#5). And of course, you could also clone this project and change
it, as you wish.

  {{1}}
1. Load the macros via

   `import: https://raw.githubusercontent.com/liaTemplates/tau-prolog/master/README.md`

2. Copy the definitions into your Project

3. Clone this repository on GitHub


## `@Tau.program/query`

                         --{{0}}--
To use the [Tau-Prolog](http://tau-prolog.org) interpreter, two macros are
necessary. The first one is `@Tau.program`, which is called with a unique
identifier. It defines the basic Prolog-program with all rules and definitions.

```prolog bouquet.pro
red(rose).
yellow(tulip).
white(carnation).
blue(myosotis).
blue(viola).
```
@Tau.program(bouquet.pro)

                         --{{1}}--
`@Tau.query`, as the name suggests, allows it to query your program, therefor it
has to be called with the unique identifier, that was used to refere to the
program.

                           {{1}}
```prolog
red(rose).
```
@Tau.query(bouquet.pro)

                         --{{2}}--
This way it is possible to define multiple separated queries, at different
places, which make use of the same Prolog-program, as in this case
`bouquet.pro`.

                           {{2}}
```prolog
blue(Flower).
```
@Tau.query(bouquet.pro)

### `use_module`

                         --{{0}}--
Tau-Prolog includes several library modules that extend its functionality. You
can load them with the `use_module/1` directive, for example
`:- use_module(library(random)).` All of them are part of this template.
As in SWI-Prolog, `lists` is always loaded, and `not/1` works as another name
for `\+`. `not` is also a prefix operator, so `not member(X, L)` works without
parentheses, as in many textbooks. If your program defines its own `append/3`
or `not/1`, your definition is used.

| Module       | Predicates (selection)                                                                 |
| ------------ | -------------------------------------------------------------------------------------- |
| `lists`      | `append/3`, `member/2`, `length/2`, `reverse/2`, `nth0/3`, `sum_list/2`, `maplist/2-8` |
| `random`     | `random/1`, `random_between/3`, `random_member/2`, `random_permutation/2`              |
| `format`     | `format/2`, `format/3`                                                                 |
| `statistics` | `time/1`, `statistics/0`, `statistics/2`                                               |
| `charsio`    | `write_term_to_chars/3`                                                                |
| `js`         | `global/1`, `prop/2`, `apply/3`, `json_prolog/2`, `ajax/3`                             |
| `dom`        | `get_by_id/2`, `set_html/2`, `add_class/2`, `bind/4`                                   |
| `os`         | `sleep/1`, `set_timeout/3`, `set_interval/3`                                           |
| `concurrent` | `future/3`, `await/2`, `future_all/2`                                                  |

                         --{{1}}--
The `library(lists)` provides common list operations like `append/3`,
`member/2`, `reverse/2`, and `length/2`. Loading it explicitly is optional.

                           {{1}}
```prolog lists_demo.pro
:- use_module(library(lists)).

combine_lists(L1, L2, Result) :-
    append(L1, L2, Result).

list_length(List, N) :-
    length(List, N).
```
@Tau.program(lists_demo.pro)

                         --{{2}}--
Now you can query the list operations. The `append/3` predicate concatenates
two lists, and `length/2` determines the length of a list.

                           {{2}}
```prolog
combine_lists([1,2,3], [4,5,6], Result).
```
@Tau.query(lists_demo.pro)

                         --{{3}}--
You can also check if an element is a member of a list using the `member/2`
predicate from the lists module.

                           {{3}}
```prolog
member(X, [apple, banana, cherry]).
```
@Tau.query(lists_demo.pro)

                         --{{4}}--
`not/1` succeeds if its goal cannot be proven. It is the same as `\+`. The
parentheses are optional: `not member(kiwi, [apple, banana, cherry])` works
too.

                           {{4}}
```prolog
not member(kiwi, [apple, banana, cherry]).
```
@Tau.query(lists_demo.pro)

### Endless loops

                         --{{0}}--
A query that runs for more than two seconds without an answer stops with
`Limit exceeded.` instead of freezing the page. Run the query again to keep
searching for another two seconds. A `@Tau.check` that hits the limit counts as
`false`. To allow longer searches, set the time in milliseconds in a script of
your course, for example `window.pl.time_limit = 10000`.

```prolog natural.pro
natural(0).
natural(N) :- natural(M), N is M + 1.
```
@Tau.program(natural.pro)

                         --{{1}}--
There is no negative natural number, but the program does not know that. It
keeps counting until the time limit stops it.

                           {{1}}
```prolog
natural(N), N < 0.
```
@Tau.query(natural.pro)

### Own modules

                         --{{0}}--
A program that starts with `:- module(Name, Exports).` defines its own module.
Only the exported predicates are visible outside of it. Every other program
can load it with `:- use_module(library(Name)).`, just like a built-in
library. The program with the module has to be loaded first, so put it on the
same slide or on an earlier one.

```prolog stats.pro
:- module(stats, [mean/2]).
:- use_module(library(lists)).

mean(List, Mean) :-
    sum_list(List, Sum),
    length(List, N),
    Mean is Sum / N.
```
@Tau.program(stats.pro)

                         --{{1}}--
This program loads the module `stats` and uses its predicate `mean/2`. Only
the exported predicates of `stats` are visible here.

                           {{1}}
```prolog grades.pro
:- use_module(library(stats)).

grades(ann, [1, 2, 2]).
grades(bob, [3, 4]).

average(Person, Mean) :-
    grades(Person, List),
    mean(List, Mean).
```
@Tau.program(grades.pro)

                           {{1}}
```prolog
average(Person, Mean).
```
@Tau.query(grades.pro)

                         --{{2}}--
Modules can also be loaded from a URL. The file is fetched when the program is
loaded. Use an absolute URL; relative paths are not resolved against the
course.

                           {{2}}
```prolog shapes.pro
:- use_module('https://raw.githubusercontent.com/liaTemplates/tau-prolog/master/examples/geometry.pl').

larger(A, B) :- area(A, X), area(B, Y), X > Y.
```
@Tau.program(shapes.pro)

                           {{2}}
```prolog
larger(circle(1), square(1.5)).
```
@Tau.query(shapes.pro)

## `@Tau.program_append`

                         --{{0}}--
Sometimes you want to add additional rules or facts to an existing Prolog
database without creating a new session. The `@Tau.program_append` macro allows
you to append code to an already loaded program. This is useful for incrementally
building up a knowledge base or adding new rules based on previous definitions.

```prolog animals.pro
% Basic animal facts
animal(cat).
animal(dog).
animal(bird).

% Initial classification
mammal(cat).
mammal(dog).
```
@Tau.program(animals.pro)

                         --{{1}}--
After loading the initial program, you can query it to see the basic facts.

                           {{1}}
```prolog
animal(X).
```
@Tau.query(animals.pro)

                         --{{2}}--
Now we can append additional rules to the same session using `@Tau.program_append`.
This adds new facts and rules without replacing the existing database.

                           {{2}}
```prolog
% Add more animals
animal(fish).
animal(snake).

% Add more classifications
can_fly(bird).
can_swim(fish).

% Add a rule based on existing facts
pet(X) :- mammal(X).
```
@Tau.program_append(animals.pro)

                         --{{3}}--
The appended code is now part of the session. You can query both old and new
predicates together.

                           {{3}}
```prolog
pet(X).
```
@Tau.query(animals.pro)

                         --{{4}}--
You can also query the newly added predicates.

                           {{4}}
```prolog
can_fly(X).
```
@Tau.query(animals.pro)

## `@Tau.trace`

                         --{{0}}--
`@Tau.trace` works like `@Tau.query`, but it also shows every resolution step
in the console below the code block. Each line lists the goals that are still
open, and the variables of your query keep their names. A line marked with an
arrow means that Prolog backtracked to try another clause. Run it again to get
the next answer and the steps that lead to it.

```prolog family.pro
parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).
parent(pat, jim).

grandparent(X, Z) :- parent(X, Y), parent(Y, Z).
```
@Tau.program(family.pro)

                         --{{1}}--
Who is a grandparent of ann? Watch how Prolog first finds tom and then, when
you ask for more answers, tries the remaining parents one after another.

                           {{1}}
```prolog
grandparent(X, ann).
```
@Tau.trace(family.pro)

                         --{{2}}--
The trace also shows how arithmetic is evaluated step by step, and how the
recursion builds up and is resolved again.

                           {{2}}
```prolog factorial.pro
factorial(0, 1).
factorial(N, F) :-
    N > 0,
    N1 is N - 1,
    factorial(N1, F1),
    F is N * F1.
```
@Tau.program(factorial.pro)

                           {{2}}
```prolog
factorial(3, F).
```
@Tau.trace(factorial.pro)

### Tracing with `write/1`

                         --{{0}}--
For your own trace messages, you can use the built-in `write/1` and `nl/0`
predicates directly in your rules. Their output is shown together with the
answer.

```prolog trace_example.pro
factorial(0, 1) :-
    write('Base case: 0! = 1'), nl.
factorial(N, F) :-
    N > 0,
    write('Computing '), write(N), write('!'), nl,
    N1 is N - 1,
    factorial(N1, F1),
    F is N * F1,
    write('Result: '), write(N), write('! = '), write(F), nl.
```
@Tau.program(trace_example.pro)

                         --{{1}}--
Now when you query this version, you'll see the trace output showing the
execution path.

                           {{1}}
```prolog
factorial(4, F).
```
@Tau.query(trace_example.pro)

## `@Tau`

                         --{{0}}--
If you want to use the previous macros in combination, by creating the program
module and query module with one call, you can use the following notation. The
`@Tau` macro in the header is used to define a block-macro, whereby the
identifier and an initial value for the query are defined within. The code-block
defines the third parameter, which is used to define the program.

```` markdown
```prolog @Tau(holiday.pro,`% goes_to(Who, france).`)
goes_to(axel,england).
goes_to(beate,greece).
goes_to(beate,turkey).
goes_to(clemens,france).
goes_to(dagmar,italy).
goes_to(elmar,france).
goes_to(frederike,france).
```
````

                         --{{1}}--
Thus, on
[LiaScript](https://liascript.github.io/course/?https://raw.githubusercontent.com/liaTemplates/tau-prolog/master/README.md#4)
you should see two executable code-blocks and on
[Github](https://github.com/liaTemplates/tau-prolog) you should at least see a
code-block with prolog syntax higlighting.

                           {{1}}
```prolog @Tau(holiday.pro,`% goes_to(Who, france).`)
goes_to(axel,england).
goes_to(beate,greece).
goes_to(beate,turkey).
goes_to(clemens,france).
goes_to(dagmar,italy).
goes_to(elmar,france).
goes_to(frederike,france).
```

## `@Tau.check`

                         --{{0}}--
You can use `@Tau.check` to check the input of a text quiz input for example.

```prolog genealogy.pro
male(adam).
male(alfred).
male(anton).
male(arthur).
male(baldur).
male(bernd).
male(boris).

female(adele).
female(alwine).
female(anna).
female(ariadne).
female(barbara).
female(berta).

/* parent(X,Y) means: Y is a parent of X */

parent(baldur,adam).
parent(baldur,adele).
parent(barbara,alfred).
parent(barbara,alwine).
parent(bernd,anton).
parent(bernd,anna).
parent(berta,arthur).
parent(berta,ariadne).
parent(boris,arthur).
parent(boris,ariadne).
```
@Tau.program(genealogy.pro)

---

__Type in the Prolog-query for identifying the parents of barbara.__

    [[parent(barbara, X).]]
@Tau.check(genealogy.pro,`setof(X, @'input, [alfred, alwine])`)

## Implementation

                         --{{0}}--
The code shows how the macros were implemented. Tau-Prolog is installed via npm
and bundled together with all of its modules into `dist/index.js` (see
`src/index.js` and `package.json`), which sets `window.pl`. Run `npm install`
and `npm run build` to rebuild it.

`````` markdown
@Tau.program
<script>
  var db = `@'input`;
  window['@0'] = {
    session: window.pl.create(),
    query: null,
    rslt: "",
    query_str: "",
    db: db
  };
  
  // Modules defined with :- module(Name, Exports) become loadable in every
  // other program via :- use_module(library(Name)). Built-in libraries stay.
  function share_modules(session) {
    var pl = window.pl;
    var own = pl.lia_user_modules = pl.lia_user_modules || {};
    for (var name in session.modules) {
      var mod = session.modules[name];
      if (name === "user" || name === "system" || mod.is_library || mod.lia_imported) continue;
      if (pl.modules.hasOwnProperty(name) && !own[name]) continue;
      own[name] = true;
      (function(name, mod) {
        var deps = Object.keys(mod.modules).filter(function(k) {
          return k !== "user" && k !== "system" && pl.modules.hasOwnProperty(k);
        });
        // every importing program gets its own view of the module
        Object.defineProperty(pl.modules, name, {
          configurable: true,
          enumerable: true,
          get: function() {
            var copy = Object.create(mod);
            copy.modules = {};
            copy.dependencies = deps;
            copy.lia_imported = true;
            return copy;
          }
        });
      })(name, mod);
    }
  }

  var result = null;
  window['@0']['session'].consult(db, {
    url: false,    // the program is text, never a URL or element id
    script: false,
    success: function() {
      result = "database '@0' loaded";
      share_modules(window['@0']['session']);
    },
    error: function(err) {
      var c_err = window.pl.flatten_error(err);
      var error = new LiaError("parsing program '@0' => " + err.args[0], 1);
      error.add_detail(0, c_err.type + " => " + c_err.found + "; expected => " + c_err.expected, "error", c_err.line - 1, c_err.column);
      throw error;
    }
  });
  
  result;
</script>
@end

@Tau.program_append
<script>
  var additional_db = `@'input`;
  
  try {
    var session = window['@0']['session'];
    if (!session) {
      throw {message: "'@0' has not been initialized. Use @Tau.program first."};
    }
  }
  catch(e) {
    throw {message: "'@0' has not been consulted. Use @Tau.program first."};
  }
  
  var result = null;
  session.consult(additional_db, {
    url: false,    // the program is text, never a URL or element id
    script: false,
    success: function() {
      // Append to stored database for @Tau.check compatibility
      window['@0']['db'] += "\n" + additional_db;
      result = "additional rules appended to '@0'";
    },
    error: function(err) {
      var c_err = window.pl.flatten_error(err);
      var error = new LiaError("parsing additional program for '@0' => " + err.args[0], 1);
      error.add_detail(0, c_err.type + " => " + c_err.found + "; expected => " + c_err.expected, "error", c_err.line - 1, c_err.column);
      throw error;
    }
  });
  
  result;
</script>
@end

@Tau.query: @Tau.run_(@0,false)

@Tau.trace: @Tau.run_(@0,true)

@Tau.run_
<script>
  var query = `@'input`;
  var trace = @1;
  var db = window['@0'];
  if (!db || !db.session) {
    throw {message: "'@0' has not been consulted. Use @Tau.program first."};
  }
  var session = db.session;
  var thread = session.thread;

  // collect write/1 output of this run
  var output_buffer = "";
  session.streams['user_output'].stream = {
    put: function(text) { output_buffer += text; return true; },
    flush: function() { return true; }
  };

  // print the resolution steps since the last answer to the console
  function show_trace() {
    var states = thread.debugger_states;
    var max = 500;
    for (; db.traced < states.length; db.traced++) {
      var i = db.traced, state = states[i];
      if (state.goal === null) continue;
      if (i >= max) {
        console.log("… " + (states.length - i) + " more steps not shown");
        db.traced = Infinity;
        break;
      }
      // show the query's own variable names instead of _1, _2, …
      var names = {};
      for (var name in state.substitution.links) {
        var value = state.substitution.links[name];
        if (window.pl.type.is_variable(value)) names[value.id] = new window.pl.type.Var(name);
      }
      var goal = state.goal.apply(new window.pl.type.Substitution(names));
      var redo = i > 0 && state.parent !== states[i - 1];
      console.log(String(i + 1).padStart(4) + (redo ? " ↩ " : "   ") + goal.toString({session: session, quoted: true}));
    }
  }

  function finish(text) {
    if (trace) {
      show_trace();
      console.log("     ⇒ " + text);
    }
    if (output_buffer) db.rslt += output_buffer + "\n";
    db.rslt += text + "\n";
    send.lia(db.rslt.trim());
  }

  var handlers = {
    success: function(answer) { finish(window.pl.format_answer(answer) + "."); },
    fail:    function() { finish("false."); },
    error:   function(err) { finish("Error: " + window.pl.flatten_error(err).type); },
    limit:   function() { finish("Limit exceeded."); }
  };

  thread.debugger = trace;
  var key = (trace ? "trace:" : "query:") + query;

  if (db.query == null || db.query_str != key) {
    // new query: start over
    db.query_str = key;
    db.query = null;
    db.rslt = "";
    db.traced = 0;
    session.query(query, {
      success: function(goal) {
        db.query = goal;
        session.answer(handlers);
      },
      error: function(err) {
        var c_err = window.pl.flatten_error(err);
        var error = new LiaError("parsing query for '@0' => " + err.args[0], 1);
        error.add_detail(0, c_err.type + " => " + c_err.found + "; expected => " + c_err.expected, "error", c_err.line - 1, c_err.column);
        throw error;
      }
    });
  } else {
    // same query again: next answer
    session.answer(handlers);
  }

  "LIA: wait";
</script>
@end

@Tau.check
<script>
  var db = null;
  try {
    db = window['@0']['db'];
  }
  catch(e) {
    throw {message: "'@0' has not been consulted"};
  }
  var session = window.pl.create();
  
  session.consult(db, {
    url: false,    // the program is text, never a URL or element id
    script: false,
    success: function() {
      session.query(`@1`.replace(/[.]/g, "") + ".", {
        success: function(goal) {
          session.answer({
            success: function(answer) {
              var rslt = window.pl.format_answer(answer);
              send.lia(rslt);
            },
            fail: function() {
              send.lia("false");
            },
            error: function(err) {
              send.lia(err.message);
            },
            limit: function() {
              send.lia("false");
            }
          });
        },
        error: function(err) {
          throw {message: "parsing query for '@0' => " + err.args[0]};
        }
      });
    },
    error: function(err) {
      throw {message: "parsing program '@0' => " + err.args[0]};
    }
  });
  
  "LIA: wait";
</script>
@end

@Tau
```prolog @0
@2
```
@Tau.program(@0)


```prolog Query:
@1
```
@Tau.query(@0)
@end
``````
                         --{{1}}--
If you want to minimize loading effort in your LiaScript project, you can also
copy this code and paste it into your main comment header, see the code in the
raw file of this document.

{{1}} https://raw.githubusercontent.com/liaTemplates/tau-prolog/master/README.md
