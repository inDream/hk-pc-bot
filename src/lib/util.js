const timeout = s => new Promise(resolve => setTimeout(resolve, s));
const print = console.log.bind(console);
const needle = require('needle');
const get = require('util').promisify(needle.get);
const join = require('path').join;

module.exports = {timeout, print, get, join};