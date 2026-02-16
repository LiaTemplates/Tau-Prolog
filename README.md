<!--
author:    Andre Dietrich
email:     andre.dietrich@ovgu.de
version:   0.3.1
language:  en
narrator:  US English Female

script:    js/tau-prolog.min.js

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
  
  var result = null;
  window['@0']['session'].consult(db, {
    success: function() {
      result = "database '@0' loaded";
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

@Tau.query
<script>
  var query = `@'input`;
  
  try {
    // Create a new output buffer for this query execution
    var output_buffer = "";
    var custom_output = {
      put: function(text, stream) {
        output_buffer += text;
        return true;
      },
      flush: function() { return true; }
    };
    
    // Override the session's user_output stream
    window['@0']['session'].streams['user_output'].stream = custom_output;
    
    if(window['@0']['query'] == null || window['@0']['query_str'] != query) {
      window['@0']['query_str'] = query;
      window['@0']['query'] = null;
      window['@0']['rslt'] = ""; // Reset results for new query
      
      window['@0']['session'].query(query, {
        success: function(goal) {
          window['@0']['query'] = goal;
          // Get answer immediately after successful query
          window['@0']['session'].answer({
            success: function(answer) {
              if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
              window['@0']['rslt'] += window.pl.format_answer(answer) + ".\n";
              send.lia(window['@0']['rslt'].trim());
            },
            fail: function() {
              if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
              window['@0']['rslt'] += "false.\n";
              send.lia(window['@0']['rslt'].trim());
            },
            error: function(err) {
              if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
              var c_err = window.pl.flatten_error(err);
              window['@0']['rslt'] += "Error: " + c_err.type + "\n";
              send.lia(window['@0']['rslt'].trim());
            },
            limit: function() {
              if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
              window['@0']['rslt'] += "Limit exceeded.\n";
              send.lia(window['@0']['rslt'].trim());
            }
          });
        },
        error: function(err) {
          var c_err = window.pl.flatten_error(err);
          var error = new LiaError("parsing query for '@0' => " + err.args[0], 1);
          error.add_detail(0, c_err.type + " => " + c_err.found + "; expected => " + c_err.expected, "error", c_err.line - 1, c_err.column);
          throw error;
        }
      });
    } else {
      // Query already executed, get next answer
      window['@0']['session'].answer({
        success: function(answer) {
          if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
          window['@0']['rslt'] += window.pl.format_answer(answer) + ".\n";
          send.lia(window['@0']['rslt'].trim());
        },
        fail: function() {
          if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
          window['@0']['rslt'] += "false.\n";
          send.lia(window['@0']['rslt'].trim());
        },
        error: function(err) {
          if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
          var c_err = window.pl.flatten_error(err);
          window['@0']['rslt'] += "Error: " + c_err.type + "\n";
          send.lia(window['@0']['rslt'].trim());
        },
        limit: function() {
          if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
          window['@0']['rslt'] += "Limit exceeded.\n";
          send.lia(window['@0']['rslt'].trim());
        }
      });
    }
  }
  catch(e) {
    throw {message: "'@0' has not been consulted"};
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
can load modules using the `use_module/1` directive. The `library(lists)` provides
common list manipulation predicates.

                         --{{1}}--
You can also use `library(lists)` for common list operations like `append/3`,
`member/2`, `reverse/2`, and `length/2`.

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
The code shows how the macros were implemented by using a minified version of
the Tau-Prolog JavaScript interpreter. If you want to host your own version of
this library, you will have to change the url.
Since [rawgit](https://raw.githubusercontent.com) is going to stop its service,
I recommend [jsDelivr](https://www.jsdelivr.com).

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
  
  var result = null;
  window['@0']['session'].consult(db, {
    success: function() {
      result = "database '@0' loaded";
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

@Tau.query
<script>
  var query = `@'input`;
  
  try {
    // Create a new output buffer for this query execution
    var output_buffer = "";
    var custom_output = {
      put: function(text, stream) {
        output_buffer += text;
        return true;
      },
      flush: function() { return true; }
    };
    
    // Override the session's user_output stream
    window['@0']['session'].streams['user_output'].stream = custom_output;
    
    if(window['@0']['query'] == null || window['@0']['query_str'] != query) {
      window['@0']['query_str'] = query;
      window['@0']['query'] = null;
      window['@0']['rslt'] = ""; // Reset results for new query
      
      window['@0']['session'].query(query, {
        success: function(goal) {
          window['@0']['query'] = goal;
          // Get answer immediately after successful query
          window['@0']['session'].answer({
            success: function(answer) {
              if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
              window['@0']['rslt'] += window.pl.format_answer(answer) + ".\n";
              send.lia(window['@0']['rslt'].trim());
            },
            fail: function() {
              if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
              window['@0']['rslt'] += "false.\n";
              send.lia(window['@0']['rslt'].trim());
            },
            error: function(err) {
              if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
              var c_err = window.pl.flatten_error(err);
              window['@0']['rslt'] += "Error: " + c_err.type + "\n";
              send.lia(window['@0']['rslt'].trim());
            },
            limit: function() {
              if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
              window['@0']['rslt'] += "Limit exceeded.\n";
              send.lia(window['@0']['rslt'].trim());
            }
          });
        },
        error: function(err) {
          var c_err = window.pl.flatten_error(err);
          var error = new LiaError("parsing query for '@0' => " + err.args[0], 1);
          error.add_detail(0, c_err.type + " => " + c_err.found + "; expected => " + c_err.expected, "error", c_err.line - 1, c_err.column);
          throw error;
        }
      });
    } else {
      // Query already executed, get next answer
      window['@0']['session'].answer({
        success: function(answer) {
          if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
          window['@0']['rslt'] += window.pl.format_answer(answer) + ".\n";
          send.lia(window['@0']['rslt'].trim());
        },
        fail: function() {
          if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
          window['@0']['rslt'] += "false.\n";
          send.lia(window['@0']['rslt'].trim());
        },
        error: function(err) {
          if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
          var c_err = window.pl.flatten_error(err);
          window['@0']['rslt'] += "Error: " + c_err.type + "\n";
          send.lia(window['@0']['rslt'].trim());
        },
        limit: function() {
          if(output_buffer) window['@0']['rslt'] += output_buffer + "\n";
          window['@0']['rslt'] += "Limit exceeded.\n";
          send.lia(window['@0']['rslt'].trim());
        }
      });
    }
  }
  catch(e) {
    throw {message: "'@0' has not been consulted"};
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
