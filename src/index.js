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

window.pl = pl
