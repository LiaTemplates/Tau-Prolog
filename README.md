<!--

author:   Andre Dietrich
email:    dietrich@ivs.cs.uni-magdeburg.de
version:  1.0.0
language: en
narrator: US English Female

script: https://rawgit.com/andre-dietrich/tau-prolog_template/master/js/tau-prolog.min.js

@tau_prolog_program
<script>

    var db = `@input`;
    window['@0'] = {session: window.pl.create(),
                    query: null,
                    rslt: "",
                    query_str: "",
                    db: db};
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

@tau_prolog_program2
<script>

    var db1 = `@input(0)`;
    var db2 = `@input(1)`;

    window['@0'] = {session: window.pl.create(),
                    query: null,
                    rslt: "",
                    query_str: "",
                    db: db};
    var c = window['@0']['session'].consult(db1+db2);

    if( c !== true ){
        var err = new LiaError("parsing program '@0' => " + c.args[0], 2);
        var c_err = window.pl.flatten_error(c);

        err.add_detail(0, c_err.type+" => " + c_err.found + "; expected => " +c_err.expected, "error", c_err.line - 1, c_err.column);
        throw err;
    }
    else
        "database '@0' loaded";
</script>
@end

@tau_prolog_programX
<script>
    var db = `@1`;
    window['@0'] = {session: window.pl.create(),
                    query: null,
                    rslt: "",
                    query_str: "",
                    db: db};
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

@tau_prolog_query
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

@tau_prolog_check
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

@tau_prolog
```prolog @0
@2
```
@tau_prolog_program(@0)


```prolog Anfrage:
@1
```
@tau_prolog_query(@0)
@end


-->

# Tau-Prolog template

Template for integrating the Tau-Prolog interpreter into LiaScript

## Plain HTML

** Load Database and Rules: **

```prolog
likes(sam, salad).
likes(dean, pie).
likes(sam, apples).
likes(dean, whiskey).
```
<script>
    window["session_name"] = {session: window.pl.create(), query: null, rslt: "", query_str: ""};
    var c = window["session_name"]['session'].consult(`@input`);
    if( c !== true )
        throw {message: 'parsing program => ' + c.args[0]};
    else
        "database loaded";
</script>

** Queries **

```prolog
likes(sam, X).
```
<script>
var query = `@input`;

if(window['session_name']['query'] == null || window['session_name']['query_str'] != query) {
    window['session_name']['query_str'] = query;
    window['session_name']['rslt'] = "";
    window['session_name']['query'] = window['session_name']['session'].query(query);
}

if( window['session_name']['query'] !== true ) {
    throw {message: 'parsing query => ' + window['session_name']['query'].args[0]};
}
else {
    var callback = function(answer) {
        window['session_name']['rslt'] +=  window.pl.format_answer( answer ) + "\n";
    };
    window['session_name']['session'].answer(callback);

    window['session_name']['rslt'];
}
</script>


## Macros-Separated

** Load Database and Rules: **

```prolog
likes(sam, salad).
likes(dean, pie).
likes(sam, apples).
likes(dean, whiskey).
```
@tau_prolog_program(template1)

** Queries **

```prolog
likes(sam, X).
```
@tau_prolog_query(template1)


## Full-Macro

```prolog @tau_prolog(template2,`likes(sam, X).`)
likes(sam, salad).
likes(dean, pie).
likes(sam, apples).
likes(dean, whiskey).
```
