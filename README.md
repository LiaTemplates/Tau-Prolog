<!--
author:   Andre Dietrich
email:    andre.dietrich@ovgu.de
version:  0.2.0
language: en
narrator: US English Female

script:   https://cdn.jsdelivr.net/gh/LiaScript/tau-prolog_template/js/tau-prolog.min.js

@Tau.program
<script>
  var db = `@input`;
  window['@0'] = {
    session: window.pl.create(),
    query: null,
    rslt: "",
    query_str: "",
    db: db
  };
  var c = window['@0']['session'].consult(db);

  if( c !== true ){
    var err = new LiaError("parsing program '@0' => " + c.args[0], 1);
    var c_err = window.pl.flatten_error(c);
    err.add_detail(0, c_err.type+" => " + c_err.found + "; expected => " +c_err.expected, "error", c_err.line - 1, c_err.column);
    throw err;
  }
  else
    "database '@0' loaded";
</script>
@end

@Tau.query
<script>
  var query = `@input`;
  try {
    if(window['@0']['query'] == null || window['@0']['query_str'] != query) {
      window['@0']['query_str'] = query;
      window['@0']['rslt'] = "";
      window['@0']['query'] = window['@0']['session'].query(query);
    }
  }
  catch(e) {
    throw {message: "'@0' has not been consulted"};
  }
  if( window['@0']['query'] !== true ) {
    //throw {message: "parsing query for '@0' => " + window['@0']['query'].args[0]};
    var err = new LiaError("parsing query for '@0' => " + window['@0']['query'].args[0], 1);
    var c_err = window.pl.flatten_error(window['@0']['query']);
    err.add_detail(0, c_err.type+" => " + c_err.found + "; expected => " +c_err.expected, "error", c_err.line - 1, c_err.column);
    throw err;
  }
  else {
    window['@0']['session'].answer(e => {
      window['@0']['rslt'] +=  window.pl.format_answer(e)+"\n";
    });
    window['@0']['rslt'];
  }
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
  var c = session.consult(db);
  if( c !== true )
    throw {message: "parsing program '@0' => " + c.args[0]};
  session.query(`@1`.replace(/[.]/g, "") + ".");
  let rslt = false;
  session.answer(e => {rslt = window.pl.format_answer( e );});
  rslt == "true ;";
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

# Tau-Prolog template


                         --{{0}}--
This document defines some basic macros for applying the JavaScript
[Tau-Prolog](http://tau-prolog.org) interpreter in
[LiaScript](https://LiaScript.github.io) to make Prolog programs in Markdown
executeable and editable.

__Try it on LiaScript:__

https://liascript.github.io/course/?https://raw.githubusercontent.com/liaScript/tau-prolog_template/master/README.md

__See the project on Github:__

https://github.com/liaScript/tau-prolog_template

                         --{{1}}--
There are three ways to use this template. The easiest way is to use the
`import` statement and the url of the raw text-file of the master branch or any
other branch or version. But you can also copy the required functionionality
directly into the header of your Markdown document, see therefor the
[last slide](#5). And of course, you could also clone this project and change
it, as you wish.

  {{1}}
1. Load the macros via

   `import: https://raw.githubusercontent.com/liaScript/tau-prolog_template/master/README.md`

2. Copy the definitions into your Project

3. Clone this repository on GitHub


## `Tau.program/query`

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

## `Tau`

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
[LiaScript](https://liascript.github.io/course/?https://raw.githubusercontent.com/liaScript/tau-prolog_template/master/README.md#4)
you should see two executable code-blocks and on
[Github](https://github.com/liaScript/tau-prolog_template) you should at least
see a code-block with prolog syntax higlighting.

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

## `Tau.check`

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
@Tau.check(genealogy.pro,`setof(X, @input, [alfred, alwine])`)

## Implementation

                         --{{0}}--
The code shows how the macros were implemented by using a minified version of
the Tau-Prolog JavaScript interpreter. If you want to host your own version of
this library, you will have to change the url.
Since [rawgit](https://raw.githubusercontent.com) is going to stop its service,
I recommend [jsDelivr](https://www.jsdelivr.com).


````html
script: https://cdn.jsdelivr.net/gh/LiaScript/tau-prolog_template/js/tau-prolog.min.js

@Tau.program
<script>
  var db = `@input`;
  window['@0'] = {
    session: window.pl.create(),
    query: null,
    rslt: "",
    query_str: "",
    db: db
  };
  var c = window['@0']['session'].consult(db);

  if( c !== true ){
    var err = new LiaError("parsing program '@0' => " + c.args[0], 1);
    var c_err = window.pl.flatten_error(c);
    err.add_detail(0, c_err.type+" => " + c_err.found + "; expected => " +c_err.expected, "error", c_err.line - 1, c_err.column);
    throw err;
  }
  else
    "database '@0' loaded";
</script>
@end

@Tau.query
<script>
  var query = `@input`;
  try {
    if(window['@0']['query'] == null || window['@0']['query_str'] != query) {
      window['@0']['query_str'] = query;
      window['@0']['rslt'] = "";
      window['@0']['query'] = window['@0']['session'].query(query);
    }
  }
  catch(e) {
    throw {message: "'@0' has not been consulted"};
  }
  if( window['@0']['query'] !== true ) {
    //throw {message: "parsing query for '@0' => " + window['@0']['query'].args[0]};
    var err = new LiaError("parsing query for '@0' => " + window['@0']['query'].args[0], 1);
    var c_err = window.pl.flatten_error(window['@0']['query']);
    err.add_detail(0, c_err.type+" => " + c_err.found + "; expected => " +c_err.expected, "error", c_err.line - 1, c_err.column);
    throw err;
  }
  else {
    window['@0']['session'].answer(e => {
      window['@0']['rslt'] +=  window.pl.format_answer(e)+"\n";
    });
    window['@0']['rslt'];
  }
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
  var c = session.consult(db);
  if( c !== true )
    throw {message: "parsing program '@0' => " + c.args[0]};
  session.query(`@1`.replace(/[.]/g, "") + ".");
  let rslt = false;
  session.answer(e => {rslt = window.pl.format_answer( e );});
  rslt == "true ;";
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
````

                         --{{1}}--
If you want to minimize loading effort in your LiaScript project, you can also
copy this code and paste it into your main comment header, see the code in the
raw file of this document.

{{1}} https://raw.githubusercontent.com/liaScript/tau-prolog_template/master/README.md
