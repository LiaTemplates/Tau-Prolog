% Example module for the Tau-Prolog LiaScript template.
% Load it with:
% :- use_module('https://raw.githubusercontent.com/liaTemplates/tau-prolog/master/examples/geometry.pl').

:- module(geometry, [area/2, perimeter/2]).

area(square(A), X)      :- X is A * A.
area(rect(A, B), X)     :- X is A * B.
area(circle(R), X)      :- pi(Pi), X is Pi * R * R.

perimeter(square(A), X)  :- X is 4 * A.
perimeter(rect(A, B), X) :- X is 2 * (A + B).
perimeter(circle(R), X)  :- pi(Pi), X is 2 * Pi * R.

pi(3.141592653589793).
