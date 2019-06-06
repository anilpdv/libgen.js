module.exports = {
  mirror: require('./lib/mirror.js'),
  latest: require('./lib/latest.js'),
  random: require('./lib/random.js'),
  search: require('./lib/search.js'),
  pageSearch: require('./lib/pageSearch.js'),
  utils: {
    clean: require('./lib/clean.js'),
    check: require('./lib/check.js'),
  },
};
