'use strict';

var debug = require('debug')('licenses::npm');

/**
 * Parser for package.json based license information.
 *
 * @constructor
 * @api public
 */
module.exports = require('./parser').extend({
  /**
   * The name of this parser.
   *
   * @type {String}
   * @private
   */
  name: 'packagejson',

  /**
   * Parse the license information from the package.json contents.
   *
   * @param {{
   *  path: String,
   *  data: Object
   * }} dep Absolute path to installed modules AND the package.json contents.
   * @param {Function} next Continuation.
   * @api public
   */
  parse: function parse(dep, next) {
    var parser = this;

    var matches = [];
    var data = dep.data;
    //
    // Another npm oddity, it allows licenses to be specified in to different
    // properties. Because why the fuck not?
    //
    ['license', 'licenses'].forEach(function each(key) {
      if ('string' === typeof data[key]) {
        return matches.push(data[key]);
      }

      if (Array.isArray(data[key])) {
        return Array.prototype.push.apply(
          matches,
          data[key].map(function map(item) {
            return parser.license(item);
          }).filter(Boolean)
        );
      }

      if ('object' === typeof data[key] && parser.license(data[key])) {
        return Array.prototype.push.apply(
          matches,
          [parser.license(data[key])]
        );
      }
    });

    //
    // We cannot detect a license so we call the callback without any arguments
    // which symbolises a failed attempt.
    //
    if (!matches.length) return next();

    debug('found %s in the package contents', matches);

    // @TODO handle the edge case where people give us an URL instead of an
    // actual license.
    next(undefined, parser.normalize(matches));

  },

  /**
   * Return the possible location of license information.
   *
   * @param {Object} data The object that should contain the license.
   * @returns {String}
   * @api private
   */
  license: function licenses(data) {
    if ('string' === typeof data && data) return data;
    if ('type' in data && data.type) return data.type;

    //
    // Common typo's
    //
    if ('type:' in data && data['type:']) return data['type:'];

    return;
  }

});
