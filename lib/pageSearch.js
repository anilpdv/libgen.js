'use strict';

const request = require('request');
const async = require('async');

const ID_REGEX = /ID\:[^0-9]+[0-9]+[^0-9]/g;
const RESULT_REGEX = /[0-9]+\ books\ found/i;

let count = 0;
function extractIds(html) {
  let ids = [];
  const idsResults = html.match(ID_REGEX);
  count++;

  // reverse the order of the results because we walk through them
  // backwards with while(n--)
  idsResults.reverse();
  let n = idsResults.length;

  while (n--) {
    var id = idsResults[n].replace(/[^0-9]/g, '');
    if (!parseInt(id)) return false;
    ids.push(id);
  }

  return ids;
}

function fetchIds(options, callback) {
  if (!options.mirror)
    return callback(new Error('No mirror provided to search function'));
  else if (!options.query) return callback(new Error('No search query given'));
  else if (options.query.length < 4)
    return callback(new Error('Search query must be at least four characters'));

  if (!options.count || !parseInt(options.count)) options.count = 10;

  // sort_by options: 'def', 'title', 'publisher', 'year', 'pages',
  // 'language', 'filesize', 'extension' (must be lowercase)
  const sort = options.sort_by || 'def';

  // search_in options: 'def', 'title', 'author', 'series',
  // 'periodical', 'publisher', 'year', 'identifier', 'md5',
  // 'extension'
  const column = options.search_in || 'def';

  // boolean
  const sortmode = options.reverse ? 'DESC' : 'ASC';

  // page
  const page = options.page || '1';

  const query =
    options.mirror +
    '/search.php?&req=' +
    encodeURIComponent(options.query) +
    // important that view=detailed so we can get the real IDs
    '&view=detailed' +
    '&column=' +
    column +
    '&sort=' +
    sort +
    '&sortmode=' +
    sortmode +
    '&page=' +
    page;

  const httpOptions = {url: query};
  request(httpOptions, (err, response, body) => {
    if (err) return callback(err);
    else if (response.statusCode !== 200)
      return callback(new Error(`Bad response: ${response.statusCode}`));

    let results = body.match(RESULT_REGEX);
    if (results === null)
      return callback(
        new Error('Bad response: could not parse search results'),
      );
    else results = results[0];

    results = parseInt(results.replace(/^([0-9]*).*/, '$1'));

    if (results === 0)
      return callback(new Error(`No results for "${options.query}"`));
    else if (!results)
      return callback(new Error('Could not determine # of search results'));

    let searchIds = extractIds(body);
    if (!searchIds)
      return callback(new Error('Failed to parse search results for IDs'));
    return callback(null, searchIds);
  });
}

module.exports = function(options, callback) {
  async.waterfall(
    [
      function(callback) {
        idFetch(options, (err, data) => {
          if (err) return callback(err);
          return callback(null, data);
        });
      },
    ],
    function(err, results) {
      if (err) return callback(err);
      const httpOptions = {
        url: `${options.mirror}/json.php?ids=${results.join(',')}&fields=*`,
      };
      request(httpOptions, function(err, response, body) {
        if (err) return callback(err);
        else if (response.statusCode !== 200)
          return callback(new Error(`Bad response: ${response.statusCode}`));

        return callback(null, JSON.parse(body));
      });
    },
  );
};
