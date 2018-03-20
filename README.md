<!--

author:   Andre Dietrich
email:    dietrich@ivs.cs.uni-magdeburg.de
version:  1.0.0
language: en_US
narrator: US English Female

script:   https://cdn.rawgit.com/liaScript/tau-prolog_template/master/js/tau-prolog.js

@tau_prolog_program
<script>
    window['@0'] = window.pl.create();
    var c = window['@0'].consult(`{X}`);
    if( c !== true )
        throw {message: 'parsing program => ' + c.args[0]};
    else
        "database loaded";
</script>
@end

@tau_prolog_query
<script>
    var q = window['@0'].query(`{X}`);
    if( q !== true ) {
        throw {message: 'parsing query => ' + q.args[0]};
    }
    else {
        var rslt = "";
        var c = true;
        var callback = function(answer) {
            if(answer == false)
                c = false;
            else
                rslt += window.pl.format_answer( answer ) + "<br>";
        };
        while(c)
            window['@0'].answer(callback);
        rslt;
    }
</script>
@end


@tau_prolog
```prolog
@2
```
@tau_prolog_program(@0)


```prolog
@1
```
@tau_prolog_query(@0)
@end

-->

# Tau-Prolog Template

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
    window['session'] = window.pl.create();
    var c = window['session'].consult(`{X}`);

    if( c !== true ) {
        throw {message: 'parsing program => ' + c.args[0]};
    }
    else {
        "database loaded";
    }
</script>

** Queries **

```prolog
likes(sam, X).
```
<script>
    var q = window['session'].query(`{X}`);

    if( q !== true ) {
        throw {message: 'parsing query => ' + q.args[0]};
    }
    else {
        var rslt = "";
        var c = true;

        var callback = function(answer) {
            if(answer == false) {
                c = false;
            } else {
                rslt += window.pl.format_answer( answer ) + "<br>";
            }
        };

        while(c) {
            window['session'].answer(callback);
        }
        rslt;
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
@tau_prolog_program(session_name)

** Queries **

```prolog
likes(sam, X).
```
@tau_prolog_query(session_name)


## Full-Macro

```prolog
@tau_prolog(session_nameX,`likes(sam, X).`)
likes(sam, salad).
likes(dean, pie).
likes(sam, apples).
likes(dean, whiskey).
```
