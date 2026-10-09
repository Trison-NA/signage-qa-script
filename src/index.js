module.exports = {
  ...require('./config'),         // defineSignageConfig, ALL_SIZES, DEFAULT_SIZES
  ...require('./player'),         // mockPlayer
  ...require('./network'),        // mockNetwork, reply
  ...require('./time'),           // zonedTime, toMs, advanceClock
  ...require('./layout'),         // findTextOverflow, findTextOverlap, expectCleanLayout, expectNoTextOverflow, expectNoTextOverlap, box
  ...require('./annotate'),       // description
  ...require('./project'),        // loadSi9n, projectRoot, playwright
  ...require('./suites/baseline'),
  ...require('./suites/layout'),
  ...require('./suites/offline'),
  ...require('./suites/schedule'),
  ...require('./suites/menu')
}
