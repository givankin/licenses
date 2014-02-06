'use strict';

var debug = require('debug')('licenses::parser')
  , normalized = require('./normalize')
  , fuse = require('fusing')
  , fs = require('fs');

/**
 * The base parser class where all parsers inherit from. This provides some
 * common functionality which the parsers can use to detect licensing.
 *
 * @constructor
 * @param {Object} parsers An object which contains all available parsers.
 * @api public
 */
function Parser(parsers) {
  if (!(this instanceof Parser)) return new Parser(parsers);

  this.parsers = parsers;
}

fuse(Parser);

/**
 * Expose some core modules through the instance.
 *
 * @type {Function}
 * @api pubilc
 */
Parser.readable('async', require('async'));
Parser.readable('request', require('request'));

/**
 * Simple regular expression based tests for figuring out which license we're
 * dealing with.
 *
 * @param {String} str
 * @returns {Array}
 * @api public
 */
Parser.readable('test', function test(str) {
  if (/BSD/.test(str)) return ['BSD'];
  if (/GPL/.test(str) || /GPLv2/.test(str)) return ['GPL'];
  if (/LGPL/.test(str)) return ['LGPL'];
  if (/MIT/.test(str) || /\(MIT\)/.test(str)) return ['MIT'];
  if (/Apache\s?Licen[cs]e/.test(str)) return ['Apache'];
  if (/MPL/.test(str)) return ['MPL'];

  //
  // Watch out we've got a bad-ass over here.
  //
  if (/DO\sWHAT\sTHE\sFUCK\sYOU\sWANT\sTO\sPUBLIC\sLICEN[CS]E/i.test(str)
   || /WTFPL/.test(str)
  ) return ['WTFPL'];
});

/**
 * There are 1000 ways of writing that you're using an MIT module. This
 * normalization module attempts to normalize the licenses in to one common
 * name.
 *
 * @param {Array} data A list of license information that needs to be normalized.
 * @api public
 */
Parser.readable('normalize', function normalize(data) {
  if (!data) return data;

  //
  // First we need to pass the data through our dual license checker so can
  // figure out if the module is dual licensed as both license values needs to
  // be normalized.
  return this.dual(data).map(function map(license) {
    //
    // 1. Direct match. Check for direct matches against our normalized license
    //    file.
    //
    if (license in normalized) {
      debug('normalized %s to %s using the "direct match" method', license, normalized[license]);
      return normalized[license];
    }

    //
    // 2. toUpperCase. Transform the given license string and the key of
    //    normalization to lowercase to see if it matches.
    //
    var transformed = license.toUpperCase();
    if (transformed in normalized) {
      debug('normalized %s to %s using the "transform" method', license, normalized[transformed]);
      return normalized[transformed];
    }

    return license;
  });
});

/**
 * Find an URL in the data structure.
 *
 * @param {Object} data Data structure
 * @param {String} contains A string that the URL should contain.
 * @api public
 */
Parser.readable('url', function url(data, contains) {
  if (!data) return undefined;

  if ('string' === typeof data && ~data.indexOf(contains)) return data;
  if ('object' === typeof data) {
    if ('url' in data) return url(data.url, contains);
    if ('web' in data) return url(data.web, contains);
  }

  return undefined;
});

/**
 * Check for potential dual licensing in the given license arrays. Most people
 * specify them in their package.json as : MIT/GPL because the `npm init`
 * doesn't really allow dual licensing.
 *
 * It supports the following possibilities:
 *
 * - MIT/GPL
 * - MIT and GPL
 * - MIT or GPL
 * - MIT, GPL
 *
 * @param {Array} licenses
 * @returns {Array} licenses
 * @api public
 */
Parser.readable('dual', function dual(licenses) {
  var licensing = [];

  if (!licenses) return [];

  return licenses.reduce(function reduce(licenses, license) {
    license = (license || '').trim();
    if (!license) return;

    Array.prototype.push.apply(
      licenses,
      license.split(/\s{0,}(?:\/|and|or|,)\s{0,}/g)
    );

    return licenses;
  }, []).filter(function duplicate(item, index, all) {
    if (!item) return false;
    return all.indexOf(item) === index;
  });
});

/**
 */
Parser.readable('tokenizer', function tokenizer(str, amount) {
  var tokens = str.toLowerCase().split(/\W+/g).filter(Boolean);

  if (!amount) return tokens.join('');

  return tokens.reduce(function reduce(words, word, index) {
    if (!reduce.index) reduce.index = 0;
    if (!reduce.position) {
      reduce.position = 0;
      words.push([]);
    }

    words[reduce.index][++reduce.position] = word;

    //
    // We've reached our maximum amount of words that we allow for matching so
    // we need to concat our collection of words in to a single string to
    // improve matching.
    //
    if (reduce.position === amount || index === (tokens.length - 1)) {
      words[reduce.index] = words[reduce.index].join('');
      reduce.position = 0;
      reduce.index++;
    }

    return words;
  }, []);
});

/**
 * Scan the given string for occurrences of the license text. If the given
 * percentage of matching lines is reached, we'll assume a match.
 *
 * @param {String} str The string that needs to have licence matching.
 * @param {Number} percentage Percentage for accepted match.
 * @returns {Array} License name if we have a match.
 * @api public
 */
Parser.readable('scan', function scan(str, percentage) {
  percentage = percentage || 80;
  str = this.tokenizer(str);

  var matches = []
    , match;

  this.licenses.forEach(function each(license) {
    var test = {
      total: license.file.length,
      license: license.as,
      percentage: 0,
      matches: 0
    };

    license.file.forEach(function each(line) {
      if (str.indexOf(line) !== -1) test.matches++;
    });

    test.percentage = test.matches / test.total * 100;
    if (test.percentage >= percentage) matches.push(test);

    debug('had a %s% match for %s', test.percentage, test.license);
  });

  match = matches.sort(function sort(a, b) {
    return a.percentage < b.percentage;
  })[0];

  if (match) return [match.license];
});

/**
 * The contents of various of license types that we can use for comparison.
 *
 * @type {Array}
 * @api private
 */
Parser.readable('licenses', [
  { file: 'AFL2.1.txt',       as: 'AFL 2.1'       },
  { file: 'AFL3.0.txt',       as: 'AFL 3.0'       },
  { file: 'AGPL3.0.txt',      as: 'AGPL 3.0'      },
  { file: 'APL-1.0.txt',      as: 'APL 1.0'       },
  { file: 'Apache2.0.txt',    as: 'Apache 2.0'    },
  { file: 'Artistic2.0.txt',  as: 'Artistic 2.0'  },
  { file: 'BSD-2-Clause.txt', as: 'BSD 2-Clause'  },
  { file: 'BSD-3-Clause.txt', as: 'BSD 3-Clause'  },
  { file: 'BSD.txt',          as: 'BSD 4-Clouse'  },
  { file: 'BSL1.0.txt',       as: 'BSL 1.0'       },
  { file: 'EPL-1.0.txt',      as: 'EPL 1.0'       },
  { file: 'GPL-2.0.txt',      as: 'GPL 2.0'       },
  { file: 'GPL-3.0.txt',      as: 'GPL 3.0'       },
  { file: 'ISC.txt',          as: 'ISC.txt'       },
  { file: 'LGPL-2.1.txt',     as: 'LGPL 2.1'      },
  { file: 'LGPL-3.0.txt',     as: 'LGPL 3.0'      },
  { file: 'MIT.txt',          as: 'MIT'           },
  { file: 'MPL-1.0.txt',      as: 'MPL'           },
  { file: 'MPL-2.0.txt',      as: 'MPL 2.0'       },
  { file: 'Python2.txt',      as: 'Python 2.0'    },
  { file: 'UNLICENSE.txt',    as: 'UNLICENSE'     },
  { file: 'WTFPL.txt',        as: 'WTFPL'         },
  { file: 'beerware.txt',     as: 'Beerware'      },
  { file: 'cddl1.txt',        as: 'CDDL 1.0'      },
  { file: 'nasa.txt',         as: 'NASA 1.3'      },
  { file: 'zlib.txt',         as: 'zlib/libpng'   }
].map(function map(license) {
  license.file = this.tokenizer(
    fs.readFileSync(__dirname +'/licenses/'+ license.file, 'utf-8'),
    5
  );

  return license;
}.bind(Parser.prototype)));

//
// Expose the parser.
//
module.exports = Parser;
