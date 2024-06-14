// ==UserScript==
// @name         Batch Processor
// @namespace    KrzysztofKruk-FlyWire
// @version      0.7
// @description  Batch processing segments in FlyWire
// @author       Krzysztof Kruk
// @match        https://ngl.flywire.ai/*
// @match        https://edit.flywire.ai/*
// @grant        GM_xmlhttpRequest
// @connect      prod.flywire-daf.com
// @updateURL    https://raw.githubusercontent.com/ChrisRaven/FlyWire-Batch-Processor/main/Batch-processor.user.js
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/FlyWire-Batch-Processor/main/Batch-processor.user.js
// @homepageURL  https://github.com/ChrisRaven/FlyWire-Batch-Processor
// ==/UserScript==

if (!document.getElementById('dock-script')) {
  let script = document.createElement('script')
  script.id = 'dock-script'
  script.src = typeof DEV !== 'undefined' ? 'http://127.0.0.1:5501/FlyWire-Dock/Dock.js' : 'https://chrisraven.github.io/FlyWire-Dock/Dock.js'
  document.head.appendChild(script)
}

let wait = setInterval(() => {
  if (unsafeWindow.dockIsReady) {
    clearInterval(wait)
    main()
  }
}, 100)

const QUICK_FIND = false // to quickly display both up- and downstream partners for the first 30 HIDDEN cells
const MAX_NUMBER_OF_SOURCES = QUICK_FIND ? 30 : 10
const MAX_NUMBER_OF_RESULTS = 20
const FIND_COMMON_COLORS = ['#f8e266', '#9de0f9', '#eed1e4', '#a1ec46', '#fc3cb2', '#9b95cf', '#4c7dbc', '#ca5af6', '#f0ae42', '#2df6af'];

// regexpxs extracted from
// (c) BSD-3-Clause
// https://github.com/fastify/secure-json-parse/graphs/contributors and https://github.com/hapijs/bourne/graphs/contributors

const suspectProtoRx = /(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])/;
const suspectConstructorRx = /(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)/;

/*
    json_parse.js
    2012-06-20

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    This file creates a json_parse function.
    During create you can (optionally) specify some behavioural switches

        require('json-bigint')(options)

            The optional options parameter holds switches that drive certain
            aspects of the parsing process:
            * options.strict = true will warn about duplicate-key usage in the json.
              The default (strict = false) will silently ignore those and overwrite
              values for keys that are in duplicate use.

    The resulting function follows this signature:
        json_parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = json_parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

/*members "", "\"", "\/", "\\", at, b, call, charAt, f, fromCharCode,
    hasOwnProperty, message, n, name, prototype, push, r, t, text
*/

var json_parse = function (options) {
  'use strict';

  // This is a function that can parse a JSON text, producing a JavaScript
  // data structure. It is a simple, recursive descent parser. It does not use
  // eval or regular expressions, so it can be used as a model for implementing
  // a JSON parser in other languages.

  // We are defining the function inside of another function to avoid creating
  // global variables.

  // Default options one can override by passing options to the parse()
  var _options = {
    strict: false, // not being strict means do not generate syntax errors for "duplicate key"
    storeAsString: false, // toggles whether the values should be stored as BigNumber (default) or a string
    alwaysParseAsBig: false, // toggles whether all numbers should be Big
    useNativeBigInt: false, // toggles whether to use native BigInt instead of bignumber.js
    protoAction: 'error',
    constructorAction: 'error',
  };

  // If there are options, then use them to override the default _options
  if (options !== undefined && options !== null) {
    if (options.strict === true) {
      _options.strict = true;
    }
    if (options.storeAsString === true) {
      _options.storeAsString = true;
    }
    _options.alwaysParseAsBig =
      options.alwaysParseAsBig === true ? options.alwaysParseAsBig : false;
    _options.useNativeBigInt =
      options.useNativeBigInt === true ? options.useNativeBigInt : false;

    if (typeof options.constructorAction !== 'undefined') {
      if (
        options.constructorAction === 'error' ||
        options.constructorAction === 'ignore' ||
        options.constructorAction === 'preserve'
      ) {
        _options.constructorAction = options.constructorAction;
      } else {
        throw new Error(
          `Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed ${options.constructorAction}`
        );
      }
    }

    if (typeof options.protoAction !== 'undefined') {
      if (
        options.protoAction === 'error' ||
        options.protoAction === 'ignore' ||
        options.protoAction === 'preserve'
      ) {
        _options.protoAction = options.protoAction;
      } else {
        throw new Error(
          `Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed ${options.protoAction}`
        );
      }
    }
  }

  var at, // The index of the current character
    ch, // The current character
    escapee = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
    },
    text,
    error = function (m) {
      // Call error when something is wrong.

      throw {
        name: 'SyntaxError',
        message: m,
        at: at,
        text: text,
      };
    },
    next = function (c) {
      // If a c parameter is provided, verify that it matches the current character.

      if (c && c !== ch) {
        error("Expected '" + c + "' instead of '" + ch + "'");
      }

      // Get the next character. When there are no more characters,
      // return the empty string.

      ch = text.charAt(at);
      at += 1;
      return ch;
    },
    number = function () {
      // Parse a number value.

      var number,
        string = '';

      if (ch === '-') {
        string = '-';
        next('-');
      }
      while (ch >= '0' && ch <= '9') {
        string += ch;
        next();
      }
      if (ch === '.') {
        string += '.';
        while (next() && ch >= '0' && ch <= '9') {
          string += ch;
        }
      }
      if (ch === 'e' || ch === 'E') {
        string += ch;
        next();
        if (ch === '-' || ch === '+') {
          string += ch;
          next();
        }
        while (ch >= '0' && ch <= '9') {
          string += ch;
          next();
        }
      }
      number = +string;
      if (!isFinite(number)) {
        error('Bad number');
      } else {
        //if (number > 9007199254740992 || number < -9007199254740992)
        // Bignumber has stricter check: everything with length > 15 digits disallowed
        if (string.length > 15)
          return _options.storeAsString
            ? string
            : BigInt(string)
        else
          return !_options.alwaysParseAsBig
            ? number
            : BigInt(number)
      }
    },
    string = function () {
      // Parse a string value.

      var hex,
        i,
        string = '',
        uffff;

      // When parsing for string values, we must look for " and \ characters.

      if (ch === '"') {
        var startAt = at;
        while (next()) {
          if (ch === '"') {
            if (at - 1 > startAt) string += text.substring(startAt, at - 1);
            next();
            return string;
          }
          if (ch === '\\') {
            if (at - 1 > startAt) string += text.substring(startAt, at - 1);
            next();
            if (ch === 'u') {
              uffff = 0;
              for (i = 0; i < 4; i += 1) {
                hex = parseInt(next(), 16);
                if (!isFinite(hex)) {
                  break;
                }
                uffff = uffff * 16 + hex;
              }
              string += String.fromCharCode(uffff);
            } else if (typeof escapee[ch] === 'string') {
              string += escapee[ch];
            } else {
              break;
            }
            startAt = at;
          }
        }
      }
      error('Bad string');
    },
    white = function () {
      // Skip whitespace.

      while (ch && ch <= ' ') {
        next();
      }
    },
    word = function () {
      // true, false, or null.

      switch (ch) {
        case 't':
          next('t');
          next('r');
          next('u');
          next('e');
          return true;
        case 'f':
          next('f');
          next('a');
          next('l');
          next('s');
          next('e');
          return false;
        case 'n':
          next('n');
          next('u');
          next('l');
          next('l');
          return null;
      }
      error("Unexpected '" + ch + "'");
    },
    value, // Place holder for the value function.
    array = function () {
      // Parse an array value.

      var array = [];

      if (ch === '[') {
        next('[');
        white();
        if (ch === ']') {
          next(']');
          return array; // empty array
        }
        while (ch) {
          array.push(value());
          white();
          if (ch === ']') {
            next(']');
            return array;
          }
          next(',');
          white();
        }
      }
      error('Bad array');
    },
    object = function () {
      // Parse an object value.

      var key,
        object = Object.create(null);

      if (ch === '{') {
        next('{');
        white();
        if (ch === '}') {
          next('}');
          return object; // empty object
        }
        while (ch) {
          key = string();
          white();
          next(':');
          if (
            _options.strict === true &&
            Object.hasOwnProperty.call(object, key)
          ) {
            error('Duplicate key "' + key + '"');
          }

          if (suspectProtoRx.test(key) === true) {
            if (_options.protoAction === 'error') {
              error('Object contains forbidden prototype property');
            } else if (_options.protoAction === 'ignore') {
              value();
            } else {
              object[key] = value();
            }
          } else if (suspectConstructorRx.test(key) === true) {
            if (_options.constructorAction === 'error') {
              error('Object contains forbidden constructor property');
            } else if (_options.constructorAction === 'ignore') {
              value();
            } else {
              object[key] = value();
            }
          } else {
            object[key] = value();
          }

          white();
          if (ch === '}') {
            next('}');
            return object;
          }
          next(',');
          white();
        }
      }
      error('Bad object');
    };

  value = function () {
    // Parse a JSON value. It could be an object, an array, a string, a number,
    // or a word.

    white();
    switch (ch) {
      case '{':
        return object();
      case '[':
        return array();
      case '"':
        return string();
      case '-':
        return number();
      default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
  };

  // Return the json_parse function. It will have access to all of the above
  // functions and variables.

  return function (source, reviver) {
    var result;

    text = source + '';
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
      error('Syntax error');
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function'
      ? (function walk(holder, key) {
          var k,
            v,
            value = holder[key];
          if (value && typeof value === 'object') {
            Object.keys(value).forEach(function (k) {
              v = walk(value, k);
              if (v !== undefined) {
                value[k] = v;
              } else {
                delete value[k];
              }
            });
          }
          return reviver.call(holder, key, value);
        })({ '': result }, '')
      : result;
  };
};



// as a function to delay it until the Dock is loaded
function addPickr() {


  Dock.addCss(/*css*/`
  .pickr{position:relative;overflow:visible;transform:translateY(0)}.pickr *{box-sizing:border-box;outline:none;border:none;-webkit-appearance:none}.pickr .pcr-button{position:relative;height:2em;width:2em;padding:0.5em;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif;border-radius:.15em;background:url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" stroke="%2342445A" stroke-width="5px" stroke-linecap="round"><path d="M45,45L5,5"></path><path d="M45,5L5,45"></path></svg>') no-repeat center;background-size:0;transition:all 0.3s}.pickr .pcr-button::before{position:absolute;content:'';top:0;left:0;width:100%;height:100%;background:url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');background-size:.5em;border-radius:.15em;z-index:-1}.pickr .pcr-button::before{z-index:initial}.pickr .pcr-button::after{position:absolute;content:'';top:0;left:0;height:100%;width:100%;transition:background 0.3s;background:var(--pcr-color);border-radius:.15em}.pickr .pcr-button.clear{background-size:70%}.pickr .pcr-button.clear::before{opacity:0}.pickr .pcr-button.clear:focus{box-shadow:0 0 0 1px rgba(255,255,255,0.85),0 0 0 3px var(--pcr-color)}.pickr .pcr-button.disabled{cursor:not-allowed}.pickr *,.pcr-app *{box-sizing:border-box;outline:none;border:none;-webkit-appearance:none}.pickr input:focus,.pickr input.pcr-active,.pickr button:focus,.pickr button.pcr-active,.pcr-app input:focus,.pcr-app input.pcr-active,.pcr-app button:focus,.pcr-app button.pcr-active{box-shadow:0 0 0 1px rgba(255,255,255,0.85),0 0 0 3px var(--pcr-color)}.pickr .pcr-palette,.pickr .pcr-slider,.pcr-app .pcr-palette,.pcr-app .pcr-slider{transition:box-shadow 0.3s}.pickr .pcr-palette:focus,.pickr .pcr-slider:focus,.pcr-app .pcr-palette:focus,.pcr-app .pcr-slider:focus{box-shadow:0 0 0 1px rgba(255,255,255,0.85),0 0 0 3px rgba(0,0,0,0.25)}.pcr-app{position:fixed;display:flex;flex-direction:column;z-index:10000;border-radius:0.1em;background:#fff;opacity:0;visibility:hidden;transition:opacity 0.3s, visibility 0s 0.3s;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif;box-shadow:0 0.15em 1.5em 0 rgba(0,0,0,0.1),0 0 1em 0 rgba(0,0,0,0.03);left:0;top:0}.pcr-app.visible{transition:opacity 0.3s;visibility:visible;opacity:1}.pcr-app .pcr-swatches{display:flex;flex-wrap:wrap;margin-top:0.75em}.pcr-app .pcr-swatches.pcr-last{margin:0}@supports (display: grid){.pcr-app .pcr-swatches{display:grid;align-items:center;grid-template-columns:repeat(auto-fit, 1.75em)}}.pcr-app .pcr-swatches>button{font-size:1em;position:relative;width:calc(1.75em - 5px);height:calc(1.75em - 5px);border-radius:0.15em;cursor:pointer;margin:2.5px;flex-shrink:0;justify-self:center;transition:all 0.15s;overflow:hidden;background:transparent;z-index:1}.pcr-app .pcr-swatches>button::before{position:absolute;content:'';top:0;left:0;width:100%;height:100%;background:url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');background-size:6px;border-radius:.15em;z-index:-1}.pcr-app .pcr-swatches>button::after{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:var(--pcr-color);border:1px solid rgba(0,0,0,0.05);border-radius:0.15em;box-sizing:border-box}.pcr-app .pcr-swatches>button:hover{filter:brightness(1.05)}.pcr-app .pcr-swatches>button:not(.pcr-active){box-shadow:none}.pcr-app .pcr-interaction{display:flex;flex-wrap:wrap;align-items:center;margin:0 -0.2em 0 -0.2em}.pcr-app .pcr-interaction>*{margin:0 0.2em}.pcr-app .pcr-interaction input{letter-spacing:0.07em;font-size:0.75em;text-align:center;cursor:pointer;color:#75797e;background:#f1f3f4;border-radius:.15em;transition:all 0.15s;padding:0.45em 0.5em;margin-top:0.75em}.pcr-app .pcr-interaction input:hover{filter:brightness(0.975)}.pcr-app .pcr-interaction input:focus{box-shadow:0 0 0 1px rgba(255,255,255,0.85),0 0 0 3px rgba(66,133,244,0.75)}.pcr-app .pcr-interaction .pcr-result{color:#75797e;text-align:left;flex:1 1 8em;min-width:8em;transition:all 0.2s;border-radius:.15em;background:#f1f3f4;cursor:text}.pcr-app .pcr-interaction .pcr-result::-moz-selection{background:#4285f4;color:#fff}.pcr-app .pcr-interaction .pcr-result::selection{background:#4285f4;color:#fff}.pcr-app .pcr-interaction .pcr-type.active{color:#fff;background:#4285f4}.pcr-app .pcr-interaction .pcr-save,.pcr-app .pcr-interaction .pcr-cancel,.pcr-app .pcr-interaction .pcr-clear{color:#fff;width:auto}.pcr-app .pcr-interaction .pcr-save,.pcr-app .pcr-interaction .pcr-cancel,.pcr-app .pcr-interaction .pcr-clear{color:#fff}.pcr-app .pcr-interaction .pcr-save:hover,.pcr-app .pcr-interaction .pcr-cancel:hover,.pcr-app .pcr-interaction .pcr-clear:hover{filter:brightness(0.925)}.pcr-app .pcr-interaction .pcr-save{background:#4285f4}.pcr-app .pcr-interaction .pcr-clear,.pcr-app .pcr-interaction .pcr-cancel{background:#f44250}.pcr-app .pcr-interaction .pcr-clear:focus,.pcr-app .pcr-interaction .pcr-cancel:focus{box-shadow:0 0 0 1px rgba(255,255,255,0.85),0 0 0 3px rgba(244,66,80,0.75)}.pcr-app .pcr-selection .pcr-picker{position:absolute;height:18px;width:18px;border:2px solid #fff;border-radius:100%;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.pcr-app .pcr-selection .pcr-color-palette,.pcr-app .pcr-selection .pcr-color-chooser,.pcr-app .pcr-selection .pcr-color-opacity{position:relative;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:flex;flex-direction:column;cursor:grab;cursor:-webkit-grab}.pcr-app .pcr-selection .pcr-color-palette:active,.pcr-app .pcr-selection .pcr-color-chooser:active,.pcr-app .pcr-selection .pcr-color-opacity:active{cursor:grabbing;cursor:-webkit-grabbing}.pcr-app[data-theme='nano']{width:14.25em;max-width:95vw}.pcr-app[data-theme='nano'] .pcr-swatches{margin-top:.6em;padding:0 .6em}.pcr-app[data-theme='nano'] .pcr-interaction{padding:0 .6em .6em .6em}.pcr-app[data-theme='nano'] .pcr-selection{display:grid;grid-gap:.6em;grid-template-columns:1fr 4fr;grid-template-rows:5fr auto auto;align-items:center;height:10.5em;width:100%;align-self:flex-start}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-preview{grid-area:2 / 1 / 4 / 1;height:100%;width:100%;display:flex;flex-direction:row;justify-content:center;margin-left:.6em}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-preview .pcr-last-color{display:none}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-preview .pcr-current-color{position:relative;background:var(--pcr-color);width:2em;height:2em;border-radius:50em;overflow:hidden}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-preview .pcr-current-color::before{position:absolute;content:'';top:0;left:0;width:100%;height:100%;background:url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');background-size:.5em;border-radius:.15em;z-index:-1}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-palette{grid-area:1 / 1 / 2 / 3;width:100%;height:100%;z-index:1}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-palette .pcr-palette{border-radius:.15em;width:100%;height:100%}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-palette .pcr-palette::before{position:absolute;content:'';top:0;left:0;width:100%;height:100%;background:url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');background-size:.5em;border-radius:.15em;z-index:-1}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-chooser{grid-area:2 / 2 / 2 / 2}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-opacity{grid-area:3 / 2 / 3 / 2}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-chooser,.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-opacity{height:0.5em;margin:0 .6em}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-chooser .pcr-picker,.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-opacity .pcr-picker{top:50%;transform:translateY(-50%)}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-chooser .pcr-slider,.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-opacity .pcr-slider{flex-grow:1;border-radius:50em}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-chooser .pcr-slider{background:linear-gradient(to right, red, #ff0, lime, cyan, blue, #f0f, red)}.pcr-app[data-theme='nano'] .pcr-selection .pcr-color-opacity .pcr-slider{background:linear-gradient(to right, transparent, black),url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');background-size:100%, 0.25em}
  `)
  
  
  // CHANGES from original: changed "t.Pickr=e()" to "t.Pickr=this.Pickr=e()"
  /*! Pickr 1.8.2 MIT | https://github.com/Simonwep/pickr */
  !function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.Pickr=e():t.Pickr=this.Pickr=e()}(self,(function(){return(()=>{"use strict";var t={d:(e,o)=>{for(var n in o)t.o(o,n)&&!t.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:o[n]})},o:(t,e)=>Object.prototype.hasOwnProperty.call(t,e),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},e={};t.d(e,{default:()=>L});var o={};function n(t,e,o,n,i={}){e instanceof HTMLCollection||e instanceof NodeList?e=Array.from(e):Array.isArray(e)||(e=[e]),Array.isArray(o)||(o=[o]);for(const s of e)for(const e of o)s[t](e,n,{capture:!1,...i});return Array.prototype.slice.call(arguments,1)}t.r(o),t.d(o,{adjustableInputNumbers:()=>p,createElementFromString:()=>r,createFromTemplate:()=>a,eventPath:()=>l,off:()=>s,on:()=>i,resolveElement:()=>c});const i=n.bind(null,"addEventListener"),s=n.bind(null,"removeEventListener");function r(t){const e=document.createElement("div");return e.innerHTML=t.trim(),e.firstElementChild}function a(t){const e=(t,e)=>{const o=t.getAttribute(e);return t.removeAttribute(e),o},o=(t,n={})=>{const i=e(t,":obj"),s=e(t,":ref"),r=i?n[i]={}:n;s&&(n[s]=t);for(const n of Array.from(t.children)){const t=e(n,":arr"),i=o(n,t?{}:r);t&&(r[t]||(r[t]=[])).push(Object.keys(i).length?i:n)}return n};return o(r(t))}function l(t){let e=t.path||t.composedPath&&t.composedPath();if(e)return e;let o=t.target.parentElement;for(e=[t.target,o];o=o.parentElement;)e.push(o);return e.push(document,window),e}function c(t){return t instanceof Element?t:"string"==typeof t?t.split(/>>/g).reduce(((t,e,o,n)=>(t=t.querySelector(e),o<n.length-1?t.shadowRoot:t)),document):null}function p(t,e=(t=>t)){function o(o){const n=[.001,.01,.1][Number(o.shiftKey||2*o.ctrlKey)]*(o.deltaY<0?1:-1);let i=0,s=t.selectionStart;t.value=t.value.replace(/[\d.]+/g,((t,o)=>o<=s&&o+t.length>=s?(s=o,e(Number(t),n,i)):(i++,t))),t.focus(),t.setSelectionRange(s,s),o.preventDefault(),t.dispatchEvent(new Event("input"))}i(t,"focus",(()=>i(window,"wheel",o,{passive:!1}))),i(t,"blur",(()=>s(window,"wheel",o)))}const{min:u,max:h,floor:d,round:m}=Math;function f(t,e,o){e/=100,o/=100;const n=d(t=t/360*6),i=t-n,s=o*(1-e),r=o*(1-i*e),a=o*(1-(1-i)*e),l=n%6;return[255*[o,r,s,s,a,o][l],255*[a,o,o,r,s,s][l],255*[s,s,a,o,o,r][l]]}function v(t,e,o){const n=(2-(e/=100))*(o/=100)/2;return 0!==n&&(e=1===n?0:n<.5?e*o/(2*n):e*o/(2-2*n)),[t,100*e,100*n]}function b(t,e,o){const n=u(t/=255,e/=255,o/=255),i=h(t,e,o),s=i-n;let r,a;if(0===s)r=a=0;else{a=s/i;const n=((i-t)/6+s/2)/s,l=((i-e)/6+s/2)/s,c=((i-o)/6+s/2)/s;t===i?r=c-l:e===i?r=1/3+n-c:o===i&&(r=2/3+l-n),r<0?r+=1:r>1&&(r-=1)}return[360*r,100*a,100*i]}function y(t,e,o,n){e/=100,o/=100;return[...b(255*(1-u(1,(t/=100)*(1-(n/=100))+n)),255*(1-u(1,e*(1-n)+n)),255*(1-u(1,o*(1-n)+n)))]}function g(t,e,o){e/=100;const n=2*(e*=(o/=100)<.5?o:1-o)/(o+e)*100,i=100*(o+e);return[t,isNaN(n)?0:n,i]}function _(t){return b(...t.match(/.{2}/g).map((t=>parseInt(t,16))))}function w(t){t=t.match(/^[a-zA-Z]+$/)?function(t){if("black"===t.toLowerCase())return"#000";const e=document.createElement("canvas").getContext("2d");return e.fillStyle=t,"#000"===e.fillStyle?null:e.fillStyle}(t):t;const e={cmyk:/^cmyk[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)/i,rgba:/^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i,hsla:/^((hsla)|hsl)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i,hsva:/^((hsva)|hsv)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i,hexa:/^#?(([\dA-Fa-f]{3,4})|([\dA-Fa-f]{6})|([\dA-Fa-f]{8}))$/i},o=t=>t.map((t=>/^(|\d+)\.\d+|\d+$/.test(t)?Number(t):void 0));let n;t:for(const i in e){if(!(n=e[i].exec(t)))continue;const s=t=>!!n[2]==("number"==typeof t);switch(i){case"cmyk":{const[,t,e,s,r]=o(n);if(t>100||e>100||s>100||r>100)break t;return{values:y(t,e,s,r),type:i}}case"rgba":{const[,,,t,e,r,a]=o(n);if(t>255||e>255||r>255||a<0||a>1||!s(a))break t;return{values:[...b(t,e,r),a],a,type:i}}case"hexa":{let[,t]=n;4!==t.length&&3!==t.length||(t=t.split("").map((t=>t+t)).join(""));const e=t.substring(0,6);let o=t.substring(6);return o=o?parseInt(o,16)/255:void 0,{values:[..._(e),o],a:o,type:i}}case"hsla":{const[,,,t,e,r,a]=o(n);if(t>360||e>100||r>100||a<0||a>1||!s(a))break t;return{values:[...g(t,e,r),a],a,type:i}}case"hsva":{const[,,,t,e,r,a]=o(n);if(t>360||e>100||r>100||a<0||a>1||!s(a))break t;return{values:[t,e,r,a],a,type:i}}}}return{values:null,type:null}}function A(t=0,e=0,o=0,n=1){const i=(t,e)=>(o=-1)=>e(~o?t.map((t=>Number(t.toFixed(o)))):t),s={h:t,s:e,v:o,a:n,toHSVA(){const t=[s.h,s.s,s.v,s.a];return t.toString=i(t,(t=>`hsva(${t[0]}, ${t[1]}%, ${t[2]}%, ${s.a})`)),t},toHSLA(){const t=[...v(s.h,s.s,s.v),s.a];return t.toString=i(t,(t=>`hsla(${t[0]}, ${t[1]}%, ${t[2]}%, ${s.a})`)),t},toRGBA(){const t=[...f(s.h,s.s,s.v),s.a];return t.toString=i(t,(t=>`rgba(${t[0]}, ${t[1]}, ${t[2]}, ${s.a})`)),t},toCMYK(){const t=function(t,e,o){const n=f(t,e,o),i=n[0]/255,s=n[1]/255,r=n[2]/255,a=u(1-i,1-s,1-r);return[100*(1===a?0:(1-i-a)/(1-a)),100*(1===a?0:(1-s-a)/(1-a)),100*(1===a?0:(1-r-a)/(1-a)),100*a]}(s.h,s.s,s.v);return t.toString=i(t,(t=>`cmyk(${t[0]}%, ${t[1]}%, ${t[2]}%, ${t[3]}%)`)),t},toHEXA(){const t=function(t,e,o){return f(t,e,o).map((t=>m(t).toString(16).padStart(2,"0")))}(s.h,s.s,s.v),e=s.a>=1?"":Number((255*s.a).toFixed(0)).toString(16).toUpperCase().padStart(2,"0");return e&&t.push(e),t.toString=()=>`#${t.join("").toUpperCase()}`,t},clone:()=>A(s.h,s.s,s.v,s.a)};return s}const C=t=>Math.max(Math.min(t,1),0);function $(t){const e={options:Object.assign({lock:null,onchange:()=>0,onstop:()=>0},t),_keyboard(t){const{options:o}=e,{type:n,key:i}=t;if(document.activeElement===o.wrapper){const{lock:o}=e.options,s="ArrowUp"===i,r="ArrowRight"===i,a="ArrowDown"===i,l="ArrowLeft"===i;if("keydown"===n&&(s||r||a||l)){let n=0,i=0;"v"===o?n=s||r?1:-1:"h"===o?n=s||r?-1:1:(i=s?-1:a?1:0,n=l?-1:r?1:0),e.update(C(e.cache.x+.01*n),C(e.cache.y+.01*i)),t.preventDefault()}else i.startsWith("Arrow")&&(e.options.onstop(),t.preventDefault())}},_tapstart(t){i(document,["mouseup","touchend","touchcancel"],e._tapstop),i(document,["mousemove","touchmove"],e._tapmove),t.cancelable&&t.preventDefault(),e._tapmove(t)},_tapmove(t){const{options:o,cache:n}=e,{lock:i,element:s,wrapper:r}=o,a=r.getBoundingClientRect();let l=0,c=0;if(t){const e=t&&t.touches&&t.touches[0];l=t?(e||t).clientX:0,c=t?(e||t).clientY:0,l<a.left?l=a.left:l>a.left+a.width&&(l=a.left+a.width),c<a.top?c=a.top:c>a.top+a.height&&(c=a.top+a.height),l-=a.left,c-=a.top}else n&&(l=n.x*a.width,c=n.y*a.height);"h"!==i&&(s.style.left=`calc(${l/a.width*100}% - ${s.offsetWidth/2}px)`),"v"!==i&&(s.style.top=`calc(${c/a.height*100}% - ${s.offsetHeight/2}px)`),e.cache={x:l/a.width,y:c/a.height};const p=C(l/a.width),u=C(c/a.height);switch(i){case"v":return o.onchange(p);case"h":return o.onchange(u);default:return o.onchange(p,u)}},_tapstop(){e.options.onstop(),s(document,["mouseup","touchend","touchcancel"],e._tapstop),s(document,["mousemove","touchmove"],e._tapmove)},trigger(){e._tapmove()},update(t=0,o=0){const{left:n,top:i,width:s,height:r}=e.options.wrapper.getBoundingClientRect();"h"===e.options.lock&&(o=t),e._tapmove({clientX:n+s*t,clientY:i+r*o})},destroy(){const{options:t,_tapstart:o,_keyboard:n}=e;s(document,["keydown","keyup"],n),s([t.wrapper,t.element],"mousedown",o),s([t.wrapper,t.element],"touchstart",o,{passive:!1})}},{options:o,_tapstart:n,_keyboard:r}=e;return i([o.wrapper,o.element],"mousedown",n),i([o.wrapper,o.element],"touchstart",n,{passive:!1}),i(document,["keydown","keyup"],r),e}function k(t={}){t=Object.assign({onchange:()=>0,className:"",elements:[]},t);const e=i(t.elements,"click",(e=>{t.elements.forEach((o=>o.classList[e.target===o?"add":"remove"](t.className))),t.onchange(e),e.stopPropagation()}));return{destroy:()=>s(...e)}}const S={variantFlipOrder:{start:"sme",middle:"mse",end:"ems"},positionFlipOrder:{top:"tbrl",right:"rltb",bottom:"btrl",left:"lrbt"},position:"bottom",margin:8},O=(t,e,o)=>{const{container:n,margin:i,position:s,variantFlipOrder:r,positionFlipOrder:a}={container:document.documentElement.getBoundingClientRect(),...S,...o},{left:l,top:c}=e.style;e.style.left="0",e.style.top="0";const p=t.getBoundingClientRect(),u=e.getBoundingClientRect(),h={t:p.top-u.height-i,b:p.bottom+i,r:p.right+i,l:p.left-u.width-i},d={vs:p.left,vm:p.left+p.width/2+-u.width/2,ve:p.left+p.width-u.width,hs:p.top,hm:p.bottom-p.height/2-u.height/2,he:p.bottom-u.height},[m,f="middle"]=s.split("-"),v=a[m],b=r[f],{top:y,left:g,bottom:_,right:w}=n;for(const t of v){const o="t"===t||"b"===t,n=h[t],[i,s]=o?["top","left"]:["left","top"],[r,a]=o?[u.height,u.width]:[u.width,u.height],[l,c]=o?[_,w]:[w,_],[p,m]=o?[y,g]:[g,y];if(!(n<p||n+r>l))for(const r of b){const l=d[(o?"v":"h")+r];if(!(l<m||l+a>c))return e.style[s]=l-u[s]+"px",e.style[i]=n-u[i]+"px",t+r}}return e.style.left=l,e.style.top=c,null};function E(t,e,o){return e in t?Object.defineProperty(t,e,{value:o,enumerable:!0,configurable:!0,writable:!0}):t[e]=o,t}class L{constructor(t){E(this,"_initializingActive",!0),E(this,"_recalc",!0),E(this,"_nanopop",null),E(this,"_root",null),E(this,"_color",A()),E(this,"_lastColor",A()),E(this,"_swatchColors",[]),E(this,"_setupAnimationFrame",null),E(this,"_eventListener",{init:[],save:[],hide:[],show:[],clear:[],change:[],changestop:[],cancel:[],swatchselect:[]}),this.options=t=Object.assign({...L.DEFAULT_OPTIONS},t);const{swatches:e,components:o,theme:n,sliders:i,lockOpacity:s,padding:r}=t;["nano","monolith"].includes(n)&&!i&&(t.sliders="h"),o.interaction||(o.interaction={});const{preview:a,opacity:l,hue:c,palette:p}=o;o.opacity=!s&&l,o.palette=p||a||l||c,this._preBuild(),this._buildComponents(),this._bindEvents(),this._finalBuild(),e&&e.length&&e.forEach((t=>this.addSwatch(t)));const{button:u,app:h}=this._root;this._nanopop=((t,e,o)=>{const n="object"!=typeof t||t instanceof HTMLElement?{reference:t,popper:e,...o}:t;return{update(t=n){const{reference:e,popper:o}=Object.assign(n,t);if(!o||!e)throw new Error("Popper- or reference-element missing.");return O(e,o,n)}}})(u,h,{margin:r}),u.setAttribute("role","button"),u.setAttribute("aria-label",this._t("btn:toggle"));const d=this;this._setupAnimationFrame=requestAnimationFrame((function e(){if(!h.offsetWidth)return requestAnimationFrame(e);d.setColor(t.default),d._rePositioningPicker(),t.defaultRepresentation&&(d._representation=t.defaultRepresentation,d.setColorRepresentation(d._representation)),t.showAlways&&d.show(),d._initializingActive=!1,d._emit("init")}))}_preBuild(){const{options:t}=this;for(const e of["el","container"])t[e]=c(t[e]);this._root=(t=>{const{components:e,useAsButton:o,inline:n,appClass:i,theme:s,lockOpacity:r}=t.options,l=t=>t?"":'style="display:none" hidden',c=e=>t._t(e),p=a(`\n      <div :ref="root" class="pickr">\n\n        ${o?"":'<button type="button" :ref="button" class="pcr-button"></button>'}\n\n        <div :ref="app" class="pcr-app ${i||""}" data-theme="${s}" ${n?'style="position: unset"':""} aria-label="${c("ui:dialog")}" role="window">\n          <div class="pcr-selection" ${l(e.palette)}>\n            <div :obj="preview" class="pcr-color-preview" ${l(e.preview)}>\n              <button type="button" :ref="lastColor" class="pcr-last-color" aria-label="${c("btn:last-color")}"></button>\n              <div :ref="currentColor" class="pcr-current-color"></div>\n            </div>\n\n            <div :obj="palette" class="pcr-color-palette">\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="palette" class="pcr-palette" tabindex="0" aria-label="${c("aria:palette")}" role="listbox"></div>\n            </div>\n\n            <div :obj="hue" class="pcr-color-chooser" ${l(e.hue)}>\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="slider" class="pcr-hue pcr-slider" tabindex="0" aria-label="${c("aria:hue")}" role="slider"></div>\n            </div>\n\n            <div :obj="opacity" class="pcr-color-opacity" ${l(e.opacity)}>\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="slider" class="pcr-opacity pcr-slider" tabindex="0" aria-label="${c("aria:opacity")}" role="slider"></div>\n            </div>\n          </div>\n\n          <div class="pcr-swatches ${e.palette?"":"pcr-last"}" :ref="swatches"></div>\n\n          <div :obj="interaction" class="pcr-interaction" ${l(Object.keys(e.interaction).length)}>\n            <input :ref="result" class="pcr-result" type="text" spellcheck="false" ${l(e.interaction.input)} aria-label="${c("aria:input")}">\n\n            <input :arr="options" class="pcr-type" data-type="HEXA" value="${r?"HEX":"HEXA"}" type="button" ${l(e.interaction.hex)}>\n            <input :arr="options" class="pcr-type" data-type="RGBA" value="${r?"RGB":"RGBA"}" type="button" ${l(e.interaction.rgba)}>\n            <input :arr="options" class="pcr-type" data-type="HSLA" value="${r?"HSL":"HSLA"}" type="button" ${l(e.interaction.hsla)}>\n            <input :arr="options" class="pcr-type" data-type="HSVA" value="${r?"HSV":"HSVA"}" type="button" ${l(e.interaction.hsva)}>\n            <input :arr="options" class="pcr-type" data-type="CMYK" value="CMYK" type="button" ${l(e.interaction.cmyk)}>\n\n            <input :ref="save" class="pcr-save" value="${c("btn:save")}" type="button" ${l(e.interaction.save)} aria-label="${c("aria:btn:save")}">\n            <input :ref="cancel" class="pcr-cancel" value="${c("btn:cancel")}" type="button" ${l(e.interaction.cancel)} aria-label="${c("aria:btn:cancel")}">\n            <input :ref="clear" class="pcr-clear" value="${c("btn:clear")}" type="button" ${l(e.interaction.clear)} aria-label="${c("aria:btn:clear")}">\n          </div>\n        </div>\n      </div>\n    `),u=p.interaction;return u.options.find((t=>!t.hidden&&!t.classList.add("active"))),u.type=()=>u.options.find((t=>t.classList.contains("active"))),p})(this),t.useAsButton&&(this._root.button=t.el),t.container.appendChild(this._root.root)}_finalBuild(){const t=this.options,e=this._root;if(t.container.removeChild(e.root),t.inline){const o=t.el.parentElement;t.el.nextSibling?o.insertBefore(e.app,t.el.nextSibling):o.appendChild(e.app)}else t.container.appendChild(e.app);t.useAsButton?t.inline&&t.el.remove():t.el.parentNode.replaceChild(e.root,t.el),t.disabled&&this.disable(),t.comparison||(e.button.style.transition="none",t.useAsButton||(e.preview.lastColor.style.transition="none")),this.hide()}_buildComponents(){const t=this,e=this.options.components,o=(t.options.sliders||"v").repeat(2),[n,i]=o.match(/^[vh]+$/g)?o:[],s=()=>this._color||(this._color=this._lastColor.clone()),r={palette:$({element:t._root.palette.picker,wrapper:t._root.palette.palette,onstop:()=>t._emit("changestop","slider",t),onchange(o,n){if(!e.palette)return;const i=s(),{_root:r,options:a}=t,{lastColor:l,currentColor:c}=r.preview;t._recalc&&(i.s=100*o,i.v=100-100*n,i.v<0&&(i.v=0),t._updateOutput("slider"));const p=i.toRGBA().toString(0);this.element.style.background=p,this.wrapper.style.background=`\n                        linear-gradient(to top, rgba(0, 0, 0, ${i.a}), transparent),\n                        linear-gradient(to left, hsla(${i.h}, 100%, 50%, ${i.a}), rgba(255, 255, 255, ${i.a}))\n                    `,a.comparison?a.useAsButton||t._lastColor||l.style.setProperty("--pcr-color",p):(r.button.style.setProperty("--pcr-color",p),r.button.classList.remove("clear"));const u=i.toHEXA().toString();for(const{el:e,color:o}of t._swatchColors)e.classList[u===o.toHEXA().toString()?"add":"remove"]("pcr-active");c.style.setProperty("--pcr-color",p)}}),hue:$({lock:"v"===i?"h":"v",element:t._root.hue.picker,wrapper:t._root.hue.slider,onstop:()=>t._emit("changestop","slider",t),onchange(o){if(!e.hue||!e.palette)return;const n=s();t._recalc&&(n.h=360*o),this.element.style.backgroundColor=`hsl(${n.h}, 100%, 50%)`,r.palette.trigger()}}),opacity:$({lock:"v"===n?"h":"v",element:t._root.opacity.picker,wrapper:t._root.opacity.slider,onstop:()=>t._emit("changestop","slider",t),onchange(o){if(!e.opacity||!e.palette)return;const n=s();t._recalc&&(n.a=Math.round(100*o)/100),this.element.style.background=`rgba(0, 0, 0, ${n.a})`,r.palette.trigger()}}),selectable:k({elements:t._root.interaction.options,className:"active",onchange(e){t._representation=e.target.getAttribute("data-type").toUpperCase(),t._recalc&&t._updateOutput("swatch")}})};this._components=r}_bindEvents(){const{_root:t,options:e}=this,o=[i(t.interaction.clear,"click",(()=>this._clearColor())),i([t.interaction.cancel,t.preview.lastColor],"click",(()=>{this.setHSVA(...(this._lastColor||this._color).toHSVA(),!0),this._emit("cancel")})),i(t.interaction.save,"click",(()=>{!this.applyColor()&&!e.showAlways&&this.hide()})),i(t.interaction.result,["keyup","input"],(t=>{this.setColor(t.target.value,!0)&&!this._initializingActive&&(this._emit("change",this._color,"input",this),this._emit("changestop","input",this)),t.stopImmediatePropagation()})),i(t.interaction.result,["focus","blur"],(t=>{this._recalc="blur"===t.type,this._recalc&&this._updateOutput(null)})),i([t.palette.palette,t.palette.picker,t.hue.slider,t.hue.picker,t.opacity.slider,t.opacity.picker],["mousedown","touchstart"],(()=>this._recalc=!0),{passive:!0})];if(!e.showAlways){const n=e.closeWithKey;o.push(i(t.button,"click",(()=>this.isOpen()?this.hide():this.show())),i(document,"keyup",(t=>this.isOpen()&&(t.key===n||t.code===n)&&this.hide())),i(document,["touchstart","mousedown"],(e=>{this.isOpen()&&!l(e).some((e=>e===t.app||e===t.button))&&this.hide()}),{capture:!0}))}if(e.adjustableNumbers){const e={rgba:[255,255,255,1],hsva:[360,100,100,1],hsla:[360,100,100,1],cmyk:[100,100,100,100]};p(t.interaction.result,((t,o,n)=>{const i=e[this.getColorRepresentation().toLowerCase()];if(i){const e=i[n],s=t+(e>=100?1e3*o:o);return s<=0?0:Number((s<e?s:e).toPrecision(3))}return t}))}if(e.autoReposition&&!e.inline){let t=null;const n=this;o.push(i(window,["scroll","resize"],(()=>{n.isOpen()&&(e.closeOnScroll&&n.hide(),null===t?(t=setTimeout((()=>t=null),100),requestAnimationFrame((function e(){n._rePositioningPicker(),null!==t&&requestAnimationFrame(e)}))):(clearTimeout(t),t=setTimeout((()=>t=null),100)))}),{capture:!0}))}this._eventBindings=o}_rePositioningPicker(){const{options:t}=this;if(!t.inline){if(!this._nanopop.update({container:document.body.getBoundingClientRect(),position:t.position})){const t=this._root.app,e=t.getBoundingClientRect();t.style.top=(window.innerHeight-e.height)/2+"px",t.style.left=(window.innerWidth-e.width)/2+"px"}}}_updateOutput(t){const{_root:e,_color:o,options:n}=this;if(e.interaction.type()){const t=`to${e.interaction.type().getAttribute("data-type")}`;e.interaction.result.value="function"==typeof o[t]?o[t]().toString(n.outputPrecision):""}!this._initializingActive&&this._recalc&&this._emit("change",o,t,this)}_clearColor(t=!1){const{_root:e,options:o}=this;o.useAsButton||e.button.style.setProperty("--pcr-color","rgba(0, 0, 0, 0.15)"),e.button.classList.add("clear"),o.showAlways||this.hide(),this._lastColor=null,this._initializingActive||t||(this._emit("save",null),this._emit("clear"))}_parseLocalColor(t){const{values:e,type:o,a:n}=w(t),{lockOpacity:i}=this.options,s=void 0!==n&&1!==n;return e&&3===e.length&&(e[3]=void 0),{values:!e||i&&s?null:e,type:o}}_t(t){return this.options.i18n[t]||L.I18N_DEFAULTS[t]}_emit(t,...e){this._eventListener[t].forEach((t=>t(...e,this)))}on(t,e){return this._eventListener[t].push(e),this}off(t,e){const o=this._eventListener[t]||[],n=o.indexOf(e);return~n&&o.splice(n,1),this}addSwatch(t){const{values:e}=this._parseLocalColor(t);if(e){const{_swatchColors:t,_root:o}=this,n=A(...e),s=r(`<button type="button" style="--pcr-color: ${n.toRGBA().toString(0)}" aria-label="${this._t("btn:swatch")}"/>`);return o.swatches.appendChild(s),t.push({el:s,color:n}),this._eventBindings.push(i(s,"click",(()=>{this.setHSVA(...n.toHSVA(),!0),this._emit("swatchselect",n),this._emit("change",n,"swatch",this)}))),!0}return!1}removeSwatch(t){const e=this._swatchColors[t];if(e){const{el:o}=e;return this._root.swatches.removeChild(o),this._swatchColors.splice(t,1),!0}return!1}applyColor(t=!1){const{preview:e,button:o}=this._root,n=this._color.toRGBA().toString(0);return e.lastColor.style.setProperty("--pcr-color",n),this.options.useAsButton||o.style.setProperty("--pcr-color",n),o.classList.remove("clear"),this._lastColor=this._color.clone(),this._initializingActive||t||this._emit("save",this._color),this}destroy(){cancelAnimationFrame(this._setupAnimationFrame),this._eventBindings.forEach((t=>s(...t))),Object.keys(this._components).forEach((t=>this._components[t].destroy()))}destroyAndRemove(){this.destroy();const{root:t,app:e}=this._root;t.parentElement&&t.parentElement.removeChild(t),e.parentElement.removeChild(e),Object.keys(this).forEach((t=>this[t]=null))}hide(){return!!this.isOpen()&&(this._root.app.classList.remove("visible"),this._emit("hide"),!0)}show(){return!this.options.disabled&&!this.isOpen()&&(this._root.app.classList.add("visible"),this._rePositioningPicker(),this._emit("show",this._color),this)}isOpen(){return this._root.app.classList.contains("visible")}setHSVA(t=360,e=0,o=0,n=1,i=!1){const s=this._recalc;if(this._recalc=!1,t<0||t>360||e<0||e>100||o<0||o>100||n<0||n>1)return!1;this._color=A(t,e,o,n);const{hue:r,opacity:a,palette:l}=this._components;return r.update(t/360),a.update(n),l.update(e/100,1-o/100),i||this.applyColor(),s&&this._updateOutput(),this._recalc=s,!0}setColor(t,e=!1){if(null===t)return this._clearColor(e),!0;const{values:o,type:n}=this._parseLocalColor(t);if(o){const t=n.toUpperCase(),{options:i}=this._root.interaction,s=i.find((e=>e.getAttribute("data-type")===t));if(s&&!s.hidden)for(const t of i)t.classList[t===s?"add":"remove"]("active");return!!this.setHSVA(...o,e)&&this.setColorRepresentation(t)}return!1}setColorRepresentation(t){return t=t.toUpperCase(),!!this._root.interaction.options.find((e=>e.getAttribute("data-type").startsWith(t)&&!e.click()))}getColorRepresentation(){return this._representation}getColor(){return this._color}getSelectedColor(){return this._lastColor}getRoot(){return this._root}disable(){return this.hide(),this.options.disabled=!0,this._root.button.classList.add("disabled"),this}enable(){return this.options.disabled=!1,this._root.button.classList.remove("disabled"),this}}return E(L,"utils",o),E(L,"version","1.8.2"),E(L,"I18N_DEFAULTS",{"ui:dialog":"color picker dialog","btn:toggle":"toggle color picker dialog","btn:swatch":"color swatch","btn:last-color":"use previous color","btn:save":"Save","btn:cancel":"Cancel","btn:clear":"Clear","aria:btn:save":"save and close","aria:btn:cancel":"cancel and close","aria:btn:clear":"clear and close","aria:input":"color input field","aria:palette":"color selection area","aria:hue":"hue selection slider","aria:opacity":"selection slider"}),E(L,"DEFAULT_OPTIONS",{appClass:null,theme:"classic",useAsButton:!1,padding:8,disabled:!1,comparison:!0,closeOnScroll:!1,outputPrecision:0,lockOpacity:!1,autoReposition:!0,container:"body",components:{interaction:{}},i18n:{},swatches:null,inline:!1,sliders:null,default:"#42445a",defaultRepresentation:null,position:"bottom-middle",adjustableNumbers:!0,showAlways:!1,closeWithKey:"Escape"}),E(L,"create",(t=>new L(t))),e=e.default})()}));
  //# sourceMappingURL=pickr.min.js.map
  
  
  }
function dataRequestForConnectivity(id) {
  return JSON.stringify({
    output: '..post_submit_download__summary.children...post_submit_download__upstream.children...post_submit_download__downstream.children...post_submit_linkbuilder_buttons.children...summary_table.columns...summary_table.data...incoming_table.columns...incoming_table.data...outgoing_table.columns...outgoing_table.data...graph_div.children...message_text.value...message_text.rows...submit_loader.children..',
    outputs: [
      { id: 'post_submit_download__summary', property: 'children' },
      { id: 'post_submit_download__upstream', property: 'children' },
      { id: 'post_submit_download__downstream', property: 'children' },
      { id: 'post_submit_linkbuilder_buttons', property: 'children' },
      { id: 'summary_table', property: 'columns' },
      { id: 'summary_table', property: 'data' },
      { id: 'incoming_table', property: 'columns' },
      { id: 'incoming_table', property: 'data' },
      { id: 'outgoing_table', property: 'columns' },
      { id: 'outgoing_table', property: 'data' },
      { id: 'graph_div', property: 'children' },
      { id: 'message_text', property: 'value' },
      { id: 'message_text', property: 'rows' },
      { id: 'submit_loader', property: 'children' }
    ],
    inputs: [{ id: 'submit_button', property: 'n_clicks' }],
    changedPropIds: [],
    state: [
      {
        id: { id_inner: 'input_field', type: 'url_helper' },
        property: 'value',
        value: id
      },
      {
        id: { id_inner: 'cleft_thresh_field', type: 'url_helper' },
        property: 'value',
        value: '50'
      },
      {
        id: { id_inner: 'timestamp_field', type: 'url_helper' },
        property: 'value'
      },
      {
        id: { id_inner: 'filter_list_field', type: 'url_helper' },
        property: 'value'
      }
    ]
  })
}


function getConnectivity_headers() {
  const authToken = localStorage.getItem('auth_token')

  return {
    accept: 'application/json',
    'content-type': 'application/json',
    cookie: 'middle_auth_token=' + authToken
  }
}


function getConnectivity(id, onloadCallback, onreadystatechangeCallback, onerrorCallback, direction = 'up') {
  let retry = 5

  function getData() {
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://prod.flywire-daf.com/dash/datastack/flywire_fafb_production/apps/fly_connectivity/_dash-update-component',
      headers: getConnectivity_headers(),
      data: dataRequestForConnectivity(id),

      onload: res => {
        if (!res) return console.error('Error retrieving data for ' + id)

        if (onloadCallback && typeof onloadCallback === 'function') {
          onloadCallback(res, id, direction)
        }
      },

      onreadystatechange: res => {
        if (onreadystatechangeCallback && typeof onreadystatechangeCallback === 'function') {
          onreadystatechangeCallback(res, id, direction)
        }
      },

      ontimeout: res => {
        if (onerrorCallback && typeof onerrorCallback === 'function') {
          if (retry--) {
            getData()
            console.log('retrying')
          }
          else {
            onerrorCallback(res, id, direction)
          }
        }
      },

      onerror: res => {
        if (onerrorCallback && typeof onerrorCallback === 'function') {
          if (retry--) {
            getData()
            console.log('retrying')
          }
          else {
            onerrorCallback(res, id, direction)
          }
        }
      }
    })
  }
  
  getData()
}

function get60Labels(ids) {
  let url = 'https://prod.flywire-daf.com/neurons/api/v1/cell_identification?filter_by=root_id&as_json=1&ignore_bad_ids=True&filter_string='
  url += ids.join(',')
  url += '&middle_auth_token='
  url += localStorage.getItem('auth_token')

  return fetch(url)
    .then(res => res.text())
    .then(data => json_parse()(data))
}


function getLabels(ids, callback) {
  let params = []
  const promises = []
  for(let i = 0; i < ids.length; i++) {
    params.push(ids[i])
    if ((i > 0 && !(i % 60)) || i === ids.length - 1) {
      promises.push(get60Labels(params))
      params = []
    }
  }

  Promise.all(promises).then(results => {
    const filteredResults = {
      id: [],
      tag: [],
      userName: [],
      userAffiliation: []
    }

    results.forEach(result => {
      if (Object.values(result.pt_root_id).length) {
        filteredResults.id.push(...Object.values(result.pt_root_id))
        filteredResults.tag.push(...Object.values(result.tag))
        filteredResults.userName.push(...Object.values(result.user_name))
        filteredResults.userAffiliation.push(...Object.values(result.user_aff))
      }
    })

    callback && callback(filteredResults)
  })
}

// requires "./get_labels.js"

function getStatuses(ids, callback) {
  let params = []
  const promises = []

  getStatuses.allIds = ids
  getStatuses.numberOfAllIds = ids.length
  getStatuses.numberOfProcessedIds = 0
  callback = callback.bind(null, getStatuses.results)

  for(let i = 0; i < ids.length; i++) {
    params.push(ids[i])
    if ((i > 0 && !(i % 60)) || i === ids.length - 1) {
      get60Statuses(params, callback)
      params = []
    }
  }
}

getStatuses.allIds
getStatuses.numberOfAllIds
getStatuses.numberOfProcessedIds


function get60Statuses(ids, callback) {
  getLabels(ids, results => {
    results.id.forEach(id => {
      getStatuses.results[id] = 'identified'
    })
    getStatuses.numberOfProcessedIds += ids.length

    if (getStatuses.numberOfProcessedIds === getStatuses.numberOfAllIds) {
      getCompletedNotIdentified(callback)
    }
  })
}

getStatuses.results = {}


function getCompletedNotIdentified(callback) {
  const identifiedIds = Object.keys(getStatuses.results).map(id => id.toString())
  const notIdentified = Dock.arraySubtraction(getStatuses.allIds, identifiedIds)

  if (!notIdentified.length) return callback()
  
  getStatuses.numberOfAllCompletedNotIdentifiedIds = notIdentified.length
  getStatuses.numberOfProcessedCompletedNotIdentifiedIds = 0

  let params = []
  for(let i = 0; i < notIdentified.length; i++) {
    params.push(notIdentified[i])
    if ((i > 0 && !(i % 60)) || i === notIdentified.length - 1) {
      get60CompletedNotIdentified(params, callback)
      params = []
    }
  }
}


getStatuses.numberOfAllCompletedNotIdentifiedIds
getStatuses.numberOfProcessedCompletedNotIdentifiedIds


function get60CompletedNotIdentified(params, callback) {
  let url = 'https://prod.flywire-daf.com/neurons/api/v1/proofreading_status?filter_by=root_id&as_json=1&ignore_bad_ids=True&filter_string='
  url += params.join('%2C')
  url += '&middle_auth_token='
  url += localStorage.getItem('auth_token')

  fetch(url)
    .then(res => res.text())
    .then(data => {
      // if no data, then jump directly to the next stage with all the IDs,
      // that left after checking identified cells
      if (!data) return getIncompleted(params, callback)

      data = json_parse()(data)
      // as above
      if (!data || !data.pt_root_id) return getIncompleted(params, callback)

      const completedNotIdentifed = Object.values(data.pt_root_id).map(id => id.toString())
      completedNotIdentifed.forEach(id => {
        getStatuses.results[id] = 'completed'
      })

      getStatuses.numberOfProcessedCompletedNotIdentifiedIds += params.length

      if (getStatuses.numberOfProcessedCompletedNotIdentifiedIds === getStatuses.numberOfAllCompletedNotIdentifiedIds) {
        const notCompletedNotIdentified = Dock.arraySubtraction(getStatuses.allIds, Object.keys(getStatuses.results))
        getIncompleted(notCompletedNotIdentified, callback)
      }
    })
}


function getIncompleted(ids, callback) {
  let url = 'https://prodv1.flywire-daf.com/segmentation/api/v1/table/fly_v31/is_latest_roots?middle_auth_token='
  url += localStorage.getItem('auth_token')

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ node_ids: ids.map(id => id.toString()) })
  })
    .then(res => res.json())
    .then(data => {
      data.is_latest.forEach((state, i) => {
        getStatuses.results[ids[i]] = state ? 'incompleted' : 'outdated'
      })

      callback()
    })
}

class RequestPool {
  constructor() {
    this.limit = 30;
    this.maxRetries = 1000;
    this.timeout = 2 * 60 * 1000;
    this.retryAfterError = 10 * 1000;
    this.queue = [];
    this.runningCount = 0;
    this.results = [];
    this.counter = 0;
    this.requestsCompleted = 0;
    this.requestsTotal = 0;
    this.resolveAll = null;
    this.callbackCalled = false;
  }

  makeRequest(id) {
    return new Promise((resolve, reject) => {
      const requestTimeout = this.timeout || null;
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://prod.flywire-daf.com/dash/datastack/flywire_fafb_production/apps/fly_connectivity/_dash-update-component',
        headers: getConnectivity_headers(),
        data: dataRequestForConnectivity(id),
        timeout: this.timeout,
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response);
          } else {
            reject(new Error(`Request failed with status ${response.status}`));
          }
        },
        onerror: (error) => {
          reject(error);
        },
        ontimeout: () => {
          reject(new Error(`Request timed out ${id}`));
        }
      });
    });
  }

  addRequest(id) {
    return new Promise((resolve, reject) => {
      const request = async (retries = 0) => {
        try {
          const response = await this.makeRequest(id);
          if (response.status === 200) {
            const responseBody = response.responseText;
            this.results.push(responseBody);
            this.counter++;
            this.requestsCompleted++;
            console.log(`${this.requestsCompleted}/${this.requestsTotal} finished [${id}]`);
            resolve(responseBody);
          } else {
            if (retries < this.maxRetries) {
              request(retries + 1);
            } else {
              this.counter++;
              this.requestsCompleted++;
              console.log(`${this.requestsCompleted}/${this.requestsTotal} finished [${id}]`);
              reject(new Error('Request failed'));
            }
          }
        } catch (error) {
          if (retries < this.maxRetries) {
            setTimeout(() => { request(retries + 1) }, this.retryAfterError)
          } else {
            this.counter++;
            this.requestsCompleted++;
            console.log(`%c${this.requestsCompleted}/${this.requestsTotal} finished [${id}]`, 'color: red');
            reject(error);
          }
        } finally {
          this.runningCount--;
          this.processNextRequest();
        }
      };

      if (this.runningCount < this.limit) {
        this.runningCount++;
        request();
      } else {
        this.queue.push(request);
      }
    });
  }

  processNextRequest() {
    if (this.queue.length > 0 && this.runningCount < this.limit) {
      const request = this.queue.shift();
      this.runningCount++;
      request();
    }
  }

  runAllRequests(ids) {
    this.ids = ids;
    this.requestsTotal = ids.length;
    const promises = ids.map(id => this.addRequest(id));
    return Promise.allSettled(promises);
  }
}


const batchProcessorOptions = [
  ['optgroup', 'Change color for'],
  ['visible', 'change-color-visible'],
  ['all', 'change-color-all'],

  ['optgroup', 'Find common partners for'],
  ['visible (first 10)', 'find-common-partners-visible'],

  ['optgroup', 'Show neuropils coverage'],
  ['visible', 'show-neuropils-coverage-visible'],
  ['all', 'show-neuropils-coverage-all'],

  ['optgroup', 'Show statuses & labels'],
  ['visible', 'show-statuses-and-labels-visible'],
  ['all', 'show-statuses-and-labels-all'],

  ['optgroup', 'Get synaptic partners for'],
  ['first visible', 'get-synaptic-partners'],

  ['optgroup', 'Show only'],
  ['identified', 'show-identified-only'],
  ['completed', 'show-completed-only'],
  ['incompleted', 'show-incompleted-only'],
  ['outdated', 'Show outdated-only'],

  ['optgroup', 'Hide'],
  ['identified', 'hide-identified'],
  ['completed', 'hide-completed'],
  ['incompleted', 'hide-incompleted'],
  ['outdated', 'hide-outdated'],

  ['optgroup', 'Open in new tab'],
  ['identified', 'open-identified-in-new-tab'],
  ['completed', 'open-completed-in-new-tab'],
  ['incompleted', 'open-incompleted-in-new-tab'],
  ['outdated', 'open-outdated-in-new-tab'],
  ['visible', 'open-visible-in-new-tab'],
  ['hidden', 'open-hidden-in-new-tab'],

  ['optgroup', 'Remove'],
  ['identified', 'remove-identified'],
  ['completed', 'remove-completed'],
  ['incompleted', 'remove-incompleted'],
  ['outdated', 'remove-outdated'],
  ['visible', 'remove-visible'],
  ['hidden', 'remove-hidden'],

  ['optgroup', 'Copy'],
  ['identified', 'copy-identified'],
  ['completed', 'copy-completed'],
  ['incompleted', 'copy-incompleted'],
  ['outdated', 'copy-outdated'],
  ['visible', 'copy-visible'],
  ['hidden', 'copy-hidden']
]

if (DEV) {
  batchProcessorOptions.push(['optgroup', 'DEV'])
  batchProcessorOptions.push(['Get syn. partners (first 30v)', 'find-partners-visible'])
}


function addActionsMenu() {
  const id = 'kk-utilities-action-menu'
  if (document.getElementById(id)) return

  const menu = document.createElement('select')
  menu.id = id
  menu.style.margin = '5px 10px 0'

  const defaultOption = new Option('-- actions --', ' ')
  defaultOption.selected = true
  defaultOption.disabled = true
  defaultOption.hidden = true
  menu.add(defaultOption)

  const batchProcessorOptionsFromLS = Dock.ls.get('batch-processor-options')?.split(',')

  let optgroup
  let optionsCounter = -1
  batchProcessorOptions.forEach((option, i) => {
    if (option[0] === 'optgroup') {
      if (!optionsCounter) { // if all options from a group were hidden
        menu.lastElementChild.remove()
      }
      optgroup = document.createElement('optgroup')
      optgroup.label = option[1]
      menu.add(optgroup)
      optionsCounter = 0
    }
    else if (!batchProcessorOptionsFromLS || batchProcessorOptionsFromLS.includes(option[1])) {
      optgroup.appendChild(new Option(option[0], option[1]))
      optionsCounter++
    }
  })

  const topBar = document.getElementsByClassName('neuroglancer-viewer-top-row')[0]
  const undoButton = document.getElementById('neuroglancer-undo-button')
  topBar.insertBefore(menu, undoButton)

  addActionsEvents()
}


function addActionsEvents() {
  const menu = document.getElementById('kk-utilities-action-menu')
  if (!menu) return

  menu.addEventListener('mousedown', e => {
    if (!e.ctrlKey) return

    e.preventDefault()

    Dock.dialog({
      id: 'batch-processor-option-selection',
      html: addActionsEvents.getHtml(),
      css: addActionsEvents.getCss(),
      okCallback: addActionsEvents.okCallback,
      okLabel: 'Save',
      cancelCallback: () => {},
      cancelLabel: 'Close'
    }).show()
  })

  menu.addEventListener('change', e => {
    actionsHandler(e)
    menu.selectedIndex = 0
  })
}

addActionsEvents.getHtml = function () {
  let html = '<table id="batch-processor-options-table">'
  const batchProcessorOptionsFromLS = Dock.ls.get('batch-processor-options')?.split(',')

  batchProcessorOptions.forEach(option => {
    if (option[0] === 'optgroup') {
      html += `<tr><td class="batch-processor-options-header">${option[1]}</td></tr>`
    }
    else {
      const checked = !batchProcessorOptionsFromLS || batchProcessorOptionsFromLS.includes(option[1])

      html += `<tr><td class="batch-processor-options-option" data-option="${option[1]}"><label><input type="checkbox" ${checked ? 'checked' : ''}>${option[0]}</label></td></tr>`
    }
  })

  html += '</table>'

  return html
}

addActionsEvents.getCss = function () {
  return /*css*/`
    #batch-processor-options-table {
      font-size: 12px;
    }

    .batch-processor-options-header {
      font-weight: bold;
      color: #aaa;
    }

    .batch-processor-options-option {
      padding-left: 10px;
    }

    #batch-processor-option-selection div.content {
      height: 85vh;
      overflow-y: auto;
    }
  `
}

addActionsEvents.okCallback = function () {
  const optionsSelector = '#batch-processor-options-table .batch-processor-options-option'

  const selectedOptions = []
  document.querySelectorAll(optionsSelector).forEach(option => {
    if (option.firstChild.firstChild.checked) {
      selectedOptions.push(option.dataset.option)
    }
  })

  Dock.ls.set('batch-processor-options', selectedOptions)
}


function actionsHandler(e) {
  const segments = document.getElementsByClassName('segment-div')
  /*
    .lightbulb.complete - completed and identified
    .lightbulb.unlabeled - completed, but not identified
    .lightbulb - normal
    .lightbulb.error.outdated - outdated
    .lightbulb.error - unknown
  */

  const all = []
  const identified = []
  const completed = []
  const normal = []
  const outdated = []
  const unknown = []
  const visible = []
  const hidden = []

  segments.forEach(segment => {
    all.push(segment)

    const lightbulb = segment.getElementsByClassName('nge-segment-changelog-button')[0]
    const checkbox = segment.getElementsByClassName('segment-checkbox')[0]

    if (!lightbulb) return

    if (lightbulb.classList.contains('unlabeled')) {
      completed.push(segment)
    }
    else if (lightbulb.classList.contains('complete')) {
      identified.push(segment)
    }
    else if (lightbulb.classList.contains('outdated')) {
      outdated.push(segment)
    }
    else if (lightbulb.classList.contains('error')) {
      unknown.push(segment)
    }
    else {
      normal.push(segment)
    }

    if (checkbox.checked) {
      visible.push(segment)
    }
    else {
      hidden.push(segment)
    }
  })


  switch (e.target.value) {
    case 'change-color-visible':
      changeColor(visible)
      break
    case 'change-color-all':
      changeColor(all)
      break

    case 'find-common-partners-visible':
      findCommon(visible)
      break

    case 'find-partners-visible': // DEV only
      findCommon(visible, true)
      break

    case 'show-neuropils-coverage-visible':
      showNeuropilsCoverage(visible)
      break
    case 'show-neuropils-coverage-all':
      showNeuropilsCoverage(all)
      break
    
    case 'show-statuses-and-labels-visible':
      showStatusesAndLabels(visible)
      break
    case 'show-statuses-and-labels-all':
      showStatusesAndLabels(all)
      break
    
    case 'get-synaptic-partners':
      getSynapticPartners(visible)
      break

    case 'show-identified-only':
      show(identified, segments)
      break
    case 'show-completed-only':
      show(completed, segments)
      break
    case 'show-incompleted-only':
      show(normal, segments)
      break
    case 'Show outdated-only':
      show(outdated, segments)
      break

    case 'hide-identified':
      hide(identified)
      break
    case 'hide-completed':
      hide(completed)
      break
    case 'hide-incompleted':
      hide(normal)
      break
    case 'hide-outdated':
      hide(outdated)
      break

    case 'open-identified-in-new-tab':
      openInNewTab(identified)
      break
    case 'open-completed-in-new-tab':
      openInNewTab(completed)
      break
    case 'open-incompleted-in-new-tab':
      openInNewTab(normal)
      break
    case 'open-outdated-in-new-tab':
      openInNewTab(outdated)
      break
    case 'open-visible-in-new-tab':
      openInNewTab(visible)
      break
    case 'open-hidden-in-new-tab':
      openInNewTab(hidden)
      break

    case 'remove-identified':
      remove(identified)
      break
    case 'remove-completed':
      remove(completed)
      break
    case 'remove-incompleted':
      remove(normal)
      break
    case 'remove-outdated':
      remove(outdated)
      break
    case 'remove-visible':
      remove(visible)
      break
    case 'remove-hidden':
      remove(hidden)
      break
    
    case 'copy-identified':
      copy(identified)
      break
    case 'copy-completed':
      copy(completed)
      break
    case 'copy-incompleted':
      copy(normal)
      break
    case 'copy-outdated':
      copy(outdated)
      break
    case 'copy-visible':
      copy(visible)
      break
    case 'copy-hidden':
      copy(hidden)
      break
  }
}

function hide(type) {
  type.forEach(segment => {
    const checkbox = segment.getElementsByClassName('segment-checkbox')[0]
    if (checkbox.checked) {
      checkbox.click()
    }
  })
}

function show(type, allSegments) {
  hideAll(allSegments)
  type.forEach(segment => {
    const checkbox = segment.getElementsByClassName('segment-checkbox')[0]
    if (!checkbox.checked) {
      checkbox.click()
    }
  })
}


function hideAll(segments) {
  segments.forEach(segment => {
    const checkbox = segment.getElementsByClassName('segment-checkbox')[0]
    if (checkbox.checked) {
      checkbox.click()
    }
  })
}

function openInNewTab(type) {
  const ids = type.map(segment => segment.getElementsByClassName('segment-button')[0].dataset.segId)

  if (!ids) return

  openSegmentsInNewTab(ids)
}


function openSegmentsInNewTab(ids) {

  function prepareState(ids) {
    const state = viewer.saver.pull()

    state.state.layers.forEach(layer => {
      if (layer.type !== 'segmentation_with_graph') return

      layer.segments = ids
      layer.hiddenSegments = []
    })

    return state
  }

  function addToLS(state) {
    const stateId = Dock.getRandomHexString()
    const stateKey = 'neuroglancerSaveState_v2'
    const lsName = stateKey + '-' + stateId
    
    // Source: neuroglancer/save_state/savet_state.ts -> SaveState -> robustSet()
    while (true) {
      try {
        localStorage.setItem(lsName, JSON.stringify(state))
        let stateManager = localStorage.getItem(stateKey)
        if (stateManager) {
          stateManager = JSON.parse(stateManager)
          stateManager.push(stateId)
          localStorage.setItem(stateKey, JSON.stringify(stateManager))
        }
        break
      }
      catch (e) {
        const manager = JSON.parse(localStorage.getItem(stateKey))
        if (!manager.length) throw e

        const targets = manager.splice(0, 1);
        const serializedManager = JSON.stringify(manager)
        localStorage.setItem(stateKey, serializedManager)
        targets.forEach(key => localStorage.removeItem(`${stateKey}-${key}`))
      }
    }

    return stateId
  }

  function openInNewTab(stateId) {
    const url = new URL(unsafeWindow.location.href)

    unsafeWindow.open(url.origin + '/?local_id=' + stateId, '_blank')
  }

  const newState = prepareState(ids)
  const stateId = addToLS(newState)
  openInNewTab(stateId)
}

function remove(type) {
  type.forEach(segment => segment.getElementsByClassName('segment-button')[0].click())
}

function copy(type) {
  const ids = type.map(segment => segment.getElementsByClassName('segment-button')[0].dataset.segId)

  navigator.clipboard.writeText(ids.join('\r\n'))
}

function changeColor(type) {
  const colorSelectors = type.map(segment => segment.getElementsByClassName('segment-color-selector')[0])
  const previousColors = colorSelectors.map(selector => selector.value)
  let pickr

  Dock.dialog({
    id: 'kk-change-color-dialog',
    html: '<input id="kk-change-color-selector" />',
    okCallback: okCallback,
    okLabel: 'Change',
    cancelCallback: () => {},
    cancelLabel: 'Cancel',
    afterCreateCallback: afterCreateCallback,
    width: 228,
    destroyAfterClosing: true
  }).show()

  function okCallback() {
    const newColorArray = pickr.getColor().toRGBA()
    let newColor = '#'
    
    for (let i = 0; i <= 2; i++) {
      let colorComponent = Math.round(newColorArray[i]).toString(16)
      if (colorComponent.length < 2) {
        colorComponent = '0' + colorComponent
      }
      newColor += colorComponent
    }

    colorSelectors.forEach(selector => {
      selector.value = newColor
      const event = new Event('change')
      selector.dispatchEvent(event)
    })

    viewer.layerManager.layersChanged.dispatch()
  }

  function afterCreateCallback() {
    pickr = Pickr.create({
      el: '#kk-change-color-selector',
      theme: 'nano',
      showAlways: true,
      inline: true,
      default: previousColors[0],
      defaultRepresentation: 'HEX',
      position: 'top-middle',
      components: {
        palette: false,
        preview: true,
        hue: true,
        interaction: {
          input: true
        }
      }
    })
    document.getElementsByClassName('pickr')[0].style.display = 'none'
  }
}

let findImmediatePartners = false
const MAX_IMMEDIATE_PARTNERS = 30
const findCommon = (type, immediate = false) => {
  if (immediate) {
    findImmediatePartners = true
  }

  let ids = type.map(segment => segment.getElementsByClassName('segment-button')[0].dataset.segId)
  findCommon.idsLength = Math.min(ids.length, findImmediatePartners ? MAX_IMMEDIATE_PARTNERS : MAX_NUMBER_OF_SOURCES)
  
  if (!ids || !findCommon.idsLength) return error('No segments selected')

  findCommon.numberOfSources = Math.min(ids.length, findImmediatePartners ? MAX_IMMEDIATE_PARTNERS : MAX_NUMBER_OF_SOURCES)
  ids = ids.slice(0, findImmediatePartners ? MAX_IMMEDIATE_PARTNERS : MAX_NUMBER_OF_SOURCES)

  Dock.dialog({
    id: 'kk-find-common-dialog',
    html: findCommon_getHtml(ids),
    css: findCommon_getCss(),
    okCallback: () => {},
    okLabel: 'Close',
    width: 810,
    afterCreateCallback: findCommon_addEventListeners,
    destroyAfterClosing: true
  }).show()

  ids.forEach(id => {
    getConnectivity(id, findCommon.onload, findCommon.onreadystatechange)
  })
}


findCommon.finishedCounter = 0
findCommon.results = new Map()


findCommon.onload = (res, id, direction) => {
  const statusColumn = document.querySelector(`#kk-find-common-row-${id} .kk-find-common-row-status`)

  try {
    res = JSON.parse(res.responseText).response
  }
  catch {
    statusColumn.textContent = 'Error'
    statusColumn.style.color = '#FF0000'
  }
  if (!res) return

  findCommon.results.set(id, {
    upstream: filterResults(res.incoming_table, 'Upstream Partner ID'),
    downstream: filterResults(res.outgoing_table, 'Downstream Partner ID')
  })

  statusColumn.textContent = 'Success'
  statusColumn.style.color = '#00FF00'
}


findCommon.onreadystatechange = (res, id, direction) => {
  if (res && res.readyState === 4) {
    findCommon.finishedCounter++
  }

  if (findCommon.finishedCounter === findCommon.idsLength) {
    document.getElementById('kk-find-common-results-wrapper-wrapper').style.display = 'block'
  // without setTimeout onreadystatechange is called before last setting of results in the onload
    setTimeout(() => {
      prepareWideFieldResults(MAX_NUMBER_OF_RESULTS, findCommon.results, findCommon.numberOfSources)
      findCommon.finishedCounter = 0
      findCommon.results = new Map()
    }, 0)
  }
}


function findCommon_getHtml(ids) {
  let html = /*html*/`
    <table id="kk-find-common-sources-table">
      ${ids.map((id, index) => `
        <tr id="kk-find-common-row-${id}">
          <td class="kk-find-common-row-id" style="color: ${FIND_COMMON_COLORS[index]};">${id}</td>
          <td class="kk-find-common-row-status" style="color: yellow;">Fetching data...</td>
        </tr>
      `).join('')}
    </table>
    ${DEV ? '<button id="kk-find-common-clear-stored">Clear stored</button>' : ''}
    <div id="kk-find-common-results-wrapper-wrapper">
      <hr />
      <div class="kk-find-common-results-wrapper">
        <div>Common upstream partners</div>
        <label><input type="checkbox" id="kk-find-common-upstream-select-all">Select all</label>
        <table id="kk-find-common-upstream-summary"></table>
      </div>
      <div class="kk-find-common-results-wrapper">
        <div>Common downstream partners</div>
        <label><input type="checkbox" id="kk-find-common-downstream-select-all">Select all</label>
        <table id="kk-find-common-downstream-summary"></table>
      </div>
      <hr />
      With selected:
      <button id="kk-find-common-get-all-upstream">Get all upstream partners</button>
      <button id="kk-find-common-get-all-downstream">Get all downstream partners</button>
      <button id="kk-find-common-get-all">Get all partners</button><br />

      <button id="kk-find-common-copy-results">Copy</button>
      <button id="kk-find-common-get-common-upstream">Get common upstream partners</button>
      <button id="kk-find-common-get-common-downstream">Get common downstream partners</button>
      <button id="kk-find-common-get-common">Get common partners</button>
    </div>
  `

  return html
}


function findCommon_getCss() {
  return /*css*/`
    #kk-find-common-sources-table {
      margin: auto;
      margin-bottom: 15px;
      font-size: 15px;
    }

    #kk-find-common-upstream-summary,
    #kk-find-common-downstream-summary {
      border-collapse: collapse;
      margin-top: 10px;
    }

    #kk-find-common-upstream-summary .result-color,
    #kk-find-common-downstream-summary .result-color {
      width: 17px;
    }

    #kk-find-common-upstream-summary .result-id,
    #kk-find-common-downstream-summary .result-id {
      padding-right: 10px;
    }

    .kk-find-common-row-id {
      padding: 0 20px;
    }

    #kk-find-common-results-wrapper-wrapper {
      display: none;
      text-align: center;
    }

    .kk-find-common-results-wrapper {
      display: inline-block;
      font-size: 14px;
      font-weight: 300;
      width: 45%;
    }

    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-all-upstream,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-common-upstream,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-all-downstream,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-common-downstream,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-all,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-common {
      width: 220px;
    }

    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-all-upstream {
      margin-left: 10px;
    }

    #kk-find-common-results-wrapper-wrapper #kk-find-common-copy-results {
      margin: 10px 40.5px 15px 0;
    }
  `
}



function findCommon_addEventListeners() {
  
  function addListener(id, type, source) {
    document.getElementById(id).addEventListener('click', getWideFieldResults.bind(null, type, source))
  }

  addListener('kk-find-common-get-all-upstream', 'all', 'upstream')
  addListener('kk-find-common-get-common-upstream', 'common', 'upstream')
  addListener('kk-find-common-get-all-downstream', 'all', 'downstream')
  addListener('kk-find-common-get-common-downstream', 'common', 'downstream')
  addListener('kk-find-common-get-all', 'all', 'both')
  addListener('kk-find-common-get-common', 'common', 'both')

  document.getElementById('kk-find-common-copy-results').addEventListener('click', copySelectedWideFieldResults)

  function selectAll(direction) {
    document.getElementById(`kk-find-common-${direction}stream-select-all`).addEventListener('click', e => {
      const checked = e.target.checked
      document.querySelectorAll(`#kk-find-common-${direction}stream-summary input[type="checkbox"]:not([disabled])`).forEach(el => {
        el.checked = checked
      })
    })
  }

  selectAll('up')
  selectAll('down')

  if (DEV) {
    document.getElementById('kk-find-common-clear-stored').addEventListener('click', e => {
      localStorage.removeItem('stored-ids-down-upstream')
      localStorage.removeItem('stored-ids-up-downstream')
      document.querySelectorAll('#kk-find-common-results-wrapper-wrapper .result-id input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = false
      })
    })
  }
}


function copySelectedWideFieldResults() {
  const ids = []

  document.querySelectorAll('.result-id input[type="checkbox"]:checked').forEach(el => {
    ids.push(el.parentElement.parentElement.dataset.id)
  })

  navigator.clipboard.writeText(ids.join('\r\n')).then(() => {
    Dock.dialog({
      id: 'kk-find-common-copy-results-direct',
      html: 'The IDs have been copied to clipboard',
      cancelCallback: () => {},
      cancelLabel: 'Close'
    }).show()
  })
}


const getWideFieldResults = (type, source) => {
  getWideFieldResults.type = type
  getWideFieldResults.source = source
  getWideFieldResults.numberOfFinishedRequests = 0
  getWideFieldResults.results = {
    upstream: {},
    downstream: {}
  }

  const resultIds = document.getElementsByClassName('result-id');
  for (let i = 0; i < resultIds.length; i++) {
    resultIds[i].style.color = 'white';
  }

  const ids = Array.from(document.querySelectorAll('.result-id input[type="checkbox"]:checked'))
    .map(el => {
      const grandParent = el.parentElement.parentElement;
      const id = grandParent.dataset.id;
      const direction = grandParent.classList.contains('up') ? 'up' : 'down';
      if (id) {
        getConnectivity(id, getWideFieldResults.onload, getWideFieldResults.onreadystatechange, getWideFieldResults.onerror, direction);
        document.getElementById(`result-id-${id}-${direction}`).style.color = 'yellow';
        return id;
      }
    })
    .filter(Boolean);

  if (!ids.length) {
    return;
  }
  getWideFieldResults.numberOfCells = ids.length
}


getWideFieldResults.onload = (res, id, direction) => {
  try {
    res = JSON.parse(res.responseText).response;
  } catch (error) {
    document.getElementById(`result-id-${id}-${direction}`).style.color = '#FF0000';
    return;
  }
  if (!res) {
    return;
  }

  getWideFieldResults.results.upstream[id] = filterResults(res.incoming_table, 'Upstream Partner ID');
  getWideFieldResults.results.downstream[id] = filterResults(res.outgoing_table, 'Downstream Partner ID');
}

getWideFieldResults.onreadystatechange = (res, id, direction) => {
  if (!res) {
    return;
  }

  const statusColumn = document.getElementById(`result-id-${id}-${direction}`);

  switch (res.readyState) {
    case 3:
      statusColumn.style.color = '#FFA500';
      break;
    case 4:
      getWideFieldResults.numberOfFinishedRequests++;
      statusColumn.style.color = '#00FF00';
      if (getWideFieldResults.numberOfFinishedRequests === getWideFieldResults.numberOfCells) {
        setTimeout(getPartnersOfPartners.bind(null, getWideFieldResults.results, getWideFieldResults.type, getWideFieldResults.source), 0);
      }
      break;
  }
}

getWideFieldResults.onerror = (res, id, direction) => {
  document.getElementById(`result-id-${id}-${direction}`).style.color = '$FF0000';
}




function prepareWideFieldResults(MAX_NUMBER_OF_RESULTS, results, numberOfSources) {
  let position = 0
  const upstream = {}
  const downstream = {}

  results.forEach((result) => {
    result.upstream.forEach((partnerId) => {
      upstream[partnerId] = upstream[partnerId] || new Array(numberOfSources).fill(false)
      upstream[partnerId][position] = true
    })

    result.downstream.forEach((partnerId) => {
      downstream[partnerId] = downstream[partnerId] || new Array(numberOfSources).fill(false)
      downstream[partnerId][position] = true
    })

    position++
  })

  if ((QUICK_FIND || findImmediatePartners) && results) {
    const ids = Array.from(results).flatMap((el) => [...el[1].downstream])
    ids.push(...Array.from(results).flatMap((el) => [...el[1].upstream]))
    Dock.dialog({
      id: 'kk-find-common-quick-find-dialog',
      html: `Found ${ids.length} IDs`,
      okCallback: () => {
        navigator.clipboard.writeText(ids.join('\r\n')).then(() => {
          Dock.dialog({
            id: 'kk-find-common-quick-find-copied-dialog',
            html: 'IDs copied to clipboard',
            okLabel: 'OK',
            okCallback: () => {},
            destroyAfterClosing: true
          }).show()
        })
      },
      okLabel: 'Copy',
      cancelCallback: () => {},
      cancelLabel: 'Cancel',
      destroyAfterClosing: true
    }).show()
  }
  else {
    const countOccurences = (data) => {
      return Object.entries(data).map(([id, state]) => {
        const sum = state.reduce((sum, value) => sum + value, 0)
        return { id, sum }
      }).sort((a, b) => b.sum - a.sum)
    }

    const numberOfOccurencesUpstream = countOccurences(upstream)
    const numberOfOccurencesDownstream = countOccurences(downstream)

    const tableUpstream = document.getElementById('kk-find-common-upstream-summary')
    const tableDownstream = document.getElementById('kk-find-common-downstream-summary')
    tableUpstream.innerHTML = generateWideFieldResultsHtml(numberOfOccurencesUpstream, upstream, 'up')
    tableDownstream.innerHTML = generateWideFieldResultsHtml(numberOfOccurencesDownstream, downstream, 'down')
  }
}



function generateWideFieldResultsHtml(occurences, sources, streamDirection) {
  let html = '';

  // the switched directions isn't an error - it's source vs destination
  const storedDirection = streamDirection === 'up' ? 'up-downstream' : 'down-upstream'
  let storedIds = localStorage.getItem('stored-ids-' + storedDirection)
  if (storedIds) {
    storedIds = storedIds.split(',')
  }

  for (let i = 0; i < MAX_NUMBER_OF_RESULTS; i++) {
    const id = occurences[i].id;
    let sourcesHtml = '';

    sources[id].forEach((source, index) => {
      const bgColor = source ? FIND_COMMON_COLORS[index] : 'transparent';
      sourcesHtml += `<td class="result-color" style="background-color: ${bgColor}"></td>`;
    });


    let disabled = ''
    if (storedIds && storedIds.length) {
      disabled = storedIds.includes(id) ? 'disabled' : ''
    }

    const resultId = `result-id-${id}-${streamDirection}`;
    html += `
      <tr>
        <td id="${resultId}" class="result-id ${streamDirection}" data-id="${id}">
          <label><input type="checkbox" ${disabled}>${id}</label>
        </td>
        ${sourcesHtml}
      </tr>`;
  }

  return html;
}


function filterResults(table, rowName) {
  const ids = []

  table.data.forEach(row => {
    const text = row[rowName]
    if (!text) return

    const id = text.substring(1, text.indexOf(']'))
    ids.push(id)
  })

  return ids
}



function getPartnersOfPartners(results, type, source) {
  let partnersResults = [];
  let tableToAnalyze = [];
  let numberOfTables = 0;

  const ids = []

  if (source === 'upstream' || source === 'both') {
    Object.values(results.upstream).forEach(partners => {
      tableToAnalyze.push(...partners);
      numberOfTables++;
    });

    for (const [key, value] of Object.entries(results.upstream)) {
      if (value.length) {
        ids.push(key)
      }
    }
  }
  
  if (source === 'downstream' || source === 'both') {
    Object.values(results.downstream).forEach(partners => {
      tableToAnalyze.push(...partners);
      // for "both" we would count the same "big" common synaptic parnter twice
      if (source !== 'both') {
        numberOfTables++;
      }
    });

    for (const [key, value] of Object.entries(results.downstream)) {
      if (value.length) {
        ids.push(key)
      }
    }
  }

  if (type === 'common') {
    const counters = {};
    tableToAnalyze.forEach(partner => {
      counters[partner] = (counters[partner] || 0) + 1;
    });

    Object.entries(counters).forEach(([id, count]) => {
      if (count === numberOfTables) {
        partnersResults.push(id);
      }
    });
  }
  else {
    partnersResults = [...new Set(tableToAnalyze)];
  }

  partnersResults.sort();

  const dialogContent = `Found ${partnersResults.length} result(s)<br />Click the "Copy" button to copy the results to clipboard`;
  const okCallback = () => {
    if (DEV) {
      markChecked_DEV(source, ids)
    }

    navigator.clipboard.writeText(partnersResults.join('\r\n')).then(() => {
      Dock.dialog({
        id: 'kk-copy-common-copied-confirm',
        html: 'IDs have been copied to clipboard',
        cancelCallback: () => {},
        cancelLabel: 'Close'
      }).show();
    });
  };

  Dock.dialog({
    id: 'kk-find-common-ids-copied-msg',
    html: dialogContent,
    okCallback,
    okLabel: 'Copy',
    cancelCallback: () => {},
    cancelLabel: 'Close'
  }).show();
}


function markChecked_DEV(source, ids) {
  // downstream of upstream
  if (source === 'downstream' || source === 'both') {
    let storedIds = localStorage.getItem('stored-ids-up-downstream')
    if (storedIds) {
      storedIds = storedIds.split(',')
      storedIds.push(...ids)
    }
    else {
      storedIds = ids
    }
    localStorage.setItem('stored-ids-up-downstream', storedIds)

    document.querySelectorAll('#kk-find-common-upstream-summary input[type="checkbox"]').forEach(checkbox => {
      const id = checkbox.closest('td').dataset.id
      if (storedIds.includes(id)) {
        checkbox.checked = false
        checkbox.disabled = true
      }
    })
  }

  // upstream of downstream
  if (source === 'upstream' || source === 'both') {
    let storedIds = localStorage.getItem('stored-ids-down-upstream')
    if (storedIds) {
      storedIds = storedIds.split(',')
      storedIds.push(...ids)
    }
    else {
      storedIds = ids
    }
    localStorage.setItem('stored-ids-down-upstream', storedIds)

    document.querySelectorAll('#kk-find-common-downstream-summary input[type="checkbox"]').forEach(checkbox => {
      const id = checkbox.closest('td').dataset.id
      if (storedIds.includes(id)) {
        checkbox.checked = false
        checkbox.disabled = true
      }
    })
  }
}


const showNeuropilsCoverage = (segments) => {
  Dock.dialog({
    width: 720,
    id: 'show-neuropils-coverage',
    html: showNeuropilsCoverage.generateHtml(segments),
    css: showNeuropilsCoverage.getCss(),
    destroyAfterClosing: true,
    afterCreateCallback: () => {
      getConnectivities(segments)
      addButtonsEvents(segments)
    }
  }).show()
}

function getConnectivities(segments) {
  segments.forEach(segment => {
    const id = segment.firstElementChild.dataset.segId
    getConnectivityForARow(id)
  })
}

function getConnectivityForARow(id) {
  getConnectivity(id, onload, onreadystatechange)

  const idCell = document.getElementById(`neuropils-for-${id}`)
  if (idCell) {
    idCell.style.color  = 'yellow'
  }

  function onload(res) {
    try {
      res = JSON.parse(res.responseText).response;
      addNeuropilsBars(id, res.graph_div.children[2].props.children.props.figure.data[0], true)
      addNeuropilsBars(id, res.graph_div.children[3].props.children.props.figure.data[0], false)
      addNeurotransmitters(id, res.incoming_table.data, true)
      addNeurotransmitters(id, res.outgoing_table.data, false)
      document.querySelector(`#neuropils-for-${id} button`)?.classList.add('retry-button-hidden')
    }
    catch {
      document.querySelector(`#neuropils-for-${id} button`)?.classList.remove('retry-button-hidden')
      if (idCell) {
        idCell.style.color = '#FF0000'
      }
    }
  }

  function onreadystatechange(res, id) {
    const idCell = document.getElementById(`neuropils-for-${id}`)

    // cell might've been removed before finishing the task
    if (!idCell) return

    switch (res.readyState) {
      case 3:
        idCell.style.color = '#FFA500';
        break;
      case 4:
        idCell.style.color = '#00FF00';
        break;
    }
  }
}

function addButtonsEvents(segments) {
  document.getElementById('neuropils-coverage-table').addEventListener('click', e => {
    if (e.target.classList.contains('retry-button')) {
      const row = e.target.parentElement.parentElement
      getConnectivityForARow(row.dataset.segId)
      row.style.height = 0
      e.target.classList.add('retry-button-hidden')
    }
  })

  document.getElementById('neuropils-select-all')?.addEventListener('click', e => {
    document.querySelectorAll('#show-neuropils-coverage .neuropils-select-id').forEach(checkbox => {
      if (!checkbox.parentElement.parentElement?.classList.contains('neuropils-hidden-row')) {
        checkbox.checked = e.target.checked
      }
    })
  })

  document.getElementById('neuropils-copy-selected')?.addEventListener('click', e => {
    const selected = []
    document.querySelectorAll('#show-neuropils-coverage .neuropils-select-id:checked').forEach(checkbox => {
      selected.push(checkbox.parentElement?.parentElement?.dataset.segId)
    })

    navigator.clipboard.writeText(selected.join('\r\n'))
  })

  document.getElementById('neuropils-hide-selected')?.addEventListener('click', e => {
    document.querySelectorAll('#show-neuropils-coverage .neuropils-select-id:checked').forEach(checkbox => {
      checkbox.checked = false
      const row = checkbox.parentElement.parentElement
      row?.classList.add('neuropils-hidden-row')

    })
  })

  document.getElementById('neuropils-hide-unselected')?.addEventListener('click', e => {
    document.querySelectorAll('#show-neuropils-coverage .neuropils-select-id:not(:checked)').forEach(checkbox => {
      const row = checkbox.parentElement.parentElement
      row?.classList.add('neuropils-hidden-row')
    })
  })

  document.getElementById('neuropils-show-all-hidden')?.addEventListener('click', e => {
    document.querySelectorAll('#show-neuropils-coverage .neuropils-row').forEach(row => {
      row?.classList.remove('neuropils-hidden-row')
    })
  })

  document.getElementById('neuropils-remove-selected')?.addEventListener('click', e => {
    document.querySelectorAll('.neuropils-select-id').forEach(el => {
      if (el.checked) {
        el.parentElement?.parentElement.remove()
      }
    })
  })

  // here and below .querySelectorAll() instead of .getElementsByTagName(), because the latter creates a live NodeList,
  // which shrinks while removing elements from it
  document.getElementById('neuropils-remove-visible')?.addEventListener('click', e => {
    document.querySelectorAll('.neuropils-row').forEach(el => {
      if (!el.classList.contains('neuropils-hidden-row')) {
        el.remove()
      }
    })
  })

  document.getElementById('neuropils-remove-hidden')?.addEventListener('click', e => {
    document.querySelectorAll('.neuropils-hidden-row').forEach(el => {
      el.remove()
    })
  })
}

showNeuropilsCoverage.generateHtml = (segments) => {
  let html = `
    <label><input type="checkbox" id="neuropils-select-all">Select All</label>
    <button id="neuropils-copy-selected">Copy selected</button>
    <button id="neuropils-hide-selected">Hide selected</button>
    <button id="neuropils-hide-unselected">Hide unselected</button>
    <button id="neuropils-show-all-hidden">Show all hidden</button>
    <div id="neuropils-second-row-of-buttons">
      <button id="neuropils-remove-selected">Remove selected</button>
      <button id="neuropils-remove-visible">Remove visible</button>
      <button id="neuropils-remove-hidden">Remove hidden</button>
    </div>
    <hr />
  `

  html += '<table id="neuropils-coverage-table">'
  html += '<tr id="neuropils-neurotransmitters-header"><th></th><th>ID</th><th>neuropils</th><th>neurotransmitters</th></tr>'
  segments.forEach(segment => {
    const id = segment.firstElementChild.dataset.segId
    html += `<tr id="neuropils-for-${id}" class="neuropils-row" data-seg-id="${id}">
      <td><input type="checkbox" class="neuropils-select-id"></td>
      <td>${id}</td>
      <td class="neuropils-bars-cell"><div class="neuropils-bars-wrapper"></div></td>
      <td class="neuropils-neurotransmitters"><div class="neurotransmitters-bars-wrapper"></div></td>
      <td><button class="retry-button retry-button-hidden">Retry</button></td>
    </tr>`
  })

  html += '</table>'

  return html
}


function addNeuropilsBars(id, result, firstRow) {
  const tableCell = document.querySelector(`#neuropils-for-${id} .neuropils-bars-wrapper`)
  // the class below to add the white background color only after the neuropils are ready to be displayed
  // otherwise there would be big bright empty bars shining at user
  tableCell.classList.add('neuropils-bars-cell-background')

  const { labels, values, marker: { colors } } = result;
  for (let i = 0; i < labels.length; i++) {
    const bar = document.createElement('div');
    bar.classList.add('neuropil-bar');
    bar.style.width = `${values[i] * 200}px`;
    bar.style.backgroundColor = `#${colors[i]}`;
    if (firstRow) {
      bar.classList.add('bar-separator')
    }
    bar.title = labels[i];
    tableCell.appendChild(bar);
  }
}


function addNeurotransmitters(id, result, firstRow) {
  let gaba = 0
  let ach  = 0
  let glut = 0
  let oct  = 0
  let ser  = 0
  let da   = 0
  let synapses = 0

  for (let i = 0; i < result.length; i++) {
    const res = result[i]
    const syn = parseInt(res['Synapses'], 10)

    gaba += parseFloat(res['Gaba Avg']) / syn
    ach  += parseFloat(res['Ach Avg'] ) / syn
    glut += parseFloat(res['Glut Avg']) / syn
    oct  += parseFloat(res['Oct Avg'] ) / syn
    ser  += parseFloat(res['Ser Avg'] ) / syn
    da   += parseFloat(res['Da Avg']  ) / syn

    synapses += syn
  }

  gaba /= synapses
  ach  /= synapses
  glut /= synapses
  oct  /= synapses
  ser  /= synapses
  da   /= synapses

  const coefficient = 1 / (gaba + ach + glut + oct + ser + da)

  gaba *= coefficient
  ach *= coefficient
  glut *= coefficient
  oct *= coefficient
  ser *= coefficient
  da *= coefficient

  const wrapper = document.createElement('div')
  wrapper.classList.add('neuropils-neurotransmitters-wrapper')
  if (firstRow) {
    document.querySelector(`#neuropils-for-${id} .neurotransmitters-bars-wrapper`).remove()
    wrapper.classList.add('bar-separator')
  }
  document.querySelector(`#neuropils-for-${id} .neuropils-neurotransmitters`).appendChild(wrapper)
  createNeurotransmitterBar(id, wrapper, 'Gaba', gaba)
  createNeurotransmitterBar(id, wrapper, 'Ach',  ach)
  createNeurotransmitterBar(id, wrapper, 'Glut', glut)
  createNeurotransmitterBar(id, wrapper, 'Oct',  oct)
  createNeurotransmitterBar(id, wrapper, 'Ser',  ser)
  createNeurotransmitterBar(id, wrapper, 'Da',   da)
}


function createNeurotransmitterBar(id, target, type, size) {
  const bar = document.createElement('div')
  bar.classList.add('neurotransmitter-circle')
  bar.classList.add('nt-' + type.toLowerCase())
  bar.style.height = '10px'
  bar.style.width = size * 200 + 'px'
  bar.title = type
  target?.appendChild(bar)
}


showNeuropilsCoverage.getCss = () => {
  return /*css*/`
    #show-neuropils-coverage .content {
      max-height: 95vh;
      overflow-y: auto;
    }

    #neuropils-neurotransmitters-header {
      position: sticky;
      top: 0px;
      background-color: #222;
    }

    #neuropils-coverage-table tr:hover {
      background-color: #333;
    }

    .neuropils-row {
      font-size: 14px;
    }

    .neuropils-hidden-row {
      visibility: collapse;
    }

    #show-neuropils-coverage .content button.retry-button {
      height: 20px;
      width: 70px;
    }
    .neuropils-neurotransmitters {
      width: 200px;
    }

    .neurotransmitters-bars-wrapper,
    .neuropils-bars-wrapper {
      margin-left: 10px;
      width: 200px;
      height: 18px;
      line-height: 0;
      border: 1px solid gray;
    }

    .neuropils-bars-cell-background {
      background-color: white;
    }

    .neuropil-bar {
      display: inline-block;
      height: 9px;
    }

    .retry-button-hidden {
      visibility: hidden;
    }

    #neuropils-select-all {
      vertical-align: text-top;
      margin-right: 8px;
      cursor: pointer;
    }

    label:has(#neuropils-select-all) {
      cursor: pointer;
      user-select: none;
    }

    #show-neuropils-coverage .content button {
      width: 120px;
    }

    .neuropils-neurotransmitters-wrapper {
      line-height: 0;
    }

    #neuropils-second-row-of-buttons {
      margin: 10px 0 0 95px;
    }

    .neurotransmitter-circle {
      display: inline-block;
      background-color: lightblue;
      vertical-align: middle;
    }

    .nt-gaba {
      background-color: rgb(99, 110, 250);
    }

    .nt-ach {
      background-color: rgb(239, 85, 59);
    }

    .nt-glut {
      background-color: rgb(0, 204, 150);
    }

    .nt-oct {
      background-color: rgb(171, 99, 250);
    }

    .nt-ser {
      background-color: rgb(255, 161, 90);
    }

    .nt-da {
      background-color: rgb(25, 211, 243);
    }

    .bar-separator {
      border-bottom: 1px solid white;
      width: 200px;
    }
  `
}
function showStatusesAndLabels(visible) {
  const ids = visible.map(segment => segment.firstChild.dataset.segId)

  displayDialogWindow(ids)
  getLabels(ids, fillLabels)
  getStatuses(ids, fillStatuses)
}


function displayDialogWindow(ids) {
  Dock.dialog({
    width: 950,
    id: 'statuses-dialog',
    html: buildTable(ids),
    css: addStatusesCss(),
    afterCreateCallback: addStatusButtonsEvents,
    destroyAfterClosing: true,
    okCallback: () => {},
    okLabel: 'Close'
  }).show()
}


function addHeaderBar() {
  return /*html*/`
    <div id="statuses-header-bar">
      <label><input type="checkbox" id="statuses-select-all">Select all</label>
      <button id="statuses-copy-selected">Copy selected</button>
      <button id="statuses-copy-identified">Copy identified</button>
      <button id="statuses-copy-completed">Copy completed</button>
      <button id="statuses-copy-incompleted">Copy incompleted</button>
      <button id="statuses-copy-outdated">Copy outdated</button>
    </div>
    <div id="statuses-second-header-bar">
      <button id="statuses-remove-selected">Remove selected</button>
      <button id="statuses-remove-identified">Remove identified</button>
      <button id="statuses-remove-completed">Remove completed</button>
      <button id="statuses-remove-incompleted">Remove incompleted</button>
      <button id="statuses-remove-outdated">Remove outdated</button>
    </div>
    <button id="statuses-update-outdated">Update outdated</button>
    <hr />

  `
}


function buildTable(ids) {
  let html = addHeaderBar()

  html += '<table id="statuses-and-labels-table">'
  html += /*html*/`
    <tr>
      <th></th>
      <th>ID</th>
      <th>Statuses</th>
      <th>Labels</th>
      <th>Authors</th>
      <th>Affiliations</th>
    </tr>`

  ids.forEach(id => {
    html += /*html*/`<tr id="status-for-${id}" data-seg-id="${id}">
      <td class="statuses-checkbox"><input type="checkbox" /></td>
      <td class="statuses-id">${id}</td>
      <td class="statuses-status"></td>
      <td class="statuses-labels"></td>
      <td class="statuses-authors"></td>
      <td class="statuses-affiliation"></td>
    </tr>`
  })
  html += '</table>'

  return html
}


function addStatusButtonsEvents() {
  document.getElementById('statuses-select-all').addEventListener('click', e => {
    document.querySelectorAll('.statuses-checkbox input').forEach(checkbox => {
      checkbox.checked = e.target.checked
    })
  })

  
  function copy(buttonId, selector) {
    document.getElementById(buttonId).addEventListener('click', () => {
      const table = document.getElementById('statuses-and-labels-table')
      const selected = []

      table.querySelectorAll(selector).forEach(checkbox => {
        selected.push(checkbox.closest('tr').dataset.segId)
      })
  
      navigator.clipboard.writeText(selected.join('\r\n'))
    })
  }

  copy('statuses-copy-selected', '.statuses-checkbox input:checked')
  copy('statuses-copy-identified', '.identified')
  copy('statuses-copy-completed', '.completed')
  copy('statuses-copy-incompleted', '.incompleted')
  copy('statuses-copy-outdated', '.outdated')


  function remove(buttonId, selector) {
    document.getElementById(buttonId).addEventListener('click', e => {
      const container = document.querySelector('.item-container')
  
      document.getElementById('statuses-and-labels-table').querySelectorAll(selector).forEach(cell => {
        const row = cell.closest('tr')
        const id = row.dataset.segId
        row?.remove()
        container.querySelector(`.segment-button[data-seg-id="${id}"]`).click()
      })
    })
  }

  remove('statuses-remove-selected', '.statuses-checkbox input:checked')
  remove('statuses-remove-identified', '.identified')
  remove('statuses-remove-completed', '.completed')
  remove('statuses-remove-incompleted', '.incompleted')
  remove('statuses-remove-outdated', '.outdated')
}


function fillLabels(data) {
  const identifiedIds = []
  for (let i = 0; i < data.id.length; i++) {
    const id = data.id[i]

    identifiedIds.push(id.toString()) // .toString() to compare two arrays with the same type

    const label = document.createElement('div')
    label.classList.add('statuses-label')
    label.textContent = data.tag[i]
    document.querySelector(`#status-for-${id} .statuses-labels`)?.appendChild(label)
    
    const name = document.createElement('div')
    name.classList.add('statuses-name')
    name.textContent = data.userName[i]
    document.querySelector(`#status-for-${id} .statuses-authors`)?.appendChild(name)

    const aff = document.createElement('div')
    aff.classList.add('statuses-name')
    aff.textContent = data.userAffiliation[i]
    document.querySelector(`#status-for-${id} .statuses-affiliation`)?.appendChild(aff)
  }
}


function fillStatuses(results) {
  if (!results || !Object.keys(results)) return

  Object.entries(results).forEach(entry => {
    const id = entry[0]
    const className = entry[1]
    const statusCell = document.querySelector(`#status-for-${id} .statuses-status`)
    statusCell.classList.add(className)
  })
}


function addStatusesCss() {
  return /*css*/`
    #statuses-dialog .content {
      max-height: 90vh;
      overflow-y: auto;
      font-size: 12px;
    }

    label:has(#statuses-select-all) {
      margin-right: 20px;
      cursor: pointer;
      user-select: none;
    }

    #statuses-select-all {
      vertical-align: text-bottom;
      margin: 0 7px;
    }

    #statuses-dialog #statuses-header-bar button,
    #statuses-dialog #statuses-second-header-bar button {
      width: 140px;
    }

    #statuses-dialog #statuses-second-header-bar button {
      margin-top: 10px;
    }

    #statuses-remove-selected {
      margin-left: 98.5px;
    }

    #statuses-dialog th {
      top: 20px;
      position: sticky;
      background-color: #222;
    }

    #statuses-dialog tr:nth-child(even) {
      background-color: #333;
    }

    #statuses-dialog td {
      padding: 0 30px 0 5px;
    }

    #statuses-dialog .statuses-checkbox {
      padding: 0 5px;
      vertical-align: middle;
    }

    .statuses-labels {
      color: lightgreen;
    }

    .statuses-status.identified {
      background-color: #2ecc71;
    }

    .statuses-status.completed {
      background-color: #b01fff;
    }

    .statuses-status.incompleted {
      background-color: #e2c96a;
    }

    .statuses-status.outdated {
      background-color: #111111;
    }
  `
}

function getSynapticPartners(visible) {
  if (!visible || !visible.length) return console.warn('Batch Processor - no visible segments')

  const id = visible[0].firstElementChild.dataset.segId
  if (!id) return console.warn('Batch Processor - no visible segments')

  getSynapticPartners.id = id

  Dock.dialog({
    width: 1000,
    id: 'get-synaptic-partners-dialog',
    html: getSynapticPartners.html(id),
    css: getSynapticPartners.css(),
    destroyAfterClosing: true,
    okLabel: 'Close',
    okCallback: () => {}
  }).show()

  getConnectivity(id, getSynapticPartners.onload, null, null)
}

getSynapticPartners.onload = (res) => {
  let data = JSON.parse(res.responseText)
  if (!data) return console.warn('Batch Processor - no data')
  data = data.response

  const incoming = getIdsFromData(data.incoming_table.data, 'Upstream Partner ID')
  const outgoing = getIdsFromData(data.outgoing_table.data, 'Downstream Partner ID')
  const incomingSynapses = getSynapsesById(data.incoming_table.data, 'Upstream Partner ID')
  const outgoingSynapses = getSynapsesById(data.outgoing_table.data, 'Downstream Partner ID')
  console.log(incomingSynapses, outgoingSynapses)

  getLabels(incoming, showPartners.bind(null, 'incoming', incomingSynapses))
  getLabels(outgoing, showPartners.bind(null, 'outgoing', outgoingSynapses))
}

function getSynapsesById(data, rowLabel) {
  const synapses = []
  data.forEach(row => {
    synapses[row[rowLabel].split(']')[0].substr(1)] = parseInt(row['Synapses'], 10)
  })

  return synapses
}

function getIdsFromData(data, rowLabel) {
  return data.map(row => row[rowLabel].split(']')[0].substr(1))
}



function showPartners(type, synapses, data) {
  if (!data || !data.id.length) return

  const target = document.getElementById(`${type}-synaptic-partners-table`)
  const fragment = document.createDocumentFragment()
  const rows = {}

  for (let i = 0; i < data.id.length; i++) {
    const id = data.id[i]
    let tag = data.tag[i]
    const syn = synapses[id]
    const lTag = tag.toLowerCase()

    if (rows[lTag]) {
      rows[lTag].count += syn
    }
    else {
      rows[lTag] = { tag: fixTag(tag), count: syn }
    }
  }

  const sortedRows = Object.entries(rows).sort((a, b) => b[1].count - a[1].count)

  let html = ''
  for (let i = 0; i < sortedRows.length; i++) {
    const { tag, count } = sortedRows[i][1]
    const row = createRow(type, tag, count)
    fragment.appendChild(row)
  }

  target.innerHTML = ''
  target.appendChild(fragment)
}

function createRow(type, tag, count) {
  const tr = document.createElement('tr')

  const td = document.createElement('td')
  td.classList.add('synaptic-partners-tag')
  td.textContent = tag

  const counter = document.createElement('span')
  counter.classList.add('synaptic-partners-synapse-count')
  counter.textContent = `(${count})`

  if (type === 'incoming') {
    td.appendChild(counter)
  }
  else {
    td.insertBefore(counter, td.firstChild)
  }
  tr.appendChild(td)

  return tr
}


function fixTag(tag) {
  if (tag === 'protocerebral bridge 1 glomerulus-fan-shaped body-ventral gall surround neuron; AMPG-E; EB.w-AMP.d-D_GAsurround; P-F-Gs; FBbt_00111457') {
    return 'PFGs'
  }

  if (tag.includes('hDelta')) {
    return tag.match(/hDelta([A-M])/)[0]
  }

  if (tag.includes('vDelta')) {
    return tag.match(/vDelta([A-M])/)[0]
  }

  return tag
}




getSynapticPartners.html = (id) => {
  return /*html*/`
    <div id="synaptic-partners-wrapper">
      <div class="synaptic-partners-table-wrapper">
        <table id="incoming-synaptic-partners-table"></table>
      </div>
      <div id="synaptic-partners-center-segment">${id}</div>
      <div class="synaptic-partners-table-wrapper">
        <table id="outgoing-synaptic-partners-table"></table>
      </div>
    </div>
  `
}


getSynapticPartners.css = () => {
  return /*css*/`
  #get-synaptic-partners-dialog .content {
    max-height: 80vh;
  }

  #synaptic-partners-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .synaptic-partners-table-wrapper {
    width: 45%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  #incoming-synaptic-partners-table,
  #outgoing-synaptic-partners-table {
    width: 100%;
  }

  #incoming-synaptic-partners-table {
    border-right: 1px solid #aaa;
    text-align: right;
    color: #6cb4ff;
  }

  #outgoing-synaptic-partners-table {
    border-left: 1px solid #aaa;
    color: #fdbc44;
  }
  
  #synaptic-partners-center-segment {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    writing-mode: vertical-rl;
  }

  .synaptic-partners-tag {
    font-size: 12px;
    width: 400px;
    max-width: 400px;
    overflow: hidden;
  }

  .synaptic-partners-synapse-count {
    color: #57a757;
    display: inline-block;
    width: 50px;
  }
  `
}

function getPartnersOfCommon(startingIds, threshold = 4) {
  console.log('Getting partners of primary IDs...')
  const primaryPool = new RequestPool()
  primaryPool.runAllRequests(startingIds.split(',').map(id => id.trim())).then(primaryFinished)

  let finalResults

  function getMostCommon(ids) {
    // Step 1: Track frequency of IDs
    const frequency = {};
    console.log('counting...')
    ids.forEach((id) => {
      frequency[id] = (frequency[id] || 0) + 1;
    });
  
    // Step 2: Get IDs with frequency greater than ${threshold}
    const commonIDs = Object.keys(frequency).filter((id) => frequency[id] > threshold);
  
    // Step 3: Sort common IDs by frequency in descending order
    console.log('sorting...')
    const sortedIDs = commonIDs.sort((a, b) => frequency[b] - frequency[a]);
  
    // Step 4: Return sorted list of common IDs
    return sortedIDs.splice(0, 250);
  }
  

  let mostCommonDownstream // this one is outside the function, so it can be accessed by the upstreamFinished() function
  let directPartners = []
  function primaryFinished(results) {
    const idListUpstream = [];
    const idListDownstream = [];
    const len = results.length
    console.log('Primary - number of results: ', len)

    results.forEach((data, i) => {
      if (data === null) return
      if (data.status === 'rejected') return
      if (!data.value) return
      
      data = JSON.parse(data.value)
      try {
        console.log(`Merged an array to the results: ${i + 1}/${len}`)
        idListUpstream.push(...getIdsFromData(data.response.incoming_table.data, 'Upstream Partner ID'));
        idListDownstream.push(...getIdsFromData(data.response.outgoing_table.data, 'Downstream Partner ID'));
      }
      catch (error) {
        console.warn('No partners')
      }
    });

    // to get direct upstream and downstream partners
    directPartners = Array.from(new Set([...idListDownstream, ...idListUpstream]))
    // return console.log(directPartners.join(','))

    const mostCommonUpstream = getMostCommon(idListUpstream);
    mostCommonDownstream = getMostCommon(idListDownstream);

    console.log('Getting downstream partners of the primary\'s upstream ones...')
    const upstreamPool = new RequestPool()
    upstreamPool.runAllRequests(mostCommonUpstream).then(upstreamFinished)
  }


  function upstreamFinished(results) {
    const ids = []
    const len = results.length

    results.forEach((data, i) => {
      if (data === null) return
      if (data.status === 'rejected') return
      if (!data.value) return
      
      data = JSON.parse(data.value)
      try {
        console.log(`Merged an array to the upstream list: ${i + 1}/${len}`)
        ids.push(...getIdsFromData(data.response.outgoing_table.data, 'Downstream Partner ID'));
      }
      catch (error) {
        console.warn('No partners')
      }
    })

    finalResults = new Set(ids)
    console.log('downstream of upstream', Array.from(ids).join('\r\n'))
    
    console.log('Getting upstream partners of the primary\'s downstream ones...')
    const downstreamPool = new RequestPool()
    downstreamPool.runAllRequests(mostCommonDownstream).then(downstreamFinished)
  }

  function downstreamFinished(results) {
    const ids = []
    const len = results.length

    results.forEach((data, i) => {
      if (data === null) return
      if (data.status === 'rejected') return
      if (!data.value) return
      
      data = JSON.parse(data.value)
      try {
        console.log(`Merged an array to the downstream list: ${i + 1}/${len}`)
        ids.push(...getIdsFromData(data.response.incoming_table.data, 'Upstream Partner ID'));
      }
      catch (error) {
        console.warn('No partners')
      }
    })

    ids.forEach(id => {
      finalResults.add(id)
    })
    
    console.log('upstream of downstream', Array.from(ids).join('\r\n'))
    console.log('All: ', Array.from(new Set([...Dock.arraySubtraction(Array.from(finalResults), startingIds), ...directPartners])).join('\r\n'))
  }
}

function main() {
  addPickr()
  addActionsMenu()
  Dock.getPartnersOfCommon = getPartnersOfCommon
}
