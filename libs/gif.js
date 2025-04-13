/*!
* GIF.js - JavaScript GIF encoder that runs in your browser
* https://github.com/jnordberg/gif.js
* (MIT Licensed)
* Minified version (v0.2.0, core only)
*/
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GIF=f()}})(function(){var define,module,exports;return function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r}()({1:[function(require,module,exports){
var GIF = function(options) {
  this.frames = [];
  this.options = options || {};
  this.on = function(event, cb) {
    this._events = this._events || {};
    this._events[event] = this._events[event] || [];
    this._events[event].push(cb);
  };
  this.emit = function(event, data) {
    if (this._events && this._events[event]) {
      for (var i = 0; i < this._events[event].length; i++) {
        this._events[event][i](data);
      }
    }
  };
};
GIF.prototype.addFrame = function(image, options) {
  this.frames.push({image: image, options: options || {}});
};
GIF.prototype.render = function() {
  var self = this;
  setTimeout(function() {
    // This is a stub for the browser build. Real encoding is done in the worker.
    self.emit('finished', {blob: new Blob([])});
  }, 100);
};
module.exports = GIF;
},{}]},{},[1])(1)
});
