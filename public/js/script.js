(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function (undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners = [],
        leaf,
        len,
        branch,
        xTree,
        xxTree,
        isolatedBranch,
        endReached,
        typeLength = type.length,
        currentType = type[i],
        nextType = type[i + 1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if (currentType === '*' || currentType === '**' || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i + 1));
          }
        }
        return listeners;
      } else if (currentType === '**') {
        endReached = i + 1 === typeLength || i + 2 === typeLength && nextType === '*';
        if (endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if (branch === '*' || branch === '**') {
              if (tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if (branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i + 2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i + 1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i + 1);
    }

    xxTree = tree['**'];
    if (xxTree) {
      if (i < typeLength) {
        if (xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for (branch in xxTree) {
          if (branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if (branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i + 2);
            } else if (branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i + 1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i + 1);
            }
          }
        }
      } else if (xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if (xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for (var i = 0, len = type.length; i + 1 < len; i++) {
      if (type[i] === '**' && type[i + 1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        } else if (typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        } else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function (n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function (event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function (event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function () {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) {
        return false;
      }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) {
        args[i - 1] = arguments[i];
      }for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all && !this._events.error && !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
            throw new Error("Uncaught, unspecified 'error' event.");
          }
        return false;
      }
    }

    var handler;

    if (this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    } else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      } else if (arguments.length > 1) switch (arguments.length) {
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        // slower
        default:
          var l = arguments.length;
          var args = new Array(l - 1);
          for (var i = 1; i < l; i++) {
            args[i - 1] = arguments[i];
          }handler.apply(this, args);
      }
      return true;
    } else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) {
        args[i - 1] = arguments[i];
      }var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return listeners.length > 0 || !!this._all;
    } else {
      return !!this._all;
    }
  };

  EventEmitter.prototype.on = function (type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if (this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    } else if (typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    } else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function (fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if (!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function (type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,
        leafs = [];

    if (this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    } else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({ _listeners: handlers });
    }

    for (var iLeaf = 0; iLeaf < leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener || handlers[i].listener && handlers[i].listener === listener || handlers[i]._origin && handlers[i]._origin === listener) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if (this.wildcard) {
          leaf._listeners.splice(position, 1);
        } else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if (this.wildcard) {
            delete leaf._listeners;
          } else {
            delete this._events[type];
          }
        }
        return this;
      } else if (handlers === listener || handlers.listener && handlers.listener === listener || handlers._origin && handlers._origin === listener) {
        if (this.wildcard) {
          delete leaf._listeners;
        } else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function (fn) {
    var i = 0,
        l = 0,
        fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for (i = 0, l = fns.length; i < l; i++) {
        if (fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function (type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if (this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf = 0; iLeaf < leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    } else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function (type) {
    if (this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function () {

    if (this._all) {
      return this._all;
    } else {
      return [];
    }
  };

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(function () {
      return EventEmitter;
    });
  } else if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  } else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}],2:[function(require,module,exports){
"use strict";var _typeof=typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"?function(obj){return typeof obj;}:function(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol?"symbol":typeof obj;}; /*!
 * jQuery JavaScript Library v2.1.4
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2015-04-28T16:01Z
 */(function(global,factory){if((typeof module==="undefined"?"undefined":_typeof(module))==="object"&&_typeof(module.exports)==="object"){ // For CommonJS and CommonJS-like environments where a proper `window`
// is present, execute the factory and get jQuery.
// For environments that do not have a `window` with a `document`
// (such as Node.js), expose a factory as module.exports.
// This accentuates the need for the creation of a real `window`.
// e.g. var jQuery = require("jquery")(window);
// See ticket #14549 for more info.
module.exports=global.document?factory(global,true):function(w){if(!w.document){throw new Error("jQuery requires a window with a document");}return factory(w);};}else {factory(global);} // Pass this if window is not defined yet
})(typeof window!=="undefined"?window:undefined,function(window,noGlobal){ // Support: Firefox 18+
// Can't be in strict mode, several libs including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
//
var arr=[];var _slice=arr.slice;var concat=arr.concat;var push=arr.push;var indexOf=arr.indexOf;var class2type={};var toString=class2type.toString;var hasOwn=class2type.hasOwnProperty;var support={};var  // Use the correct document accordingly with window argument (sandbox)
document=window.document,version="2.1.4", // Define a local copy of jQuery
jQuery=function jQuery(selector,context){ // The jQuery object is actually just the init constructor 'enhanced'
// Need init if jQuery is called (just allow error to be thrown if not included)
return new jQuery.fn.init(selector,context);}, // Support: Android<4.1
// Make sure we trim BOM and NBSP
rtrim=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, // Matches dashed string for camelizing
rmsPrefix=/^-ms-/,rdashAlpha=/-([\da-z])/gi, // Used by jQuery.camelCase as callback to replace()
fcamelCase=function fcamelCase(all,letter){return letter.toUpperCase();};jQuery.fn=jQuery.prototype={ // The current version of jQuery being used
jquery:version,constructor:jQuery, // Start with an empty selector
selector:"", // The default length of a jQuery object is 0
length:0,toArray:function toArray(){return _slice.call(this);}, // Get the Nth element in the matched element set OR
// Get the whole matched element set as a clean array
get:function get(num){return num!=null? // Return just the one element from the set
num<0?this[num+this.length]:this[num]: // Return all the elements in a clean array
_slice.call(this);}, // Take an array of elements and push it onto the stack
// (returning the new matched element set)
pushStack:function pushStack(elems){ // Build a new jQuery matched element set
var ret=jQuery.merge(this.constructor(),elems); // Add the old object onto the stack (as a reference)
ret.prevObject=this;ret.context=this.context; // Return the newly-formed element set
return ret;}, // Execute a callback for every element in the matched set.
// (You can seed the arguments with an array of args, but this is
// only used internally.)
each:function each(callback,args){return jQuery.each(this,callback,args);},map:function map(callback){return this.pushStack(jQuery.map(this,function(elem,i){return callback.call(elem,i,elem);}));},slice:function slice(){return this.pushStack(_slice.apply(this,arguments));},first:function first(){return this.eq(0);},last:function last(){return this.eq(-1);},eq:function eq(i){var len=this.length,j=+i+(i<0?len:0);return this.pushStack(j>=0&&j<len?[this[j]]:[]);},end:function end(){return this.prevObject||this.constructor(null);}, // For internal use only.
// Behaves like an Array's method, not like a jQuery method.
push:push,sort:arr.sort,splice:arr.splice};jQuery.extend=jQuery.fn.extend=function(){var options,name,src,copy,copyIsArray,clone,target=arguments[0]||{},i=1,length=arguments.length,deep=false; // Handle a deep copy situation
if(typeof target==="boolean"){deep=target; // Skip the boolean and the target
target=arguments[i]||{};i++;} // Handle case when target is a string or something (possible in deep copy)
if((typeof target==="undefined"?"undefined":_typeof(target))!=="object"&&!jQuery.isFunction(target)){target={};} // Extend jQuery itself if only one argument is passed
if(i===length){target=this;i--;}for(;i<length;i++){ // Only deal with non-null/undefined values
if((options=arguments[i])!=null){ // Extend the base object
for(name in options){src=target[name];copy=options[name]; // Prevent never-ending loop
if(target===copy){continue;} // Recurse if we're merging plain objects or arrays
if(deep&&copy&&(jQuery.isPlainObject(copy)||(copyIsArray=jQuery.isArray(copy)))){if(copyIsArray){copyIsArray=false;clone=src&&jQuery.isArray(src)?src:[];}else {clone=src&&jQuery.isPlainObject(src)?src:{};} // Never move original objects, clone them
target[name]=jQuery.extend(deep,clone,copy); // Don't bring in undefined values
}else if(copy!==undefined){target[name]=copy;}}}} // Return the modified object
return target;};jQuery.extend({ // Unique for each copy of jQuery on the page
expando:"jQuery"+(version+Math.random()).replace(/\D/g,""), // Assume jQuery is ready without the ready module
isReady:true,error:function error(msg){throw new Error(msg);},noop:function noop(){},isFunction:function isFunction(obj){return jQuery.type(obj)==="function";},isArray:Array.isArray,isWindow:function isWindow(obj){return obj!=null&&obj===obj.window;},isNumeric:function isNumeric(obj){ // parseFloat NaNs numeric-cast false positives (null|true|false|"")
// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
// subtraction forces infinities to NaN
// adding 1 corrects loss of precision from parseFloat (#15100)
return !jQuery.isArray(obj)&&obj-parseFloat(obj)+1>=0;},isPlainObject:function isPlainObject(obj){ // Not plain objects:
// - Any object or value whose internal [[Class]] property is not "[object Object]"
// - DOM nodes
// - window
if(jQuery.type(obj)!=="object"||obj.nodeType||jQuery.isWindow(obj)){return false;}if(obj.constructor&&!hasOwn.call(obj.constructor.prototype,"isPrototypeOf")){return false;} // If the function hasn't returned already, we're confident that
// |obj| is a plain object, created by {} or constructed with new Object
return true;},isEmptyObject:function isEmptyObject(obj){var name;for(name in obj){return false;}return true;},type:function type(obj){if(obj==null){return obj+"";} // Support: Android<4.0, iOS<6 (functionish RegExp)
return (typeof obj==="undefined"?"undefined":_typeof(obj))==="object"||typeof obj==="function"?class2type[toString.call(obj)]||"object":typeof obj==="undefined"?"undefined":_typeof(obj);}, // Evaluates a script in a global context
globalEval:function globalEval(code){var script,indirect=eval;code=jQuery.trim(code);if(code){ // If the code includes a valid, prologue position
// strict mode pragma, execute code by injecting a
// script tag into the document.
if(code.indexOf("use strict")===1){script=document.createElement("script");script.text=code;document.head.appendChild(script).parentNode.removeChild(script);}else { // Otherwise, avoid the DOM node creation, insertion
// and removal by using an indirect global eval
indirect(code);}}}, // Convert dashed to camelCase; used by the css and data modules
// Support: IE9-11+
// Microsoft forgot to hump their vendor prefix (#9572)
camelCase:function camelCase(string){return string.replace(rmsPrefix,"ms-").replace(rdashAlpha,fcamelCase);},nodeName:function nodeName(elem,name){return elem.nodeName&&elem.nodeName.toLowerCase()===name.toLowerCase();}, // args is for internal usage only
each:function each(obj,callback,args){var value,i=0,length=obj.length,isArray=isArraylike(obj);if(args){if(isArray){for(;i<length;i++){value=callback.apply(obj[i],args);if(value===false){break;}}}else {for(i in obj){value=callback.apply(obj[i],args);if(value===false){break;}}} // A special, fast, case for the most common use of each
}else {if(isArray){for(;i<length;i++){value=callback.call(obj[i],i,obj[i]);if(value===false){break;}}}else {for(i in obj){value=callback.call(obj[i],i,obj[i]);if(value===false){break;}}}}return obj;}, // Support: Android<4.1
trim:function trim(text){return text==null?"":(text+"").replace(rtrim,"");}, // results is for internal usage only
makeArray:function makeArray(arr,results){var ret=results||[];if(arr!=null){if(isArraylike(Object(arr))){jQuery.merge(ret,typeof arr==="string"?[arr]:arr);}else {push.call(ret,arr);}}return ret;},inArray:function inArray(elem,arr,i){return arr==null?-1:indexOf.call(arr,elem,i);},merge:function merge(first,second){var len=+second.length,j=0,i=first.length;for(;j<len;j++){first[i++]=second[j];}first.length=i;return first;},grep:function grep(elems,callback,invert){var callbackInverse,matches=[],i=0,length=elems.length,callbackExpect=!invert; // Go through the array, only saving the items
// that pass the validator function
for(;i<length;i++){callbackInverse=!callback(elems[i],i);if(callbackInverse!==callbackExpect){matches.push(elems[i]);}}return matches;}, // arg is for internal usage only
map:function map(elems,callback,arg){var value,i=0,length=elems.length,isArray=isArraylike(elems),ret=[]; // Go through the array, translating each of the items to their new values
if(isArray){for(;i<length;i++){value=callback(elems[i],i,arg);if(value!=null){ret.push(value);}} // Go through every key on the object,
}else {for(i in elems){value=callback(elems[i],i,arg);if(value!=null){ret.push(value);}}} // Flatten any nested arrays
return concat.apply([],ret);}, // A global GUID counter for objects
guid:1, // Bind a function to a context, optionally partially applying any
// arguments.
proxy:function proxy(fn,context){var tmp,args,proxy;if(typeof context==="string"){tmp=fn[context];context=fn;fn=tmp;} // Quick check to determine if target is callable, in the spec
// this throws a TypeError, but we will just return undefined.
if(!jQuery.isFunction(fn)){return undefined;} // Simulated bind
args=_slice.call(arguments,2);proxy=function proxy(){return fn.apply(context||this,args.concat(_slice.call(arguments)));}; // Set the guid of unique handler to the same of original handler, so it can be removed
proxy.guid=fn.guid=fn.guid||jQuery.guid++;return proxy;},now:Date.now, // jQuery.support is not used in Core but other projects attach their
// properties to it so it needs to exist.
support:support}); // Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(i,name){class2type["[object "+name+"]"]=name.toLowerCase();});function isArraylike(obj){ // Support: iOS 8.2 (not reproducible in simulator)
// `in` check used to prevent JIT error (gh-2145)
// hasOwn isn't used here due to false negatives
// regarding Nodelist length in IE
var length="length" in obj&&obj.length,type=jQuery.type(obj);if(type==="function"||jQuery.isWindow(obj)){return false;}if(obj.nodeType===1&&length){return true;}return type==="array"||length===0||typeof length==="number"&&length>0&&length-1 in obj;}var Sizzle= /*!
 * Sizzle CSS Selector Engine v2.2.0-pre
 * http://sizzlejs.com/
 *
 * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-12-16
 */function(window){var i,support,Expr,getText,isXML,tokenize,compile,select,outermostContext,sortInput,hasDuplicate, // Local document vars
setDocument,document,docElem,documentIsHTML,rbuggyQSA,rbuggyMatches,matches,contains, // Instance-specific data
expando="sizzle"+1*new Date(),preferredDoc=window.document,dirruns=0,done=0,classCache=createCache(),tokenCache=createCache(),compilerCache=createCache(),sortOrder=function sortOrder(a,b){if(a===b){hasDuplicate=true;}return 0;}, // General-purpose constants
MAX_NEGATIVE=1<<31, // Instance methods
hasOwn={}.hasOwnProperty,arr=[],pop=arr.pop,push_native=arr.push,push=arr.push,slice=arr.slice, // Use a stripped-down indexOf as it's faster than native
// http://jsperf.com/thor-indexof-vs-for/5
indexOf=function indexOf(list,elem){var i=0,len=list.length;for(;i<len;i++){if(list[i]===elem){return i;}}return -1;},booleans="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped", // Regular expressions
// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
whitespace="[\\x20\\t\\r\\n\\f]", // http://www.w3.org/TR/css3-syntax/#characters
characterEncoding="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+", // Loosely modeled on CSS identifier characters
// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
identifier=characterEncoding.replace("w","w#"), // Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
attributes="\\["+whitespace+"*("+characterEncoding+")(?:"+whitespace+ // Operator (capture 2)
"*([*^$|!~]?=)"+whitespace+ // "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+identifier+"))|)"+whitespace+"*\\]",pseudos=":("+characterEncoding+")(?:\\(("+ // To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
// 1. quoted (capture 3; capture 4 or capture 5)
"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|"+ // 2. simple (capture 6)
"((?:\\\\.|[^\\\\()[\\]]|"+attributes+")*)|"+ // 3. anything else (capture 2)
".*"+")\\)|)", // Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
rwhitespace=new RegExp(whitespace+"+","g"),rtrim=new RegExp("^"+whitespace+"+|((?:^|[^\\\\])(?:\\\\.)*)"+whitespace+"+$","g"),rcomma=new RegExp("^"+whitespace+"*,"+whitespace+"*"),rcombinators=new RegExp("^"+whitespace+"*([>+~]|"+whitespace+")"+whitespace+"*"),rattributeQuotes=new RegExp("="+whitespace+"*([^\\]'\"]*?)"+whitespace+"*\\]","g"),rpseudo=new RegExp(pseudos),ridentifier=new RegExp("^"+identifier+"$"),matchExpr={"ID":new RegExp("^#("+characterEncoding+")"),"CLASS":new RegExp("^\\.("+characterEncoding+")"),"TAG":new RegExp("^("+characterEncoding.replace("w","w*")+")"),"ATTR":new RegExp("^"+attributes),"PSEUDO":new RegExp("^"+pseudos),"CHILD":new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+whitespace+"*(even|odd|(([+-]|)(\\d*)n|)"+whitespace+"*(?:([+-]|)"+whitespace+"*(\\d+)|))"+whitespace+"*\\)|)","i"),"bool":new RegExp("^(?:"+booleans+")$","i"), // For use in libraries implementing .is()
// We use this for POS matching in `select`
"needsContext":new RegExp("^"+whitespace+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+whitespace+"*((?:-\\d)?\\d*)"+whitespace+"*\\)|)(?=[^-]|$)","i")},rinputs=/^(?:input|select|textarea|button)$/i,rheader=/^h\d$/i,rnative=/^[^{]+\{\s*\[native \w/, // Easily-parseable/retrievable ID or TAG or CLASS selectors
rquickExpr=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,rsibling=/[+~]/,rescape=/'|\\/g, // CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
runescape=new RegExp("\\\\([\\da-f]{1,6}"+whitespace+"?|("+whitespace+")|.)","ig"),funescape=function funescape(_,escaped,escapedWhitespace){var high="0x"+escaped-0x10000; // NaN means non-codepoint
// Support: Firefox<24
// Workaround erroneous numeric interpretation of +"0x"
return high!==high||escapedWhitespace?escaped:high<0? // BMP codepoint
String.fromCharCode(high+0x10000): // Supplemental Plane codepoint (surrogate pair)
String.fromCharCode(high>>10|0xD800,high&0x3FF|0xDC00);}, // Used for iframes
// See setDocument()
// Removing the function wrapper causes a "Permission Denied"
// error in IE
unloadHandler=function unloadHandler(){setDocument();}; // Optimize for push.apply( _, NodeList )
try{push.apply(arr=slice.call(preferredDoc.childNodes),preferredDoc.childNodes); // Support: Android<4.0
// Detect silently failing push.apply
arr[preferredDoc.childNodes.length].nodeType;}catch(e){push={apply:arr.length? // Leverage slice if possible
function(target,els){push_native.apply(target,slice.call(els));}: // Support: IE<9
// Otherwise append directly
function(target,els){var j=target.length,i=0; // Can't trust NodeList.length
while(target[j++]=els[i++]){}target.length=j-1;}};}function Sizzle(selector,context,results,seed){var match,elem,m,nodeType, // QSA vars
i,groups,old,nid,newContext,newSelector;if((context?context.ownerDocument||context:preferredDoc)!==document){setDocument(context);}context=context||document;results=results||[];nodeType=context.nodeType;if(typeof selector!=="string"||!selector||nodeType!==1&&nodeType!==9&&nodeType!==11){return results;}if(!seed&&documentIsHTML){ // Try to shortcut find operations when possible (e.g., not under DocumentFragment)
if(nodeType!==11&&(match=rquickExpr.exec(selector))){ // Speed-up: Sizzle("#ID")
if(m=match[1]){if(nodeType===9){elem=context.getElementById(m); // Check parentNode to catch when Blackberry 4.6 returns
// nodes that are no longer in the document (jQuery #6963)
if(elem&&elem.parentNode){ // Handle the case where IE, Opera, and Webkit return items
// by name instead of ID
if(elem.id===m){results.push(elem);return results;}}else {return results;}}else { // Context is not a document
if(context.ownerDocument&&(elem=context.ownerDocument.getElementById(m))&&contains(context,elem)&&elem.id===m){results.push(elem);return results;}} // Speed-up: Sizzle("TAG")
}else if(match[2]){push.apply(results,context.getElementsByTagName(selector));return results; // Speed-up: Sizzle(".CLASS")
}else if((m=match[3])&&support.getElementsByClassName){push.apply(results,context.getElementsByClassName(m));return results;}} // QSA path
if(support.qsa&&(!rbuggyQSA||!rbuggyQSA.test(selector))){nid=old=expando;newContext=context;newSelector=nodeType!==1&&selector; // qSA works strangely on Element-rooted queries
// We can work around this by specifying an extra ID on the root
// and working up from there (Thanks to Andrew Dupont for the technique)
// IE 8 doesn't work on object elements
if(nodeType===1&&context.nodeName.toLowerCase()!=="object"){groups=tokenize(selector);if(old=context.getAttribute("id")){nid=old.replace(rescape,"\\$&");}else {context.setAttribute("id",nid);}nid="[id='"+nid+"'] ";i=groups.length;while(i--){groups[i]=nid+toSelector(groups[i]);}newContext=rsibling.test(selector)&&testContext(context.parentNode)||context;newSelector=groups.join(",");}if(newSelector){try{push.apply(results,newContext.querySelectorAll(newSelector));return results;}catch(qsaError){}finally {if(!old){context.removeAttribute("id");}}}}} // All others
return select(selector.replace(rtrim,"$1"),context,results,seed);} /**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */function createCache(){var keys=[];function cache(key,value){ // Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
if(keys.push(key+" ")>Expr.cacheLength){ // Only keep the most recent entries
delete cache[keys.shift()];}return cache[key+" "]=value;}return cache;} /**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */function markFunction(fn){fn[expando]=true;return fn;} /**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */function assert(fn){var div=document.createElement("div");try{return !!fn(div);}catch(e){return false;}finally { // Remove from its parent by default
if(div.parentNode){div.parentNode.removeChild(div);} // release memory in IE
div=null;}} /**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */function addHandle(attrs,handler){var arr=attrs.split("|"),i=attrs.length;while(i--){Expr.attrHandle[arr[i]]=handler;}} /**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */function siblingCheck(a,b){var cur=b&&a,diff=cur&&a.nodeType===1&&b.nodeType===1&&(~b.sourceIndex||MAX_NEGATIVE)-(~a.sourceIndex||MAX_NEGATIVE); // Use IE sourceIndex if available on both nodes
if(diff){return diff;} // Check if b follows a
if(cur){while(cur=cur.nextSibling){if(cur===b){return -1;}}}return a?1:-1;} /**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */function createInputPseudo(type){return function(elem){var name=elem.nodeName.toLowerCase();return name==="input"&&elem.type===type;};} /**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */function createButtonPseudo(type){return function(elem){var name=elem.nodeName.toLowerCase();return (name==="input"||name==="button")&&elem.type===type;};} /**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */function createPositionalPseudo(fn){return markFunction(function(argument){argument=+argument;return markFunction(function(seed,matches){var j,matchIndexes=fn([],seed.length,argument),i=matchIndexes.length; // Match elements found at the specified indexes
while(i--){if(seed[j=matchIndexes[i]]){seed[j]=!(matches[j]=seed[j]);}}});});} /**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */function testContext(context){return context&&typeof context.getElementsByTagName!=="undefined"&&context;} // Expose support vars for convenience
support=Sizzle.support={}; /**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */isXML=Sizzle.isXML=function(elem){ // documentElement is verified for cases where it doesn't yet exist
// (such as loading iframes in IE - #4833)
var documentElement=elem&&(elem.ownerDocument||elem).documentElement;return documentElement?documentElement.nodeName!=="HTML":false;}; /**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */setDocument=Sizzle.setDocument=function(node){var hasCompare,parent,doc=node?node.ownerDocument||node:preferredDoc; // If no document and documentElement is available, return
if(doc===document||doc.nodeType!==9||!doc.documentElement){return document;} // Set our document
document=doc;docElem=doc.documentElement;parent=doc.defaultView; // Support: IE>8
// If iframe document is assigned to "document" variable and if iframe has been reloaded,
// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
// IE6-8 do not support the defaultView property so parent will be undefined
if(parent&&parent!==parent.top){ // IE11 does not have attachEvent, so all must suffer
if(parent.addEventListener){parent.addEventListener("unload",unloadHandler,false);}else if(parent.attachEvent){parent.attachEvent("onunload",unloadHandler);}} /* Support tests
	---------------------------------------------------------------------- */documentIsHTML=!isXML(doc); /* Attributes
	---------------------------------------------------------------------- */ // Support: IE<8
// Verify that getAttribute really returns attributes and not properties
// (excepting IE8 booleans)
support.attributes=assert(function(div){div.className="i";return !div.getAttribute("className");}); /* getElement(s)By*
	---------------------------------------------------------------------- */ // Check if getElementsByTagName("*") returns only elements
support.getElementsByTagName=assert(function(div){div.appendChild(doc.createComment(""));return !div.getElementsByTagName("*").length;}); // Support: IE<9
support.getElementsByClassName=rnative.test(doc.getElementsByClassName); // Support: IE<10
// Check if getElementById returns elements by name
// The broken getElementById methods don't pick up programatically-set names,
// so use a roundabout getElementsByName test
support.getById=assert(function(div){docElem.appendChild(div).id=expando;return !doc.getElementsByName||!doc.getElementsByName(expando).length;}); // ID find and filter
if(support.getById){Expr.find["ID"]=function(id,context){if(typeof context.getElementById!=="undefined"&&documentIsHTML){var m=context.getElementById(id); // Check parentNode to catch when Blackberry 4.6 returns
// nodes that are no longer in the document #6963
return m&&m.parentNode?[m]:[];}};Expr.filter["ID"]=function(id){var attrId=id.replace(runescape,funescape);return function(elem){return elem.getAttribute("id")===attrId;};};}else { // Support: IE6/7
// getElementById is not reliable as a find shortcut
delete Expr.find["ID"];Expr.filter["ID"]=function(id){var attrId=id.replace(runescape,funescape);return function(elem){var node=typeof elem.getAttributeNode!=="undefined"&&elem.getAttributeNode("id");return node&&node.value===attrId;};};} // Tag
Expr.find["TAG"]=support.getElementsByTagName?function(tag,context){if(typeof context.getElementsByTagName!=="undefined"){return context.getElementsByTagName(tag); // DocumentFragment nodes don't have gEBTN
}else if(support.qsa){return context.querySelectorAll(tag);}}:function(tag,context){var elem,tmp=[],i=0, // By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
results=context.getElementsByTagName(tag); // Filter out possible comments
if(tag==="*"){while(elem=results[i++]){if(elem.nodeType===1){tmp.push(elem);}}return tmp;}return results;}; // Class
Expr.find["CLASS"]=support.getElementsByClassName&&function(className,context){if(documentIsHTML){return context.getElementsByClassName(className);}}; /* QSA/matchesSelector
	---------------------------------------------------------------------- */ // QSA and matchesSelector support
// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
rbuggyMatches=[]; // qSa(:focus) reports false when true (Chrome 21)
// We allow this because of a bug in IE8/9 that throws an error
// whenever `document.activeElement` is accessed on an iframe
// So, we allow :focus to pass through QSA all the time to avoid the IE error
// See http://bugs.jquery.com/ticket/13378
rbuggyQSA=[];if(support.qsa=rnative.test(doc.querySelectorAll)){ // Build QSA regex
// Regex strategy adopted from Diego Perini
assert(function(div){ // Select is set to empty string on purpose
// This is to test IE's treatment of not explicitly
// setting a boolean content attribute,
// since its presence should be enough
// http://bugs.jquery.com/ticket/12359
docElem.appendChild(div).innerHTML="<a id='"+expando+"'></a>"+"<select id='"+expando+"-\f]' msallowcapture=''>"+"<option selected=''></option></select>"; // Support: IE8, Opera 11-12.16
// Nothing should be selected when empty strings follow ^= or $= or *=
// The test attribute must be unknown in Opera but "safe" for WinRT
// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
if(div.querySelectorAll("[msallowcapture^='']").length){rbuggyQSA.push("[*^$]="+whitespace+"*(?:''|\"\")");} // Support: IE8
// Boolean attributes and "value" are not treated correctly
if(!div.querySelectorAll("[selected]").length){rbuggyQSA.push("\\["+whitespace+"*(?:value|"+booleans+")");} // Support: Chrome<29, Android<4.2+, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.7+
if(!div.querySelectorAll("[id~="+expando+"-]").length){rbuggyQSA.push("~=");} // Webkit/Opera - :checked should return selected option elements
// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
// IE8 throws error here and will not see later tests
if(!div.querySelectorAll(":checked").length){rbuggyQSA.push(":checked");} // Support: Safari 8+, iOS 8+
// https://bugs.webkit.org/show_bug.cgi?id=136851
// In-page `selector#id sibing-combinator selector` fails
if(!div.querySelectorAll("a#"+expando+"+*").length){rbuggyQSA.push(".#.+[+~]");}});assert(function(div){ // Support: Windows 8 Native Apps
// The type and name attributes are restricted during .innerHTML assignment
var input=doc.createElement("input");input.setAttribute("type","hidden");div.appendChild(input).setAttribute("name","D"); // Support: IE8
// Enforce case-sensitivity of name attribute
if(div.querySelectorAll("[name=d]").length){rbuggyQSA.push("name"+whitespace+"*[*^$|!~]?=");} // FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
// IE8 throws error here and will not see later tests
if(!div.querySelectorAll(":enabled").length){rbuggyQSA.push(":enabled",":disabled");} // Opera 10-11 does not throw on post-comma invalid pseudos
div.querySelectorAll("*,:x");rbuggyQSA.push(",.*:");});}if(support.matchesSelector=rnative.test(matches=docElem.matches||docElem.webkitMatchesSelector||docElem.mozMatchesSelector||docElem.oMatchesSelector||docElem.msMatchesSelector)){assert(function(div){ // Check to see if it's possible to do matchesSelector
// on a disconnected node (IE 9)
support.disconnectedMatch=matches.call(div,"div"); // This should fail with an exception
// Gecko does not error, returns false instead
matches.call(div,"[s!='']:x");rbuggyMatches.push("!=",pseudos);});}rbuggyQSA=rbuggyQSA.length&&new RegExp(rbuggyQSA.join("|"));rbuggyMatches=rbuggyMatches.length&&new RegExp(rbuggyMatches.join("|")); /* Contains
	---------------------------------------------------------------------- */hasCompare=rnative.test(docElem.compareDocumentPosition); // Element contains another
// Purposefully does not implement inclusive descendent
// As in, an element does not contain itself
contains=hasCompare||rnative.test(docElem.contains)?function(a,b){var adown=a.nodeType===9?a.documentElement:a,bup=b&&b.parentNode;return a===bup||!!(bup&&bup.nodeType===1&&(adown.contains?adown.contains(bup):a.compareDocumentPosition&&a.compareDocumentPosition(bup)&16));}:function(a,b){if(b){while(b=b.parentNode){if(b===a){return true;}}}return false;}; /* Sorting
	---------------------------------------------------------------------- */ // Document order sorting
sortOrder=hasCompare?function(a,b){ // Flag for duplicate removal
if(a===b){hasDuplicate=true;return 0;} // Sort on method existence if only one input has compareDocumentPosition
var compare=!a.compareDocumentPosition-!b.compareDocumentPosition;if(compare){return compare;} // Calculate position if both inputs belong to the same document
compare=(a.ownerDocument||a)===(b.ownerDocument||b)?a.compareDocumentPosition(b): // Otherwise we know they are disconnected
1; // Disconnected nodes
if(compare&1||!support.sortDetached&&b.compareDocumentPosition(a)===compare){ // Choose the first element that is related to our preferred document
if(a===doc||a.ownerDocument===preferredDoc&&contains(preferredDoc,a)){return -1;}if(b===doc||b.ownerDocument===preferredDoc&&contains(preferredDoc,b)){return 1;} // Maintain original order
return sortInput?indexOf(sortInput,a)-indexOf(sortInput,b):0;}return compare&4?-1:1;}:function(a,b){ // Exit early if the nodes are identical
if(a===b){hasDuplicate=true;return 0;}var cur,i=0,aup=a.parentNode,bup=b.parentNode,ap=[a],bp=[b]; // Parentless nodes are either documents or disconnected
if(!aup||!bup){return a===doc?-1:b===doc?1:aup?-1:bup?1:sortInput?indexOf(sortInput,a)-indexOf(sortInput,b):0; // If the nodes are siblings, we can do a quick check
}else if(aup===bup){return siblingCheck(a,b);} // Otherwise we need full lists of their ancestors for comparison
cur=a;while(cur=cur.parentNode){ap.unshift(cur);}cur=b;while(cur=cur.parentNode){bp.unshift(cur);} // Walk down the tree looking for a discrepancy
while(ap[i]===bp[i]){i++;}return i? // Do a sibling check if the nodes have a common ancestor
siblingCheck(ap[i],bp[i]): // Otherwise nodes in our document sort first
ap[i]===preferredDoc?-1:bp[i]===preferredDoc?1:0;};return doc;};Sizzle.matches=function(expr,elements){return Sizzle(expr,null,null,elements);};Sizzle.matchesSelector=function(elem,expr){ // Set document vars if needed
if((elem.ownerDocument||elem)!==document){setDocument(elem);} // Make sure that attribute selectors are quoted
expr=expr.replace(rattributeQuotes,"='$1']");if(support.matchesSelector&&documentIsHTML&&(!rbuggyMatches||!rbuggyMatches.test(expr))&&(!rbuggyQSA||!rbuggyQSA.test(expr))){try{var ret=matches.call(elem,expr); // IE 9's matchesSelector returns false on disconnected nodes
if(ret||support.disconnectedMatch|| // As well, disconnected nodes are said to be in a document
// fragment in IE 9
elem.document&&elem.document.nodeType!==11){return ret;}}catch(e){}}return Sizzle(expr,document,null,[elem]).length>0;};Sizzle.contains=function(context,elem){ // Set document vars if needed
if((context.ownerDocument||context)!==document){setDocument(context);}return contains(context,elem);};Sizzle.attr=function(elem,name){ // Set document vars if needed
if((elem.ownerDocument||elem)!==document){setDocument(elem);}var fn=Expr.attrHandle[name.toLowerCase()], // Don't get fooled by Object.prototype properties (jQuery #13807)
val=fn&&hasOwn.call(Expr.attrHandle,name.toLowerCase())?fn(elem,name,!documentIsHTML):undefined;return val!==undefined?val:support.attributes||!documentIsHTML?elem.getAttribute(name):(val=elem.getAttributeNode(name))&&val.specified?val.value:null;};Sizzle.error=function(msg){throw new Error("Syntax error, unrecognized expression: "+msg);}; /**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */Sizzle.uniqueSort=function(results){var elem,duplicates=[],j=0,i=0; // Unless we *know* we can detect duplicates, assume their presence
hasDuplicate=!support.detectDuplicates;sortInput=!support.sortStable&&results.slice(0);results.sort(sortOrder);if(hasDuplicate){while(elem=results[i++]){if(elem===results[i]){j=duplicates.push(i);}}while(j--){results.splice(duplicates[j],1);}} // Clear input after sorting to release objects
// See https://github.com/jquery/sizzle/pull/225
sortInput=null;return results;}; /**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */getText=Sizzle.getText=function(elem){var node,ret="",i=0,nodeType=elem.nodeType;if(!nodeType){ // If no nodeType, this is expected to be an array
while(node=elem[i++]){ // Do not traverse comment nodes
ret+=getText(node);}}else if(nodeType===1||nodeType===9||nodeType===11){ // Use textContent for elements
// innerText usage removed for consistency of new lines (jQuery #11153)
if(typeof elem.textContent==="string"){return elem.textContent;}else { // Traverse its children
for(elem=elem.firstChild;elem;elem=elem.nextSibling){ret+=getText(elem);}}}else if(nodeType===3||nodeType===4){return elem.nodeValue;} // Do not include comment or processing instruction nodes
return ret;};Expr=Sizzle.selectors={ // Can be adjusted by the user
cacheLength:50,createPseudo:markFunction,match:matchExpr,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:true}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:true},"~":{dir:"previousSibling"}},preFilter:{"ATTR":function ATTR(match){match[1]=match[1].replace(runescape,funescape); // Move the given value to match[3] whether quoted or unquoted
match[3]=(match[3]||match[4]||match[5]||"").replace(runescape,funescape);if(match[2]==="~="){match[3]=" "+match[3]+" ";}return match.slice(0,4);},"CHILD":function CHILD(match){ /* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/match[1]=match[1].toLowerCase();if(match[1].slice(0,3)==="nth"){ // nth-* requires argument
if(!match[3]){Sizzle.error(match[0]);} // numeric x and y parameters for Expr.filter.CHILD
// remember that false/true cast respectively to 0/1
match[4]=+(match[4]?match[5]+(match[6]||1):2*(match[3]==="even"||match[3]==="odd"));match[5]=+(match[7]+match[8]||match[3]==="odd"); // other types prohibit arguments
}else if(match[3]){Sizzle.error(match[0]);}return match;},"PSEUDO":function PSEUDO(match){var excess,unquoted=!match[6]&&match[2];if(matchExpr["CHILD"].test(match[0])){return null;} // Accept quoted arguments as-is
if(match[3]){match[2]=match[4]||match[5]||""; // Strip excess characters from unquoted arguments
}else if(unquoted&&rpseudo.test(unquoted)&&( // Get excess from tokenize (recursively)
excess=tokenize(unquoted,true))&&( // advance to the next closing parenthesis
excess=unquoted.indexOf(")",unquoted.length-excess)-unquoted.length)){ // excess is a negative index
match[0]=match[0].slice(0,excess);match[2]=unquoted.slice(0,excess);} // Return only captures needed by the pseudo filter method (type and argument)
return match.slice(0,3);}},filter:{"TAG":function TAG(nodeNameSelector){var nodeName=nodeNameSelector.replace(runescape,funescape).toLowerCase();return nodeNameSelector==="*"?function(){return true;}:function(elem){return elem.nodeName&&elem.nodeName.toLowerCase()===nodeName;};},"CLASS":function CLASS(className){var pattern=classCache[className+" "];return pattern||(pattern=new RegExp("(^|"+whitespace+")"+className+"("+whitespace+"|$)"))&&classCache(className,function(elem){return pattern.test(typeof elem.className==="string"&&elem.className||typeof elem.getAttribute!=="undefined"&&elem.getAttribute("class")||"");});},"ATTR":function ATTR(name,operator,check){return function(elem){var result=Sizzle.attr(elem,name);if(result==null){return operator==="!=";}if(!operator){return true;}result+="";return operator==="="?result===check:operator==="!="?result!==check:operator==="^="?check&&result.indexOf(check)===0:operator==="*="?check&&result.indexOf(check)>-1:operator==="$="?check&&result.slice(-check.length)===check:operator==="~="?(" "+result.replace(rwhitespace," ")+" ").indexOf(check)>-1:operator==="|="?result===check||result.slice(0,check.length+1)===check+"-":false;};},"CHILD":function CHILD(type,what,argument,first,last){var simple=type.slice(0,3)!=="nth",forward=type.slice(-4)!=="last",ofType=what==="of-type";return first===1&&last===0? // Shortcut for :nth-*(n)
function(elem){return !!elem.parentNode;}:function(elem,context,xml){var cache,outerCache,node,diff,nodeIndex,start,dir=simple!==forward?"nextSibling":"previousSibling",parent=elem.parentNode,name=ofType&&elem.nodeName.toLowerCase(),useCache=!xml&&!ofType;if(parent){ // :(first|last|only)-(child|of-type)
if(simple){while(dir){node=elem;while(node=node[dir]){if(ofType?node.nodeName.toLowerCase()===name:node.nodeType===1){return false;}} // Reverse direction for :only-* (if we haven't yet done so)
start=dir=type==="only"&&!start&&"nextSibling";}return true;}start=[forward?parent.firstChild:parent.lastChild]; // non-xml :nth-child(...) stores cache data on `parent`
if(forward&&useCache){ // Seek `elem` from a previously-cached index
outerCache=parent[expando]||(parent[expando]={});cache=outerCache[type]||[];nodeIndex=cache[0]===dirruns&&cache[1];diff=cache[0]===dirruns&&cache[2];node=nodeIndex&&parent.childNodes[nodeIndex];while(node=++nodeIndex&&node&&node[dir]||( // Fallback to seeking `elem` from the start
diff=nodeIndex=0)||start.pop()){ // When found, cache indexes on `parent` and break
if(node.nodeType===1&&++diff&&node===elem){outerCache[type]=[dirruns,nodeIndex,diff];break;}} // Use previously-cached element index if available
}else if(useCache&&(cache=(elem[expando]||(elem[expando]={}))[type])&&cache[0]===dirruns){diff=cache[1]; // xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
}else { // Use the same loop as above to seek `elem` from the start
while(node=++nodeIndex&&node&&node[dir]||(diff=nodeIndex=0)||start.pop()){if((ofType?node.nodeName.toLowerCase()===name:node.nodeType===1)&&++diff){ // Cache the index of each encountered element
if(useCache){(node[expando]||(node[expando]={}))[type]=[dirruns,diff];}if(node===elem){break;}}}} // Incorporate the offset, then check against cycle size
diff-=last;return diff===first||diff%first===0&&diff/first>=0;}};},"PSEUDO":function PSEUDO(pseudo,argument){ // pseudo-class names are case-insensitive
// http://www.w3.org/TR/selectors/#pseudo-classes
// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
// Remember that setFilters inherits from pseudos
var args,fn=Expr.pseudos[pseudo]||Expr.setFilters[pseudo.toLowerCase()]||Sizzle.error("unsupported pseudo: "+pseudo); // The user may use createPseudo to indicate that
// arguments are needed to create the filter function
// just as Sizzle does
if(fn[expando]){return fn(argument);} // But maintain support for old signatures
if(fn.length>1){args=[pseudo,pseudo,"",argument];return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase())?markFunction(function(seed,matches){var idx,matched=fn(seed,argument),i=matched.length;while(i--){idx=indexOf(seed,matched[i]);seed[idx]=!(matches[idx]=matched[i]);}}):function(elem){return fn(elem,0,args);};}return fn;}},pseudos:{ // Potentially complex pseudos
"not":markFunction(function(selector){ // Trim the selector passed to compile
// to avoid treating leading and trailing
// spaces as combinators
var input=[],results=[],matcher=compile(selector.replace(rtrim,"$1"));return matcher[expando]?markFunction(function(seed,matches,context,xml){var elem,unmatched=matcher(seed,null,xml,[]),i=seed.length; // Match elements unmatched by `matcher`
while(i--){if(elem=unmatched[i]){seed[i]=!(matches[i]=elem);}}}):function(elem,context,xml){input[0]=elem;matcher(input,null,xml,results); // Don't keep the element (issue #299)
input[0]=null;return !results.pop();};}),"has":markFunction(function(selector){return function(elem){return Sizzle(selector,elem).length>0;};}),"contains":markFunction(function(text){text=text.replace(runescape,funescape);return function(elem){return (elem.textContent||elem.innerText||getText(elem)).indexOf(text)>-1;};}), // "Whether an element is represented by a :lang() selector
// is based solely on the element's language value
// being equal to the identifier C,
// or beginning with the identifier C immediately followed by "-".
// The matching of C against the element's language value is performed case-insensitively.
// The identifier C does not have to be a valid language name."
// http://www.w3.org/TR/selectors/#lang-pseudo
"lang":markFunction(function(lang){ // lang value must be a valid identifier
if(!ridentifier.test(lang||"")){Sizzle.error("unsupported lang: "+lang);}lang=lang.replace(runescape,funescape).toLowerCase();return function(elem){var elemLang;do {if(elemLang=documentIsHTML?elem.lang:elem.getAttribute("xml:lang")||elem.getAttribute("lang")){elemLang=elemLang.toLowerCase();return elemLang===lang||elemLang.indexOf(lang+"-")===0;}}while((elem=elem.parentNode)&&elem.nodeType===1);return false;};}), // Miscellaneous
"target":function target(elem){var hash=window.location&&window.location.hash;return hash&&hash.slice(1)===elem.id;},"root":function root(elem){return elem===docElem;},"focus":function focus(elem){return elem===document.activeElement&&(!document.hasFocus||document.hasFocus())&&!!(elem.type||elem.href||~elem.tabIndex);}, // Boolean properties
"enabled":function enabled(elem){return elem.disabled===false;},"disabled":function disabled(elem){return elem.disabled===true;},"checked":function checked(elem){ // In CSS3, :checked should return both checked and selected elements
// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
var nodeName=elem.nodeName.toLowerCase();return nodeName==="input"&&!!elem.checked||nodeName==="option"&&!!elem.selected;},"selected":function selected(elem){ // Accessing this property makes selected-by-default
// options in Safari work properly
if(elem.parentNode){elem.parentNode.selectedIndex;}return elem.selected===true;}, // Contents
"empty":function empty(elem){ // http://www.w3.org/TR/selectors/#empty-pseudo
// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
//   but not by others (comment: 8; processing instruction: 7; etc.)
// nodeType < 6 works because attributes (2) do not appear as children
for(elem=elem.firstChild;elem;elem=elem.nextSibling){if(elem.nodeType<6){return false;}}return true;},"parent":function parent(elem){return !Expr.pseudos["empty"](elem);}, // Element/input types
"header":function header(elem){return rheader.test(elem.nodeName);},"input":function input(elem){return rinputs.test(elem.nodeName);},"button":function button(elem){var name=elem.nodeName.toLowerCase();return name==="input"&&elem.type==="button"||name==="button";},"text":function text(elem){var attr;return elem.nodeName.toLowerCase()==="input"&&elem.type==="text"&&( // Support: IE<8
// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
(attr=elem.getAttribute("type"))==null||attr.toLowerCase()==="text");}, // Position-in-collection
"first":createPositionalPseudo(function(){return [0];}),"last":createPositionalPseudo(function(matchIndexes,length){return [length-1];}),"eq":createPositionalPseudo(function(matchIndexes,length,argument){return [argument<0?argument+length:argument];}),"even":createPositionalPseudo(function(matchIndexes,length){var i=0;for(;i<length;i+=2){matchIndexes.push(i);}return matchIndexes;}),"odd":createPositionalPseudo(function(matchIndexes,length){var i=1;for(;i<length;i+=2){matchIndexes.push(i);}return matchIndexes;}),"lt":createPositionalPseudo(function(matchIndexes,length,argument){var i=argument<0?argument+length:argument;for(;--i>=0;){matchIndexes.push(i);}return matchIndexes;}),"gt":createPositionalPseudo(function(matchIndexes,length,argument){var i=argument<0?argument+length:argument;for(;++i<length;){matchIndexes.push(i);}return matchIndexes;})}};Expr.pseudos["nth"]=Expr.pseudos["eq"]; // Add button/input type pseudos
for(i in {radio:true,checkbox:true,file:true,password:true,image:true}){Expr.pseudos[i]=createInputPseudo(i);}for(i in {submit:true,reset:true}){Expr.pseudos[i]=createButtonPseudo(i);} // Easy API for creating new setFilters
function setFilters(){}setFilters.prototype=Expr.filters=Expr.pseudos;Expr.setFilters=new setFilters();tokenize=Sizzle.tokenize=function(selector,parseOnly){var matched,match,tokens,type,soFar,groups,preFilters,cached=tokenCache[selector+" "];if(cached){return parseOnly?0:cached.slice(0);}soFar=selector;groups=[];preFilters=Expr.preFilter;while(soFar){ // Comma and first run
if(!matched||(match=rcomma.exec(soFar))){if(match){ // Don't consume trailing commas as valid
soFar=soFar.slice(match[0].length)||soFar;}groups.push(tokens=[]);}matched=false; // Combinators
if(match=rcombinators.exec(soFar)){matched=match.shift();tokens.push({value:matched, // Cast descendant combinators to space
type:match[0].replace(rtrim," ")});soFar=soFar.slice(matched.length);} // Filters
for(type in Expr.filter){if((match=matchExpr[type].exec(soFar))&&(!preFilters[type]||(match=preFilters[type](match)))){matched=match.shift();tokens.push({value:matched,type:type,matches:match});soFar=soFar.slice(matched.length);}}if(!matched){break;}} // Return the length of the invalid excess
// if we're just parsing
// Otherwise, throw an error or return tokens
return parseOnly?soFar.length:soFar?Sizzle.error(selector): // Cache the tokens
tokenCache(selector,groups).slice(0);};function toSelector(tokens){var i=0,len=tokens.length,selector="";for(;i<len;i++){selector+=tokens[i].value;}return selector;}function addCombinator(matcher,combinator,base){var dir=combinator.dir,checkNonElements=base&&dir==="parentNode",doneName=done++;return combinator.first? // Check against closest ancestor/preceding element
function(elem,context,xml){while(elem=elem[dir]){if(elem.nodeType===1||checkNonElements){return matcher(elem,context,xml);}}}: // Check against all ancestor/preceding elements
function(elem,context,xml){var oldCache,outerCache,newCache=[dirruns,doneName]; // We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
if(xml){while(elem=elem[dir]){if(elem.nodeType===1||checkNonElements){if(matcher(elem,context,xml)){return true;}}}}else {while(elem=elem[dir]){if(elem.nodeType===1||checkNonElements){outerCache=elem[expando]||(elem[expando]={});if((oldCache=outerCache[dir])&&oldCache[0]===dirruns&&oldCache[1]===doneName){ // Assign to newCache so results back-propagate to previous elements
return newCache[2]=oldCache[2];}else { // Reuse newcache so results back-propagate to previous elements
outerCache[dir]=newCache; // A match means we're done; a fail means we have to keep checking
if(newCache[2]=matcher(elem,context,xml)){return true;}}}}}};}function elementMatcher(matchers){return matchers.length>1?function(elem,context,xml){var i=matchers.length;while(i--){if(!matchers[i](elem,context,xml)){return false;}}return true;}:matchers[0];}function multipleContexts(selector,contexts,results){var i=0,len=contexts.length;for(;i<len;i++){Sizzle(selector,contexts[i],results);}return results;}function condense(unmatched,map,filter,context,xml){var elem,newUnmatched=[],i=0,len=unmatched.length,mapped=map!=null;for(;i<len;i++){if(elem=unmatched[i]){if(!filter||filter(elem,context,xml)){newUnmatched.push(elem);if(mapped){map.push(i);}}}}return newUnmatched;}function setMatcher(preFilter,selector,matcher,postFilter,postFinder,postSelector){if(postFilter&&!postFilter[expando]){postFilter=setMatcher(postFilter);}if(postFinder&&!postFinder[expando]){postFinder=setMatcher(postFinder,postSelector);}return markFunction(function(seed,results,context,xml){var temp,i,elem,preMap=[],postMap=[],preexisting=results.length, // Get initial elements from seed or context
elems=seed||multipleContexts(selector||"*",context.nodeType?[context]:context,[]), // Prefilter to get matcher input, preserving a map for seed-results synchronization
matcherIn=preFilter&&(seed||!selector)?condense(elems,preMap,preFilter,context,xml):elems,matcherOut=matcher? // If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
postFinder||(seed?preFilter:preexisting||postFilter)? // ...intermediate processing is necessary
[]: // ...otherwise use results directly
results:matcherIn; // Find primary matches
if(matcher){matcher(matcherIn,matcherOut,context,xml);} // Apply postFilter
if(postFilter){temp=condense(matcherOut,postMap);postFilter(temp,[],context,xml); // Un-match failing elements by moving them back to matcherIn
i=temp.length;while(i--){if(elem=temp[i]){matcherOut[postMap[i]]=!(matcherIn[postMap[i]]=elem);}}}if(seed){if(postFinder||preFilter){if(postFinder){ // Get the final matcherOut by condensing this intermediate into postFinder contexts
temp=[];i=matcherOut.length;while(i--){if(elem=matcherOut[i]){ // Restore matcherIn since elem is not yet a final match
temp.push(matcherIn[i]=elem);}}postFinder(null,matcherOut=[],temp,xml);} // Move matched elements from seed to results to keep them synchronized
i=matcherOut.length;while(i--){if((elem=matcherOut[i])&&(temp=postFinder?indexOf(seed,elem):preMap[i])>-1){seed[temp]=!(results[temp]=elem);}}} // Add elements to results, through postFinder if defined
}else {matcherOut=condense(matcherOut===results?matcherOut.splice(preexisting,matcherOut.length):matcherOut);if(postFinder){postFinder(null,results,matcherOut,xml);}else {push.apply(results,matcherOut);}}});}function matcherFromTokens(tokens){var checkContext,matcher,j,len=tokens.length,leadingRelative=Expr.relative[tokens[0].type],implicitRelative=leadingRelative||Expr.relative[" "],i=leadingRelative?1:0, // The foundational matcher ensures that elements are reachable from top-level context(s)
matchContext=addCombinator(function(elem){return elem===checkContext;},implicitRelative,true),matchAnyContext=addCombinator(function(elem){return indexOf(checkContext,elem)>-1;},implicitRelative,true),matchers=[function(elem,context,xml){var ret=!leadingRelative&&(xml||context!==outermostContext)||((checkContext=context).nodeType?matchContext(elem,context,xml):matchAnyContext(elem,context,xml)); // Avoid hanging onto element (issue #299)
checkContext=null;return ret;}];for(;i<len;i++){if(matcher=Expr.relative[tokens[i].type]){matchers=[addCombinator(elementMatcher(matchers),matcher)];}else {matcher=Expr.filter[tokens[i].type].apply(null,tokens[i].matches); // Return special upon seeing a positional matcher
if(matcher[expando]){ // Find the next relative operator (if any) for proper handling
j=++i;for(;j<len;j++){if(Expr.relative[tokens[j].type]){break;}}return setMatcher(i>1&&elementMatcher(matchers),i>1&&toSelector( // If the preceding token was a descendant combinator, insert an implicit any-element `*`
tokens.slice(0,i-1).concat({value:tokens[i-2].type===" "?"*":""})).replace(rtrim,"$1"),matcher,i<j&&matcherFromTokens(tokens.slice(i,j)),j<len&&matcherFromTokens(tokens=tokens.slice(j)),j<len&&toSelector(tokens));}matchers.push(matcher);}}return elementMatcher(matchers);}function matcherFromGroupMatchers(elementMatchers,setMatchers){var bySet=setMatchers.length>0,byElement=elementMatchers.length>0,superMatcher=function superMatcher(seed,context,xml,results,outermost){var elem,j,matcher,matchedCount=0,i="0",unmatched=seed&&[],setMatched=[],contextBackup=outermostContext, // We must always have either seed elements or outermost context
elems=seed||byElement&&Expr.find["TAG"]("*",outermost), // Use integer dirruns iff this is the outermost matcher
dirrunsUnique=dirruns+=contextBackup==null?1:Math.random()||0.1,len=elems.length;if(outermost){outermostContext=context!==document&&context;} // Add elements passing elementMatchers directly to results
// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
// Support: IE<9, Safari
// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
for(;i!==len&&(elem=elems[i])!=null;i++){if(byElement&&elem){j=0;while(matcher=elementMatchers[j++]){if(matcher(elem,context,xml)){results.push(elem);break;}}if(outermost){dirruns=dirrunsUnique;}} // Track unmatched elements for set filters
if(bySet){ // They will have gone through all possible matchers
if(elem=!matcher&&elem){matchedCount--;} // Lengthen the array for every element, matched or not
if(seed){unmatched.push(elem);}}} // Apply set filters to unmatched elements
matchedCount+=i;if(bySet&&i!==matchedCount){j=0;while(matcher=setMatchers[j++]){matcher(unmatched,setMatched,context,xml);}if(seed){ // Reintegrate element matches to eliminate the need for sorting
if(matchedCount>0){while(i--){if(!(unmatched[i]||setMatched[i])){setMatched[i]=pop.call(results);}}} // Discard index placeholder values to get only actual matches
setMatched=condense(setMatched);} // Add matches to results
push.apply(results,setMatched); // Seedless set matches succeeding multiple successful matchers stipulate sorting
if(outermost&&!seed&&setMatched.length>0&&matchedCount+setMatchers.length>1){Sizzle.uniqueSort(results);}} // Override manipulation of globals by nested matchers
if(outermost){dirruns=dirrunsUnique;outermostContext=contextBackup;}return unmatched;};return bySet?markFunction(superMatcher):superMatcher;}compile=Sizzle.compile=function(selector,match /* Internal Use Only */){var i,setMatchers=[],elementMatchers=[],cached=compilerCache[selector+" "];if(!cached){ // Generate a function of recursive functions that can be used to check each element
if(!match){match=tokenize(selector);}i=match.length;while(i--){cached=matcherFromTokens(match[i]);if(cached[expando]){setMatchers.push(cached);}else {elementMatchers.push(cached);}} // Cache the compiled function
cached=compilerCache(selector,matcherFromGroupMatchers(elementMatchers,setMatchers)); // Save selector and tokenization
cached.selector=selector;}return cached;}; /**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */select=Sizzle.select=function(selector,context,results,seed){var i,tokens,token,type,find,compiled=typeof selector==="function"&&selector,match=!seed&&tokenize(selector=compiled.selector||selector);results=results||[]; // Try to minimize operations if there is no seed and only one group
if(match.length===1){ // Take a shortcut and set the context if the root selector is an ID
tokens=match[0]=match[0].slice(0);if(tokens.length>2&&(token=tokens[0]).type==="ID"&&support.getById&&context.nodeType===9&&documentIsHTML&&Expr.relative[tokens[1].type]){context=(Expr.find["ID"](token.matches[0].replace(runescape,funescape),context)||[])[0];if(!context){return results; // Precompiled matchers will still verify ancestry, so step up a level
}else if(compiled){context=context.parentNode;}selector=selector.slice(tokens.shift().value.length);} // Fetch a seed set for right-to-left matching
i=matchExpr["needsContext"].test(selector)?0:tokens.length;while(i--){token=tokens[i]; // Abort if we hit a combinator
if(Expr.relative[type=token.type]){break;}if(find=Expr.find[type]){ // Search, expanding context for leading sibling combinators
if(seed=find(token.matches[0].replace(runescape,funescape),rsibling.test(tokens[0].type)&&testContext(context.parentNode)||context)){ // If seed is empty or no tokens remain, we can return early
tokens.splice(i,1);selector=seed.length&&toSelector(tokens);if(!selector){push.apply(results,seed);return results;}break;}}}} // Compile and execute a filtering function if one is not provided
// Provide `match` to avoid retokenization if we modified the selector above
(compiled||compile(selector,match))(seed,context,!documentIsHTML,results,rsibling.test(selector)&&testContext(context.parentNode)||context);return results;}; // One-time assignments
// Sort stability
support.sortStable=expando.split("").sort(sortOrder).join("")===expando; // Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates=!!hasDuplicate; // Initialize against the default document
setDocument(); // Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached=assert(function(div1){ // Should return 1, but returns 4 (following)
return div1.compareDocumentPosition(document.createElement("div"))&1;}); // Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if(!assert(function(div){div.innerHTML="<a href='#'></a>";return div.firstChild.getAttribute("href")==="#";})){addHandle("type|href|height|width",function(elem,name,isXML){if(!isXML){return elem.getAttribute(name,name.toLowerCase()==="type"?1:2);}});} // Support: IE<9
// Use defaultValue in place of getAttribute("value")
if(!support.attributes||!assert(function(div){div.innerHTML="<input/>";div.firstChild.setAttribute("value","");return div.firstChild.getAttribute("value")==="";})){addHandle("value",function(elem,name,isXML){if(!isXML&&elem.nodeName.toLowerCase()==="input"){return elem.defaultValue;}});} // Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if(!assert(function(div){return div.getAttribute("disabled")==null;})){addHandle(booleans,function(elem,name,isXML){var val;if(!isXML){return elem[name]===true?name.toLowerCase():(val=elem.getAttributeNode(name))&&val.specified?val.value:null;}});}return Sizzle;}(window);jQuery.find=Sizzle;jQuery.expr=Sizzle.selectors;jQuery.expr[":"]=jQuery.expr.pseudos;jQuery.unique=Sizzle.uniqueSort;jQuery.text=Sizzle.getText;jQuery.isXMLDoc=Sizzle.isXML;jQuery.contains=Sizzle.contains;var rneedsContext=jQuery.expr.match.needsContext;var rsingleTag=/^<(\w+)\s*\/?>(?:<\/\1>|)$/;var risSimple=/^.[^:#\[\.,]*$/; // Implement the identical functionality for filter and not
function winnow(elements,qualifier,not){if(jQuery.isFunction(qualifier)){return jQuery.grep(elements,function(elem,i){ /* jshint -W018 */return !!qualifier.call(elem,i,elem)!==not;});}if(qualifier.nodeType){return jQuery.grep(elements,function(elem){return elem===qualifier!==not;});}if(typeof qualifier==="string"){if(risSimple.test(qualifier)){return jQuery.filter(qualifier,elements,not);}qualifier=jQuery.filter(qualifier,elements);}return jQuery.grep(elements,function(elem){return indexOf.call(qualifier,elem)>=0!==not;});}jQuery.filter=function(expr,elems,not){var elem=elems[0];if(not){expr=":not("+expr+")";}return elems.length===1&&elem.nodeType===1?jQuery.find.matchesSelector(elem,expr)?[elem]:[]:jQuery.find.matches(expr,jQuery.grep(elems,function(elem){return elem.nodeType===1;}));};jQuery.fn.extend({find:function find(selector){var i,len=this.length,ret=[],self=this;if(typeof selector!=="string"){return this.pushStack(jQuery(selector).filter(function(){for(i=0;i<len;i++){if(jQuery.contains(self[i],this)){return true;}}}));}for(i=0;i<len;i++){jQuery.find(selector,self[i],ret);} // Needed because $( selector, context ) becomes $( context ).find( selector )
ret=this.pushStack(len>1?jQuery.unique(ret):ret);ret.selector=this.selector?this.selector+" "+selector:selector;return ret;},filter:function filter(selector){return this.pushStack(winnow(this,selector||[],false));},not:function not(selector){return this.pushStack(winnow(this,selector||[],true));},is:function is(selector){return !!winnow(this, // If this is a positional/relative selector, check membership in the returned set
// so $("p:first").is("p:last") won't return true for a doc with two "p".
typeof selector==="string"&&rneedsContext.test(selector)?jQuery(selector):selector||[],false).length;}}); // Initialize a jQuery object
// A central reference to the root jQuery(document)
var rootjQuery, // A simple way to check for HTML strings
// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
// Strict HTML recognition (#11290: must start with <)
rquickExpr=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,init=jQuery.fn.init=function(selector,context){var match,elem; // HANDLE: $(""), $(null), $(undefined), $(false)
if(!selector){return this;} // Handle HTML strings
if(typeof selector==="string"){if(selector[0]==="<"&&selector[selector.length-1]===">"&&selector.length>=3){ // Assume that strings that start and end with <> are HTML and skip the regex check
match=[null,selector,null];}else {match=rquickExpr.exec(selector);} // Match html or make sure no context is specified for #id
if(match&&(match[1]||!context)){ // HANDLE: $(html) -> $(array)
if(match[1]){context=context instanceof jQuery?context[0]:context; // Option to run scripts is true for back-compat
// Intentionally let the error be thrown if parseHTML is not present
jQuery.merge(this,jQuery.parseHTML(match[1],context&&context.nodeType?context.ownerDocument||context:document,true)); // HANDLE: $(html, props)
if(rsingleTag.test(match[1])&&jQuery.isPlainObject(context)){for(match in context){ // Properties of context are called as methods if possible
if(jQuery.isFunction(this[match])){this[match](context[match]); // ...and otherwise set as attributes
}else {this.attr(match,context[match]);}}}return this; // HANDLE: $(#id)
}else {elem=document.getElementById(match[2]); // Support: Blackberry 4.6
// gEBID returns nodes no longer in the document (#6963)
if(elem&&elem.parentNode){ // Inject the element directly into the jQuery object
this.length=1;this[0]=elem;}this.context=document;this.selector=selector;return this;} // HANDLE: $(expr, $(...))
}else if(!context||context.jquery){return (context||rootjQuery).find(selector); // HANDLE: $(expr, context)
// (which is just equivalent to: $(context).find(expr)
}else {return this.constructor(context).find(selector);} // HANDLE: $(DOMElement)
}else if(selector.nodeType){this.context=this[0]=selector;this.length=1;return this; // HANDLE: $(function)
// Shortcut for document ready
}else if(jQuery.isFunction(selector)){return typeof rootjQuery.ready!=="undefined"?rootjQuery.ready(selector): // Execute immediately if ready is not present
selector(jQuery);}if(selector.selector!==undefined){this.selector=selector.selector;this.context=selector.context;}return jQuery.makeArray(selector,this);}; // Give the init function the jQuery prototype for later instantiation
init.prototype=jQuery.fn; // Initialize central reference
rootjQuery=jQuery(document);var rparentsprev=/^(?:parents|prev(?:Until|All))/, // Methods guaranteed to produce a unique set when starting from a unique set
guaranteedUnique={children:true,contents:true,next:true,prev:true};jQuery.extend({dir:function dir(elem,_dir,until){var matched=[],truncate=until!==undefined;while((elem=elem[_dir])&&elem.nodeType!==9){if(elem.nodeType===1){if(truncate&&jQuery(elem).is(until)){break;}matched.push(elem);}}return matched;},sibling:function sibling(n,elem){var matched=[];for(;n;n=n.nextSibling){if(n.nodeType===1&&n!==elem){matched.push(n);}}return matched;}});jQuery.fn.extend({has:function has(target){var targets=jQuery(target,this),l=targets.length;return this.filter(function(){var i=0;for(;i<l;i++){if(jQuery.contains(this,targets[i])){return true;}}});},closest:function closest(selectors,context){var cur,i=0,l=this.length,matched=[],pos=rneedsContext.test(selectors)||typeof selectors!=="string"?jQuery(selectors,context||this.context):0;for(;i<l;i++){for(cur=this[i];cur&&cur!==context;cur=cur.parentNode){ // Always skip document fragments
if(cur.nodeType<11&&(pos?pos.index(cur)>-1: // Don't pass non-elements to Sizzle
cur.nodeType===1&&jQuery.find.matchesSelector(cur,selectors))){matched.push(cur);break;}}}return this.pushStack(matched.length>1?jQuery.unique(matched):matched);}, // Determine the position of an element within the set
index:function index(elem){ // No argument, return index in parent
if(!elem){return this[0]&&this[0].parentNode?this.first().prevAll().length:-1;} // Index in selector
if(typeof elem==="string"){return indexOf.call(jQuery(elem),this[0]);} // Locate the position of the desired element
return indexOf.call(this, // If it receives a jQuery object, the first element is used
elem.jquery?elem[0]:elem);},add:function add(selector,context){return this.pushStack(jQuery.unique(jQuery.merge(this.get(),jQuery(selector,context))));},addBack:function addBack(selector){return this.add(selector==null?this.prevObject:this.prevObject.filter(selector));}});function sibling(cur,dir){while((cur=cur[dir])&&cur.nodeType!==1){}return cur;}jQuery.each({parent:function parent(elem){var parent=elem.parentNode;return parent&&parent.nodeType!==11?parent:null;},parents:function parents(elem){return jQuery.dir(elem,"parentNode");},parentsUntil:function parentsUntil(elem,i,until){return jQuery.dir(elem,"parentNode",until);},next:function next(elem){return sibling(elem,"nextSibling");},prev:function prev(elem){return sibling(elem,"previousSibling");},nextAll:function nextAll(elem){return jQuery.dir(elem,"nextSibling");},prevAll:function prevAll(elem){return jQuery.dir(elem,"previousSibling");},nextUntil:function nextUntil(elem,i,until){return jQuery.dir(elem,"nextSibling",until);},prevUntil:function prevUntil(elem,i,until){return jQuery.dir(elem,"previousSibling",until);},siblings:function siblings(elem){return jQuery.sibling((elem.parentNode||{}).firstChild,elem);},children:function children(elem){return jQuery.sibling(elem.firstChild);},contents:function contents(elem){return elem.contentDocument||jQuery.merge([],elem.childNodes);}},function(name,fn){jQuery.fn[name]=function(until,selector){var matched=jQuery.map(this,fn,until);if(name.slice(-5)!=="Until"){selector=until;}if(selector&&typeof selector==="string"){matched=jQuery.filter(selector,matched);}if(this.length>1){ // Remove duplicates
if(!guaranteedUnique[name]){jQuery.unique(matched);} // Reverse order for parents* and prev-derivatives
if(rparentsprev.test(name)){matched.reverse();}}return this.pushStack(matched);};});var rnotwhite=/\S+/g; // String to Object options format cache
var optionsCache={}; // Convert String-formatted options into Object-formatted ones and store in cache
function createOptions(options){var object=optionsCache[options]={};jQuery.each(options.match(rnotwhite)||[],function(_,flag){object[flag]=true;});return object;} /*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */jQuery.Callbacks=function(options){ // Convert options from String-formatted to Object-formatted if needed
// (we check in cache first)
options=typeof options==="string"?optionsCache[options]||createOptions(options):jQuery.extend({},options);var  // Last fire value (for non-forgettable lists)
memory, // Flag to know if list was already fired
_fired, // Flag to know if list is currently firing
firing, // First callback to fire (used internally by add and fireWith)
firingStart, // End of the loop when firing
firingLength, // Index of currently firing callback (modified by remove if needed)
firingIndex, // Actual callback list
list=[], // Stack of fire calls for repeatable lists
stack=!options.once&&[], // Fire callbacks
fire=function fire(data){memory=options.memory&&data;_fired=true;firingIndex=firingStart||0;firingStart=0;firingLength=list.length;firing=true;for(;list&&firingIndex<firingLength;firingIndex++){if(list[firingIndex].apply(data[0],data[1])===false&&options.stopOnFalse){memory=false; // To prevent further calls using add
break;}}firing=false;if(list){if(stack){if(stack.length){fire(stack.shift());}}else if(memory){list=[];}else {self.disable();}}}, // Actual Callbacks object
self={ // Add a callback or a collection of callbacks to the list
add:function add(){if(list){ // First, we save the current length
var start=list.length;(function add(args){jQuery.each(args,function(_,arg){var type=jQuery.type(arg);if(type==="function"){if(!options.unique||!self.has(arg)){list.push(arg);}}else if(arg&&arg.length&&type!=="string"){ // Inspect recursively
add(arg);}});})(arguments); // Do we need to add the callbacks to the
// current firing batch?
if(firing){firingLength=list.length; // With memory, if we're not firing then
// we should call right away
}else if(memory){firingStart=start;fire(memory);}}return this;}, // Remove a callback from the list
remove:function remove(){if(list){jQuery.each(arguments,function(_,arg){var index;while((index=jQuery.inArray(arg,list,index))>-1){list.splice(index,1); // Handle firing indexes
if(firing){if(index<=firingLength){firingLength--;}if(index<=firingIndex){firingIndex--;}}}});}return this;}, // Check if a given callback is in the list.
// If no argument is given, return whether or not list has callbacks attached.
has:function has(fn){return fn?jQuery.inArray(fn,list)>-1:!!(list&&list.length);}, // Remove all callbacks from the list
empty:function empty(){list=[];firingLength=0;return this;}, // Have the list do nothing anymore
disable:function disable(){list=stack=memory=undefined;return this;}, // Is it disabled?
disabled:function disabled(){return !list;}, // Lock the list in its current state
lock:function lock(){stack=undefined;if(!memory){self.disable();}return this;}, // Is it locked?
locked:function locked(){return !stack;}, // Call all callbacks with the given context and arguments
fireWith:function fireWith(context,args){if(list&&(!_fired||stack)){args=args||[];args=[context,args.slice?args.slice():args];if(firing){stack.push(args);}else {fire(args);}}return this;}, // Call all the callbacks with the given arguments
fire:function fire(){self.fireWith(this,arguments);return this;}, // To know if the callbacks have already been called at least once
fired:function fired(){return !!_fired;}};return self;};jQuery.extend({Deferred:function Deferred(func){var tuples=[ // action, add listener, listener list, final state
["resolve","done",jQuery.Callbacks("once memory"),"resolved"],["reject","fail",jQuery.Callbacks("once memory"),"rejected"],["notify","progress",jQuery.Callbacks("memory")]],_state="pending",_promise={state:function state(){return _state;},always:function always(){deferred.done(arguments).fail(arguments);return this;},then:function then() /* fnDone, fnFail, fnProgress */{var fns=arguments;return jQuery.Deferred(function(newDefer){jQuery.each(tuples,function(i,tuple){var fn=jQuery.isFunction(fns[i])&&fns[i]; // deferred[ done | fail | progress ] for forwarding actions to newDefer
deferred[tuple[1]](function(){var returned=fn&&fn.apply(this,arguments);if(returned&&jQuery.isFunction(returned.promise)){returned.promise().done(newDefer.resolve).fail(newDefer.reject).progress(newDefer.notify);}else {newDefer[tuple[0]+"With"](this===_promise?newDefer.promise():this,fn?[returned]:arguments);}});});fns=null;}).promise();}, // Get a promise for this deferred
// If obj is provided, the promise aspect is added to the object
promise:function promise(obj){return obj!=null?jQuery.extend(obj,_promise):_promise;}},deferred={}; // Keep pipe for back-compat
_promise.pipe=_promise.then; // Add list-specific methods
jQuery.each(tuples,function(i,tuple){var list=tuple[2],stateString=tuple[3]; // promise[ done | fail | progress ] = list.add
_promise[tuple[1]]=list.add; // Handle state
if(stateString){list.add(function(){ // state = [ resolved | rejected ]
_state=stateString; // [ reject_list | resolve_list ].disable; progress_list.lock
},tuples[i^1][2].disable,tuples[2][2].lock);} // deferred[ resolve | reject | notify ]
deferred[tuple[0]]=function(){deferred[tuple[0]+"With"](this===deferred?_promise:this,arguments);return this;};deferred[tuple[0]+"With"]=list.fireWith;}); // Make the deferred a promise
_promise.promise(deferred); // Call given func if any
if(func){func.call(deferred,deferred);} // All done!
return deferred;}, // Deferred helper
when:function when(subordinate /* , ..., subordinateN */){var i=0,resolveValues=_slice.call(arguments),length=resolveValues.length, // the count of uncompleted subordinates
remaining=length!==1||subordinate&&jQuery.isFunction(subordinate.promise)?length:0, // the master Deferred. If resolveValues consist of only a single Deferred, just use that.
deferred=remaining===1?subordinate:jQuery.Deferred(), // Update function for both resolve and progress values
updateFunc=function updateFunc(i,contexts,values){return function(value){contexts[i]=this;values[i]=arguments.length>1?_slice.call(arguments):value;if(values===progressValues){deferred.notifyWith(contexts,values);}else if(! --remaining){deferred.resolveWith(contexts,values);}};},progressValues,progressContexts,resolveContexts; // Add listeners to Deferred subordinates; treat others as resolved
if(length>1){progressValues=new Array(length);progressContexts=new Array(length);resolveContexts=new Array(length);for(;i<length;i++){if(resolveValues[i]&&jQuery.isFunction(resolveValues[i].promise)){resolveValues[i].promise().done(updateFunc(i,resolveContexts,resolveValues)).fail(deferred.reject).progress(updateFunc(i,progressContexts,progressValues));}else {--remaining;}}} // If we're not waiting on anything, resolve the master
if(!remaining){deferred.resolveWith(resolveContexts,resolveValues);}return deferred.promise();}}); // The deferred used on DOM ready
var readyList;jQuery.fn.ready=function(fn){ // Add the callback
jQuery.ready.promise().done(fn);return this;};jQuery.extend({ // Is the DOM ready to be used? Set to true once it occurs.
isReady:false, // A counter to track how many items to wait for before
// the ready event fires. See #6781
readyWait:1, // Hold (or release) the ready event
holdReady:function holdReady(hold){if(hold){jQuery.readyWait++;}else {jQuery.ready(true);}}, // Handle when the DOM is ready
ready:function ready(wait){ // Abort if there are pending holds or we're already ready
if(wait===true?--jQuery.readyWait:jQuery.isReady){return;} // Remember that the DOM is ready
jQuery.isReady=true; // If a normal DOM Ready event fired, decrement, and wait if need be
if(wait!==true&&--jQuery.readyWait>0){return;} // If there are functions bound, to execute
readyList.resolveWith(document,[jQuery]); // Trigger any bound ready events
if(jQuery.fn.triggerHandler){jQuery(document).triggerHandler("ready");jQuery(document).off("ready");}}}); /**
 * The ready event handler and self cleanup method
 */function completed(){document.removeEventListener("DOMContentLoaded",completed,false);window.removeEventListener("load",completed,false);jQuery.ready();}jQuery.ready.promise=function(obj){if(!readyList){readyList=jQuery.Deferred(); // Catch cases where $(document).ready() is called after the browser event has already occurred.
// We once tried to use readyState "interactive" here, but it caused issues like the one
// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
if(document.readyState==="complete"){ // Handle it asynchronously to allow scripts the opportunity to delay ready
setTimeout(jQuery.ready);}else { // Use the handy event callback
document.addEventListener("DOMContentLoaded",completed,false); // A fallback to window.onload, that will always work
window.addEventListener("load",completed,false);}}return readyList.promise(obj);}; // Kick off the DOM ready check even if the user does not
jQuery.ready.promise(); // Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access=jQuery.access=function(elems,fn,key,value,chainable,emptyGet,raw){var i=0,len=elems.length,bulk=key==null; // Sets many values
if(jQuery.type(key)==="object"){chainable=true;for(i in key){jQuery.access(elems,fn,i,key[i],true,emptyGet,raw);} // Sets one value
}else if(value!==undefined){chainable=true;if(!jQuery.isFunction(value)){raw=true;}if(bulk){ // Bulk operations run against the entire set
if(raw){fn.call(elems,value);fn=null; // ...except when executing function values
}else {bulk=fn;fn=function fn(elem,key,value){return bulk.call(jQuery(elem),value);};}}if(fn){for(;i<len;i++){fn(elems[i],key,raw?value:value.call(elems[i],i,fn(elems[i],key)));}}}return chainable?elems: // Gets
bulk?fn.call(elems):len?fn(elems[0],key):emptyGet;}; /**
 * Determines whether an object can have data
 */jQuery.acceptData=function(owner){ // Accepts only:
//  - Node
//    - Node.ELEMENT_NODE
//    - Node.DOCUMENT_NODE
//  - Object
//    - Any
/* jshint -W018 */return owner.nodeType===1||owner.nodeType===9||! +owner.nodeType;};function Data(){ // Support: Android<4,
// Old WebKit does not have Object.preventExtensions/freeze method,
// return new empty object instead with no [[set]] accessor
Object.defineProperty(this.cache={},0,{get:function get(){return {};}});this.expando=jQuery.expando+Data.uid++;}Data.uid=1;Data.accepts=jQuery.acceptData;Data.prototype={key:function key(owner){ // We can accept data for non-element nodes in modern browsers,
// but we should not, see #8335.
// Always return the key for a frozen object.
if(!Data.accepts(owner)){return 0;}var descriptor={}, // Check if the owner object already has a cache key
unlock=owner[this.expando]; // If not, create one
if(!unlock){unlock=Data.uid++; // Secure it in a non-enumerable, non-writable property
try{descriptor[this.expando]={value:unlock};Object.defineProperties(owner,descriptor); // Support: Android<4
// Fallback to a less secure definition
}catch(e){descriptor[this.expando]=unlock;jQuery.extend(owner,descriptor);}} // Ensure the cache object
if(!this.cache[unlock]){this.cache[unlock]={};}return unlock;},set:function set(owner,data,value){var prop, // There may be an unlock assigned to this node,
// if there is no entry for this "owner", create one inline
// and set the unlock as though an owner entry had always existed
unlock=this.key(owner),cache=this.cache[unlock]; // Handle: [ owner, key, value ] args
if(typeof data==="string"){cache[data]=value; // Handle: [ owner, { properties } ] args
}else { // Fresh assignments by object are shallow copied
if(jQuery.isEmptyObject(cache)){jQuery.extend(this.cache[unlock],data); // Otherwise, copy the properties one-by-one to the cache object
}else {for(prop in data){cache[prop]=data[prop];}}}return cache;},get:function get(owner,key){ // Either a valid cache is found, or will be created.
// New caches will be created and the unlock returned,
// allowing direct access to the newly created
// empty data object. A valid owner object must be provided.
var cache=this.cache[this.key(owner)];return key===undefined?cache:cache[key];},access:function access(owner,key,value){var stored; // In cases where either:
//
//   1. No key was specified
//   2. A string key was specified, but no value provided
//
// Take the "read" path and allow the get method to determine
// which value to return, respectively either:
//
//   1. The entire cache object
//   2. The data stored at the key
//
if(key===undefined||key&&typeof key==="string"&&value===undefined){stored=this.get(owner,key);return stored!==undefined?stored:this.get(owner,jQuery.camelCase(key));} // [*]When the key is not a string, or both a key and value
// are specified, set or extend (existing objects) with either:
//
//   1. An object of properties
//   2. A key and value
//
this.set(owner,key,value); // Since the "set" path can have two possible entry points
// return the expected data based on which path was taken[*]
return value!==undefined?value:key;},remove:function remove(owner,key){var i,name,camel,unlock=this.key(owner),cache=this.cache[unlock];if(key===undefined){this.cache[unlock]={};}else { // Support array or space separated string of keys
if(jQuery.isArray(key)){ // If "name" is an array of keys...
// When data is initially created, via ("key", "val") signature,
// keys will be converted to camelCase.
// Since there is no way to tell _how_ a key was added, remove
// both plain key and camelCase key. #12786
// This will only penalize the array argument path.
name=key.concat(key.map(jQuery.camelCase));}else {camel=jQuery.camelCase(key); // Try the string as a key before any manipulation
if(key in cache){name=[key,camel];}else { // If a key with the spaces exists, use it.
// Otherwise, create an array by matching non-whitespace
name=camel;name=name in cache?[name]:name.match(rnotwhite)||[];}}i=name.length;while(i--){delete cache[name[i]];}}},hasData:function hasData(owner){return !jQuery.isEmptyObject(this.cache[owner[this.expando]]||{});},discard:function discard(owner){if(owner[this.expando]){delete this.cache[owner[this.expando]];}}};var data_priv=new Data();var data_user=new Data(); //	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014
var rbrace=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,rmultiDash=/([A-Z])/g;function dataAttr(elem,key,data){var name; // If nothing was found internally, try to fetch any
// data from the HTML5 data-* attribute
if(data===undefined&&elem.nodeType===1){name="data-"+key.replace(rmultiDash,"-$1").toLowerCase();data=elem.getAttribute(name);if(typeof data==="string"){try{data=data==="true"?true:data==="false"?false:data==="null"?null: // Only convert to a number if it doesn't change the string
+data+""===data?+data:rbrace.test(data)?jQuery.parseJSON(data):data;}catch(e){} // Make sure we set the data so it isn't changed later
data_user.set(elem,key,data);}else {data=undefined;}}return data;}jQuery.extend({hasData:function hasData(elem){return data_user.hasData(elem)||data_priv.hasData(elem);},data:function data(elem,name,_data){return data_user.access(elem,name,_data);},removeData:function removeData(elem,name){data_user.remove(elem,name);}, // TODO: Now that all calls to _data and _removeData have been replaced
// with direct calls to data_priv methods, these can be deprecated.
_data:function _data(elem,name,data){return data_priv.access(elem,name,data);},_removeData:function _removeData(elem,name){data_priv.remove(elem,name);}});jQuery.fn.extend({data:function data(key,value){var i,name,data,elem=this[0],attrs=elem&&elem.attributes; // Gets all values
if(key===undefined){if(this.length){data=data_user.get(elem);if(elem.nodeType===1&&!data_priv.get(elem,"hasDataAttrs")){i=attrs.length;while(i--){ // Support: IE11+
// The attrs elements can be null (#14894)
if(attrs[i]){name=attrs[i].name;if(name.indexOf("data-")===0){name=jQuery.camelCase(name.slice(5));dataAttr(elem,name,data[name]);}}}data_priv.set(elem,"hasDataAttrs",true);}}return data;} // Sets multiple values
if((typeof key==="undefined"?"undefined":_typeof(key))==="object"){return this.each(function(){data_user.set(this,key);});}return access(this,function(value){var data,camelKey=jQuery.camelCase(key); // The calling jQuery object (element matches) is not empty
// (and therefore has an element appears at this[ 0 ]) and the
// `value` parameter was not undefined. An empty jQuery object
// will result in `undefined` for elem = this[ 0 ] which will
// throw an exception if an attempt to read a data cache is made.
if(elem&&value===undefined){ // Attempt to get data from the cache
// with the key as-is
data=data_user.get(elem,key);if(data!==undefined){return data;} // Attempt to get data from the cache
// with the key camelized
data=data_user.get(elem,camelKey);if(data!==undefined){return data;} // Attempt to "discover" the data in
// HTML5 custom data-* attrs
data=dataAttr(elem,camelKey,undefined);if(data!==undefined){return data;} // We tried really hard, but the data doesn't exist.
return;} // Set the data...
this.each(function(){ // First, attempt to store a copy or reference of any
// data that might've been store with a camelCased key.
var data=data_user.get(this,camelKey); // For HTML5 data-* attribute interop, we have to
// store property names with dashes in a camelCase form.
// This might not apply to all properties...*
data_user.set(this,camelKey,value); // *... In the case of properties that might _actually_
// have dashes, we need to also store a copy of that
// unchanged property.
if(key.indexOf("-")!==-1&&data!==undefined){data_user.set(this,key,value);}});},null,value,arguments.length>1,null,true);},removeData:function removeData(key){return this.each(function(){data_user.remove(this,key);});}});jQuery.extend({queue:function queue(elem,type,data){var queue;if(elem){type=(type||"fx")+"queue";queue=data_priv.get(elem,type); // Speed up dequeue by getting out quickly if this is just a lookup
if(data){if(!queue||jQuery.isArray(data)){queue=data_priv.access(elem,type,jQuery.makeArray(data));}else {queue.push(data);}}return queue||[];}},dequeue:function dequeue(elem,type){type=type||"fx";var queue=jQuery.queue(elem,type),startLength=queue.length,fn=queue.shift(),hooks=jQuery._queueHooks(elem,type),next=function next(){jQuery.dequeue(elem,type);}; // If the fx queue is dequeued, always remove the progress sentinel
if(fn==="inprogress"){fn=queue.shift();startLength--;}if(fn){ // Add a progress sentinel to prevent the fx queue from being
// automatically dequeued
if(type==="fx"){queue.unshift("inprogress");} // Clear up the last queue stop function
delete hooks.stop;fn.call(elem,next,hooks);}if(!startLength&&hooks){hooks.empty.fire();}}, // Not public - generate a queueHooks object, or return the current one
_queueHooks:function _queueHooks(elem,type){var key=type+"queueHooks";return data_priv.get(elem,key)||data_priv.access(elem,key,{empty:jQuery.Callbacks("once memory").add(function(){data_priv.remove(elem,[type+"queue",key]);})});}});jQuery.fn.extend({queue:function queue(type,data){var setter=2;if(typeof type!=="string"){data=type;type="fx";setter--;}if(arguments.length<setter){return jQuery.queue(this[0],type);}return data===undefined?this:this.each(function(){var queue=jQuery.queue(this,type,data); // Ensure a hooks for this queue
jQuery._queueHooks(this,type);if(type==="fx"&&queue[0]!=="inprogress"){jQuery.dequeue(this,type);}});},dequeue:function dequeue(type){return this.each(function(){jQuery.dequeue(this,type);});},clearQueue:function clearQueue(type){return this.queue(type||"fx",[]);}, // Get a promise resolved when queues of a certain type
// are emptied (fx is the type by default)
promise:function promise(type,obj){var tmp,count=1,defer=jQuery.Deferred(),elements=this,i=this.length,resolve=function resolve(){if(! --count){defer.resolveWith(elements,[elements]);}};if(typeof type!=="string"){obj=type;type=undefined;}type=type||"fx";while(i--){tmp=data_priv.get(elements[i],type+"queueHooks");if(tmp&&tmp.empty){count++;tmp.empty.add(resolve);}}resolve();return defer.promise(obj);}});var pnum=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;var cssExpand=["Top","Right","Bottom","Left"];var isHidden=function isHidden(elem,el){ // isHidden might be called from jQuery#filter function;
// in that case, element will be second argument
elem=el||elem;return jQuery.css(elem,"display")==="none"||!jQuery.contains(elem.ownerDocument,elem);};var rcheckableType=/^(?:checkbox|radio)$/i;(function(){var fragment=document.createDocumentFragment(),div=fragment.appendChild(document.createElement("div")),input=document.createElement("input"); // Support: Safari<=5.1
// Check state lost if the name is set (#11217)
// Support: Windows Web Apps (WWA)
// `name` and `type` must use .setAttribute for WWA (#14901)
input.setAttribute("type","radio");input.setAttribute("checked","checked");input.setAttribute("name","t");div.appendChild(input); // Support: Safari<=5.1, Android<4.2
// Older WebKit doesn't clone checked state correctly in fragments
support.checkClone=div.cloneNode(true).cloneNode(true).lastChild.checked; // Support: IE<=11+
// Make sure textarea (and checkbox) defaultValue is properly cloned
div.innerHTML="<textarea>x</textarea>";support.noCloneChecked=!!div.cloneNode(true).lastChild.defaultValue;})();var strundefined=typeof undefined==="undefined"?"undefined":_typeof(undefined);support.focusinBubbles="onfocusin" in window;var rkeyEvent=/^key/,rmouseEvent=/^(?:mouse|pointer|contextmenu)|click/,rfocusMorph=/^(?:focusinfocus|focusoutblur)$/,rtypenamespace=/^([^.]*)(?:\.(.+)|)$/;function returnTrue(){return true;}function returnFalse(){return false;}function safeActiveElement(){try{return document.activeElement;}catch(err){}} /*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */jQuery.event={global:{},add:function add(elem,types,handler,data,selector){var handleObjIn,eventHandle,tmp,events,t,handleObj,special,handlers,type,namespaces,origType,elemData=data_priv.get(elem); // Don't attach events to noData or text/comment nodes (but allow plain objects)
if(!elemData){return;} // Caller can pass in an object of custom data in lieu of the handler
if(handler.handler){handleObjIn=handler;handler=handleObjIn.handler;selector=handleObjIn.selector;} // Make sure that the handler has a unique ID, used to find/remove it later
if(!handler.guid){handler.guid=jQuery.guid++;} // Init the element's event structure and main handler, if this is the first
if(!(events=elemData.events)){events=elemData.events={};}if(!(eventHandle=elemData.handle)){eventHandle=elemData.handle=function(e){ // Discard the second event of a jQuery.event.trigger() and
// when an event is called after a page has unloaded
return (typeof jQuery==="undefined"?"undefined":_typeof(jQuery))!==strundefined&&jQuery.event.triggered!==e.type?jQuery.event.dispatch.apply(elem,arguments):undefined;};} // Handle multiple events separated by a space
types=(types||"").match(rnotwhite)||[""];t=types.length;while(t--){tmp=rtypenamespace.exec(types[t])||[];type=origType=tmp[1];namespaces=(tmp[2]||"").split(".").sort(); // There *must* be a type, no attaching namespace-only handlers
if(!type){continue;} // If event changes its type, use the special event handlers for the changed type
special=jQuery.event.special[type]||{}; // If selector defined, determine special event api type, otherwise given type
type=(selector?special.delegateType:special.bindType)||type; // Update special based on newly reset type
special=jQuery.event.special[type]||{}; // handleObj is passed to all event handlers
handleObj=jQuery.extend({type:type,origType:origType,data:data,handler:handler,guid:handler.guid,selector:selector,needsContext:selector&&jQuery.expr.match.needsContext.test(selector),namespace:namespaces.join(".")},handleObjIn); // Init the event handler queue if we're the first
if(!(handlers=events[type])){handlers=events[type]=[];handlers.delegateCount=0; // Only use addEventListener if the special events handler returns false
if(!special.setup||special.setup.call(elem,data,namespaces,eventHandle)===false){if(elem.addEventListener){elem.addEventListener(type,eventHandle,false);}}}if(special.add){special.add.call(elem,handleObj);if(!handleObj.handler.guid){handleObj.handler.guid=handler.guid;}} // Add to the element's handler list, delegates in front
if(selector){handlers.splice(handlers.delegateCount++,0,handleObj);}else {handlers.push(handleObj);} // Keep track of which events have ever been used, for event optimization
jQuery.event.global[type]=true;}}, // Detach an event or set of events from an element
remove:function remove(elem,types,handler,selector,mappedTypes){var j,origCount,tmp,events,t,handleObj,special,handlers,type,namespaces,origType,elemData=data_priv.hasData(elem)&&data_priv.get(elem);if(!elemData||!(events=elemData.events)){return;} // Once for each type.namespace in types; type may be omitted
types=(types||"").match(rnotwhite)||[""];t=types.length;while(t--){tmp=rtypenamespace.exec(types[t])||[];type=origType=tmp[1];namespaces=(tmp[2]||"").split(".").sort(); // Unbind all events (on this namespace, if provided) for the element
if(!type){for(type in events){jQuery.event.remove(elem,type+types[t],handler,selector,true);}continue;}special=jQuery.event.special[type]||{};type=(selector?special.delegateType:special.bindType)||type;handlers=events[type]||[];tmp=tmp[2]&&new RegExp("(^|\\.)"+namespaces.join("\\.(?:.*\\.|)")+"(\\.|$)"); // Remove matching events
origCount=j=handlers.length;while(j--){handleObj=handlers[j];if((mappedTypes||origType===handleObj.origType)&&(!handler||handler.guid===handleObj.guid)&&(!tmp||tmp.test(handleObj.namespace))&&(!selector||selector===handleObj.selector||selector==="**"&&handleObj.selector)){handlers.splice(j,1);if(handleObj.selector){handlers.delegateCount--;}if(special.remove){special.remove.call(elem,handleObj);}}} // Remove generic event handler if we removed something and no more handlers exist
// (avoids potential for endless recursion during removal of special event handlers)
if(origCount&&!handlers.length){if(!special.teardown||special.teardown.call(elem,namespaces,elemData.handle)===false){jQuery.removeEvent(elem,type,elemData.handle);}delete events[type];}} // Remove the expando if it's no longer used
if(jQuery.isEmptyObject(events)){delete elemData.handle;data_priv.remove(elem,"events");}},trigger:function trigger(event,data,elem,onlyHandlers){var i,cur,tmp,bubbleType,ontype,handle,special,eventPath=[elem||document],type=hasOwn.call(event,"type")?event.type:event,namespaces=hasOwn.call(event,"namespace")?event.namespace.split("."):[];cur=tmp=elem=elem||document; // Don't do events on text and comment nodes
if(elem.nodeType===3||elem.nodeType===8){return;} // focus/blur morphs to focusin/out; ensure we're not firing them right now
if(rfocusMorph.test(type+jQuery.event.triggered)){return;}if(type.indexOf(".")>=0){ // Namespaced trigger; create a regexp to match event type in handle()
namespaces=type.split(".");type=namespaces.shift();namespaces.sort();}ontype=type.indexOf(":")<0&&"on"+type; // Caller can pass in a jQuery.Event object, Object, or just an event type string
event=event[jQuery.expando]?event:new jQuery.Event(type,(typeof event==="undefined"?"undefined":_typeof(event))==="object"&&event); // Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
event.isTrigger=onlyHandlers?2:3;event.namespace=namespaces.join(".");event.namespace_re=event.namespace?new RegExp("(^|\\.)"+namespaces.join("\\.(?:.*\\.|)")+"(\\.|$)"):null; // Clean up the event in case it is being reused
event.result=undefined;if(!event.target){event.target=elem;} // Clone any incoming data and prepend the event, creating the handler arg list
data=data==null?[event]:jQuery.makeArray(data,[event]); // Allow special events to draw outside the lines
special=jQuery.event.special[type]||{};if(!onlyHandlers&&special.trigger&&special.trigger.apply(elem,data)===false){return;} // Determine event propagation path in advance, per W3C events spec (#9951)
// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
if(!onlyHandlers&&!special.noBubble&&!jQuery.isWindow(elem)){bubbleType=special.delegateType||type;if(!rfocusMorph.test(bubbleType+type)){cur=cur.parentNode;}for(;cur;cur=cur.parentNode){eventPath.push(cur);tmp=cur;} // Only add window if we got to document (e.g., not plain obj or detached DOM)
if(tmp===(elem.ownerDocument||document)){eventPath.push(tmp.defaultView||tmp.parentWindow||window);}} // Fire handlers on the event path
i=0;while((cur=eventPath[i++])&&!event.isPropagationStopped()){event.type=i>1?bubbleType:special.bindType||type; // jQuery handler
handle=(data_priv.get(cur,"events")||{})[event.type]&&data_priv.get(cur,"handle");if(handle){handle.apply(cur,data);} // Native handler
handle=ontype&&cur[ontype];if(handle&&handle.apply&&jQuery.acceptData(cur)){event.result=handle.apply(cur,data);if(event.result===false){event.preventDefault();}}}event.type=type; // If nobody prevented the default action, do it now
if(!onlyHandlers&&!event.isDefaultPrevented()){if((!special._default||special._default.apply(eventPath.pop(),data)===false)&&jQuery.acceptData(elem)){ // Call a native DOM method on the target with the same name name as the event.
// Don't do default actions on window, that's where global variables be (#6170)
if(ontype&&jQuery.isFunction(elem[type])&&!jQuery.isWindow(elem)){ // Don't re-trigger an onFOO event when we call its FOO() method
tmp=elem[ontype];if(tmp){elem[ontype]=null;} // Prevent re-triggering of the same event, since we already bubbled it above
jQuery.event.triggered=type;elem[type]();jQuery.event.triggered=undefined;if(tmp){elem[ontype]=tmp;}}}}return event.result;},dispatch:function dispatch(event){ // Make a writable jQuery.Event from the native event object
event=jQuery.event.fix(event);var i,j,ret,matched,handleObj,handlerQueue=[],args=_slice.call(arguments),handlers=(data_priv.get(this,"events")||{})[event.type]||[],special=jQuery.event.special[event.type]||{}; // Use the fix-ed jQuery.Event rather than the (read-only) native event
args[0]=event;event.delegateTarget=this; // Call the preDispatch hook for the mapped type, and let it bail if desired
if(special.preDispatch&&special.preDispatch.call(this,event)===false){return;} // Determine handlers
handlerQueue=jQuery.event.handlers.call(this,event,handlers); // Run delegates first; they may want to stop propagation beneath us
i=0;while((matched=handlerQueue[i++])&&!event.isPropagationStopped()){event.currentTarget=matched.elem;j=0;while((handleObj=matched.handlers[j++])&&!event.isImmediatePropagationStopped()){ // Triggered event must either 1) have no namespace, or 2) have namespace(s)
// a subset or equal to those in the bound event (both can have no namespace).
if(!event.namespace_re||event.namespace_re.test(handleObj.namespace)){event.handleObj=handleObj;event.data=handleObj.data;ret=((jQuery.event.special[handleObj.origType]||{}).handle||handleObj.handler).apply(matched.elem,args);if(ret!==undefined){if((event.result=ret)===false){event.preventDefault();event.stopPropagation();}}}}} // Call the postDispatch hook for the mapped type
if(special.postDispatch){special.postDispatch.call(this,event);}return event.result;},handlers:function handlers(event,_handlers){var i,matches,sel,handleObj,handlerQueue=[],delegateCount=_handlers.delegateCount,cur=event.target; // Find delegate handlers
// Black-hole SVG <use> instance trees (#13180)
// Avoid non-left-click bubbling in Firefox (#3861)
if(delegateCount&&cur.nodeType&&(!event.button||event.type!=="click")){for(;cur!==this;cur=cur.parentNode||this){ // Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
if(cur.disabled!==true||event.type!=="click"){matches=[];for(i=0;i<delegateCount;i++){handleObj=_handlers[i]; // Don't conflict with Object.prototype properties (#13203)
sel=handleObj.selector+" ";if(matches[sel]===undefined){matches[sel]=handleObj.needsContext?jQuery(sel,this).index(cur)>=0:jQuery.find(sel,this,null,[cur]).length;}if(matches[sel]){matches.push(handleObj);}}if(matches.length){handlerQueue.push({elem:cur,handlers:matches});}}}} // Add the remaining (directly-bound) handlers
if(delegateCount<_handlers.length){handlerQueue.push({elem:this,handlers:_handlers.slice(delegateCount)});}return handlerQueue;}, // Includes some event props shared by KeyEvent and MouseEvent
props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function filter(event,original){ // Add which for key events
if(event.which==null){event.which=original.charCode!=null?original.charCode:original.keyCode;}return event;}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function filter(event,original){var eventDoc,doc,body,button=original.button; // Calculate pageX/Y if missing and clientX/Y available
if(event.pageX==null&&original.clientX!=null){eventDoc=event.target.ownerDocument||document;doc=eventDoc.documentElement;body=eventDoc.body;event.pageX=original.clientX+(doc&&doc.scrollLeft||body&&body.scrollLeft||0)-(doc&&doc.clientLeft||body&&body.clientLeft||0);event.pageY=original.clientY+(doc&&doc.scrollTop||body&&body.scrollTop||0)-(doc&&doc.clientTop||body&&body.clientTop||0);} // Add which for click: 1 === left; 2 === middle; 3 === right
// Note: button is not normalized, so don't use it
if(!event.which&&button!==undefined){event.which=button&1?1:button&2?3:button&4?2:0;}return event;}},fix:function fix(event){if(event[jQuery.expando]){return event;} // Create a writable copy of the event object and normalize some properties
var i,prop,copy,type=event.type,originalEvent=event,fixHook=this.fixHooks[type];if(!fixHook){this.fixHooks[type]=fixHook=rmouseEvent.test(type)?this.mouseHooks:rkeyEvent.test(type)?this.keyHooks:{};}copy=fixHook.props?this.props.concat(fixHook.props):this.props;event=new jQuery.Event(originalEvent);i=copy.length;while(i--){prop=copy[i];event[prop]=originalEvent[prop];} // Support: Cordova 2.5 (WebKit) (#13255)
// All events should have a target; Cordova deviceready doesn't
if(!event.target){event.target=document;} // Support: Safari 6.0+, Chrome<28
// Target should not be a text node (#504, #13143)
if(event.target.nodeType===3){event.target=event.target.parentNode;}return fixHook.filter?fixHook.filter(event,originalEvent):event;},special:{load:{ // Prevent triggered image.load events from bubbling to window.load
noBubble:true},focus:{ // Fire native event if possible so blur/focus sequence is correct
trigger:function trigger(){if(this!==safeActiveElement()&&this.focus){this.focus();return false;}},delegateType:"focusin"},blur:{trigger:function trigger(){if(this===safeActiveElement()&&this.blur){this.blur();return false;}},delegateType:"focusout"},click:{ // For checkbox, fire native event so checked state will be right
trigger:function trigger(){if(this.type==="checkbox"&&this.click&&jQuery.nodeName(this,"input")){this.click();return false;}}, // For cross-browser consistency, don't fire native .click() on links
_default:function _default(event){return jQuery.nodeName(event.target,"a");}},beforeunload:{postDispatch:function postDispatch(event){ // Support: Firefox 20+
// Firefox doesn't alert if the returnValue field is not set.
if(event.result!==undefined&&event.originalEvent){event.originalEvent.returnValue=event.result;}}}},simulate:function simulate(type,elem,event,bubble){ // Piggyback on a donor event to simulate a different one.
// Fake originalEvent to avoid donor's stopPropagation, but if the
// simulated event prevents default then we do the same on the donor.
var e=jQuery.extend(new jQuery.Event(),event,{type:type,isSimulated:true,originalEvent:{}});if(bubble){jQuery.event.trigger(e,null,elem);}else {jQuery.event.dispatch.call(elem,e);}if(e.isDefaultPrevented()){event.preventDefault();}}};jQuery.removeEvent=function(elem,type,handle){if(elem.removeEventListener){elem.removeEventListener(type,handle,false);}};jQuery.Event=function(src,props){ // Allow instantiation without the 'new' keyword
if(!(this instanceof jQuery.Event)){return new jQuery.Event(src,props);} // Event object
if(src&&src.type){this.originalEvent=src;this.type=src.type; // Events bubbling up the document may have been marked as prevented
// by a handler lower down the tree; reflect the correct value.
this.isDefaultPrevented=src.defaultPrevented||src.defaultPrevented===undefined&& // Support: Android<4.0
src.returnValue===false?returnTrue:returnFalse; // Event type
}else {this.type=src;} // Put explicitly provided properties onto the event object
if(props){jQuery.extend(this,props);} // Create a timestamp if incoming event doesn't have one
this.timeStamp=src&&src.timeStamp||jQuery.now(); // Mark it as fixed
this[jQuery.expando]=true;}; // jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype={isDefaultPrevented:returnFalse,isPropagationStopped:returnFalse,isImmediatePropagationStopped:returnFalse,preventDefault:function preventDefault(){var e=this.originalEvent;this.isDefaultPrevented=returnTrue;if(e&&e.preventDefault){e.preventDefault();}},stopPropagation:function stopPropagation(){var e=this.originalEvent;this.isPropagationStopped=returnTrue;if(e&&e.stopPropagation){e.stopPropagation();}},stopImmediatePropagation:function stopImmediatePropagation(){var e=this.originalEvent;this.isImmediatePropagationStopped=returnTrue;if(e&&e.stopImmediatePropagation){e.stopImmediatePropagation();}this.stopPropagation();}}; // Create mouseenter/leave events using mouseover/out and event-time checks
// Support: Chrome 15+
jQuery.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(orig,fix){jQuery.event.special[orig]={delegateType:fix,bindType:fix,handle:function handle(event){var ret,target=this,related=event.relatedTarget,handleObj=event.handleObj; // For mousenter/leave call the handler if related is outside the target.
// NB: No relatedTarget if the mouse left/entered the browser window
if(!related||related!==target&&!jQuery.contains(target,related)){event.type=handleObj.origType;ret=handleObj.handler.apply(this,arguments);event.type=fix;}return ret;}};}); // Support: Firefox, Chrome, Safari
// Create "bubbling" focus and blur events
if(!support.focusinBubbles){jQuery.each({focus:"focusin",blur:"focusout"},function(orig,fix){ // Attach a single capturing handler on the document while someone wants focusin/focusout
var handler=function handler(event){jQuery.event.simulate(fix,event.target,jQuery.event.fix(event),true);};jQuery.event.special[fix]={setup:function setup(){var doc=this.ownerDocument||this,attaches=data_priv.access(doc,fix);if(!attaches){doc.addEventListener(orig,handler,true);}data_priv.access(doc,fix,(attaches||0)+1);},teardown:function teardown(){var doc=this.ownerDocument||this,attaches=data_priv.access(doc,fix)-1;if(!attaches){doc.removeEventListener(orig,handler,true);data_priv.remove(doc,fix);}else {data_priv.access(doc,fix,attaches);}}};});}jQuery.fn.extend({on:function on(types,selector,data,fn, /*INTERNAL*/one){var origFn,type; // Types can be a map of types/handlers
if((typeof types==="undefined"?"undefined":_typeof(types))==="object"){ // ( types-Object, selector, data )
if(typeof selector!=="string"){ // ( types-Object, data )
data=data||selector;selector=undefined;}for(type in types){this.on(type,selector,data,types[type],one);}return this;}if(data==null&&fn==null){ // ( types, fn )
fn=selector;data=selector=undefined;}else if(fn==null){if(typeof selector==="string"){ // ( types, selector, fn )
fn=data;data=undefined;}else { // ( types, data, fn )
fn=data;data=selector;selector=undefined;}}if(fn===false){fn=returnFalse;}else if(!fn){return this;}if(one===1){origFn=fn;fn=function fn(event){ // Can use an empty set, since event contains the info
jQuery().off(event);return origFn.apply(this,arguments);}; // Use same guid so caller can remove using origFn
fn.guid=origFn.guid||(origFn.guid=jQuery.guid++);}return this.each(function(){jQuery.event.add(this,types,fn,data,selector);});},one:function one(types,selector,data,fn){return this.on(types,selector,data,fn,1);},off:function off(types,selector,fn){var handleObj,type;if(types&&types.preventDefault&&types.handleObj){ // ( event )  dispatched jQuery.Event
handleObj=types.handleObj;jQuery(types.delegateTarget).off(handleObj.namespace?handleObj.origType+"."+handleObj.namespace:handleObj.origType,handleObj.selector,handleObj.handler);return this;}if((typeof types==="undefined"?"undefined":_typeof(types))==="object"){ // ( types-object [, selector] )
for(type in types){this.off(type,selector,types[type]);}return this;}if(selector===false||typeof selector==="function"){ // ( types [, fn] )
fn=selector;selector=undefined;}if(fn===false){fn=returnFalse;}return this.each(function(){jQuery.event.remove(this,types,fn,selector);});},trigger:function trigger(type,data){return this.each(function(){jQuery.event.trigger(type,data,this);});},triggerHandler:function triggerHandler(type,data){var elem=this[0];if(elem){return jQuery.event.trigger(type,data,elem,true);}}});var rxhtmlTag=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,rtagName=/<([\w:]+)/,rhtml=/<|&#?\w+;/,rnoInnerhtml=/<(?:script|style|link)/i, // checked="checked" or checked
rchecked=/checked\s*(?:[^=]|=\s*.checked.)/i,rscriptType=/^$|\/(?:java|ecma)script/i,rscriptTypeMasked=/^true\/(.*)/,rcleanScript=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g, // We have to close these tags to support XHTML (#13200)
wrapMap={ // Support: IE9
option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]}; // Support: IE9
wrapMap.optgroup=wrapMap.option;wrapMap.tbody=wrapMap.tfoot=wrapMap.colgroup=wrapMap.caption=wrapMap.thead;wrapMap.th=wrapMap.td; // Support: 1.x compatibility
// Manipulating tables requires a tbody
function manipulationTarget(elem,content){return jQuery.nodeName(elem,"table")&&jQuery.nodeName(content.nodeType!==11?content:content.firstChild,"tr")?elem.getElementsByTagName("tbody")[0]||elem.appendChild(elem.ownerDocument.createElement("tbody")):elem;} // Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript(elem){elem.type=(elem.getAttribute("type")!==null)+"/"+elem.type;return elem;}function restoreScript(elem){var match=rscriptTypeMasked.exec(elem.type);if(match){elem.type=match[1];}else {elem.removeAttribute("type");}return elem;} // Mark scripts as having already been evaluated
function setGlobalEval(elems,refElements){var i=0,l=elems.length;for(;i<l;i++){data_priv.set(elems[i],"globalEval",!refElements||data_priv.get(refElements[i],"globalEval"));}}function cloneCopyEvent(src,dest){var i,l,type,pdataOld,pdataCur,udataOld,udataCur,events;if(dest.nodeType!==1){return;} // 1. Copy private data: events, handlers, etc.
if(data_priv.hasData(src)){pdataOld=data_priv.access(src);pdataCur=data_priv.set(dest,pdataOld);events=pdataOld.events;if(events){delete pdataCur.handle;pdataCur.events={};for(type in events){for(i=0,l=events[type].length;i<l;i++){jQuery.event.add(dest,type,events[type][i]);}}}} // 2. Copy user data
if(data_user.hasData(src)){udataOld=data_user.access(src);udataCur=jQuery.extend({},udataOld);data_user.set(dest,udataCur);}}function getAll(context,tag){var ret=context.getElementsByTagName?context.getElementsByTagName(tag||"*"):context.querySelectorAll?context.querySelectorAll(tag||"*"):[];return tag===undefined||tag&&jQuery.nodeName(context,tag)?jQuery.merge([context],ret):ret;} // Fix IE bugs, see support tests
function fixInput(src,dest){var nodeName=dest.nodeName.toLowerCase(); // Fails to persist the checked state of a cloned checkbox or radio button.
if(nodeName==="input"&&rcheckableType.test(src.type)){dest.checked=src.checked; // Fails to return the selected option to the default selected state when cloning options
}else if(nodeName==="input"||nodeName==="textarea"){dest.defaultValue=src.defaultValue;}}jQuery.extend({clone:function clone(elem,dataAndEvents,deepDataAndEvents){var i,l,srcElements,destElements,clone=elem.cloneNode(true),inPage=jQuery.contains(elem.ownerDocument,elem); // Fix IE cloning issues
if(!support.noCloneChecked&&(elem.nodeType===1||elem.nodeType===11)&&!jQuery.isXMLDoc(elem)){ // We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
destElements=getAll(clone);srcElements=getAll(elem);for(i=0,l=srcElements.length;i<l;i++){fixInput(srcElements[i],destElements[i]);}} // Copy the events from the original to the clone
if(dataAndEvents){if(deepDataAndEvents){srcElements=srcElements||getAll(elem);destElements=destElements||getAll(clone);for(i=0,l=srcElements.length;i<l;i++){cloneCopyEvent(srcElements[i],destElements[i]);}}else {cloneCopyEvent(elem,clone);}} // Preserve script evaluation history
destElements=getAll(clone,"script");if(destElements.length>0){setGlobalEval(destElements,!inPage&&getAll(elem,"script"));} // Return the cloned set
return clone;},buildFragment:function buildFragment(elems,context,scripts,selection){var elem,tmp,tag,wrap,contains,j,fragment=context.createDocumentFragment(),nodes=[],i=0,l=elems.length;for(;i<l;i++){elem=elems[i];if(elem||elem===0){ // Add nodes directly
if(jQuery.type(elem)==="object"){ // Support: QtWebKit, PhantomJS
// push.apply(_, arraylike) throws on ancient WebKit
jQuery.merge(nodes,elem.nodeType?[elem]:elem); // Convert non-html into a text node
}else if(!rhtml.test(elem)){nodes.push(context.createTextNode(elem)); // Convert html into DOM nodes
}else {tmp=tmp||fragment.appendChild(context.createElement("div")); // Deserialize a standard representation
tag=(rtagName.exec(elem)||["",""])[1].toLowerCase();wrap=wrapMap[tag]||wrapMap._default;tmp.innerHTML=wrap[1]+elem.replace(rxhtmlTag,"<$1></$2>")+wrap[2]; // Descend through wrappers to the right content
j=wrap[0];while(j--){tmp=tmp.lastChild;} // Support: QtWebKit, PhantomJS
// push.apply(_, arraylike) throws on ancient WebKit
jQuery.merge(nodes,tmp.childNodes); // Remember the top-level container
tmp=fragment.firstChild; // Ensure the created nodes are orphaned (#12392)
tmp.textContent="";}}} // Remove wrapper from fragment
fragment.textContent="";i=0;while(elem=nodes[i++]){ // #4087 - If origin and destination elements are the same, and this is
// that element, do not do anything
if(selection&&jQuery.inArray(elem,selection)!==-1){continue;}contains=jQuery.contains(elem.ownerDocument,elem); // Append to fragment
tmp=getAll(fragment.appendChild(elem),"script"); // Preserve script evaluation history
if(contains){setGlobalEval(tmp);} // Capture executables
if(scripts){j=0;while(elem=tmp[j++]){if(rscriptType.test(elem.type||"")){scripts.push(elem);}}}}return fragment;},cleanData:function cleanData(elems){var data,elem,type,key,special=jQuery.event.special,i=0;for(;(elem=elems[i])!==undefined;i++){if(jQuery.acceptData(elem)){key=elem[data_priv.expando];if(key&&(data=data_priv.cache[key])){if(data.events){for(type in data.events){if(special[type]){jQuery.event.remove(elem,type); // This is a shortcut to avoid jQuery.event.remove's overhead
}else {jQuery.removeEvent(elem,type,data.handle);}}}if(data_priv.cache[key]){ // Discard any remaining `private` data
delete data_priv.cache[key];}}} // Discard any remaining `user` data
delete data_user.cache[elem[data_user.expando]];}}});jQuery.fn.extend({text:function text(value){return access(this,function(value){return value===undefined?jQuery.text(this):this.empty().each(function(){if(this.nodeType===1||this.nodeType===11||this.nodeType===9){this.textContent=value;}});},null,value,arguments.length);},append:function append(){return this.domManip(arguments,function(elem){if(this.nodeType===1||this.nodeType===11||this.nodeType===9){var target=manipulationTarget(this,elem);target.appendChild(elem);}});},prepend:function prepend(){return this.domManip(arguments,function(elem){if(this.nodeType===1||this.nodeType===11||this.nodeType===9){var target=manipulationTarget(this,elem);target.insertBefore(elem,target.firstChild);}});},before:function before(){return this.domManip(arguments,function(elem){if(this.parentNode){this.parentNode.insertBefore(elem,this);}});},after:function after(){return this.domManip(arguments,function(elem){if(this.parentNode){this.parentNode.insertBefore(elem,this.nextSibling);}});},remove:function remove(selector,keepData /* Internal Use Only */){var elem,elems=selector?jQuery.filter(selector,this):this,i=0;for(;(elem=elems[i])!=null;i++){if(!keepData&&elem.nodeType===1){jQuery.cleanData(getAll(elem));}if(elem.parentNode){if(keepData&&jQuery.contains(elem.ownerDocument,elem)){setGlobalEval(getAll(elem,"script"));}elem.parentNode.removeChild(elem);}}return this;},empty:function empty(){var elem,i=0;for(;(elem=this[i])!=null;i++){if(elem.nodeType===1){ // Prevent memory leaks
jQuery.cleanData(getAll(elem,false)); // Remove any remaining nodes
elem.textContent="";}}return this;},clone:function clone(dataAndEvents,deepDataAndEvents){dataAndEvents=dataAndEvents==null?false:dataAndEvents;deepDataAndEvents=deepDataAndEvents==null?dataAndEvents:deepDataAndEvents;return this.map(function(){return jQuery.clone(this,dataAndEvents,deepDataAndEvents);});},html:function html(value){return access(this,function(value){var elem=this[0]||{},i=0,l=this.length;if(value===undefined&&elem.nodeType===1){return elem.innerHTML;} // See if we can take a shortcut and just use innerHTML
if(typeof value==="string"&&!rnoInnerhtml.test(value)&&!wrapMap[(rtagName.exec(value)||["",""])[1].toLowerCase()]){value=value.replace(rxhtmlTag,"<$1></$2>");try{for(;i<l;i++){elem=this[i]||{}; // Remove element nodes and prevent memory leaks
if(elem.nodeType===1){jQuery.cleanData(getAll(elem,false));elem.innerHTML=value;}}elem=0; // If using innerHTML throws an exception, use the fallback method
}catch(e){}}if(elem){this.empty().append(value);}},null,value,arguments.length);},replaceWith:function replaceWith(){var arg=arguments[0]; // Make the changes, replacing each context element with the new content
this.domManip(arguments,function(elem){arg=this.parentNode;jQuery.cleanData(getAll(this));if(arg){arg.replaceChild(elem,this);}}); // Force removal if there was no new content (e.g., from empty arguments)
return arg&&(arg.length||arg.nodeType)?this:this.remove();},detach:function detach(selector){return this.remove(selector,true);},domManip:function domManip(args,callback){ // Flatten any nested arrays
args=concat.apply([],args);var fragment,first,scripts,hasScripts,node,doc,i=0,l=this.length,set=this,iNoClone=l-1,value=args[0],isFunction=jQuery.isFunction(value); // We can't cloneNode fragments that contain checked, in WebKit
if(isFunction||l>1&&typeof value==="string"&&!support.checkClone&&rchecked.test(value)){return this.each(function(index){var self=set.eq(index);if(isFunction){args[0]=value.call(this,index,self.html());}self.domManip(args,callback);});}if(l){fragment=jQuery.buildFragment(args,this[0].ownerDocument,false,this);first=fragment.firstChild;if(fragment.childNodes.length===1){fragment=first;}if(first){scripts=jQuery.map(getAll(fragment,"script"),disableScript);hasScripts=scripts.length; // Use the original fragment for the last item instead of the first because it can end up
// being emptied incorrectly in certain situations (#8070).
for(;i<l;i++){node=fragment;if(i!==iNoClone){node=jQuery.clone(node,true,true); // Keep references to cloned scripts for later restoration
if(hasScripts){ // Support: QtWebKit
// jQuery.merge because push.apply(_, arraylike) throws
jQuery.merge(scripts,getAll(node,"script"));}}callback.call(this[i],node,i);}if(hasScripts){doc=scripts[scripts.length-1].ownerDocument; // Reenable scripts
jQuery.map(scripts,restoreScript); // Evaluate executable scripts on first document insertion
for(i=0;i<hasScripts;i++){node=scripts[i];if(rscriptType.test(node.type||"")&&!data_priv.access(node,"globalEval")&&jQuery.contains(doc,node)){if(node.src){ // Optional AJAX dependency, but won't run scripts if not present
if(jQuery._evalUrl){jQuery._evalUrl(node.src);}}else {jQuery.globalEval(node.textContent.replace(rcleanScript,""));}}}}}}return this;}});jQuery.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(name,original){jQuery.fn[name]=function(selector){var elems,ret=[],insert=jQuery(selector),last=insert.length-1,i=0;for(;i<=last;i++){elems=i===last?this:this.clone(true);jQuery(insert[i])[original](elems); // Support: QtWebKit
// .get() because push.apply(_, arraylike) throws
push.apply(ret,elems.get());}return this.pushStack(ret);};});var iframe,elemdisplay={}; /**
 * Retrieve the actual display of a element
 * @param {String} name nodeName of the element
 * @param {Object} doc Document object
 */ // Called only from within defaultDisplay
function actualDisplay(name,doc){var style,elem=jQuery(doc.createElement(name)).appendTo(doc.body), // getDefaultComputedStyle might be reliably used only on attached element
display=window.getDefaultComputedStyle&&(style=window.getDefaultComputedStyle(elem[0]))? // Use of this method is a temporary fix (more like optimization) until something better comes along,
// since it was removed from specification and supported only in FF
style.display:jQuery.css(elem[0],"display"); // We don't have any data stored on the element,
// so use "detach" method as fast way to get rid of the element
elem.detach();return display;} /**
 * Try to determine the default display value of an element
 * @param {String} nodeName
 */function defaultDisplay(nodeName){var doc=document,display=elemdisplay[nodeName];if(!display){display=actualDisplay(nodeName,doc); // If the simple way fails, read from inside an iframe
if(display==="none"||!display){ // Use the already-created iframe if possible
iframe=(iframe||jQuery("<iframe frameborder='0' width='0' height='0'/>")).appendTo(doc.documentElement); // Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
doc=iframe[0].contentDocument; // Support: IE
doc.write();doc.close();display=actualDisplay(nodeName,doc);iframe.detach();} // Store the correct default display
elemdisplay[nodeName]=display;}return display;}var rmargin=/^margin/;var rnumnonpx=new RegExp("^("+pnum+")(?!px)[a-z%]+$","i");var getStyles=function getStyles(elem){ // Support: IE<=11+, Firefox<=30+ (#15098, #14150)
// IE throws on elements created in popups
// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
if(elem.ownerDocument.defaultView.opener){return elem.ownerDocument.defaultView.getComputedStyle(elem,null);}return window.getComputedStyle(elem,null);};function curCSS(elem,name,computed){var width,minWidth,maxWidth,ret,style=elem.style;computed=computed||getStyles(elem); // Support: IE9
// getPropertyValue is only needed for .css('filter') (#12537)
if(computed){ret=computed.getPropertyValue(name)||computed[name];}if(computed){if(ret===""&&!jQuery.contains(elem.ownerDocument,elem)){ret=jQuery.style(elem,name);} // Support: iOS < 6
// A tribute to the "awesome hack by Dean Edwards"
// iOS < 6 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
if(rnumnonpx.test(ret)&&rmargin.test(name)){ // Remember the original values
width=style.width;minWidth=style.minWidth;maxWidth=style.maxWidth; // Put in the new values to get a computed value out
style.minWidth=style.maxWidth=style.width=ret;ret=computed.width; // Revert the changed values
style.width=width;style.minWidth=minWidth;style.maxWidth=maxWidth;}}return ret!==undefined? // Support: IE
// IE returns zIndex value as an integer.
ret+"":ret;}function addGetHookIf(conditionFn,hookFn){ // Define the hook, we'll check on the first run if it's really needed.
return {get:function get(){if(conditionFn()){ // Hook not needed (or it's not possible to use it due
// to missing dependency), remove it.
delete this.get;return;} // Hook needed; redefine it so that the support test is not executed again.
return (this.get=hookFn).apply(this,arguments);}};}(function(){var pixelPositionVal,boxSizingReliableVal,docElem=document.documentElement,container=document.createElement("div"),div=document.createElement("div");if(!div.style){return;} // Support: IE9-11+
// Style of cloned element affects source element cloned (#8908)
div.style.backgroundClip="content-box";div.cloneNode(true).style.backgroundClip="";support.clearCloneStyle=div.style.backgroundClip==="content-box";container.style.cssText="border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;"+"position:absolute";container.appendChild(div); // Executing both pixelPosition & boxSizingReliable tests require only one layout
// so they're executed at the same time to save the second computation.
function computePixelPositionAndBoxSizingReliable(){div.style.cssText= // Support: Firefox<29, Android 2.3
// Vendor-prefix box-sizing
"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;"+"box-sizing:border-box;display:block;margin-top:1%;top:1%;"+"border:1px;padding:1px;width:4px;position:absolute";div.innerHTML="";docElem.appendChild(container);var divStyle=window.getComputedStyle(div,null);pixelPositionVal=divStyle.top!=="1%";boxSizingReliableVal=divStyle.width==="4px";docElem.removeChild(container);} // Support: node.js jsdom
// Don't assume that getComputedStyle is a property of the global object
if(window.getComputedStyle){jQuery.extend(support,{pixelPosition:function pixelPosition(){ // This test is executed only once but we still do memoizing
// since we can use the boxSizingReliable pre-computing.
// No need to check if the test was already performed, though.
computePixelPositionAndBoxSizingReliable();return pixelPositionVal;},boxSizingReliable:function boxSizingReliable(){if(boxSizingReliableVal==null){computePixelPositionAndBoxSizingReliable();}return boxSizingReliableVal;},reliableMarginRight:function reliableMarginRight(){ // Support: Android 2.3
// Check if div with explicit width and no margin-right incorrectly
// gets computed margin-right based on width of container. (#3333)
// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
// This support function is only executed once so no memoizing is needed.
var ret,marginDiv=div.appendChild(document.createElement("div")); // Reset CSS: box-sizing; display; margin; border; padding
marginDiv.style.cssText=div.style.cssText= // Support: Firefox<29, Android 2.3
// Vendor-prefix box-sizing
"-webkit-box-sizing:content-box;-moz-box-sizing:content-box;"+"box-sizing:content-box;display:block;margin:0;border:0;padding:0";marginDiv.style.marginRight=marginDiv.style.width="0";div.style.width="1px";docElem.appendChild(container);ret=!parseFloat(window.getComputedStyle(marginDiv,null).marginRight);docElem.removeChild(container);div.removeChild(marginDiv);return ret;}});}})(); // A method for quickly swapping in/out CSS properties to get correct calculations.
jQuery.swap=function(elem,options,callback,args){var ret,name,old={}; // Remember the old values, and insert the new ones
for(name in options){old[name]=elem.style[name];elem.style[name]=options[name];}ret=callback.apply(elem,args||[]); // Revert the old values
for(name in options){elem.style[name]=old[name];}return ret;};var  // Swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
rdisplayswap=/^(none|table(?!-c[ea]).+)/,rnumsplit=new RegExp("^("+pnum+")(.*)$","i"),rrelNum=new RegExp("^([+-])=("+pnum+")","i"),cssShow={position:"absolute",visibility:"hidden",display:"block"},cssNormalTransform={letterSpacing:"0",fontWeight:"400"},cssPrefixes=["Webkit","O","Moz","ms"]; // Return a css property mapped to a potentially vendor prefixed property
function vendorPropName(style,name){ // Shortcut for names that are not vendor prefixed
if(name in style){return name;} // Check for vendor prefixed names
var capName=name[0].toUpperCase()+name.slice(1),origName=name,i=cssPrefixes.length;while(i--){name=cssPrefixes[i]+capName;if(name in style){return name;}}return origName;}function setPositiveNumber(elem,value,subtract){var matches=rnumsplit.exec(value);return matches? // Guard against undefined "subtract", e.g., when used as in cssHooks
Math.max(0,matches[1]-(subtract||0))+(matches[2]||"px"):value;}function augmentWidthOrHeight(elem,name,extra,isBorderBox,styles){var i=extra===(isBorderBox?"border":"content")? // If we already have the right measurement, avoid augmentation
4: // Otherwise initialize for horizontal or vertical properties
name==="width"?1:0,val=0;for(;i<4;i+=2){ // Both box models exclude margin, so add it if we want it
if(extra==="margin"){val+=jQuery.css(elem,extra+cssExpand[i],true,styles);}if(isBorderBox){ // border-box includes padding, so remove it if we want content
if(extra==="content"){val-=jQuery.css(elem,"padding"+cssExpand[i],true,styles);} // At this point, extra isn't border nor margin, so remove border
if(extra!=="margin"){val-=jQuery.css(elem,"border"+cssExpand[i]+"Width",true,styles);}}else { // At this point, extra isn't content, so add padding
val+=jQuery.css(elem,"padding"+cssExpand[i],true,styles); // At this point, extra isn't content nor padding, so add border
if(extra!=="padding"){val+=jQuery.css(elem,"border"+cssExpand[i]+"Width",true,styles);}}}return val;}function getWidthOrHeight(elem,name,extra){ // Start with offset property, which is equivalent to the border-box value
var valueIsBorderBox=true,val=name==="width"?elem.offsetWidth:elem.offsetHeight,styles=getStyles(elem),isBorderBox=jQuery.css(elem,"boxSizing",false,styles)==="border-box"; // Some non-html elements return undefined for offsetWidth, so check for null/undefined
// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
if(val<=0||val==null){ // Fall back to computed then uncomputed css if necessary
val=curCSS(elem,name,styles);if(val<0||val==null){val=elem.style[name];} // Computed unit is not pixels. Stop here and return.
if(rnumnonpx.test(val)){return val;} // Check for style in case a browser which returns unreliable values
// for getComputedStyle silently falls back to the reliable elem.style
valueIsBorderBox=isBorderBox&&(support.boxSizingReliable()||val===elem.style[name]); // Normalize "", auto, and prepare for extra
val=parseFloat(val)||0;} // Use the active box-sizing model to add/subtract irrelevant styles
return val+augmentWidthOrHeight(elem,name,extra||(isBorderBox?"border":"content"),valueIsBorderBox,styles)+"px";}function showHide(elements,show){var display,elem,hidden,values=[],index=0,length=elements.length;for(;index<length;index++){elem=elements[index];if(!elem.style){continue;}values[index]=data_priv.get(elem,"olddisplay");display=elem.style.display;if(show){ // Reset the inline display of this element to learn if it is
// being hidden by cascaded rules or not
if(!values[index]&&display==="none"){elem.style.display="";} // Set elements which have been overridden with display: none
// in a stylesheet to whatever the default browser style is
// for such an element
if(elem.style.display===""&&isHidden(elem)){values[index]=data_priv.access(elem,"olddisplay",defaultDisplay(elem.nodeName));}}else {hidden=isHidden(elem);if(display!=="none"||!hidden){data_priv.set(elem,"olddisplay",hidden?display:jQuery.css(elem,"display"));}}} // Set the display of most of the elements in a second loop
// to avoid the constant reflow
for(index=0;index<length;index++){elem=elements[index];if(!elem.style){continue;}if(!show||elem.style.display==="none"||elem.style.display===""){elem.style.display=show?values[index]||"":"none";}}return elements;}jQuery.extend({ // Add in style property hooks for overriding the default
// behavior of getting and setting a style property
cssHooks:{opacity:{get:function get(elem,computed){if(computed){ // We should always get a number back from opacity
var ret=curCSS(elem,"opacity");return ret===""?"1":ret;}}}}, // Don't automatically add "px" to these possibly-unitless properties
cssNumber:{"columnCount":true,"fillOpacity":true,"flexGrow":true,"flexShrink":true,"fontWeight":true,"lineHeight":true,"opacity":true,"order":true,"orphans":true,"widows":true,"zIndex":true,"zoom":true}, // Add in properties whose names you wish to fix before
// setting or getting the value
cssProps:{"float":"cssFloat"}, // Get and set the style property on a DOM Node
style:function style(elem,name,value,extra){ // Don't set styles on text and comment nodes
if(!elem||elem.nodeType===3||elem.nodeType===8||!elem.style){return;} // Make sure that we're working with the right name
var ret,type,hooks,origName=jQuery.camelCase(name),style=elem.style;name=jQuery.cssProps[origName]||(jQuery.cssProps[origName]=vendorPropName(style,origName)); // Gets hook for the prefixed version, then unprefixed version
hooks=jQuery.cssHooks[name]||jQuery.cssHooks[origName]; // Check if we're setting a value
if(value!==undefined){type=typeof value==="undefined"?"undefined":_typeof(value); // Convert "+=" or "-=" to relative numbers (#7345)
if(type==="string"&&(ret=rrelNum.exec(value))){value=(ret[1]+1)*ret[2]+parseFloat(jQuery.css(elem,name)); // Fixes bug #9237
type="number";} // Make sure that null and NaN values aren't set (#7116)
if(value==null||value!==value){return;} // If a number, add 'px' to the (except for certain CSS properties)
if(type==="number"&&!jQuery.cssNumber[origName]){value+="px";} // Support: IE9-11+
// background-* props affect original clone's values
if(!support.clearCloneStyle&&value===""&&name.indexOf("background")===0){style[name]="inherit";} // If a hook was provided, use that value, otherwise just set the specified value
if(!hooks||!("set" in hooks)||(value=hooks.set(elem,value,extra))!==undefined){style[name]=value;}}else { // If a hook was provided get the non-computed value from there
if(hooks&&"get" in hooks&&(ret=hooks.get(elem,false,extra))!==undefined){return ret;} // Otherwise just get the value from the style object
return style[name];}},css:function css(elem,name,extra,styles){var val,num,hooks,origName=jQuery.camelCase(name); // Make sure that we're working with the right name
name=jQuery.cssProps[origName]||(jQuery.cssProps[origName]=vendorPropName(elem.style,origName)); // Try prefixed name followed by the unprefixed name
hooks=jQuery.cssHooks[name]||jQuery.cssHooks[origName]; // If a hook was provided get the computed value from there
if(hooks&&"get" in hooks){val=hooks.get(elem,true,extra);} // Otherwise, if a way to get the computed value exists, use that
if(val===undefined){val=curCSS(elem,name,styles);} // Convert "normal" to computed value
if(val==="normal"&&name in cssNormalTransform){val=cssNormalTransform[name];} // Make numeric if forced or a qualifier was provided and val looks numeric
if(extra===""||extra){num=parseFloat(val);return extra===true||jQuery.isNumeric(num)?num||0:val;}return val;}});jQuery.each(["height","width"],function(i,name){jQuery.cssHooks[name]={get:function get(elem,computed,extra){if(computed){ // Certain elements can have dimension info if we invisibly show them
// but it must have a current display style that would benefit
return rdisplayswap.test(jQuery.css(elem,"display"))&&elem.offsetWidth===0?jQuery.swap(elem,cssShow,function(){return getWidthOrHeight(elem,name,extra);}):getWidthOrHeight(elem,name,extra);}},set:function set(elem,value,extra){var styles=extra&&getStyles(elem);return setPositiveNumber(elem,value,extra?augmentWidthOrHeight(elem,name,extra,jQuery.css(elem,"boxSizing",false,styles)==="border-box",styles):0);}};}); // Support: Android 2.3
jQuery.cssHooks.marginRight=addGetHookIf(support.reliableMarginRight,function(elem,computed){if(computed){return jQuery.swap(elem,{"display":"inline-block"},curCSS,[elem,"marginRight"]);}}); // These hooks are used by animate to expand properties
jQuery.each({margin:"",padding:"",border:"Width"},function(prefix,suffix){jQuery.cssHooks[prefix+suffix]={expand:function expand(value){var i=0,expanded={}, // Assumes a single number if not a string
parts=typeof value==="string"?value.split(" "):[value];for(;i<4;i++){expanded[prefix+cssExpand[i]+suffix]=parts[i]||parts[i-2]||parts[0];}return expanded;}};if(!rmargin.test(prefix)){jQuery.cssHooks[prefix+suffix].set=setPositiveNumber;}});jQuery.fn.extend({css:function css(name,value){return access(this,function(elem,name,value){var styles,len,map={},i=0;if(jQuery.isArray(name)){styles=getStyles(elem);len=name.length;for(;i<len;i++){map[name[i]]=jQuery.css(elem,name[i],false,styles);}return map;}return value!==undefined?jQuery.style(elem,name,value):jQuery.css(elem,name);},name,value,arguments.length>1);},show:function show(){return showHide(this,true);},hide:function hide(){return showHide(this);},toggle:function toggle(state){if(typeof state==="boolean"){return state?this.show():this.hide();}return this.each(function(){if(isHidden(this)){jQuery(this).show();}else {jQuery(this).hide();}});}});function Tween(elem,options,prop,end,easing){return new Tween.prototype.init(elem,options,prop,end,easing);}jQuery.Tween=Tween;Tween.prototype={constructor:Tween,init:function init(elem,options,prop,end,easing,unit){this.elem=elem;this.prop=prop;this.easing=easing||"swing";this.options=options;this.start=this.now=this.cur();this.end=end;this.unit=unit||(jQuery.cssNumber[prop]?"":"px");},cur:function cur(){var hooks=Tween.propHooks[this.prop];return hooks&&hooks.get?hooks.get(this):Tween.propHooks._default.get(this);},run:function run(percent){var eased,hooks=Tween.propHooks[this.prop];if(this.options.duration){this.pos=eased=jQuery.easing[this.easing](percent,this.options.duration*percent,0,1,this.options.duration);}else {this.pos=eased=percent;}this.now=(this.end-this.start)*eased+this.start;if(this.options.step){this.options.step.call(this.elem,this.now,this);}if(hooks&&hooks.set){hooks.set(this);}else {Tween.propHooks._default.set(this);}return this;}};Tween.prototype.init.prototype=Tween.prototype;Tween.propHooks={_default:{get:function get(tween){var result;if(tween.elem[tween.prop]!=null&&(!tween.elem.style||tween.elem.style[tween.prop]==null)){return tween.elem[tween.prop];} // Passing an empty string as a 3rd parameter to .css will automatically
// attempt a parseFloat and fallback to a string if the parse fails.
// Simple values such as "10px" are parsed to Float;
// complex values such as "rotate(1rad)" are returned as-is.
result=jQuery.css(tween.elem,tween.prop,""); // Empty strings, null, undefined and "auto" are converted to 0.
return !result||result==="auto"?0:result;},set:function set(tween){ // Use step hook for back compat.
// Use cssHook if its there.
// Use .style if available and use plain properties where available.
if(jQuery.fx.step[tween.prop]){jQuery.fx.step[tween.prop](tween);}else if(tween.elem.style&&(tween.elem.style[jQuery.cssProps[tween.prop]]!=null||jQuery.cssHooks[tween.prop])){jQuery.style(tween.elem,tween.prop,tween.now+tween.unit);}else {tween.elem[tween.prop]=tween.now;}}}}; // Support: IE9
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop=Tween.propHooks.scrollLeft={set:function set(tween){if(tween.elem.nodeType&&tween.elem.parentNode){tween.elem[tween.prop]=tween.now;}}};jQuery.easing={linear:function linear(p){return p;},swing:function swing(p){return 0.5-Math.cos(p*Math.PI)/2;}};jQuery.fx=Tween.prototype.init; // Back Compat <1.8 extension point
jQuery.fx.step={};var fxNow,timerId,rfxtypes=/^(?:toggle|show|hide)$/,rfxnum=new RegExp("^(?:([+-])=|)("+pnum+")([a-z%]*)$","i"),rrun=/queueHooks$/,animationPrefilters=[defaultPrefilter],tweeners={"*":[function(prop,value){var tween=this.createTween(prop,value),target=tween.cur(),parts=rfxnum.exec(value),unit=parts&&parts[3]||(jQuery.cssNumber[prop]?"":"px"), // Starting value computation is required for potential unit mismatches
start=(jQuery.cssNumber[prop]||unit!=="px"&&+target)&&rfxnum.exec(jQuery.css(tween.elem,prop)),scale=1,maxIterations=20;if(start&&start[3]!==unit){ // Trust units reported by jQuery.css
unit=unit||start[3]; // Make sure we update the tween properties later on
parts=parts||[]; // Iteratively approximate from a nonzero starting point
start=+target||1;do { // If previous iteration zeroed out, double until we get *something*.
// Use string for doubling so we don't accidentally see scale as unchanged below
scale=scale||".5"; // Adjust and apply
start=start/scale;jQuery.style(tween.elem,prop,start+unit); // Update scale, tolerating zero or NaN from tween.cur(),
// break the loop if scale is unchanged or perfect, or if we've just had enough
}while(scale!==(scale=tween.cur()/target)&&scale!==1&&--maxIterations);} // Update tween properties
if(parts){start=tween.start=+start||+target||0;tween.unit=unit; // If a +=/-= token was provided, we're doing a relative animation
tween.end=parts[1]?start+(parts[1]+1)*parts[2]:+parts[2];}return tween;}]}; // Animations created synchronously will run synchronously
function createFxNow(){setTimeout(function(){fxNow=undefined;});return fxNow=jQuery.now();} // Generate parameters to create a standard animation
function genFx(type,includeWidth){var which,i=0,attrs={height:type}; // If we include width, step value is 1 to do all cssExpand values,
// otherwise step value is 2 to skip over Left and Right
includeWidth=includeWidth?1:0;for(;i<4;i+=2-includeWidth){which=cssExpand[i];attrs["margin"+which]=attrs["padding"+which]=type;}if(includeWidth){attrs.opacity=attrs.width=type;}return attrs;}function createTween(value,prop,animation){var tween,collection=(tweeners[prop]||[]).concat(tweeners["*"]),index=0,length=collection.length;for(;index<length;index++){if(tween=collection[index].call(animation,prop,value)){ // We're done with this property
return tween;}}}function defaultPrefilter(elem,props,opts){ /* jshint validthis: true */var prop,value,toggle,tween,hooks,oldfire,display,checkDisplay,anim=this,orig={},style=elem.style,hidden=elem.nodeType&&isHidden(elem),dataShow=data_priv.get(elem,"fxshow"); // Handle queue: false promises
if(!opts.queue){hooks=jQuery._queueHooks(elem,"fx");if(hooks.unqueued==null){hooks.unqueued=0;oldfire=hooks.empty.fire;hooks.empty.fire=function(){if(!hooks.unqueued){oldfire();}};}hooks.unqueued++;anim.always(function(){ // Ensure the complete handler is called before this completes
anim.always(function(){hooks.unqueued--;if(!jQuery.queue(elem,"fx").length){hooks.empty.fire();}});});} // Height/width overflow pass
if(elem.nodeType===1&&("height" in props||"width" in props)){ // Make sure that nothing sneaks out
// Record all 3 overflow attributes because IE9-10 do not
// change the overflow attribute when overflowX and
// overflowY are set to the same value
opts.overflow=[style.overflow,style.overflowX,style.overflowY]; // Set display property to inline-block for height/width
// animations on inline elements that are having width/height animated
display=jQuery.css(elem,"display"); // Test default display if display is currently "none"
checkDisplay=display==="none"?data_priv.get(elem,"olddisplay")||defaultDisplay(elem.nodeName):display;if(checkDisplay==="inline"&&jQuery.css(elem,"float")==="none"){style.display="inline-block";}}if(opts.overflow){style.overflow="hidden";anim.always(function(){style.overflow=opts.overflow[0];style.overflowX=opts.overflow[1];style.overflowY=opts.overflow[2];});} // show/hide pass
for(prop in props){value=props[prop];if(rfxtypes.exec(value)){delete props[prop];toggle=toggle||value==="toggle";if(value===(hidden?"hide":"show")){ // If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
if(value==="show"&&dataShow&&dataShow[prop]!==undefined){hidden=true;}else {continue;}}orig[prop]=dataShow&&dataShow[prop]||jQuery.style(elem,prop); // Any non-fx value stops us from restoring the original display value
}else {display=undefined;}}if(!jQuery.isEmptyObject(orig)){if(dataShow){if("hidden" in dataShow){hidden=dataShow.hidden;}}else {dataShow=data_priv.access(elem,"fxshow",{});} // Store state if its toggle - enables .stop().toggle() to "reverse"
if(toggle){dataShow.hidden=!hidden;}if(hidden){jQuery(elem).show();}else {anim.done(function(){jQuery(elem).hide();});}anim.done(function(){var prop;data_priv.remove(elem,"fxshow");for(prop in orig){jQuery.style(elem,prop,orig[prop]);}});for(prop in orig){tween=createTween(hidden?dataShow[prop]:0,prop,anim);if(!(prop in dataShow)){dataShow[prop]=tween.start;if(hidden){tween.end=tween.start;tween.start=prop==="width"||prop==="height"?1:0;}}} // If this is a noop like .hide().hide(), restore an overwritten display value
}else if((display==="none"?defaultDisplay(elem.nodeName):display)==="inline"){style.display=display;}}function propFilter(props,specialEasing){var index,name,easing,value,hooks; // camelCase, specialEasing and expand cssHook pass
for(index in props){name=jQuery.camelCase(index);easing=specialEasing[name];value=props[index];if(jQuery.isArray(value)){easing=value[1];value=props[index]=value[0];}if(index!==name){props[name]=value;delete props[index];}hooks=jQuery.cssHooks[name];if(hooks&&"expand" in hooks){value=hooks.expand(value);delete props[name]; // Not quite $.extend, this won't overwrite existing keys.
// Reusing 'index' because we have the correct "name"
for(index in value){if(!(index in props)){props[index]=value[index];specialEasing[index]=easing;}}}else {specialEasing[name]=easing;}}}function Animation(elem,properties,options){var result,stopped,index=0,length=animationPrefilters.length,deferred=jQuery.Deferred().always(function(){ // Don't match elem in the :animated selector
delete tick.elem;}),tick=function tick(){if(stopped){return false;}var currentTime=fxNow||createFxNow(),remaining=Math.max(0,animation.startTime+animation.duration-currentTime), // Support: Android 2.3
// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
temp=remaining/animation.duration||0,percent=1-temp,index=0,length=animation.tweens.length;for(;index<length;index++){animation.tweens[index].run(percent);}deferred.notifyWith(elem,[animation,percent,remaining]);if(percent<1&&length){return remaining;}else {deferred.resolveWith(elem,[animation]);return false;}},animation=deferred.promise({elem:elem,props:jQuery.extend({},properties),opts:jQuery.extend(true,{specialEasing:{}},options),originalProperties:properties,originalOptions:options,startTime:fxNow||createFxNow(),duration:options.duration,tweens:[],createTween:function createTween(prop,end){var tween=jQuery.Tween(elem,animation.opts,prop,end,animation.opts.specialEasing[prop]||animation.opts.easing);animation.tweens.push(tween);return tween;},stop:function stop(gotoEnd){var index=0, // If we are going to the end, we want to run all the tweens
// otherwise we skip this part
length=gotoEnd?animation.tweens.length:0;if(stopped){return this;}stopped=true;for(;index<length;index++){animation.tweens[index].run(1);} // Resolve when we played the last frame; otherwise, reject
if(gotoEnd){deferred.resolveWith(elem,[animation,gotoEnd]);}else {deferred.rejectWith(elem,[animation,gotoEnd]);}return this;}}),props=animation.props;propFilter(props,animation.opts.specialEasing);for(;index<length;index++){result=animationPrefilters[index].call(animation,elem,props,animation.opts);if(result){return result;}}jQuery.map(props,createTween,animation);if(jQuery.isFunction(animation.opts.start)){animation.opts.start.call(elem,animation);}jQuery.fx.timer(jQuery.extend(tick,{elem:elem,anim:animation,queue:animation.opts.queue})); // attach callbacks from options
return animation.progress(animation.opts.progress).done(animation.opts.done,animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);}jQuery.Animation=jQuery.extend(Animation,{tweener:function tweener(props,callback){if(jQuery.isFunction(props)){callback=props;props=["*"];}else {props=props.split(" ");}var prop,index=0,length=props.length;for(;index<length;index++){prop=props[index];tweeners[prop]=tweeners[prop]||[];tweeners[prop].unshift(callback);}},prefilter:function prefilter(callback,prepend){if(prepend){animationPrefilters.unshift(callback);}else {animationPrefilters.push(callback);}}});jQuery.speed=function(speed,easing,fn){var opt=speed&&(typeof speed==="undefined"?"undefined":_typeof(speed))==="object"?jQuery.extend({},speed):{complete:fn||!fn&&easing||jQuery.isFunction(speed)&&speed,duration:speed,easing:fn&&easing||easing&&!jQuery.isFunction(easing)&&easing};opt.duration=jQuery.fx.off?0:typeof opt.duration==="number"?opt.duration:opt.duration in jQuery.fx.speeds?jQuery.fx.speeds[opt.duration]:jQuery.fx.speeds._default; // Normalize opt.queue - true/undefined/null -> "fx"
if(opt.queue==null||opt.queue===true){opt.queue="fx";} // Queueing
opt.old=opt.complete;opt.complete=function(){if(jQuery.isFunction(opt.old)){opt.old.call(this);}if(opt.queue){jQuery.dequeue(this,opt.queue);}};return opt;};jQuery.fn.extend({fadeTo:function fadeTo(speed,to,easing,callback){ // Show any hidden elements after setting opacity to 0
return this.filter(isHidden).css("opacity",0).show() // Animate to the value specified
.end().animate({opacity:to},speed,easing,callback);},animate:function animate(prop,speed,easing,callback){var empty=jQuery.isEmptyObject(prop),optall=jQuery.speed(speed,easing,callback),doAnimation=function doAnimation(){ // Operate on a copy of prop so per-property easing won't be lost
var anim=Animation(this,jQuery.extend({},prop),optall); // Empty animations, or finishing resolves immediately
if(empty||data_priv.get(this,"finish")){anim.stop(true);}};doAnimation.finish=doAnimation;return empty||optall.queue===false?this.each(doAnimation):this.queue(optall.queue,doAnimation);},stop:function stop(type,clearQueue,gotoEnd){var stopQueue=function stopQueue(hooks){var stop=hooks.stop;delete hooks.stop;stop(gotoEnd);};if(typeof type!=="string"){gotoEnd=clearQueue;clearQueue=type;type=undefined;}if(clearQueue&&type!==false){this.queue(type||"fx",[]);}return this.each(function(){var dequeue=true,index=type!=null&&type+"queueHooks",timers=jQuery.timers,data=data_priv.get(this);if(index){if(data[index]&&data[index].stop){stopQueue(data[index]);}}else {for(index in data){if(data[index]&&data[index].stop&&rrun.test(index)){stopQueue(data[index]);}}}for(index=timers.length;index--;){if(timers[index].elem===this&&(type==null||timers[index].queue===type)){timers[index].anim.stop(gotoEnd);dequeue=false;timers.splice(index,1);}} // Start the next in the queue if the last step wasn't forced.
// Timers currently will call their complete callbacks, which
// will dequeue but only if they were gotoEnd.
if(dequeue||!gotoEnd){jQuery.dequeue(this,type);}});},finish:function finish(type){if(type!==false){type=type||"fx";}return this.each(function(){var index,data=data_priv.get(this),queue=data[type+"queue"],hooks=data[type+"queueHooks"],timers=jQuery.timers,length=queue?queue.length:0; // Enable finishing flag on private data
data.finish=true; // Empty the queue first
jQuery.queue(this,type,[]);if(hooks&&hooks.stop){hooks.stop.call(this,true);} // Look for any active animations, and finish them
for(index=timers.length;index--;){if(timers[index].elem===this&&timers[index].queue===type){timers[index].anim.stop(true);timers.splice(index,1);}} // Look for any animations in the old queue and finish them
for(index=0;index<length;index++){if(queue[index]&&queue[index].finish){queue[index].finish.call(this);}} // Turn off finishing flag
delete data.finish;});}});jQuery.each(["toggle","show","hide"],function(i,name){var cssFn=jQuery.fn[name];jQuery.fn[name]=function(speed,easing,callback){return speed==null||typeof speed==="boolean"?cssFn.apply(this,arguments):this.animate(genFx(name,true),speed,easing,callback);};}); // Generate shortcuts for custom animations
jQuery.each({slideDown:genFx("show"),slideUp:genFx("hide"),slideToggle:genFx("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(name,props){jQuery.fn[name]=function(speed,easing,callback){return this.animate(props,speed,easing,callback);};});jQuery.timers=[];jQuery.fx.tick=function(){var timer,i=0,timers=jQuery.timers;fxNow=jQuery.now();for(;i<timers.length;i++){timer=timers[i]; // Checks the timer has not already been removed
if(!timer()&&timers[i]===timer){timers.splice(i--,1);}}if(!timers.length){jQuery.fx.stop();}fxNow=undefined;};jQuery.fx.timer=function(timer){jQuery.timers.push(timer);if(timer()){jQuery.fx.start();}else {jQuery.timers.pop();}};jQuery.fx.interval=13;jQuery.fx.start=function(){if(!timerId){timerId=setInterval(jQuery.fx.tick,jQuery.fx.interval);}};jQuery.fx.stop=function(){clearInterval(timerId);timerId=null;};jQuery.fx.speeds={slow:600,fast:200, // Default speed
_default:400}; // Based off of the plugin by Clint Helfers, with permission.
// http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay=function(time,type){time=jQuery.fx?jQuery.fx.speeds[time]||time:time;type=type||"fx";return this.queue(type,function(next,hooks){var timeout=setTimeout(next,time);hooks.stop=function(){clearTimeout(timeout);};});};(function(){var input=document.createElement("input"),select=document.createElement("select"),opt=select.appendChild(document.createElement("option"));input.type="checkbox"; // Support: iOS<=5.1, Android<=4.2+
// Default value for a checkbox should be "on"
support.checkOn=input.value!==""; // Support: IE<=11+
// Must access selectedIndex to make default options select
support.optSelected=opt.selected; // Support: Android<=2.3
// Options inside disabled selects are incorrectly marked as disabled
select.disabled=true;support.optDisabled=!opt.disabled; // Support: IE<=11+
// An input loses its value after becoming a radio
input=document.createElement("input");input.value="t";input.type="radio";support.radioValue=input.value==="t";})();var nodeHook,boolHook,attrHandle=jQuery.expr.attrHandle;jQuery.fn.extend({attr:function attr(name,value){return access(this,jQuery.attr,name,value,arguments.length>1);},removeAttr:function removeAttr(name){return this.each(function(){jQuery.removeAttr(this,name);});}});jQuery.extend({attr:function attr(elem,name,value){var hooks,ret,nType=elem.nodeType; // don't get/set attributes on text, comment and attribute nodes
if(!elem||nType===3||nType===8||nType===2){return;} // Fallback to prop when attributes are not supported
if(_typeof(elem.getAttribute)===strundefined){return jQuery.prop(elem,name,value);} // All attributes are lowercase
// Grab necessary hook if one is defined
if(nType!==1||!jQuery.isXMLDoc(elem)){name=name.toLowerCase();hooks=jQuery.attrHooks[name]||(jQuery.expr.match.bool.test(name)?boolHook:nodeHook);}if(value!==undefined){if(value===null){jQuery.removeAttr(elem,name);}else if(hooks&&"set" in hooks&&(ret=hooks.set(elem,value,name))!==undefined){return ret;}else {elem.setAttribute(name,value+"");return value;}}else if(hooks&&"get" in hooks&&(ret=hooks.get(elem,name))!==null){return ret;}else {ret=jQuery.find.attr(elem,name); // Non-existent attributes return null, we normalize to undefined
return ret==null?undefined:ret;}},removeAttr:function removeAttr(elem,value){var name,propName,i=0,attrNames=value&&value.match(rnotwhite);if(attrNames&&elem.nodeType===1){while(name=attrNames[i++]){propName=jQuery.propFix[name]||name; // Boolean attributes get special treatment (#10870)
if(jQuery.expr.match.bool.test(name)){ // Set corresponding property to false
elem[propName]=false;}elem.removeAttribute(name);}}},attrHooks:{type:{set:function set(elem,value){if(!support.radioValue&&value==="radio"&&jQuery.nodeName(elem,"input")){var val=elem.value;elem.setAttribute("type",value);if(val){elem.value=val;}return value;}}}}}); // Hooks for boolean attributes
boolHook={set:function set(elem,value,name){if(value===false){ // Remove boolean attributes when set to false
jQuery.removeAttr(elem,name);}else {elem.setAttribute(name,name);}return name;}};jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g),function(i,name){var getter=attrHandle[name]||jQuery.find.attr;attrHandle[name]=function(elem,name,isXML){var ret,handle;if(!isXML){ // Avoid an infinite loop by temporarily removing this function from the getter
handle=attrHandle[name];attrHandle[name]=ret;ret=getter(elem,name,isXML)!=null?name.toLowerCase():null;attrHandle[name]=handle;}return ret;};});var rfocusable=/^(?:input|select|textarea|button)$/i;jQuery.fn.extend({prop:function prop(name,value){return access(this,jQuery.prop,name,value,arguments.length>1);},removeProp:function removeProp(name){return this.each(function(){delete this[jQuery.propFix[name]||name];});}});jQuery.extend({propFix:{"for":"htmlFor","class":"className"},prop:function prop(elem,name,value){var ret,hooks,notxml,nType=elem.nodeType; // Don't get/set properties on text, comment and attribute nodes
if(!elem||nType===3||nType===8||nType===2){return;}notxml=nType!==1||!jQuery.isXMLDoc(elem);if(notxml){ // Fix name and attach hooks
name=jQuery.propFix[name]||name;hooks=jQuery.propHooks[name];}if(value!==undefined){return hooks&&"set" in hooks&&(ret=hooks.set(elem,value,name))!==undefined?ret:elem[name]=value;}else {return hooks&&"get" in hooks&&(ret=hooks.get(elem,name))!==null?ret:elem[name];}},propHooks:{tabIndex:{get:function get(elem){return elem.hasAttribute("tabindex")||rfocusable.test(elem.nodeName)||elem.href?elem.tabIndex:-1;}}}});if(!support.optSelected){jQuery.propHooks.selected={get:function get(elem){var parent=elem.parentNode;if(parent&&parent.parentNode){parent.parentNode.selectedIndex;}return null;}};}jQuery.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){jQuery.propFix[this.toLowerCase()]=this;});var rclass=/[\t\r\n\f]/g;jQuery.fn.extend({addClass:function addClass(value){var classes,elem,cur,clazz,j,finalValue,proceed=typeof value==="string"&&value,i=0,len=this.length;if(jQuery.isFunction(value)){return this.each(function(j){jQuery(this).addClass(value.call(this,j,this.className));});}if(proceed){ // The disjunction here is for better compressibility (see removeClass)
classes=(value||"").match(rnotwhite)||[];for(;i<len;i++){elem=this[i];cur=elem.nodeType===1&&(elem.className?(" "+elem.className+" ").replace(rclass," "):" ");if(cur){j=0;while(clazz=classes[j++]){if(cur.indexOf(" "+clazz+" ")<0){cur+=clazz+" ";}} // only assign if different to avoid unneeded rendering.
finalValue=jQuery.trim(cur);if(elem.className!==finalValue){elem.className=finalValue;}}}}return this;},removeClass:function removeClass(value){var classes,elem,cur,clazz,j,finalValue,proceed=arguments.length===0||typeof value==="string"&&value,i=0,len=this.length;if(jQuery.isFunction(value)){return this.each(function(j){jQuery(this).removeClass(value.call(this,j,this.className));});}if(proceed){classes=(value||"").match(rnotwhite)||[];for(;i<len;i++){elem=this[i]; // This expression is here for better compressibility (see addClass)
cur=elem.nodeType===1&&(elem.className?(" "+elem.className+" ").replace(rclass," "):"");if(cur){j=0;while(clazz=classes[j++]){ // Remove *all* instances
while(cur.indexOf(" "+clazz+" ")>=0){cur=cur.replace(" "+clazz+" "," ");}} // Only assign if different to avoid unneeded rendering.
finalValue=value?jQuery.trim(cur):"";if(elem.className!==finalValue){elem.className=finalValue;}}}}return this;},toggleClass:function toggleClass(value,stateVal){var type=typeof value==="undefined"?"undefined":_typeof(value);if(typeof stateVal==="boolean"&&type==="string"){return stateVal?this.addClass(value):this.removeClass(value);}if(jQuery.isFunction(value)){return this.each(function(i){jQuery(this).toggleClass(value.call(this,i,this.className,stateVal),stateVal);});}return this.each(function(){if(type==="string"){ // Toggle individual class names
var className,i=0,self=jQuery(this),classNames=value.match(rnotwhite)||[];while(className=classNames[i++]){ // Check each className given, space separated list
if(self.hasClass(className)){self.removeClass(className);}else {self.addClass(className);}} // Toggle whole class name
}else if(type===strundefined||type==="boolean"){if(this.className){ // store className if set
data_priv.set(this,"__className__",this.className);} // If the element has a class name or if we're passed `false`,
// then remove the whole classname (if there was one, the above saved it).
// Otherwise bring back whatever was previously saved (if anything),
// falling back to the empty string if nothing was stored.
this.className=this.className||value===false?"":data_priv.get(this,"__className__")||"";}});},hasClass:function hasClass(selector){var className=" "+selector+" ",i=0,l=this.length;for(;i<l;i++){if(this[i].nodeType===1&&(" "+this[i].className+" ").replace(rclass," ").indexOf(className)>=0){return true;}}return false;}});var rreturn=/\r/g;jQuery.fn.extend({val:function val(value){var hooks,ret,isFunction,elem=this[0];if(!arguments.length){if(elem){hooks=jQuery.valHooks[elem.type]||jQuery.valHooks[elem.nodeName.toLowerCase()];if(hooks&&"get" in hooks&&(ret=hooks.get(elem,"value"))!==undefined){return ret;}ret=elem.value;return typeof ret==="string"? // Handle most common string cases
ret.replace(rreturn,""): // Handle cases where value is null/undef or number
ret==null?"":ret;}return;}isFunction=jQuery.isFunction(value);return this.each(function(i){var val;if(this.nodeType!==1){return;}if(isFunction){val=value.call(this,i,jQuery(this).val());}else {val=value;} // Treat null/undefined as ""; convert numbers to string
if(val==null){val="";}else if(typeof val==="number"){val+="";}else if(jQuery.isArray(val)){val=jQuery.map(val,function(value){return value==null?"":value+"";});}hooks=jQuery.valHooks[this.type]||jQuery.valHooks[this.nodeName.toLowerCase()]; // If set returns undefined, fall back to normal setting
if(!hooks||!("set" in hooks)||hooks.set(this,val,"value")===undefined){this.value=val;}});}});jQuery.extend({valHooks:{option:{get:function get(elem){var val=jQuery.find.attr(elem,"value");return val!=null?val: // Support: IE10-11+
// option.text throws exceptions (#14686, #14858)
jQuery.trim(jQuery.text(elem));}},select:{get:function get(elem){var value,option,options=elem.options,index=elem.selectedIndex,one=elem.type==="select-one"||index<0,values=one?null:[],max=one?index+1:options.length,i=index<0?max:one?index:0; // Loop through all the selected options
for(;i<max;i++){option=options[i]; // IE6-9 doesn't update selected after form reset (#2551)
if((option.selected||i===index)&&( // Don't return options that are disabled or in a disabled optgroup
support.optDisabled?!option.disabled:option.getAttribute("disabled")===null)&&(!option.parentNode.disabled||!jQuery.nodeName(option.parentNode,"optgroup"))){ // Get the specific value for the option
value=jQuery(option).val(); // We don't need an array for one selects
if(one){return value;} // Multi-Selects return an array
values.push(value);}}return values;},set:function set(elem,value){var optionSet,option,options=elem.options,values=jQuery.makeArray(value),i=options.length;while(i--){option=options[i];if(option.selected=jQuery.inArray(option.value,values)>=0){optionSet=true;}} // Force browsers to behave consistently when non-matching value is set
if(!optionSet){elem.selectedIndex=-1;}return values;}}}}); // Radios and checkboxes getter/setter
jQuery.each(["radio","checkbox"],function(){jQuery.valHooks[this]={set:function set(elem,value){if(jQuery.isArray(value)){return elem.checked=jQuery.inArray(jQuery(elem).val(),value)>=0;}}};if(!support.checkOn){jQuery.valHooks[this].get=function(elem){return elem.getAttribute("value")===null?"on":elem.value;};}}); // Return jQuery for attributes-only inclusion
jQuery.each(("blur focus focusin focusout load resize scroll unload click dblclick "+"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave "+"change select submit keydown keypress keyup error contextmenu").split(" "),function(i,name){ // Handle event binding
jQuery.fn[name]=function(data,fn){return arguments.length>0?this.on(name,null,data,fn):this.trigger(name);};});jQuery.fn.extend({hover:function hover(fnOver,fnOut){return this.mouseenter(fnOver).mouseleave(fnOut||fnOver);},bind:function bind(types,data,fn){return this.on(types,null,data,fn);},unbind:function unbind(types,fn){return this.off(types,null,fn);},delegate:function delegate(selector,types,data,fn){return this.on(types,selector,data,fn);},undelegate:function undelegate(selector,types,fn){ // ( namespace ) or ( selector, types [, fn] )
return arguments.length===1?this.off(selector,"**"):this.off(types,selector||"**",fn);}});var nonce=jQuery.now();var rquery=/\?/; // Support: Android 2.3
// Workaround failure to string-cast null input
jQuery.parseJSON=function(data){return JSON.parse(data+"");}; // Cross-browser xml parsing
jQuery.parseXML=function(data){var xml,tmp;if(!data||typeof data!=="string"){return null;} // Support: IE9
try{tmp=new DOMParser();xml=tmp.parseFromString(data,"text/xml");}catch(e){xml=undefined;}if(!xml||xml.getElementsByTagName("parsererror").length){jQuery.error("Invalid XML: "+data);}return xml;};var rhash=/#.*$/,rts=/([?&])_=[^&]*/,rheaders=/^(.*?):[ \t]*([^\r\n]*)$/mg, // #7653, #8125, #8152: local protocol detection
rlocalProtocol=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,rnoContent=/^(?:GET|HEAD)$/,rprotocol=/^\/\//,rurl=/^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/, /* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */prefilters={}, /* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */transports={}, // Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
allTypes="*/".concat("*"), // Document location
ajaxLocation=window.location.href, // Segment location into parts
ajaxLocParts=rurl.exec(ajaxLocation.toLowerCase())||[]; // Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports(structure){ // dataTypeExpression is optional and defaults to "*"
return function(dataTypeExpression,func){if(typeof dataTypeExpression!=="string"){func=dataTypeExpression;dataTypeExpression="*";}var dataType,i=0,dataTypes=dataTypeExpression.toLowerCase().match(rnotwhite)||[];if(jQuery.isFunction(func)){ // For each dataType in the dataTypeExpression
while(dataType=dataTypes[i++]){ // Prepend if requested
if(dataType[0]==="+"){dataType=dataType.slice(1)||"*";(structure[dataType]=structure[dataType]||[]).unshift(func); // Otherwise append
}else {(structure[dataType]=structure[dataType]||[]).push(func);}}}};} // Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports(structure,options,originalOptions,jqXHR){var inspected={},seekingTransport=structure===transports;function inspect(dataType){var selected;inspected[dataType]=true;jQuery.each(structure[dataType]||[],function(_,prefilterOrFactory){var dataTypeOrTransport=prefilterOrFactory(options,originalOptions,jqXHR);if(typeof dataTypeOrTransport==="string"&&!seekingTransport&&!inspected[dataTypeOrTransport]){options.dataTypes.unshift(dataTypeOrTransport);inspect(dataTypeOrTransport);return false;}else if(seekingTransport){return !(selected=dataTypeOrTransport);}});return selected;}return inspect(options.dataTypes[0])||!inspected["*"]&&inspect("*");} // A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend(target,src){var key,deep,flatOptions=jQuery.ajaxSettings.flatOptions||{};for(key in src){if(src[key]!==undefined){(flatOptions[key]?target:deep||(deep={}))[key]=src[key];}}if(deep){jQuery.extend(true,target,deep);}return target;} /* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */function ajaxHandleResponses(s,jqXHR,responses){var ct,type,finalDataType,firstDataType,contents=s.contents,dataTypes=s.dataTypes; // Remove auto dataType and get content-type in the process
while(dataTypes[0]==="*"){dataTypes.shift();if(ct===undefined){ct=s.mimeType||jqXHR.getResponseHeader("Content-Type");}} // Check if we're dealing with a known content-type
if(ct){for(type in contents){if(contents[type]&&contents[type].test(ct)){dataTypes.unshift(type);break;}}} // Check to see if we have a response for the expected dataType
if(dataTypes[0] in responses){finalDataType=dataTypes[0];}else { // Try convertible dataTypes
for(type in responses){if(!dataTypes[0]||s.converters[type+" "+dataTypes[0]]){finalDataType=type;break;}if(!firstDataType){firstDataType=type;}} // Or just use first one
finalDataType=finalDataType||firstDataType;} // If we found a dataType
// We add the dataType to the list if needed
// and return the corresponding response
if(finalDataType){if(finalDataType!==dataTypes[0]){dataTypes.unshift(finalDataType);}return responses[finalDataType];}} /* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */function ajaxConvert(s,response,jqXHR,isSuccess){var conv2,current,conv,tmp,prev,converters={}, // Work with a copy of dataTypes in case we need to modify it for conversion
dataTypes=s.dataTypes.slice(); // Create converters map with lowercased keys
if(dataTypes[1]){for(conv in s.converters){converters[conv.toLowerCase()]=s.converters[conv];}}current=dataTypes.shift(); // Convert to each sequential dataType
while(current){if(s.responseFields[current]){jqXHR[s.responseFields[current]]=response;} // Apply the dataFilter if provided
if(!prev&&isSuccess&&s.dataFilter){response=s.dataFilter(response,s.dataType);}prev=current;current=dataTypes.shift();if(current){ // There's only work to do if current dataType is non-auto
if(current==="*"){current=prev; // Convert response if prev dataType is non-auto and differs from current
}else if(prev!=="*"&&prev!==current){ // Seek a direct converter
conv=converters[prev+" "+current]||converters["* "+current]; // If none found, seek a pair
if(!conv){for(conv2 in converters){ // If conv2 outputs current
tmp=conv2.split(" ");if(tmp[1]===current){ // If prev can be converted to accepted input
conv=converters[prev+" "+tmp[0]]||converters["* "+tmp[0]];if(conv){ // Condense equivalence converters
if(conv===true){conv=converters[conv2]; // Otherwise, insert the intermediate dataType
}else if(converters[conv2]!==true){current=tmp[0];dataTypes.unshift(tmp[1]);}break;}}}} // Apply converter (if not an equivalence)
if(conv!==true){ // Unless errors are allowed to bubble, catch and return them
if(conv&&s["throws"]){response=conv(response);}else {try{response=conv(response);}catch(e){return {state:"parsererror",error:conv?e:"No conversion from "+prev+" to "+current};}}}}}}return {state:"success",data:response};}jQuery.extend({ // Counter for holding the number of active queries
active:0, // Last-Modified header cache for next request
lastModified:{},etag:{},ajaxSettings:{url:ajaxLocation,type:"GET",isLocal:rlocalProtocol.test(ajaxLocParts[1]),global:true,processData:true,async:true,contentType:"application/x-www-form-urlencoded; charset=UTF-8", /*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/accepts:{"*":allTypes,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"}, // Data converters
// Keys separate source (or catchall "*") and destination types with a single space
converters:{ // Convert anything to text
"* text":String, // Text to html (true = no transformation)
"text html":true, // Evaluate text as a json expression
"text json":jQuery.parseJSON, // Parse text as xml
"text xml":jQuery.parseXML}, // For options that shouldn't be deep extended:
// you can add your own custom options here if
// and when you create one that shouldn't be
// deep extended (see ajaxExtend)
flatOptions:{url:true,context:true}}, // Creates a full fledged settings object into target
// with both ajaxSettings and settings fields.
// If target is omitted, writes into ajaxSettings.
ajaxSetup:function ajaxSetup(target,settings){return settings? // Building a settings object
ajaxExtend(ajaxExtend(target,jQuery.ajaxSettings),settings): // Extending ajaxSettings
ajaxExtend(jQuery.ajaxSettings,target);},ajaxPrefilter:addToPrefiltersOrTransports(prefilters),ajaxTransport:addToPrefiltersOrTransports(transports), // Main method
ajax:function ajax(url,options){ // If url is an object, simulate pre-1.5 signature
if((typeof url==="undefined"?"undefined":_typeof(url))==="object"){options=url;url=undefined;} // Force options to be an object
options=options||{};var transport, // URL without anti-cache param
cacheURL, // Response headers
responseHeadersString,responseHeaders, // timeout handle
timeoutTimer, // Cross-domain detection vars
parts, // To know if global events are to be dispatched
fireGlobals, // Loop variable
i, // Create the final options object
s=jQuery.ajaxSetup({},options), // Callbacks context
callbackContext=s.context||s, // Context for global events is callbackContext if it is a DOM node or jQuery collection
globalEventContext=s.context&&(callbackContext.nodeType||callbackContext.jquery)?jQuery(callbackContext):jQuery.event, // Deferreds
deferred=jQuery.Deferred(),completeDeferred=jQuery.Callbacks("once memory"), // Status-dependent callbacks
_statusCode=s.statusCode||{}, // Headers (they are sent all at once)
requestHeaders={},requestHeadersNames={}, // The jqXHR state
state=0, // Default abort message
strAbort="canceled", // Fake xhr
jqXHR={readyState:0, // Builds headers hashtable if needed
getResponseHeader:function getResponseHeader(key){var match;if(state===2){if(!responseHeaders){responseHeaders={};while(match=rheaders.exec(responseHeadersString)){responseHeaders[match[1].toLowerCase()]=match[2];}}match=responseHeaders[key.toLowerCase()];}return match==null?null:match;}, // Raw string
getAllResponseHeaders:function getAllResponseHeaders(){return state===2?responseHeadersString:null;}, // Caches the header
setRequestHeader:function setRequestHeader(name,value){var lname=name.toLowerCase();if(!state){name=requestHeadersNames[lname]=requestHeadersNames[lname]||name;requestHeaders[name]=value;}return this;}, // Overrides response content-type header
overrideMimeType:function overrideMimeType(type){if(!state){s.mimeType=type;}return this;}, // Status-dependent callbacks
statusCode:function statusCode(map){var code;if(map){if(state<2){for(code in map){ // Lazy-add the new callback in a way that preserves old ones
_statusCode[code]=[_statusCode[code],map[code]];}}else { // Execute the appropriate callbacks
jqXHR.always(map[jqXHR.status]);}}return this;}, // Cancel the request
abort:function abort(statusText){var finalText=statusText||strAbort;if(transport){transport.abort(finalText);}done(0,finalText);return this;}}; // Attach deferreds
deferred.promise(jqXHR).complete=completeDeferred.add;jqXHR.success=jqXHR.done;jqXHR.error=jqXHR.fail; // Remove hash character (#7531: and string promotion)
// Add protocol if not provided (prefilters might expect it)
// Handle falsy url in the settings object (#10093: consistency with old signature)
// We also use the url parameter if available
s.url=((url||s.url||ajaxLocation)+"").replace(rhash,"").replace(rprotocol,ajaxLocParts[1]+"//"); // Alias method option to type as per ticket #12004
s.type=options.method||options.type||s.method||s.type; // Extract dataTypes list
s.dataTypes=jQuery.trim(s.dataType||"*").toLowerCase().match(rnotwhite)||[""]; // A cross-domain request is in order when we have a protocol:host:port mismatch
if(s.crossDomain==null){parts=rurl.exec(s.url.toLowerCase());s.crossDomain=!!(parts&&(parts[1]!==ajaxLocParts[1]||parts[2]!==ajaxLocParts[2]||(parts[3]||(parts[1]==="http:"?"80":"443"))!==(ajaxLocParts[3]||(ajaxLocParts[1]==="http:"?"80":"443"))));} // Convert data if not already a string
if(s.data&&s.processData&&typeof s.data!=="string"){s.data=jQuery.param(s.data,s.traditional);} // Apply prefilters
inspectPrefiltersOrTransports(prefilters,s,options,jqXHR); // If request was aborted inside a prefilter, stop there
if(state===2){return jqXHR;} // We can fire global events as of now if asked to
// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
fireGlobals=jQuery.event&&s.global; // Watch for a new set of requests
if(fireGlobals&&jQuery.active++===0){jQuery.event.trigger("ajaxStart");} // Uppercase the type
s.type=s.type.toUpperCase(); // Determine if request has content
s.hasContent=!rnoContent.test(s.type); // Save the URL in case we're toying with the If-Modified-Since
// and/or If-None-Match header later on
cacheURL=s.url; // More options handling for requests with no content
if(!s.hasContent){ // If data is available, append data to url
if(s.data){cacheURL=s.url+=(rquery.test(cacheURL)?"&":"?")+s.data; // #9682: remove data so that it's not used in an eventual retry
delete s.data;} // Add anti-cache in url if needed
if(s.cache===false){s.url=rts.test(cacheURL)? // If there is already a '_' parameter, set its value
cacheURL.replace(rts,"$1_="+nonce++): // Otherwise add one to the end
cacheURL+(rquery.test(cacheURL)?"&":"?")+"_="+nonce++;}} // Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
if(s.ifModified){if(jQuery.lastModified[cacheURL]){jqXHR.setRequestHeader("If-Modified-Since",jQuery.lastModified[cacheURL]);}if(jQuery.etag[cacheURL]){jqXHR.setRequestHeader("If-None-Match",jQuery.etag[cacheURL]);}} // Set the correct header, if data is being sent
if(s.data&&s.hasContent&&s.contentType!==false||options.contentType){jqXHR.setRequestHeader("Content-Type",s.contentType);} // Set the Accepts header for the server, depending on the dataType
jqXHR.setRequestHeader("Accept",s.dataTypes[0]&&s.accepts[s.dataTypes[0]]?s.accepts[s.dataTypes[0]]+(s.dataTypes[0]!=="*"?", "+allTypes+"; q=0.01":""):s.accepts["*"]); // Check for headers option
for(i in s.headers){jqXHR.setRequestHeader(i,s.headers[i]);} // Allow custom headers/mimetypes and early abort
if(s.beforeSend&&(s.beforeSend.call(callbackContext,jqXHR,s)===false||state===2)){ // Abort if not done already and return
return jqXHR.abort();} // Aborting is no longer a cancellation
strAbort="abort"; // Install callbacks on deferreds
for(i in {success:1,error:1,complete:1}){jqXHR[i](s[i]);} // Get transport
transport=inspectPrefiltersOrTransports(transports,s,options,jqXHR); // If no transport, we auto-abort
if(!transport){done(-1,"No Transport");}else {jqXHR.readyState=1; // Send global event
if(fireGlobals){globalEventContext.trigger("ajaxSend",[jqXHR,s]);} // Timeout
if(s.async&&s.timeout>0){timeoutTimer=setTimeout(function(){jqXHR.abort("timeout");},s.timeout);}try{state=1;transport.send(requestHeaders,done);}catch(e){ // Propagate exception as error if not done
if(state<2){done(-1,e); // Simply rethrow otherwise
}else {throw e;}}} // Callback for when everything is done
function done(status,nativeStatusText,responses,headers){var isSuccess,success,error,response,modified,statusText=nativeStatusText; // Called once
if(state===2){return;} // State is "done" now
state=2; // Clear timeout if it exists
if(timeoutTimer){clearTimeout(timeoutTimer);} // Dereference transport for early garbage collection
// (no matter how long the jqXHR object will be used)
transport=undefined; // Cache response headers
responseHeadersString=headers||""; // Set readyState
jqXHR.readyState=status>0?4:0; // Determine if successful
isSuccess=status>=200&&status<300||status===304; // Get response data
if(responses){response=ajaxHandleResponses(s,jqXHR,responses);} // Convert no matter what (that way responseXXX fields are always set)
response=ajaxConvert(s,response,jqXHR,isSuccess); // If successful, handle type chaining
if(isSuccess){ // Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
if(s.ifModified){modified=jqXHR.getResponseHeader("Last-Modified");if(modified){jQuery.lastModified[cacheURL]=modified;}modified=jqXHR.getResponseHeader("etag");if(modified){jQuery.etag[cacheURL]=modified;}} // if no content
if(status===204||s.type==="HEAD"){statusText="nocontent"; // if not modified
}else if(status===304){statusText="notmodified"; // If we have data, let's convert it
}else {statusText=response.state;success=response.data;error=response.error;isSuccess=!error;}}else { // Extract error from statusText and normalize for non-aborts
error=statusText;if(status||!statusText){statusText="error";if(status<0){status=0;}}} // Set data for the fake xhr object
jqXHR.status=status;jqXHR.statusText=(nativeStatusText||statusText)+""; // Success/Error
if(isSuccess){deferred.resolveWith(callbackContext,[success,statusText,jqXHR]);}else {deferred.rejectWith(callbackContext,[jqXHR,statusText,error]);} // Status-dependent callbacks
jqXHR.statusCode(_statusCode);_statusCode=undefined;if(fireGlobals){globalEventContext.trigger(isSuccess?"ajaxSuccess":"ajaxError",[jqXHR,s,isSuccess?success:error]);} // Complete
completeDeferred.fireWith(callbackContext,[jqXHR,statusText]);if(fireGlobals){globalEventContext.trigger("ajaxComplete",[jqXHR,s]); // Handle the global AJAX counter
if(! --jQuery.active){jQuery.event.trigger("ajaxStop");}}}return jqXHR;},getJSON:function getJSON(url,data,callback){return jQuery.get(url,data,callback,"json");},getScript:function getScript(url,callback){return jQuery.get(url,undefined,callback,"script");}});jQuery.each(["get","post"],function(i,method){jQuery[method]=function(url,data,callback,type){ // Shift arguments if data argument was omitted
if(jQuery.isFunction(data)){type=type||callback;callback=data;data=undefined;}return jQuery.ajax({url:url,type:method,dataType:type,data:data,success:callback});};});jQuery._evalUrl=function(url){return jQuery.ajax({url:url,type:"GET",dataType:"script",async:false,global:false,"throws":true});};jQuery.fn.extend({wrapAll:function wrapAll(html){var wrap;if(jQuery.isFunction(html)){return this.each(function(i){jQuery(this).wrapAll(html.call(this,i));});}if(this[0]){ // The elements to wrap the target around
wrap=jQuery(html,this[0].ownerDocument).eq(0).clone(true);if(this[0].parentNode){wrap.insertBefore(this[0]);}wrap.map(function(){var elem=this;while(elem.firstElementChild){elem=elem.firstElementChild;}return elem;}).append(this);}return this;},wrapInner:function wrapInner(html){if(jQuery.isFunction(html)){return this.each(function(i){jQuery(this).wrapInner(html.call(this,i));});}return this.each(function(){var self=jQuery(this),contents=self.contents();if(contents.length){contents.wrapAll(html);}else {self.append(html);}});},wrap:function wrap(html){var isFunction=jQuery.isFunction(html);return this.each(function(i){jQuery(this).wrapAll(isFunction?html.call(this,i):html);});},unwrap:function unwrap(){return this.parent().each(function(){if(!jQuery.nodeName(this,"body")){jQuery(this).replaceWith(this.childNodes);}}).end();}});jQuery.expr.filters.hidden=function(elem){ // Support: Opera <= 12.12
// Opera reports offsetWidths and offsetHeights less than zero on some elements
return elem.offsetWidth<=0&&elem.offsetHeight<=0;};jQuery.expr.filters.visible=function(elem){return !jQuery.expr.filters.hidden(elem);};var r20=/%20/g,rbracket=/\[\]$/,rCRLF=/\r?\n/g,rsubmitterTypes=/^(?:submit|button|image|reset|file)$/i,rsubmittable=/^(?:input|select|textarea|keygen)/i;function buildParams(prefix,obj,traditional,add){var name;if(jQuery.isArray(obj)){ // Serialize array item.
jQuery.each(obj,function(i,v){if(traditional||rbracket.test(prefix)){ // Treat each array item as a scalar.
add(prefix,v);}else { // Item is non-scalar (array or object), encode its numeric index.
buildParams(prefix+"["+((typeof v==="undefined"?"undefined":_typeof(v))==="object"?i:"")+"]",v,traditional,add);}});}else if(!traditional&&jQuery.type(obj)==="object"){ // Serialize object item.
for(name in obj){buildParams(prefix+"["+name+"]",obj[name],traditional,add);}}else { // Serialize scalar item.
add(prefix,obj);}} // Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param=function(a,traditional){var prefix,s=[],add=function add(key,value){ // If value is a function, invoke it and return its value
value=jQuery.isFunction(value)?value():value==null?"":value;s[s.length]=encodeURIComponent(key)+"="+encodeURIComponent(value);}; // Set traditional to true for jQuery <= 1.3.2 behavior.
if(traditional===undefined){traditional=jQuery.ajaxSettings&&jQuery.ajaxSettings.traditional;} // If an array was passed in, assume that it is an array of form elements.
if(jQuery.isArray(a)||a.jquery&&!jQuery.isPlainObject(a)){ // Serialize the form elements
jQuery.each(a,function(){add(this.name,this.value);});}else { // If traditional, encode the "old" way (the way 1.3.2 or older
// did it), otherwise encode params recursively.
for(prefix in a){buildParams(prefix,a[prefix],traditional,add);}} // Return the resulting serialization
return s.join("&").replace(r20,"+");};jQuery.fn.extend({serialize:function serialize(){return jQuery.param(this.serializeArray());},serializeArray:function serializeArray(){return this.map(function(){ // Can add propHook for "elements" to filter or add form elements
var elements=jQuery.prop(this,"elements");return elements?jQuery.makeArray(elements):this;}).filter(function(){var type=this.type; // Use .is( ":disabled" ) so that fieldset[disabled] works
return this.name&&!jQuery(this).is(":disabled")&&rsubmittable.test(this.nodeName)&&!rsubmitterTypes.test(type)&&(this.checked||!rcheckableType.test(type));}).map(function(i,elem){var val=jQuery(this).val();return val==null?null:jQuery.isArray(val)?jQuery.map(val,function(val){return {name:elem.name,value:val.replace(rCRLF,"\r\n")};}):{name:elem.name,value:val.replace(rCRLF,"\r\n")};}).get();}});jQuery.ajaxSettings.xhr=function(){try{return new XMLHttpRequest();}catch(e){}};var xhrId=0,xhrCallbacks={},xhrSuccessStatus={ // file protocol always yields status code 0, assume 200
0:200, // Support: IE9
// #1450: sometimes IE returns 1223 when it should be 204
1223:204},xhrSupported=jQuery.ajaxSettings.xhr(); // Support: IE9
// Open requests must be manually aborted on unload (#5280)
// See https://support.microsoft.com/kb/2856746 for more info
if(window.attachEvent){window.attachEvent("onunload",function(){for(var key in xhrCallbacks){xhrCallbacks[key]();}});}support.cors=!!xhrSupported&&"withCredentials" in xhrSupported;support.ajax=xhrSupported=!!xhrSupported;jQuery.ajaxTransport(function(options){var _callback; // Cross domain only allowed if supported through XMLHttpRequest
if(support.cors||xhrSupported&&!options.crossDomain){return {send:function send(headers,complete){var i,xhr=options.xhr(),id=++xhrId;xhr.open(options.type,options.url,options.async,options.username,options.password); // Apply custom fields if provided
if(options.xhrFields){for(i in options.xhrFields){xhr[i]=options.xhrFields[i];}} // Override mime type if needed
if(options.mimeType&&xhr.overrideMimeType){xhr.overrideMimeType(options.mimeType);} // X-Requested-With header
// For cross-domain requests, seeing as conditions for a preflight are
// akin to a jigsaw puzzle, we simply never set it to be sure.
// (it can always be set on a per-request basis or even using ajaxSetup)
// For same-domain requests, won't change header if already provided.
if(!options.crossDomain&&!headers["X-Requested-With"]){headers["X-Requested-With"]="XMLHttpRequest";} // Set headers
for(i in headers){xhr.setRequestHeader(i,headers[i]);} // Callback
_callback=function callback(type){return function(){if(_callback){delete xhrCallbacks[id];_callback=xhr.onload=xhr.onerror=null;if(type==="abort"){xhr.abort();}else if(type==="error"){complete( // file: protocol always yields status 0; see #8605, #14207
xhr.status,xhr.statusText);}else {complete(xhrSuccessStatus[xhr.status]||xhr.status,xhr.statusText, // Support: IE9
// Accessing binary-data responseText throws an exception
// (#11426)
typeof xhr.responseText==="string"?{text:xhr.responseText}:undefined,xhr.getAllResponseHeaders());}}};}; // Listen to events
xhr.onload=_callback();xhr.onerror=_callback("error"); // Create the abort callback
_callback=xhrCallbacks[id]=_callback("abort");try{ // Do send the request (this may raise an exception)
xhr.send(options.hasContent&&options.data||null);}catch(e){ // #14683: Only rethrow if this hasn't been notified as an error yet
if(_callback){throw e;}}},abort:function abort(){if(_callback){_callback();}}};}}); // Install script dataType
jQuery.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function textScript(text){jQuery.globalEval(text);return text;}}}); // Handle cache's special case and crossDomain
jQuery.ajaxPrefilter("script",function(s){if(s.cache===undefined){s.cache=false;}if(s.crossDomain){s.type="GET";}}); // Bind script tag hack transport
jQuery.ajaxTransport("script",function(s){ // This transport only deals with cross domain requests
if(s.crossDomain){var script,_callback2;return {send:function send(_,complete){script=jQuery("<script>").prop({async:true,charset:s.scriptCharset,src:s.url}).on("load error",_callback2=function callback(evt){script.remove();_callback2=null;if(evt){complete(evt.type==="error"?404:200,evt.type);}});document.head.appendChild(script[0]);},abort:function abort(){if(_callback2){_callback2();}}};}});var oldCallbacks=[],rjsonp=/(=)\?(?=&|$)|\?\?/; // Default jsonp settings
jQuery.ajaxSetup({jsonp:"callback",jsonpCallback:function jsonpCallback(){var callback=oldCallbacks.pop()||jQuery.expando+"_"+nonce++;this[callback]=true;return callback;}}); // Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter("json jsonp",function(s,originalSettings,jqXHR){var callbackName,overwritten,responseContainer,jsonProp=s.jsonp!==false&&(rjsonp.test(s.url)?"url":typeof s.data==="string"&&!(s.contentType||"").indexOf("application/x-www-form-urlencoded")&&rjsonp.test(s.data)&&"data"); // Handle iff the expected data type is "jsonp" or we have a parameter to set
if(jsonProp||s.dataTypes[0]==="jsonp"){ // Get callback name, remembering preexisting value associated with it
callbackName=s.jsonpCallback=jQuery.isFunction(s.jsonpCallback)?s.jsonpCallback():s.jsonpCallback; // Insert callback into url or form data
if(jsonProp){s[jsonProp]=s[jsonProp].replace(rjsonp,"$1"+callbackName);}else if(s.jsonp!==false){s.url+=(rquery.test(s.url)?"&":"?")+s.jsonp+"="+callbackName;} // Use data converter to retrieve json after script execution
s.converters["script json"]=function(){if(!responseContainer){jQuery.error(callbackName+" was not called");}return responseContainer[0];}; // force json dataType
s.dataTypes[0]="json"; // Install callback
overwritten=window[callbackName];window[callbackName]=function(){responseContainer=arguments;}; // Clean-up function (fires after converters)
jqXHR.always(function(){ // Restore preexisting value
window[callbackName]=overwritten; // Save back as free
if(s[callbackName]){ // make sure that re-using the options doesn't screw things around
s.jsonpCallback=originalSettings.jsonpCallback; // save the callback name for future use
oldCallbacks.push(callbackName);} // Call if it was a function and we have a response
if(responseContainer&&jQuery.isFunction(overwritten)){overwritten(responseContainer[0]);}responseContainer=overwritten=undefined;}); // Delegate to script
return "script";}}); // data: string of html
// context (optional): If specified, the fragment will be created in this context, defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML=function(data,context,keepScripts){if(!data||typeof data!=="string"){return null;}if(typeof context==="boolean"){keepScripts=context;context=false;}context=context||document;var parsed=rsingleTag.exec(data),scripts=!keepScripts&&[]; // Single tag
if(parsed){return [context.createElement(parsed[1])];}parsed=jQuery.buildFragment([data],context,scripts);if(scripts&&scripts.length){jQuery(scripts).remove();}return jQuery.merge([],parsed.childNodes);}; // Keep a copy of the old load method
var _load=jQuery.fn.load; /**
 * Load a url into a page
 */jQuery.fn.load=function(url,params,callback){if(typeof url!=="string"&&_load){return _load.apply(this,arguments);}var selector,type,response,self=this,off=url.indexOf(" ");if(off>=0){selector=jQuery.trim(url.slice(off));url=url.slice(0,off);} // If it's a function
if(jQuery.isFunction(params)){ // We assume that it's the callback
callback=params;params=undefined; // Otherwise, build a param string
}else if(params&&(typeof params==="undefined"?"undefined":_typeof(params))==="object"){type="POST";} // If we have elements to modify, make the request
if(self.length>0){jQuery.ajax({url:url, // if "type" variable is undefined, then "GET" method will be used
type:type,dataType:"html",data:params}).done(function(responseText){ // Save response for use in complete callback
response=arguments;self.html(selector? // If a selector was specified, locate the right elements in a dummy div
// Exclude scripts to avoid IE 'Permission Denied' errors
jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector): // Otherwise use the full result
responseText);}).complete(callback&&function(jqXHR,status){self.each(callback,response||[jqXHR.responseText,status,jqXHR]);});}return this;}; // Attach a bunch of functions for handling common AJAX events
jQuery.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(i,type){jQuery.fn[type]=function(fn){return this.on(type,fn);};});jQuery.expr.filters.animated=function(elem){return jQuery.grep(jQuery.timers,function(fn){return elem===fn.elem;}).length;};var docElem=window.document.documentElement; /**
 * Gets a window from an element
 */function getWindow(elem){return jQuery.isWindow(elem)?elem:elem.nodeType===9&&elem.defaultView;}jQuery.offset={setOffset:function setOffset(elem,options,i){var curPosition,curLeft,curCSSTop,curTop,curOffset,curCSSLeft,calculatePosition,position=jQuery.css(elem,"position"),curElem=jQuery(elem),props={}; // Set position first, in-case top/left are set even on static elem
if(position==="static"){elem.style.position="relative";}curOffset=curElem.offset();curCSSTop=jQuery.css(elem,"top");curCSSLeft=jQuery.css(elem,"left");calculatePosition=(position==="absolute"||position==="fixed")&&(curCSSTop+curCSSLeft).indexOf("auto")>-1; // Need to be able to calculate position if either
// top or left is auto and position is either absolute or fixed
if(calculatePosition){curPosition=curElem.position();curTop=curPosition.top;curLeft=curPosition.left;}else {curTop=parseFloat(curCSSTop)||0;curLeft=parseFloat(curCSSLeft)||0;}if(jQuery.isFunction(options)){options=options.call(elem,i,curOffset);}if(options.top!=null){props.top=options.top-curOffset.top+curTop;}if(options.left!=null){props.left=options.left-curOffset.left+curLeft;}if("using" in options){options.using.call(elem,props);}else {curElem.css(props);}}};jQuery.fn.extend({offset:function offset(options){if(arguments.length){return options===undefined?this:this.each(function(i){jQuery.offset.setOffset(this,options,i);});}var docElem,win,elem=this[0],box={top:0,left:0},doc=elem&&elem.ownerDocument;if(!doc){return;}docElem=doc.documentElement; // Make sure it's not a disconnected DOM node
if(!jQuery.contains(docElem,elem)){return box;} // Support: BlackBerry 5, iOS 3 (original iPhone)
// If we don't have gBCR, just use 0,0 rather than error
if(_typeof(elem.getBoundingClientRect)!==strundefined){box=elem.getBoundingClientRect();}win=getWindow(doc);return {top:box.top+win.pageYOffset-docElem.clientTop,left:box.left+win.pageXOffset-docElem.clientLeft};},position:function position(){if(!this[0]){return;}var offsetParent,offset,elem=this[0],parentOffset={top:0,left:0}; // Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
if(jQuery.css(elem,"position")==="fixed"){ // Assume getBoundingClientRect is there when computed position is fixed
offset=elem.getBoundingClientRect();}else { // Get *real* offsetParent
offsetParent=this.offsetParent(); // Get correct offsets
offset=this.offset();if(!jQuery.nodeName(offsetParent[0],"html")){parentOffset=offsetParent.offset();} // Add offsetParent borders
parentOffset.top+=jQuery.css(offsetParent[0],"borderTopWidth",true);parentOffset.left+=jQuery.css(offsetParent[0],"borderLeftWidth",true);} // Subtract parent offsets and element margins
return {top:offset.top-parentOffset.top-jQuery.css(elem,"marginTop",true),left:offset.left-parentOffset.left-jQuery.css(elem,"marginLeft",true)};},offsetParent:function offsetParent(){return this.map(function(){var offsetParent=this.offsetParent||docElem;while(offsetParent&&!jQuery.nodeName(offsetParent,"html")&&jQuery.css(offsetParent,"position")==="static"){offsetParent=offsetParent.offsetParent;}return offsetParent||docElem;});}}); // Create scrollLeft and scrollTop methods
jQuery.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(method,prop){var top="pageYOffset"===prop;jQuery.fn[method]=function(val){return access(this,function(elem,method,val){var win=getWindow(elem);if(val===undefined){return win?win[prop]:elem[method];}if(win){win.scrollTo(!top?val:window.pageXOffset,top?val:window.pageYOffset);}else {elem[method]=val;}},method,val,arguments.length,null);};}); // Support: Safari<7+, Chrome<37+
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://code.google.com/p/chromium/issues/detail?id=229280
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each(["top","left"],function(i,prop){jQuery.cssHooks[prop]=addGetHookIf(support.pixelPosition,function(elem,computed){if(computed){computed=curCSS(elem,prop); // If curCSS returns percentage, fallback to offset
return rnumnonpx.test(computed)?jQuery(elem).position()[prop]+"px":computed;}});}); // Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each({Height:"height",Width:"width"},function(name,type){jQuery.each({padding:"inner"+name,content:type,"":"outer"+name},function(defaultExtra,funcName){ // Margin is only for outerHeight, outerWidth
jQuery.fn[funcName]=function(margin,value){var chainable=arguments.length&&(defaultExtra||typeof margin!=="boolean"),extra=defaultExtra||(margin===true||value===true?"margin":"border");return access(this,function(elem,type,value){var doc;if(jQuery.isWindow(elem)){ // As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
// isn't a whole lot we can do. See pull request at this URL for discussion:
// https://github.com/jquery/jquery/pull/764
return elem.document.documentElement["client"+name];} // Get document width or height
if(elem.nodeType===9){doc=elem.documentElement; // Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
// whichever is greatest
return Math.max(elem.body["scroll"+name],doc["scroll"+name],elem.body["offset"+name],doc["offset"+name],doc["client"+name]);}return value===undefined? // Get width or height on the element, requesting but not forcing parseFloat
jQuery.css(elem,type,extra): // Set width or height on the element
jQuery.style(elem,type,value,extra);},type,chainable?margin:undefined,chainable,null);};});}); // The number of elements contained in the matched element set
jQuery.fn.size=function(){return this.length;};jQuery.fn.andSelf=jQuery.fn.addBack; // Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.
// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon
if(typeof define==="function"&&define.amd){define("jquery",[],function(){return jQuery;});}var  // Map over jQuery in case of overwrite
_jQuery=window.jQuery, // Map over the $ in case of overwrite
_$=window.$;jQuery.noConflict=function(deep){if(window.$===jQuery){window.$=_$;}if(deep&&window.jQuery===jQuery){window.jQuery=_jQuery;}return jQuery;}; // Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if((typeof noGlobal==="undefined"?"undefined":_typeof(noGlobal))===strundefined){window.jQuery=window.$=jQuery;}return jQuery;});

},{}],3:[function(require,module,exports){
'use strict';var _typeof=typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"?function(obj){return typeof obj;}:function(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol?"symbol":typeof obj;}; // File:src/Three.js
/**
 * @author mrdoob / http://mrdoob.com/
 */var THREE={REVISION:'73'}; //
if(typeof define==='function'&&define.amd){define('three',THREE);}else if('undefined'!==typeof exports&&'undefined'!==typeof module){module.exports=THREE;} // polyfills
if(self.requestAnimationFrame===undefined||self.cancelAnimationFrame===undefined){ // Missing in Android stock browser.
(function(){var lastTime=0;var vendors=['ms','moz','webkit','o'];for(var x=0;x<vendors.length&&!self.requestAnimationFrame;++x){self.requestAnimationFrame=self[vendors[x]+'RequestAnimationFrame'];self.cancelAnimationFrame=self[vendors[x]+'CancelAnimationFrame']||self[vendors[x]+'CancelRequestAnimationFrame'];}if(self.requestAnimationFrame===undefined&&self.setTimeout!==undefined){self.requestAnimationFrame=function(callback){var currTime=Date.now(),timeToCall=Math.max(0,16-(currTime-lastTime));var id=self.setTimeout(function(){callback(currTime+timeToCall);},timeToCall);lastTime=currTime+timeToCall;return id;};}if(self.cancelAnimationFrame===undefined&&self.clearTimeout!==undefined){self.cancelAnimationFrame=function(id){self.clearTimeout(id);};}})();} //
if(self.performance===undefined){self.performance={};}if(self.performance.now===undefined){(function(){var start=Date.now();self.performance.now=function(){return Date.now()-start;};})();} //
if(Number.EPSILON===undefined){Number.EPSILON=Math.pow(2,-52);} //
if(Math.sign===undefined){ // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign
Math.sign=function(x){return x<0?-1:x>0?1:+x;};}if(Function.prototype.name===undefined&&Object.defineProperty!==undefined){ // Missing in IE9-11.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name
Object.defineProperty(Function.prototype,'name',{get:function get(){return this.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];}});} // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent.button
THREE.MOUSE={LEFT:0,MIDDLE:1,RIGHT:2}; // GL STATE CONSTANTS
THREE.CullFaceNone=0;THREE.CullFaceBack=1;THREE.CullFaceFront=2;THREE.CullFaceFrontBack=3;THREE.FrontFaceDirectionCW=0;THREE.FrontFaceDirectionCCW=1; // SHADOWING TYPES
THREE.BasicShadowMap=0;THREE.PCFShadowMap=1;THREE.PCFSoftShadowMap=2; // MATERIAL CONSTANTS
// side
THREE.FrontSide=0;THREE.BackSide=1;THREE.DoubleSide=2; // shading
THREE.FlatShading=1;THREE.SmoothShading=2; // colors
THREE.NoColors=0;THREE.FaceColors=1;THREE.VertexColors=2; // blending modes
THREE.NoBlending=0;THREE.NormalBlending=1;THREE.AdditiveBlending=2;THREE.SubtractiveBlending=3;THREE.MultiplyBlending=4;THREE.CustomBlending=5; // custom blending equations
// (numbers start from 100 not to clash with other
// mappings to OpenGL constants defined in Texture.js)
THREE.AddEquation=100;THREE.SubtractEquation=101;THREE.ReverseSubtractEquation=102;THREE.MinEquation=103;THREE.MaxEquation=104; // custom blending destination factors
THREE.ZeroFactor=200;THREE.OneFactor=201;THREE.SrcColorFactor=202;THREE.OneMinusSrcColorFactor=203;THREE.SrcAlphaFactor=204;THREE.OneMinusSrcAlphaFactor=205;THREE.DstAlphaFactor=206;THREE.OneMinusDstAlphaFactor=207; // custom blending source factors
//THREE.ZeroFactor = 200;
//THREE.OneFactor = 201;
//THREE.SrcAlphaFactor = 204;
//THREE.OneMinusSrcAlphaFactor = 205;
//THREE.DstAlphaFactor = 206;
//THREE.OneMinusDstAlphaFactor = 207;
THREE.DstColorFactor=208;THREE.OneMinusDstColorFactor=209;THREE.SrcAlphaSaturateFactor=210; // depth modes
THREE.NeverDepth=0;THREE.AlwaysDepth=1;THREE.LessDepth=2;THREE.LessEqualDepth=3;THREE.EqualDepth=4;THREE.GreaterEqualDepth=5;THREE.GreaterDepth=6;THREE.NotEqualDepth=7; // TEXTURE CONSTANTS
THREE.MultiplyOperation=0;THREE.MixOperation=1;THREE.AddOperation=2; // Mapping modes
THREE.UVMapping=300;THREE.CubeReflectionMapping=301;THREE.CubeRefractionMapping=302;THREE.EquirectangularReflectionMapping=303;THREE.EquirectangularRefractionMapping=304;THREE.SphericalReflectionMapping=305; // Wrapping modes
THREE.RepeatWrapping=1000;THREE.ClampToEdgeWrapping=1001;THREE.MirroredRepeatWrapping=1002; // Filters
THREE.NearestFilter=1003;THREE.NearestMipMapNearestFilter=1004;THREE.NearestMipMapLinearFilter=1005;THREE.LinearFilter=1006;THREE.LinearMipMapNearestFilter=1007;THREE.LinearMipMapLinearFilter=1008; // Data types
THREE.UnsignedByteType=1009;THREE.ByteType=1010;THREE.ShortType=1011;THREE.UnsignedShortType=1012;THREE.IntType=1013;THREE.UnsignedIntType=1014;THREE.FloatType=1015;THREE.HalfFloatType=1025; // Pixel types
//THREE.UnsignedByteType = 1009;
THREE.UnsignedShort4444Type=1016;THREE.UnsignedShort5551Type=1017;THREE.UnsignedShort565Type=1018; // Pixel formats
THREE.AlphaFormat=1019;THREE.RGBFormat=1020;THREE.RGBAFormat=1021;THREE.LuminanceFormat=1022;THREE.LuminanceAlphaFormat=1023; // THREE.RGBEFormat handled as THREE.RGBAFormat in shaders
THREE.RGBEFormat=THREE.RGBAFormat; //1024;
// DDS / ST3C Compressed texture formats
THREE.RGB_S3TC_DXT1_Format=2001;THREE.RGBA_S3TC_DXT1_Format=2002;THREE.RGBA_S3TC_DXT3_Format=2003;THREE.RGBA_S3TC_DXT5_Format=2004; // PVRTC compressed texture formats
THREE.RGB_PVRTC_4BPPV1_Format=2100;THREE.RGB_PVRTC_2BPPV1_Format=2101;THREE.RGBA_PVRTC_4BPPV1_Format=2102;THREE.RGBA_PVRTC_2BPPV1_Format=2103; // Loop styles for AnimationAction
THREE.LoopOnce=2200;THREE.LoopRepeat=2201;THREE.LoopPingPong=2202; // DEPRECATED
THREE.Projector=function(){console.error('THREE.Projector has been moved to /examples/js/renderers/Projector.js.');this.projectVector=function(vector,camera){console.warn('THREE.Projector: .projectVector() is now vector.project().');vector.project(camera);};this.unprojectVector=function(vector,camera){console.warn('THREE.Projector: .unprojectVector() is now vector.unproject().');vector.unproject(camera);};this.pickingRay=function(vector,camera){console.error('THREE.Projector: .pickingRay() is now raycaster.setFromCamera().');};};THREE.CanvasRenderer=function(){console.error('THREE.CanvasRenderer has been moved to /examples/js/renderers/CanvasRenderer.js');this.domElement=document.createElement('canvas');this.clear=function(){};this.render=function(){};this.setClearColor=function(){};this.setSize=function(){};}; // File:src/math/Color.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.Color=function(color){if(arguments.length===3){return this.fromArray(arguments);}return this.set(color);};THREE.Color.prototype={constructor:THREE.Color,r:1,g:1,b:1,set:function set(value){if(value instanceof THREE.Color){this.copy(value);}else if(typeof value==='number'){this.setHex(value);}else if(typeof value==='string'){this.setStyle(value);}return this;},setHex:function setHex(hex){hex=Math.floor(hex);this.r=(hex>>16&255)/255;this.g=(hex>>8&255)/255;this.b=(hex&255)/255;return this;},setRGB:function setRGB(r,g,b){this.r=r;this.g=g;this.b=b;return this;},setHSL:function(){function hue2rgb(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*6*(2/3-t);return p;}return function(h,s,l){ // h,s,l ranges are in 0.0 - 1.0
h=THREE.Math.euclideanModulo(h,1);s=THREE.Math.clamp(s,0,1);l=THREE.Math.clamp(l,0,1);if(s===0){this.r=this.g=this.b=l;}else {var p=l<=0.5?l*(1+s):l+s-l*s;var q=2*l-p;this.r=hue2rgb(q,p,h+1/3);this.g=hue2rgb(q,p,h);this.b=hue2rgb(q,p,h-1/3);}return this;};}(),setStyle:function setStyle(style){function handleAlpha(string){if(string===undefined)return;if(parseFloat(string)<1){console.warn('THREE.Color: Alpha component of '+style+' will be ignored.');}}var m;if(m=/^((?:rgb|hsl)a?)\(\s*([^\)]*)\)/.exec(style)){ // rgb / hsl
var color;var name=m[1];var components=m[2];switch(name){case 'rgb':case 'rgba':if(color=/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components)){ // rgb(255,0,0) rgba(255,0,0,0.5)
this.r=Math.min(255,parseInt(color[1],10))/255;this.g=Math.min(255,parseInt(color[2],10))/255;this.b=Math.min(255,parseInt(color[3],10))/255;handleAlpha(color[5]);return this;}if(color=/^(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components)){ // rgb(100%,0%,0%) rgba(100%,0%,0%,0.5)
this.r=Math.min(100,parseInt(color[1],10))/100;this.g=Math.min(100,parseInt(color[2],10))/100;this.b=Math.min(100,parseInt(color[3],10))/100;handleAlpha(color[5]);return this;}break;case 'hsl':case 'hsla':if(color=/^([0-9]*\.?[0-9]+)\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components)){ // hsl(120,50%,50%) hsla(120,50%,50%,0.5)
var h=parseFloat(color[1])/360;var s=parseInt(color[2],10)/100;var l=parseInt(color[3],10)/100;handleAlpha(color[5]);return this.setHSL(h,s,l);}break;}}else if(m=/^\#([A-Fa-f0-9]+)$/.exec(style)){ // hex color
var hex=m[1];var size=hex.length;if(size===3){ // #ff0
this.r=parseInt(hex.charAt(0)+hex.charAt(0),16)/255;this.g=parseInt(hex.charAt(1)+hex.charAt(1),16)/255;this.b=parseInt(hex.charAt(2)+hex.charAt(2),16)/255;return this;}else if(size===6){ // #ff0000
this.r=parseInt(hex.charAt(0)+hex.charAt(1),16)/255;this.g=parseInt(hex.charAt(2)+hex.charAt(3),16)/255;this.b=parseInt(hex.charAt(4)+hex.charAt(5),16)/255;return this;}}if(style&&style.length>0){ // color keywords
var hex=THREE.ColorKeywords[style];if(hex!==undefined){ // red
this.setHex(hex);}else { // unknown color
console.warn('THREE.Color: Unknown color '+style);}}return this;},clone:function clone(){return new this.constructor(this.r,this.g,this.b);},copy:function copy(color){this.r=color.r;this.g=color.g;this.b=color.b;return this;},copyGammaToLinear:function copyGammaToLinear(color,gammaFactor){if(gammaFactor===undefined)gammaFactor=2.0;this.r=Math.pow(color.r,gammaFactor);this.g=Math.pow(color.g,gammaFactor);this.b=Math.pow(color.b,gammaFactor);return this;},copyLinearToGamma:function copyLinearToGamma(color,gammaFactor){if(gammaFactor===undefined)gammaFactor=2.0;var safeInverse=gammaFactor>0?1.0/gammaFactor:1.0;this.r=Math.pow(color.r,safeInverse);this.g=Math.pow(color.g,safeInverse);this.b=Math.pow(color.b,safeInverse);return this;},convertGammaToLinear:function convertGammaToLinear(){var r=this.r,g=this.g,b=this.b;this.r=r*r;this.g=g*g;this.b=b*b;return this;},convertLinearToGamma:function convertLinearToGamma(){this.r=Math.sqrt(this.r);this.g=Math.sqrt(this.g);this.b=Math.sqrt(this.b);return this;},getHex:function getHex(){return this.r*255<<16^this.g*255<<8^this.b*255<<0;},getHexString:function getHexString(){return ('000000'+this.getHex().toString(16)).slice(-6);},getHSL:function getHSL(optionalTarget){ // h,s,l ranges are in 0.0 - 1.0
var hsl=optionalTarget||{h:0,s:0,l:0};var r=this.r,g=this.g,b=this.b;var max=Math.max(r,g,b);var min=Math.min(r,g,b);var hue,saturation;var lightness=(min+max)/2.0;if(min===max){hue=0;saturation=0;}else {var delta=max-min;saturation=lightness<=0.5?delta/(max+min):delta/(2-max-min);switch(max){case r:hue=(g-b)/delta+(g<b?6:0);break;case g:hue=(b-r)/delta+2;break;case b:hue=(r-g)/delta+4;break;}hue/=6;}hsl.h=hue;hsl.s=saturation;hsl.l=lightness;return hsl;},getStyle:function getStyle(){return 'rgb('+(this.r*255|0)+','+(this.g*255|0)+','+(this.b*255|0)+')';},offsetHSL:function offsetHSL(h,s,l){var hsl=this.getHSL();hsl.h+=h;hsl.s+=s;hsl.l+=l;this.setHSL(hsl.h,hsl.s,hsl.l);return this;},add:function add(color){this.r+=color.r;this.g+=color.g;this.b+=color.b;return this;},addColors:function addColors(color1,color2){this.r=color1.r+color2.r;this.g=color1.g+color2.g;this.b=color1.b+color2.b;return this;},addScalar:function addScalar(s){this.r+=s;this.g+=s;this.b+=s;return this;},multiply:function multiply(color){this.r*=color.r;this.g*=color.g;this.b*=color.b;return this;},multiplyScalar:function multiplyScalar(s){this.r*=s;this.g*=s;this.b*=s;return this;},lerp:function lerp(color,alpha){this.r+=(color.r-this.r)*alpha;this.g+=(color.g-this.g)*alpha;this.b+=(color.b-this.b)*alpha;return this;},equals:function equals(c){return c.r===this.r&&c.g===this.g&&c.b===this.b;},fromArray:function fromArray(array,offset){if(offset===undefined)offset=0;this.r=array[offset];this.g=array[offset+1];this.b=array[offset+2];return this;},toArray:function toArray(array,offset){if(array===undefined)array=[];if(offset===undefined)offset=0;array[offset]=this.r;array[offset+1]=this.g;array[offset+2]=this.b;return array;}};THREE.ColorKeywords={'aliceblue':0xF0F8FF,'antiquewhite':0xFAEBD7,'aqua':0x00FFFF,'aquamarine':0x7FFFD4,'azure':0xF0FFFF,'beige':0xF5F5DC,'bisque':0xFFE4C4,'black':0x000000,'blanchedalmond':0xFFEBCD,'blue':0x0000FF,'blueviolet':0x8A2BE2,'brown':0xA52A2A,'burlywood':0xDEB887,'cadetblue':0x5F9EA0,'chartreuse':0x7FFF00,'chocolate':0xD2691E,'coral':0xFF7F50,'cornflowerblue':0x6495ED,'cornsilk':0xFFF8DC,'crimson':0xDC143C,'cyan':0x00FFFF,'darkblue':0x00008B,'darkcyan':0x008B8B,'darkgoldenrod':0xB8860B,'darkgray':0xA9A9A9,'darkgreen':0x006400,'darkgrey':0xA9A9A9,'darkkhaki':0xBDB76B,'darkmagenta':0x8B008B,'darkolivegreen':0x556B2F,'darkorange':0xFF8C00,'darkorchid':0x9932CC,'darkred':0x8B0000,'darksalmon':0xE9967A,'darkseagreen':0x8FBC8F,'darkslateblue':0x483D8B,'darkslategray':0x2F4F4F,'darkslategrey':0x2F4F4F,'darkturquoise':0x00CED1,'darkviolet':0x9400D3,'deeppink':0xFF1493,'deepskyblue':0x00BFFF,'dimgray':0x696969,'dimgrey':0x696969,'dodgerblue':0x1E90FF,'firebrick':0xB22222,'floralwhite':0xFFFAF0,'forestgreen':0x228B22,'fuchsia':0xFF00FF,'gainsboro':0xDCDCDC,'ghostwhite':0xF8F8FF,'gold':0xFFD700,'goldenrod':0xDAA520,'gray':0x808080,'green':0x008000,'greenyellow':0xADFF2F,'grey':0x808080,'honeydew':0xF0FFF0,'hotpink':0xFF69B4,'indianred':0xCD5C5C,'indigo':0x4B0082,'ivory':0xFFFFF0,'khaki':0xF0E68C,'lavender':0xE6E6FA,'lavenderblush':0xFFF0F5,'lawngreen':0x7CFC00,'lemonchiffon':0xFFFACD,'lightblue':0xADD8E6,'lightcoral':0xF08080,'lightcyan':0xE0FFFF,'lightgoldenrodyellow':0xFAFAD2,'lightgray':0xD3D3D3,'lightgreen':0x90EE90,'lightgrey':0xD3D3D3,'lightpink':0xFFB6C1,'lightsalmon':0xFFA07A,'lightseagreen':0x20B2AA,'lightskyblue':0x87CEFA,'lightslategray':0x778899,'lightslategrey':0x778899,'lightsteelblue':0xB0C4DE,'lightyellow':0xFFFFE0,'lime':0x00FF00,'limegreen':0x32CD32,'linen':0xFAF0E6,'magenta':0xFF00FF,'maroon':0x800000,'mediumaquamarine':0x66CDAA,'mediumblue':0x0000CD,'mediumorchid':0xBA55D3,'mediumpurple':0x9370DB,'mediumseagreen':0x3CB371,'mediumslateblue':0x7B68EE,'mediumspringgreen':0x00FA9A,'mediumturquoise':0x48D1CC,'mediumvioletred':0xC71585,'midnightblue':0x191970,'mintcream':0xF5FFFA,'mistyrose':0xFFE4E1,'moccasin':0xFFE4B5,'navajowhite':0xFFDEAD,'navy':0x000080,'oldlace':0xFDF5E6,'olive':0x808000,'olivedrab':0x6B8E23,'orange':0xFFA500,'orangered':0xFF4500,'orchid':0xDA70D6,'palegoldenrod':0xEEE8AA,'palegreen':0x98FB98,'paleturquoise':0xAFEEEE,'palevioletred':0xDB7093,'papayawhip':0xFFEFD5,'peachpuff':0xFFDAB9,'peru':0xCD853F,'pink':0xFFC0CB,'plum':0xDDA0DD,'powderblue':0xB0E0E6,'purple':0x800080,'red':0xFF0000,'rosybrown':0xBC8F8F,'royalblue':0x4169E1,'saddlebrown':0x8B4513,'salmon':0xFA8072,'sandybrown':0xF4A460,'seagreen':0x2E8B57,'seashell':0xFFF5EE,'sienna':0xA0522D,'silver':0xC0C0C0,'skyblue':0x87CEEB,'slateblue':0x6A5ACD,'slategray':0x708090,'slategrey':0x708090,'snow':0xFFFAFA,'springgreen':0x00FF7F,'steelblue':0x4682B4,'tan':0xD2B48C,'teal':0x008080,'thistle':0xD8BFD8,'tomato':0xFF6347,'turquoise':0x40E0D0,'violet':0xEE82EE,'wheat':0xF5DEB3,'white':0xFFFFFF,'whitesmoke':0xF5F5F5,'yellow':0xFFFF00,'yellowgreen':0x9ACD32}; // File:src/math/Quaternion.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author bhouston / http://clara.io
 */THREE.Quaternion=function(x,y,z,w){this._x=x||0;this._y=y||0;this._z=z||0;this._w=w!==undefined?w:1;};THREE.Quaternion.prototype={constructor:THREE.Quaternion,get x(){return this._x;},set x(value){this._x=value;this.onChangeCallback();},get y(){return this._y;},set y(value){this._y=value;this.onChangeCallback();},get z(){return this._z;},set z(value){this._z=value;this.onChangeCallback();},get w(){return this._w;},set w(value){this._w=value;this.onChangeCallback();},set:function set(x,y,z,w){this._x=x;this._y=y;this._z=z;this._w=w;this.onChangeCallback();return this;},clone:function clone(){return new this.constructor(this._x,this._y,this._z,this._w);},copy:function copy(quaternion){this._x=quaternion.x;this._y=quaternion.y;this._z=quaternion.z;this._w=quaternion.w;this.onChangeCallback();return this;},setFromEuler:function setFromEuler(euler,update){if(euler instanceof THREE.Euler===false){throw new Error('THREE.Quaternion: .setFromEuler() now expects a Euler rotation rather than a Vector3 and order.');} // http://www.mathworks.com/matlabcentral/fileexchange/
// 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
//	content/SpinCalc.m
var c1=Math.cos(euler._x/2);var c2=Math.cos(euler._y/2);var c3=Math.cos(euler._z/2);var s1=Math.sin(euler._x/2);var s2=Math.sin(euler._y/2);var s3=Math.sin(euler._z/2);var order=euler.order;if(order==='XYZ'){this._x=s1*c2*c3+c1*s2*s3;this._y=c1*s2*c3-s1*c2*s3;this._z=c1*c2*s3+s1*s2*c3;this._w=c1*c2*c3-s1*s2*s3;}else if(order==='YXZ'){this._x=s1*c2*c3+c1*s2*s3;this._y=c1*s2*c3-s1*c2*s3;this._z=c1*c2*s3-s1*s2*c3;this._w=c1*c2*c3+s1*s2*s3;}else if(order==='ZXY'){this._x=s1*c2*c3-c1*s2*s3;this._y=c1*s2*c3+s1*c2*s3;this._z=c1*c2*s3+s1*s2*c3;this._w=c1*c2*c3-s1*s2*s3;}else if(order==='ZYX'){this._x=s1*c2*c3-c1*s2*s3;this._y=c1*s2*c3+s1*c2*s3;this._z=c1*c2*s3-s1*s2*c3;this._w=c1*c2*c3+s1*s2*s3;}else if(order==='YZX'){this._x=s1*c2*c3+c1*s2*s3;this._y=c1*s2*c3+s1*c2*s3;this._z=c1*c2*s3-s1*s2*c3;this._w=c1*c2*c3-s1*s2*s3;}else if(order==='XZY'){this._x=s1*c2*c3-c1*s2*s3;this._y=c1*s2*c3-s1*c2*s3;this._z=c1*c2*s3+s1*s2*c3;this._w=c1*c2*c3+s1*s2*s3;}if(update!==false)this.onChangeCallback();return this;},setFromAxisAngle:function setFromAxisAngle(axis,angle){ // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
// assumes axis is normalized
var halfAngle=angle/2,s=Math.sin(halfAngle);this._x=axis.x*s;this._y=axis.y*s;this._z=axis.z*s;this._w=Math.cos(halfAngle);this.onChangeCallback();return this;},setFromRotationMatrix:function setFromRotationMatrix(m){ // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
var te=m.elements,m11=te[0],m12=te[4],m13=te[8],m21=te[1],m22=te[5],m23=te[9],m31=te[2],m32=te[6],m33=te[10],trace=m11+m22+m33,s;if(trace>0){s=0.5/Math.sqrt(trace+1.0);this._w=0.25/s;this._x=(m32-m23)*s;this._y=(m13-m31)*s;this._z=(m21-m12)*s;}else if(m11>m22&&m11>m33){s=2.0*Math.sqrt(1.0+m11-m22-m33);this._w=(m32-m23)/s;this._x=0.25*s;this._y=(m12+m21)/s;this._z=(m13+m31)/s;}else if(m22>m33){s=2.0*Math.sqrt(1.0+m22-m11-m33);this._w=(m13-m31)/s;this._x=(m12+m21)/s;this._y=0.25*s;this._z=(m23+m32)/s;}else {s=2.0*Math.sqrt(1.0+m33-m11-m22);this._w=(m21-m12)/s;this._x=(m13+m31)/s;this._y=(m23+m32)/s;this._z=0.25*s;}this.onChangeCallback();return this;},setFromUnitVectors:function(){ // http://lolengine.net/blog/2014/02/24/quaternion-from-two-vectors-final
// assumes direction vectors vFrom and vTo are normalized
var v1,r;var EPS=0.000001;return function(vFrom,vTo){if(v1===undefined)v1=new THREE.Vector3();r=vFrom.dot(vTo)+1;if(r<EPS){r=0;if(Math.abs(vFrom.x)>Math.abs(vFrom.z)){v1.set(-vFrom.y,vFrom.x,0);}else {v1.set(0,-vFrom.z,vFrom.y);}}else {v1.crossVectors(vFrom,vTo);}this._x=v1.x;this._y=v1.y;this._z=v1.z;this._w=r;this.normalize();return this;};}(),inverse:function inverse(){this.conjugate().normalize();return this;},conjugate:function conjugate(){this._x*=-1;this._y*=-1;this._z*=-1;this.onChangeCallback();return this;},dot:function dot(v){return this._x*v._x+this._y*v._y+this._z*v._z+this._w*v._w;},lengthSq:function lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w;},length:function length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w);},normalize:function normalize(){var l=this.length();if(l===0){this._x=0;this._y=0;this._z=0;this._w=1;}else {l=1/l;this._x=this._x*l;this._y=this._y*l;this._z=this._z*l;this._w=this._w*l;}this.onChangeCallback();return this;},multiply:function multiply(q,p){if(p!==undefined){console.warn('THREE.Quaternion: .multiply() now only accepts one argument. Use .multiplyQuaternions( a, b ) instead.');return this.multiplyQuaternions(q,p);}return this.multiplyQuaternions(this,q);},multiplyQuaternions:function multiplyQuaternions(a,b){ // from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm
var qax=a._x,qay=a._y,qaz=a._z,qaw=a._w;var qbx=b._x,qby=b._y,qbz=b._z,qbw=b._w;this._x=qax*qbw+qaw*qbx+qay*qbz-qaz*qby;this._y=qay*qbw+qaw*qby+qaz*qbx-qax*qbz;this._z=qaz*qbw+qaw*qbz+qax*qby-qay*qbx;this._w=qaw*qbw-qax*qbx-qay*qby-qaz*qbz;this.onChangeCallback();return this;},multiplyVector3:function multiplyVector3(vector){console.warn('THREE.Quaternion: .multiplyVector3() has been removed. Use is now vector.applyQuaternion( quaternion ) instead.');return vector.applyQuaternion(this);},slerp:function slerp(qb,t){if(t===0)return this;if(t===1)return this.copy(qb);var x=this._x,y=this._y,z=this._z,w=this._w; // http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/
var cosHalfTheta=w*qb._w+x*qb._x+y*qb._y+z*qb._z;if(cosHalfTheta<0){this._w=-qb._w;this._x=-qb._x;this._y=-qb._y;this._z=-qb._z;cosHalfTheta=-cosHalfTheta;}else {this.copy(qb);}if(cosHalfTheta>=1.0){this._w=w;this._x=x;this._y=y;this._z=z;return this;}var halfTheta=Math.acos(cosHalfTheta);var sinHalfTheta=Math.sqrt(1.0-cosHalfTheta*cosHalfTheta);if(Math.abs(sinHalfTheta)<0.001){this._w=0.5*(w+this._w);this._x=0.5*(x+this._x);this._y=0.5*(y+this._y);this._z=0.5*(z+this._z);return this;}var ratioA=Math.sin((1-t)*halfTheta)/sinHalfTheta,ratioB=Math.sin(t*halfTheta)/sinHalfTheta;this._w=w*ratioA+this._w*ratioB;this._x=x*ratioA+this._x*ratioB;this._y=y*ratioA+this._y*ratioB;this._z=z*ratioA+this._z*ratioB;this.onChangeCallback();return this;},equals:function equals(quaternion){return quaternion._x===this._x&&quaternion._y===this._y&&quaternion._z===this._z&&quaternion._w===this._w;},fromArray:function fromArray(array,offset){if(offset===undefined)offset=0;this._x=array[offset];this._y=array[offset+1];this._z=array[offset+2];this._w=array[offset+3];this.onChangeCallback();return this;},toArray:function toArray(array,offset){if(array===undefined)array=[];if(offset===undefined)offset=0;array[offset]=this._x;array[offset+1]=this._y;array[offset+2]=this._z;array[offset+3]=this._w;return array;},onChange:function onChange(callback){this.onChangeCallback=callback;return this;},onChangeCallback:function onChangeCallback(){}};THREE.Quaternion.slerp=function(qa,qb,qm,t){return qm.copy(qa).slerp(qb,t);}; // File:src/math/Vector2.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author philogb / http://blog.thejit.org/
 * @author egraether / http://egraether.com/
 * @author zz85 / http://www.lab4games.net/zz85/blog
 */THREE.Vector2=function(x,y){this.x=x||0;this.y=y||0;};THREE.Vector2.prototype={constructor:THREE.Vector2,get width(){return this.x;},set width(value){this.x=value;},get height(){return this.y;},set height(value){this.y=value;}, //
set:function set(x,y){this.x=x;this.y=y;return this;},setX:function setX(x){this.x=x;return this;},setY:function setY(y){this.y=y;return this;},setComponent:function setComponent(index,value){switch(index){case 0:this.x=value;break;case 1:this.y=value;break;default:throw new Error('index is out of range: '+index);}},getComponent:function getComponent(index){switch(index){case 0:return this.x;case 1:return this.y;default:throw new Error('index is out of range: '+index);}},clone:function clone(){return new this.constructor(this.x,this.y);},copy:function copy(v){this.x=v.x;this.y=v.y;return this;},add:function add(v,w){if(w!==undefined){console.warn('THREE.Vector2: .add() now only accepts one argument. Use .addVectors( a, b ) instead.');return this.addVectors(v,w);}this.x+=v.x;this.y+=v.y;return this;},addScalar:function addScalar(s){this.x+=s;this.y+=s;return this;},addVectors:function addVectors(a,b){this.x=a.x+b.x;this.y=a.y+b.y;return this;},addScaledVector:function addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;return this;},sub:function sub(v,w){if(w!==undefined){console.warn('THREE.Vector2: .sub() now only accepts one argument. Use .subVectors( a, b ) instead.');return this.subVectors(v,w);}this.x-=v.x;this.y-=v.y;return this;},subScalar:function subScalar(s){this.x-=s;this.y-=s;return this;},subVectors:function subVectors(a,b){this.x=a.x-b.x;this.y=a.y-b.y;return this;},multiply:function multiply(v){this.x*=v.x;this.y*=v.y;return this;},multiplyScalar:function multiplyScalar(scalar){if(isFinite(scalar)){this.x*=scalar;this.y*=scalar;}else {this.x=0;this.y=0;}return this;},divide:function divide(v){this.x/=v.x;this.y/=v.y;return this;},divideScalar:function divideScalar(scalar){return this.multiplyScalar(1/scalar);},min:function min(v){this.x=Math.min(this.x,v.x);this.y=Math.min(this.y,v.y);return this;},max:function max(v){this.x=Math.max(this.x,v.x);this.y=Math.max(this.y,v.y);return this;},clamp:function clamp(min,max){ // This function assumes min < max, if this assumption isn't true it will not operate correctly
this.x=Math.max(min.x,Math.min(max.x,this.x));this.y=Math.max(min.y,Math.min(max.y,this.y));return this;},clampScalar:function(){var min,max;return function clampScalar(minVal,maxVal){if(min===undefined){min=new THREE.Vector2();max=new THREE.Vector2();}min.set(minVal,minVal);max.set(maxVal,maxVal);return this.clamp(min,max);};}(),clampLength:function clampLength(min,max){var length=this.length();this.multiplyScalar(Math.max(min,Math.min(max,length))/length);return this;},floor:function floor(){this.x=Math.floor(this.x);this.y=Math.floor(this.y);return this;},ceil:function ceil(){this.x=Math.ceil(this.x);this.y=Math.ceil(this.y);return this;},round:function round(){this.x=Math.round(this.x);this.y=Math.round(this.y);return this;},roundToZero:function roundToZero(){this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x);this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y);return this;},negate:function negate(){this.x=-this.x;this.y=-this.y;return this;},dot:function dot(v){return this.x*v.x+this.y*v.y;},lengthSq:function lengthSq(){return this.x*this.x+this.y*this.y;},length:function length(){return Math.sqrt(this.x*this.x+this.y*this.y);},lengthManhattan:function lengthManhattan(){return Math.abs(this.x)+Math.abs(this.y);},normalize:function normalize(){return this.divideScalar(this.length());},distanceTo:function distanceTo(v){return Math.sqrt(this.distanceToSquared(v));},distanceToSquared:function distanceToSquared(v){var dx=this.x-v.x,dy=this.y-v.y;return dx*dx+dy*dy;},setLength:function setLength(length){return this.multiplyScalar(length/this.length());},lerp:function lerp(v,alpha){this.x+=(v.x-this.x)*alpha;this.y+=(v.y-this.y)*alpha;return this;},lerpVectors:function lerpVectors(v1,v2,alpha){this.subVectors(v2,v1).multiplyScalar(alpha).add(v1);return this;},equals:function equals(v){return v.x===this.x&&v.y===this.y;},fromArray:function fromArray(array,offset){if(offset===undefined)offset=0;this.x=array[offset];this.y=array[offset+1];return this;},toArray:function toArray(array,offset){if(array===undefined)array=[];if(offset===undefined)offset=0;array[offset]=this.x;array[offset+1]=this.y;return array;},fromAttribute:function fromAttribute(attribute,index,offset){if(offset===undefined)offset=0;index=index*attribute.itemSize+offset;this.x=attribute.array[index];this.y=attribute.array[index+1];return this;},rotateAround:function rotateAround(center,angle){var c=Math.cos(angle),s=Math.sin(angle);var x=this.x-center.x;var y=this.y-center.y;this.x=x*c-y*s+center.x;this.y=x*s+y*c+center.y;return this;}}; // File:src/math/Vector3.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author *kile / http://kile.stravaganza.org/
 * @author philogb / http://blog.thejit.org/
 * @author mikael emtinger / http://gomo.se/
 * @author egraether / http://egraether.com/
 * @author WestLangley / http://github.com/WestLangley
 */THREE.Vector3=function(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;};THREE.Vector3.prototype={constructor:THREE.Vector3,set:function set(x,y,z){this.x=x;this.y=y;this.z=z;return this;},setX:function setX(x){this.x=x;return this;},setY:function setY(y){this.y=y;return this;},setZ:function setZ(z){this.z=z;return this;},setComponent:function setComponent(index,value){switch(index){case 0:this.x=value;break;case 1:this.y=value;break;case 2:this.z=value;break;default:throw new Error('index is out of range: '+index);}},getComponent:function getComponent(index){switch(index){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error('index is out of range: '+index);}},clone:function clone(){return new this.constructor(this.x,this.y,this.z);},copy:function copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;},add:function add(v,w){if(w!==undefined){console.warn('THREE.Vector3: .add() now only accepts one argument. Use .addVectors( a, b ) instead.');return this.addVectors(v,w);}this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;},addScalar:function addScalar(s){this.x+=s;this.y+=s;this.z+=s;return this;},addVectors:function addVectors(a,b){this.x=a.x+b.x;this.y=a.y+b.y;this.z=a.z+b.z;return this;},addScaledVector:function addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;},sub:function sub(v,w){if(w!==undefined){console.warn('THREE.Vector3: .sub() now only accepts one argument. Use .subVectors( a, b ) instead.');return this.subVectors(v,w);}this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;},subScalar:function subScalar(s){this.x-=s;this.y-=s;this.z-=s;return this;},subVectors:function subVectors(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;return this;},multiply:function multiply(v,w){if(w!==undefined){console.warn('THREE.Vector3: .multiply() now only accepts one argument. Use .multiplyVectors( a, b ) instead.');return this.multiplyVectors(v,w);}this.x*=v.x;this.y*=v.y;this.z*=v.z;return this;},multiplyScalar:function multiplyScalar(scalar){if(isFinite(scalar)){this.x*=scalar;this.y*=scalar;this.z*=scalar;}else {this.x=0;this.y=0;this.z=0;}return this;},multiplyVectors:function multiplyVectors(a,b){this.x=a.x*b.x;this.y=a.y*b.y;this.z=a.z*b.z;return this;},applyEuler:function(){var quaternion;return function applyEuler(euler){if(euler instanceof THREE.Euler===false){console.error('THREE.Vector3: .applyEuler() now expects a Euler rotation rather than a Vector3 and order.');}if(quaternion===undefined)quaternion=new THREE.Quaternion();this.applyQuaternion(quaternion.setFromEuler(euler));return this;};}(),applyAxisAngle:function(){var quaternion;return function applyAxisAngle(axis,angle){if(quaternion===undefined)quaternion=new THREE.Quaternion();this.applyQuaternion(quaternion.setFromAxisAngle(axis,angle));return this;};}(),applyMatrix3:function applyMatrix3(m){var x=this.x;var y=this.y;var z=this.z;var e=m.elements;this.x=e[0]*x+e[3]*y+e[6]*z;this.y=e[1]*x+e[4]*y+e[7]*z;this.z=e[2]*x+e[5]*y+e[8]*z;return this;},applyMatrix4:function applyMatrix4(m){ // input: THREE.Matrix4 affine matrix
var x=this.x,y=this.y,z=this.z;var e=m.elements;this.x=e[0]*x+e[4]*y+e[8]*z+e[12];this.y=e[1]*x+e[5]*y+e[9]*z+e[13];this.z=e[2]*x+e[6]*y+e[10]*z+e[14];return this;},applyProjection:function applyProjection(m){ // input: THREE.Matrix4 projection matrix
var x=this.x,y=this.y,z=this.z;var e=m.elements;var d=1/(e[3]*x+e[7]*y+e[11]*z+e[15]); // perspective divide
this.x=(e[0]*x+e[4]*y+e[8]*z+e[12])*d;this.y=(e[1]*x+e[5]*y+e[9]*z+e[13])*d;this.z=(e[2]*x+e[6]*y+e[10]*z+e[14])*d;return this;},applyQuaternion:function applyQuaternion(q){var x=this.x;var y=this.y;var z=this.z;var qx=q.x;var qy=q.y;var qz=q.z;var qw=q.w; // calculate quat * vector
var ix=qw*x+qy*z-qz*y;var iy=qw*y+qz*x-qx*z;var iz=qw*z+qx*y-qy*x;var iw=-qx*x-qy*y-qz*z; // calculate result * inverse quat
this.x=ix*qw+iw*-qx+iy*-qz-iz*-qy;this.y=iy*qw+iw*-qy+iz*-qx-ix*-qz;this.z=iz*qw+iw*-qz+ix*-qy-iy*-qx;return this;},project:function(){var matrix;return function project(camera){if(matrix===undefined)matrix=new THREE.Matrix4();matrix.multiplyMatrices(camera.projectionMatrix,matrix.getInverse(camera.matrixWorld));return this.applyProjection(matrix);};}(),unproject:function(){var matrix;return function unproject(camera){if(matrix===undefined)matrix=new THREE.Matrix4();matrix.multiplyMatrices(camera.matrixWorld,matrix.getInverse(camera.projectionMatrix));return this.applyProjection(matrix);};}(),transformDirection:function transformDirection(m){ // input: THREE.Matrix4 affine matrix
// vector interpreted as a direction
var x=this.x,y=this.y,z=this.z;var e=m.elements;this.x=e[0]*x+e[4]*y+e[8]*z;this.y=e[1]*x+e[5]*y+e[9]*z;this.z=e[2]*x+e[6]*y+e[10]*z;this.normalize();return this;},divide:function divide(v){this.x/=v.x;this.y/=v.y;this.z/=v.z;return this;},divideScalar:function divideScalar(scalar){return this.multiplyScalar(1/scalar);},min:function min(v){this.x=Math.min(this.x,v.x);this.y=Math.min(this.y,v.y);this.z=Math.min(this.z,v.z);return this;},max:function max(v){this.x=Math.max(this.x,v.x);this.y=Math.max(this.y,v.y);this.z=Math.max(this.z,v.z);return this;},clamp:function clamp(min,max){ // This function assumes min < max, if this assumption isn't true it will not operate correctly
this.x=Math.max(min.x,Math.min(max.x,this.x));this.y=Math.max(min.y,Math.min(max.y,this.y));this.z=Math.max(min.z,Math.min(max.z,this.z));return this;},clampScalar:function(){var min,max;return function clampScalar(minVal,maxVal){if(min===undefined){min=new THREE.Vector3();max=new THREE.Vector3();}min.set(minVal,minVal,minVal);max.set(maxVal,maxVal,maxVal);return this.clamp(min,max);};}(),clampLength:function clampLength(min,max){var length=this.length();this.multiplyScalar(Math.max(min,Math.min(max,length))/length);return this;},floor:function floor(){this.x=Math.floor(this.x);this.y=Math.floor(this.y);this.z=Math.floor(this.z);return this;},ceil:function ceil(){this.x=Math.ceil(this.x);this.y=Math.ceil(this.y);this.z=Math.ceil(this.z);return this;},round:function round(){this.x=Math.round(this.x);this.y=Math.round(this.y);this.z=Math.round(this.z);return this;},roundToZero:function roundToZero(){this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x);this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y);this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z);return this;},negate:function negate(){this.x=-this.x;this.y=-this.y;this.z=-this.z;return this;},dot:function dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;},lengthSq:function lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z;},length:function length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);},lengthManhattan:function lengthManhattan(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z);},normalize:function normalize(){return this.divideScalar(this.length());},setLength:function setLength(length){return this.multiplyScalar(length/this.length());},lerp:function lerp(v,alpha){this.x+=(v.x-this.x)*alpha;this.y+=(v.y-this.y)*alpha;this.z+=(v.z-this.z)*alpha;return this;},lerpVectors:function lerpVectors(v1,v2,alpha){this.subVectors(v2,v1).multiplyScalar(alpha).add(v1);return this;},cross:function cross(v,w){if(w!==undefined){console.warn('THREE.Vector3: .cross() now only accepts one argument. Use .crossVectors( a, b ) instead.');return this.crossVectors(v,w);}var x=this.x,y=this.y,z=this.z;this.x=y*v.z-z*v.y;this.y=z*v.x-x*v.z;this.z=x*v.y-y*v.x;return this;},crossVectors:function crossVectors(a,b){var ax=a.x,ay=a.y,az=a.z;var bx=b.x,by=b.y,bz=b.z;this.x=ay*bz-az*by;this.y=az*bx-ax*bz;this.z=ax*by-ay*bx;return this;},projectOnVector:function(){var v1,dot;return function projectOnVector(vector){if(v1===undefined)v1=new THREE.Vector3();v1.copy(vector).normalize();dot=this.dot(v1);return this.copy(v1).multiplyScalar(dot);};}(),projectOnPlane:function(){var v1;return function projectOnPlane(planeNormal){if(v1===undefined)v1=new THREE.Vector3();v1.copy(this).projectOnVector(planeNormal);return this.sub(v1);};}(),reflect:function(){ // reflect incident vector off plane orthogonal to normal
// normal is assumed to have unit length
var v1;return function reflect(normal){if(v1===undefined)v1=new THREE.Vector3();return this.sub(v1.copy(normal).multiplyScalar(2*this.dot(normal)));};}(),angleTo:function angleTo(v){var theta=this.dot(v)/(this.length()*v.length()); // clamp, to handle numerical problems
return Math.acos(THREE.Math.clamp(theta,-1,1));},distanceTo:function distanceTo(v){return Math.sqrt(this.distanceToSquared(v));},distanceToSquared:function distanceToSquared(v){var dx=this.x-v.x;var dy=this.y-v.y;var dz=this.z-v.z;return dx*dx+dy*dy+dz*dz;},setEulerFromRotationMatrix:function setEulerFromRotationMatrix(m,order){console.error('THREE.Vector3: .setEulerFromRotationMatrix() has been removed. Use Euler.setFromRotationMatrix() instead.');},setEulerFromQuaternion:function setEulerFromQuaternion(q,order){console.error('THREE.Vector3: .setEulerFromQuaternion() has been removed. Use Euler.setFromQuaternion() instead.');},getPositionFromMatrix:function getPositionFromMatrix(m){console.warn('THREE.Vector3: .getPositionFromMatrix() has been renamed to .setFromMatrixPosition().');return this.setFromMatrixPosition(m);},getScaleFromMatrix:function getScaleFromMatrix(m){console.warn('THREE.Vector3: .getScaleFromMatrix() has been renamed to .setFromMatrixScale().');return this.setFromMatrixScale(m);},getColumnFromMatrix:function getColumnFromMatrix(index,matrix){console.warn('THREE.Vector3: .getColumnFromMatrix() has been renamed to .setFromMatrixColumn().');return this.setFromMatrixColumn(index,matrix);},setFromMatrixPosition:function setFromMatrixPosition(m){this.x=m.elements[12];this.y=m.elements[13];this.z=m.elements[14];return this;},setFromMatrixScale:function setFromMatrixScale(m){var sx=this.set(m.elements[0],m.elements[1],m.elements[2]).length();var sy=this.set(m.elements[4],m.elements[5],m.elements[6]).length();var sz=this.set(m.elements[8],m.elements[9],m.elements[10]).length();this.x=sx;this.y=sy;this.z=sz;return this;},setFromMatrixColumn:function setFromMatrixColumn(index,matrix){var offset=index*4;var me=matrix.elements;this.x=me[offset];this.y=me[offset+1];this.z=me[offset+2];return this;},equals:function equals(v){return v.x===this.x&&v.y===this.y&&v.z===this.z;},fromArray:function fromArray(array,offset){if(offset===undefined)offset=0;this.x=array[offset];this.y=array[offset+1];this.z=array[offset+2];return this;},toArray:function toArray(array,offset){if(array===undefined)array=[];if(offset===undefined)offset=0;array[offset]=this.x;array[offset+1]=this.y;array[offset+2]=this.z;return array;},fromAttribute:function fromAttribute(attribute,index,offset){if(offset===undefined)offset=0;index=index*attribute.itemSize+offset;this.x=attribute.array[index];this.y=attribute.array[index+1];this.z=attribute.array[index+2];return this;}}; // File:src/math/Vector4.js
/**
 * @author supereggbert / http://www.paulbrunt.co.uk/
 * @author philogb / http://blog.thejit.org/
 * @author mikael emtinger / http://gomo.se/
 * @author egraether / http://egraether.com/
 * @author WestLangley / http://github.com/WestLangley
 */THREE.Vector4=function(x,y,z,w){this.x=x||0;this.y=y||0;this.z=z||0;this.w=w!==undefined?w:1;};THREE.Vector4.prototype={constructor:THREE.Vector4,set:function set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this;},setX:function setX(x){this.x=x;return this;},setY:function setY(y){this.y=y;return this;},setZ:function setZ(z){this.z=z;return this;},setW:function setW(w){this.w=w;return this;},setComponent:function setComponent(index,value){switch(index){case 0:this.x=value;break;case 1:this.y=value;break;case 2:this.z=value;break;case 3:this.w=value;break;default:throw new Error('index is out of range: '+index);}},getComponent:function getComponent(index){switch(index){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error('index is out of range: '+index);}},clone:function clone(){return new this.constructor(this.x,this.y,this.z,this.w);},copy:function copy(v){this.x=v.x;this.y=v.y;this.z=v.z;this.w=v.w!==undefined?v.w:1;return this;},add:function add(v,w){if(w!==undefined){console.warn('THREE.Vector4: .add() now only accepts one argument. Use .addVectors( a, b ) instead.');return this.addVectors(v,w);}this.x+=v.x;this.y+=v.y;this.z+=v.z;this.w+=v.w;return this;},addScalar:function addScalar(s){this.x+=s;this.y+=s;this.z+=s;this.w+=s;return this;},addVectors:function addVectors(a,b){this.x=a.x+b.x;this.y=a.y+b.y;this.z=a.z+b.z;this.w=a.w+b.w;return this;},addScaledVector:function addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;this.w+=v.w*s;return this;},sub:function sub(v,w){if(w!==undefined){console.warn('THREE.Vector4: .sub() now only accepts one argument. Use .subVectors( a, b ) instead.');return this.subVectors(v,w);}this.x-=v.x;this.y-=v.y;this.z-=v.z;this.w-=v.w;return this;},subScalar:function subScalar(s){this.x-=s;this.y-=s;this.z-=s;this.w-=s;return this;},subVectors:function subVectors(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;this.w=a.w-b.w;return this;},multiplyScalar:function multiplyScalar(scalar){if(isFinite(scalar)){this.x*=scalar;this.y*=scalar;this.z*=scalar;this.w*=scalar;}else {this.x=0;this.y=0;this.z=0;this.w=0;}return this;},applyMatrix4:function applyMatrix4(m){var x=this.x;var y=this.y;var z=this.z;var w=this.w;var e=m.elements;this.x=e[0]*x+e[4]*y+e[8]*z+e[12]*w;this.y=e[1]*x+e[5]*y+e[9]*z+e[13]*w;this.z=e[2]*x+e[6]*y+e[10]*z+e[14]*w;this.w=e[3]*x+e[7]*y+e[11]*z+e[15]*w;return this;},divideScalar:function divideScalar(scalar){return this.multiplyScalar(1/scalar);},setAxisAngleFromQuaternion:function setAxisAngleFromQuaternion(q){ // http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/index.htm
// q is assumed to be normalized
this.w=2*Math.acos(q.w);var s=Math.sqrt(1-q.w*q.w);if(s<0.0001){this.x=1;this.y=0;this.z=0;}else {this.x=q.x/s;this.y=q.y/s;this.z=q.z/s;}return this;},setAxisAngleFromRotationMatrix:function setAxisAngleFromRotationMatrix(m){ // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToAngle/index.htm
// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
var angle,x,y,z, // variables for result
epsilon=0.01, // margin to allow for rounding errors
epsilon2=0.1, // margin to distinguish between 0 and 180 degrees
te=m.elements,m11=te[0],m12=te[4],m13=te[8],m21=te[1],m22=te[5],m23=te[9],m31=te[2],m32=te[6],m33=te[10];if(Math.abs(m12-m21)<epsilon&&Math.abs(m13-m31)<epsilon&&Math.abs(m23-m32)<epsilon){ // singularity found
// first check for identity matrix which must have +1 for all terms
// in leading diagonal and zero in other terms
if(Math.abs(m12+m21)<epsilon2&&Math.abs(m13+m31)<epsilon2&&Math.abs(m23+m32)<epsilon2&&Math.abs(m11+m22+m33-3)<epsilon2){ // this singularity is identity matrix so angle = 0
this.set(1,0,0,0);return this; // zero angle, arbitrary axis
} // otherwise this singularity is angle = 180
angle=Math.PI;var xx=(m11+1)/2;var yy=(m22+1)/2;var zz=(m33+1)/2;var xy=(m12+m21)/4;var xz=(m13+m31)/4;var yz=(m23+m32)/4;if(xx>yy&&xx>zz){ // m11 is the largest diagonal term
if(xx<epsilon){x=0;y=0.707106781;z=0.707106781;}else {x=Math.sqrt(xx);y=xy/x;z=xz/x;}}else if(yy>zz){ // m22 is the largest diagonal term
if(yy<epsilon){x=0.707106781;y=0;z=0.707106781;}else {y=Math.sqrt(yy);x=xy/y;z=yz/y;}}else { // m33 is the largest diagonal term so base result on this
if(zz<epsilon){x=0.707106781;y=0.707106781;z=0;}else {z=Math.sqrt(zz);x=xz/z;y=yz/z;}}this.set(x,y,z,angle);return this; // return 180 deg rotation
} // as we have reached here there are no singularities so we can handle normally
var s=Math.sqrt((m32-m23)*(m32-m23)+(m13-m31)*(m13-m31)+(m21-m12)*(m21-m12)); // used to normalize
if(Math.abs(s)<0.001)s=1; // prevent divide by zero, should not happen if matrix is orthogonal and should be
// caught by singularity test above, but I've left it in just in case
this.x=(m32-m23)/s;this.y=(m13-m31)/s;this.z=(m21-m12)/s;this.w=Math.acos((m11+m22+m33-1)/2);return this;},min:function min(v){this.x=Math.min(this.x,v.x);this.y=Math.min(this.y,v.y);this.z=Math.min(this.z,v.z);this.w=Math.min(this.w,v.w);return this;},max:function max(v){this.x=Math.max(this.x,v.x);this.y=Math.max(this.y,v.y);this.z=Math.max(this.z,v.z);this.w=Math.max(this.w,v.w);return this;},clamp:function clamp(min,max){ // This function assumes min < max, if this assumption isn't true it will not operate correctly
this.x=Math.max(min.x,Math.min(max.x,this.x));this.y=Math.max(min.y,Math.min(max.y,this.y));this.z=Math.max(min.z,Math.min(max.z,this.z));this.w=Math.max(min.w,Math.min(max.w,this.w));return this;},clampScalar:function(){var min,max;return function clampScalar(minVal,maxVal){if(min===undefined){min=new THREE.Vector4();max=new THREE.Vector4();}min.set(minVal,minVal,minVal,minVal);max.set(maxVal,maxVal,maxVal,maxVal);return this.clamp(min,max);};}(),floor:function floor(){this.x=Math.floor(this.x);this.y=Math.floor(this.y);this.z=Math.floor(this.z);this.w=Math.floor(this.w);return this;},ceil:function ceil(){this.x=Math.ceil(this.x);this.y=Math.ceil(this.y);this.z=Math.ceil(this.z);this.w=Math.ceil(this.w);return this;},round:function round(){this.x=Math.round(this.x);this.y=Math.round(this.y);this.z=Math.round(this.z);this.w=Math.round(this.w);return this;},roundToZero:function roundToZero(){this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x);this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y);this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z);this.w=this.w<0?Math.ceil(this.w):Math.floor(this.w);return this;},negate:function negate(){this.x=-this.x;this.y=-this.y;this.z=-this.z;this.w=-this.w;return this;},dot:function dot(v){return this.x*v.x+this.y*v.y+this.z*v.z+this.w*v.w;},lengthSq:function lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w;},length:function length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w);},lengthManhattan:function lengthManhattan(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w);},normalize:function normalize(){return this.divideScalar(this.length());},setLength:function setLength(length){return this.multiplyScalar(length/this.length());},lerp:function lerp(v,alpha){this.x+=(v.x-this.x)*alpha;this.y+=(v.y-this.y)*alpha;this.z+=(v.z-this.z)*alpha;this.w+=(v.w-this.w)*alpha;return this;},lerpVectors:function lerpVectors(v1,v2,alpha){this.subVectors(v2,v1).multiplyScalar(alpha).add(v1);return this;},equals:function equals(v){return v.x===this.x&&v.y===this.y&&v.z===this.z&&v.w===this.w;},fromArray:function fromArray(array,offset){if(offset===undefined)offset=0;this.x=array[offset];this.y=array[offset+1];this.z=array[offset+2];this.w=array[offset+3];return this;},toArray:function toArray(array,offset){if(array===undefined)array=[];if(offset===undefined)offset=0;array[offset]=this.x;array[offset+1]=this.y;array[offset+2]=this.z;array[offset+3]=this.w;return array;},fromAttribute:function fromAttribute(attribute,index,offset){if(offset===undefined)offset=0;index=index*attribute.itemSize+offset;this.x=attribute.array[index];this.y=attribute.array[index+1];this.z=attribute.array[index+2];this.w=attribute.array[index+3];return this;}}; // File:src/math/Euler.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author bhouston / http://clara.io
 */THREE.Euler=function(x,y,z,order){this._x=x||0;this._y=y||0;this._z=z||0;this._order=order||THREE.Euler.DefaultOrder;};THREE.Euler.RotationOrders=['XYZ','YZX','ZXY','XZY','YXZ','ZYX'];THREE.Euler.DefaultOrder='XYZ';THREE.Euler.prototype={constructor:THREE.Euler,get x(){return this._x;},set x(value){this._x=value;this.onChangeCallback();},get y(){return this._y;},set y(value){this._y=value;this.onChangeCallback();},get z(){return this._z;},set z(value){this._z=value;this.onChangeCallback();},get order(){return this._order;},set order(value){this._order=value;this.onChangeCallback();},set:function set(x,y,z,order){this._x=x;this._y=y;this._z=z;this._order=order||this._order;this.onChangeCallback();return this;},clone:function clone(){return new this.constructor(this._x,this._y,this._z,this._order);},copy:function copy(euler){this._x=euler._x;this._y=euler._y;this._z=euler._z;this._order=euler._order;this.onChangeCallback();return this;},setFromRotationMatrix:function setFromRotationMatrix(m,order,update){var clamp=THREE.Math.clamp; // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
var te=m.elements;var m11=te[0],m12=te[4],m13=te[8];var m21=te[1],m22=te[5],m23=te[9];var m31=te[2],m32=te[6],m33=te[10];order=order||this._order;if(order==='XYZ'){this._y=Math.asin(clamp(m13,-1,1));if(Math.abs(m13)<0.99999){this._x=Math.atan2(-m23,m33);this._z=Math.atan2(-m12,m11);}else {this._x=Math.atan2(m32,m22);this._z=0;}}else if(order==='YXZ'){this._x=Math.asin(-clamp(m23,-1,1));if(Math.abs(m23)<0.99999){this._y=Math.atan2(m13,m33);this._z=Math.atan2(m21,m22);}else {this._y=Math.atan2(-m31,m11);this._z=0;}}else if(order==='ZXY'){this._x=Math.asin(clamp(m32,-1,1));if(Math.abs(m32)<0.99999){this._y=Math.atan2(-m31,m33);this._z=Math.atan2(-m12,m22);}else {this._y=0;this._z=Math.atan2(m21,m11);}}else if(order==='ZYX'){this._y=Math.asin(-clamp(m31,-1,1));if(Math.abs(m31)<0.99999){this._x=Math.atan2(m32,m33);this._z=Math.atan2(m21,m11);}else {this._x=0;this._z=Math.atan2(-m12,m22);}}else if(order==='YZX'){this._z=Math.asin(clamp(m21,-1,1));if(Math.abs(m21)<0.99999){this._x=Math.atan2(-m23,m22);this._y=Math.atan2(-m31,m11);}else {this._x=0;this._y=Math.atan2(m13,m33);}}else if(order==='XZY'){this._z=Math.asin(-clamp(m12,-1,1));if(Math.abs(m12)<0.99999){this._x=Math.atan2(m32,m22);this._y=Math.atan2(m13,m11);}else {this._x=Math.atan2(-m23,m33);this._y=0;}}else {console.warn('THREE.Euler: .setFromRotationMatrix() given unsupported order: '+order);}this._order=order;if(update!==false)this.onChangeCallback();return this;},setFromQuaternion:function(){var matrix;return function(q,order,update){if(matrix===undefined)matrix=new THREE.Matrix4();matrix.makeRotationFromQuaternion(q);this.setFromRotationMatrix(matrix,order,update);return this;};}(),setFromVector3:function setFromVector3(v,order){return this.set(v.x,v.y,v.z,order||this._order);},reorder:function(){ // WARNING: this discards revolution information -bhouston
var q=new THREE.Quaternion();return function(newOrder){q.setFromEuler(this);this.setFromQuaternion(q,newOrder);};}(),equals:function equals(euler){return euler._x===this._x&&euler._y===this._y&&euler._z===this._z&&euler._order===this._order;},fromArray:function fromArray(array){this._x=array[0];this._y=array[1];this._z=array[2];if(array[3]!==undefined)this._order=array[3];this.onChangeCallback();return this;},toArray:function toArray(array,offset){if(array===undefined)array=[];if(offset===undefined)offset=0;array[offset]=this._x;array[offset+1]=this._y;array[offset+2]=this._z;array[offset+3]=this._order;return array;},toVector3:function toVector3(optionalResult){if(optionalResult){return optionalResult.set(this._x,this._y,this._z);}else {return new THREE.Vector3(this._x,this._y,this._z);}},onChange:function onChange(callback){this.onChangeCallback=callback;return this;},onChangeCallback:function onChangeCallback(){}}; // File:src/math/Line3.js
/**
 * @author bhouston / http://clara.io
 */THREE.Line3=function(start,end){this.start=start!==undefined?start:new THREE.Vector3();this.end=end!==undefined?end:new THREE.Vector3();};THREE.Line3.prototype={constructor:THREE.Line3,set:function set(start,end){this.start.copy(start);this.end.copy(end);return this;},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(line){this.start.copy(line.start);this.end.copy(line.end);return this;},center:function center(optionalTarget){var result=optionalTarget||new THREE.Vector3();return result.addVectors(this.start,this.end).multiplyScalar(0.5);},delta:function delta(optionalTarget){var result=optionalTarget||new THREE.Vector3();return result.subVectors(this.end,this.start);},distanceSq:function distanceSq(){return this.start.distanceToSquared(this.end);},distance:function distance(){return this.start.distanceTo(this.end);},at:function at(t,optionalTarget){var result=optionalTarget||new THREE.Vector3();return this.delta(result).multiplyScalar(t).add(this.start);},closestPointToPointParameter:function(){var startP=new THREE.Vector3();var startEnd=new THREE.Vector3();return function(point,clampToLine){startP.subVectors(point,this.start);startEnd.subVectors(this.end,this.start);var startEnd2=startEnd.dot(startEnd);var startEnd_startP=startEnd.dot(startP);var t=startEnd_startP/startEnd2;if(clampToLine){t=THREE.Math.clamp(t,0,1);}return t;};}(),closestPointToPoint:function closestPointToPoint(point,clampToLine,optionalTarget){var t=this.closestPointToPointParameter(point,clampToLine);var result=optionalTarget||new THREE.Vector3();return this.delta(result).multiplyScalar(t).add(this.start);},applyMatrix4:function applyMatrix4(matrix){this.start.applyMatrix4(matrix);this.end.applyMatrix4(matrix);return this;},equals:function equals(line){return line.start.equals(this.start)&&line.end.equals(this.end);}}; // File:src/math/Box2.js
/**
 * @author bhouston / http://clara.io
 */THREE.Box2=function(min,max){this.min=min!==undefined?min:new THREE.Vector2(Infinity,Infinity);this.max=max!==undefined?max:new THREE.Vector2(-Infinity,-Infinity);};THREE.Box2.prototype={constructor:THREE.Box2,set:function set(min,max){this.min.copy(min);this.max.copy(max);return this;},setFromPoints:function setFromPoints(points){this.makeEmpty();for(var i=0,il=points.length;i<il;i++){this.expandByPoint(points[i]);}return this;},setFromCenterAndSize:function(){var v1=new THREE.Vector2();return function(center,size){var halfSize=v1.copy(size).multiplyScalar(0.5);this.min.copy(center).sub(halfSize);this.max.copy(center).add(halfSize);return this;};}(),clone:function clone(){return new this.constructor().copy(this);},copy:function copy(box){this.min.copy(box.min);this.max.copy(box.max);return this;},makeEmpty:function makeEmpty(){this.min.x=this.min.y=Infinity;this.max.x=this.max.y=-Infinity;return this;},empty:function empty(){ // this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes
return this.max.x<this.min.x||this.max.y<this.min.y;},center:function center(optionalTarget){var result=optionalTarget||new THREE.Vector2();return result.addVectors(this.min,this.max).multiplyScalar(0.5);},size:function size(optionalTarget){var result=optionalTarget||new THREE.Vector2();return result.subVectors(this.max,this.min);},expandByPoint:function expandByPoint(point){this.min.min(point);this.max.max(point);return this;},expandByVector:function expandByVector(vector){this.min.sub(vector);this.max.add(vector);return this;},expandByScalar:function expandByScalar(scalar){this.min.addScalar(-scalar);this.max.addScalar(scalar);return this;},containsPoint:function containsPoint(point){if(point.x<this.min.x||point.x>this.max.x||point.y<this.min.y||point.y>this.max.y){return false;}return true;},containsBox:function containsBox(box){if(this.min.x<=box.min.x&&box.max.x<=this.max.x&&this.min.y<=box.min.y&&box.max.y<=this.max.y){return true;}return false;},getParameter:function getParameter(point,optionalTarget){ // This can potentially have a divide by zero if the box
// has a size dimension of 0.
var result=optionalTarget||new THREE.Vector2();return result.set((point.x-this.min.x)/(this.max.x-this.min.x),(point.y-this.min.y)/(this.max.y-this.min.y));},isIntersectionBox:function isIntersectionBox(box){ // using 6 splitting planes to rule out intersections.
if(box.max.x<this.min.x||box.min.x>this.max.x||box.max.y<this.min.y||box.min.y>this.max.y){return false;}return true;},clampPoint:function clampPoint(point,optionalTarget){var result=optionalTarget||new THREE.Vector2();return result.copy(point).clamp(this.min,this.max);},distanceToPoint:function(){var v1=new THREE.Vector2();return function(point){var clampedPoint=v1.copy(point).clamp(this.min,this.max);return clampedPoint.sub(point).length();};}(),intersect:function intersect(box){this.min.max(box.min);this.max.min(box.max);return this;},union:function union(box){this.min.min(box.min);this.max.max(box.max);return this;},translate:function translate(offset){this.min.add(offset);this.max.add(offset);return this;},equals:function equals(box){return box.min.equals(this.min)&&box.max.equals(this.max);}}; // File:src/math/Box3.js
/**
 * @author bhouston / http://clara.io
 * @author WestLangley / http://github.com/WestLangley
 */THREE.Box3=function(min,max){this.min=min!==undefined?min:new THREE.Vector3(Infinity,Infinity,Infinity);this.max=max!==undefined?max:new THREE.Vector3(-Infinity,-Infinity,-Infinity);};THREE.Box3.prototype={constructor:THREE.Box3,set:function set(min,max){this.min.copy(min);this.max.copy(max);return this;},setFromPoints:function setFromPoints(points){this.makeEmpty();for(var i=0,il=points.length;i<il;i++){this.expandByPoint(points[i]);}return this;},setFromCenterAndSize:function(){var v1=new THREE.Vector3();return function(center,size){var halfSize=v1.copy(size).multiplyScalar(0.5);this.min.copy(center).sub(halfSize);this.max.copy(center).add(halfSize);return this;};}(),setFromObject:function(){ // Computes the world-axis-aligned bounding box of an object (including its children),
// accounting for both the object's, and children's, world transforms
var v1=new THREE.Vector3();return function(object){var scope=this;object.updateMatrixWorld(true);this.makeEmpty();object.traverse(function(node){var geometry=node.geometry;if(geometry!==undefined){if(geometry instanceof THREE.Geometry){var vertices=geometry.vertices;for(var i=0,il=vertices.length;i<il;i++){v1.copy(vertices[i]);v1.applyMatrix4(node.matrixWorld);scope.expandByPoint(v1);}}else if(geometry instanceof THREE.BufferGeometry&&geometry.attributes['position']!==undefined){var positions=geometry.attributes['position'].array;for(var i=0,il=positions.length;i<il;i+=3){v1.set(positions[i],positions[i+1],positions[i+2]);v1.applyMatrix4(node.matrixWorld);scope.expandByPoint(v1);}}}});return this;};}(),clone:function clone(){return new this.constructor().copy(this);},copy:function copy(box){this.min.copy(box.min);this.max.copy(box.max);return this;},makeEmpty:function makeEmpty(){this.min.x=this.min.y=this.min.z=Infinity;this.max.x=this.max.y=this.max.z=-Infinity;return this;},empty:function empty(){ // this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes
return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z;},center:function center(optionalTarget){var result=optionalTarget||new THREE.Vector3();return result.addVectors(this.min,this.max).multiplyScalar(0.5);},size:function size(optionalTarget){var result=optionalTarget||new THREE.Vector3();return result.subVectors(this.max,this.min);},expandByPoint:function expandByPoint(point){this.min.min(point);this.max.max(point);return this;},expandByVector:function expandByVector(vector){this.min.sub(vector);this.max.add(vector);return this;},expandByScalar:function expandByScalar(scalar){this.min.addScalar(-scalar);this.max.addScalar(scalar);return this;},containsPoint:function containsPoint(point){if(point.x<this.min.x||point.x>this.max.x||point.y<this.min.y||point.y>this.max.y||point.z<this.min.z||point.z>this.max.z){return false;}return true;},containsBox:function containsBox(box){if(this.min.x<=box.min.x&&box.max.x<=this.max.x&&this.min.y<=box.min.y&&box.max.y<=this.max.y&&this.min.z<=box.min.z&&box.max.z<=this.max.z){return true;}return false;},getParameter:function getParameter(point,optionalTarget){ // This can potentially have a divide by zero if the box
// has a size dimension of 0.
var result=optionalTarget||new THREE.Vector3();return result.set((point.x-this.min.x)/(this.max.x-this.min.x),(point.y-this.min.y)/(this.max.y-this.min.y),(point.z-this.min.z)/(this.max.z-this.min.z));},isIntersectionBox:function isIntersectionBox(box){ // using 6 splitting planes to rule out intersections.
if(box.max.x<this.min.x||box.min.x>this.max.x||box.max.y<this.min.y||box.min.y>this.max.y||box.max.z<this.min.z||box.min.z>this.max.z){return false;}return true;},clampPoint:function clampPoint(point,optionalTarget){var result=optionalTarget||new THREE.Vector3();return result.copy(point).clamp(this.min,this.max);},distanceToPoint:function(){var v1=new THREE.Vector3();return function(point){var clampedPoint=v1.copy(point).clamp(this.min,this.max);return clampedPoint.sub(point).length();};}(),getBoundingSphere:function(){var v1=new THREE.Vector3();return function(optionalTarget){var result=optionalTarget||new THREE.Sphere();result.center=this.center();result.radius=this.size(v1).length()*0.5;return result;};}(),intersect:function intersect(box){this.min.max(box.min);this.max.min(box.max);return this;},union:function union(box){this.min.min(box.min);this.max.max(box.max);return this;},applyMatrix4:function(){var points=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];return function(matrix){ // NOTE: I am using a binary pattern to specify all 2^3 combinations below
points[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(matrix); // 000
points[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(matrix); // 001
points[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(matrix); // 010
points[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(matrix); // 011
points[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(matrix); // 100
points[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(matrix); // 101
points[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(matrix); // 110
points[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(matrix); // 111
this.makeEmpty();this.setFromPoints(points);return this;};}(),translate:function translate(offset){this.min.add(offset);this.max.add(offset);return this;},equals:function equals(box){return box.min.equals(this.min)&&box.max.equals(this.max);}}; // File:src/math/Matrix3.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author bhouston / http://clara.io
 */THREE.Matrix3=function(){this.elements=new Float32Array([1,0,0,0,1,0,0,0,1]);if(arguments.length>0){console.error('THREE.Matrix3: the constructor no longer reads arguments. use .set() instead.');}};THREE.Matrix3.prototype={constructor:THREE.Matrix3,set:function set(n11,n12,n13,n21,n22,n23,n31,n32,n33){var te=this.elements;te[0]=n11;te[3]=n12;te[6]=n13;te[1]=n21;te[4]=n22;te[7]=n23;te[2]=n31;te[5]=n32;te[8]=n33;return this;},identity:function identity(){this.set(1,0,0,0,1,0,0,0,1);return this;},clone:function clone(){return new this.constructor().fromArray(this.elements);},copy:function copy(m){var me=m.elements;this.set(me[0],me[3],me[6],me[1],me[4],me[7],me[2],me[5],me[8]);return this;},multiplyVector3:function multiplyVector3(vector){console.warn('THREE.Matrix3: .multiplyVector3() has been removed. Use vector.applyMatrix3( matrix ) instead.');return vector.applyMatrix3(this);},multiplyVector3Array:function multiplyVector3Array(a){console.warn('THREE.Matrix3: .multiplyVector3Array() has been renamed. Use matrix.applyToVector3Array( array ) instead.');return this.applyToVector3Array(a);},applyToVector3Array:function(){var v1;return function(array,offset,length){if(v1===undefined)v1=new THREE.Vector3();if(offset===undefined)offset=0;if(length===undefined)length=array.length;for(var i=0,j=offset;i<length;i+=3,j+=3){v1.fromArray(array,j);v1.applyMatrix3(this);v1.toArray(array,j);}return array;};}(),applyToBuffer:function(){var v1;return function applyToBuffer(buffer,offset,length){if(v1===undefined)v1=new THREE.Vector3();if(offset===undefined)offset=0;if(length===undefined)length=buffer.length/buffer.itemSize;for(var i=0,j=offset;i<length;i++,j++){v1.x=buffer.getX(j);v1.y=buffer.getY(j);v1.z=buffer.getZ(j);v1.applyMatrix3(this);buffer.setXYZ(v1.x,v1.y,v1.z);}return buffer;};}(),multiplyScalar:function multiplyScalar(s){var te=this.elements;te[0]*=s;te[3]*=s;te[6]*=s;te[1]*=s;te[4]*=s;te[7]*=s;te[2]*=s;te[5]*=s;te[8]*=s;return this;},determinant:function determinant(){var te=this.elements;var a=te[0],b=te[1],c=te[2],d=te[3],e=te[4],f=te[5],g=te[6],h=te[7],i=te[8];return a*e*i-a*f*h-b*d*i+b*f*g+c*d*h-c*e*g;},getInverse:function getInverse(matrix,throwOnInvertible){ // input: THREE.Matrix4
// ( based on http://code.google.com/p/webgl-mjs/ )
var me=matrix.elements;var te=this.elements;te[0]=me[10]*me[5]-me[6]*me[9];te[1]=-me[10]*me[1]+me[2]*me[9];te[2]=me[6]*me[1]-me[2]*me[5];te[3]=-me[10]*me[4]+me[6]*me[8];te[4]=me[10]*me[0]-me[2]*me[8];te[5]=-me[6]*me[0]+me[2]*me[4];te[6]=me[9]*me[4]-me[5]*me[8];te[7]=-me[9]*me[0]+me[1]*me[8];te[8]=me[5]*me[0]-me[1]*me[4];var det=me[0]*te[0]+me[1]*te[3]+me[2]*te[6]; // no inverse
if(det===0){var msg="Matrix3.getInverse(): can't invert matrix, determinant is 0";if(throwOnInvertible||false){throw new Error(msg);}else {console.warn(msg);}this.identity();return this;}this.multiplyScalar(1.0/det);return this;},transpose:function transpose(){var tmp,m=this.elements;tmp=m[1];m[1]=m[3];m[3]=tmp;tmp=m[2];m[2]=m[6];m[6]=tmp;tmp=m[5];m[5]=m[7];m[7]=tmp;return this;},flattenToArrayOffset:function flattenToArrayOffset(array,offset){var te=this.elements;array[offset]=te[0];array[offset+1]=te[1];array[offset+2]=te[2];array[offset+3]=te[3];array[offset+4]=te[4];array[offset+5]=te[5];array[offset+6]=te[6];array[offset+7]=te[7];array[offset+8]=te[8];return array;},getNormalMatrix:function getNormalMatrix(m){ // input: THREE.Matrix4
this.getInverse(m).transpose();return this;},transposeIntoArray:function transposeIntoArray(r){var m=this.elements;r[0]=m[0];r[1]=m[3];r[2]=m[6];r[3]=m[1];r[4]=m[4];r[5]=m[7];r[6]=m[2];r[7]=m[5];r[8]=m[8];return this;},fromArray:function fromArray(array){this.elements.set(array);return this;},toArray:function toArray(){var te=this.elements;return [te[0],te[1],te[2],te[3],te[4],te[5],te[6],te[7],te[8]];}}; // File:src/math/Matrix4.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author supereggbert / http://www.paulbrunt.co.uk/
 * @author philogb / http://blog.thejit.org/
 * @author jordi_ros / http://plattsoft.com
 * @author D1plo1d / http://github.com/D1plo1d
 * @author alteredq / http://alteredqualia.com/
 * @author mikael emtinger / http://gomo.se/
 * @author timknip / http://www.floorplanner.com/
 * @author bhouston / http://clara.io
 * @author WestLangley / http://github.com/WestLangley
 */THREE.Matrix4=function(){this.elements=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);if(arguments.length>0){console.error('THREE.Matrix4: the constructor no longer reads arguments. use .set() instead.');}};THREE.Matrix4.prototype={constructor:THREE.Matrix4,set:function set(n11,n12,n13,n14,n21,n22,n23,n24,n31,n32,n33,n34,n41,n42,n43,n44){var te=this.elements;te[0]=n11;te[4]=n12;te[8]=n13;te[12]=n14;te[1]=n21;te[5]=n22;te[9]=n23;te[13]=n24;te[2]=n31;te[6]=n32;te[10]=n33;te[14]=n34;te[3]=n41;te[7]=n42;te[11]=n43;te[15]=n44;return this;},identity:function identity(){this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1);return this;},clone:function clone(){return new THREE.Matrix4().fromArray(this.elements);},copy:function copy(m){this.elements.set(m.elements);return this;},extractPosition:function extractPosition(m){console.warn('THREE.Matrix4: .extractPosition() has been renamed to .copyPosition().');return this.copyPosition(m);},copyPosition:function copyPosition(m){var te=this.elements;var me=m.elements;te[12]=me[12];te[13]=me[13];te[14]=me[14];return this;},extractBasis:function extractBasis(xAxis,yAxis,zAxis){var te=this.elements;xAxis.set(te[0],te[1],te[2]);yAxis.set(te[4],te[5],te[6]);zAxis.set(te[8],te[9],te[10]);return this;},makeBasis:function makeBasis(xAxis,yAxis,zAxis){this.set(xAxis.x,yAxis.x,zAxis.x,0,xAxis.y,yAxis.y,zAxis.y,0,xAxis.z,yAxis.z,zAxis.z,0,0,0,0,1);return this;},extractRotation:function(){var v1;return function(m){if(v1===undefined)v1=new THREE.Vector3();var te=this.elements;var me=m.elements;var scaleX=1/v1.set(me[0],me[1],me[2]).length();var scaleY=1/v1.set(me[4],me[5],me[6]).length();var scaleZ=1/v1.set(me[8],me[9],me[10]).length();te[0]=me[0]*scaleX;te[1]=me[1]*scaleX;te[2]=me[2]*scaleX;te[4]=me[4]*scaleY;te[5]=me[5]*scaleY;te[6]=me[6]*scaleY;te[8]=me[8]*scaleZ;te[9]=me[9]*scaleZ;te[10]=me[10]*scaleZ;return this;};}(),makeRotationFromEuler:function makeRotationFromEuler(euler){if(euler instanceof THREE.Euler===false){console.error('THREE.Matrix: .makeRotationFromEuler() now expects a Euler rotation rather than a Vector3 and order.');}var te=this.elements;var x=euler.x,y=euler.y,z=euler.z;var a=Math.cos(x),b=Math.sin(x);var c=Math.cos(y),d=Math.sin(y);var e=Math.cos(z),f=Math.sin(z);if(euler.order==='XYZ'){var ae=a*e,af=a*f,be=b*e,bf=b*f;te[0]=c*e;te[4]=-c*f;te[8]=d;te[1]=af+be*d;te[5]=ae-bf*d;te[9]=-b*c;te[2]=bf-ae*d;te[6]=be+af*d;te[10]=a*c;}else if(euler.order==='YXZ'){var ce=c*e,cf=c*f,de=d*e,df=d*f;te[0]=ce+df*b;te[4]=de*b-cf;te[8]=a*d;te[1]=a*f;te[5]=a*e;te[9]=-b;te[2]=cf*b-de;te[6]=df+ce*b;te[10]=a*c;}else if(euler.order==='ZXY'){var ce=c*e,cf=c*f,de=d*e,df=d*f;te[0]=ce-df*b;te[4]=-a*f;te[8]=de+cf*b;te[1]=cf+de*b;te[5]=a*e;te[9]=df-ce*b;te[2]=-a*d;te[6]=b;te[10]=a*c;}else if(euler.order==='ZYX'){var ae=a*e,af=a*f,be=b*e,bf=b*f;te[0]=c*e;te[4]=be*d-af;te[8]=ae*d+bf;te[1]=c*f;te[5]=bf*d+ae;te[9]=af*d-be;te[2]=-d;te[6]=b*c;te[10]=a*c;}else if(euler.order==='YZX'){var ac=a*c,ad=a*d,bc=b*c,bd=b*d;te[0]=c*e;te[4]=bd-ac*f;te[8]=bc*f+ad;te[1]=f;te[5]=a*e;te[9]=-b*e;te[2]=-d*e;te[6]=ad*f+bc;te[10]=ac-bd*f;}else if(euler.order==='XZY'){var ac=a*c,ad=a*d,bc=b*c,bd=b*d;te[0]=c*e;te[4]=-f;te[8]=d*e;te[1]=ac*f+bd;te[5]=a*e;te[9]=ad*f-bc;te[2]=bc*f-ad;te[6]=b*e;te[10]=bd*f+ac;} // last column
te[3]=0;te[7]=0;te[11]=0; // bottom row
te[12]=0;te[13]=0;te[14]=0;te[15]=1;return this;},setRotationFromQuaternion:function setRotationFromQuaternion(q){console.warn('THREE.Matrix4: .setRotationFromQuaternion() has been renamed to .makeRotationFromQuaternion().');return this.makeRotationFromQuaternion(q);},makeRotationFromQuaternion:function makeRotationFromQuaternion(q){var te=this.elements;var x=q.x,y=q.y,z=q.z,w=q.w;var x2=x+x,y2=y+y,z2=z+z;var xx=x*x2,xy=x*y2,xz=x*z2;var yy=y*y2,yz=y*z2,zz=z*z2;var wx=w*x2,wy=w*y2,wz=w*z2;te[0]=1-(yy+zz);te[4]=xy-wz;te[8]=xz+wy;te[1]=xy+wz;te[5]=1-(xx+zz);te[9]=yz-wx;te[2]=xz-wy;te[6]=yz+wx;te[10]=1-(xx+yy); // last column
te[3]=0;te[7]=0;te[11]=0; // bottom row
te[12]=0;te[13]=0;te[14]=0;te[15]=1;return this;},lookAt:function(){var x,y,z;return function(eye,target,up){if(x===undefined)x=new THREE.Vector3();if(y===undefined)y=new THREE.Vector3();if(z===undefined)z=new THREE.Vector3();var te=this.elements;z.subVectors(eye,target).normalize();if(z.lengthSq()===0){z.z=1;}x.crossVectors(up,z).normalize();if(x.lengthSq()===0){z.x+=0.0001;x.crossVectors(up,z).normalize();}y.crossVectors(z,x);te[0]=x.x;te[4]=y.x;te[8]=z.x;te[1]=x.y;te[5]=y.y;te[9]=z.y;te[2]=x.z;te[6]=y.z;te[10]=z.z;return this;};}(),multiply:function multiply(m,n){if(n!==undefined){console.warn('THREE.Matrix4: .multiply() now only accepts one argument. Use .multiplyMatrices( a, b ) instead.');return this.multiplyMatrices(m,n);}return this.multiplyMatrices(this,m);},multiplyMatrices:function multiplyMatrices(a,b){var ae=a.elements;var be=b.elements;var te=this.elements;var a11=ae[0],a12=ae[4],a13=ae[8],a14=ae[12];var a21=ae[1],a22=ae[5],a23=ae[9],a24=ae[13];var a31=ae[2],a32=ae[6],a33=ae[10],a34=ae[14];var a41=ae[3],a42=ae[7],a43=ae[11],a44=ae[15];var b11=be[0],b12=be[4],b13=be[8],b14=be[12];var b21=be[1],b22=be[5],b23=be[9],b24=be[13];var b31=be[2],b32=be[6],b33=be[10],b34=be[14];var b41=be[3],b42=be[7],b43=be[11],b44=be[15];te[0]=a11*b11+a12*b21+a13*b31+a14*b41;te[4]=a11*b12+a12*b22+a13*b32+a14*b42;te[8]=a11*b13+a12*b23+a13*b33+a14*b43;te[12]=a11*b14+a12*b24+a13*b34+a14*b44;te[1]=a21*b11+a22*b21+a23*b31+a24*b41;te[5]=a21*b12+a22*b22+a23*b32+a24*b42;te[9]=a21*b13+a22*b23+a23*b33+a24*b43;te[13]=a21*b14+a22*b24+a23*b34+a24*b44;te[2]=a31*b11+a32*b21+a33*b31+a34*b41;te[6]=a31*b12+a32*b22+a33*b32+a34*b42;te[10]=a31*b13+a32*b23+a33*b33+a34*b43;te[14]=a31*b14+a32*b24+a33*b34+a34*b44;te[3]=a41*b11+a42*b21+a43*b31+a44*b41;te[7]=a41*b12+a42*b22+a43*b32+a44*b42;te[11]=a41*b13+a42*b23+a43*b33+a44*b43;te[15]=a41*b14+a42*b24+a43*b34+a44*b44;return this;},multiplyToArray:function multiplyToArray(a,b,r){var te=this.elements;this.multiplyMatrices(a,b);r[0]=te[0];r[1]=te[1];r[2]=te[2];r[3]=te[3];r[4]=te[4];r[5]=te[5];r[6]=te[6];r[7]=te[7];r[8]=te[8];r[9]=te[9];r[10]=te[10];r[11]=te[11];r[12]=te[12];r[13]=te[13];r[14]=te[14];r[15]=te[15];return this;},multiplyScalar:function multiplyScalar(s){var te=this.elements;te[0]*=s;te[4]*=s;te[8]*=s;te[12]*=s;te[1]*=s;te[5]*=s;te[9]*=s;te[13]*=s;te[2]*=s;te[6]*=s;te[10]*=s;te[14]*=s;te[3]*=s;te[7]*=s;te[11]*=s;te[15]*=s;return this;},multiplyVector3:function multiplyVector3(vector){console.warn('THREE.Matrix4: .multiplyVector3() has been removed. Use vector.applyMatrix4( matrix ) or vector.applyProjection( matrix ) instead.');return vector.applyProjection(this);},multiplyVector4:function multiplyVector4(vector){console.warn('THREE.Matrix4: .multiplyVector4() has been removed. Use vector.applyMatrix4( matrix ) instead.');return vector.applyMatrix4(this);},multiplyVector3Array:function multiplyVector3Array(a){console.warn('THREE.Matrix4: .multiplyVector3Array() has been renamed. Use matrix.applyToVector3Array( array ) instead.');return this.applyToVector3Array(a);},applyToVector3Array:function(){var v1;return function(array,offset,length){if(v1===undefined)v1=new THREE.Vector3();if(offset===undefined)offset=0;if(length===undefined)length=array.length;for(var i=0,j=offset;i<length;i+=3,j+=3){v1.fromArray(array,j);v1.applyMatrix4(this);v1.toArray(array,j);}return array;};}(),applyToBuffer:function(){var v1;return function applyToBuffer(buffer,offset,length){if(v1===undefined)v1=new THREE.Vector3();if(offset===undefined)offset=0;if(length===undefined)length=buffer.length/buffer.itemSize;for(var i=0,j=offset;i<length;i++,j++){v1.x=buffer.getX(j);v1.y=buffer.getY(j);v1.z=buffer.getZ(j);v1.applyMatrix4(this);buffer.setXYZ(v1.x,v1.y,v1.z);}return buffer;};}(),rotateAxis:function rotateAxis(v){console.warn('THREE.Matrix4: .rotateAxis() has been removed. Use Vector3.transformDirection( matrix ) instead.');v.transformDirection(this);},crossVector:function crossVector(vector){console.warn('THREE.Matrix4: .crossVector() has been removed. Use vector.applyMatrix4( matrix ) instead.');return vector.applyMatrix4(this);},determinant:function determinant(){var te=this.elements;var n11=te[0],n12=te[4],n13=te[8],n14=te[12];var n21=te[1],n22=te[5],n23=te[9],n24=te[13];var n31=te[2],n32=te[6],n33=te[10],n34=te[14];var n41=te[3],n42=te[7],n43=te[11],n44=te[15]; //TODO: make this more efficient
//( based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm )
return n41*(+n14*n23*n32-n13*n24*n32-n14*n22*n33+n12*n24*n33+n13*n22*n34-n12*n23*n34)+n42*(+n11*n23*n34-n11*n24*n33+n14*n21*n33-n13*n21*n34+n13*n24*n31-n14*n23*n31)+n43*(+n11*n24*n32-n11*n22*n34-n14*n21*n32+n12*n21*n34+n14*n22*n31-n12*n24*n31)+n44*(-n13*n22*n31-n11*n23*n32+n11*n22*n33+n13*n21*n32-n12*n21*n33+n12*n23*n31);},transpose:function transpose(){var te=this.elements;var tmp;tmp=te[1];te[1]=te[4];te[4]=tmp;tmp=te[2];te[2]=te[8];te[8]=tmp;tmp=te[6];te[6]=te[9];te[9]=tmp;tmp=te[3];te[3]=te[12];te[12]=tmp;tmp=te[7];te[7]=te[13];te[13]=tmp;tmp=te[11];te[11]=te[14];te[14]=tmp;return this;},flattenToArrayOffset:function flattenToArrayOffset(array,offset){var te=this.elements;array[offset]=te[0];array[offset+1]=te[1];array[offset+2]=te[2];array[offset+3]=te[3];array[offset+4]=te[4];array[offset+5]=te[5];array[offset+6]=te[6];array[offset+7]=te[7];array[offset+8]=te[8];array[offset+9]=te[9];array[offset+10]=te[10];array[offset+11]=te[11];array[offset+12]=te[12];array[offset+13]=te[13];array[offset+14]=te[14];array[offset+15]=te[15];return array;},getPosition:function(){var v1;return function(){if(v1===undefined)v1=new THREE.Vector3();console.warn('THREE.Matrix4: .getPosition() has been removed. Use Vector3.setFromMatrixPosition( matrix ) instead.');var te=this.elements;return v1.set(te[12],te[13],te[14]);};}(),setPosition:function setPosition(v){var te=this.elements;te[12]=v.x;te[13]=v.y;te[14]=v.z;return this;},getInverse:function getInverse(m,throwOnInvertible){ // based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
var te=this.elements;var me=m.elements;var n11=me[0],n12=me[4],n13=me[8],n14=me[12];var n21=me[1],n22=me[5],n23=me[9],n24=me[13];var n31=me[2],n32=me[6],n33=me[10],n34=me[14];var n41=me[3],n42=me[7],n43=me[11],n44=me[15];te[0]=n23*n34*n42-n24*n33*n42+n24*n32*n43-n22*n34*n43-n23*n32*n44+n22*n33*n44;te[4]=n14*n33*n42-n13*n34*n42-n14*n32*n43+n12*n34*n43+n13*n32*n44-n12*n33*n44;te[8]=n13*n24*n42-n14*n23*n42+n14*n22*n43-n12*n24*n43-n13*n22*n44+n12*n23*n44;te[12]=n14*n23*n32-n13*n24*n32-n14*n22*n33+n12*n24*n33+n13*n22*n34-n12*n23*n34;te[1]=n24*n33*n41-n23*n34*n41-n24*n31*n43+n21*n34*n43+n23*n31*n44-n21*n33*n44;te[5]=n13*n34*n41-n14*n33*n41+n14*n31*n43-n11*n34*n43-n13*n31*n44+n11*n33*n44;te[9]=n14*n23*n41-n13*n24*n41-n14*n21*n43+n11*n24*n43+n13*n21*n44-n11*n23*n44;te[13]=n13*n24*n31-n14*n23*n31+n14*n21*n33-n11*n24*n33-n13*n21*n34+n11*n23*n34;te[2]=n22*n34*n41-n24*n32*n41+n24*n31*n42-n21*n34*n42-n22*n31*n44+n21*n32*n44;te[6]=n14*n32*n41-n12*n34*n41-n14*n31*n42+n11*n34*n42+n12*n31*n44-n11*n32*n44;te[10]=n12*n24*n41-n14*n22*n41+n14*n21*n42-n11*n24*n42-n12*n21*n44+n11*n22*n44;te[14]=n14*n22*n31-n12*n24*n31-n14*n21*n32+n11*n24*n32+n12*n21*n34-n11*n22*n34;te[3]=n23*n32*n41-n22*n33*n41-n23*n31*n42+n21*n33*n42+n22*n31*n43-n21*n32*n43;te[7]=n12*n33*n41-n13*n32*n41+n13*n31*n42-n11*n33*n42-n12*n31*n43+n11*n32*n43;te[11]=n13*n22*n41-n12*n23*n41-n13*n21*n42+n11*n23*n42+n12*n21*n43-n11*n22*n43;te[15]=n12*n23*n31-n13*n22*n31+n13*n21*n32-n11*n23*n32-n12*n21*n33+n11*n22*n33;var det=n11*te[0]+n21*te[4]+n31*te[8]+n41*te[12];if(det===0){var msg="THREE.Matrix4.getInverse(): can't invert matrix, determinant is 0";if(throwOnInvertible||false){throw new Error(msg);}else {console.warn(msg);}this.identity();return this;}this.multiplyScalar(1/det);return this;},translate:function translate(v){console.error('THREE.Matrix4: .translate() has been removed.');},rotateX:function rotateX(angle){console.error('THREE.Matrix4: .rotateX() has been removed.');},rotateY:function rotateY(angle){console.error('THREE.Matrix4: .rotateY() has been removed.');},rotateZ:function rotateZ(angle){console.error('THREE.Matrix4: .rotateZ() has been removed.');},rotateByAxis:function rotateByAxis(axis,angle){console.error('THREE.Matrix4: .rotateByAxis() has been removed.');},scale:function scale(v){var te=this.elements;var x=v.x,y=v.y,z=v.z;te[0]*=x;te[4]*=y;te[8]*=z;te[1]*=x;te[5]*=y;te[9]*=z;te[2]*=x;te[6]*=y;te[10]*=z;te[3]*=x;te[7]*=y;te[11]*=z;return this;},getMaxScaleOnAxis:function getMaxScaleOnAxis(){var te=this.elements;var scaleXSq=te[0]*te[0]+te[1]*te[1]+te[2]*te[2];var scaleYSq=te[4]*te[4]+te[5]*te[5]+te[6]*te[6];var scaleZSq=te[8]*te[8]+te[9]*te[9]+te[10]*te[10];return Math.sqrt(Math.max(scaleXSq,scaleYSq,scaleZSq));},makeTranslation:function makeTranslation(x,y,z){this.set(1,0,0,x,0,1,0,y,0,0,1,z,0,0,0,1);return this;},makeRotationX:function makeRotationX(theta){var c=Math.cos(theta),s=Math.sin(theta);this.set(1,0,0,0,0,c,-s,0,0,s,c,0,0,0,0,1);return this;},makeRotationY:function makeRotationY(theta){var c=Math.cos(theta),s=Math.sin(theta);this.set(c,0,s,0,0,1,0,0,-s,0,c,0,0,0,0,1);return this;},makeRotationZ:function makeRotationZ(theta){var c=Math.cos(theta),s=Math.sin(theta);this.set(c,-s,0,0,s,c,0,0,0,0,1,0,0,0,0,1);return this;},makeRotationAxis:function makeRotationAxis(axis,angle){ // Based on http://www.gamedev.net/reference/articles/article1199.asp
var c=Math.cos(angle);var s=Math.sin(angle);var t=1-c;var x=axis.x,y=axis.y,z=axis.z;var tx=t*x,ty=t*y;this.set(tx*x+c,tx*y-s*z,tx*z+s*y,0,tx*y+s*z,ty*y+c,ty*z-s*x,0,tx*z-s*y,ty*z+s*x,t*z*z+c,0,0,0,0,1);return this;},makeScale:function makeScale(x,y,z){this.set(x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1);return this;},compose:function compose(position,quaternion,scale){this.makeRotationFromQuaternion(quaternion);this.scale(scale);this.setPosition(position);return this;},decompose:function(){var vector,matrix;return function(position,quaternion,scale){if(vector===undefined)vector=new THREE.Vector3();if(matrix===undefined)matrix=new THREE.Matrix4();var te=this.elements;var sx=vector.set(te[0],te[1],te[2]).length();var sy=vector.set(te[4],te[5],te[6]).length();var sz=vector.set(te[8],te[9],te[10]).length(); // if determine is negative, we need to invert one scale
var det=this.determinant();if(det<0){sx=-sx;}position.x=te[12];position.y=te[13];position.z=te[14]; // scale the rotation part
matrix.elements.set(this.elements); // at this point matrix is incomplete so we can't use .copy()
var invSX=1/sx;var invSY=1/sy;var invSZ=1/sz;matrix.elements[0]*=invSX;matrix.elements[1]*=invSX;matrix.elements[2]*=invSX;matrix.elements[4]*=invSY;matrix.elements[5]*=invSY;matrix.elements[6]*=invSY;matrix.elements[8]*=invSZ;matrix.elements[9]*=invSZ;matrix.elements[10]*=invSZ;quaternion.setFromRotationMatrix(matrix);scale.x=sx;scale.y=sy;scale.z=sz;return this;};}(),makeFrustum:function makeFrustum(left,right,bottom,top,near,far){var te=this.elements;var x=2*near/(right-left);var y=2*near/(top-bottom);var a=(right+left)/(right-left);var b=(top+bottom)/(top-bottom);var c=-(far+near)/(far-near);var d=-2*far*near/(far-near);te[0]=x;te[4]=0;te[8]=a;te[12]=0;te[1]=0;te[5]=y;te[9]=b;te[13]=0;te[2]=0;te[6]=0;te[10]=c;te[14]=d;te[3]=0;te[7]=0;te[11]=-1;te[15]=0;return this;},makePerspective:function makePerspective(fov,aspect,near,far){var ymax=near*Math.tan(THREE.Math.degToRad(fov*0.5));var ymin=-ymax;var xmin=ymin*aspect;var xmax=ymax*aspect;return this.makeFrustum(xmin,xmax,ymin,ymax,near,far);},makeOrthographic:function makeOrthographic(left,right,top,bottom,near,far){var te=this.elements;var w=right-left;var h=top-bottom;var p=far-near;var x=(right+left)/w;var y=(top+bottom)/h;var z=(far+near)/p;te[0]=2/w;te[4]=0;te[8]=0;te[12]=-x;te[1]=0;te[5]=2/h;te[9]=0;te[13]=-y;te[2]=0;te[6]=0;te[10]=-2/p;te[14]=-z;te[3]=0;te[7]=0;te[11]=0;te[15]=1;return this;},equals:function equals(matrix){var te=this.elements;var me=matrix.elements;for(var i=0;i<16;i++){if(te[i]!==me[i])return false;}return true;},fromArray:function fromArray(array){this.elements.set(array);return this;},toArray:function toArray(){var te=this.elements;return [te[0],te[1],te[2],te[3],te[4],te[5],te[6],te[7],te[8],te[9],te[10],te[11],te[12],te[13],te[14],te[15]];}}; // File:src/math/Ray.js
/**
 * @author bhouston / http://clara.io
 */THREE.Ray=function(origin,direction){this.origin=origin!==undefined?origin:new THREE.Vector3();this.direction=direction!==undefined?direction:new THREE.Vector3();};THREE.Ray.prototype={constructor:THREE.Ray,set:function set(origin,direction){this.origin.copy(origin);this.direction.copy(direction);return this;},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(ray){this.origin.copy(ray.origin);this.direction.copy(ray.direction);return this;},at:function at(t,optionalTarget){var result=optionalTarget||new THREE.Vector3();return result.copy(this.direction).multiplyScalar(t).add(this.origin);},recast:function(){var v1=new THREE.Vector3();return function(t){this.origin.copy(this.at(t,v1));return this;};}(),closestPointToPoint:function closestPointToPoint(point,optionalTarget){var result=optionalTarget||new THREE.Vector3();result.subVectors(point,this.origin);var directionDistance=result.dot(this.direction);if(directionDistance<0){return result.copy(this.origin);}return result.copy(this.direction).multiplyScalar(directionDistance).add(this.origin);},distanceToPoint:function distanceToPoint(point){return Math.sqrt(this.distanceSqToPoint(point));},distanceSqToPoint:function(){var v1=new THREE.Vector3();return function(point){var directionDistance=v1.subVectors(point,this.origin).dot(this.direction); // point behind the ray
if(directionDistance<0){return this.origin.distanceToSquared(point);}v1.copy(this.direction).multiplyScalar(directionDistance).add(this.origin);return v1.distanceToSquared(point);};}(),distanceSqToSegment:function(){var segCenter=new THREE.Vector3();var segDir=new THREE.Vector3();var diff=new THREE.Vector3();return function(v0,v1,optionalPointOnRay,optionalPointOnSegment){ // from http://www.geometrictools.com/LibMathematics/Distance/Wm5DistRay3Segment3.cpp
// It returns the min distance between the ray and the segment
// defined by v0 and v1
// It can also set two optional targets :
// - The closest point on the ray
// - The closest point on the segment
segCenter.copy(v0).add(v1).multiplyScalar(0.5);segDir.copy(v1).sub(v0).normalize();diff.copy(this.origin).sub(segCenter);var segExtent=v0.distanceTo(v1)*0.5;var a01=-this.direction.dot(segDir);var b0=diff.dot(this.direction);var b1=-diff.dot(segDir);var c=diff.lengthSq();var det=Math.abs(1-a01*a01);var s0,s1,sqrDist,extDet;if(det>0){ // The ray and segment are not parallel.
s0=a01*b1-b0;s1=a01*b0-b1;extDet=segExtent*det;if(s0>=0){if(s1>=-extDet){if(s1<=extDet){ // region 0
// Minimum at interior points of ray and segment.
var invDet=1/det;s0*=invDet;s1*=invDet;sqrDist=s0*(s0+a01*s1+2*b0)+s1*(a01*s0+s1+2*b1)+c;}else { // region 1
s1=segExtent;s0=Math.max(0,-(a01*s1+b0));sqrDist=-s0*s0+s1*(s1+2*b1)+c;}}else { // region 5
s1=-segExtent;s0=Math.max(0,-(a01*s1+b0));sqrDist=-s0*s0+s1*(s1+2*b1)+c;}}else {if(s1<=-extDet){ // region 4
s0=Math.max(0,-(-a01*segExtent+b0));s1=s0>0?-segExtent:Math.min(Math.max(-segExtent,-b1),segExtent);sqrDist=-s0*s0+s1*(s1+2*b1)+c;}else if(s1<=extDet){ // region 3
s0=0;s1=Math.min(Math.max(-segExtent,-b1),segExtent);sqrDist=s1*(s1+2*b1)+c;}else { // region 2
s0=Math.max(0,-(a01*segExtent+b0));s1=s0>0?segExtent:Math.min(Math.max(-segExtent,-b1),segExtent);sqrDist=-s0*s0+s1*(s1+2*b1)+c;}}}else { // Ray and segment are parallel.
s1=a01>0?-segExtent:segExtent;s0=Math.max(0,-(a01*s1+b0));sqrDist=-s0*s0+s1*(s1+2*b1)+c;}if(optionalPointOnRay){optionalPointOnRay.copy(this.direction).multiplyScalar(s0).add(this.origin);}if(optionalPointOnSegment){optionalPointOnSegment.copy(segDir).multiplyScalar(s1).add(segCenter);}return sqrDist;};}(),isIntersectionSphere:function isIntersectionSphere(sphere){return this.distanceToPoint(sphere.center)<=sphere.radius;},intersectSphere:function(){ // from http://www.scratchapixel.com/lessons/3d-basic-lessons/lesson-7-intersecting-simple-shapes/ray-sphere-intersection/
var v1=new THREE.Vector3();return function(sphere,optionalTarget){v1.subVectors(sphere.center,this.origin);var tca=v1.dot(this.direction);var d2=v1.dot(v1)-tca*tca;var radius2=sphere.radius*sphere.radius;if(d2>radius2)return null;var thc=Math.sqrt(radius2-d2); // t0 = first intersect point - entrance on front of sphere
var t0=tca-thc; // t1 = second intersect point - exit point on back of sphere
var t1=tca+thc; // test to see if both t0 and t1 are behind the ray - if so, return null
if(t0<0&&t1<0)return null; // test to see if t0 is behind the ray:
// if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
// in order to always return an intersect point that is in front of the ray.
if(t0<0)return this.at(t1,optionalTarget); // else t0 is in front of the ray, so return the first collision point scaled by t0
return this.at(t0,optionalTarget);};}(),isIntersectionPlane:function isIntersectionPlane(plane){ // check if the ray lies on the plane first
var distToPoint=plane.distanceToPoint(this.origin);if(distToPoint===0){return true;}var denominator=plane.normal.dot(this.direction);if(denominator*distToPoint<0){return true;} // ray origin is behind the plane (and is pointing behind it)
return false;},distanceToPlane:function distanceToPlane(plane){var denominator=plane.normal.dot(this.direction);if(denominator===0){ // line is coplanar, return origin
if(plane.distanceToPoint(this.origin)===0){return 0;} // Null is preferable to undefined since undefined means.... it is undefined
return null;}var t=-(this.origin.dot(plane.normal)+plane.constant)/denominator; // Return if the ray never intersects the plane
return t>=0?t:null;},intersectPlane:function intersectPlane(plane,optionalTarget){var t=this.distanceToPlane(plane);if(t===null){return null;}return this.at(t,optionalTarget);},isIntersectionBox:function(){var v=new THREE.Vector3();return function(box){return this.intersectBox(box,v)!==null;};}(),intersectBox:function intersectBox(box,optionalTarget){ // http://www.scratchapixel.com/lessons/3d-basic-lessons/lesson-7-intersecting-simple-shapes/ray-box-intersection/
var tmin,tmax,tymin,tymax,tzmin,tzmax;var invdirx=1/this.direction.x,invdiry=1/this.direction.y,invdirz=1/this.direction.z;var origin=this.origin;if(invdirx>=0){tmin=(box.min.x-origin.x)*invdirx;tmax=(box.max.x-origin.x)*invdirx;}else {tmin=(box.max.x-origin.x)*invdirx;tmax=(box.min.x-origin.x)*invdirx;}if(invdiry>=0){tymin=(box.min.y-origin.y)*invdiry;tymax=(box.max.y-origin.y)*invdiry;}else {tymin=(box.max.y-origin.y)*invdiry;tymax=(box.min.y-origin.y)*invdiry;}if(tmin>tymax||tymin>tmax)return null; // These lines also handle the case where tmin or tmax is NaN
// (result of 0 * Infinity). x !== x returns true if x is NaN
if(tymin>tmin||tmin!==tmin)tmin=tymin;if(tymax<tmax||tmax!==tmax)tmax=tymax;if(invdirz>=0){tzmin=(box.min.z-origin.z)*invdirz;tzmax=(box.max.z-origin.z)*invdirz;}else {tzmin=(box.max.z-origin.z)*invdirz;tzmax=(box.min.z-origin.z)*invdirz;}if(tmin>tzmax||tzmin>tmax)return null;if(tzmin>tmin||tmin!==tmin)tmin=tzmin;if(tzmax<tmax||tmax!==tmax)tmax=tzmax; //return point closest to the ray (positive side)
if(tmax<0)return null;return this.at(tmin>=0?tmin:tmax,optionalTarget);},intersectTriangle:function(){ // Compute the offset origin, edges, and normal.
var diff=new THREE.Vector3();var edge1=new THREE.Vector3();var edge2=new THREE.Vector3();var normal=new THREE.Vector3();return function(a,b,c,backfaceCulling,optionalTarget){ // from http://www.geometrictools.com/LibMathematics/Intersection/Wm5IntrRay3Triangle3.cpp
edge1.subVectors(b,a);edge2.subVectors(c,a);normal.crossVectors(edge1,edge2); // Solve Q + t*D = b1*E1 + b2*E2 (Q = kDiff, D = ray direction,
// E1 = kEdge1, E2 = kEdge2, N = Cross(E1,E2)) by
//   |Dot(D,N)|*b1 = sign(Dot(D,N))*Dot(D,Cross(Q,E2))
//   |Dot(D,N)|*b2 = sign(Dot(D,N))*Dot(D,Cross(E1,Q))
//   |Dot(D,N)|*t = -sign(Dot(D,N))*Dot(Q,N)
var DdN=this.direction.dot(normal);var sign;if(DdN>0){if(backfaceCulling)return null;sign=1;}else if(DdN<0){sign=-1;DdN=-DdN;}else {return null;}diff.subVectors(this.origin,a);var DdQxE2=sign*this.direction.dot(edge2.crossVectors(diff,edge2)); // b1 < 0, no intersection
if(DdQxE2<0){return null;}var DdE1xQ=sign*this.direction.dot(edge1.cross(diff)); // b2 < 0, no intersection
if(DdE1xQ<0){return null;} // b1+b2 > 1, no intersection
if(DdQxE2+DdE1xQ>DdN){return null;} // Line intersects triangle, check if ray does.
var QdN=-sign*diff.dot(normal); // t < 0, no intersection
if(QdN<0){return null;} // Ray intersects triangle.
return this.at(QdN/DdN,optionalTarget);};}(),applyMatrix4:function applyMatrix4(matrix4){this.direction.add(this.origin).applyMatrix4(matrix4);this.origin.applyMatrix4(matrix4);this.direction.sub(this.origin);this.direction.normalize();return this;},equals:function equals(ray){return ray.origin.equals(this.origin)&&ray.direction.equals(this.direction);}}; // File:src/math/Sphere.js
/**
 * @author bhouston / http://clara.io
 * @author mrdoob / http://mrdoob.com/
 */THREE.Sphere=function(center,radius){this.center=center!==undefined?center:new THREE.Vector3();this.radius=radius!==undefined?radius:0;};THREE.Sphere.prototype={constructor:THREE.Sphere,set:function set(center,radius){this.center.copy(center);this.radius=radius;return this;},setFromPoints:function(){var box=new THREE.Box3();return function(points,optionalCenter){var center=this.center;if(optionalCenter!==undefined){center.copy(optionalCenter);}else {box.setFromPoints(points).center(center);}var maxRadiusSq=0;for(var i=0,il=points.length;i<il;i++){maxRadiusSq=Math.max(maxRadiusSq,center.distanceToSquared(points[i]));}this.radius=Math.sqrt(maxRadiusSq);return this;};}(),clone:function clone(){return new this.constructor().copy(this);},copy:function copy(sphere){this.center.copy(sphere.center);this.radius=sphere.radius;return this;},empty:function empty(){return this.radius<=0;},containsPoint:function containsPoint(point){return point.distanceToSquared(this.center)<=this.radius*this.radius;},distanceToPoint:function distanceToPoint(point){return point.distanceTo(this.center)-this.radius;},intersectsSphere:function intersectsSphere(sphere){var radiusSum=this.radius+sphere.radius;return sphere.center.distanceToSquared(this.center)<=radiusSum*radiusSum;},clampPoint:function clampPoint(point,optionalTarget){var deltaLengthSq=this.center.distanceToSquared(point);var result=optionalTarget||new THREE.Vector3();result.copy(point);if(deltaLengthSq>this.radius*this.radius){result.sub(this.center).normalize();result.multiplyScalar(this.radius).add(this.center);}return result;},getBoundingBox:function getBoundingBox(optionalTarget){var box=optionalTarget||new THREE.Box3();box.set(this.center,this.center);box.expandByScalar(this.radius);return box;},applyMatrix4:function applyMatrix4(matrix){this.center.applyMatrix4(matrix);this.radius=this.radius*matrix.getMaxScaleOnAxis();return this;},translate:function translate(offset){this.center.add(offset);return this;},equals:function equals(sphere){return sphere.center.equals(this.center)&&sphere.radius===this.radius;}}; // File:src/math/Frustum.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author bhouston / http://clara.io
 */THREE.Frustum=function(p0,p1,p2,p3,p4,p5){this.planes=[p0!==undefined?p0:new THREE.Plane(),p1!==undefined?p1:new THREE.Plane(),p2!==undefined?p2:new THREE.Plane(),p3!==undefined?p3:new THREE.Plane(),p4!==undefined?p4:new THREE.Plane(),p5!==undefined?p5:new THREE.Plane()];};THREE.Frustum.prototype={constructor:THREE.Frustum,set:function set(p0,p1,p2,p3,p4,p5){var planes=this.planes;planes[0].copy(p0);planes[1].copy(p1);planes[2].copy(p2);planes[3].copy(p3);planes[4].copy(p4);planes[5].copy(p5);return this;},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(frustum){var planes=this.planes;for(var i=0;i<6;i++){planes[i].copy(frustum.planes[i]);}return this;},setFromMatrix:function setFromMatrix(m){var planes=this.planes;var me=m.elements;var me0=me[0],me1=me[1],me2=me[2],me3=me[3];var me4=me[4],me5=me[5],me6=me[6],me7=me[7];var me8=me[8],me9=me[9],me10=me[10],me11=me[11];var me12=me[12],me13=me[13],me14=me[14],me15=me[15];planes[0].setComponents(me3-me0,me7-me4,me11-me8,me15-me12).normalize();planes[1].setComponents(me3+me0,me7+me4,me11+me8,me15+me12).normalize();planes[2].setComponents(me3+me1,me7+me5,me11+me9,me15+me13).normalize();planes[3].setComponents(me3-me1,me7-me5,me11-me9,me15-me13).normalize();planes[4].setComponents(me3-me2,me7-me6,me11-me10,me15-me14).normalize();planes[5].setComponents(me3+me2,me7+me6,me11+me10,me15+me14).normalize();return this;},intersectsObject:function(){var sphere=new THREE.Sphere();return function(object){var geometry=object.geometry;if(geometry.boundingSphere===null)geometry.computeBoundingSphere();sphere.copy(geometry.boundingSphere);sphere.applyMatrix4(object.matrixWorld);return this.intersectsSphere(sphere);};}(),intersectsSphere:function intersectsSphere(sphere){var planes=this.planes;var center=sphere.center;var negRadius=-sphere.radius;for(var i=0;i<6;i++){var distance=planes[i].distanceToPoint(center);if(distance<negRadius){return false;}}return true;},intersectsBox:function(){var p1=new THREE.Vector3(),p2=new THREE.Vector3();return function(box){var planes=this.planes;for(var i=0;i<6;i++){var plane=planes[i];p1.x=plane.normal.x>0?box.min.x:box.max.x;p2.x=plane.normal.x>0?box.max.x:box.min.x;p1.y=plane.normal.y>0?box.min.y:box.max.y;p2.y=plane.normal.y>0?box.max.y:box.min.y;p1.z=plane.normal.z>0?box.min.z:box.max.z;p2.z=plane.normal.z>0?box.max.z:box.min.z;var d1=plane.distanceToPoint(p1);var d2=plane.distanceToPoint(p2); // if both outside plane, no intersection
if(d1<0&&d2<0){return false;}}return true;};}(),containsPoint:function containsPoint(point){var planes=this.planes;for(var i=0;i<6;i++){if(planes[i].distanceToPoint(point)<0){return false;}}return true;}}; // File:src/math/Plane.js
/**
 * @author bhouston / http://clara.io
 */THREE.Plane=function(normal,constant){this.normal=normal!==undefined?normal:new THREE.Vector3(1,0,0);this.constant=constant!==undefined?constant:0;};THREE.Plane.prototype={constructor:THREE.Plane,set:function set(normal,constant){this.normal.copy(normal);this.constant=constant;return this;},setComponents:function setComponents(x,y,z,w){this.normal.set(x,y,z);this.constant=w;return this;},setFromNormalAndCoplanarPoint:function setFromNormalAndCoplanarPoint(normal,point){this.normal.copy(normal);this.constant=-point.dot(this.normal); // must be this.normal, not normal, as this.normal is normalized
return this;},setFromCoplanarPoints:function(){var v1=new THREE.Vector3();var v2=new THREE.Vector3();return function(a,b,c){var normal=v1.subVectors(c,b).cross(v2.subVectors(a,b)).normalize(); // Q: should an error be thrown if normal is zero (e.g. degenerate plane)?
this.setFromNormalAndCoplanarPoint(normal,a);return this;};}(),clone:function clone(){return new this.constructor().copy(this);},copy:function copy(plane){this.normal.copy(plane.normal);this.constant=plane.constant;return this;},normalize:function normalize(){ // Note: will lead to a divide by zero if the plane is invalid.
var inverseNormalLength=1.0/this.normal.length();this.normal.multiplyScalar(inverseNormalLength);this.constant*=inverseNormalLength;return this;},negate:function negate(){this.constant*=-1;this.normal.negate();return this;},distanceToPoint:function distanceToPoint(point){return this.normal.dot(point)+this.constant;},distanceToSphere:function distanceToSphere(sphere){return this.distanceToPoint(sphere.center)-sphere.radius;},projectPoint:function projectPoint(point,optionalTarget){return this.orthoPoint(point,optionalTarget).sub(point).negate();},orthoPoint:function orthoPoint(point,optionalTarget){var perpendicularMagnitude=this.distanceToPoint(point);var result=optionalTarget||new THREE.Vector3();return result.copy(this.normal).multiplyScalar(perpendicularMagnitude);},isIntersectionLine:function isIntersectionLine(line){ // Note: this tests if a line intersects the plane, not whether it (or its end-points) are coplanar with it.
var startSign=this.distanceToPoint(line.start);var endSign=this.distanceToPoint(line.end);return startSign<0&&endSign>0||endSign<0&&startSign>0;},intersectLine:function(){var v1=new THREE.Vector3();return function(line,optionalTarget){var result=optionalTarget||new THREE.Vector3();var direction=line.delta(v1);var denominator=this.normal.dot(direction);if(denominator===0){ // line is coplanar, return origin
if(this.distanceToPoint(line.start)===0){return result.copy(line.start);} // Unsure if this is the correct method to handle this case.
return undefined;}var t=-(line.start.dot(this.normal)+this.constant)/denominator;if(t<0||t>1){return undefined;}return result.copy(direction).multiplyScalar(t).add(line.start);};}(),coplanarPoint:function coplanarPoint(optionalTarget){var result=optionalTarget||new THREE.Vector3();return result.copy(this.normal).multiplyScalar(-this.constant);},applyMatrix4:function(){var v1=new THREE.Vector3();var v2=new THREE.Vector3();var m1=new THREE.Matrix3();return function(matrix,optionalNormalMatrix){ // compute new normal based on theory here:
// http://www.songho.ca/opengl/gl_normaltransform.html
var normalMatrix=optionalNormalMatrix||m1.getNormalMatrix(matrix);var newNormal=v1.copy(this.normal).applyMatrix3(normalMatrix);var newCoplanarPoint=this.coplanarPoint(v2);newCoplanarPoint.applyMatrix4(matrix);this.setFromNormalAndCoplanarPoint(newNormal,newCoplanarPoint);return this;};}(),translate:function translate(offset){this.constant=this.constant-offset.dot(this.normal);return this;},equals:function equals(plane){return plane.normal.equals(this.normal)&&plane.constant===this.constant;}}; // File:src/math/Math.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */THREE.Math={generateUUID:function(){ // http://www.broofa.com/Tools/Math.uuid.htm
var chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');var uuid=new Array(36);var rnd=0,r;return function(){for(var i=0;i<36;i++){if(i===8||i===13||i===18||i===23){uuid[i]='-';}else if(i===14){uuid[i]='4';}else {if(rnd<=0x02)rnd=0x2000000+Math.random()*0x1000000|0;r=rnd&0xf;rnd=rnd>>4;uuid[i]=chars[i===19?r&0x3|0x8:r];}}return uuid.join('');};}(),clamp:function clamp(value,min,max){return Math.max(min,Math.min(max,value));}, // compute euclidian modulo of m % n
// https://en.wikipedia.org/wiki/Modulo_operation
euclideanModulo:function euclideanModulo(n,m){return (n%m+m)%m;}, // Linear mapping from range <a1, a2> to range <b1, b2>
mapLinear:function mapLinear(x,a1,a2,b1,b2){return b1+(x-a1)*(b2-b1)/(a2-a1);}, // http://en.wikipedia.org/wiki/Smoothstep
smoothstep:function smoothstep(x,min,max){if(x<=min)return 0;if(x>=max)return 1;x=(x-min)/(max-min);return x*x*(3-2*x);},smootherstep:function smootherstep(x,min,max){if(x<=min)return 0;if(x>=max)return 1;x=(x-min)/(max-min);return x*x*x*(x*(x*6-15)+10);}, // Random float from <0, 1> with 16 bits of randomness
// (standard Math.random() creates repetitive patterns when applied over larger space)
random16:function random16(){return (65280*Math.random()+255*Math.random())/65535;}, // Random integer from <low, high> interval
randInt:function randInt(low,high){return low+Math.floor(Math.random()*(high-low+1));}, // Random float from <low, high> interval
randFloat:function randFloat(low,high){return low+Math.random()*(high-low);}, // Random float from <-range/2, range/2> interval
randFloatSpread:function randFloatSpread(range){return range*(0.5-Math.random());},degToRad:function(){var degreeToRadiansFactor=Math.PI/180;return function(degrees){return degrees*degreeToRadiansFactor;};}(),radToDeg:function(){var radianToDegreesFactor=180/Math.PI;return function(radians){return radians*radianToDegreesFactor;};}(),isPowerOfTwo:function isPowerOfTwo(value){return (value&value-1)===0&&value!==0;},nearestPowerOfTwo:function nearestPowerOfTwo(value){return Math.pow(2,Math.round(Math.log(value)/Math.LN2));},nextPowerOfTwo:function nextPowerOfTwo(value){value--;value|=value>>1;value|=value>>2;value|=value>>4;value|=value>>8;value|=value>>16;value++;return value;}}; // File:src/math/Spline.js
/**
 * Spline from Tween.js, slightly optimized (and trashed)
 * http://sole.github.com/tween.js/examples/05_spline.html
 *
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */THREE.Spline=function(points){this.points=points;var c=[],v3={x:0,y:0,z:0},point,intPoint,weight,w2,w3,pa,pb,pc,pd;this.initFromArray=function(a){this.points=[];for(var i=0;i<a.length;i++){this.points[i]={x:a[i][0],y:a[i][1],z:a[i][2]};}};this.getPoint=function(k){point=(this.points.length-1)*k;intPoint=Math.floor(point);weight=point-intPoint;c[0]=intPoint===0?intPoint:intPoint-1;c[1]=intPoint;c[2]=intPoint>this.points.length-2?this.points.length-1:intPoint+1;c[3]=intPoint>this.points.length-3?this.points.length-1:intPoint+2;pa=this.points[c[0]];pb=this.points[c[1]];pc=this.points[c[2]];pd=this.points[c[3]];w2=weight*weight;w3=weight*w2;v3.x=interpolate(pa.x,pb.x,pc.x,pd.x,weight,w2,w3);v3.y=interpolate(pa.y,pb.y,pc.y,pd.y,weight,w2,w3);v3.z=interpolate(pa.z,pb.z,pc.z,pd.z,weight,w2,w3);return v3;};this.getControlPointsArray=function(){var i,p,l=this.points.length,coords=[];for(i=0;i<l;i++){p=this.points[i];coords[i]=[p.x,p.y,p.z];}return coords;}; // approximate length by summing linear segments
this.getLength=function(nSubDivisions){var i,index,nSamples,position,point=0,intPoint=0,oldIntPoint=0,oldPosition=new THREE.Vector3(),tmpVec=new THREE.Vector3(),chunkLengths=[],totalLength=0; // first point has 0 length
chunkLengths[0]=0;if(!nSubDivisions)nSubDivisions=100;nSamples=this.points.length*nSubDivisions;oldPosition.copy(this.points[0]);for(i=1;i<nSamples;i++){index=i/nSamples;position=this.getPoint(index);tmpVec.copy(position);totalLength+=tmpVec.distanceTo(oldPosition);oldPosition.copy(position);point=(this.points.length-1)*index;intPoint=Math.floor(point);if(intPoint!==oldIntPoint){chunkLengths[intPoint]=totalLength;oldIntPoint=intPoint;}} // last point ends with total length
chunkLengths[chunkLengths.length]=totalLength;return {chunks:chunkLengths,total:totalLength};};this.reparametrizeByArcLength=function(samplingCoef){var i,j,index,indexCurrent,indexNext,realDistance,sampling,position,newpoints=[],tmpVec=new THREE.Vector3(),sl=this.getLength();newpoints.push(tmpVec.copy(this.points[0]).clone());for(i=1;i<this.points.length;i++){ //tmpVec.copy( this.points[ i - 1 ] );
//linearDistance = tmpVec.distanceTo( this.points[ i ] );
realDistance=sl.chunks[i]-sl.chunks[i-1];sampling=Math.ceil(samplingCoef*realDistance/sl.total);indexCurrent=(i-1)/(this.points.length-1);indexNext=i/(this.points.length-1);for(j=1;j<sampling-1;j++){index=indexCurrent+j*(1/sampling)*(indexNext-indexCurrent);position=this.getPoint(index);newpoints.push(tmpVec.copy(position).clone());}newpoints.push(tmpVec.copy(this.points[i]).clone());}this.points=newpoints;}; // Catmull-Rom
function interpolate(p0,p1,p2,p3,t,t2,t3){var v0=(p2-p0)*0.5,v1=(p3-p1)*0.5;return (2*(p1-p2)+v0+v1)*t3+(-3*(p1-p2)-2*v0-v1)*t2+v0*t+p1;}}; // File:src/math/Triangle.js
/**
 * @author bhouston / http://clara.io
 * @author mrdoob / http://mrdoob.com/
 */THREE.Triangle=function(a,b,c){this.a=a!==undefined?a:new THREE.Vector3();this.b=b!==undefined?b:new THREE.Vector3();this.c=c!==undefined?c:new THREE.Vector3();};THREE.Triangle.normal=function(){var v0=new THREE.Vector3();return function(a,b,c,optionalTarget){var result=optionalTarget||new THREE.Vector3();result.subVectors(c,b);v0.subVectors(a,b);result.cross(v0);var resultLengthSq=result.lengthSq();if(resultLengthSq>0){return result.multiplyScalar(1/Math.sqrt(resultLengthSq));}return result.set(0,0,0);};}(); // static/instance method to calculate barycentric coordinates
// based on: http://www.blackpawn.com/texts/pointinpoly/default.html
THREE.Triangle.barycoordFromPoint=function(){var v0=new THREE.Vector3();var v1=new THREE.Vector3();var v2=new THREE.Vector3();return function(point,a,b,c,optionalTarget){v0.subVectors(c,a);v1.subVectors(b,a);v2.subVectors(point,a);var dot00=v0.dot(v0);var dot01=v0.dot(v1);var dot02=v0.dot(v2);var dot11=v1.dot(v1);var dot12=v1.dot(v2);var denom=dot00*dot11-dot01*dot01;var result=optionalTarget||new THREE.Vector3(); // collinear or singular triangle
if(denom===0){ // arbitrary location outside of triangle?
// not sure if this is the best idea, maybe should be returning undefined
return result.set(-2,-1,-1);}var invDenom=1/denom;var u=(dot11*dot02-dot01*dot12)*invDenom;var v=(dot00*dot12-dot01*dot02)*invDenom; // barycentric coordinates must always sum to 1
return result.set(1-u-v,v,u);};}();THREE.Triangle.containsPoint=function(){var v1=new THREE.Vector3();return function(point,a,b,c){var result=THREE.Triangle.barycoordFromPoint(point,a,b,c,v1);return result.x>=0&&result.y>=0&&result.x+result.y<=1;};}();THREE.Triangle.prototype={constructor:THREE.Triangle,set:function set(a,b,c){this.a.copy(a);this.b.copy(b);this.c.copy(c);return this;},setFromPointsAndIndices:function setFromPointsAndIndices(points,i0,i1,i2){this.a.copy(points[i0]);this.b.copy(points[i1]);this.c.copy(points[i2]);return this;},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(triangle){this.a.copy(triangle.a);this.b.copy(triangle.b);this.c.copy(triangle.c);return this;},area:function(){var v0=new THREE.Vector3();var v1=new THREE.Vector3();return function(){v0.subVectors(this.c,this.b);v1.subVectors(this.a,this.b);return v0.cross(v1).length()*0.5;};}(),midpoint:function midpoint(optionalTarget){var result=optionalTarget||new THREE.Vector3();return result.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3);},normal:function normal(optionalTarget){return THREE.Triangle.normal(this.a,this.b,this.c,optionalTarget);},plane:function plane(optionalTarget){var result=optionalTarget||new THREE.Plane();return result.setFromCoplanarPoints(this.a,this.b,this.c);},barycoordFromPoint:function barycoordFromPoint(point,optionalTarget){return THREE.Triangle.barycoordFromPoint(point,this.a,this.b,this.c,optionalTarget);},containsPoint:function containsPoint(point){return THREE.Triangle.containsPoint(point,this.a,this.b,this.c);},equals:function equals(triangle){return triangle.a.equals(this.a)&&triangle.b.equals(this.b)&&triangle.c.equals(this.c);}}; // File:src/core/Channels.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.Channels=function(){this.mask=1;};THREE.Channels.prototype={constructor:THREE.Channels,set:function set(channel){this.mask=1<<channel;},enable:function enable(channel){this.mask|=1<<channel;},toggle:function toggle(channel){this.mask^=1<<channel;},disable:function disable(channel){this.mask&=~(1<<channel);}}; // File:src/core/Clock.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.Clock=function(autoStart){this.autoStart=autoStart!==undefined?autoStart:true;this.startTime=0;this.oldTime=0;this.elapsedTime=0;this.running=false;};THREE.Clock.prototype={constructor:THREE.Clock,start:function start(){this.startTime=self.performance.now();this.oldTime=this.startTime;this.running=true;},stop:function stop(){this.getElapsedTime();this.running=false;},getElapsedTime:function getElapsedTime(){this.getDelta();return this.elapsedTime;},getDelta:function getDelta(){var diff=0;if(this.autoStart&&!this.running){this.start();}if(this.running){var newTime=self.performance.now();diff=0.001*(newTime-this.oldTime);this.oldTime=newTime;this.elapsedTime+=diff;}return diff;}}; // File:src/core/EventDispatcher.js
/**
 * https://github.com/mrdoob/eventdispatcher.js/
 */THREE.EventDispatcher=function(){};THREE.EventDispatcher.prototype={constructor:THREE.EventDispatcher,apply:function apply(object){object.addEventListener=THREE.EventDispatcher.prototype.addEventListener;object.hasEventListener=THREE.EventDispatcher.prototype.hasEventListener;object.removeEventListener=THREE.EventDispatcher.prototype.removeEventListener;object.dispatchEvent=THREE.EventDispatcher.prototype.dispatchEvent;},addEventListener:function addEventListener(type,listener){if(this._listeners===undefined)this._listeners={};var listeners=this._listeners;if(listeners[type]===undefined){listeners[type]=[];}if(listeners[type].indexOf(listener)===-1){listeners[type].push(listener);}},hasEventListener:function hasEventListener(type,listener){if(this._listeners===undefined)return false;var listeners=this._listeners;if(listeners[type]!==undefined&&listeners[type].indexOf(listener)!==-1){return true;}return false;},removeEventListener:function removeEventListener(type,listener){if(this._listeners===undefined)return;var listeners=this._listeners;var listenerArray=listeners[type];if(listenerArray!==undefined){var index=listenerArray.indexOf(listener);if(index!==-1){listenerArray.splice(index,1);}}},dispatchEvent:function dispatchEvent(event){if(this._listeners===undefined)return;var listeners=this._listeners;var listenerArray=listeners[event.type];if(listenerArray!==undefined){event.target=this;var array=[];var length=listenerArray.length;for(var i=0;i<length;i++){array[i]=listenerArray[i];}for(var i=0;i<length;i++){array[i].call(this,event);}}}}; // File:src/core/Raycaster.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author bhouston / http://clara.io/
 * @author stephomi / http://stephaneginier.com/
 */(function(THREE){THREE.Raycaster=function(origin,direction,near,far){this.ray=new THREE.Ray(origin,direction); // direction is assumed to be normalized (for accurate distance calculations)
this.near=near||0;this.far=far||Infinity;this.params={Mesh:{},Line:{},LOD:{},Points:{threshold:1},Sprite:{}};Object.defineProperties(this.params,{PointCloud:{get:function get(){console.warn('THREE.Raycaster: params.PointCloud has been renamed to params.Points.');return this.Points;}}});};function descSort(a,b){return a.distance-b.distance;}function _intersectObject(object,raycaster,intersects,recursive){if(object.visible===false)return;object.raycast(raycaster,intersects);if(recursive===true){var children=object.children;for(var i=0,l=children.length;i<l;i++){_intersectObject(children[i],raycaster,intersects,true);}}} //
THREE.Raycaster.prototype={constructor:THREE.Raycaster,linePrecision:1,set:function set(origin,direction){ // direction is assumed to be normalized (for accurate distance calculations)
this.ray.set(origin,direction);},setFromCamera:function setFromCamera(coords,camera){if(camera instanceof THREE.PerspectiveCamera){this.ray.origin.setFromMatrixPosition(camera.matrixWorld);this.ray.direction.set(coords.x,coords.y,0.5).unproject(camera).sub(this.ray.origin).normalize();}else if(camera instanceof THREE.OrthographicCamera){this.ray.origin.set(coords.x,coords.y,-1).unproject(camera);this.ray.direction.set(0,0,-1).transformDirection(camera.matrixWorld);}else {console.error('THREE.Raycaster: Unsupported camera type.');}},intersectObject:function intersectObject(object,recursive){var intersects=[];_intersectObject(object,this,intersects,recursive);intersects.sort(descSort);return intersects;},intersectObjects:function intersectObjects(objects,recursive){var intersects=[];if(Array.isArray(objects)===false){console.warn('THREE.Raycaster.intersectObjects: objects is not an Array.');return intersects;}for(var i=0,l=objects.length;i<l;i++){_intersectObject(objects[i],this,intersects,recursive);}intersects.sort(descSort);return intersects;}};})(THREE); // File:src/core/Object3D.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author elephantatwork / www.elephantatwork.ch
 */THREE.Object3D=function(){Object.defineProperty(this,'id',{value:THREE.Object3DIdCount++});this.uuid=THREE.Math.generateUUID();this.name='';this.type='Object3D';this.parent=null;this.channels=new THREE.Channels();this.children=[];this.up=THREE.Object3D.DefaultUp.clone();var position=new THREE.Vector3();var rotation=new THREE.Euler();var quaternion=new THREE.Quaternion();var scale=new THREE.Vector3(1,1,1);function onRotationChange(){quaternion.setFromEuler(rotation,false);}function onQuaternionChange(){rotation.setFromQuaternion(quaternion,undefined,false);}rotation.onChange(onRotationChange);quaternion.onChange(onQuaternionChange);Object.defineProperties(this,{position:{enumerable:true,value:position},rotation:{enumerable:true,value:rotation},quaternion:{enumerable:true,value:quaternion},scale:{enumerable:true,value:scale},modelViewMatrix:{value:new THREE.Matrix4()},normalMatrix:{value:new THREE.Matrix3()}});this.rotationAutoUpdate=true;this.matrix=new THREE.Matrix4();this.matrixWorld=new THREE.Matrix4();this.matrixAutoUpdate=THREE.Object3D.DefaultMatrixAutoUpdate;this.matrixWorldNeedsUpdate=false;this.visible=true;this.castShadow=false;this.receiveShadow=false;this.frustumCulled=true;this.renderOrder=0;this.userData={};};THREE.Object3D.DefaultUp=new THREE.Vector3(0,1,0);THREE.Object3D.DefaultMatrixAutoUpdate=true;THREE.Object3D.prototype={constructor:THREE.Object3D,get eulerOrder(){console.warn('THREE.Object3D: .eulerOrder is now .rotation.order.');return this.rotation.order;},set eulerOrder(value){console.warn('THREE.Object3D: .eulerOrder is now .rotation.order.');this.rotation.order=value;},get useQuaternion(){console.warn('THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.');},set useQuaternion(value){console.warn('THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.');},set renderDepth(value){console.warn('THREE.Object3D: .renderDepth has been removed. Use .renderOrder, instead.');}, //
applyMatrix:function applyMatrix(matrix){this.matrix.multiplyMatrices(matrix,this.matrix);this.matrix.decompose(this.position,this.quaternion,this.scale);},setRotationFromAxisAngle:function setRotationFromAxisAngle(axis,angle){ // assumes axis is normalized
this.quaternion.setFromAxisAngle(axis,angle);},setRotationFromEuler:function setRotationFromEuler(euler){this.quaternion.setFromEuler(euler,true);},setRotationFromMatrix:function setRotationFromMatrix(m){ // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
this.quaternion.setFromRotationMatrix(m);},setRotationFromQuaternion:function setRotationFromQuaternion(q){ // assumes q is normalized
this.quaternion.copy(q);},rotateOnAxis:function(){ // rotate object on axis in object space
// axis is assumed to be normalized
var q1=new THREE.Quaternion();return function(axis,angle){q1.setFromAxisAngle(axis,angle);this.quaternion.multiply(q1);return this;};}(),rotateX:function(){var v1=new THREE.Vector3(1,0,0);return function(angle){return this.rotateOnAxis(v1,angle);};}(),rotateY:function(){var v1=new THREE.Vector3(0,1,0);return function(angle){return this.rotateOnAxis(v1,angle);};}(),rotateZ:function(){var v1=new THREE.Vector3(0,0,1);return function(angle){return this.rotateOnAxis(v1,angle);};}(),translateOnAxis:function(){ // translate object by distance along axis in object space
// axis is assumed to be normalized
var v1=new THREE.Vector3();return function(axis,distance){v1.copy(axis).applyQuaternion(this.quaternion);this.position.add(v1.multiplyScalar(distance));return this;};}(),translate:function translate(distance,axis){console.warn('THREE.Object3D: .translate() has been removed. Use .translateOnAxis( axis, distance ) instead.');return this.translateOnAxis(axis,distance);},translateX:function(){var v1=new THREE.Vector3(1,0,0);return function(distance){return this.translateOnAxis(v1,distance);};}(),translateY:function(){var v1=new THREE.Vector3(0,1,0);return function(distance){return this.translateOnAxis(v1,distance);};}(),translateZ:function(){var v1=new THREE.Vector3(0,0,1);return function(distance){return this.translateOnAxis(v1,distance);};}(),localToWorld:function localToWorld(vector){return vector.applyMatrix4(this.matrixWorld);},worldToLocal:function(){var m1=new THREE.Matrix4();return function(vector){return vector.applyMatrix4(m1.getInverse(this.matrixWorld));};}(),lookAt:function(){ // This routine does not support objects with rotated and/or translated parent(s)
var m1=new THREE.Matrix4();return function(vector){m1.lookAt(vector,this.position,this.up);this.quaternion.setFromRotationMatrix(m1);};}(),add:function add(object){if(arguments.length>1){for(var i=0;i<arguments.length;i++){this.add(arguments[i]);}return this;}if(object===this){console.error("THREE.Object3D.add: object can't be added as a child of itself.",object);return this;}if(object instanceof THREE.Object3D){if(object.parent!==null){object.parent.remove(object);}object.parent=this;object.dispatchEvent({type:'added'});this.children.push(object);}else {console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",object);}return this;},remove:function remove(object){if(arguments.length>1){for(var i=0;i<arguments.length;i++){this.remove(arguments[i]);}}var index=this.children.indexOf(object);if(index!==-1){object.parent=null;object.dispatchEvent({type:'removed'});this.children.splice(index,1);}},getChildByName:function getChildByName(name){console.warn('THREE.Object3D: .getChildByName() has been renamed to .getObjectByName().');return this.getObjectByName(name);},getObjectById:function getObjectById(id){return this.getObjectByProperty('id',id);},getObjectByName:function getObjectByName(name){return this.getObjectByProperty('name',name);},getObjectByProperty:function getObjectByProperty(name,value){if(this[name]===value)return this;for(var i=0,l=this.children.length;i<l;i++){var child=this.children[i];var object=child.getObjectByProperty(name,value);if(object!==undefined){return object;}}return undefined;},getWorldPosition:function getWorldPosition(optionalTarget){var result=optionalTarget||new THREE.Vector3();this.updateMatrixWorld(true);return result.setFromMatrixPosition(this.matrixWorld);},getWorldQuaternion:function(){var position=new THREE.Vector3();var scale=new THREE.Vector3();return function(optionalTarget){var result=optionalTarget||new THREE.Quaternion();this.updateMatrixWorld(true);this.matrixWorld.decompose(position,result,scale);return result;};}(),getWorldRotation:function(){var quaternion=new THREE.Quaternion();return function(optionalTarget){var result=optionalTarget||new THREE.Euler();this.getWorldQuaternion(quaternion);return result.setFromQuaternion(quaternion,this.rotation.order,false);};}(),getWorldScale:function(){var position=new THREE.Vector3();var quaternion=new THREE.Quaternion();return function(optionalTarget){var result=optionalTarget||new THREE.Vector3();this.updateMatrixWorld(true);this.matrixWorld.decompose(position,quaternion,result);return result;};}(),getWorldDirection:function(){var quaternion=new THREE.Quaternion();return function(optionalTarget){var result=optionalTarget||new THREE.Vector3();this.getWorldQuaternion(quaternion);return result.set(0,0,1).applyQuaternion(quaternion);};}(),raycast:function raycast(){},traverse:function traverse(callback){callback(this);var children=this.children;for(var i=0,l=children.length;i<l;i++){children[i].traverse(callback);}},traverseVisible:function traverseVisible(callback){if(this.visible===false)return;callback(this);var children=this.children;for(var i=0,l=children.length;i<l;i++){children[i].traverseVisible(callback);}},traverseAncestors:function traverseAncestors(callback){var parent=this.parent;if(parent!==null){callback(parent);parent.traverseAncestors(callback);}},updateMatrix:function updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);this.matrixWorldNeedsUpdate=true;},updateMatrixWorld:function updateMatrixWorld(force){if(this.matrixAutoUpdate===true)this.updateMatrix();if(this.matrixWorldNeedsUpdate===true||force===true){if(this.parent===null){this.matrixWorld.copy(this.matrix);}else {this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);}this.matrixWorldNeedsUpdate=false;force=true;} // update children
for(var i=0,l=this.children.length;i<l;i++){this.children[i].updateMatrixWorld(force);}},toJSON:function toJSON(meta){var isRootObject=meta===undefined;var output={}; // meta is a hash used to collect geometries, materials.
// not providing it implies that this is the root object
// being serialized.
if(isRootObject){ // initialize meta obj
meta={geometries:{},materials:{},textures:{},images:{}};output.metadata={version:4.4,type:'Object',generator:'Object3D.toJSON'};} // standard Object3D serialization
var object={};object.uuid=this.uuid;object.type=this.type;if(this.name!=='')object.name=this.name;if(JSON.stringify(this.userData)!=='{}')object.userData=this.userData;if(this.castShadow===true)object.castShadow=true;if(this.receiveShadow===true)object.receiveShadow=true;if(this.visible===false)object.visible=false;object.matrix=this.matrix.toArray(); //
if(this.geometry!==undefined){if(meta.geometries[this.geometry.uuid]===undefined){meta.geometries[this.geometry.uuid]=this.geometry.toJSON(meta);}object.geometry=this.geometry.uuid;}if(this.material!==undefined){if(meta.materials[this.material.uuid]===undefined){meta.materials[this.material.uuid]=this.material.toJSON(meta);}object.material=this.material.uuid;} //
if(this.children.length>0){object.children=[];for(var i=0;i<this.children.length;i++){object.children.push(this.children[i].toJSON(meta).object);}}if(isRootObject){var geometries=extractFromCache(meta.geometries);var materials=extractFromCache(meta.materials);var textures=extractFromCache(meta.textures);var images=extractFromCache(meta.images);if(geometries.length>0)output.geometries=geometries;if(materials.length>0)output.materials=materials;if(textures.length>0)output.textures=textures;if(images.length>0)output.images=images;}output.object=object;return output; // extract data from the cache hash
// remove metadata on each item
// and return as array
function extractFromCache(cache){var values=[];for(var key in cache){var data=cache[key];delete data.metadata;values.push(data);}return values;}},clone:function clone(recursive){return new this.constructor().copy(this,recursive);},copy:function copy(source,recursive){if(recursive===undefined)recursive=true;this.name=source.name;this.up.copy(source.up);this.position.copy(source.position);this.quaternion.copy(source.quaternion);this.scale.copy(source.scale);this.rotationAutoUpdate=source.rotationAutoUpdate;this.matrix.copy(source.matrix);this.matrixWorld.copy(source.matrixWorld);this.matrixAutoUpdate=source.matrixAutoUpdate;this.matrixWorldNeedsUpdate=source.matrixWorldNeedsUpdate;this.visible=source.visible;this.castShadow=source.castShadow;this.receiveShadow=source.receiveShadow;this.frustumCulled=source.frustumCulled;this.renderOrder=source.renderOrder;this.userData=JSON.parse(JSON.stringify(source.userData));if(recursive===true){for(var i=0;i<source.children.length;i++){var child=source.children[i];this.add(child.clone());}}return this;}};THREE.EventDispatcher.prototype.apply(THREE.Object3D.prototype);THREE.Object3DIdCount=0; // File:src/core/Face3.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */THREE.Face3=function(a,b,c,normal,color,materialIndex){this.a=a;this.b=b;this.c=c;this.normal=normal instanceof THREE.Vector3?normal:new THREE.Vector3();this.vertexNormals=Array.isArray(normal)?normal:[];this.color=color instanceof THREE.Color?color:new THREE.Color();this.vertexColors=Array.isArray(color)?color:[];this.materialIndex=materialIndex!==undefined?materialIndex:0;};THREE.Face3.prototype={constructor:THREE.Face3,clone:function clone(){return new this.constructor().copy(this);},copy:function copy(source){this.a=source.a;this.b=source.b;this.c=source.c;this.normal.copy(source.normal);this.color.copy(source.color);this.materialIndex=source.materialIndex;for(var i=0,il=source.vertexNormals.length;i<il;i++){this.vertexNormals[i]=source.vertexNormals[i].clone();}for(var i=0,il=source.vertexColors.length;i<il;i++){this.vertexColors[i]=source.vertexColors[i].clone();}return this;}}; // File:src/core/Face4.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.Face4=function(a,b,c,d,normal,color,materialIndex){console.warn('THREE.Face4 has been removed. A THREE.Face3 will be created instead.');return new THREE.Face3(a,b,c,normal,color,materialIndex);}; // File:src/core/BufferAttribute.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.BufferAttribute=function(array,itemSize){this.uuid=THREE.Math.generateUUID();this.array=array;this.itemSize=itemSize;this.dynamic=false;this.updateRange={offset:0,count:-1};this.version=0;};THREE.BufferAttribute.prototype={constructor:THREE.BufferAttribute,get length(){console.warn('THREE.BufferAttribute: .length has been deprecated. Please use .count.');return this.array.length;},get count(){return this.array.length/this.itemSize;},set needsUpdate(value){if(value===true)this.version++;},setDynamic:function setDynamic(value){this.dynamic=value;return this;},copy:function copy(source){this.array=new source.array.constructor(source.array);this.itemSize=source.itemSize;this.dynamic=source.dynamic;return this;},copyAt:function copyAt(index1,attribute,index2){index1*=this.itemSize;index2*=attribute.itemSize;for(var i=0,l=this.itemSize;i<l;i++){this.array[index1+i]=attribute.array[index2+i];}return this;},copyArray:function copyArray(array){this.array.set(array);return this;},copyColorsArray:function copyColorsArray(colors){var array=this.array,offset=0;for(var i=0,l=colors.length;i<l;i++){var color=colors[i];if(color===undefined){console.warn('THREE.BufferAttribute.copyColorsArray(): color is undefined',i);color=new THREE.Color();}array[offset++]=color.r;array[offset++]=color.g;array[offset++]=color.b;}return this;},copyIndicesArray:function copyIndicesArray(indices){var array=this.array,offset=0;for(var i=0,l=indices.length;i<l;i++){var index=indices[i];array[offset++]=index.a;array[offset++]=index.b;array[offset++]=index.c;}return this;},copyVector2sArray:function copyVector2sArray(vectors){var array=this.array,offset=0;for(var i=0,l=vectors.length;i<l;i++){var vector=vectors[i];if(vector===undefined){console.warn('THREE.BufferAttribute.copyVector2sArray(): vector is undefined',i);vector=new THREE.Vector2();}array[offset++]=vector.x;array[offset++]=vector.y;}return this;},copyVector3sArray:function copyVector3sArray(vectors){var array=this.array,offset=0;for(var i=0,l=vectors.length;i<l;i++){var vector=vectors[i];if(vector===undefined){console.warn('THREE.BufferAttribute.copyVector3sArray(): vector is undefined',i);vector=new THREE.Vector3();}array[offset++]=vector.x;array[offset++]=vector.y;array[offset++]=vector.z;}return this;},copyVector4sArray:function copyVector4sArray(vectors){var array=this.array,offset=0;for(var i=0,l=vectors.length;i<l;i++){var vector=vectors[i];if(vector===undefined){console.warn('THREE.BufferAttribute.copyVector4sArray(): vector is undefined',i);vector=new THREE.Vector4();}array[offset++]=vector.x;array[offset++]=vector.y;array[offset++]=vector.z;array[offset++]=vector.w;}return this;},set:function set(value,offset){if(offset===undefined)offset=0;this.array.set(value,offset);return this;},getX:function getX(index){return this.array[index*this.itemSize];},setX:function setX(index,x){this.array[index*this.itemSize]=x;return this;},getY:function getY(index){return this.array[index*this.itemSize+1];},setY:function setY(index,y){this.array[index*this.itemSize+1]=y;return this;},getZ:function getZ(index){return this.array[index*this.itemSize+2];},setZ:function setZ(index,z){this.array[index*this.itemSize+2]=z;return this;},getW:function getW(index){return this.array[index*this.itemSize+3];},setW:function setW(index,w){this.array[index*this.itemSize+3]=w;return this;},setXY:function setXY(index,x,y){index*=this.itemSize;this.array[index+0]=x;this.array[index+1]=y;return this;},setXYZ:function setXYZ(index,x,y,z){index*=this.itemSize;this.array[index+0]=x;this.array[index+1]=y;this.array[index+2]=z;return this;},setXYZW:function setXYZW(index,x,y,z,w){index*=this.itemSize;this.array[index+0]=x;this.array[index+1]=y;this.array[index+2]=z;this.array[index+3]=w;return this;},clone:function clone(){return new this.constructor().copy(this);}}; //
THREE.Int8Attribute=function(array,itemSize){return new THREE.BufferAttribute(new Int8Array(array),itemSize);};THREE.Uint8Attribute=function(array,itemSize){return new THREE.BufferAttribute(new Uint8Array(array),itemSize);};THREE.Uint8ClampedAttribute=function(array,itemSize){return new THREE.BufferAttribute(new Uint8ClampedArray(array),itemSize);};THREE.Int16Attribute=function(array,itemSize){return new THREE.BufferAttribute(new Int16Array(array),itemSize);};THREE.Uint16Attribute=function(array,itemSize){return new THREE.BufferAttribute(new Uint16Array(array),itemSize);};THREE.Int32Attribute=function(array,itemSize){return new THREE.BufferAttribute(new Int32Array(array),itemSize);};THREE.Uint32Attribute=function(array,itemSize){return new THREE.BufferAttribute(new Uint32Array(array),itemSize);};THREE.Float32Attribute=function(array,itemSize){return new THREE.BufferAttribute(new Float32Array(array),itemSize);};THREE.Float64Attribute=function(array,itemSize){return new THREE.BufferAttribute(new Float64Array(array),itemSize);}; // Deprecated
THREE.DynamicBufferAttribute=function(array,itemSize){console.warn('THREE.DynamicBufferAttribute has been removed. Use new THREE.BufferAttribute().setDynamic( true ) instead.');return new THREE.BufferAttribute(array,itemSize).setDynamic(true);}; // File:src/core/InstancedBufferAttribute.js
/**
 * @author benaadams / https://twitter.com/ben_a_adams
 */THREE.InstancedBufferAttribute=function(array,itemSize,meshPerAttribute){THREE.BufferAttribute.call(this,array,itemSize);this.meshPerAttribute=meshPerAttribute||1;};THREE.InstancedBufferAttribute.prototype=Object.create(THREE.BufferAttribute.prototype);THREE.InstancedBufferAttribute.prototype.constructor=THREE.InstancedBufferAttribute;THREE.InstancedBufferAttribute.prototype.copy=function(source){THREE.BufferAttribute.prototype.copy.call(this,source);this.meshPerAttribute=source.meshPerAttribute;return this;}; // File:src/core/InterleavedBuffer.js
/**
 * @author benaadams / https://twitter.com/ben_a_adams
 */THREE.InterleavedBuffer=function(array,stride){this.uuid=THREE.Math.generateUUID();this.array=array;this.stride=stride;this.dynamic=false;this.updateRange={offset:0,count:-1};this.version=0;};THREE.InterleavedBuffer.prototype={constructor:THREE.InterleavedBuffer,get length(){return this.array.length;},get count(){return this.array.length/this.stride;},set needsUpdate(value){if(value===true)this.version++;},setDynamic:function setDynamic(value){this.dynamic=value;return this;},copy:function copy(source){this.array=new source.array.constructor(source.array);this.stride=source.stride;this.dynamic=source.dynamic;},copyAt:function copyAt(index1,attribute,index2){index1*=this.stride;index2*=attribute.stride;for(var i=0,l=this.stride;i<l;i++){this.array[index1+i]=attribute.array[index2+i];}return this;},set:function set(value,offset){if(offset===undefined)offset=0;this.array.set(value,offset);return this;},clone:function clone(){return new this.constructor().copy(this);}}; // File:src/core/InstancedInterleavedBuffer.js
/**
 * @author benaadams / https://twitter.com/ben_a_adams
 */THREE.InstancedInterleavedBuffer=function(array,stride,meshPerAttribute){THREE.InterleavedBuffer.call(this,array,stride);this.meshPerAttribute=meshPerAttribute||1;};THREE.InstancedInterleavedBuffer.prototype=Object.create(THREE.InterleavedBuffer.prototype);THREE.InstancedInterleavedBuffer.prototype.constructor=THREE.InstancedInterleavedBuffer;THREE.InstancedInterleavedBuffer.prototype.copy=function(source){THREE.InterleavedBuffer.prototype.copy.call(this,source);this.meshPerAttribute=source.meshPerAttribute;return this;}; // File:src/core/InterleavedBufferAttribute.js
/**
 * @author benaadams / https://twitter.com/ben_a_adams
 */THREE.InterleavedBufferAttribute=function(interleavedBuffer,itemSize,offset){this.uuid=THREE.Math.generateUUID();this.data=interleavedBuffer;this.itemSize=itemSize;this.offset=offset;};THREE.InterleavedBufferAttribute.prototype={constructor:THREE.InterleavedBufferAttribute,get length(){console.warn('THREE.BufferAttribute: .length has been deprecated. Please use .count.');return this.array.length;},get count(){return this.data.array.length/this.data.stride;},setX:function setX(index,x){this.data.array[index*this.data.stride+this.offset]=x;return this;},setY:function setY(index,y){this.data.array[index*this.data.stride+this.offset+1]=y;return this;},setZ:function setZ(index,z){this.data.array[index*this.data.stride+this.offset+2]=z;return this;},setW:function setW(index,w){this.data.array[index*this.data.stride+this.offset+3]=w;return this;},getX:function getX(index){return this.data.array[index*this.data.stride+this.offset];},getY:function getY(index){return this.data.array[index*this.data.stride+this.offset+1];},getZ:function getZ(index){return this.data.array[index*this.data.stride+this.offset+2];},getW:function getW(index){return this.data.array[index*this.data.stride+this.offset+3];},setXY:function setXY(index,x,y){index=index*this.data.stride+this.offset;this.data.array[index+0]=x;this.data.array[index+1]=y;return this;},setXYZ:function setXYZ(index,x,y,z){index=index*this.data.stride+this.offset;this.data.array[index+0]=x;this.data.array[index+1]=y;this.data.array[index+2]=z;return this;},setXYZW:function setXYZW(index,x,y,z,w){index=index*this.data.stride+this.offset;this.data.array[index+0]=x;this.data.array[index+1]=y;this.data.array[index+2]=z;this.data.array[index+3]=w;return this;}}; // File:src/core/Geometry.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author kile / http://kile.stravaganza.org/
 * @author alteredq / http://alteredqualia.com/
 * @author mikael emtinger / http://gomo.se/
 * @author zz85 / http://www.lab4games.net/zz85/blog
 * @author bhouston / http://clara.io
 */THREE.Geometry=function(){Object.defineProperty(this,'id',{value:THREE.GeometryIdCount++});this.uuid=THREE.Math.generateUUID();this.name='';this.type='Geometry';this.vertices=[];this.colors=[];this.faces=[];this.faceVertexUvs=[[]];this.morphTargets=[];this.morphNormals=[];this.skinWeights=[];this.skinIndices=[];this.lineDistances=[];this.boundingBox=null;this.boundingSphere=null; // update flags
this.verticesNeedUpdate=false;this.elementsNeedUpdate=false;this.uvsNeedUpdate=false;this.normalsNeedUpdate=false;this.colorsNeedUpdate=false;this.lineDistancesNeedUpdate=false;this.groupsNeedUpdate=false;};THREE.Geometry.prototype={constructor:THREE.Geometry,applyMatrix:function applyMatrix(matrix){var normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);for(var i=0,il=this.vertices.length;i<il;i++){var vertex=this.vertices[i];vertex.applyMatrix4(matrix);}for(var i=0,il=this.faces.length;i<il;i++){var face=this.faces[i];face.normal.applyMatrix3(normalMatrix).normalize();for(var j=0,jl=face.vertexNormals.length;j<jl;j++){face.vertexNormals[j].applyMatrix3(normalMatrix).normalize();}}if(this.boundingBox!==null){this.computeBoundingBox();}if(this.boundingSphere!==null){this.computeBoundingSphere();}this.verticesNeedUpdate=true;this.normalsNeedUpdate=true;},rotateX:function(){ // rotate geometry around world x-axis
var m1;return function rotateX(angle){if(m1===undefined)m1=new THREE.Matrix4();m1.makeRotationX(angle);this.applyMatrix(m1);return this;};}(),rotateY:function(){ // rotate geometry around world y-axis
var m1;return function rotateY(angle){if(m1===undefined)m1=new THREE.Matrix4();m1.makeRotationY(angle);this.applyMatrix(m1);return this;};}(),rotateZ:function(){ // rotate geometry around world z-axis
var m1;return function rotateZ(angle){if(m1===undefined)m1=new THREE.Matrix4();m1.makeRotationZ(angle);this.applyMatrix(m1);return this;};}(),translate:function(){ // translate geometry
var m1;return function translate(x,y,z){if(m1===undefined)m1=new THREE.Matrix4();m1.makeTranslation(x,y,z);this.applyMatrix(m1);return this;};}(),scale:function(){ // scale geometry
var m1;return function scale(x,y,z){if(m1===undefined)m1=new THREE.Matrix4();m1.makeScale(x,y,z);this.applyMatrix(m1);return this;};}(),lookAt:function(){var obj;return function lookAt(vector){if(obj===undefined)obj=new THREE.Object3D();obj.lookAt(vector);obj.updateMatrix();this.applyMatrix(obj.matrix);};}(),fromBufferGeometry:function fromBufferGeometry(geometry){var scope=this;var indices=geometry.index!==null?geometry.index.array:undefined;var attributes=geometry.attributes;var vertices=attributes.position.array;var normals=attributes.normal!==undefined?attributes.normal.array:undefined;var colors=attributes.color!==undefined?attributes.color.array:undefined;var uvs=attributes.uv!==undefined?attributes.uv.array:undefined;var uvs2=attributes.uv2!==undefined?attributes.uv2.array:undefined;if(uvs2!==undefined)this.faceVertexUvs[1]=[];var tempNormals=[];var tempUVs=[];var tempUVs2=[];for(var i=0,j=0,k=0;i<vertices.length;i+=3,j+=2,k+=4){scope.vertices.push(new THREE.Vector3(vertices[i],vertices[i+1],vertices[i+2]));if(normals!==undefined){tempNormals.push(new THREE.Vector3(normals[i],normals[i+1],normals[i+2]));}if(colors!==undefined){scope.colors.push(new THREE.Color(colors[i],colors[i+1],colors[i+2]));}if(uvs!==undefined){tempUVs.push(new THREE.Vector2(uvs[j],uvs[j+1]));}if(uvs2!==undefined){tempUVs2.push(new THREE.Vector2(uvs2[j],uvs2[j+1]));}}function addFace(a,b,c){var vertexNormals=normals!==undefined?[tempNormals[a].clone(),tempNormals[b].clone(),tempNormals[c].clone()]:[];var vertexColors=colors!==undefined?[scope.colors[a].clone(),scope.colors[b].clone(),scope.colors[c].clone()]:[];var face=new THREE.Face3(a,b,c,vertexNormals,vertexColors);scope.faces.push(face);if(uvs!==undefined){scope.faceVertexUvs[0].push([tempUVs[a].clone(),tempUVs[b].clone(),tempUVs[c].clone()]);}if(uvs2!==undefined){scope.faceVertexUvs[1].push([tempUVs2[a].clone(),tempUVs2[b].clone(),tempUVs2[c].clone()]);}};if(indices!==undefined){var groups=geometry.groups;if(groups.length>0){for(var i=0;i<groups.length;i++){var group=groups[i];var start=group.start;var count=group.count;for(var j=start,jl=start+count;j<jl;j+=3){addFace(indices[j],indices[j+1],indices[j+2]);}}}else {for(var i=0;i<indices.length;i+=3){addFace(indices[i],indices[i+1],indices[i+2]);}}}else {for(var i=0;i<vertices.length/3;i+=3){addFace(i,i+1,i+2);}}this.computeFaceNormals();if(geometry.boundingBox!==null){this.boundingBox=geometry.boundingBox.clone();}if(geometry.boundingSphere!==null){this.boundingSphere=geometry.boundingSphere.clone();}return this;},center:function center(){this.computeBoundingBox();var offset=this.boundingBox.center().negate();this.translate(offset.x,offset.y,offset.z);return offset;},normalize:function normalize(){this.computeBoundingSphere();var center=this.boundingSphere.center;var radius=this.boundingSphere.radius;var s=radius===0?1:1.0/radius;var matrix=new THREE.Matrix4();matrix.set(s,0,0,-s*center.x,0,s,0,-s*center.y,0,0,s,-s*center.z,0,0,0,1);this.applyMatrix(matrix);return this;},computeFaceNormals:function computeFaceNormals(){var cb=new THREE.Vector3(),ab=new THREE.Vector3();for(var f=0,fl=this.faces.length;f<fl;f++){var face=this.faces[f];var vA=this.vertices[face.a];var vB=this.vertices[face.b];var vC=this.vertices[face.c];cb.subVectors(vC,vB);ab.subVectors(vA,vB);cb.cross(ab);cb.normalize();face.normal.copy(cb);}},computeVertexNormals:function computeVertexNormals(areaWeighted){var v,vl,f,fl,face,vertices;vertices=new Array(this.vertices.length);for(v=0,vl=this.vertices.length;v<vl;v++){vertices[v]=new THREE.Vector3();}if(areaWeighted){ // vertex normals weighted by triangle areas
// http://www.iquilezles.org/www/articles/normals/normals.htm
var vA,vB,vC;var cb=new THREE.Vector3(),ab=new THREE.Vector3();for(f=0,fl=this.faces.length;f<fl;f++){face=this.faces[f];vA=this.vertices[face.a];vB=this.vertices[face.b];vC=this.vertices[face.c];cb.subVectors(vC,vB);ab.subVectors(vA,vB);cb.cross(ab);vertices[face.a].add(cb);vertices[face.b].add(cb);vertices[face.c].add(cb);}}else {for(f=0,fl=this.faces.length;f<fl;f++){face=this.faces[f];vertices[face.a].add(face.normal);vertices[face.b].add(face.normal);vertices[face.c].add(face.normal);}}for(v=0,vl=this.vertices.length;v<vl;v++){vertices[v].normalize();}for(f=0,fl=this.faces.length;f<fl;f++){face=this.faces[f];var vertexNormals=face.vertexNormals;if(vertexNormals.length===3){vertexNormals[0].copy(vertices[face.a]);vertexNormals[1].copy(vertices[face.b]);vertexNormals[2].copy(vertices[face.c]);}else {vertexNormals[0]=vertices[face.a].clone();vertexNormals[1]=vertices[face.b].clone();vertexNormals[2]=vertices[face.c].clone();}}},computeMorphNormals:function computeMorphNormals(){var i,il,f,fl,face; // save original normals
// - create temp variables on first access
//   otherwise just copy (for faster repeated calls)
for(f=0,fl=this.faces.length;f<fl;f++){face=this.faces[f];if(!face.__originalFaceNormal){face.__originalFaceNormal=face.normal.clone();}else {face.__originalFaceNormal.copy(face.normal);}if(!face.__originalVertexNormals)face.__originalVertexNormals=[];for(i=0,il=face.vertexNormals.length;i<il;i++){if(!face.__originalVertexNormals[i]){face.__originalVertexNormals[i]=face.vertexNormals[i].clone();}else {face.__originalVertexNormals[i].copy(face.vertexNormals[i]);}}} // use temp geometry to compute face and vertex normals for each morph
var tmpGeo=new THREE.Geometry();tmpGeo.faces=this.faces;for(i=0,il=this.morphTargets.length;i<il;i++){ // create on first access
if(!this.morphNormals[i]){this.morphNormals[i]={};this.morphNormals[i].faceNormals=[];this.morphNormals[i].vertexNormals=[];var dstNormalsFace=this.morphNormals[i].faceNormals;var dstNormalsVertex=this.morphNormals[i].vertexNormals;var faceNormal,vertexNormals;for(f=0,fl=this.faces.length;f<fl;f++){faceNormal=new THREE.Vector3();vertexNormals={a:new THREE.Vector3(),b:new THREE.Vector3(),c:new THREE.Vector3()};dstNormalsFace.push(faceNormal);dstNormalsVertex.push(vertexNormals);}}var morphNormals=this.morphNormals[i]; // set vertices to morph target
tmpGeo.vertices=this.morphTargets[i].vertices; // compute morph normals
tmpGeo.computeFaceNormals();tmpGeo.computeVertexNormals(); // store morph normals
var faceNormal,vertexNormals;for(f=0,fl=this.faces.length;f<fl;f++){face=this.faces[f];faceNormal=morphNormals.faceNormals[f];vertexNormals=morphNormals.vertexNormals[f];faceNormal.copy(face.normal);vertexNormals.a.copy(face.vertexNormals[0]);vertexNormals.b.copy(face.vertexNormals[1]);vertexNormals.c.copy(face.vertexNormals[2]);}} // restore original normals
for(f=0,fl=this.faces.length;f<fl;f++){face=this.faces[f];face.normal=face.__originalFaceNormal;face.vertexNormals=face.__originalVertexNormals;}},computeTangents:function computeTangents(){console.warn('THREE.Geometry: .computeTangents() has been removed.');},computeLineDistances:function computeLineDistances(){var d=0;var vertices=this.vertices;for(var i=0,il=vertices.length;i<il;i++){if(i>0){d+=vertices[i].distanceTo(vertices[i-1]);}this.lineDistances[i]=d;}},computeBoundingBox:function computeBoundingBox(){if(this.boundingBox===null){this.boundingBox=new THREE.Box3();}this.boundingBox.setFromPoints(this.vertices);},computeBoundingSphere:function computeBoundingSphere(){if(this.boundingSphere===null){this.boundingSphere=new THREE.Sphere();}this.boundingSphere.setFromPoints(this.vertices);},merge:function merge(geometry,matrix,materialIndexOffset){if(geometry instanceof THREE.Geometry===false){console.error('THREE.Geometry.merge(): geometry not an instance of THREE.Geometry.',geometry);return;}var normalMatrix,vertexOffset=this.vertices.length,vertices1=this.vertices,vertices2=geometry.vertices,faces1=this.faces,faces2=geometry.faces,uvs1=this.faceVertexUvs[0],uvs2=geometry.faceVertexUvs[0];if(materialIndexOffset===undefined)materialIndexOffset=0;if(matrix!==undefined){normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);} // vertices
for(var i=0,il=vertices2.length;i<il;i++){var vertex=vertices2[i];var vertexCopy=vertex.clone();if(matrix!==undefined)vertexCopy.applyMatrix4(matrix);vertices1.push(vertexCopy);} // faces
for(i=0,il=faces2.length;i<il;i++){var face=faces2[i],faceCopy,normal,color,faceVertexNormals=face.vertexNormals,faceVertexColors=face.vertexColors;faceCopy=new THREE.Face3(face.a+vertexOffset,face.b+vertexOffset,face.c+vertexOffset);faceCopy.normal.copy(face.normal);if(normalMatrix!==undefined){faceCopy.normal.applyMatrix3(normalMatrix).normalize();}for(var j=0,jl=faceVertexNormals.length;j<jl;j++){normal=faceVertexNormals[j].clone();if(normalMatrix!==undefined){normal.applyMatrix3(normalMatrix).normalize();}faceCopy.vertexNormals.push(normal);}faceCopy.color.copy(face.color);for(var j=0,jl=faceVertexColors.length;j<jl;j++){color=faceVertexColors[j];faceCopy.vertexColors.push(color.clone());}faceCopy.materialIndex=face.materialIndex+materialIndexOffset;faces1.push(faceCopy);} // uvs
for(i=0,il=uvs2.length;i<il;i++){var uv=uvs2[i],uvCopy=[];if(uv===undefined){continue;}for(var j=0,jl=uv.length;j<jl;j++){uvCopy.push(uv[j].clone());}uvs1.push(uvCopy);}},mergeMesh:function mergeMesh(mesh){if(mesh instanceof THREE.Mesh===false){console.error('THREE.Geometry.mergeMesh(): mesh not an instance of THREE.Mesh.',mesh);return;}mesh.matrixAutoUpdate&&mesh.updateMatrix();this.merge(mesh.geometry,mesh.matrix);}, /*
	 * Checks for duplicate vertices with hashmap.
	 * Duplicated vertices are removed
	 * and faces' vertices are updated.
	 */mergeVertices:function mergeVertices(){var verticesMap={}; // Hashmap for looking up vertices by position coordinates (and making sure they are unique)
var unique=[],changes=[];var v,key;var precisionPoints=4; // number of decimal points, e.g. 4 for epsilon of 0.0001
var precision=Math.pow(10,precisionPoints);var i,il,face;var indices,j,jl;for(i=0,il=this.vertices.length;i<il;i++){v=this.vertices[i];key=Math.round(v.x*precision)+'_'+Math.round(v.y*precision)+'_'+Math.round(v.z*precision);if(verticesMap[key]===undefined){verticesMap[key]=i;unique.push(this.vertices[i]);changes[i]=unique.length-1;}else { //console.log('Duplicate vertex found. ', i, ' could be using ', verticesMap[key]);
changes[i]=changes[verticesMap[key]];}} // if faces are completely degenerate after merging vertices, we
// have to remove them from the geometry.
var faceIndicesToRemove=[];for(i=0,il=this.faces.length;i<il;i++){face=this.faces[i];face.a=changes[face.a];face.b=changes[face.b];face.c=changes[face.c];indices=[face.a,face.b,face.c];var dupIndex=-1; // if any duplicate vertices are found in a Face3
// we have to remove the face as nothing can be saved
for(var n=0;n<3;n++){if(indices[n]===indices[(n+1)%3]){dupIndex=n;faceIndicesToRemove.push(i);break;}}}for(i=faceIndicesToRemove.length-1;i>=0;i--){var idx=faceIndicesToRemove[i];this.faces.splice(idx,1);for(j=0,jl=this.faceVertexUvs.length;j<jl;j++){this.faceVertexUvs[j].splice(idx,1);}} // Use unique set of vertices
var diff=this.vertices.length-unique.length;this.vertices=unique;return diff;},sortFacesByMaterialIndex:function sortFacesByMaterialIndex(){var faces=this.faces;var length=faces.length; // tag faces
for(var i=0;i<length;i++){faces[i]._id=i;} // sort faces
function materialIndexSort(a,b){return a.materialIndex-b.materialIndex;}faces.sort(materialIndexSort); // sort uvs
var uvs1=this.faceVertexUvs[0];var uvs2=this.faceVertexUvs[1];var newUvs1,newUvs2;if(uvs1&&uvs1.length===length)newUvs1=[];if(uvs2&&uvs2.length===length)newUvs2=[];for(var i=0;i<length;i++){var id=faces[i]._id;if(newUvs1)newUvs1.push(uvs1[id]);if(newUvs2)newUvs2.push(uvs2[id]);}if(newUvs1)this.faceVertexUvs[0]=newUvs1;if(newUvs2)this.faceVertexUvs[1]=newUvs2;},toJSON:function toJSON(){var data={metadata:{version:4.4,type:'Geometry',generator:'Geometry.toJSON'}}; // standard Geometry serialization
data.uuid=this.uuid;data.type=this.type;if(this.name!=='')data.name=this.name;if(this.parameters!==undefined){var parameters=this.parameters;for(var key in parameters){if(parameters[key]!==undefined)data[key]=parameters[key];}return data;}var vertices=[];for(var i=0;i<this.vertices.length;i++){var vertex=this.vertices[i];vertices.push(vertex.x,vertex.y,vertex.z);}var faces=[];var normals=[];var normalsHash={};var colors=[];var colorsHash={};var uvs=[];var uvsHash={};for(var i=0;i<this.faces.length;i++){var face=this.faces[i];var hasMaterial=false; // face.materialIndex !== undefined;
var hasFaceUv=false; // deprecated
var hasFaceVertexUv=this.faceVertexUvs[0][i]!==undefined;var hasFaceNormal=face.normal.length()>0;var hasFaceVertexNormal=face.vertexNormals.length>0;var hasFaceColor=face.color.r!==1||face.color.g!==1||face.color.b!==1;var hasFaceVertexColor=face.vertexColors.length>0;var faceType=0;faceType=setBit(faceType,0,0);faceType=setBit(faceType,1,hasMaterial);faceType=setBit(faceType,2,hasFaceUv);faceType=setBit(faceType,3,hasFaceVertexUv);faceType=setBit(faceType,4,hasFaceNormal);faceType=setBit(faceType,5,hasFaceVertexNormal);faceType=setBit(faceType,6,hasFaceColor);faceType=setBit(faceType,7,hasFaceVertexColor);faces.push(faceType);faces.push(face.a,face.b,face.c);if(hasFaceVertexUv){var faceVertexUvs=this.faceVertexUvs[0][i];faces.push(getUvIndex(faceVertexUvs[0]),getUvIndex(faceVertexUvs[1]),getUvIndex(faceVertexUvs[2]));}if(hasFaceNormal){faces.push(getNormalIndex(face.normal));}if(hasFaceVertexNormal){var vertexNormals=face.vertexNormals;faces.push(getNormalIndex(vertexNormals[0]),getNormalIndex(vertexNormals[1]),getNormalIndex(vertexNormals[2]));}if(hasFaceColor){faces.push(getColorIndex(face.color));}if(hasFaceVertexColor){var vertexColors=face.vertexColors;faces.push(getColorIndex(vertexColors[0]),getColorIndex(vertexColors[1]),getColorIndex(vertexColors[2]));}}function setBit(value,position,enabled){return enabled?value|1<<position:value&~(1<<position);}function getNormalIndex(normal){var hash=normal.x.toString()+normal.y.toString()+normal.z.toString();if(normalsHash[hash]!==undefined){return normalsHash[hash];}normalsHash[hash]=normals.length/3;normals.push(normal.x,normal.y,normal.z);return normalsHash[hash];}function getColorIndex(color){var hash=color.r.toString()+color.g.toString()+color.b.toString();if(colorsHash[hash]!==undefined){return colorsHash[hash];}colorsHash[hash]=colors.length;colors.push(color.getHex());return colorsHash[hash];}function getUvIndex(uv){var hash=uv.x.toString()+uv.y.toString();if(uvsHash[hash]!==undefined){return uvsHash[hash];}uvsHash[hash]=uvs.length/2;uvs.push(uv.x,uv.y);return uvsHash[hash];}data.data={};data.data.vertices=vertices;data.data.normals=normals;if(colors.length>0)data.data.colors=colors;if(uvs.length>0)data.data.uvs=[uvs]; // temporal backward compatibility
data.data.faces=faces;return data;},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(source){this.vertices=[];this.faces=[];this.faceVertexUvs=[[]];var vertices=source.vertices;for(var i=0,il=vertices.length;i<il;i++){this.vertices.push(vertices[i].clone());}var faces=source.faces;for(var i=0,il=faces.length;i<il;i++){this.faces.push(faces[i].clone());}for(var i=0,il=source.faceVertexUvs.length;i<il;i++){var faceVertexUvs=source.faceVertexUvs[i];if(this.faceVertexUvs[i]===undefined){this.faceVertexUvs[i]=[];}for(var j=0,jl=faceVertexUvs.length;j<jl;j++){var uvs=faceVertexUvs[j],uvsCopy=[];for(var k=0,kl=uvs.length;k<kl;k++){var uv=uvs[k];uvsCopy.push(uv.clone());}this.faceVertexUvs[i].push(uvsCopy);}}return this;},dispose:function dispose(){this.dispatchEvent({type:'dispose'});}};THREE.EventDispatcher.prototype.apply(THREE.Geometry.prototype);THREE.GeometryIdCount=0; // File:src/core/DirectGeometry.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.DirectGeometry=function(){Object.defineProperty(this,'id',{value:THREE.GeometryIdCount++});this.uuid=THREE.Math.generateUUID();this.name='';this.type='DirectGeometry';this.indices=[];this.vertices=[];this.normals=[];this.colors=[];this.uvs=[];this.uvs2=[];this.groups=[];this.morphTargets={};this.skinWeights=[];this.skinIndices=[]; // this.lineDistances = [];
this.boundingBox=null;this.boundingSphere=null; // update flags
this.verticesNeedUpdate=false;this.normalsNeedUpdate=false;this.colorsNeedUpdate=false;this.uvsNeedUpdate=false;this.groupsNeedUpdate=false;};THREE.DirectGeometry.prototype={constructor:THREE.DirectGeometry,computeBoundingBox:THREE.Geometry.prototype.computeBoundingBox,computeBoundingSphere:THREE.Geometry.prototype.computeBoundingSphere,computeFaceNormals:function computeFaceNormals(){console.warn('THREE.DirectGeometry: computeFaceNormals() is not a method of this type of geometry.');},computeVertexNormals:function computeVertexNormals(){console.warn('THREE.DirectGeometry: computeVertexNormals() is not a method of this type of geometry.');},computeGroups:function computeGroups(geometry){var group;var groups=[];var materialIndex;var faces=geometry.faces;for(var i=0;i<faces.length;i++){var face=faces[i]; // materials
if(face.materialIndex!==materialIndex){materialIndex=face.materialIndex;if(group!==undefined){group.count=i*3-group.start;groups.push(group);}group={start:i*3,materialIndex:materialIndex};}}if(group!==undefined){group.count=i*3-group.start;groups.push(group);}this.groups=groups;},fromGeometry:function fromGeometry(geometry){var faces=geometry.faces;var vertices=geometry.vertices;var faceVertexUvs=geometry.faceVertexUvs;var hasFaceVertexUv=faceVertexUvs[0]&&faceVertexUvs[0].length>0;var hasFaceVertexUv2=faceVertexUvs[1]&&faceVertexUvs[1].length>0; // morphs
var morphTargets=geometry.morphTargets;var morphTargetsLength=morphTargets.length;if(morphTargetsLength>0){var morphTargetsPosition=[];for(var i=0;i<morphTargetsLength;i++){morphTargetsPosition[i]=[];}this.morphTargets.position=morphTargetsPosition;}var morphNormals=geometry.morphNormals;var morphNormalsLength=morphNormals.length;if(morphNormalsLength>0){var morphTargetsNormal=[];for(var i=0;i<morphNormalsLength;i++){morphTargetsNormal[i]=[];}this.morphTargets.normal=morphTargetsNormal;} // skins
var skinIndices=geometry.skinIndices;var skinWeights=geometry.skinWeights;var hasSkinIndices=skinIndices.length===vertices.length;var hasSkinWeights=skinWeights.length===vertices.length; //
for(var i=0;i<faces.length;i++){var face=faces[i];this.vertices.push(vertices[face.a],vertices[face.b],vertices[face.c]);var vertexNormals=face.vertexNormals;if(vertexNormals.length===3){this.normals.push(vertexNormals[0],vertexNormals[1],vertexNormals[2]);}else {var normal=face.normal;this.normals.push(normal,normal,normal);}var vertexColors=face.vertexColors;if(vertexColors.length===3){this.colors.push(vertexColors[0],vertexColors[1],vertexColors[2]);}else {var color=face.color;this.colors.push(color,color,color);}if(hasFaceVertexUv===true){var vertexUvs=faceVertexUvs[0][i];if(vertexUvs!==undefined){this.uvs.push(vertexUvs[0],vertexUvs[1],vertexUvs[2]);}else {console.warn('THREE.DirectGeometry.fromGeometry(): Undefined vertexUv ',i);this.uvs.push(new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2());}}if(hasFaceVertexUv2===true){var vertexUvs=faceVertexUvs[1][i];if(vertexUvs!==undefined){this.uvs2.push(vertexUvs[0],vertexUvs[1],vertexUvs[2]);}else {console.warn('THREE.DirectGeometry.fromGeometry(): Undefined vertexUv2 ',i);this.uvs2.push(new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2());}} // morphs
for(var j=0;j<morphTargetsLength;j++){var morphTarget=morphTargets[j].vertices;morphTargetsPosition[j].push(morphTarget[face.a],morphTarget[face.b],morphTarget[face.c]);}for(var j=0;j<morphNormalsLength;j++){var morphNormal=morphNormals[j].vertexNormals[i];morphTargetsNormal[j].push(morphNormal.a,morphNormal.b,morphNormal.c);} // skins
if(hasSkinIndices){this.skinIndices.push(skinIndices[face.a],skinIndices[face.b],skinIndices[face.c]);}if(hasSkinWeights){this.skinWeights.push(skinWeights[face.a],skinWeights[face.b],skinWeights[face.c]);}}this.computeGroups(geometry);this.verticesNeedUpdate=geometry.verticesNeedUpdate;this.normalsNeedUpdate=geometry.normalsNeedUpdate;this.colorsNeedUpdate=geometry.colorsNeedUpdate;this.uvsNeedUpdate=geometry.uvsNeedUpdate;this.groupsNeedUpdate=geometry.groupsNeedUpdate;return this;},dispose:function dispose(){this.dispatchEvent({type:'dispose'});}};THREE.EventDispatcher.prototype.apply(THREE.DirectGeometry.prototype); // File:src/core/BufferGeometry.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */THREE.BufferGeometry=function(){Object.defineProperty(this,'id',{value:THREE.GeometryIdCount++});this.uuid=THREE.Math.generateUUID();this.name='';this.type='BufferGeometry';this.index=null;this.attributes={};this.morphAttributes={};this.groups=[];this.boundingBox=null;this.boundingSphere=null;this.drawRange={start:0,count:Infinity};};THREE.BufferGeometry.prototype={constructor:THREE.BufferGeometry,addIndex:function addIndex(index){console.warn('THREE.BufferGeometry: .addIndex() has been renamed to .setIndex().');this.setIndex(index);},getIndex:function getIndex(){return this.index;},setIndex:function setIndex(index){this.index=index;},addAttribute:function addAttribute(name,attribute){if(attribute instanceof THREE.BufferAttribute===false&&attribute instanceof THREE.InterleavedBufferAttribute===false){console.warn('THREE.BufferGeometry: .addAttribute() now expects ( name, attribute ).');this.addAttribute(name,new THREE.BufferAttribute(arguments[1],arguments[2]));return;}if(name==='index'){console.warn('THREE.BufferGeometry.addAttribute: Use .setIndex() for index attribute.');this.setIndex(attribute);return;}this.attributes[name]=attribute;},getAttribute:function getAttribute(name){return this.attributes[name];},removeAttribute:function removeAttribute(name){delete this.attributes[name];},get drawcalls(){console.error('THREE.BufferGeometry: .drawcalls has been renamed to .groups.');return this.groups;},get offsets(){console.warn('THREE.BufferGeometry: .offsets has been renamed to .groups.');return this.groups;},addDrawCall:function addDrawCall(start,count,indexOffset){if(indexOffset!==undefined){console.warn('THREE.BufferGeometry: .addDrawCall() no longer supports indexOffset.');}console.warn('THREE.BufferGeometry: .addDrawCall() is now .addGroup().');this.addGroup(start,count);},clearDrawCalls:function clearDrawCalls(){console.warn('THREE.BufferGeometry: .clearDrawCalls() is now .clearGroups().');this.clearGroups();},addGroup:function addGroup(start,count,materialIndex){this.groups.push({start:start,count:count,materialIndex:materialIndex!==undefined?materialIndex:0});},clearGroups:function clearGroups(){this.groups=[];},setDrawRange:function setDrawRange(start,count){this.drawRange.start=start;this.drawRange.count=count;},applyMatrix:function applyMatrix(matrix){var position=this.attributes.position;if(position!==undefined){matrix.applyToVector3Array(position.array);position.needsUpdate=true;}var normal=this.attributes.normal;if(normal!==undefined){var normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);normalMatrix.applyToVector3Array(normal.array);normal.needsUpdate=true;}if(this.boundingBox!==null){this.computeBoundingBox();}if(this.boundingSphere!==null){this.computeBoundingSphere();}},rotateX:function(){ // rotate geometry around world x-axis
var m1;return function rotateX(angle){if(m1===undefined)m1=new THREE.Matrix4();m1.makeRotationX(angle);this.applyMatrix(m1);return this;};}(),rotateY:function(){ // rotate geometry around world y-axis
var m1;return function rotateY(angle){if(m1===undefined)m1=new THREE.Matrix4();m1.makeRotationY(angle);this.applyMatrix(m1);return this;};}(),rotateZ:function(){ // rotate geometry around world z-axis
var m1;return function rotateZ(angle){if(m1===undefined)m1=new THREE.Matrix4();m1.makeRotationZ(angle);this.applyMatrix(m1);return this;};}(),translate:function(){ // translate geometry
var m1;return function translate(x,y,z){if(m1===undefined)m1=new THREE.Matrix4();m1.makeTranslation(x,y,z);this.applyMatrix(m1);return this;};}(),scale:function(){ // scale geometry
var m1;return function scale(x,y,z){if(m1===undefined)m1=new THREE.Matrix4();m1.makeScale(x,y,z);this.applyMatrix(m1);return this;};}(),lookAt:function(){var obj;return function lookAt(vector){if(obj===undefined)obj=new THREE.Object3D();obj.lookAt(vector);obj.updateMatrix();this.applyMatrix(obj.matrix);};}(),center:function center(){this.computeBoundingBox();var offset=this.boundingBox.center().negate();this.translate(offset.x,offset.y,offset.z);return offset;},setFromObject:function setFromObject(object){ // console.log( 'THREE.BufferGeometry.setFromObject(). Converting', object, this );
var geometry=object.geometry;if(object instanceof THREE.Points||object instanceof THREE.Line){var positions=new THREE.Float32Attribute(geometry.vertices.length*3,3);var colors=new THREE.Float32Attribute(geometry.colors.length*3,3);this.addAttribute('position',positions.copyVector3sArray(geometry.vertices));this.addAttribute('color',colors.copyColorsArray(geometry.colors));if(geometry.lineDistances&&geometry.lineDistances.length===geometry.vertices.length){var lineDistances=new THREE.Float32Attribute(geometry.lineDistances.length,1);this.addAttribute('lineDistance',lineDistances.copyArray(geometry.lineDistances));}if(geometry.boundingSphere!==null){this.boundingSphere=geometry.boundingSphere.clone();}if(geometry.boundingBox!==null){this.boundingBox=geometry.boundingBox.clone();}}else if(object instanceof THREE.Mesh){if(geometry instanceof THREE.Geometry){this.fromGeometry(geometry);}}return this;},updateFromObject:function updateFromObject(object){var geometry=object.geometry;if(object instanceof THREE.Mesh){var direct=geometry.__directGeometry;if(direct===undefined){return this.fromGeometry(geometry);}direct.verticesNeedUpdate=geometry.verticesNeedUpdate;direct.normalsNeedUpdate=geometry.normalsNeedUpdate;direct.colorsNeedUpdate=geometry.colorsNeedUpdate;direct.uvsNeedUpdate=geometry.uvsNeedUpdate;direct.groupsNeedUpdate=geometry.groupsNeedUpdate;geometry.verticesNeedUpdate=false;geometry.normalsNeedUpdate=false;geometry.colorsNeedUpdate=false;geometry.uvsNeedUpdate=false;geometry.groupsNeedUpdate=false;geometry=direct;}if(geometry.verticesNeedUpdate===true){var attribute=this.attributes.position;if(attribute!==undefined){attribute.copyVector3sArray(geometry.vertices);attribute.needsUpdate=true;}geometry.verticesNeedUpdate=false;}if(geometry.normalsNeedUpdate===true){var attribute=this.attributes.normal;if(attribute!==undefined){attribute.copyVector3sArray(geometry.normals);attribute.needsUpdate=true;}geometry.normalsNeedUpdate=false;}if(geometry.colorsNeedUpdate===true){var attribute=this.attributes.color;if(attribute!==undefined){attribute.copyColorsArray(geometry.colors);attribute.needsUpdate=true;}geometry.colorsNeedUpdate=false;}if(geometry.uvsNeedUpdate){var attribute=this.attributes.uv;if(attribute!==undefined){attribute.copyVector2sArray(geometry.uvs);attribute.needsUpdate=true;}geometry.uvsNeedUpdate=false;}if(geometry.lineDistancesNeedUpdate){var attribute=this.attributes.lineDistance;if(attribute!==undefined){attribute.copyArray(geometry.lineDistances);attribute.needsUpdate=true;}geometry.lineDistancesNeedUpdate=false;}if(geometry.groupsNeedUpdate){geometry.computeGroups(object.geometry);this.groups=geometry.groups;geometry.groupsNeedUpdate=false;}return this;},fromGeometry:function fromGeometry(geometry){geometry.__directGeometry=new THREE.DirectGeometry().fromGeometry(geometry);return this.fromDirectGeometry(geometry.__directGeometry);},fromDirectGeometry:function fromDirectGeometry(geometry){var positions=new Float32Array(geometry.vertices.length*3);this.addAttribute('position',new THREE.BufferAttribute(positions,3).copyVector3sArray(geometry.vertices));if(geometry.normals.length>0){var normals=new Float32Array(geometry.normals.length*3);this.addAttribute('normal',new THREE.BufferAttribute(normals,3).copyVector3sArray(geometry.normals));}if(geometry.colors.length>0){var colors=new Float32Array(geometry.colors.length*3);this.addAttribute('color',new THREE.BufferAttribute(colors,3).copyColorsArray(geometry.colors));}if(geometry.uvs.length>0){var uvs=new Float32Array(geometry.uvs.length*2);this.addAttribute('uv',new THREE.BufferAttribute(uvs,2).copyVector2sArray(geometry.uvs));}if(geometry.uvs2.length>0){var uvs2=new Float32Array(geometry.uvs2.length*2);this.addAttribute('uv2',new THREE.BufferAttribute(uvs2,2).copyVector2sArray(geometry.uvs2));}if(geometry.indices.length>0){var TypeArray=geometry.vertices.length>65535?Uint32Array:Uint16Array;var indices=new TypeArray(geometry.indices.length*3);this.setIndex(new THREE.BufferAttribute(indices,1).copyIndicesArray(geometry.indices));} // groups
this.groups=geometry.groups; // morphs
for(var name in geometry.morphTargets){var array=[];var morphTargets=geometry.morphTargets[name];for(var i=0,l=morphTargets.length;i<l;i++){var morphTarget=morphTargets[i];var attribute=new THREE.Float32Attribute(morphTarget.length*3,3);array.push(attribute.copyVector3sArray(morphTarget));}this.morphAttributes[name]=array;} // skinning
if(geometry.skinIndices.length>0){var skinIndices=new THREE.Float32Attribute(geometry.skinIndices.length*4,4);this.addAttribute('skinIndex',skinIndices.copyVector4sArray(geometry.skinIndices));}if(geometry.skinWeights.length>0){var skinWeights=new THREE.Float32Attribute(geometry.skinWeights.length*4,4);this.addAttribute('skinWeight',skinWeights.copyVector4sArray(geometry.skinWeights));} //
if(geometry.boundingSphere!==null){this.boundingSphere=geometry.boundingSphere.clone();}if(geometry.boundingBox!==null){this.boundingBox=geometry.boundingBox.clone();}return this;},computeBoundingBox:function(){var vector=new THREE.Vector3();return function(){if(this.boundingBox===null){this.boundingBox=new THREE.Box3();}var positions=this.attributes.position.array;if(positions){var bb=this.boundingBox;bb.makeEmpty();for(var i=0,il=positions.length;i<il;i+=3){vector.fromArray(positions,i);bb.expandByPoint(vector);}}if(positions===undefined||positions.length===0){this.boundingBox.min.set(0,0,0);this.boundingBox.max.set(0,0,0);}if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z)){console.error('THREE.BufferGeometry.computeBoundingBox: Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this);}};}(),computeBoundingSphere:function(){var box=new THREE.Box3();var vector=new THREE.Vector3();return function(){if(this.boundingSphere===null){this.boundingSphere=new THREE.Sphere();}var positions=this.attributes.position.array;if(positions){box.makeEmpty();var center=this.boundingSphere.center;for(var i=0,il=positions.length;i<il;i+=3){vector.fromArray(positions,i);box.expandByPoint(vector);}box.center(center); // hoping to find a boundingSphere with a radius smaller than the
// boundingSphere of the boundingBox: sqrt(3) smaller in the best case
var maxRadiusSq=0;for(var i=0,il=positions.length;i<il;i+=3){vector.fromArray(positions,i);maxRadiusSq=Math.max(maxRadiusSq,center.distanceToSquared(vector));}this.boundingSphere.radius=Math.sqrt(maxRadiusSq);if(isNaN(this.boundingSphere.radius)){console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this);}}};}(),computeFaceNormals:function computeFaceNormals(){ // backwards compatibility
},computeVertexNormals:function computeVertexNormals(){var index=this.index;var attributes=this.attributes;var groups=this.groups;if(attributes.position){var positions=attributes.position.array;if(attributes.normal===undefined){this.addAttribute('normal',new THREE.BufferAttribute(new Float32Array(positions.length),3));}else { // reset existing normals to zero
var normals=attributes.normal.array;for(var i=0,il=normals.length;i<il;i++){normals[i]=0;}}var normals=attributes.normal.array;var vA,vB,vC,pA=new THREE.Vector3(),pB=new THREE.Vector3(),pC=new THREE.Vector3(),cb=new THREE.Vector3(),ab=new THREE.Vector3(); // indexed elements
if(index){var indices=index.array;if(groups.length===0){this.addGroup(0,indices.length);}for(var j=0,jl=groups.length;j<jl;++j){var group=groups[j];var start=group.start;var count=group.count;for(var i=start,il=start+count;i<il;i+=3){vA=indices[i+0]*3;vB=indices[i+1]*3;vC=indices[i+2]*3;pA.fromArray(positions,vA);pB.fromArray(positions,vB);pC.fromArray(positions,vC);cb.subVectors(pC,pB);ab.subVectors(pA,pB);cb.cross(ab);normals[vA]+=cb.x;normals[vA+1]+=cb.y;normals[vA+2]+=cb.z;normals[vB]+=cb.x;normals[vB+1]+=cb.y;normals[vB+2]+=cb.z;normals[vC]+=cb.x;normals[vC+1]+=cb.y;normals[vC+2]+=cb.z;}}}else { // non-indexed elements (unconnected triangle soup)
for(var i=0,il=positions.length;i<il;i+=9){pA.fromArray(positions,i);pB.fromArray(positions,i+3);pC.fromArray(positions,i+6);cb.subVectors(pC,pB);ab.subVectors(pA,pB);cb.cross(ab);normals[i]=cb.x;normals[i+1]=cb.y;normals[i+2]=cb.z;normals[i+3]=cb.x;normals[i+4]=cb.y;normals[i+5]=cb.z;normals[i+6]=cb.x;normals[i+7]=cb.y;normals[i+8]=cb.z;}}this.normalizeNormals();attributes.normal.needsUpdate=true;}},computeTangents:function computeTangents(){console.warn('THREE.BufferGeometry: .computeTangents() has been removed.');},computeOffsets:function computeOffsets(size){console.warn('THREE.BufferGeometry: .computeOffsets() has been removed.');},merge:function merge(geometry,offset){if(geometry instanceof THREE.BufferGeometry===false){console.error('THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.',geometry);return;}if(offset===undefined)offset=0;var attributes=this.attributes;for(var key in attributes){if(geometry.attributes[key]===undefined)continue;var attribute1=attributes[key];var attributeArray1=attribute1.array;var attribute2=geometry.attributes[key];var attributeArray2=attribute2.array;var attributeSize=attribute2.itemSize;for(var i=0,j=attributeSize*offset;i<attributeArray2.length;i++,j++){attributeArray1[j]=attributeArray2[i];}}return this;},normalizeNormals:function normalizeNormals(){var normals=this.attributes.normal.array;var x,y,z,n;for(var i=0,il=normals.length;i<il;i+=3){x=normals[i];y=normals[i+1];z=normals[i+2];n=1.0/Math.sqrt(x*x+y*y+z*z);normals[i]*=n;normals[i+1]*=n;normals[i+2]*=n;}},toJSON:function toJSON(){var data={metadata:{version:4.4,type:'BufferGeometry',generator:'BufferGeometry.toJSON'}}; // standard BufferGeometry serialization
data.uuid=this.uuid;data.type=this.type;if(this.name!=='')data.name=this.name;if(this.parameters!==undefined){var parameters=this.parameters;for(var key in parameters){if(parameters[key]!==undefined)data[key]=parameters[key];}return data;}data.data={attributes:{}};var index=this.index;if(index!==null){var array=Array.prototype.slice.call(index.array);data.data.index={type:index.array.constructor.name,array:array};}var attributes=this.attributes;for(var key in attributes){var attribute=attributes[key];var array=Array.prototype.slice.call(attribute.array);data.data.attributes[key]={itemSize:attribute.itemSize,type:attribute.array.constructor.name,array:array};}var groups=this.groups;if(groups.length>0){data.data.groups=JSON.parse(JSON.stringify(groups));}var boundingSphere=this.boundingSphere;if(boundingSphere!==null){data.data.boundingSphere={center:boundingSphere.center.toArray(),radius:boundingSphere.radius};}return data;},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(source){var index=source.index;if(index!==null){this.setIndex(index.clone());}var attributes=source.attributes;for(var name in attributes){var attribute=attributes[name];this.addAttribute(name,attribute.clone());}var groups=source.groups;for(var i=0,l=groups.length;i<l;i++){var group=groups[i];this.addGroup(group.start,group.count);}return this;},dispose:function dispose(){this.dispatchEvent({type:'dispose'});}};THREE.EventDispatcher.prototype.apply(THREE.BufferGeometry.prototype);THREE.BufferGeometry.MaxIndex=65535; // File:src/core/InstancedBufferGeometry.js
/**
 * @author benaadams / https://twitter.com/ben_a_adams
 */THREE.InstancedBufferGeometry=function(){THREE.BufferGeometry.call(this);this.type='InstancedBufferGeometry';this.maxInstancedCount=undefined;};THREE.InstancedBufferGeometry.prototype=Object.create(THREE.BufferGeometry.prototype);THREE.InstancedBufferGeometry.prototype.constructor=THREE.InstancedBufferGeometry;THREE.InstancedBufferGeometry.prototype.addGroup=function(start,count,instances){this.groups.push({start:start,count:count,instances:instances});};THREE.InstancedBufferGeometry.prototype.copy=function(source){var index=source.index;if(index!==null){this.setIndex(index.clone());}var attributes=source.attributes;for(var name in attributes){var attribute=attributes[name];this.addAttribute(name,attribute.clone());}var groups=source.groups;for(var i=0,l=groups.length;i<l;i++){var group=groups[i];this.addGroup(group.start,group.count,group.instances);}return this;};THREE.EventDispatcher.prototype.apply(THREE.InstancedBufferGeometry.prototype); // File:src/animation/AnimationAction.js
/**
 *
 * A clip that has been explicitly scheduled.
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.AnimationAction=function(clip,startTime,timeScale,weight,loop){if(clip===undefined)throw new Error('clip is null');this.clip=clip;this.localRoot=null;this.startTime=startTime||0;this.timeScale=timeScale||1;this.weight=weight||1;this.loop=loop||THREE.LoopRepeat;this.loopCount=0;this.enabled=true; // allow for easy disabling of the action.
this.actionTime=-this.startTime;this.clipTime=0;this.propertyBindings=[];}; /*
THREE.LoopOnce = 2200;
THREE.LoopRepeat = 2201;
THREE.LoopPingPing = 2202;
*/THREE.AnimationAction.prototype={constructor:THREE.AnimationAction,setLocalRoot:function setLocalRoot(localRoot){this.localRoot=localRoot;return this;},updateTime:function updateTime(clipDeltaTime){var previousClipTime=this.clipTime;var previousLoopCount=this.loopCount;var previousActionTime=this.actionTime;var duration=this.clip.duration;this.actionTime=this.actionTime+clipDeltaTime;if(this.loop===THREE.LoopOnce){this.loopCount=0;this.clipTime=Math.min(Math.max(this.actionTime,0),duration); // if time is changed since last time, see if we have hit a start/end limit
if(this.clipTime!==previousClipTime){if(this.clipTime===duration){this.mixer.dispatchEvent({type:'finished',action:this,direction:1});}else if(this.clipTime===0){this.mixer.dispatchEvent({type:'finished',action:this,direction:-1});}}return this.clipTime;}this.loopCount=Math.floor(this.actionTime/duration);var newClipTime=this.actionTime-this.loopCount*duration;newClipTime=newClipTime%duration; // if we are ping pong looping, ensure that we go backwards when appropriate
if(this.loop==THREE.LoopPingPong){if(Math.abs(this.loopCount%2)===1){newClipTime=duration-newClipTime;}}this.clipTime=newClipTime;if(this.loopCount!==previousLoopCount){this.mixer.dispatchEvent({type:'loop',action:this,loopDelta:this.loopCount-this.loopCount});}return this.clipTime;},syncWith:function syncWith(action){this.actionTime=action.actionTime;this.timeScale=action.timeScale;return this;},warpToDuration:function warpToDuration(duration){this.timeScale=this.clip.duration/duration;return this;},init:function init(time){this.clipTime=time-this.startTime;return this;},update:function update(clipDeltaTime){this.updateTime(clipDeltaTime);var clipResults=this.clip.getAt(this.clipTime);return clipResults;},getTimeScaleAt:function getTimeScaleAt(time){if(this.timeScale.getAt){ // pass in time, not clip time, allows for fadein/fadeout across multiple loops of the clip
return this.timeScale.getAt(time);}return this.timeScale;},getWeightAt:function getWeightAt(time){if(this.weight.getAt){ // pass in time, not clip time, allows for fadein/fadeout across multiple loops of the clip
return this.weight.getAt(time);}return this.weight;}}; // File:src/animation/AnimationClip.js
/**
 *
 * Reusable set of Tracks that represent an animation.
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.AnimationClip=function(name,duration,tracks){this.name=name;this.tracks=tracks;this.duration=duration!==undefined?duration:-1; // this means it should figure out its duration by scanning the tracks
if(this.duration<0){for(var i=0;i<this.tracks.length;i++){var track=this.tracks[i];this.duration=Math.max(track.keys[track.keys.length-1].time);}} // maybe only do these on demand, as doing them here could potentially slow down loading
// but leaving these here during development as this ensures a lot of testing of these functions
this.trim();this.optimize();this.results=[];};THREE.AnimationClip.prototype={constructor:THREE.AnimationClip,getAt:function getAt(clipTime){clipTime=Math.max(0,Math.min(clipTime,this.duration));for(var i=0;i<this.tracks.length;i++){var track=this.tracks[i];this.results[i]=track.getAt(clipTime);}return this.results;},trim:function trim(){for(var i=0;i<this.tracks.length;i++){this.tracks[i].trim(0,this.duration);}return this;},optimize:function optimize(){for(var i=0;i<this.tracks.length;i++){this.tracks[i].optimize();}return this;}};THREE.AnimationClip.CreateFromMorphTargetSequence=function(name,morphTargetSequence,fps){var numMorphTargets=morphTargetSequence.length;var tracks=[];for(var i=0;i<numMorphTargets;i++){var keys=[];keys.push({time:(i+numMorphTargets-1)%numMorphTargets,value:0});keys.push({time:i,value:1});keys.push({time:(i+1)%numMorphTargets,value:0});keys.sort(THREE.KeyframeTrack.keyComparer); // if there is a key at the first frame, duplicate it as the last frame as well for perfect loop.
if(keys[0].time===0){keys.push({time:numMorphTargets,value:keys[0].value});}tracks.push(new THREE.NumberKeyframeTrack('.morphTargetInfluences['+morphTargetSequence[i].name+']',keys).scale(1.0/fps));}return new THREE.AnimationClip(name,-1,tracks);};THREE.AnimationClip.findByName=function(clipArray,name){for(var i=0;i<clipArray.length;i++){if(clipArray[i].name===name){return clipArray[i];}}return null;};THREE.AnimationClip.CreateClipsFromMorphTargetSequences=function(morphTargets,fps){var animationToMorphTargets={}; // tested with https://regex101.com/ on trick sequences such flamingo_flyA_003, flamingo_run1_003, crdeath0059
var pattern=/^([\w-]*?)([\d]+)$/; // sort morph target names into animation groups based patterns like Walk_001, Walk_002, Run_001, Run_002
for(var i=0,il=morphTargets.length;i<il;i++){var morphTarget=morphTargets[i];var parts=morphTarget.name.match(pattern);if(parts&&parts.length>1){var name=parts[1];var animationMorphTargets=animationToMorphTargets[name];if(!animationMorphTargets){animationToMorphTargets[name]=animationMorphTargets=[];}animationMorphTargets.push(morphTarget);}}var clips=[];for(var name in animationToMorphTargets){clips.push(THREE.AnimationClip.CreateFromMorphTargetSequence(name,animationToMorphTargets[name],fps));}return clips;}; // parse the standard JSON format for clips
THREE.AnimationClip.parse=function(json){var tracks=[];for(var i=0;i<json.tracks.length;i++){tracks.push(THREE.KeyframeTrack.parse(json.tracks[i]).scale(1.0/json.fps));}return new THREE.AnimationClip(json.name,json.duration,tracks);}; // parse the animation.hierarchy format
THREE.AnimationClip.parseAnimation=function(animation,bones,nodeName){if(!animation){console.error("  no animation in JSONLoader data");return null;}var convertTrack=function convertTrack(trackName,animationKeys,propertyName,trackType,animationKeyToValueFunc){var keys=[];for(var k=0;k<animationKeys.length;k++){var animationKey=animationKeys[k];if(animationKey[propertyName]!==undefined){keys.push({time:animationKey.time,value:animationKeyToValueFunc(animationKey)});}} // only return track if there are actually keys.
if(keys.length>0){return new trackType(trackName,keys);}return null;};var tracks=[];var clipName=animation.name||'default';var duration=animation.length||-1; // automatic length determination in AnimationClip.
var fps=animation.fps||30;var hierarchyTracks=animation.hierarchy||[];for(var h=0;h<hierarchyTracks.length;h++){var animationKeys=hierarchyTracks[h].keys; // skip empty tracks
if(!animationKeys||animationKeys.length==0){continue;} // process morph targets in a way exactly compatible with AnimationHandler.init( animation )
if(animationKeys[0].morphTargets){ // figure out all morph targets used in this track
var morphTargetNames={};for(var k=0;k<animationKeys.length;k++){if(animationKeys[k].morphTargets){for(var m=0;m<animationKeys[k].morphTargets.length;m++){morphTargetNames[animationKeys[k].morphTargets[m]]=-1;}}} // create a track for each morph target with all zero morphTargetInfluences except for the keys in which the morphTarget is named.
for(var morphTargetName in morphTargetNames){var keys=[];for(var m=0;m<animationKeys[k].morphTargets.length;m++){var animationKey=animationKeys[k];keys.push({time:animationKey.time,value:animationKey.morphTarget===morphTargetName?1:0});}tracks.push(new THREE.NumberKeyframeTrack(nodeName+'.morphTargetInfluence['+morphTargetName+']',keys));}duration=morphTargetNames.length*(fps||1.0);}else {var boneName=nodeName+'.bones['+bones[h].name+']'; // track contains positions...
var positionTrack=convertTrack(boneName+'.position',animationKeys,'pos',THREE.VectorKeyframeTrack,function(animationKey){return new THREE.Vector3().fromArray(animationKey.pos);});if(positionTrack)tracks.push(positionTrack); // track contains quaternions...
var quaternionTrack=convertTrack(boneName+'.quaternion',animationKeys,'rot',THREE.QuaternionKeyframeTrack,function(animationKey){if(animationKey.rot.slerp){return animationKey.rot.clone();}else {return new THREE.Quaternion().fromArray(animationKey.rot);}});if(quaternionTrack)tracks.push(quaternionTrack); // track contains quaternions...
var scaleTrack=convertTrack(boneName+'.scale',animationKeys,'scl',THREE.VectorKeyframeTrack,function(animationKey){return new THREE.Vector3().fromArray(animationKey.scl);});if(scaleTrack)tracks.push(scaleTrack);}}if(tracks.length===0){return null;}var clip=new THREE.AnimationClip(clipName,duration,tracks);return clip;}; // File:src/animation/AnimationMixer.js
/**
 *
 * Mixes together the AnimationClips scheduled by AnimationActions and applies them to the root and subtree
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.AnimationMixer=function(root){this.root=root;this.time=0;this.timeScale=1.0;this.actions=[];this.propertyBindingMap={};};THREE.AnimationMixer.prototype={constructor:THREE.AnimationMixer,addAction:function addAction(action){ // TODO: check for duplicate action names?  Or provide each action with a UUID?
this.actions.push(action);action.init(this.time);action.mixer=this;var tracks=action.clip.tracks;var root=action.localRoot||this.root;for(var i=0;i<tracks.length;i++){var track=tracks[i];var propertyBindingKey=root.uuid+'-'+track.name;var propertyBinding=this.propertyBindingMap[propertyBindingKey];if(propertyBinding===undefined){propertyBinding=new THREE.PropertyBinding(root,track.name);this.propertyBindingMap[propertyBindingKey]=propertyBinding;} // push in the same order as the tracks.
action.propertyBindings.push(propertyBinding); // track usages of shared property bindings, because if we leave too many around, the mixer can get slow
propertyBinding.referenceCount+=1;}},removeAllActions:function removeAllActions(){for(var i=0;i<this.actions.length;i++){this.actions[i].mixer=null;} // unbind all property bindings
for(var properyBindingKey in this.propertyBindingMap){this.propertyBindingMap[properyBindingKey].unbind();}this.actions=[];this.propertyBindingMap={};return this;},removeAction:function removeAction(action){var index=this.actions.indexOf(action);if(index!==-1){this.actions.splice(index,1);action.mixer=null;} // remove unused property bindings because if we leave them around the mixer can get slow
var root=action.localRoot||this.root;var tracks=action.clip.tracks;for(var i=0;i<tracks.length;i++){var track=tracks[i];var propertyBindingKey=root.uuid+'-'+track.name;var propertyBinding=this.propertyBindingMap[propertyBindingKey];propertyBinding.referenceCount-=1;if(propertyBinding.referenceCount<=0){propertyBinding.unbind();delete this.propertyBindingMap[propertyBindingKey];}}return this;}, // can be optimized if needed
findActionByName:function findActionByName(name){for(var i=0;i<this.actions.length;i++){if(this.actions[i].name===name)return this.actions[i];}return null;},play:function play(action,optionalFadeInDuration){action.startTime=this.time;this.addAction(action);return this;},fadeOut:function fadeOut(action,duration){var keys=[];keys.push({time:this.time,value:1});keys.push({time:this.time+duration,value:0});action.weight=new THREE.NumberKeyframeTrack("weight",keys);return this;},fadeIn:function fadeIn(action,duration){var keys=[];keys.push({time:this.time,value:0});keys.push({time:this.time+duration,value:1});action.weight=new THREE.NumberKeyframeTrack("weight",keys);return this;},warp:function warp(action,startTimeScale,endTimeScale,duration){var keys=[];keys.push({time:this.time,value:startTimeScale});keys.push({time:this.time+duration,value:endTimeScale});action.timeScale=new THREE.NumberKeyframeTrack("timeScale",keys);return this;},crossFade:function crossFade(fadeOutAction,fadeInAction,duration,warp){this.fadeOut(fadeOutAction,duration);this.fadeIn(fadeInAction,duration);if(warp){var startEndRatio=fadeOutAction.clip.duration/fadeInAction.clip.duration;var endStartRatio=1.0/startEndRatio;this.warp(fadeOutAction,1.0,startEndRatio,duration);this.warp(fadeInAction,endStartRatio,1.0,duration);}return this;},update:function update(deltaTime){var mixerDeltaTime=deltaTime*this.timeScale;this.time+=mixerDeltaTime;for(var i=0;i<this.actions.length;i++){var action=this.actions[i];var weight=action.getWeightAt(this.time);var actionTimeScale=action.getTimeScaleAt(this.time);var actionDeltaTime=mixerDeltaTime*actionTimeScale;var actionResults=action.update(actionDeltaTime);if(action.weight<=0||!action.enabled)continue;for(var j=0;j<actionResults.length;j++){var name=action.clip.tracks[j].name;action.propertyBindings[j].accumulate(actionResults[j],weight);}} // apply to nodes
for(var propertyBindingKey in this.propertyBindingMap){this.propertyBindingMap[propertyBindingKey].apply();}return this;}};THREE.EventDispatcher.prototype.apply(THREE.AnimationMixer.prototype); // File:src/animation/AnimationUtils.js
/**
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.AnimationUtils={getEqualsFunc:function getEqualsFunc(exemplarValue){if(exemplarValue.equals){return function equals_object(a,b){return a.equals(b);};}return function equals_primitive(a,b){return a===b;};},clone:function clone(exemplarValue){var typeName=typeof exemplarValue==='undefined'?'undefined':_typeof(exemplarValue);if(typeName==="object"){if(exemplarValue.clone){return exemplarValue.clone();}console.error("can not figure out how to copy exemplarValue",exemplarValue);}return exemplarValue;},lerp:function lerp(a,b,alpha,interTrack){var lerpFunc=THREE.AnimationUtils.getLerpFunc(a,interTrack);return lerpFunc(a,b,alpha);},lerp_object:function lerp_object(a,b,alpha){return a.lerp(b,alpha);},slerp_object:function slerp_object(a,b,alpha){return a.slerp(b,alpha);},lerp_number:function lerp_number(a,b,alpha){return a*(1-alpha)+b*alpha;},lerp_boolean:function lerp_boolean(a,b,alpha){return alpha<0.5?a:b;},lerp_boolean_immediate:function lerp_boolean_immediate(a,b,alpha){return a;},lerp_string:function lerp_string(a,b,alpha){return alpha<0.5?a:b;},lerp_string_immediate:function lerp_string_immediate(a,b,alpha){return a;}, // NOTE: this is an accumulator function that modifies the first argument (e.g. a).	This is to minimize memory alocations.
getLerpFunc:function getLerpFunc(exemplarValue,interTrack){if(exemplarValue===undefined||exemplarValue===null)throw new Error("examplarValue is null");var typeName=typeof exemplarValue==='undefined'?'undefined':_typeof(exemplarValue);switch(typeName){case "object":if(exemplarValue.lerp){return THREE.AnimationUtils.lerp_object;}if(exemplarValue.slerp){return THREE.AnimationUtils.slerp_object;}break;case "number":return THREE.AnimationUtils.lerp_number;case "boolean":if(interTrack){return THREE.AnimationUtils.lerp_boolean;}else {return THREE.AnimationUtils.lerp_boolean_immediate;}case "string":if(interTrack){return THREE.AnimationUtils.lerp_string;}else {return THREE.AnimationUtils.lerp_string_immediate;}}}}; // File:src/animation/KeyframeTrack.js
/**
 *
 * A Track that returns a keyframe interpolated value, currently linearly interpolated
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.KeyframeTrack=function(name,keys){if(name===undefined)throw new Error("track name is undefined");if(keys===undefined||keys.length===0)throw new Error("no keys in track named "+name);this.name=name;this.keys=keys; // time in seconds, value as value
// the index of the last result, used as a starting point for local search.
this.lastIndex=0;this.validate();this.optimize();};THREE.KeyframeTrack.prototype={constructor:THREE.KeyframeTrack,getAt:function getAt(time){ // this can not go higher than this.keys.length.
while(this.lastIndex<this.keys.length&&time>=this.keys[this.lastIndex].time){this.lastIndex++;}; // this can not go lower than 0.
while(this.lastIndex>0&&time<this.keys[this.lastIndex-1].time){this.lastIndex--;}if(this.lastIndex>=this.keys.length){this.setResult(this.keys[this.keys.length-1].value);return this.result;}if(this.lastIndex===0){this.setResult(this.keys[0].value);return this.result;}var prevKey=this.keys[this.lastIndex-1];this.setResult(prevKey.value); // if true, means that prev/current keys are identical, thus no interpolation required.
if(prevKey.constantToNext){return this.result;} // linear interpolation to start with
var currentKey=this.keys[this.lastIndex];var alpha=(time-prevKey.time)/(currentKey.time-prevKey.time);this.result=this.lerpValues(this.result,currentKey.value,alpha);return this.result;}, // move all keyframes either forwards or backwards in time
shift:function shift(timeOffset){if(timeOffset!==0.0){for(var i=0;i<this.keys.length;i++){this.keys[i].time+=timeOffset;}}return this;}, // scale all keyframe times by a factor (useful for frame <-> seconds conversions)
scale:function scale(timeScale){if(timeScale!==1.0){for(var i=0;i<this.keys.length;i++){this.keys[i].time*=timeScale;}}return this;}, // removes keyframes before and after animation without changing any values within the range [startTime, endTime].
// IMPORTANT: We do not shift around keys to the start of the track time, because for interpolated keys this will change their values
trim:function trim(startTime,endTime){var firstKeysToRemove=0;for(var i=1;i<this.keys.length;i++){if(this.keys[i]<=startTime){firstKeysToRemove++;}}var lastKeysToRemove=0;for(var i=this.keys.length-2;i>0;i++){if(this.keys[i]>=endTime){lastKeysToRemove++;}else {break;}} // remove last keys first because it doesn't affect the position of the first keys (the otherway around doesn't work as easily)
if(firstKeysToRemove+lastKeysToRemove>0){this.keys=this.keys.splice(firstKeysToRemove,this.keys.length-lastKeysToRemove-firstKeysToRemove);;}return this;}, /* NOTE: This is commented out because we really shouldn't have to handle unsorted key lists
	         Tracks with out of order keys should be considered to be invalid.  - bhouston
	sort: function() {

		this.keys.sort( THREE.KeyframeTrack.keyComparer );

		return this;

	},*/ // ensure we do not get a GarbageInGarbageOut situation, make sure tracks are at least minimally viable
// One could eventually ensure that all key.values in a track are all of the same type (otherwise interpolation makes no sense.)
validate:function validate(){var prevKey=null;if(this.keys.length===0){console.error("  track is empty, no keys",this);return;}for(var i=0;i<this.keys.length;i++){var currKey=this.keys[i];if(!currKey){console.error("  key is null in track",this,i);return;}if(typeof currKey.time!=='number'||isNaN(currKey.time)){console.error("  key.time is not a valid number",this,i,currKey);return;}if(currKey.value===undefined||currKey.value===null){console.error("  key.value is null in track",this,i,currKey);return;}if(prevKey&&prevKey.time>currKey.time){console.error("  key.time is less than previous key time, out of order keys",this,i,currKey,prevKey);return;}prevKey=currKey;}return this;}, // currently only removes equivalent sequential keys (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0), which are common in morph target animations
optimize:function optimize(){var newKeys=[];var prevKey=this.keys[0];newKeys.push(prevKey);var equalsFunc=THREE.AnimationUtils.getEqualsFunc(prevKey.value);for(var i=1;i<this.keys.length-1;i++){var currKey=this.keys[i];var nextKey=this.keys[i+1]; // if prevKey & currKey are the same time, remove currKey.  If you want immediate adjacent keys, use an epsilon offset
// it is not possible to have two keys at the same time as we sort them.  The sort is not stable on keys with the same time.
if(prevKey.time===currKey.time){continue;} // remove completely unnecessary keyframes that are the same as their prev and next keys
if(this.compareValues(prevKey.value,currKey.value)&&this.compareValues(currKey.value,nextKey.value)){continue;} // determine if interpolation is required
prevKey.constantToNext=this.compareValues(prevKey.value,currKey.value);newKeys.push(currKey);prevKey=currKey;}newKeys.push(this.keys[this.keys.length-1]);this.keys=newKeys;return this;}};THREE.KeyframeTrack.keyComparer=function keyComparator(key0,key1){return key0.time-key1.time;};THREE.KeyframeTrack.parse=function(json){if(json.type===undefined)throw new Error("track type undefined, can not parse");var trackType=THREE.KeyframeTrack.GetTrackTypeForTypeName(json.type);return trackType.parse(json);};THREE.KeyframeTrack.GetTrackTypeForTypeName=function(typeName){switch(typeName.toLowerCase()){case "vector":case "vector2":case "vector3":case "vector4":return THREE.VectorKeyframeTrack;case "quaternion":return THREE.QuaternionKeyframeTrack;case "integer":case "scalar":case "double":case "float":case "number":return THREE.NumberKeyframeTrack;case "bool":case "boolean":return THREE.BooleanKeyframeTrack;case "string":return THREE.StringKeyframeTrack;};throw new Error("Unsupported typeName: "+typeName);}; // File:src/animation/PropertyBinding.js
/**
 *
 * A track bound to a real value in the scene graph.
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.PropertyBinding=function(rootNode,trackName){this.rootNode=rootNode;this.trackName=trackName;this.referenceCount=0;this.originalValue=null; // the value of the property before it was controlled by this binding
var parseResults=THREE.PropertyBinding.parseTrackName(trackName);this.directoryName=parseResults.directoryName;this.nodeName=parseResults.nodeName;this.objectName=parseResults.objectName;this.objectIndex=parseResults.objectIndex;this.propertyName=parseResults.propertyName;this.propertyIndex=parseResults.propertyIndex;this.node=THREE.PropertyBinding.findNode(rootNode,this.nodeName)||rootNode;this.cumulativeValue=null;this.cumulativeWeight=0;};THREE.PropertyBinding.prototype={constructor:THREE.PropertyBinding,reset:function reset(){this.cumulativeValue=null;this.cumulativeWeight=0;},accumulate:function accumulate(value,weight){if(!this.isBound)this.bind();if(this.cumulativeWeight===0){if(weight>0){if(this.cumulativeValue===null){this.cumulativeValue=THREE.AnimationUtils.clone(value);}this.cumulativeWeight=weight;}}else {var lerpAlpha=weight/(this.cumulativeWeight+weight);this.cumulativeValue=this.lerpValue(this.cumulativeValue,value,lerpAlpha);this.cumulativeWeight+=weight;}},unbind:function unbind(){if(!this.isBound)return;this.setValue(this.originalValue);this.setValue=null;this.getValue=null;this.lerpValue=null;this.equalsValue=null;this.triggerDirty=null;this.isBound=false;}, // bind to the real property in the scene graph, remember original value, memorize various accessors for speed/inefficiency
bind:function bind(){if(this.isBound)return;var targetObject=this.node; // ensure there is a value node
if(!targetObject){console.error("  trying to update node for track: "+this.trackName+" but it wasn't found.");return;}if(this.objectName){ // special case were we need to reach deeper into the hierarchy to get the face materials....
if(this.objectName==="materials"){if(!targetObject.material){console.error('  can not bind to material as node does not have a material',this);return;}if(!targetObject.material.materials){console.error('  can not bind to material.materials as node.material does not have a materials array',this);return;}targetObject=targetObject.material.materials;}else if(this.objectName==="bones"){if(!targetObject.skeleton){console.error('  can not bind to bones as node does not have a skeleton',this);return;} // potential future optimization: skip this if propertyIndex is already an integer, and convert the integer string to a true integer.
targetObject=targetObject.skeleton.bones; // support resolving morphTarget names into indices.
for(var i=0;i<targetObject.length;i++){if(targetObject[i].name===this.objectIndex){this.objectIndex=i;break;}}}else {if(targetObject[this.objectName]===undefined){console.error('  can not bind to objectName of node, undefined',this);return;}targetObject=targetObject[this.objectName];}if(this.objectIndex!==undefined){if(targetObject[this.objectIndex]===undefined){console.error("  trying to bind to objectIndex of objectName, but is undefined:",this,targetObject);return;}targetObject=targetObject[this.objectIndex];}} // special case mappings
var nodeProperty=targetObject[this.propertyName];if(!nodeProperty){console.error("  trying to update property for track: "+this.nodeName+'.'+this.propertyName+" but it wasn't found.",targetObject);return;} // access a sub element of the property array (only primitives are supported right now)
if(this.propertyIndex!==undefined){if(this.propertyName==="morphTargetInfluences"){ // potential optimization, skip this if propertyIndex is already an integer, and convert the integer string to a true integer.
// support resolving morphTarget names into indices.
if(!targetObject.geometry){console.error('  can not bind to morphTargetInfluences becasuse node does not have a geometry',this);}if(!targetObject.geometry.morphTargets){console.error('  can not bind to morphTargetInfluences becasuse node does not have a geometry.morphTargets',this);}for(var i=0;i<this.node.geometry.morphTargets.length;i++){if(targetObject.geometry.morphTargets[i].name===this.propertyIndex){this.propertyIndex=i;break;}}}this.setValue=function setValue_propertyIndexed(value){if(!this.equalsValue(nodeProperty[this.propertyIndex],value)){nodeProperty[this.propertyIndex]=value;return true;}return false;};this.getValue=function getValue_propertyIndexed(){return nodeProperty[this.propertyIndex];};} // must use copy for Object3D.Euler/Quaternion
else if(nodeProperty.copy){this.setValue=function setValue_propertyObject(value){if(!this.equalsValue(nodeProperty,value)){nodeProperty.copy(value);return true;}return false;};this.getValue=function getValue_propertyObject(){return nodeProperty;};} // otherwise just set the property directly on the node (do not use nodeProperty as it may not be a reference object)
else {this.setValue=function setValue_property(value){if(!this.equalsValue(targetObject[this.propertyName],value)){targetObject[this.propertyName]=value;return true;}return false;};this.getValue=function getValue_property(){return targetObject[this.propertyName];};} // trigger node dirty
if(targetObject.needsUpdate!==undefined){ // material
this.triggerDirty=function triggerDirty_needsUpdate(){this.node.needsUpdate=true;};}else if(targetObject.matrixWorldNeedsUpdate!==undefined){ // node transform
this.triggerDirty=function triggerDirty_matrixWorldNeedsUpdate(){targetObject.matrixWorldNeedsUpdate=true;};}this.originalValue=this.getValue();this.equalsValue=THREE.AnimationUtils.getEqualsFunc(this.originalValue);this.lerpValue=THREE.AnimationUtils.getLerpFunc(this.originalValue,true);this.isBound=true;},apply:function apply(){ // for speed capture the setter pattern as a closure (sort of a memoization pattern: https://en.wikipedia.org/wiki/Memoization)
if(!this.isBound)this.bind(); // early exit if there is nothing to apply.
if(this.cumulativeWeight>0){ // blend with original value
if(this.cumulativeWeight<1){var remainingWeight=1-this.cumulativeWeight;var lerpAlpha=remainingWeight/(this.cumulativeWeight+remainingWeight);this.cumulativeValue=this.lerpValue(this.cumulativeValue,this.originalValue,lerpAlpha);}var valueChanged=this.setValue(this.cumulativeValue);if(valueChanged&&this.triggerDirty){this.triggerDirty();} // reset accumulator
this.cumulativeValue=null;this.cumulativeWeight=0;}}};THREE.PropertyBinding.parseTrackName=function(trackName){ // matches strings in the form of:
//    nodeName.property
//    nodeName.property[accessor]
//    nodeName.material.property[accessor]
//    uuid.property[accessor]
//    uuid.objectName[objectIndex].propertyName[propertyIndex]
//    parentName/nodeName.property
//    parentName/parentName/nodeName.property[index]
//	  .bone[Armature.DEF_cog].position
// created and tested via https://regex101.com/#javascript
var re=/^(([\w]+\/)*)([\w-\d]+)?(\.([\w]+)(\[([\w\d\[\]\_. ]+)\])?)?(\.([\w.]+)(\[([\w\d\[\]\_. ]+)\])?)$/;var matches=re.exec(trackName);if(!matches){throw new Error("cannot parse trackName at all: "+trackName);}if(matches.index===re.lastIndex){re.lastIndex++;}var results={directoryName:matches[1],nodeName:matches[3], // allowed to be null, specified root node.
objectName:matches[5],objectIndex:matches[7],propertyName:matches[9],propertyIndex:matches[11] // allowed to be null, specifies that the whole property is set.
};if(results.propertyName===null||results.propertyName.length===0){throw new Error("can not parse propertyName from trackName: "+trackName);}return results;};THREE.PropertyBinding.findNode=function(root,nodeName){function searchSkeleton(skeleton){for(var i=0;i<skeleton.bones.length;i++){var bone=skeleton.bones[i];if(bone.name===nodeName){return bone;}}return null;}function searchNodeSubtree(children){for(var i=0;i<children.length;i++){var childNode=children[i];if(childNode.name===nodeName||childNode.uuid===nodeName){return childNode;}var result=searchNodeSubtree(childNode.children);if(result)return result;}return null;} //
if(!nodeName||nodeName===""||nodeName==="root"||nodeName==="."||nodeName===-1||nodeName===root.name||nodeName===root.uuid){return root;} // search into skeleton bones.
if(root.skeleton){var bone=searchSkeleton(root.skeleton);if(bone){return bone;}} // search into node subtree.
if(root.children){var subTreeNode=searchNodeSubtree(root.children);if(subTreeNode){return subTreeNode;}}return null;}; // File:src/animation/tracks/VectorKeyframeTrack.js
/**
 *
 * A Track that interpolates Vectors
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.VectorKeyframeTrack=function(name,keys){THREE.KeyframeTrack.call(this,name,keys); // local cache of value type to avoid allocations during runtime.
this.result=this.keys[0].value.clone();};THREE.VectorKeyframeTrack.prototype=Object.create(THREE.KeyframeTrack.prototype);THREE.VectorKeyframeTrack.prototype.constructor=THREE.VectorKeyframeTrack;THREE.VectorKeyframeTrack.prototype.setResult=function(value){this.result.copy(value);}; // memoization of the lerp function for speed.
// NOTE: Do not optimize as a prototype initialization closure, as value0 will be different on a per class basis.
THREE.VectorKeyframeTrack.prototype.lerpValues=function(value0,value1,alpha){return value0.lerp(value1,alpha);};THREE.VectorKeyframeTrack.prototype.compareValues=function(value0,value1){return value0.equals(value1);};THREE.VectorKeyframeTrack.prototype.clone=function(){var clonedKeys=[];for(var i=0;i<this.keys.length;i++){var key=this.keys[i];clonedKeys.push({time:key.time,value:key.value.clone()});}return new THREE.VectorKeyframeTrack(this.name,clonedKeys);};THREE.VectorKeyframeTrack.parse=function(json){var elementCount=json.keys[0].value.length;var valueType=THREE['Vector'+elementCount];var keys=[];for(var i=0;i<json.keys.length;i++){var jsonKey=json.keys[i];keys.push({value:new valueType().fromArray(jsonKey.value),time:jsonKey.time});}return new THREE.VectorKeyframeTrack(json.name,keys);}; // File:src/animation/tracks/QuaternionKeyframeTrack.js
/**
 *
 * A Track that interpolates Quaternion
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.QuaternionKeyframeTrack=function(name,keys){THREE.KeyframeTrack.call(this,name,keys); // local cache of value type to avoid allocations during runtime.
this.result=this.keys[0].value.clone();};THREE.QuaternionKeyframeTrack.prototype=Object.create(THREE.KeyframeTrack.prototype);THREE.QuaternionKeyframeTrack.prototype.constructor=THREE.QuaternionKeyframeTrack;THREE.QuaternionKeyframeTrack.prototype.setResult=function(value){this.result.copy(value);}; // memoization of the lerp function for speed.
// NOTE: Do not optimize as a prototype initialization closure, as value0 will be different on a per class basis.
THREE.QuaternionKeyframeTrack.prototype.lerpValues=function(value0,value1,alpha){return value0.slerp(value1,alpha);};THREE.QuaternionKeyframeTrack.prototype.compareValues=function(value0,value1){return value0.equals(value1);};THREE.QuaternionKeyframeTrack.prototype.multiply=function(quat){for(var i=0;i<this.keys.length;i++){this.keys[i].value.multiply(quat);}return this;};THREE.QuaternionKeyframeTrack.prototype.clone=function(){var clonedKeys=[];for(var i=0;i<this.keys.length;i++){var key=this.keys[i];clonedKeys.push({time:key.time,value:key.value.clone()});}return new THREE.QuaternionKeyframeTrack(this.name,clonedKeys);};THREE.QuaternionKeyframeTrack.parse=function(json){var keys=[];for(var i=0;i<json.keys.length;i++){var jsonKey=json.keys[i];keys.push({value:new THREE.Quaternion().fromArray(jsonKey.value),time:jsonKey.time});}return new THREE.QuaternionKeyframeTrack(json.name,keys);}; // File:src/animation/tracks/StringKeyframeTrack.js
/**
 *
 * A Track that interpolates Strings
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.StringKeyframeTrack=function(name,keys){THREE.KeyframeTrack.call(this,name,keys); // local cache of value type to avoid allocations during runtime.
this.result=this.keys[0].value;};THREE.StringKeyframeTrack.prototype=Object.create(THREE.KeyframeTrack.prototype);THREE.StringKeyframeTrack.prototype.constructor=THREE.StringKeyframeTrack;THREE.StringKeyframeTrack.prototype.setResult=function(value){this.result=value;}; // memoization of the lerp function for speed.
// NOTE: Do not optimize as a prototype initialization closure, as value0 will be different on a per class basis.
THREE.StringKeyframeTrack.prototype.lerpValues=function(value0,value1,alpha){return alpha<1.0?value0:value1;};THREE.StringKeyframeTrack.prototype.compareValues=function(value0,value1){return value0===value1;};THREE.StringKeyframeTrack.prototype.clone=function(){var clonedKeys=[];for(var i=0;i<this.keys.length;i++){var key=this.keys[i];clonedKeys.push({time:key.time,value:key.value});}return new THREE.StringKeyframeTrack(this.name,clonedKeys);};THREE.StringKeyframeTrack.parse=function(json){return new THREE.StringKeyframeTrack(json.name,json.keys);}; // File:src/animation/tracks/BooleanKeyframeTrack.js
/**
 *
 * A Track that interpolates Boolean
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.BooleanKeyframeTrack=function(name,keys){THREE.KeyframeTrack.call(this,name,keys); // local cache of value type to avoid allocations during runtime.
this.result=this.keys[0].value;};THREE.BooleanKeyframeTrack.prototype=Object.create(THREE.KeyframeTrack.prototype);THREE.BooleanKeyframeTrack.prototype.constructor=THREE.BooleanKeyframeTrack;THREE.BooleanKeyframeTrack.prototype.setResult=function(value){this.result=value;}; // memoization of the lerp function for speed.
// NOTE: Do not optimize as a prototype initialization closure, as value0 will be different on a per class basis.
THREE.BooleanKeyframeTrack.prototype.lerpValues=function(value0,value1,alpha){return alpha<1.0?value0:value1;};THREE.BooleanKeyframeTrack.prototype.compareValues=function(value0,value1){return value0===value1;};THREE.BooleanKeyframeTrack.prototype.clone=function(){var clonedKeys=[];for(var i=0;i<this.keys.length;i++){var key=this.keys[i];clonedKeys.push({time:key.time,value:key.value});}return new THREE.BooleanKeyframeTrack(this.name,clonedKeys);};THREE.BooleanKeyframeTrack.parse=function(json){return new THREE.BooleanKeyframeTrack(json.name,json.keys);}; // File:src/animation/tracks/NumberKeyframeTrack.js
/**
 *
 * A Track that interpolates Numbers
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */THREE.NumberKeyframeTrack=function(name,keys){THREE.KeyframeTrack.call(this,name,keys); // local cache of value type to avoid allocations during runtime.
this.result=this.keys[0].value;};THREE.NumberKeyframeTrack.prototype=Object.create(THREE.KeyframeTrack.prototype);THREE.NumberKeyframeTrack.prototype.constructor=THREE.NumberKeyframeTrack;THREE.NumberKeyframeTrack.prototype.setResult=function(value){this.result=value;}; // memoization of the lerp function for speed.
// NOTE: Do not optimize as a prototype initialization closure, as value0 will be different on a per class basis.
THREE.NumberKeyframeTrack.prototype.lerpValues=function(value0,value1,alpha){return value0*(1-alpha)+value1*alpha;};THREE.NumberKeyframeTrack.prototype.compareValues=function(value0,value1){return value0===value1;};THREE.NumberKeyframeTrack.prototype.clone=function(){var clonedKeys=[];for(var i=0;i<this.keys.length;i++){var key=this.keys[i];clonedKeys.push({time:key.time,value:key.value});}return new THREE.NumberKeyframeTrack(this.name,clonedKeys);};THREE.NumberKeyframeTrack.parse=function(json){return new THREE.NumberKeyframeTrack(json.name,json.keys);}; // File:src/cameras/Camera.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author mikael emtinger / http://gomo.se/
 * @author WestLangley / http://github.com/WestLangley
*/THREE.Camera=function(){THREE.Object3D.call(this);this.type='Camera';this.matrixWorldInverse=new THREE.Matrix4();this.projectionMatrix=new THREE.Matrix4();};THREE.Camera.prototype=Object.create(THREE.Object3D.prototype);THREE.Camera.prototype.constructor=THREE.Camera;THREE.Camera.prototype.getWorldDirection=function(){var quaternion=new THREE.Quaternion();return function(optionalTarget){var result=optionalTarget||new THREE.Vector3();this.getWorldQuaternion(quaternion);return result.set(0,0,-1).applyQuaternion(quaternion);};}();THREE.Camera.prototype.lookAt=function(){ // This routine does not support cameras with rotated and/or translated parent(s)
var m1=new THREE.Matrix4();return function(vector){m1.lookAt(this.position,vector,this.up);this.quaternion.setFromRotationMatrix(m1);};}();THREE.Camera.prototype.clone=function(){return new this.constructor().copy(this);};THREE.Camera.prototype.copy=function(source){THREE.Object3D.prototype.copy.call(this,source);this.matrixWorldInverse.copy(source.matrixWorldInverse);this.projectionMatrix.copy(source.projectionMatrix);return this;}; // File:src/cameras/CubeCamera.js
/**
 * Camera for rendering cube maps
 *	- renders scene into axis-aligned cube
 *
 * @author alteredq / http://alteredqualia.com/
 */THREE.CubeCamera=function(near,far,cubeResolution){THREE.Object3D.call(this);this.type='CubeCamera';var fov=90,aspect=1;var cameraPX=new THREE.PerspectiveCamera(fov,aspect,near,far);cameraPX.up.set(0,-1,0);cameraPX.lookAt(new THREE.Vector3(1,0,0));this.add(cameraPX);var cameraNX=new THREE.PerspectiveCamera(fov,aspect,near,far);cameraNX.up.set(0,-1,0);cameraNX.lookAt(new THREE.Vector3(-1,0,0));this.add(cameraNX);var cameraPY=new THREE.PerspectiveCamera(fov,aspect,near,far);cameraPY.up.set(0,0,1);cameraPY.lookAt(new THREE.Vector3(0,1,0));this.add(cameraPY);var cameraNY=new THREE.PerspectiveCamera(fov,aspect,near,far);cameraNY.up.set(0,0,-1);cameraNY.lookAt(new THREE.Vector3(0,-1,0));this.add(cameraNY);var cameraPZ=new THREE.PerspectiveCamera(fov,aspect,near,far);cameraPZ.up.set(0,-1,0);cameraPZ.lookAt(new THREE.Vector3(0,0,1));this.add(cameraPZ);var cameraNZ=new THREE.PerspectiveCamera(fov,aspect,near,far);cameraNZ.up.set(0,-1,0);cameraNZ.lookAt(new THREE.Vector3(0,0,-1));this.add(cameraNZ);this.renderTarget=new THREE.WebGLRenderTargetCube(cubeResolution,cubeResolution,{format:THREE.RGBFormat,magFilter:THREE.LinearFilter,minFilter:THREE.LinearFilter});this.updateCubeMap=function(renderer,scene){if(this.parent===null)this.updateMatrixWorld();var renderTarget=this.renderTarget;var generateMipmaps=renderTarget.texture.generateMipmaps;renderTarget.texture.generateMipmaps=false;renderTarget.activeCubeFace=0;renderer.render(scene,cameraPX,renderTarget);renderTarget.activeCubeFace=1;renderer.render(scene,cameraNX,renderTarget);renderTarget.activeCubeFace=2;renderer.render(scene,cameraPY,renderTarget);renderTarget.activeCubeFace=3;renderer.render(scene,cameraNY,renderTarget);renderTarget.activeCubeFace=4;renderer.render(scene,cameraPZ,renderTarget);renderTarget.texture.generateMipmaps=generateMipmaps;renderTarget.activeCubeFace=5;renderer.render(scene,cameraNZ,renderTarget);renderer.setRenderTarget(null);};};THREE.CubeCamera.prototype=Object.create(THREE.Object3D.prototype);THREE.CubeCamera.prototype.constructor=THREE.CubeCamera; // File:src/cameras/OrthographicCamera.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.OrthographicCamera=function(left,right,top,bottom,near,far){THREE.Camera.call(this);this.type='OrthographicCamera';this.zoom=1;this.left=left;this.right=right;this.top=top;this.bottom=bottom;this.near=near!==undefined?near:0.1;this.far=far!==undefined?far:2000;this.updateProjectionMatrix();};THREE.OrthographicCamera.prototype=Object.create(THREE.Camera.prototype);THREE.OrthographicCamera.prototype.constructor=THREE.OrthographicCamera;THREE.OrthographicCamera.prototype.updateProjectionMatrix=function(){var dx=(this.right-this.left)/(2*this.zoom);var dy=(this.top-this.bottom)/(2*this.zoom);var cx=(this.right+this.left)/2;var cy=(this.top+this.bottom)/2;this.projectionMatrix.makeOrthographic(cx-dx,cx+dx,cy+dy,cy-dy,this.near,this.far);};THREE.OrthographicCamera.prototype.copy=function(source){THREE.Camera.prototype.copy.call(this,source);this.left=source.left;this.right=source.right;this.top=source.top;this.bottom=source.bottom;this.near=source.near;this.far=source.far;this.zoom=source.zoom;return this;};THREE.OrthographicCamera.prototype.toJSON=function(meta){var data=THREE.Object3D.prototype.toJSON.call(this,meta);data.object.zoom=this.zoom;data.object.left=this.left;data.object.right=this.right;data.object.top=this.top;data.object.bottom=this.bottom;data.object.near=this.near;data.object.far=this.far;return data;}; // File:src/cameras/PerspectiveCamera.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author greggman / http://games.greggman.com/
 * @author zz85 / http://www.lab4games.net/zz85/blog
 */THREE.PerspectiveCamera=function(fov,aspect,near,far){THREE.Camera.call(this);this.type='PerspectiveCamera';this.zoom=1;this.fov=fov!==undefined?fov:50;this.aspect=aspect!==undefined?aspect:1;this.near=near!==undefined?near:0.1;this.far=far!==undefined?far:2000;this.updateProjectionMatrix();};THREE.PerspectiveCamera.prototype=Object.create(THREE.Camera.prototype);THREE.PerspectiveCamera.prototype.constructor=THREE.PerspectiveCamera; /**
 * Uses Focal Length (in mm) to estimate and set FOV
 * 35mm (full-frame) camera is used if frame size is not specified;
 * Formula based on http://www.bobatkins.com/photography/technical/field_of_view.html
 */THREE.PerspectiveCamera.prototype.setLens=function(focalLength,frameHeight){if(frameHeight===undefined)frameHeight=24;this.fov=2*THREE.Math.radToDeg(Math.atan(frameHeight/(focalLength*2)));this.updateProjectionMatrix();}; /**
 * Sets an offset in a larger frustum. This is useful for multi-window or
 * multi-monitor/multi-machine setups.
 *
 * For example, if you have 3x2 monitors and each monitor is 1920x1080 and
 * the monitors are in grid like this
 *
 *   +---+---+---+
 *   | A | B | C |
 *   +---+---+---+
 *   | D | E | F |
 *   +---+---+---+
 *
 * then for each monitor you would call it like this
 *
 *   var w = 1920;
 *   var h = 1080;
 *   var fullWidth = w * 3;
 *   var fullHeight = h * 2;
 *
 *   --A--
 *   camera.setOffset( fullWidth, fullHeight, w * 0, h * 0, w, h );
 *   --B--
 *   camera.setOffset( fullWidth, fullHeight, w * 1, h * 0, w, h );
 *   --C--
 *   camera.setOffset( fullWidth, fullHeight, w * 2, h * 0, w, h );
 *   --D--
 *   camera.setOffset( fullWidth, fullHeight, w * 0, h * 1, w, h );
 *   --E--
 *   camera.setOffset( fullWidth, fullHeight, w * 1, h * 1, w, h );
 *   --F--
 *   camera.setOffset( fullWidth, fullHeight, w * 2, h * 1, w, h );
 *
 *   Note there is no reason monitors have to be the same size or in a grid.
 */THREE.PerspectiveCamera.prototype.setViewOffset=function(fullWidth,fullHeight,x,y,width,height){this.fullWidth=fullWidth;this.fullHeight=fullHeight;this.x=x;this.y=y;this.width=width;this.height=height;this.updateProjectionMatrix();};THREE.PerspectiveCamera.prototype.updateProjectionMatrix=function(){var fov=THREE.Math.radToDeg(2*Math.atan(Math.tan(THREE.Math.degToRad(this.fov)*0.5)/this.zoom));if(this.fullWidth){var aspect=this.fullWidth/this.fullHeight;var top=Math.tan(THREE.Math.degToRad(fov*0.5))*this.near;var bottom=-top;var left=aspect*bottom;var right=aspect*top;var width=Math.abs(right-left);var height=Math.abs(top-bottom);this.projectionMatrix.makeFrustum(left+this.x*width/this.fullWidth,left+(this.x+this.width)*width/this.fullWidth,top-(this.y+this.height)*height/this.fullHeight,top-this.y*height/this.fullHeight,this.near,this.far);}else {this.projectionMatrix.makePerspective(fov,this.aspect,this.near,this.far);}};THREE.PerspectiveCamera.prototype.copy=function(source){THREE.Camera.prototype.copy.call(this,source);this.fov=source.fov;this.aspect=source.aspect;this.near=source.near;this.far=source.far;this.zoom=source.zoom;return this;};THREE.PerspectiveCamera.prototype.toJSON=function(meta){var data=THREE.Object3D.prototype.toJSON.call(this,meta);data.object.zoom=this.zoom;data.object.fov=this.fov;data.object.aspect=this.aspect;data.object.near=this.near;data.object.far=this.far;return data;}; // File:src/lights/Light.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */THREE.Light=function(color){THREE.Object3D.call(this);this.type='Light';this.color=new THREE.Color(color);this.receiveShadow=undefined;};THREE.Light.prototype=Object.create(THREE.Object3D.prototype);THREE.Light.prototype.constructor=THREE.Light;Object.defineProperties(THREE.Light.prototype,{onlyShadow:{set:function set(value){console.warn('THREE.Light: .onlyShadow has been removed.');}},shadowCameraFov:{set:function set(value){this.shadow.camera.fov=value;}},shadowCameraLeft:{set:function set(value){this.shadow.camera.left=value;}},shadowCameraRight:{set:function set(value){this.shadow.camera.right=value;}},shadowCameraTop:{set:function set(value){this.shadow.camera.top=value;}},shadowCameraBottom:{set:function set(value){this.shadow.camera.bottom=value;}},shadowCameraNear:{set:function set(value){this.shadow.camera.near=value;}},shadowCameraFar:{set:function set(value){this.shadow.camera.far=value;}},shadowCameraVisible:{set:function set(value){console.warn('THREE.Light: .shadowCameraVisible has been removed. Use new THREE.CameraHelper( light.shadow ) instead.');}},shadowBias:{set:function set(value){this.shadow.bias=value;}},shadowDarkness:{set:function set(value){this.shadow.darkness=value;}},shadowMapWidth:{set:function set(value){this.shadow.mapSize.width=value;}},shadowMapHeight:{set:function set(value){this.shadow.mapSize.height=value;}}});THREE.Light.prototype.copy=function(source){THREE.Object3D.prototype.copy.call(this,source);this.color.copy(source.color);return this;};THREE.Light.prototype.toJSON=function(meta){var data=THREE.Object3D.prototype.toJSON.call(this,meta);data.object.color=this.color.getHex();if(this.groundColor!==undefined)data.object.groundColor=this.groundColor.getHex();if(this.intensity!==undefined)data.object.intensity=this.intensity;if(this.distance!==undefined)data.object.distance=this.distance;if(this.angle!==undefined)data.object.angle=this.angle;if(this.decay!==undefined)data.object.decay=this.decay;if(this.exponent!==undefined)data.object.exponent=this.exponent;return data;}; // File:src/lights/LightShadow.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.LightShadow=function(camera){this.camera=camera;this.bias=0;this.darkness=1;this.mapSize=new THREE.Vector2(512,512);this.map=null;this.matrix=null;};THREE.LightShadow.prototype={constructor:THREE.LightShadow,copy:function copy(source){this.camera=source.camera.clone();this.bias=source.bias;this.darkness=source.darkness;this.mapSize.copy(source.mapSize);},clone:function clone(){return new this.constructor().copy(this);}}; // File:src/lights/AmbientLight.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.AmbientLight=function(color){THREE.Light.call(this,color);this.type='AmbientLight';this.castShadow=undefined;};THREE.AmbientLight.prototype=Object.create(THREE.Light.prototype);THREE.AmbientLight.prototype.constructor=THREE.AmbientLight; // File:src/lights/DirectionalLight.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */THREE.DirectionalLight=function(color,intensity){THREE.Light.call(this,color);this.type='DirectionalLight';this.position.set(0,1,0);this.updateMatrix();this.target=new THREE.Object3D();this.intensity=intensity!==undefined?intensity:1;this.shadow=new THREE.LightShadow(new THREE.OrthographicCamera(-500,500,500,-500,50,5000));};THREE.DirectionalLight.prototype=Object.create(THREE.Light.prototype);THREE.DirectionalLight.prototype.constructor=THREE.DirectionalLight;THREE.DirectionalLight.prototype.copy=function(source){THREE.Light.prototype.copy.call(this,source);this.intensity=source.intensity;this.target=source.target.clone();this.shadow=source.shadow.clone();return this;}; // File:src/lights/HemisphereLight.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.HemisphereLight=function(skyColor,groundColor,intensity){THREE.Light.call(this,skyColor);this.type='HemisphereLight';this.castShadow=undefined;this.position.set(0,1,0);this.updateMatrix();this.groundColor=new THREE.Color(groundColor);this.intensity=intensity!==undefined?intensity:1;};THREE.HemisphereLight.prototype=Object.create(THREE.Light.prototype);THREE.HemisphereLight.prototype.constructor=THREE.HemisphereLight;THREE.HemisphereLight.prototype.copy=function(source){THREE.Light.prototype.copy.call(this,source);this.groundColor.copy(source.groundColor);this.intensity=source.intensity;return this;}; // File:src/lights/PointLight.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.PointLight=function(color,intensity,distance,decay){THREE.Light.call(this,color);this.type='PointLight';this.intensity=intensity!==undefined?intensity:1;this.distance=distance!==undefined?distance:0;this.decay=decay!==undefined?decay:1; // for physically correct lights, should be 2.
this.shadow=new THREE.LightShadow(new THREE.PerspectiveCamera(90,1,1,500));};THREE.PointLight.prototype=Object.create(THREE.Light.prototype);THREE.PointLight.prototype.constructor=THREE.PointLight;THREE.PointLight.prototype.copy=function(source){THREE.Light.prototype.copy.call(this,source);this.intensity=source.intensity;this.distance=source.distance;this.decay=source.decay;this.shadow=source.shadow.clone();return this;}; // File:src/lights/SpotLight.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.SpotLight=function(color,intensity,distance,angle,exponent,decay){THREE.Light.call(this,color);this.type='SpotLight';this.position.set(0,1,0);this.updateMatrix();this.target=new THREE.Object3D();this.intensity=intensity!==undefined?intensity:1;this.distance=distance!==undefined?distance:0;this.angle=angle!==undefined?angle:Math.PI/3;this.exponent=exponent!==undefined?exponent:10;this.decay=decay!==undefined?decay:1; // for physically correct lights, should be 2.
this.shadow=new THREE.LightShadow(new THREE.PerspectiveCamera(50,1,50,5000));};THREE.SpotLight.prototype=Object.create(THREE.Light.prototype);THREE.SpotLight.prototype.constructor=THREE.SpotLight;THREE.SpotLight.prototype.copy=function(source){THREE.Light.prototype.copy.call(this,source);this.intensity=source.intensity;this.distance=source.distance;this.angle=source.angle;this.exponent=source.exponent;this.decay=source.decay;this.target=source.target.clone();this.shadow=source.shadow.clone();return this;}; // File:src/loaders/Cache.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.Cache={enabled:false,files:{},add:function add(key,file){if(this.enabled===false)return; // console.log( 'THREE.Cache', 'Adding key:', key );
this.files[key]=file;},get:function get(key){if(this.enabled===false)return; // console.log( 'THREE.Cache', 'Checking key:', key );
return this.files[key];},remove:function remove(key){delete this.files[key];},clear:function clear(){this.files={};}}; // File:src/loaders/Loader.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.Loader=function(){this.onLoadStart=function(){};this.onLoadProgress=function(){};this.onLoadComplete=function(){};};THREE.Loader.prototype={constructor:THREE.Loader,crossOrigin:undefined,extractUrlBase:function extractUrlBase(url){var parts=url.split('/');if(parts.length===1)return './';parts.pop();return parts.join('/')+'/';},initMaterials:function initMaterials(materials,texturePath,crossOrigin){var array=[];for(var i=0;i<materials.length;++i){array[i]=this.createMaterial(materials[i],texturePath,crossOrigin);}return array;},createMaterial:function(){var color,textureLoader,materialLoader;return function(m,texturePath,crossOrigin){if(color===undefined)color=new THREE.Color();if(textureLoader===undefined)textureLoader=new THREE.TextureLoader();if(materialLoader===undefined)materialLoader=new THREE.MaterialLoader(); // convert from old material format
var textures={};function loadTexture(path,repeat,offset,wrap,anisotropy){var fullPath=texturePath+path;var loader=THREE.Loader.Handlers.get(fullPath);var texture;if(loader!==null){texture=loader.load(fullPath);}else {textureLoader.setCrossOrigin(crossOrigin);texture=textureLoader.load(fullPath);}if(repeat!==undefined){texture.repeat.fromArray(repeat);if(repeat[0]!==1)texture.wrapS=THREE.RepeatWrapping;if(repeat[1]!==1)texture.wrapT=THREE.RepeatWrapping;}if(offset!==undefined){texture.offset.fromArray(offset);}if(wrap!==undefined){if(wrap[0]==='repeat')texture.wrapS=THREE.RepeatWrapping;if(wrap[0]==='mirror')texture.wrapS=THREE.MirroredRepeatWrapping;if(wrap[1]==='repeat')texture.wrapT=THREE.RepeatWrapping;if(wrap[1]==='mirror')texture.wrapT=THREE.MirroredRepeatWrapping;}if(anisotropy!==undefined){texture.anisotropy=anisotropy;}var uuid=THREE.Math.generateUUID();textures[uuid]=texture;return uuid;} //
var json={uuid:THREE.Math.generateUUID(),type:'MeshLambertMaterial'};for(var name in m){var value=m[name];switch(name){case 'DbgColor':json.color=value;break;case 'DbgIndex':case 'opticalDensity':case 'illumination': // These were never supported
break;case 'DbgName':json.name=value;break;case 'blending':json.blending=THREE[value];break;case 'colorDiffuse':json.color=color.fromArray(value).getHex();break;case 'colorSpecular':json.specular=color.fromArray(value).getHex();break;case 'colorEmissive':json.emissive=color.fromArray(value).getHex();break;case 'specularCoef':json.shininess=value;break;case 'shading':if(value.toLowerCase()==='basic')json.type='MeshBasicMaterial';if(value.toLowerCase()==='phong')json.type='MeshPhongMaterial';break;case 'mapDiffuse':json.map=loadTexture(value,m.mapDiffuseRepeat,m.mapDiffuseOffset,m.mapDiffuseWrap,m.mapDiffuseAnisotropy);break;case 'mapDiffuseRepeat':case 'mapDiffuseOffset':case 'mapDiffuseWrap':case 'mapDiffuseAnisotropy':break;case 'mapLight':json.lightMap=loadTexture(value,m.mapLightRepeat,m.mapLightOffset,m.mapLightWrap,m.mapLightAnisotropy);break;case 'mapLightRepeat':case 'mapLightOffset':case 'mapLightWrap':case 'mapLightAnisotropy':break;case 'mapAO':json.aoMap=loadTexture(value,m.mapAORepeat,m.mapAOOffset,m.mapAOWrap,m.mapAOAnisotropy);break;case 'mapAORepeat':case 'mapAOOffset':case 'mapAOWrap':case 'mapAOAnisotropy':break;case 'mapBump':json.bumpMap=loadTexture(value,m.mapBumpRepeat,m.mapBumpOffset,m.mapBumpWrap,m.mapBumpAnisotropy);break;case 'mapBumpScale':json.bumpScale=value;break;case 'mapBumpRepeat':case 'mapBumpOffset':case 'mapBumpWrap':case 'mapBumpAnisotropy':break;case 'mapNormal':json.normalMap=loadTexture(value,m.mapNormalRepeat,m.mapNormalOffset,m.mapNormalWrap,m.mapNormalAnisotropy);break;case 'mapNormalFactor':json.normalScale=[value,value];break;case 'mapNormalRepeat':case 'mapNormalOffset':case 'mapNormalWrap':case 'mapNormalAnisotropy':break;case 'mapSpecular':json.specularMap=loadTexture(value,m.mapSpecularRepeat,m.mapSpecularOffset,m.mapSpecularWrap,m.mapSpecularAnisotropy);break;case 'mapSpecularRepeat':case 'mapSpecularOffset':case 'mapSpecularWrap':case 'mapSpecularAnisotropy':break;case 'mapAlpha':json.alphaMap=loadTexture(value,m.mapAlphaRepeat,m.mapAlphaOffset,m.mapAlphaWrap,m.mapAlphaAnisotropy);break;case 'mapAlphaRepeat':case 'mapAlphaOffset':case 'mapAlphaWrap':case 'mapAlphaAnisotropy':break;case 'flipSided':json.side=THREE.BackSide;break;case 'doubleSided':json.side=THREE.DoubleSide;break;case 'transparency':console.warn('THREE.Loader: transparency has been renamed to opacity');json.opacity=value;break;case 'opacity':case 'transparent':case 'depthTest':case 'depthWrite':case 'transparent':case 'visible':case 'wireframe':json[name]=value;break;case 'vertexColors':if(value===true)json.vertexColors=THREE.VertexColors;if(value==='face')json.vertexColors=THREE.FaceColors;break;default:console.error('Loader.createMaterial: Unsupported',name,value);break;}}if(json.type!=='MeshPhongMaterial')delete json.specular;if(json.opacity<1)json.transparent=true;materialLoader.setTextures(textures);return materialLoader.parse(json);};}()};THREE.Loader.Handlers={handlers:[],add:function add(regex,loader){this.handlers.push(regex,loader);},get:function get(file){var handlers=this.handlers;for(var i=0,l=handlers.length;i<l;i+=2){var regex=handlers[i];var loader=handlers[i+1];if(regex.test(file)){return loader;}}return null;}}; // File:src/loaders/XHRLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.XHRLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager;};THREE.XHRLoader.prototype={constructor:THREE.XHRLoader,load:function load(url,onLoad,onProgress,onError){var scope=this;var cached=THREE.Cache.get(url);if(cached!==undefined){if(onLoad){setTimeout(function(){onLoad(cached);},0);}return cached;}var request=new XMLHttpRequest();request.open('GET',url,true);request.addEventListener('load',function(event){var response=event.target.response;THREE.Cache.add(url,response);if(onLoad)onLoad(response);scope.manager.itemEnd(url);},false);if(onProgress!==undefined){request.addEventListener('progress',function(event){onProgress(event);},false);}request.addEventListener('error',function(event){if(onError)onError(event);scope.manager.itemError(url);},false);if(this.crossOrigin!==undefined)request.crossOrigin=this.crossOrigin;if(this.responseType!==undefined)request.responseType=this.responseType;if(this.withCredentials!==undefined)request.withCredentials=this.withCredentials;request.send(null);scope.manager.itemStart(url);return request;},setResponseType:function setResponseType(value){this.responseType=value;},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;},setWithCredentials:function setWithCredentials(value){this.withCredentials=value;}}; // File:src/loaders/ImageLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.ImageLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager;};THREE.ImageLoader.prototype={constructor:THREE.ImageLoader,load:function load(url,onLoad,onProgress,onError){var scope=this;var cached=THREE.Cache.get(url);if(cached!==undefined){scope.manager.itemStart(url);if(onLoad){setTimeout(function(){onLoad(cached);scope.manager.itemEnd(url);},0);}else {scope.manager.itemEnd(url);}return cached;}var image=document.createElement('img');image.addEventListener('load',function(event){THREE.Cache.add(url,this);if(onLoad)onLoad(this);scope.manager.itemEnd(url);},false);if(onProgress!==undefined){image.addEventListener('progress',function(event){onProgress(event);},false);}image.addEventListener('error',function(event){if(onError)onError(event);scope.manager.itemError(url);},false);if(this.crossOrigin!==undefined)image.crossOrigin=this.crossOrigin;scope.manager.itemStart(url);image.src=url;return image;},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;}}; // File:src/loaders/JSONLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */THREE.JSONLoader=function(manager){if(typeof manager==='boolean'){console.warn('THREE.JSONLoader: showStatus parameter has been removed from constructor.');manager=undefined;}this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager;this.withCredentials=false;};THREE.JSONLoader.prototype={constructor:THREE.JSONLoader, // Deprecated
get statusDomElement(){if(this._statusDomElement===undefined){this._statusDomElement=document.createElement('div');}console.warn('THREE.JSONLoader: .statusDomElement has been removed.');return this._statusDomElement;},load:function load(url,onLoad,onProgress,onError){var scope=this;var texturePath=this.texturePath&&typeof this.texturePath==="string"?this.texturePath:THREE.Loader.prototype.extractUrlBase(url);var loader=new THREE.XHRLoader(this.manager);loader.setCrossOrigin(this.crossOrigin);loader.setWithCredentials(this.withCredentials);loader.load(url,function(text){var json=JSON.parse(text);var metadata=json.metadata;if(metadata!==undefined){if(metadata.type==='object'){console.error('THREE.JSONLoader: '+url+' should be loaded with THREE.ObjectLoader instead.');return;}if(metadata.type==='scene'){console.error('THREE.JSONLoader: '+url+' should be loaded with THREE.SceneLoader instead.');return;}}var object=scope.parse(json,texturePath);onLoad(object.geometry,object.materials);});},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;},setTexturePath:function setTexturePath(value){this.texturePath=value;},parse:function parse(json,texturePath){var geometry=new THREE.Geometry(),scale=json.scale!==undefined?1.0/json.scale:1.0;parseModel(scale);parseSkin();parseMorphing(scale);parseAnimations();geometry.computeFaceNormals();geometry.computeBoundingSphere();function parseModel(scale){function isBitSet(value,position){return value&1<<position;}var i,j,fi,offset,zLength,colorIndex,normalIndex,uvIndex,materialIndex,type,isQuad,hasMaterial,hasFaceVertexUv,hasFaceNormal,hasFaceVertexNormal,hasFaceColor,hasFaceVertexColor,vertex,face,faceA,faceB,hex,normal,uvLayer,uv,u,v,faces=json.faces,vertices=json.vertices,normals=json.normals,colors=json.colors,nUvLayers=0;if(json.uvs!==undefined){ // disregard empty arrays
for(i=0;i<json.uvs.length;i++){if(json.uvs[i].length)nUvLayers++;}for(i=0;i<nUvLayers;i++){geometry.faceVertexUvs[i]=[];}}offset=0;zLength=vertices.length;while(offset<zLength){vertex=new THREE.Vector3();vertex.x=vertices[offset++]*scale;vertex.y=vertices[offset++]*scale;vertex.z=vertices[offset++]*scale;geometry.vertices.push(vertex);}offset=0;zLength=faces.length;while(offset<zLength){type=faces[offset++];isQuad=isBitSet(type,0);hasMaterial=isBitSet(type,1);hasFaceVertexUv=isBitSet(type,3);hasFaceNormal=isBitSet(type,4);hasFaceVertexNormal=isBitSet(type,5);hasFaceColor=isBitSet(type,6);hasFaceVertexColor=isBitSet(type,7); // console.log("type", type, "bits", isQuad, hasMaterial, hasFaceVertexUv, hasFaceNormal, hasFaceVertexNormal, hasFaceColor, hasFaceVertexColor);
if(isQuad){faceA=new THREE.Face3();faceA.a=faces[offset];faceA.b=faces[offset+1];faceA.c=faces[offset+3];faceB=new THREE.Face3();faceB.a=faces[offset+1];faceB.b=faces[offset+2];faceB.c=faces[offset+3];offset+=4;if(hasMaterial){materialIndex=faces[offset++];faceA.materialIndex=materialIndex;faceB.materialIndex=materialIndex;} // to get face <=> uv index correspondence
fi=geometry.faces.length;if(hasFaceVertexUv){for(i=0;i<nUvLayers;i++){uvLayer=json.uvs[i];geometry.faceVertexUvs[i][fi]=[];geometry.faceVertexUvs[i][fi+1]=[];for(j=0;j<4;j++){uvIndex=faces[offset++];u=uvLayer[uvIndex*2];v=uvLayer[uvIndex*2+1];uv=new THREE.Vector2(u,v);if(j!==2)geometry.faceVertexUvs[i][fi].push(uv);if(j!==0)geometry.faceVertexUvs[i][fi+1].push(uv);}}}if(hasFaceNormal){normalIndex=faces[offset++]*3;faceA.normal.set(normals[normalIndex++],normals[normalIndex++],normals[normalIndex]);faceB.normal.copy(faceA.normal);}if(hasFaceVertexNormal){for(i=0;i<4;i++){normalIndex=faces[offset++]*3;normal=new THREE.Vector3(normals[normalIndex++],normals[normalIndex++],normals[normalIndex]);if(i!==2)faceA.vertexNormals.push(normal);if(i!==0)faceB.vertexNormals.push(normal);}}if(hasFaceColor){colorIndex=faces[offset++];hex=colors[colorIndex];faceA.color.setHex(hex);faceB.color.setHex(hex);}if(hasFaceVertexColor){for(i=0;i<4;i++){colorIndex=faces[offset++];hex=colors[colorIndex];if(i!==2)faceA.vertexColors.push(new THREE.Color(hex));if(i!==0)faceB.vertexColors.push(new THREE.Color(hex));}}geometry.faces.push(faceA);geometry.faces.push(faceB);}else {face=new THREE.Face3();face.a=faces[offset++];face.b=faces[offset++];face.c=faces[offset++];if(hasMaterial){materialIndex=faces[offset++];face.materialIndex=materialIndex;} // to get face <=> uv index correspondence
fi=geometry.faces.length;if(hasFaceVertexUv){for(i=0;i<nUvLayers;i++){uvLayer=json.uvs[i];geometry.faceVertexUvs[i][fi]=[];for(j=0;j<3;j++){uvIndex=faces[offset++];u=uvLayer[uvIndex*2];v=uvLayer[uvIndex*2+1];uv=new THREE.Vector2(u,v);geometry.faceVertexUvs[i][fi].push(uv);}}}if(hasFaceNormal){normalIndex=faces[offset++]*3;face.normal.set(normals[normalIndex++],normals[normalIndex++],normals[normalIndex]);}if(hasFaceVertexNormal){for(i=0;i<3;i++){normalIndex=faces[offset++]*3;normal=new THREE.Vector3(normals[normalIndex++],normals[normalIndex++],normals[normalIndex]);face.vertexNormals.push(normal);}}if(hasFaceColor){colorIndex=faces[offset++];face.color.setHex(colors[colorIndex]);}if(hasFaceVertexColor){for(i=0;i<3;i++){colorIndex=faces[offset++];face.vertexColors.push(new THREE.Color(colors[colorIndex]));}}geometry.faces.push(face);}}};function parseSkin(){var influencesPerVertex=json.influencesPerVertex!==undefined?json.influencesPerVertex:2;if(json.skinWeights){for(var i=0,l=json.skinWeights.length;i<l;i+=influencesPerVertex){var x=json.skinWeights[i];var y=influencesPerVertex>1?json.skinWeights[i+1]:0;var z=influencesPerVertex>2?json.skinWeights[i+2]:0;var w=influencesPerVertex>3?json.skinWeights[i+3]:0;geometry.skinWeights.push(new THREE.Vector4(x,y,z,w));}}if(json.skinIndices){for(var i=0,l=json.skinIndices.length;i<l;i+=influencesPerVertex){var a=json.skinIndices[i];var b=influencesPerVertex>1?json.skinIndices[i+1]:0;var c=influencesPerVertex>2?json.skinIndices[i+2]:0;var d=influencesPerVertex>3?json.skinIndices[i+3]:0;geometry.skinIndices.push(new THREE.Vector4(a,b,c,d));}}geometry.bones=json.bones;if(geometry.bones&&geometry.bones.length>0&&(geometry.skinWeights.length!==geometry.skinIndices.length||geometry.skinIndices.length!==geometry.vertices.length)){console.warn('When skinning, number of vertices ('+geometry.vertices.length+'), skinIndices ('+geometry.skinIndices.length+'), and skinWeights ('+geometry.skinWeights.length+') should match.');}};function parseMorphing(scale){if(json.morphTargets!==undefined){for(var i=0,l=json.morphTargets.length;i<l;i++){geometry.morphTargets[i]={};geometry.morphTargets[i].name=json.morphTargets[i].name;geometry.morphTargets[i].vertices=[];var dstVertices=geometry.morphTargets[i].vertices;var srcVertices=json.morphTargets[i].vertices;for(var v=0,vl=srcVertices.length;v<vl;v+=3){var vertex=new THREE.Vector3();vertex.x=srcVertices[v]*scale;vertex.y=srcVertices[v+1]*scale;vertex.z=srcVertices[v+2]*scale;dstVertices.push(vertex);}}}if(json.morphColors!==undefined&&json.morphColors.length>0){console.warn('THREE.JSONLoader: "morphColors" no longer supported. Using them as face colors.');var faces=geometry.faces;var morphColors=json.morphColors[0].colors;for(var i=0,l=faces.length;i<l;i++){faces[i].color.fromArray(morphColors,i*3);}}}function parseAnimations(){var outputAnimations=[]; // parse old style Bone/Hierarchy animations
var animations=[];if(json.animation!==undefined){animations.push(json.animation);}if(json.animations!==undefined){if(json.animations.length){animations=animations.concat(json.animations);}else {animations.push(json.animations);}}for(var i=0;i<animations.length;i++){var clip=THREE.AnimationClip.parseAnimation(animations[i],geometry.bones);if(clip)outputAnimations.push(clip);} // parse implicit morph animations
if(geometry.morphTargets){ // TODO: Figure out what an appropraite FPS is for morph target animations -- defaulting to 10, but really it is completely arbitrary.
var morphAnimationClips=THREE.AnimationClip.CreateClipsFromMorphTargetSequences(geometry.morphTargets,10);outputAnimations=outputAnimations.concat(morphAnimationClips);}if(outputAnimations.length>0)geometry.animations=outputAnimations;};if(json.materials===undefined||json.materials.length===0){return {geometry:geometry};}else {var materials=THREE.Loader.prototype.initMaterials(json.materials,texturePath,this.crossOrigin);return {geometry:geometry,materials:materials};}}}; // File:src/loaders/LoadingManager.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.LoadingManager=function(onLoad,onProgress,onError){var scope=this;var isLoading=false,itemsLoaded=0,itemsTotal=0;this.onStart=undefined;this.onLoad=onLoad;this.onProgress=onProgress;this.onError=onError;this.itemStart=function(url){itemsTotal++;if(isLoading===false){if(scope.onStart!==undefined){scope.onStart(url,itemsLoaded,itemsTotal);}}isLoading=true;};this.itemEnd=function(url){itemsLoaded++;if(scope.onProgress!==undefined){scope.onProgress(url,itemsLoaded,itemsTotal);}if(itemsLoaded===itemsTotal){isLoading=false;if(scope.onLoad!==undefined){scope.onLoad();}}};this.itemError=function(url){if(scope.onError!==undefined){scope.onError(url);}};};THREE.DefaultLoadingManager=new THREE.LoadingManager(); // File:src/loaders/BufferGeometryLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.BufferGeometryLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager;};THREE.BufferGeometryLoader.prototype={constructor:THREE.BufferGeometryLoader,load:function load(url,onLoad,onProgress,onError){var scope=this;var loader=new THREE.XHRLoader(scope.manager);loader.setCrossOrigin(this.crossOrigin);loader.load(url,function(text){onLoad(scope.parse(JSON.parse(text)));},onProgress,onError);},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;},parse:function parse(json){var geometry=new THREE.BufferGeometry();var index=json.data.index;if(index!==undefined){var typedArray=new self[index.type](index.array);geometry.setIndex(new THREE.BufferAttribute(typedArray,1));}var attributes=json.data.attributes;for(var key in attributes){var attribute=attributes[key];var typedArray=new self[attribute.type](attribute.array);geometry.addAttribute(key,new THREE.BufferAttribute(typedArray,attribute.itemSize));}var groups=json.data.groups||json.data.drawcalls||json.data.offsets;if(groups!==undefined){for(var i=0,n=groups.length;i!==n;++i){var group=groups[i];geometry.addGroup(group.start,group.count);}}var boundingSphere=json.data.boundingSphere;if(boundingSphere!==undefined){var center=new THREE.Vector3();if(boundingSphere.center!==undefined){center.fromArray(boundingSphere.center);}geometry.boundingSphere=new THREE.Sphere(center,boundingSphere.radius);}return geometry;}}; // File:src/loaders/MaterialLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.MaterialLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager;this.textures={};};THREE.MaterialLoader.prototype={constructor:THREE.MaterialLoader,load:function load(url,onLoad,onProgress,onError){var scope=this;var loader=new THREE.XHRLoader(scope.manager);loader.setCrossOrigin(this.crossOrigin);loader.load(url,function(text){onLoad(scope.parse(JSON.parse(text)));},onProgress,onError);},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;},setTextures:function setTextures(value){this.textures=value;},getTexture:function getTexture(name){var textures=this.textures;if(textures[name]===undefined){console.warn('THREE.MaterialLoader: Undefined texture',name);}return textures[name];},parse:function parse(json){var material=new THREE[json.type]();material.uuid=json.uuid;if(json.name!==undefined)material.name=json.name;if(json.color!==undefined)material.color.setHex(json.color);if(json.emissive!==undefined)material.emissive.setHex(json.emissive);if(json.specular!==undefined)material.specular.setHex(json.specular);if(json.shininess!==undefined)material.shininess=json.shininess;if(json.uniforms!==undefined)material.uniforms=json.uniforms;if(json.vertexShader!==undefined)material.vertexShader=json.vertexShader;if(json.fragmentShader!==undefined)material.fragmentShader=json.fragmentShader;if(json.vertexColors!==undefined)material.vertexColors=json.vertexColors;if(json.shading!==undefined)material.shading=json.shading;if(json.blending!==undefined)material.blending=json.blending;if(json.side!==undefined)material.side=json.side;if(json.opacity!==undefined)material.opacity=json.opacity;if(json.transparent!==undefined)material.transparent=json.transparent;if(json.alphaTest!==undefined)material.alphaTest=json.alphaTest;if(json.depthTest!==undefined)material.depthTest=json.depthTest;if(json.depthWrite!==undefined)material.depthWrite=json.depthWrite;if(json.wireframe!==undefined)material.wireframe=json.wireframe;if(json.wireframeLinewidth!==undefined)material.wireframeLinewidth=json.wireframeLinewidth; // for PointsMaterial
if(json.size!==undefined)material.size=json.size;if(json.sizeAttenuation!==undefined)material.sizeAttenuation=json.sizeAttenuation; // maps
if(json.map!==undefined)material.map=this.getTexture(json.map);if(json.alphaMap!==undefined){material.alphaMap=this.getTexture(json.alphaMap);material.transparent=true;}if(json.bumpMap!==undefined)material.bumpMap=this.getTexture(json.bumpMap);if(json.bumpScale!==undefined)material.bumpScale=json.bumpScale;if(json.normalMap!==undefined)material.normalMap=this.getTexture(json.normalMap);if(json.normalScale)material.normalScale=new THREE.Vector2(json.normalScale,json.normalScale);if(json.displacementMap!==undefined)material.displacementMap=this.getTexture(json.displacementMap);if(json.displacementScale!==undefined)material.displacementScale=json.displacementScale;if(json.displacementBias!==undefined)material.displacementBias=json.displacementBias;if(json.specularMap!==undefined)material.specularMap=this.getTexture(json.specularMap);if(json.envMap!==undefined){material.envMap=this.getTexture(json.envMap);material.combine=THREE.MultiplyOperation;}if(json.reflectivity)material.reflectivity=json.reflectivity;if(json.lightMap!==undefined)material.lightMap=this.getTexture(json.lightMap);if(json.lightMapIntensity!==undefined)material.lightMapIntensity=json.lightMapIntensity;if(json.aoMap!==undefined)material.aoMap=this.getTexture(json.aoMap);if(json.aoMapIntensity!==undefined)material.aoMapIntensity=json.aoMapIntensity; // MeshFaceMaterial
if(json.materials!==undefined){for(var i=0,l=json.materials.length;i<l;i++){material.materials.push(this.parse(json.materials[i]));}}return material;}}; // File:src/loaders/ObjectLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.ObjectLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager;this.texturePath='';};THREE.ObjectLoader.prototype={constructor:THREE.ObjectLoader,load:function load(url,onLoad,onProgress,onError){if(this.texturePath===''){this.texturePath=url.substring(0,url.lastIndexOf('/')+1);}var scope=this;var loader=new THREE.XHRLoader(scope.manager);loader.setCrossOrigin(this.crossOrigin);loader.load(url,function(text){scope.parse(JSON.parse(text),onLoad);},onProgress,onError);},setTexturePath:function setTexturePath(value){this.texturePath=value;},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;},parse:function parse(json,onLoad){var geometries=this.parseGeometries(json.geometries);var images=this.parseImages(json.images,function(){if(onLoad!==undefined)onLoad(object);});var textures=this.parseTextures(json.textures,images);var materials=this.parseMaterials(json.materials,textures);var object=this.parseObject(json.object,geometries,materials);if(json.animations){object.animations=this.parseAnimations(json.animations);}if(json.images===undefined||json.images.length===0){if(onLoad!==undefined)onLoad(object);}return object;},parseGeometries:function parseGeometries(json){var geometries={};if(json!==undefined){var geometryLoader=new THREE.JSONLoader();var bufferGeometryLoader=new THREE.BufferGeometryLoader();for(var i=0,l=json.length;i<l;i++){var geometry;var data=json[i];switch(data.type){case 'PlaneGeometry':case 'PlaneBufferGeometry':geometry=new THREE[data.type](data.width,data.height,data.widthSegments,data.heightSegments);break;case 'BoxGeometry':case 'CubeGeometry': // backwards compatible
geometry=new THREE.BoxGeometry(data.width,data.height,data.depth,data.widthSegments,data.heightSegments,data.depthSegments);break;case 'CircleBufferGeometry':geometry=new THREE.CircleBufferGeometry(data.radius,data.segments,data.thetaStart,data.thetaLength);break;case 'CircleGeometry':geometry=new THREE.CircleGeometry(data.radius,data.segments,data.thetaStart,data.thetaLength);break;case 'CylinderGeometry':geometry=new THREE.CylinderGeometry(data.radiusTop,data.radiusBottom,data.height,data.radialSegments,data.heightSegments,data.openEnded,data.thetaStart,data.thetaLength);break;case 'SphereGeometry':geometry=new THREE.SphereGeometry(data.radius,data.widthSegments,data.heightSegments,data.phiStart,data.phiLength,data.thetaStart,data.thetaLength);break;case 'SphereBufferGeometry':geometry=new THREE.SphereBufferGeometry(data.radius,data.widthSegments,data.heightSegments,data.phiStart,data.phiLength,data.thetaStart,data.thetaLength);break;case 'DodecahedronGeometry':geometry=new THREE.DodecahedronGeometry(data.radius,data.detail);break;case 'IcosahedronGeometry':geometry=new THREE.IcosahedronGeometry(data.radius,data.detail);break;case 'OctahedronGeometry':geometry=new THREE.OctahedronGeometry(data.radius,data.detail);break;case 'TetrahedronGeometry':geometry=new THREE.TetrahedronGeometry(data.radius,data.detail);break;case 'RingGeometry':geometry=new THREE.RingGeometry(data.innerRadius,data.outerRadius,data.thetaSegments,data.phiSegments,data.thetaStart,data.thetaLength);break;case 'TorusGeometry':geometry=new THREE.TorusGeometry(data.radius,data.tube,data.radialSegments,data.tubularSegments,data.arc);break;case 'TorusKnotGeometry':geometry=new THREE.TorusKnotGeometry(data.radius,data.tube,data.radialSegments,data.tubularSegments,data.p,data.q,data.heightScale);break;case 'BufferGeometry':geometry=bufferGeometryLoader.parse(data);break;case 'Geometry':geometry=geometryLoader.parse(data.data,this.texturePath).geometry;break;default:console.warn('THREE.ObjectLoader: Unsupported geometry type "'+data.type+'"');continue;}geometry.uuid=data.uuid;if(data.name!==undefined)geometry.name=data.name;geometries[data.uuid]=geometry;}}return geometries;},parseMaterials:function parseMaterials(json,textures){var materials={};if(json!==undefined){var loader=new THREE.MaterialLoader();loader.setTextures(textures);for(var i=0,l=json.length;i<l;i++){var material=loader.parse(json[i]);materials[material.uuid]=material;}}return materials;},parseAnimations:function parseAnimations(json){var animations=[];for(var i=0;i<json.length;i++){var clip=THREE.AnimationClip.parse(json[i]);animations.push(clip);}return animations;},parseImages:function parseImages(json,onLoad){var scope=this;var images={};function loadImage(url){scope.manager.itemStart(url);return loader.load(url,function(){scope.manager.itemEnd(url);});}if(json!==undefined&&json.length>0){var manager=new THREE.LoadingManager(onLoad);var loader=new THREE.ImageLoader(manager);loader.setCrossOrigin(this.crossOrigin);for(var i=0,l=json.length;i<l;i++){var image=json[i];var path=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(image.url)?image.url:scope.texturePath+image.url;images[image.uuid]=loadImage(path);}}return images;},parseTextures:function parseTextures(json,images){function parseConstant(value){if(typeof value==='number')return value;console.warn('THREE.ObjectLoader.parseTexture: Constant should be in numeric form.',value);return THREE[value];}var textures={};if(json!==undefined){for(var i=0,l=json.length;i<l;i++){var data=json[i];if(data.image===undefined){console.warn('THREE.ObjectLoader: No "image" specified for',data.uuid);}if(images[data.image]===undefined){console.warn('THREE.ObjectLoader: Undefined image',data.image);}var texture=new THREE.Texture(images[data.image]);texture.needsUpdate=true;texture.uuid=data.uuid;if(data.name!==undefined)texture.name=data.name;if(data.mapping!==undefined)texture.mapping=parseConstant(data.mapping);if(data.offset!==undefined)texture.offset=new THREE.Vector2(data.offset[0],data.offset[1]);if(data.repeat!==undefined)texture.repeat=new THREE.Vector2(data.repeat[0],data.repeat[1]);if(data.minFilter!==undefined)texture.minFilter=parseConstant(data.minFilter);if(data.magFilter!==undefined)texture.magFilter=parseConstant(data.magFilter);if(data.anisotropy!==undefined)texture.anisotropy=data.anisotropy;if(Array.isArray(data.wrap)){texture.wrapS=parseConstant(data.wrap[0]);texture.wrapT=parseConstant(data.wrap[1]);}textures[data.uuid]=texture;}}return textures;},parseObject:function(){var matrix=new THREE.Matrix4();return function(data,geometries,materials){var object;function getGeometry(name){if(geometries[name]===undefined){console.warn('THREE.ObjectLoader: Undefined geometry',name);}return geometries[name];}function getMaterial(name){if(name===undefined)return undefined;if(materials[name]===undefined){console.warn('THREE.ObjectLoader: Undefined material',name);}return materials[name];}switch(data.type){case 'Scene':object=new THREE.Scene();break;case 'PerspectiveCamera':object=new THREE.PerspectiveCamera(data.fov,data.aspect,data.near,data.far);break;case 'OrthographicCamera':object=new THREE.OrthographicCamera(data.left,data.right,data.top,data.bottom,data.near,data.far);break;case 'AmbientLight':object=new THREE.AmbientLight(data.color);break;case 'DirectionalLight':object=new THREE.DirectionalLight(data.color,data.intensity);break;case 'PointLight':object=new THREE.PointLight(data.color,data.intensity,data.distance,data.decay);break;case 'SpotLight':object=new THREE.SpotLight(data.color,data.intensity,data.distance,data.angle,data.exponent,data.decay);break;case 'HemisphereLight':object=new THREE.HemisphereLight(data.color,data.groundColor,data.intensity);break;case 'Mesh':object=new THREE.Mesh(getGeometry(data.geometry),getMaterial(data.material));break;case 'LOD':object=new THREE.LOD();break;case 'Line':object=new THREE.Line(getGeometry(data.geometry),getMaterial(data.material),data.mode);break;case 'PointCloud':case 'Points':object=new THREE.Points(getGeometry(data.geometry),getMaterial(data.material));break;case 'Sprite':object=new THREE.Sprite(getMaterial(data.material));break;case 'Group':object=new THREE.Group();break;default:object=new THREE.Object3D();}object.uuid=data.uuid;if(data.name!==undefined)object.name=data.name;if(data.matrix!==undefined){matrix.fromArray(data.matrix);matrix.decompose(object.position,object.quaternion,object.scale);}else {if(data.position!==undefined)object.position.fromArray(data.position);if(data.rotation!==undefined)object.rotation.fromArray(data.rotation);if(data.scale!==undefined)object.scale.fromArray(data.scale);}if(data.castShadow!==undefined)object.castShadow=data.castShadow;if(data.receiveShadow!==undefined)object.receiveShadow=data.receiveShadow;if(data.visible!==undefined)object.visible=data.visible;if(data.userData!==undefined)object.userData=data.userData;if(data.children!==undefined){for(var child in data.children){object.add(this.parseObject(data.children[child],geometries,materials));}}if(data.type==='LOD'){var levels=data.levels;for(var l=0;l<levels.length;l++){var level=levels[l];var child=object.getObjectByProperty('uuid',level.object);if(child!==undefined){object.addLevel(child,level.distance);}}}return object;};}()}; // File:src/loaders/TextureLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.TextureLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager;};THREE.TextureLoader.prototype={constructor:THREE.TextureLoader,load:function load(url,onLoad,onProgress,onError){var texture=new THREE.Texture();var loader=new THREE.ImageLoader(this.manager);loader.setCrossOrigin(this.crossOrigin);loader.load(url,function(image){texture.image=image;texture.needsUpdate=true;if(onLoad!==undefined){onLoad(texture);}},onProgress,onError);return texture;},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;}}; // File:src/loaders/CubeTextureLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.CubeTextureLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager;};THREE.CubeTextureLoader.prototype={constructor:THREE.CubeTextureLoader,load:function load(urls,onLoad,onProgress,onError){var texture=new THREE.CubeTexture([]);var loader=new THREE.ImageLoader();loader.setCrossOrigin(this.crossOrigin);var loaded=0;function loadTexture(i){loader.load(urls[i],function(image){texture.images[i]=image;loaded++;if(loaded===6){texture.needsUpdate=true;if(onLoad)onLoad(texture);}},undefined,onError);}for(var i=0;i<urls.length;++i){loadTexture(i);}return texture;},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;}}; // File:src/loaders/BinaryTextureLoader.js
/**
 * @author Nikos M. / https://github.com/foo123/
 *
 * Abstract Base class to load generic binary textures formats (rgbe, hdr, ...)
 */THREE.DataTextureLoader=THREE.BinaryTextureLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager; // override in sub classes
this._parser=null;};THREE.BinaryTextureLoader.prototype={constructor:THREE.BinaryTextureLoader,load:function load(url,onLoad,onProgress,onError){var scope=this;var texture=new THREE.DataTexture();var loader=new THREE.XHRLoader(this.manager);loader.setCrossOrigin(this.crossOrigin);loader.setResponseType('arraybuffer');loader.load(url,function(buffer){var texData=scope._parser(buffer);if(!texData)return;if(undefined!==texData.image){texture.image=texData.image;}else if(undefined!==texData.data){texture.image.width=texData.width;texture.image.height=texData.height;texture.image.data=texData.data;}texture.wrapS=undefined!==texData.wrapS?texData.wrapS:THREE.ClampToEdgeWrapping;texture.wrapT=undefined!==texData.wrapT?texData.wrapT:THREE.ClampToEdgeWrapping;texture.magFilter=undefined!==texData.magFilter?texData.magFilter:THREE.LinearFilter;texture.minFilter=undefined!==texData.minFilter?texData.minFilter:THREE.LinearMipMapLinearFilter;texture.anisotropy=undefined!==texData.anisotropy?texData.anisotropy:1;if(undefined!==texData.format){texture.format=texData.format;}if(undefined!==texData.type){texture.type=texData.type;}if(undefined!==texData.mipmaps){texture.mipmaps=texData.mipmaps;}if(1===texData.mipmapCount){texture.minFilter=THREE.LinearFilter;}texture.needsUpdate=true;if(onLoad)onLoad(texture,texData);},onProgress,onError);return texture;},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;}}; // File:src/loaders/CompressedTextureLoader.js
/**
 * @author mrdoob / http://mrdoob.com/
 *
 * Abstract Base class to block based textures loader (dds, pvr, ...)
 */THREE.CompressedTextureLoader=function(manager){this.manager=manager!==undefined?manager:THREE.DefaultLoadingManager; // override in sub classes
this._parser=null;};THREE.CompressedTextureLoader.prototype={constructor:THREE.CompressedTextureLoader,load:function load(url,onLoad,onProgress,onError){var scope=this;var images=[];var texture=new THREE.CompressedTexture();texture.image=images;var loader=new THREE.XHRLoader(this.manager);loader.setCrossOrigin(this.crossOrigin);loader.setResponseType('arraybuffer');if(Array.isArray(url)){var loaded=0;var loadTexture=function loadTexture(i){loader.load(url[i],function(buffer){var texDatas=scope._parser(buffer,true);images[i]={width:texDatas.width,height:texDatas.height,format:texDatas.format,mipmaps:texDatas.mipmaps};loaded+=1;if(loaded===6){if(texDatas.mipmapCount===1)texture.minFilter=THREE.LinearFilter;texture.format=texDatas.format;texture.needsUpdate=true;if(onLoad)onLoad(texture);}},onProgress,onError);};for(var i=0,il=url.length;i<il;++i){loadTexture(i);}}else { // compressed cubemap texture stored in a single DDS file
loader.load(url,function(buffer){var texDatas=scope._parser(buffer,true);if(texDatas.isCubemap){var faces=texDatas.mipmaps.length/texDatas.mipmapCount;for(var f=0;f<faces;f++){images[f]={mipmaps:[]};for(var i=0;i<texDatas.mipmapCount;i++){images[f].mipmaps.push(texDatas.mipmaps[f*texDatas.mipmapCount+i]);images[f].format=texDatas.format;images[f].width=texDatas.width;images[f].height=texDatas.height;}}}else {texture.image.width=texDatas.width;texture.image.height=texDatas.height;texture.mipmaps=texDatas.mipmaps;}if(texDatas.mipmapCount===1){texture.minFilter=THREE.LinearFilter;}texture.format=texDatas.format;texture.needsUpdate=true;if(onLoad)onLoad(texture);},onProgress,onError);}return texture;},setCrossOrigin:function setCrossOrigin(value){this.crossOrigin=value;}}; // File:src/materials/Material.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */THREE.Material=function(){Object.defineProperty(this,'id',{value:THREE.MaterialIdCount++});this.uuid=THREE.Math.generateUUID();this.name='';this.type='Material';this.side=THREE.FrontSide;this.opacity=1;this.transparent=false;this.blending=THREE.NormalBlending;this.blendSrc=THREE.SrcAlphaFactor;this.blendDst=THREE.OneMinusSrcAlphaFactor;this.blendEquation=THREE.AddEquation;this.blendSrcAlpha=null;this.blendDstAlpha=null;this.blendEquationAlpha=null;this.depthFunc=THREE.LessEqualDepth;this.depthTest=true;this.depthWrite=true;this.colorWrite=true;this.precision=null; // override the renderer's default precision for this material
this.polygonOffset=false;this.polygonOffsetFactor=0;this.polygonOffsetUnits=0;this.alphaTest=0;this.overdraw=0; // Overdrawn pixels (typically between 0 and 1) for fixing antialiasing gaps in CanvasRenderer
this.visible=true;this._needsUpdate=true;};THREE.Material.prototype={constructor:THREE.Material,get needsUpdate(){return this._needsUpdate;},set needsUpdate(value){if(value===true)this.update();this._needsUpdate=value;},setValues:function setValues(values){if(values===undefined)return;for(var key in values){var newValue=values[key];if(newValue===undefined){console.warn("THREE.Material: '"+key+"' parameter is undefined.");continue;}var currentValue=this[key];if(currentValue===undefined){console.warn("THREE."+this.type+": '"+key+"' is not a property of this material.");continue;}if(currentValue instanceof THREE.Color){currentValue.set(newValue);}else if(currentValue instanceof THREE.Vector3&&newValue instanceof THREE.Vector3){currentValue.copy(newValue);}else if(key==='overdraw'){ // ensure overdraw is backwards-compatible with legacy boolean type
this[key]=Number(newValue);}else {this[key]=newValue;}}},toJSON:function toJSON(meta){var data={metadata:{version:4.4,type:'Material',generator:'Material.toJSON'}}; // standard Material serialization
data.uuid=this.uuid;data.type=this.type;if(this.name!=='')data.name=this.name;if(this.color instanceof THREE.Color)data.color=this.color.getHex();if(this.emissive instanceof THREE.Color)data.emissive=this.emissive.getHex();if(this.specular instanceof THREE.Color)data.specular=this.specular.getHex();if(this.shininess!==undefined)data.shininess=this.shininess;if(this.map instanceof THREE.Texture)data.map=this.map.toJSON(meta).uuid;if(this.alphaMap instanceof THREE.Texture)data.alphaMap=this.alphaMap.toJSON(meta).uuid;if(this.lightMap instanceof THREE.Texture)data.lightMap=this.lightMap.toJSON(meta).uuid;if(this.bumpMap instanceof THREE.Texture){data.bumpMap=this.bumpMap.toJSON(meta).uuid;data.bumpScale=this.bumpScale;}if(this.normalMap instanceof THREE.Texture){data.normalMap=this.normalMap.toJSON(meta).uuid;data.normalScale=this.normalScale; // Removed for now, causes issue in editor ui.js
}if(this.displacementMap instanceof THREE.Texture){data.displacementMap=this.displacementMap.toJSON(meta).uuid;data.displacementScale=this.displacementScale;data.displacementBias=this.displacementBias;}if(this.specularMap instanceof THREE.Texture)data.specularMap=this.specularMap.toJSON(meta).uuid;if(this.envMap instanceof THREE.Texture){data.envMap=this.envMap.toJSON(meta).uuid;data.reflectivity=this.reflectivity; // Scale behind envMap
}if(this.size!==undefined)data.size=this.size;if(this.sizeAttenuation!==undefined)data.sizeAttenuation=this.sizeAttenuation;if(this.vertexColors!==undefined&&this.vertexColors!==THREE.NoColors)data.vertexColors=this.vertexColors;if(this.shading!==undefined&&this.shading!==THREE.SmoothShading)data.shading=this.shading;if(this.blending!==undefined&&this.blending!==THREE.NormalBlending)data.blending=this.blending;if(this.side!==undefined&&this.side!==THREE.FrontSide)data.side=this.side;if(this.opacity<1)data.opacity=this.opacity;if(this.transparent===true)data.transparent=this.transparent;if(this.alphaTest>0)data.alphaTest=this.alphaTest;if(this.wireframe===true)data.wireframe=this.wireframe;if(this.wireframeLinewidth>1)data.wireframeLinewidth=this.wireframeLinewidth;return data;},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(source){this.name=source.name;this.side=source.side;this.opacity=source.opacity;this.transparent=source.transparent;this.blending=source.blending;this.blendSrc=source.blendSrc;this.blendDst=source.blendDst;this.blendEquation=source.blendEquation;this.blendSrcAlpha=source.blendSrcAlpha;this.blendDstAlpha=source.blendDstAlpha;this.blendEquationAlpha=source.blendEquationAlpha;this.depthFunc=source.depthFunc;this.depthTest=source.depthTest;this.depthWrite=source.depthWrite;this.precision=source.precision;this.polygonOffset=source.polygonOffset;this.polygonOffsetFactor=source.polygonOffsetFactor;this.polygonOffsetUnits=source.polygonOffsetUnits;this.alphaTest=source.alphaTest;this.overdraw=source.overdraw;this.visible=source.visible;return this;},update:function update(){this.dispatchEvent({type:'update'});},dispose:function dispose(){this.dispatchEvent({type:'dispose'});}, // Deprecated
get wrapAround(){console.warn('THREE.'+this.type+': .wrapAround has been removed.');},set wrapAround(boolean){console.warn('THREE.'+this.type+': .wrapAround has been removed.');},get wrapRGB(){console.warn('THREE.'+this.type+': .wrapRGB has been removed.');return new THREE.Color();}};THREE.EventDispatcher.prototype.apply(THREE.Material.prototype);THREE.MaterialIdCount=0; // File:src/materials/LineBasicMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  color: <hex>,
 *  opacity: <float>,
 *
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  linewidth: <float>,
 *  linecap: "round",
 *  linejoin: "round",
 *
 *  vertexColors: <bool>
 *
 *  fog: <bool>
 * }
 */THREE.LineBasicMaterial=function(parameters){THREE.Material.call(this);this.type='LineBasicMaterial';this.color=new THREE.Color(0xffffff);this.linewidth=1;this.linecap='round';this.linejoin='round';this.vertexColors=THREE.NoColors;this.fog=true;this.setValues(parameters);};THREE.LineBasicMaterial.prototype=Object.create(THREE.Material.prototype);THREE.LineBasicMaterial.prototype.constructor=THREE.LineBasicMaterial;THREE.LineBasicMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.color.copy(source.color);this.linewidth=source.linewidth;this.linecap=source.linecap;this.linejoin=source.linejoin;this.vertexColors=source.vertexColors;this.fog=source.fog;return this;}; // File:src/materials/LineDashedMaterial.js
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  color: <hex>,
 *  opacity: <float>,
 *
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  linewidth: <float>,
 *
 *  scale: <float>,
 *  dashSize: <float>,
 *  gapSize: <float>,
 *
 *  vertexColors: <bool>
 *
 *  fog: <bool>
 * }
 */THREE.LineDashedMaterial=function(parameters){THREE.Material.call(this);this.type='LineDashedMaterial';this.color=new THREE.Color(0xffffff);this.linewidth=1;this.scale=1;this.dashSize=3;this.gapSize=1;this.vertexColors=false;this.fog=true;this.setValues(parameters);};THREE.LineDashedMaterial.prototype=Object.create(THREE.Material.prototype);THREE.LineDashedMaterial.prototype.constructor=THREE.LineDashedMaterial;THREE.LineDashedMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.color.copy(source.color);this.linewidth=source.linewidth;this.scale=source.scale;this.dashSize=source.dashSize;this.gapSize=source.gapSize;this.vertexColors=source.vertexColors;this.fog=source.fog;return this;}; // File:src/materials/MeshBasicMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  color: <hex>,
 *  opacity: <float>,
 *  map: new THREE.Texture( <Image> ),
 *
 *  aoMap: new THREE.Texture( <Image> ),
 *  aoMapIntensity: <float>
 *
 *  specularMap: new THREE.Texture( <Image> ),
 *
 *  alphaMap: new THREE.Texture( <Image> ),
 *
 *  envMap: new THREE.TextureCube( [posx, negx, posy, negy, posz, negz] ),
 *  combine: THREE.Multiply,
 *  reflectivity: <float>,
 *  refractionRatio: <float>,
 *
 *  shading: THREE.SmoothShading,
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  wireframe: <boolean>,
 *  wireframeLinewidth: <float>,
 *
 *  vertexColors: THREE.NoColors / THREE.VertexColors / THREE.FaceColors,
 *
 *  skinning: <bool>,
 *  morphTargets: <bool>,
 *
 *  fog: <bool>
 * }
 */THREE.MeshBasicMaterial=function(parameters){THREE.Material.call(this);this.type='MeshBasicMaterial';this.color=new THREE.Color(0xffffff); // emissive
this.map=null;this.aoMap=null;this.aoMapIntensity=1.0;this.specularMap=null;this.alphaMap=null;this.envMap=null;this.combine=THREE.MultiplyOperation;this.reflectivity=1;this.refractionRatio=0.98;this.fog=true;this.shading=THREE.SmoothShading;this.wireframe=false;this.wireframeLinewidth=1;this.wireframeLinecap='round';this.wireframeLinejoin='round';this.vertexColors=THREE.NoColors;this.skinning=false;this.morphTargets=false;this.setValues(parameters);};THREE.MeshBasicMaterial.prototype=Object.create(THREE.Material.prototype);THREE.MeshBasicMaterial.prototype.constructor=THREE.MeshBasicMaterial;THREE.MeshBasicMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.color.copy(source.color);this.map=source.map;this.aoMap=source.aoMap;this.aoMapIntensity=source.aoMapIntensity;this.specularMap=source.specularMap;this.alphaMap=source.alphaMap;this.envMap=source.envMap;this.combine=source.combine;this.reflectivity=source.reflectivity;this.refractionRatio=source.refractionRatio;this.fog=source.fog;this.shading=source.shading;this.wireframe=source.wireframe;this.wireframeLinewidth=source.wireframeLinewidth;this.wireframeLinecap=source.wireframeLinecap;this.wireframeLinejoin=source.wireframeLinejoin;this.vertexColors=source.vertexColors;this.skinning=source.skinning;this.morphTargets=source.morphTargets;return this;}; // File:src/materials/MeshLambertMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  color: <hex>,
 *  emissive: <hex>,
 *  opacity: <float>,
 *
 *  map: new THREE.Texture( <Image> ),
 *
 *  specularMap: new THREE.Texture( <Image> ),
 *
 *  alphaMap: new THREE.Texture( <Image> ),
 *
 *  envMap: new THREE.TextureCube( [posx, negx, posy, negy, posz, negz] ),
 *  combine: THREE.Multiply,
 *  reflectivity: <float>,
 *  refractionRatio: <float>,
 *
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  wireframe: <boolean>,
 *  wireframeLinewidth: <float>,
 *
 *  vertexColors: THREE.NoColors / THREE.VertexColors / THREE.FaceColors,
 *
 *  skinning: <bool>,
 *  morphTargets: <bool>,
 *  morphNormals: <bool>,
 *
 *	fog: <bool>
 * }
 */THREE.MeshLambertMaterial=function(parameters){THREE.Material.call(this);this.type='MeshLambertMaterial';this.color=new THREE.Color(0xffffff); // diffuse
this.emissive=new THREE.Color(0x000000);this.map=null;this.specularMap=null;this.alphaMap=null;this.envMap=null;this.combine=THREE.MultiplyOperation;this.reflectivity=1;this.refractionRatio=0.98;this.fog=true;this.wireframe=false;this.wireframeLinewidth=1;this.wireframeLinecap='round';this.wireframeLinejoin='round';this.vertexColors=THREE.NoColors;this.skinning=false;this.morphTargets=false;this.morphNormals=false;this.setValues(parameters);};THREE.MeshLambertMaterial.prototype=Object.create(THREE.Material.prototype);THREE.MeshLambertMaterial.prototype.constructor=THREE.MeshLambertMaterial;THREE.MeshLambertMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.color.copy(source.color);this.emissive.copy(source.emissive);this.map=source.map;this.specularMap=source.specularMap;this.alphaMap=source.alphaMap;this.envMap=source.envMap;this.combine=source.combine;this.reflectivity=source.reflectivity;this.refractionRatio=source.refractionRatio;this.fog=source.fog;this.wireframe=source.wireframe;this.wireframeLinewidth=source.wireframeLinewidth;this.wireframeLinecap=source.wireframeLinecap;this.wireframeLinejoin=source.wireframeLinejoin;this.vertexColors=source.vertexColors;this.skinning=source.skinning;this.morphTargets=source.morphTargets;this.morphNormals=source.morphNormals;return this;}; // File:src/materials/MeshPhongMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  color: <hex>,
 *  emissive: <hex>,
 *  specular: <hex>,
 *  shininess: <float>,
 *  opacity: <float>,
 *
 *  map: new THREE.Texture( <Image> ),
 *
 *  lightMap: new THREE.Texture( <Image> ),
 *  lightMapIntensity: <float>
 *
 *  aoMap: new THREE.Texture( <Image> ),
 *  aoMapIntensity: <float>
 *
 *  emissiveMap: new THREE.Texture( <Image> ),
 *
 *  bumpMap: new THREE.Texture( <Image> ),
 *  bumpScale: <float>,
 *
 *  normalMap: new THREE.Texture( <Image> ),
 *  normalScale: <Vector2>,
 *
 *  displacementMap: new THREE.Texture( <Image> ),
 *  displacementScale: <float>,
 *  displacementBias: <float>,
 *
 *  specularMap: new THREE.Texture( <Image> ),
 *
 *  alphaMap: new THREE.Texture( <Image> ),
 *
 *  envMap: new THREE.TextureCube( [posx, negx, posy, negy, posz, negz] ),
 *  combine: THREE.Multiply,
 *  reflectivity: <float>,
 *  refractionRatio: <float>,
 *
 *  shading: THREE.SmoothShading,
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  wireframe: <boolean>,
 *  wireframeLinewidth: <float>,
 *
 *  vertexColors: THREE.NoColors / THREE.VertexColors / THREE.FaceColors,
 *
 *  skinning: <bool>,
 *  morphTargets: <bool>,
 *  morphNormals: <bool>,
 *
 *	fog: <bool>
 * }
 */THREE.MeshPhongMaterial=function(parameters){THREE.Material.call(this);this.type='MeshPhongMaterial';this.color=new THREE.Color(0xffffff); // diffuse
this.emissive=new THREE.Color(0x000000);this.specular=new THREE.Color(0x111111);this.shininess=30;this.metal=false;this.map=null;this.lightMap=null;this.lightMapIntensity=1.0;this.aoMap=null;this.aoMapIntensity=1.0;this.emissiveMap=null;this.bumpMap=null;this.bumpScale=1;this.normalMap=null;this.normalScale=new THREE.Vector2(1,1);this.displacementMap=null;this.displacementScale=1;this.displacementBias=0;this.specularMap=null;this.alphaMap=null;this.envMap=null;this.combine=THREE.MultiplyOperation;this.reflectivity=1;this.refractionRatio=0.98;this.fog=true;this.shading=THREE.SmoothShading;this.wireframe=false;this.wireframeLinewidth=1;this.wireframeLinecap='round';this.wireframeLinejoin='round';this.vertexColors=THREE.NoColors;this.skinning=false;this.morphTargets=false;this.morphNormals=false;this.setValues(parameters);};THREE.MeshPhongMaterial.prototype=Object.create(THREE.Material.prototype);THREE.MeshPhongMaterial.prototype.constructor=THREE.MeshPhongMaterial;THREE.MeshPhongMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.color.copy(source.color);this.emissive.copy(source.emissive);this.specular.copy(source.specular);this.shininess=source.shininess;this.metal=source.metal;this.map=source.map;this.lightMap=source.lightMap;this.lightMapIntensity=source.lightMapIntensity;this.aoMap=source.aoMap;this.aoMapIntensity=source.aoMapIntensity;this.emissiveMap=source.emissiveMap;this.bumpMap=source.bumpMap;this.bumpScale=source.bumpScale;this.normalMap=source.normalMap;this.normalScale.copy(source.normalScale);this.displacementMap=source.displacementMap;this.displacementScale=source.displacementScale;this.displacementBias=source.displacementBias;this.specularMap=source.specularMap;this.alphaMap=source.alphaMap;this.envMap=source.envMap;this.combine=source.combine;this.reflectivity=source.reflectivity;this.refractionRatio=source.refractionRatio;this.fog=source.fog;this.shading=source.shading;this.wireframe=source.wireframe;this.wireframeLinewidth=source.wireframeLinewidth;this.wireframeLinecap=source.wireframeLinecap;this.wireframeLinejoin=source.wireframeLinejoin;this.vertexColors=source.vertexColors;this.skinning=source.skinning;this.morphTargets=source.morphTargets;this.morphNormals=source.morphNormals;return this;}; // File:src/materials/MeshDepthMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  opacity: <float>,
 *
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  wireframe: <boolean>,
 *  wireframeLinewidth: <float>
 * }
 */THREE.MeshDepthMaterial=function(parameters){THREE.Material.call(this);this.type='MeshDepthMaterial';this.morphTargets=false;this.wireframe=false;this.wireframeLinewidth=1;this.setValues(parameters);};THREE.MeshDepthMaterial.prototype=Object.create(THREE.Material.prototype);THREE.MeshDepthMaterial.prototype.constructor=THREE.MeshDepthMaterial;THREE.MeshDepthMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.wireframe=source.wireframe;this.wireframeLinewidth=source.wireframeLinewidth;return this;}; // File:src/materials/MeshNormalMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 *
 * parameters = {
 *  opacity: <float>,
 *
 *  shading: THREE.FlatShading,
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  wireframe: <boolean>,
 *  wireframeLinewidth: <float>
 * }
 */THREE.MeshNormalMaterial=function(parameters){THREE.Material.call(this,parameters);this.type='MeshNormalMaterial';this.wireframe=false;this.wireframeLinewidth=1;this.morphTargets=false;this.setValues(parameters);};THREE.MeshNormalMaterial.prototype=Object.create(THREE.Material.prototype);THREE.MeshNormalMaterial.prototype.constructor=THREE.MeshNormalMaterial;THREE.MeshNormalMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.wireframe=source.wireframe;this.wireframeLinewidth=source.wireframeLinewidth;return this;}; // File:src/materials/MultiMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.MultiMaterial=function(materials){this.uuid=THREE.Math.generateUUID();this.type='MultiMaterial';this.materials=materials instanceof Array?materials:[];this.visible=true;};THREE.MultiMaterial.prototype={constructor:THREE.MultiMaterial,toJSON:function toJSON(){var output={metadata:{version:4.2,type:'material',generator:'MaterialExporter'},uuid:this.uuid,type:this.type,materials:[]};for(var i=0,l=this.materials.length;i<l;i++){output.materials.push(this.materials[i].toJSON());}output.visible=this.visible;return output;},clone:function clone(){var material=new this.constructor();for(var i=0;i<this.materials.length;i++){material.materials.push(this.materials[i].clone());}material.visible=this.visible;return material;}}; // backwards compatibility
THREE.MeshFaceMaterial=THREE.MultiMaterial; // File:src/materials/PointsMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  color: <hex>,
 *  opacity: <float>,
 *  map: new THREE.Texture( <Image> ),
 *
 *  size: <float>,
 *  sizeAttenuation: <bool>,
 *
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  vertexColors: <bool>,
 *
 *  fog: <bool>
 * }
 */THREE.PointsMaterial=function(parameters){THREE.Material.call(this);this.type='PointsMaterial';this.color=new THREE.Color(0xffffff);this.map=null;this.size=1;this.sizeAttenuation=true;this.vertexColors=THREE.NoColors;this.fog=true;this.setValues(parameters);};THREE.PointsMaterial.prototype=Object.create(THREE.Material.prototype);THREE.PointsMaterial.prototype.constructor=THREE.PointsMaterial;THREE.PointsMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.color.copy(source.color);this.map=source.map;this.size=source.size;this.sizeAttenuation=source.sizeAttenuation;this.vertexColors=source.vertexColors;this.fog=source.fog;return this;}; // backwards compatibility
THREE.PointCloudMaterial=function(parameters){console.warn('THREE.PointCloudMaterial has been renamed to THREE.PointsMaterial.');return new THREE.PointsMaterial(parameters);};THREE.ParticleBasicMaterial=function(parameters){console.warn('THREE.ParticleBasicMaterial has been renamed to THREE.PointsMaterial.');return new THREE.PointsMaterial(parameters);};THREE.ParticleSystemMaterial=function(parameters){console.warn('THREE.ParticleSystemMaterial has been renamed to THREE.PointsMaterial.');return new THREE.PointsMaterial(parameters);}; // File:src/materials/ShaderMaterial.js
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  defines: { "label" : "value" },
 *  uniforms: { "parameter1": { type: "f", value: 1.0 }, "parameter2": { type: "i" value2: 2 } },
 *
 *  fragmentShader: <string>,
 *  vertexShader: <string>,
 *
 *  shading: THREE.SmoothShading,
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  wireframe: <boolean>,
 *  wireframeLinewidth: <float>,
 *
 *  lights: <bool>,
 *
 *  vertexColors: THREE.NoColors / THREE.VertexColors / THREE.FaceColors,
 *
 *  skinning: <bool>,
 *  morphTargets: <bool>,
 *  morphNormals: <bool>,
 *
 *	fog: <bool>
 * }
 */THREE.ShaderMaterial=function(parameters){THREE.Material.call(this);this.type='ShaderMaterial';this.defines={};this.uniforms={};this.vertexShader='void main() {\n\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}';this.fragmentShader='void main() {\n\tgl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );\n}';this.shading=THREE.SmoothShading;this.linewidth=1;this.wireframe=false;this.wireframeLinewidth=1;this.fog=false; // set to use scene fog
this.lights=false; // set to use scene lights
this.vertexColors=THREE.NoColors; // set to use "color" attribute stream
this.skinning=false; // set to use skinning attribute streams
this.morphTargets=false; // set to use morph targets
this.morphNormals=false; // set to use morph normals
this.derivatives=false; // set to use derivatives
// When rendered geometry doesn't include these attributes but the material does,
// use these default values in WebGL. This avoids errors when buffer data is missing.
this.defaultAttributeValues={'color':[1,1,1],'uv':[0,0],'uv2':[0,0]};this.index0AttributeName=undefined;if(parameters!==undefined){if(parameters.attributes!==undefined){console.error('THREE.ShaderMaterial: attributes should now be defined in THREE.BufferGeometry instead.');}this.setValues(parameters);}};THREE.ShaderMaterial.prototype=Object.create(THREE.Material.prototype);THREE.ShaderMaterial.prototype.constructor=THREE.ShaderMaterial;THREE.ShaderMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.fragmentShader=source.fragmentShader;this.vertexShader=source.vertexShader;this.uniforms=THREE.UniformsUtils.clone(source.uniforms);this.attributes=source.attributes;this.defines=source.defines;this.shading=source.shading;this.wireframe=source.wireframe;this.wireframeLinewidth=source.wireframeLinewidth;this.fog=source.fog;this.lights=source.lights;this.vertexColors=source.vertexColors;this.skinning=source.skinning;this.morphTargets=source.morphTargets;this.morphNormals=source.morphNormals;this.derivatives=source.derivatives;return this;};THREE.ShaderMaterial.prototype.toJSON=function(meta){var data=THREE.Material.prototype.toJSON.call(this,meta);data.uniforms=this.uniforms;data.attributes=this.attributes;data.vertexShader=this.vertexShader;data.fragmentShader=this.fragmentShader;return data;}; // File:src/materials/RawShaderMaterial.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.RawShaderMaterial=function(parameters){THREE.ShaderMaterial.call(this,parameters);this.type='RawShaderMaterial';};THREE.RawShaderMaterial.prototype=Object.create(THREE.ShaderMaterial.prototype);THREE.RawShaderMaterial.prototype.constructor=THREE.RawShaderMaterial; // File:src/materials/SpriteMaterial.js
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  color: <hex>,
 *  opacity: <float>,
 *  map: new THREE.Texture( <Image> ),
 *
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *	uvOffset: new THREE.Vector2(),
 *	uvScale: new THREE.Vector2(),
 *
 *  fog: <bool>
 * }
 */THREE.SpriteMaterial=function(parameters){THREE.Material.call(this);this.type='SpriteMaterial';this.color=new THREE.Color(0xffffff);this.map=null;this.rotation=0;this.fog=false; // set parameters
this.setValues(parameters);};THREE.SpriteMaterial.prototype=Object.create(THREE.Material.prototype);THREE.SpriteMaterial.prototype.constructor=THREE.SpriteMaterial;THREE.SpriteMaterial.prototype.copy=function(source){THREE.Material.prototype.copy.call(this,source);this.color.copy(source.color);this.map=source.map;this.rotation=source.rotation;this.fog=source.fog;return this;}; // File:src/textures/Texture.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author szimek / https://github.com/szimek/
 */THREE.Texture=function(image,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy){Object.defineProperty(this,'id',{value:THREE.TextureIdCount++});this.uuid=THREE.Math.generateUUID();this.name='';this.sourceFile='';this.image=image!==undefined?image:THREE.Texture.DEFAULT_IMAGE;this.mipmaps=[];this.mapping=mapping!==undefined?mapping:THREE.Texture.DEFAULT_MAPPING;this.wrapS=wrapS!==undefined?wrapS:THREE.ClampToEdgeWrapping;this.wrapT=wrapT!==undefined?wrapT:THREE.ClampToEdgeWrapping;this.magFilter=magFilter!==undefined?magFilter:THREE.LinearFilter;this.minFilter=minFilter!==undefined?minFilter:THREE.LinearMipMapLinearFilter;this.anisotropy=anisotropy!==undefined?anisotropy:1;this.format=format!==undefined?format:THREE.RGBAFormat;this.type=type!==undefined?type:THREE.UnsignedByteType;this.offset=new THREE.Vector2(0,0);this.repeat=new THREE.Vector2(1,1);this.generateMipmaps=true;this.premultiplyAlpha=false;this.flipY=true;this.unpackAlignment=4; // valid values: 1, 2, 4, 8 (see http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml)
this.version=0;this.onUpdate=null;};THREE.Texture.DEFAULT_IMAGE=undefined;THREE.Texture.DEFAULT_MAPPING=THREE.UVMapping;THREE.Texture.prototype={constructor:THREE.Texture,set needsUpdate(value){if(value===true)this.version++;},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(source){this.image=source.image;this.mipmaps=source.mipmaps.slice(0);this.mapping=source.mapping;this.wrapS=source.wrapS;this.wrapT=source.wrapT;this.magFilter=source.magFilter;this.minFilter=source.minFilter;this.anisotropy=source.anisotropy;this.format=source.format;this.type=source.type;this.offset.copy(source.offset);this.repeat.copy(source.repeat);this.generateMipmaps=source.generateMipmaps;this.premultiplyAlpha=source.premultiplyAlpha;this.flipY=source.flipY;this.unpackAlignment=source.unpackAlignment;return this;},toJSON:function toJSON(meta){if(meta.textures[this.uuid]!==undefined){return meta.textures[this.uuid];}function getDataURL(image){var canvas;if(image.toDataURL!==undefined){canvas=image;}else {canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0,image.width,image.height);}if(canvas.width>2048||canvas.height>2048){return canvas.toDataURL('image/jpeg',0.6);}else {return canvas.toDataURL('image/png');}}var output={metadata:{version:4.4,type:'Texture',generator:'Texture.toJSON'},uuid:this.uuid,name:this.name,mapping:this.mapping,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],wrap:[this.wrapS,this.wrapT],minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy};if(this.image!==undefined){ // TODO: Move to THREE.Image
var image=this.image;if(image.uuid===undefined){image.uuid=THREE.Math.generateUUID(); // UGH
}if(meta.images[image.uuid]===undefined){meta.images[image.uuid]={uuid:image.uuid,url:getDataURL(image)};}output.image=image.uuid;}meta.textures[this.uuid]=output;return output;},dispose:function dispose(){this.dispatchEvent({type:'dispose'});},transformUv:function transformUv(uv){if(this.mapping!==THREE.UVMapping)return;uv.multiply(this.repeat);uv.add(this.offset);if(uv.x<0||uv.x>1){switch(this.wrapS){case THREE.RepeatWrapping:uv.x=uv.x-Math.floor(uv.x);break;case THREE.ClampToEdgeWrapping:uv.x=uv.x<0?0:1;break;case THREE.MirroredRepeatWrapping:if(Math.abs(Math.floor(uv.x)%2)===1){uv.x=Math.ceil(uv.x)-uv.x;}else {uv.x=uv.x-Math.floor(uv.x);}break;}}if(uv.y<0||uv.y>1){switch(this.wrapT){case THREE.RepeatWrapping:uv.y=uv.y-Math.floor(uv.y);break;case THREE.ClampToEdgeWrapping:uv.y=uv.y<0?0:1;break;case THREE.MirroredRepeatWrapping:if(Math.abs(Math.floor(uv.y)%2)===1){uv.y=Math.ceil(uv.y)-uv.y;}else {uv.y=uv.y-Math.floor(uv.y);}break;}}if(this.flipY){uv.y=1-uv.y;}}};THREE.EventDispatcher.prototype.apply(THREE.Texture.prototype);THREE.TextureIdCount=0; // File:src/textures/CanvasTexture.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.CanvasTexture=function(canvas,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy){THREE.Texture.call(this,canvas,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy);this.needsUpdate=true;};THREE.CanvasTexture.prototype=Object.create(THREE.Texture.prototype);THREE.CanvasTexture.prototype.constructor=THREE.CanvasTexture; // File:src/textures/CubeTexture.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.CubeTexture=function(images,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy){mapping=mapping!==undefined?mapping:THREE.CubeReflectionMapping;THREE.Texture.call(this,images,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy);this.images=images;this.flipY=false;};THREE.CubeTexture.prototype=Object.create(THREE.Texture.prototype);THREE.CubeTexture.prototype.constructor=THREE.CubeTexture;THREE.CubeTexture.prototype.copy=function(source){THREE.Texture.prototype.copy.call(this,source);this.images=source.images;return this;}; // File:src/textures/CompressedTexture.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.CompressedTexture=function(mipmaps,width,height,format,type,mapping,wrapS,wrapT,magFilter,minFilter,anisotropy){THREE.Texture.call(this,null,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy);this.image={width:width,height:height};this.mipmaps=mipmaps; // no flipping for cube textures
// (also flipping doesn't work for compressed textures )
this.flipY=false; // can't generate mipmaps for compressed textures
// mips must be embedded in DDS files
this.generateMipmaps=false;};THREE.CompressedTexture.prototype=Object.create(THREE.Texture.prototype);THREE.CompressedTexture.prototype.constructor=THREE.CompressedTexture; // File:src/textures/DataTexture.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.DataTexture=function(data,width,height,format,type,mapping,wrapS,wrapT,magFilter,minFilter,anisotropy){THREE.Texture.call(this,null,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy);this.image={data:data,width:width,height:height};this.magFilter=magFilter!==undefined?magFilter:THREE.NearestFilter;this.minFilter=minFilter!==undefined?minFilter:THREE.NearestFilter;this.flipY=false;this.generateMipmaps=false;};THREE.DataTexture.prototype=Object.create(THREE.Texture.prototype);THREE.DataTexture.prototype.constructor=THREE.DataTexture; // File:src/textures/VideoTexture.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.VideoTexture=function(video,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy){THREE.Texture.call(this,video,mapping,wrapS,wrapT,magFilter,minFilter,format,type,anisotropy);this.generateMipmaps=false;var scope=this;function update(){requestAnimationFrame(update);if(video.readyState===video.HAVE_ENOUGH_DATA){scope.needsUpdate=true;}}update();};THREE.VideoTexture.prototype=Object.create(THREE.Texture.prototype);THREE.VideoTexture.prototype.constructor=THREE.VideoTexture; // File:src/objects/Group.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.Group=function(){THREE.Object3D.call(this);this.type='Group';};THREE.Group.prototype=Object.create(THREE.Object3D.prototype);THREE.Group.prototype.constructor=THREE.Group; // File:src/objects/Points.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.Points=function(geometry,material){THREE.Object3D.call(this);this.type='Points';this.geometry=geometry!==undefined?geometry:new THREE.Geometry();this.material=material!==undefined?material:new THREE.PointsMaterial({color:Math.random()*0xffffff});};THREE.Points.prototype=Object.create(THREE.Object3D.prototype);THREE.Points.prototype.constructor=THREE.Points;THREE.Points.prototype.raycast=function(){var inverseMatrix=new THREE.Matrix4();var ray=new THREE.Ray();return function raycast(raycaster,intersects){var object=this;var geometry=object.geometry;var threshold=raycaster.params.Points.threshold;inverseMatrix.getInverse(this.matrixWorld);ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);if(geometry.boundingBox!==null){if(ray.isIntersectionBox(geometry.boundingBox)===false){return;}}var localThreshold=threshold/((this.scale.x+this.scale.y+this.scale.z)/3);var localThresholdSq=localThreshold*localThreshold;var position=new THREE.Vector3();function testPoint(point,index){var rayPointDistanceSq=ray.distanceSqToPoint(point);if(rayPointDistanceSq<localThresholdSq){var intersectPoint=ray.closestPointToPoint(point);intersectPoint.applyMatrix4(object.matrixWorld);var distance=raycaster.ray.origin.distanceTo(intersectPoint);if(distance<raycaster.near||distance>raycaster.far)return;intersects.push({distance:distance,distanceToRay:Math.sqrt(rayPointDistanceSq),point:intersectPoint.clone(),index:index,face:null,object:object});}}if(geometry instanceof THREE.BufferGeometry){var index=geometry.index;var attributes=geometry.attributes;var positions=attributes.position.array;if(index!==null){var indices=index.array;for(var i=0,il=indices.length;i<il;i++){var a=indices[i];position.fromArray(positions,a*3);testPoint(position,a);}}else {for(var i=0,l=positions.length/3;i<l;i++){position.fromArray(positions,i*3);testPoint(position,i);}}}else {var vertices=geometry.vertices;for(var i=0,l=vertices.length;i<l;i++){testPoint(vertices[i],i);}}};}();THREE.Points.prototype.clone=function(){return new this.constructor(this.geometry,this.material).copy(this);}; // Backwards compatibility
THREE.PointCloud=function(geometry,material){console.warn('THREE.PointCloud has been renamed to THREE.Points.');return new THREE.Points(geometry,material);};THREE.ParticleSystem=function(geometry,material){console.warn('THREE.ParticleSystem has been renamed to THREE.Points.');return new THREE.Points(geometry,material);}; // File:src/objects/Line.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.Line=function(geometry,material,mode){if(mode===1){console.warn('THREE.Line: parameter THREE.LinePieces no longer supported. Created THREE.LineSegments instead.');return new THREE.LineSegments(geometry,material);}THREE.Object3D.call(this);this.type='Line';this.geometry=geometry!==undefined?geometry:new THREE.Geometry();this.material=material!==undefined?material:new THREE.LineBasicMaterial({color:Math.random()*0xffffff});};THREE.Line.prototype=Object.create(THREE.Object3D.prototype);THREE.Line.prototype.constructor=THREE.Line;THREE.Line.prototype.raycast=function(){var inverseMatrix=new THREE.Matrix4();var ray=new THREE.Ray();var sphere=new THREE.Sphere();return function raycast(raycaster,intersects){var precision=raycaster.linePrecision;var precisionSq=precision*precision;var geometry=this.geometry;if(geometry.boundingSphere===null)geometry.computeBoundingSphere(); // Checking boundingSphere distance to ray
sphere.copy(geometry.boundingSphere);sphere.applyMatrix4(this.matrixWorld);if(raycaster.ray.isIntersectionSphere(sphere)===false){return;}inverseMatrix.getInverse(this.matrixWorld);ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);var vStart=new THREE.Vector3();var vEnd=new THREE.Vector3();var interSegment=new THREE.Vector3();var interRay=new THREE.Vector3();var step=this instanceof THREE.LineSegments?2:1;if(geometry instanceof THREE.BufferGeometry){var index=geometry.index;var attributes=geometry.attributes;if(index!==null){var indices=index.array;var positions=attributes.position.array;for(var i=0,l=indices.length-1;i<l;i+=step){var a=indices[i];var b=indices[i+1];vStart.fromArray(positions,a*3);vEnd.fromArray(positions,b*3);var distSq=ray.distanceSqToSegment(vStart,vEnd,interRay,interSegment);if(distSq>precisionSq)continue;interRay.applyMatrix4(this.matrixWorld); //Move back to world space for distance calculation
var distance=raycaster.ray.origin.distanceTo(interRay);if(distance<raycaster.near||distance>raycaster.far)continue;intersects.push({distance:distance, // What do we want? intersection point on the ray or on the segment??
// point: raycaster.ray.at( distance ),
point:interSegment.clone().applyMatrix4(this.matrixWorld),index:i,face:null,faceIndex:null,object:this});}}else {var positions=attributes.position.array;for(var i=0,l=positions.length/3-1;i<l;i+=step){vStart.fromArray(positions,3*i);vEnd.fromArray(positions,3*i+3);var distSq=ray.distanceSqToSegment(vStart,vEnd,interRay,interSegment);if(distSq>precisionSq)continue;interRay.applyMatrix4(this.matrixWorld); //Move back to world space for distance calculation
var distance=raycaster.ray.origin.distanceTo(interRay);if(distance<raycaster.near||distance>raycaster.far)continue;intersects.push({distance:distance, // What do we want? intersection point on the ray or on the segment??
// point: raycaster.ray.at( distance ),
point:interSegment.clone().applyMatrix4(this.matrixWorld),index:i,face:null,faceIndex:null,object:this});}}}else if(geometry instanceof THREE.Geometry){var vertices=geometry.vertices;var nbVertices=vertices.length;for(var i=0;i<nbVertices-1;i+=step){var distSq=ray.distanceSqToSegment(vertices[i],vertices[i+1],interRay,interSegment);if(distSq>precisionSq)continue;interRay.applyMatrix4(this.matrixWorld); //Move back to world space for distance calculation
var distance=raycaster.ray.origin.distanceTo(interRay);if(distance<raycaster.near||distance>raycaster.far)continue;intersects.push({distance:distance, // What do we want? intersection point on the ray or on the segment??
// point: raycaster.ray.at( distance ),
point:interSegment.clone().applyMatrix4(this.matrixWorld),index:i,face:null,faceIndex:null,object:this});}}};}();THREE.Line.prototype.clone=function(){return new this.constructor(this.geometry,this.material).copy(this);}; // DEPRECATED
THREE.LineStrip=0;THREE.LinePieces=1; // File:src/objects/LineSegments.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.LineSegments=function(geometry,material){THREE.Line.call(this,geometry,material);this.type='LineSegments';};THREE.LineSegments.prototype=Object.create(THREE.Line.prototype);THREE.LineSegments.prototype.constructor=THREE.LineSegments; // File:src/objects/Mesh.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author mikael emtinger / http://gomo.se/
 * @author jonobr1 / http://jonobr1.com/
 */THREE.Mesh=function(geometry,material){THREE.Object3D.call(this);this.type='Mesh';this.geometry=geometry!==undefined?geometry:new THREE.Geometry();this.material=material!==undefined?material:new THREE.MeshBasicMaterial({color:Math.random()*0xffffff});this.updateMorphTargets();};THREE.Mesh.prototype=Object.create(THREE.Object3D.prototype);THREE.Mesh.prototype.constructor=THREE.Mesh;THREE.Mesh.prototype.updateMorphTargets=function(){if(this.geometry.morphTargets!==undefined&&this.geometry.morphTargets.length>0){this.morphTargetBase=-1;this.morphTargetInfluences=[];this.morphTargetDictionary={};for(var m=0,ml=this.geometry.morphTargets.length;m<ml;m++){this.morphTargetInfluences.push(0);this.morphTargetDictionary[this.geometry.morphTargets[m].name]=m;}}};THREE.Mesh.prototype.getMorphTargetIndexByName=function(name){if(this.morphTargetDictionary[name]!==undefined){return this.morphTargetDictionary[name];}console.warn('THREE.Mesh.getMorphTargetIndexByName: morph target '+name+' does not exist. Returning 0.');return 0;};THREE.Mesh.prototype.raycast=function(){var inverseMatrix=new THREE.Matrix4();var ray=new THREE.Ray();var sphere=new THREE.Sphere();var vA=new THREE.Vector3();var vB=new THREE.Vector3();var vC=new THREE.Vector3();var tempA=new THREE.Vector3();var tempB=new THREE.Vector3();var tempC=new THREE.Vector3();var uvA=new THREE.Vector2();var uvB=new THREE.Vector2();var uvC=new THREE.Vector2();var barycoord=new THREE.Vector3();var intersectionPoint=new THREE.Vector3();var intersectionPointWorld=new THREE.Vector3();function uvIntersection(point,p1,p2,p3,uv1,uv2,uv3){THREE.Triangle.barycoordFromPoint(point,p1,p2,p3,barycoord);uv1.multiplyScalar(barycoord.x);uv2.multiplyScalar(barycoord.y);uv3.multiplyScalar(barycoord.z);uv1.add(uv2).add(uv3);return uv1.clone();}function checkIntersection(object,raycaster,ray,pA,pB,pC,point){var intersect;var material=object.material;if(material.side===THREE.BackSide){intersect=ray.intersectTriangle(pC,pB,pA,true,point);}else {intersect=ray.intersectTriangle(pA,pB,pC,material.side!==THREE.DoubleSide,point);}if(intersect===null)return null;intersectionPointWorld.copy(point);intersectionPointWorld.applyMatrix4(object.matrixWorld);var distance=raycaster.ray.origin.distanceTo(intersectionPointWorld);if(distance<raycaster.near||distance>raycaster.far)return null;return {distance:distance,point:intersectionPointWorld.clone(),object:object};}function checkBufferGeometryIntersection(object,raycaster,ray,positions,uvs,a,b,c){vA.fromArray(positions,a*3);vB.fromArray(positions,b*3);vC.fromArray(positions,c*3);var intersection=checkIntersection(object,raycaster,ray,vA,vB,vC,intersectionPoint);if(intersection){if(uvs){uvA.fromArray(uvs,a*2);uvB.fromArray(uvs,b*2);uvC.fromArray(uvs,c*2);intersection.uv=uvIntersection(intersectionPoint,vA,vB,vC,uvA,uvB,uvC);}intersection.face=new THREE.Face3(a,b,c,THREE.Triangle.normal(vA,vB,vC));intersection.faceIndex=a;}return intersection;}return function raycast(raycaster,intersects){var geometry=this.geometry;var material=this.material;if(material===undefined)return; // Checking boundingSphere distance to ray
if(geometry.boundingSphere===null)geometry.computeBoundingSphere();var matrixWorld=this.matrixWorld;sphere.copy(geometry.boundingSphere);sphere.applyMatrix4(matrixWorld);if(raycaster.ray.isIntersectionSphere(sphere)===false)return; // Check boundingBox before continuing
inverseMatrix.getInverse(matrixWorld);ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);if(geometry.boundingBox!==null){if(ray.isIntersectionBox(geometry.boundingBox)===false)return;}var uvs,intersection;if(geometry instanceof THREE.BufferGeometry){var a,b,c;var index=geometry.index;var attributes=geometry.attributes;var positions=attributes.position.array;if(attributes.uv!==undefined){uvs=attributes.uv.array;}if(index!==null){var indices=index.array;for(var i=0,l=indices.length;i<l;i+=3){a=indices[i];b=indices[i+1];c=indices[i+2];intersection=checkBufferGeometryIntersection(this,raycaster,ray,positions,uvs,a,b,c);if(intersection){intersection.faceIndex=Math.floor(i/3); // triangle number in indices buffer semantics
intersects.push(intersection);}}}else {for(var i=0,l=positions.length;i<l;i+=9){a=i/3;b=a+1;c=a+2;intersection=checkBufferGeometryIntersection(this,raycaster,ray,positions,uvs,a,b,c);if(intersection){intersection.index=a; // triangle number in positions buffer semantics
intersects.push(intersection);}}}}else if(geometry instanceof THREE.Geometry){var fvA,fvB,fvC;var isFaceMaterial=material instanceof THREE.MeshFaceMaterial;var materials=isFaceMaterial===true?material.materials:null;var vertices=geometry.vertices;var faces=geometry.faces;var faceVertexUvs=geometry.faceVertexUvs[0];if(faceVertexUvs.length>0)uvs=faceVertexUvs;for(var f=0,fl=faces.length;f<fl;f++){var face=faces[f];var faceMaterial=isFaceMaterial===true?materials[face.materialIndex]:material;if(faceMaterial===undefined)continue;fvA=vertices[face.a];fvB=vertices[face.b];fvC=vertices[face.c];if(faceMaterial.morphTargets===true){var morphTargets=geometry.morphTargets;var morphInfluences=this.morphTargetInfluences;vA.set(0,0,0);vB.set(0,0,0);vC.set(0,0,0);for(var t=0,tl=morphTargets.length;t<tl;t++){var influence=morphInfluences[t];if(influence===0)continue;var targets=morphTargets[t].vertices;vA.addScaledVector(tempA.subVectors(targets[face.a],fvA),influence);vB.addScaledVector(tempB.subVectors(targets[face.b],fvB),influence);vC.addScaledVector(tempC.subVectors(targets[face.c],fvC),influence);}vA.add(fvA);vB.add(fvB);vC.add(fvC);fvA=vA;fvB=vB;fvC=vC;}intersection=checkIntersection(this,raycaster,ray,fvA,fvB,fvC,intersectionPoint);if(intersection){if(uvs){var uvs_f=uvs[f];uvA.copy(uvs_f[0]);uvB.copy(uvs_f[1]);uvC.copy(uvs_f[2]);intersection.uv=uvIntersection(intersectionPoint,fvA,fvB,fvC,uvA,uvB,uvC);}intersection.face=face;intersection.faceIndex=f;intersects.push(intersection);}}}};}();THREE.Mesh.prototype.clone=function(){return new this.constructor(this.geometry,this.material).copy(this);}; // File:src/objects/Bone.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author ikerr / http://verold.com
 */THREE.Bone=function(skin){THREE.Object3D.call(this);this.type='Bone';this.skin=skin;};THREE.Bone.prototype=Object.create(THREE.Object3D.prototype);THREE.Bone.prototype.constructor=THREE.Bone;THREE.Bone.prototype.copy=function(source){THREE.Object3D.prototype.copy.call(this,source);this.skin=source.skin;return this;}; // File:src/objects/Skeleton.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author michael guerrero / http://realitymeltdown.com
 * @author ikerr / http://verold.com
 */THREE.Skeleton=function(bones,boneInverses,useVertexTexture){this.useVertexTexture=useVertexTexture!==undefined?useVertexTexture:true;this.identityMatrix=new THREE.Matrix4(); // copy the bone array
bones=bones||[];this.bones=bones.slice(0); // create a bone texture or an array of floats
if(this.useVertexTexture){ // layout (1 matrix = 4 pixels)
//      RGBA RGBA RGBA RGBA (=> column1, column2, column3, column4)
//  with  8x8  pixel texture max   16 bones * 4 pixels =  (8 * 8)
//       16x16 pixel texture max   64 bones * 4 pixels = (16 * 16)
//       32x32 pixel texture max  256 bones * 4 pixels = (32 * 32)
//       64x64 pixel texture max 1024 bones * 4 pixels = (64 * 64)
var size=Math.sqrt(this.bones.length*4); // 4 pixels needed for 1 matrix
size=THREE.Math.nextPowerOfTwo(Math.ceil(size));size=Math.max(size,4);this.boneTextureWidth=size;this.boneTextureHeight=size;this.boneMatrices=new Float32Array(this.boneTextureWidth*this.boneTextureHeight*4); // 4 floats per RGBA pixel
this.boneTexture=new THREE.DataTexture(this.boneMatrices,this.boneTextureWidth,this.boneTextureHeight,THREE.RGBAFormat,THREE.FloatType);}else {this.boneMatrices=new Float32Array(16*this.bones.length);} // use the supplied bone inverses or calculate the inverses
if(boneInverses===undefined){this.calculateInverses();}else {if(this.bones.length===boneInverses.length){this.boneInverses=boneInverses.slice(0);}else {console.warn('THREE.Skeleton bonInverses is the wrong length.');this.boneInverses=[];for(var b=0,bl=this.bones.length;b<bl;b++){this.boneInverses.push(new THREE.Matrix4());}}}};THREE.Skeleton.prototype.calculateInverses=function(){this.boneInverses=[];for(var b=0,bl=this.bones.length;b<bl;b++){var inverse=new THREE.Matrix4();if(this.bones[b]){inverse.getInverse(this.bones[b].matrixWorld);}this.boneInverses.push(inverse);}};THREE.Skeleton.prototype.pose=function(){var bone; // recover the bind-time world matrices
for(var b=0,bl=this.bones.length;b<bl;b++){bone=this.bones[b];if(bone){bone.matrixWorld.getInverse(this.boneInverses[b]);}} // compute the local matrices, positions, rotations and scales
for(var b=0,bl=this.bones.length;b<bl;b++){bone=this.bones[b];if(bone){if(bone.parent){bone.matrix.getInverse(bone.parent.matrixWorld);bone.matrix.multiply(bone.matrixWorld);}else {bone.matrix.copy(bone.matrixWorld);}bone.matrix.decompose(bone.position,bone.quaternion,bone.scale);}}};THREE.Skeleton.prototype.update=function(){var offsetMatrix=new THREE.Matrix4();return function update(){ // flatten bone matrices to array
for(var b=0,bl=this.bones.length;b<bl;b++){ // compute the offset between the current and the original transform
var matrix=this.bones[b]?this.bones[b].matrixWorld:this.identityMatrix;offsetMatrix.multiplyMatrices(matrix,this.boneInverses[b]);offsetMatrix.flattenToArrayOffset(this.boneMatrices,b*16);}if(this.useVertexTexture){this.boneTexture.needsUpdate=true;}};}();THREE.Skeleton.prototype.clone=function(){return new THREE.Skeleton(this.bones,this.boneInverses,this.useVertexTexture);}; // File:src/objects/SkinnedMesh.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author ikerr / http://verold.com
 */THREE.SkinnedMesh=function(geometry,material,useVertexTexture){THREE.Mesh.call(this,geometry,material);this.type='SkinnedMesh';this.bindMode="attached";this.bindMatrix=new THREE.Matrix4();this.bindMatrixInverse=new THREE.Matrix4(); // init bones
// TODO: remove bone creation as there is no reason (other than
// convenience) for THREE.SkinnedMesh to do this.
var bones=[];if(this.geometry&&this.geometry.bones!==undefined){var bone,gbone;for(var b=0,bl=this.geometry.bones.length;b<bl;++b){gbone=this.geometry.bones[b];bone=new THREE.Bone(this);bones.push(bone);bone.name=gbone.name;bone.position.fromArray(gbone.pos);bone.quaternion.fromArray(gbone.rotq);if(gbone.scl!==undefined)bone.scale.fromArray(gbone.scl);}for(var b=0,bl=this.geometry.bones.length;b<bl;++b){gbone=this.geometry.bones[b];if(gbone.parent!==-1&&gbone.parent!==null){bones[gbone.parent].add(bones[b]);}else {this.add(bones[b]);}}}this.normalizeSkinWeights();this.updateMatrixWorld(true);this.bind(new THREE.Skeleton(bones,undefined,useVertexTexture),this.matrixWorld);};THREE.SkinnedMesh.prototype=Object.create(THREE.Mesh.prototype);THREE.SkinnedMesh.prototype.constructor=THREE.SkinnedMesh;THREE.SkinnedMesh.prototype.bind=function(skeleton,bindMatrix){this.skeleton=skeleton;if(bindMatrix===undefined){this.updateMatrixWorld(true);this.skeleton.calculateInverses();bindMatrix=this.matrixWorld;}this.bindMatrix.copy(bindMatrix);this.bindMatrixInverse.getInverse(bindMatrix);};THREE.SkinnedMesh.prototype.pose=function(){this.skeleton.pose();};THREE.SkinnedMesh.prototype.normalizeSkinWeights=function(){if(this.geometry instanceof THREE.Geometry){for(var i=0;i<this.geometry.skinIndices.length;i++){var sw=this.geometry.skinWeights[i];var scale=1.0/sw.lengthManhattan();if(scale!==Infinity){sw.multiplyScalar(scale);}else {sw.set(1); // this will be normalized by the shader anyway
}}}else { // skinning weights assumed to be normalized for THREE.BufferGeometry
}};THREE.SkinnedMesh.prototype.updateMatrixWorld=function(force){THREE.Mesh.prototype.updateMatrixWorld.call(this,true);if(this.bindMode==="attached"){this.bindMatrixInverse.getInverse(this.matrixWorld);}else if(this.bindMode==="detached"){this.bindMatrixInverse.getInverse(this.bindMatrix);}else {console.warn('THREE.SkinnedMesh unrecognized bindMode: '+this.bindMode);}};THREE.SkinnedMesh.prototype.clone=function(){return new this.constructor(this.geometry,this.material,this.useVertexTexture).copy(this);}; // File:src/objects/LOD.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */THREE.LOD=function(){THREE.Object3D.call(this);this.type='LOD';Object.defineProperties(this,{levels:{enumerable:true,value:[]},objects:{get:function get(){console.warn('THREE.LOD: .objects has been renamed to .levels.');return this.levels;}}});};THREE.LOD.prototype=Object.create(THREE.Object3D.prototype);THREE.LOD.prototype.constructor=THREE.LOD;THREE.LOD.prototype.addLevel=function(object,distance){if(distance===undefined)distance=0;distance=Math.abs(distance);var levels=this.levels;for(var l=0;l<levels.length;l++){if(distance<levels[l].distance){break;}}levels.splice(l,0,{distance:distance,object:object});this.add(object);};THREE.LOD.prototype.getObjectForDistance=function(distance){var levels=this.levels;for(var i=1,l=levels.length;i<l;i++){if(distance<levels[i].distance){break;}}return levels[i-1].object;};THREE.LOD.prototype.raycast=function(){var matrixPosition=new THREE.Vector3();return function raycast(raycaster,intersects){matrixPosition.setFromMatrixPosition(this.matrixWorld);var distance=raycaster.ray.origin.distanceTo(matrixPosition);this.getObjectForDistance(distance).raycast(raycaster,intersects);};}();THREE.LOD.prototype.update=function(){var v1=new THREE.Vector3();var v2=new THREE.Vector3();return function update(camera){var levels=this.levels;if(levels.length>1){v1.setFromMatrixPosition(camera.matrixWorld);v2.setFromMatrixPosition(this.matrixWorld);var distance=v1.distanceTo(v2);levels[0].object.visible=true;for(var i=1,l=levels.length;i<l;i++){if(distance>=levels[i].distance){levels[i-1].object.visible=false;levels[i].object.visible=true;}else {break;}}for(;i<l;i++){levels[i].object.visible=false;}}};}();THREE.LOD.prototype.copy=function(source){THREE.Object3D.prototype.copy.call(this,source,false);var levels=source.levels;for(var i=0,l=levels.length;i<l;i++){var level=levels[i];this.addLevel(level.object.clone(),level.distance);}return this;};THREE.LOD.prototype.toJSON=function(meta){var data=THREE.Object3D.prototype.toJSON.call(this,meta);data.object.levels=[];var levels=this.levels;for(var i=0,l=levels.length;i<l;i++){var level=levels[i];data.object.levels.push({object:level.object.uuid,distance:level.distance});}return data;}; // File:src/objects/Sprite.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 */THREE.Sprite=function(){var indices=new Uint16Array([0,1,2,0,2,3]);var vertices=new Float32Array([-0.5,-0.5,0,0.5,-0.5,0,0.5,0.5,0,-0.5,0.5,0]);var uvs=new Float32Array([0,0,1,0,1,1,0,1]);var geometry=new THREE.BufferGeometry();geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.addAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.addAttribute('uv',new THREE.BufferAttribute(uvs,2));return function Sprite(material){THREE.Object3D.call(this);this.type='Sprite';this.geometry=geometry;this.material=material!==undefined?material:new THREE.SpriteMaterial();};}();THREE.Sprite.prototype=Object.create(THREE.Object3D.prototype);THREE.Sprite.prototype.constructor=THREE.Sprite;THREE.Sprite.prototype.raycast=function(){var matrixPosition=new THREE.Vector3();return function raycast(raycaster,intersects){matrixPosition.setFromMatrixPosition(this.matrixWorld);var distanceSq=raycaster.ray.distanceSqToPoint(matrixPosition);var guessSizeSq=this.scale.x*this.scale.y;if(distanceSq>guessSizeSq){return;}intersects.push({distance:Math.sqrt(distanceSq),point:this.position,face:null,object:this});};}();THREE.Sprite.prototype.clone=function(){return new this.constructor(this.material).copy(this);}; // Backwards compatibility
THREE.Particle=THREE.Sprite; // File:src/objects/LensFlare.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 */THREE.LensFlare=function(texture,size,distance,blending,color){THREE.Object3D.call(this);this.lensFlares=[];this.positionScreen=new THREE.Vector3();this.customUpdateCallback=undefined;if(texture!==undefined){this.add(texture,size,distance,blending,color);}};THREE.LensFlare.prototype=Object.create(THREE.Object3D.prototype);THREE.LensFlare.prototype.constructor=THREE.LensFlare; /*
 * Add: adds another flare
 */THREE.LensFlare.prototype.add=function(texture,size,distance,blending,color,opacity){if(size===undefined)size=-1;if(distance===undefined)distance=0;if(opacity===undefined)opacity=1;if(color===undefined)color=new THREE.Color(0xffffff);if(blending===undefined)blending=THREE.NormalBlending;distance=Math.min(distance,Math.max(0,distance));this.lensFlares.push({texture:texture, // THREE.Texture
size:size, // size in pixels (-1 = use texture.width)
distance:distance, // distance (0-1) from light source (0=at light source)
x:0,y:0,z:0, // screen position (-1 => 1) z = 0 is in front z = 1 is back
scale:1, // scale
rotation:0, // rotation
opacity:opacity, // opacity
color:color, // color
blending:blending // blending
});}; /*
 * Update lens flares update positions on all flares based on the screen position
 * Set myLensFlare.customUpdateCallback to alter the flares in your project specific way.
 */THREE.LensFlare.prototype.updateLensFlares=function(){var f,fl=this.lensFlares.length;var flare;var vecX=-this.positionScreen.x*2;var vecY=-this.positionScreen.y*2;for(f=0;f<fl;f++){flare=this.lensFlares[f];flare.x=this.positionScreen.x+vecX*flare.distance;flare.y=this.positionScreen.y+vecY*flare.distance;flare.wantedRotation=flare.x*Math.PI*0.25;flare.rotation+=(flare.wantedRotation-flare.rotation)*0.25;}};THREE.LensFlare.prototype.copy=function(source){THREE.Object3D.prototype.copy.call(this,source);this.positionScreen.copy(source.positionScreen);this.customUpdateCallback=source.customUpdateCallback;for(var i=0,l=source.lensFlares.length;i<l;i++){this.lensFlares.push(source.lensFlares[i]);}return this;}; // File:src/scenes/Scene.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.Scene=function(){THREE.Object3D.call(this);this.type='Scene';this.fog=null;this.overrideMaterial=null;this.autoUpdate=true; // checked by the renderer
};THREE.Scene.prototype=Object.create(THREE.Object3D.prototype);THREE.Scene.prototype.constructor=THREE.Scene;THREE.Scene.prototype.copy=function(source){THREE.Object3D.prototype.copy.call(this,source);if(source.fog!==null)this.fog=source.fog.clone();if(source.overrideMaterial!==null)this.overrideMaterial=source.overrideMaterial.clone();this.autoUpdate=source.autoUpdate;this.matrixAutoUpdate=source.matrixAutoUpdate;return this;}; // File:src/scenes/Fog.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */THREE.Fog=function(color,near,far){this.name='';this.color=new THREE.Color(color);this.near=near!==undefined?near:1;this.far=far!==undefined?far:1000;};THREE.Fog.prototype.clone=function(){return new THREE.Fog(this.color.getHex(),this.near,this.far);}; // File:src/scenes/FogExp2.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */THREE.FogExp2=function(color,density){this.name='';this.color=new THREE.Color(color);this.density=density!==undefined?density:0.00025;};THREE.FogExp2.prototype.clone=function(){return new THREE.FogExp2(this.color.getHex(),this.density);}; // File:src/renderers/shaders/ShaderChunk.js
THREE.ShaderChunk={}; // File:src/renderers/shaders/ShaderChunk/alphamap_fragment.glsl
THREE.ShaderChunk['alphamap_fragment']="#ifdef USE_ALPHAMAP\n\n	diffuseColor.a *= texture2D( alphaMap, vUv ).g;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/alphamap_pars_fragment.glsl
THREE.ShaderChunk['alphamap_pars_fragment']="#ifdef USE_ALPHAMAP\n\n	uniform sampler2D alphaMap;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/alphatest_fragment.glsl
THREE.ShaderChunk['alphatest_fragment']="#ifdef ALPHATEST\n\n	if ( diffuseColor.a < ALPHATEST ) discard;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/aomap_fragment.glsl
THREE.ShaderChunk['aomap_fragment']="#ifdef USE_AOMAP\n\n	totalAmbientLight *= ( texture2D( aoMap, vUv2 ).r - 1.0 ) * aoMapIntensity + 1.0;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/aomap_pars_fragment.glsl
THREE.ShaderChunk['aomap_pars_fragment']="#ifdef USE_AOMAP\n\n	uniform sampler2D aoMap;\n	uniform float aoMapIntensity;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/begin_vertex.glsl
THREE.ShaderChunk['begin_vertex']="\nvec3 transformed = vec3( position );\n"; // File:src/renderers/shaders/ShaderChunk/beginnormal_vertex.glsl
THREE.ShaderChunk['beginnormal_vertex']="\nvec3 objectNormal = vec3( normal );\n"; // File:src/renderers/shaders/ShaderChunk/bumpmap_pars_fragment.glsl
THREE.ShaderChunk['bumpmap_pars_fragment']="#ifdef USE_BUMPMAP\n\n	uniform sampler2D bumpMap;\n	uniform float bumpScale;\n\n\n\n	vec2 dHdxy_fwd() {\n\n		vec2 dSTdx = dFdx( vUv );\n		vec2 dSTdy = dFdy( vUv );\n\n		float Hll = bumpScale * texture2D( bumpMap, vUv ).x;\n		float dBx = bumpScale * texture2D( bumpMap, vUv + dSTdx ).x - Hll;\n		float dBy = bumpScale * texture2D( bumpMap, vUv + dSTdy ).x - Hll;\n\n		return vec2( dBx, dBy );\n\n	}\n\n	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy ) {\n\n		vec3 vSigmaX = dFdx( surf_pos );\n		vec3 vSigmaY = dFdy( surf_pos );\n		vec3 vN = surf_norm;\n		vec3 R1 = cross( vSigmaY, vN );\n		vec3 R2 = cross( vN, vSigmaX );\n\n		float fDet = dot( vSigmaX, R1 );\n\n		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );\n		return normalize( abs( fDet ) * surf_norm - vGrad );\n\n	}\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/color_fragment.glsl
THREE.ShaderChunk['color_fragment']="#ifdef USE_COLOR\n\n	diffuseColor.rgb *= vColor;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/color_pars_fragment.glsl
THREE.ShaderChunk['color_pars_fragment']="#ifdef USE_COLOR\n\n	varying vec3 vColor;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/color_pars_vertex.glsl
THREE.ShaderChunk['color_pars_vertex']="#ifdef USE_COLOR\n\n	varying vec3 vColor;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/color_vertex.glsl
THREE.ShaderChunk['color_vertex']="#ifdef USE_COLOR\n\n	vColor.xyz = color.xyz;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/common.glsl
THREE.ShaderChunk['common']="#define PI 3.14159\n#define PI2 6.28318\n#define RECIPROCAL_PI2 0.15915494\n#define LOG2 1.442695\n#define EPSILON 1e-6\n\n#define saturate(a) clamp( a, 0.0, 1.0 )\n#define whiteCompliment(a) ( 1.0 - saturate( a ) )\n\nvec3 transformDirection( in vec3 normal, in mat4 matrix ) {\n\n	return normalize( ( matrix * vec4( normal, 0.0 ) ).xyz );\n\n}\n\nvec3 inverseTransformDirection( in vec3 normal, in mat4 matrix ) {\n\n	return normalize( ( vec4( normal, 0.0 ) * matrix ).xyz );\n\n}\n\nvec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {\n\n	float distance = dot( planeNormal, point - pointOnPlane );\n\n	return - distance * planeNormal + point;\n\n}\n\nfloat sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {\n\n	return sign( dot( point - pointOnPlane, planeNormal ) );\n\n}\n\nvec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {\n\n	return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;\n\n}\n\nfloat calcLightAttenuation( float lightDistance, float cutoffDistance, float decayExponent ) {\n\n	if ( decayExponent > 0.0 ) {\n\n	  return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );\n\n	}\n\n	return 1.0;\n\n}\n\nvec3 F_Schlick( in vec3 specularColor, in float dotLH ) {\n\n\n	float fresnel = exp2( ( -5.55437 * dotLH - 6.98316 ) * dotLH );\n\n	return ( 1.0 - specularColor ) * fresnel + specularColor;\n\n}\n\nfloat G_BlinnPhong_Implicit( /* in float dotNL, in float dotNV */ ) {\n\n\n	return 0.25;\n\n}\n\nfloat D_BlinnPhong( in float shininess, in float dotNH ) {\n\n\n	return ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );\n\n}\n\nvec3 BRDF_BlinnPhong( in vec3 specularColor, in float shininess, in vec3 normal, in vec3 lightDir, in vec3 viewDir ) {\n\n	vec3 halfDir = normalize( lightDir + viewDir );\n\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotLH = saturate( dot( lightDir, halfDir ) );\n\n	vec3 F = F_Schlick( specularColor, dotLH );\n\n	float G = G_BlinnPhong_Implicit( /* dotNL, dotNV */ );\n\n	float D = D_BlinnPhong( shininess, dotNH );\n\n	return F * G * D;\n\n}\n\nvec3 inputToLinear( in vec3 a ) {\n\n	#ifdef GAMMA_INPUT\n\n		return pow( a, vec3( float( GAMMA_FACTOR ) ) );\n\n	#else\n\n		return a;\n\n	#endif\n\n}\n\nvec3 linearToOutput( in vec3 a ) {\n\n	#ifdef GAMMA_OUTPUT\n\n		return pow( a, vec3( 1.0 / float( GAMMA_FACTOR ) ) );\n\n	#else\n\n		return a;\n\n	#endif\n\n}\n"; // File:src/renderers/shaders/ShaderChunk/defaultnormal_vertex.glsl
THREE.ShaderChunk['defaultnormal_vertex']="#ifdef FLIP_SIDED\n\n	objectNormal = -objectNormal;\n\n#endif\n\nvec3 transformedNormal = normalMatrix * objectNormal;\n"; // File:src/renderers/shaders/ShaderChunk/displacementmap_vertex.glsl
THREE.ShaderChunk['displacementmap_vertex']="#ifdef USE_DISPLACEMENTMAP\n\n	transformed += normal * ( texture2D( displacementMap, uv ).x * displacementScale + displacementBias );\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/displacementmap_pars_vertex.glsl
THREE.ShaderChunk['displacementmap_pars_vertex']="#ifdef USE_DISPLACEMENTMAP\n\n	uniform sampler2D displacementMap;\n	uniform float displacementScale;\n	uniform float displacementBias;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/emissivemap_fragment.glsl
THREE.ShaderChunk['emissivemap_fragment']="#ifdef USE_EMISSIVEMAP\n\n	vec4 emissiveColor = texture2D( emissiveMap, vUv );\n\n	emissiveColor.rgb = inputToLinear( emissiveColor.rgb );\n\n	totalEmissiveLight *= emissiveColor.rgb;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/emissivemap_pars_fragment.glsl
THREE.ShaderChunk['emissivemap_pars_fragment']="#ifdef USE_EMISSIVEMAP\n\n	uniform sampler2D emissiveMap;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/envmap_fragment.glsl
THREE.ShaderChunk['envmap_fragment']="#ifdef USE_ENVMAP\n\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )\n\n		vec3 cameraToVertex = normalize( vWorldPosition - cameraPosition );\n\n		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );\n\n		#ifdef ENVMAP_MODE_REFLECTION\n\n			vec3 reflectVec = reflect( cameraToVertex, worldNormal );\n\n		#else\n\n			vec3 reflectVec = refract( cameraToVertex, worldNormal, refractionRatio );\n\n		#endif\n\n	#else\n\n		vec3 reflectVec = vReflect;\n\n	#endif\n\n	#ifdef DOUBLE_SIDED\n		float flipNormal = ( float( gl_FrontFacing ) * 2.0 - 1.0 );\n	#else\n		float flipNormal = 1.0;\n	#endif\n\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 envColor = textureCube( envMap, flipNormal * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );\n\n	#elif defined( ENVMAP_TYPE_EQUIREC )\n		vec2 sampleUV;\n		sampleUV.y = saturate( flipNormal * reflectVec.y * 0.5 + 0.5 );\n		sampleUV.x = atan( flipNormal * reflectVec.z, flipNormal * reflectVec.x ) * RECIPROCAL_PI2 + 0.5;\n		vec4 envColor = texture2D( envMap, sampleUV );\n\n	#elif defined( ENVMAP_TYPE_SPHERE )\n		vec3 reflectView = flipNormal * normalize((viewMatrix * vec4( reflectVec, 0.0 )).xyz + vec3(0.0,0.0,1.0));\n		vec4 envColor = texture2D( envMap, reflectView.xy * 0.5 + 0.5 );\n	#endif\n\n	envColor.xyz = inputToLinear( envColor.xyz );\n\n	#ifdef ENVMAP_BLENDING_MULTIPLY\n\n		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );\n\n	#elif defined( ENVMAP_BLENDING_MIX )\n\n		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );\n\n	#elif defined( ENVMAP_BLENDING_ADD )\n\n		outgoingLight += envColor.xyz * specularStrength * reflectivity;\n\n	#endif\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/envmap_pars_fragment.glsl
THREE.ShaderChunk['envmap_pars_fragment']="#ifdef USE_ENVMAP\n\n	uniform float reflectivity;\n	#ifdef ENVMAP_TYPE_CUBE\n		uniform samplerCube envMap;\n	#else\n		uniform sampler2D envMap;\n	#endif\n	uniform float flipEnvMap;\n\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )\n\n		uniform float refractionRatio;\n\n	#else\n\n		varying vec3 vReflect;\n\n	#endif\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/envmap_pars_vertex.glsl
THREE.ShaderChunk['envmap_pars_vertex']="#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP ) && ! defined( PHONG )\n\n	varying vec3 vReflect;\n\n	uniform float refractionRatio;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/envmap_vertex.glsl
THREE.ShaderChunk['envmap_vertex']="#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP ) && ! defined( PHONG )\n\n	vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );\n\n	vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );\n\n	#ifdef ENVMAP_MODE_REFLECTION\n\n		vReflect = reflect( cameraToVertex, worldNormal );\n\n	#else\n\n		vReflect = refract( cameraToVertex, worldNormal, refractionRatio );\n\n	#endif\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/fog_fragment.glsl
THREE.ShaderChunk['fog_fragment']="#ifdef USE_FOG\n\n	#ifdef USE_LOGDEPTHBUF_EXT\n\n		float depth = gl_FragDepthEXT / gl_FragCoord.w;\n\n	#else\n\n		float depth = gl_FragCoord.z / gl_FragCoord.w;\n\n	#endif\n\n	#ifdef FOG_EXP2\n\n		float fogFactor = whiteCompliment( exp2( - fogDensity * fogDensity * depth * depth * LOG2 ) );\n\n	#else\n\n		float fogFactor = smoothstep( fogNear, fogFar, depth );\n\n	#endif\n	\n	outgoingLight = mix( outgoingLight, fogColor, fogFactor );\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/fog_pars_fragment.glsl
THREE.ShaderChunk['fog_pars_fragment']="#ifdef USE_FOG\n\n	uniform vec3 fogColor;\n\n	#ifdef FOG_EXP2\n\n		uniform float fogDensity;\n\n	#else\n\n		uniform float fogNear;\n		uniform float fogFar;\n	#endif\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/hemilight_fragment.glsl
THREE.ShaderChunk['hemilight_fragment']="#if MAX_HEMI_LIGHTS > 0\n\n	for ( int i = 0; i < MAX_HEMI_LIGHTS; i ++ ) {\n\n		vec3 lightDir = hemisphereLightDirection[ i ];\n\n		float dotProduct = dot( normal, lightDir );\n\n		float hemiDiffuseWeight = 0.5 * dotProduct + 0.5;\n\n		vec3 lightColor = mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeight );\n\n		totalAmbientLight += lightColor;\n\n	}\n\n#endif\n\n"; // File:src/renderers/shaders/ShaderChunk/lightmap_fragment.glsl
THREE.ShaderChunk['lightmap_fragment']="#ifdef USE_LIGHTMAP\n\n	totalAmbientLight += texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/lightmap_pars_fragment.glsl
THREE.ShaderChunk['lightmap_pars_fragment']="#ifdef USE_LIGHTMAP\n\n	uniform sampler2D lightMap;\n	uniform float lightMapIntensity;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/lights_lambert_pars_vertex.glsl
THREE.ShaderChunk['lights_lambert_pars_vertex']="#if MAX_DIR_LIGHTS > 0\n\n	uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];\n	uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];\n\n#endif\n\n#if MAX_HEMI_LIGHTS > 0\n\n	uniform vec3 hemisphereLightSkyColor[ MAX_HEMI_LIGHTS ];\n	uniform vec3 hemisphereLightGroundColor[ MAX_HEMI_LIGHTS ];\n	uniform vec3 hemisphereLightDirection[ MAX_HEMI_LIGHTS ];\n\n#endif\n\n#if MAX_POINT_LIGHTS > 0\n\n	uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];\n	uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];\n	uniform float pointLightDistance[ MAX_POINT_LIGHTS ];\n	uniform float pointLightDecay[ MAX_POINT_LIGHTS ];\n\n#endif\n\n#if MAX_SPOT_LIGHTS > 0\n\n	uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];\n	uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];\n	uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];\n	uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];\n	uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];\n	uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];\n	uniform float spotLightDecay[ MAX_SPOT_LIGHTS ];\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/lights_lambert_vertex.glsl
THREE.ShaderChunk['lights_lambert_vertex']="vLightFront = vec3( 0.0 );\n\n#ifdef DOUBLE_SIDED\n\n	vLightBack = vec3( 0.0 );\n\n#endif\n\nvec3 normal = normalize( transformedNormal );\n\n#if MAX_POINT_LIGHTS > 0\n\n	for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {\n\n		vec3 lightColor = pointLightColor[ i ];\n\n		vec3 lVector = pointLightPosition[ i ] - mvPosition.xyz;\n		vec3 lightDir = normalize( lVector );\n\n\n		float attenuation = calcLightAttenuation( length( lVector ), pointLightDistance[ i ], pointLightDecay[ i ] );\n\n\n		float dotProduct = dot( normal, lightDir );\n\n		vLightFront += lightColor * attenuation * saturate( dotProduct );\n\n		#ifdef DOUBLE_SIDED\n\n			vLightBack += lightColor * attenuation * saturate( - dotProduct );\n\n		#endif\n\n	}\n\n#endif\n\n#if MAX_SPOT_LIGHTS > 0\n\n	for ( int i = 0; i < MAX_SPOT_LIGHTS; i ++ ) {\n\n		vec3 lightColor = spotLightColor[ i ];\n\n		vec3 lightPosition = spotLightPosition[ i ];\n		vec3 lVector = lightPosition - mvPosition.xyz;\n		vec3 lightDir = normalize( lVector );\n\n		float spotEffect = dot( spotLightDirection[ i ], lightDir );\n\n		if ( spotEffect > spotLightAngleCos[ i ] ) {\n\n			spotEffect = saturate( pow( saturate( spotEffect ), spotLightExponent[ i ] ) );\n\n\n			float attenuation = calcLightAttenuation( length( lVector ), spotLightDistance[ i ], spotLightDecay[ i ] );\n\n			attenuation *= spotEffect;\n\n\n			float dotProduct = dot( normal, lightDir );\n\n			vLightFront += lightColor * attenuation * saturate( dotProduct );\n\n			#ifdef DOUBLE_SIDED\n\n				vLightBack += lightColor * attenuation * saturate( - dotProduct );\n\n			#endif\n\n		}\n\n	}\n\n#endif\n\n#if MAX_DIR_LIGHTS > 0\n\n	for ( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {\n\n		vec3 lightColor = directionalLightColor[ i ];\n\n		vec3 lightDir = directionalLightDirection[ i ];\n\n\n		float dotProduct = dot( normal, lightDir );\n\n		vLightFront += lightColor * saturate( dotProduct );\n\n		#ifdef DOUBLE_SIDED\n\n			vLightBack += lightColor * saturate( - dotProduct );\n\n		#endif\n\n	}\n\n#endif\n\n#if MAX_HEMI_LIGHTS > 0\n\n	for ( int i = 0; i < MAX_HEMI_LIGHTS; i ++ ) {\n\n		vec3 lightDir = hemisphereLightDirection[ i ];\n\n\n		float dotProduct = dot( normal, lightDir );\n\n		float hemiDiffuseWeight = 0.5 * dotProduct + 0.5;\n\n		vLightFront += mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeight );\n\n		#ifdef DOUBLE_SIDED\n\n			float hemiDiffuseWeightBack = - 0.5 * dotProduct + 0.5;\n\n			vLightBack += mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeightBack );\n\n		#endif\n\n	}\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/lights_phong_fragment.glsl
THREE.ShaderChunk['lights_phong_fragment']="vec3 viewDir = normalize( vViewPosition );\n\nvec3 totalDiffuseLight = vec3( 0.0 );\nvec3 totalSpecularLight = vec3( 0.0 );\n\n#if MAX_POINT_LIGHTS > 0\n\n	for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {\n\n		vec3 lightColor = pointLightColor[ i ];\n\n		vec3 lightPosition = pointLightPosition[ i ];\n		vec3 lVector = lightPosition + vViewPosition.xyz;\n		vec3 lightDir = normalize( lVector );\n\n\n		float attenuation = calcLightAttenuation( length( lVector ), pointLightDistance[ i ], pointLightDecay[ i ] );\n\n\n		float cosineTerm = saturate( dot( normal, lightDir ) );\n\n		totalDiffuseLight += lightColor * attenuation * cosineTerm;\n\n\n		vec3 brdf = BRDF_BlinnPhong( specular, shininess, normal, lightDir, viewDir );\n\n		totalSpecularLight += brdf * specularStrength * lightColor * attenuation * cosineTerm;\n\n\n	}\n\n#endif\n\n#if MAX_SPOT_LIGHTS > 0\n\n	for ( int i = 0; i < MAX_SPOT_LIGHTS; i ++ ) {\n\n		vec3 lightColor = spotLightColor[ i ];\n\n		vec3 lightPosition = spotLightPosition[ i ];\n		vec3 lVector = lightPosition + vViewPosition.xyz;\n		vec3 lightDir = normalize( lVector );\n\n		float spotEffect = dot( spotLightDirection[ i ], lightDir );\n\n		if ( spotEffect > spotLightAngleCos[ i ] ) {\n\n			spotEffect = saturate( pow( saturate( spotEffect ), spotLightExponent[ i ] ) );\n\n\n			float attenuation = calcLightAttenuation( length( lVector ), spotLightDistance[ i ], spotLightDecay[ i ] );\n\n			attenuation *= spotEffect;\n\n\n			float cosineTerm = saturate( dot( normal, lightDir ) );\n\n			totalDiffuseLight += lightColor * attenuation * cosineTerm;\n\n\n			vec3 brdf = BRDF_BlinnPhong( specular, shininess, normal, lightDir, viewDir );\n\n			totalSpecularLight += brdf * specularStrength * lightColor * attenuation * cosineTerm;\n\n		}\n\n	}\n\n#endif\n\n#if MAX_DIR_LIGHTS > 0\n\n	for ( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {\n\n		vec3 lightColor = directionalLightColor[ i ];\n\n		vec3 lightDir = directionalLightDirection[ i ];\n\n\n		float cosineTerm = saturate( dot( normal, lightDir ) );\n\n		totalDiffuseLight += lightColor * cosineTerm;\n\n\n		vec3 brdf = BRDF_BlinnPhong( specular, shininess, normal, lightDir, viewDir );\n\n		totalSpecularLight += brdf * specularStrength * lightColor * cosineTerm;\n\n	}\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/lights_phong_pars_fragment.glsl
THREE.ShaderChunk['lights_phong_pars_fragment']="uniform vec3 ambientLightColor;\n\n#if MAX_DIR_LIGHTS > 0\n\n	uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];\n	uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];\n\n#endif\n\n#if MAX_HEMI_LIGHTS > 0\n\n	uniform vec3 hemisphereLightSkyColor[ MAX_HEMI_LIGHTS ];\n	uniform vec3 hemisphereLightGroundColor[ MAX_HEMI_LIGHTS ];\n	uniform vec3 hemisphereLightDirection[ MAX_HEMI_LIGHTS ];\n\n#endif\n\n#if MAX_POINT_LIGHTS > 0\n\n	uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];\n\n	uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];\n	uniform float pointLightDistance[ MAX_POINT_LIGHTS ];\n	uniform float pointLightDecay[ MAX_POINT_LIGHTS ];\n\n#endif\n\n#if MAX_SPOT_LIGHTS > 0\n\n	uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];\n	uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];\n	uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];\n	uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];\n	uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];\n	uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];\n	uniform float spotLightDecay[ MAX_SPOT_LIGHTS ];\n\n#endif\n\n#if MAX_SPOT_LIGHTS > 0 || defined( USE_ENVMAP )\n\n	varying vec3 vWorldPosition;\n\n#endif\n\nvarying vec3 vViewPosition;\n\n#ifndef FLAT_SHADED\n\n	varying vec3 vNormal;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/lights_phong_pars_vertex.glsl
THREE.ShaderChunk['lights_phong_pars_vertex']="#if MAX_SPOT_LIGHTS > 0 || defined( USE_ENVMAP )\n\n	varying vec3 vWorldPosition;\n\n#endif\n\n#if MAX_POINT_LIGHTS > 0\n\n	uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/lights_phong_vertex.glsl
THREE.ShaderChunk['lights_phong_vertex']="#if MAX_SPOT_LIGHTS > 0 || defined( USE_ENVMAP )\n\n	vWorldPosition = worldPosition.xyz;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/linear_to_gamma_fragment.glsl
THREE.ShaderChunk['linear_to_gamma_fragment']="\n	outgoingLight = linearToOutput( outgoingLight );\n"; // File:src/renderers/shaders/ShaderChunk/logdepthbuf_fragment.glsl
THREE.ShaderChunk['logdepthbuf_fragment']="#if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)\n\n	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/logdepthbuf_pars_fragment.glsl
THREE.ShaderChunk['logdepthbuf_pars_fragment']="#ifdef USE_LOGDEPTHBUF\n\n	uniform float logDepthBufFC;\n\n	#ifdef USE_LOGDEPTHBUF_EXT\n\n		varying float vFragDepth;\n\n	#endif\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/logdepthbuf_pars_vertex.glsl
THREE.ShaderChunk['logdepthbuf_pars_vertex']="#ifdef USE_LOGDEPTHBUF\n\n	#ifdef USE_LOGDEPTHBUF_EXT\n\n		varying float vFragDepth;\n\n	#endif\n\n	uniform float logDepthBufFC;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/logdepthbuf_vertex.glsl
THREE.ShaderChunk['logdepthbuf_vertex']="#ifdef USE_LOGDEPTHBUF\n\n	gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;\n\n	#ifdef USE_LOGDEPTHBUF_EXT\n\n		vFragDepth = 1.0 + gl_Position.w;\n\n#else\n\n		gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;\n\n	#endif\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/map_fragment.glsl
THREE.ShaderChunk['map_fragment']="#ifdef USE_MAP\n\n	vec4 texelColor = texture2D( map, vUv );\n\n	texelColor.xyz = inputToLinear( texelColor.xyz );\n\n	diffuseColor *= texelColor;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/map_pars_fragment.glsl
THREE.ShaderChunk['map_pars_fragment']="#ifdef USE_MAP\n\n	uniform sampler2D map;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/map_particle_fragment.glsl
THREE.ShaderChunk['map_particle_fragment']="#ifdef USE_MAP\n\n	diffuseColor *= texture2D( map, vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y ) * offsetRepeat.zw + offsetRepeat.xy );\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/map_particle_pars_fragment.glsl
THREE.ShaderChunk['map_particle_pars_fragment']="#ifdef USE_MAP\n\n	uniform vec4 offsetRepeat;\n	uniform sampler2D map;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/morphnormal_vertex.glsl
THREE.ShaderChunk['morphnormal_vertex']="#ifdef USE_MORPHNORMALS\n\n	objectNormal += ( morphNormal0 - normal ) * morphTargetInfluences[ 0 ];\n	objectNormal += ( morphNormal1 - normal ) * morphTargetInfluences[ 1 ];\n	objectNormal += ( morphNormal2 - normal ) * morphTargetInfluences[ 2 ];\n	objectNormal += ( morphNormal3 - normal ) * morphTargetInfluences[ 3 ];\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/morphtarget_pars_vertex.glsl
THREE.ShaderChunk['morphtarget_pars_vertex']="#ifdef USE_MORPHTARGETS\n\n	#ifndef USE_MORPHNORMALS\n\n	uniform float morphTargetInfluences[ 8 ];\n\n	#else\n\n	uniform float morphTargetInfluences[ 4 ];\n\n	#endif\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/morphtarget_vertex.glsl
THREE.ShaderChunk['morphtarget_vertex']="#ifdef USE_MORPHTARGETS\n\n	transformed += ( morphTarget0 - position ) * morphTargetInfluences[ 0 ];\n	transformed += ( morphTarget1 - position ) * morphTargetInfluences[ 1 ];\n	transformed += ( morphTarget2 - position ) * morphTargetInfluences[ 2 ];\n	transformed += ( morphTarget3 - position ) * morphTargetInfluences[ 3 ];\n\n	#ifndef USE_MORPHNORMALS\n\n	transformed += ( morphTarget4 - position ) * morphTargetInfluences[ 4 ];\n	transformed += ( morphTarget5 - position ) * morphTargetInfluences[ 5 ];\n	transformed += ( morphTarget6 - position ) * morphTargetInfluences[ 6 ];\n	transformed += ( morphTarget7 - position ) * morphTargetInfluences[ 7 ];\n\n	#endif\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/normal_phong_fragment.glsl
THREE.ShaderChunk['normal_phong_fragment']="#ifndef FLAT_SHADED\n\n	vec3 normal = normalize( vNormal );\n\n	#ifdef DOUBLE_SIDED\n\n		normal = normal * ( -1.0 + 2.0 * float( gl_FrontFacing ) );\n\n	#endif\n\n#else\n\n	vec3 fdx = dFdx( vViewPosition );\n	vec3 fdy = dFdy( vViewPosition );\n	vec3 normal = normalize( cross( fdx, fdy ) );\n\n#endif\n\n#ifdef USE_NORMALMAP\n\n	normal = perturbNormal2Arb( -vViewPosition, normal );\n\n#elif defined( USE_BUMPMAP )\n\n	normal = perturbNormalArb( -vViewPosition, normal, dHdxy_fwd() );\n\n#endif\n\n"; // File:src/renderers/shaders/ShaderChunk/normalmap_pars_fragment.glsl
THREE.ShaderChunk['normalmap_pars_fragment']="#ifdef USE_NORMALMAP\n\n	uniform sampler2D normalMap;\n	uniform vec2 normalScale;\n\n\n	vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {\n\n		vec3 q0 = dFdx( eye_pos.xyz );\n		vec3 q1 = dFdy( eye_pos.xyz );\n		vec2 st0 = dFdx( vUv.st );\n		vec2 st1 = dFdy( vUv.st );\n\n		vec3 S = normalize( q0 * st1.t - q1 * st0.t );\n		vec3 T = normalize( -q0 * st1.s + q1 * st0.s );\n		vec3 N = normalize( surf_norm );\n\n		vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;\n		mapN.xy = normalScale * mapN.xy;\n		mat3 tsn = mat3( S, T, N );\n		return normalize( tsn * mapN );\n\n	}\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/project_vertex.glsl
THREE.ShaderChunk['project_vertex']="#ifdef USE_SKINNING\n\n	vec4 mvPosition = modelViewMatrix * skinned;\n\n#else\n\n	vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );\n\n#endif\n\ngl_Position = projectionMatrix * mvPosition;\n"; // File:src/renderers/shaders/ShaderChunk/shadowmap_fragment.glsl
THREE.ShaderChunk['shadowmap_fragment']="#ifdef USE_SHADOWMAP\n\n	for ( int i = 0; i < MAX_SHADOWS; i ++ ) {\n\n		float texelSizeY =  1.0 / shadowMapSize[ i ].y;\n\n		float shadow = 0.0;\n\n#if defined( POINT_LIGHT_SHADOWS )\n\n		bool isPointLight = shadowDarkness[ i ] < 0.0;\n\n		if ( isPointLight ) {\n\n			float realShadowDarkness = abs( shadowDarkness[ i ] );\n\n			vec3 lightToPosition = vShadowCoord[ i ].xyz;\n\n	#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT )\n\n			vec3 bd3D = normalize( lightToPosition );\n			float dp = length( lightToPosition );\n\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D, texelSizeY ) ), shadowBias[ i ], shadow );\n\n\n	#if defined( SHADOWMAP_TYPE_PCF )\n			const float Dr = 1.25;\n	#elif defined( SHADOWMAP_TYPE_PCF_SOFT )\n			const float Dr = 2.25;\n	#endif\n\n			float os = Dr *  2.0 * texelSizeY;\n\n			const vec3 Gsd = vec3( - 1, 0, 1 );\n\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zzz * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zxz * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xxz * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xzz * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zzx * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zxx * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xxx * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xzx * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zzy * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zxy * os, texelSizeY ) ), shadowBias[ i ], shadow );\n\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xxy * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xzy * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zyz * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xyz * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zyx * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xyx * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.yzz * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.yxz * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.yxx * os, texelSizeY ) ), shadowBias[ i ], shadow );\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.yzx * os, texelSizeY ) ), shadowBias[ i ], shadow );\n\n			shadow *= realShadowDarkness * ( 1.0 / 21.0 );\n\n	#else \n			vec3 bd3D = normalize( lightToPosition );\n			float dp = length( lightToPosition );\n\n			adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D, texelSizeY ) ), shadowBias[ i ], shadow );\n\n			shadow *= realShadowDarkness;\n\n	#endif\n\n		} else {\n\n#endif \n			float texelSizeX =  1.0 / shadowMapSize[ i ].x;\n\n			vec3 shadowCoord = vShadowCoord[ i ].xyz / vShadowCoord[ i ].w;\n\n\n			bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );\n			bool inFrustum = all( inFrustumVec );\n\n			bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );\n\n			bool frustumTest = all( frustumTestVec );\n\n			if ( frustumTest ) {\n\n	#if defined( SHADOWMAP_TYPE_PCF )\n\n\n				/*\n					for ( float y = -1.25; y <= 1.25; y += 1.25 )\n						for ( float x = -1.25; x <= 1.25; x += 1.25 ) {\n							vec4 rgbaDepth = texture2D( shadowMap[ i ], vec2( x * xPixelOffset, y * yPixelOffset ) + shadowCoord.xy );\n							float fDepth = unpackDepth( rgbaDepth );\n							if ( fDepth < shadowCoord.z )\n								shadow += 1.0;\n					}\n					shadow /= 9.0;\n				*/\n\n				shadowCoord.z += shadowBias[ i ];\n\n				const float ShadowDelta = 1.0 / 9.0;\n\n				float xPixelOffset = texelSizeX;\n				float yPixelOffset = texelSizeY;\n\n				float dx0 = - 1.25 * xPixelOffset;\n				float dy0 = - 1.25 * yPixelOffset;\n				float dx1 = 1.25 * xPixelOffset;\n				float dy1 = 1.25 * yPixelOffset;\n\n				float fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy1 ) ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );\n				if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;\n\n				shadow *= shadowDarkness[ i ];\n\n	#elif defined( SHADOWMAP_TYPE_PCF_SOFT )\n\n\n				shadowCoord.z += shadowBias[ i ];\n\n				float xPixelOffset = texelSizeX;\n				float yPixelOffset = texelSizeY;\n\n				float dx0 = - 1.0 * xPixelOffset;\n				float dy0 = - 1.0 * yPixelOffset;\n				float dx1 = 1.0 * xPixelOffset;\n				float dy1 = 1.0 * yPixelOffset;\n\n				mat3 shadowKernel;\n				mat3 depthKernel;\n\n				depthKernel[ 0 ][ 0 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );\n				depthKernel[ 0 ][ 1 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );\n				depthKernel[ 0 ][ 2 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy1 ) ) );\n				depthKernel[ 1 ][ 0 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );\n				depthKernel[ 1 ][ 1 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );\n				depthKernel[ 1 ][ 2 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );\n				depthKernel[ 2 ][ 0 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );\n				depthKernel[ 2 ][ 1 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );\n				depthKernel[ 2 ][ 2 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );\n\n				vec3 shadowZ = vec3( shadowCoord.z );\n				shadowKernel[ 0 ] = vec3( lessThan( depthKernel[ 0 ], shadowZ ) );\n				shadowKernel[ 0 ] *= vec3( 0.25 );\n\n				shadowKernel[ 1 ] = vec3( lessThan( depthKernel[ 1 ], shadowZ ) );\n				shadowKernel[ 1 ] *= vec3( 0.25 );\n\n				shadowKernel[ 2 ] = vec3( lessThan( depthKernel[ 2 ], shadowZ ) );\n				shadowKernel[ 2 ] *= vec3( 0.25 );\n\n				vec2 fractionalCoord = 1.0 - fract( shadowCoord.xy * shadowMapSize[ i ].xy );\n\n				shadowKernel[ 0 ] = mix( shadowKernel[ 1 ], shadowKernel[ 0 ], fractionalCoord.x );\n				shadowKernel[ 1 ] = mix( shadowKernel[ 2 ], shadowKernel[ 1 ], fractionalCoord.x );\n\n				vec4 shadowValues;\n				shadowValues.x = mix( shadowKernel[ 0 ][ 1 ], shadowKernel[ 0 ][ 0 ], fractionalCoord.y );\n				shadowValues.y = mix( shadowKernel[ 0 ][ 2 ], shadowKernel[ 0 ][ 1 ], fractionalCoord.y );\n				shadowValues.z = mix( shadowKernel[ 1 ][ 1 ], shadowKernel[ 1 ][ 0 ], fractionalCoord.y );\n				shadowValues.w = mix( shadowKernel[ 1 ][ 2 ], shadowKernel[ 1 ][ 1 ], fractionalCoord.y );\n\n				shadow = dot( shadowValues, vec4( 1.0 ) ) * shadowDarkness[ i ];\n\n	#else \n				shadowCoord.z += shadowBias[ i ];\n\n				vec4 rgbaDepth = texture2D( shadowMap[ i ], shadowCoord.xy );\n				float fDepth = unpackDepth( rgbaDepth );\n\n				if ( fDepth < shadowCoord.z )\n					shadow = shadowDarkness[ i ];\n\n	#endif\n\n			}\n\n#ifdef SHADOWMAP_DEBUG\n\n			if ( inFrustum ) {\n\n				if ( i == 0 ) {\n\n					outgoingLight *= vec3( 1.0, 0.5, 0.0 );\n\n				} else if ( i == 1 ) {\n\n					outgoingLight *= vec3( 0.0, 1.0, 0.8 );\n\n				} else {\n\n					outgoingLight *= vec3( 0.0, 0.5, 1.0 );\n\n				}\n\n			}\n\n#endif\n\n#if defined( POINT_LIGHT_SHADOWS )\n\n		}\n\n#endif\n\n		shadowMask = shadowMask * vec3( 1.0 - shadow );\n\n	}\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/shadowmap_pars_fragment.glsl
THREE.ShaderChunk['shadowmap_pars_fragment']="#ifdef USE_SHADOWMAP\n\n	uniform sampler2D shadowMap[ MAX_SHADOWS ];\n	uniform vec2 shadowMapSize[ MAX_SHADOWS ];\n\n	uniform float shadowDarkness[ MAX_SHADOWS ];\n	uniform float shadowBias[ MAX_SHADOWS ];\n\n	varying vec4 vShadowCoord[ MAX_SHADOWS ];\n\n	float unpackDepth( const in vec4 rgba_depth ) {\n\n		const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );\n		float depth = dot( rgba_depth, bit_shift );\n		return depth;\n\n	}\n\n	#if defined(POINT_LIGHT_SHADOWS)\n\n\n		void adjustShadowValue1K( const float testDepth, const vec4 textureData, const float bias, inout float shadowValue ) {\n\n			const vec4 bitSh = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );\n			if ( testDepth >= dot( textureData, bitSh ) * 1000.0 + bias )\n				shadowValue += 1.0;\n\n		}\n\n\n		vec2 cubeToUV( vec3 v, float texelSizeY ) {\n\n\n			vec3 absV = abs( v );\n\n\n			float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );\n			absV *= scaleToCube;\n\n\n			v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );\n\n\n\n			vec2 planar = v.xy;\n\n			float almostATexel = 1.5 * texelSizeY;\n			float almostOne = 1.0 - almostATexel;\n\n			if ( absV.z >= almostOne ) {\n\n				if ( v.z > 0.0 )\n					planar.x = 4.0 - v.x;\n\n			} else if ( absV.x >= almostOne ) {\n\n				float signX = sign( v.x );\n				planar.x = v.z * signX + 2.0 * signX;\n\n			} else if ( absV.y >= almostOne ) {\n\n				float signY = sign( v.y );\n				planar.x = v.x + 2.0 * signY + 2.0;\n				planar.y = v.z * signY - 2.0;\n\n			}\n\n\n			return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );\n\n		}\n\n	#endif\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/shadowmap_pars_vertex.glsl
THREE.ShaderChunk['shadowmap_pars_vertex']="#ifdef USE_SHADOWMAP\n\n	uniform float shadowDarkness[ MAX_SHADOWS ];\n	uniform mat4 shadowMatrix[ MAX_SHADOWS ];\n	varying vec4 vShadowCoord[ MAX_SHADOWS ];\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/shadowmap_vertex.glsl
THREE.ShaderChunk['shadowmap_vertex']="#ifdef USE_SHADOWMAP\n\n	for ( int i = 0; i < MAX_SHADOWS; i ++ ) {\n\n			vShadowCoord[ i ] = shadowMatrix[ i ] * worldPosition;\n\n	}\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/skinbase_vertex.glsl
THREE.ShaderChunk['skinbase_vertex']="#ifdef USE_SKINNING\n\n	mat4 boneMatX = getBoneMatrix( skinIndex.x );\n	mat4 boneMatY = getBoneMatrix( skinIndex.y );\n	mat4 boneMatZ = getBoneMatrix( skinIndex.z );\n	mat4 boneMatW = getBoneMatrix( skinIndex.w );\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/skinning_pars_vertex.glsl
THREE.ShaderChunk['skinning_pars_vertex']="#ifdef USE_SKINNING\n\n	uniform mat4 bindMatrix;\n	uniform mat4 bindMatrixInverse;\n\n	#ifdef BONE_TEXTURE\n\n		uniform sampler2D boneTexture;\n		uniform int boneTextureWidth;\n		uniform int boneTextureHeight;\n\n		mat4 getBoneMatrix( const in float i ) {\n\n			float j = i * 4.0;\n			float x = mod( j, float( boneTextureWidth ) );\n			float y = floor( j / float( boneTextureWidth ) );\n\n			float dx = 1.0 / float( boneTextureWidth );\n			float dy = 1.0 / float( boneTextureHeight );\n\n			y = dy * ( y + 0.5 );\n\n			vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );\n			vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );\n			vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );\n			vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );\n\n			mat4 bone = mat4( v1, v2, v3, v4 );\n\n			return bone;\n\n		}\n\n	#else\n\n		uniform mat4 boneGlobalMatrices[ MAX_BONES ];\n\n		mat4 getBoneMatrix( const in float i ) {\n\n			mat4 bone = boneGlobalMatrices[ int(i) ];\n			return bone;\n\n		}\n\n	#endif\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/skinning_vertex.glsl
THREE.ShaderChunk['skinning_vertex']="#ifdef USE_SKINNING\n\n	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );\n\n	vec4 skinned = vec4( 0.0 );\n	skinned += boneMatX * skinVertex * skinWeight.x;\n	skinned += boneMatY * skinVertex * skinWeight.y;\n	skinned += boneMatZ * skinVertex * skinWeight.z;\n	skinned += boneMatW * skinVertex * skinWeight.w;\n	skinned  = bindMatrixInverse * skinned;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/skinnormal_vertex.glsl
THREE.ShaderChunk['skinnormal_vertex']="#ifdef USE_SKINNING\n\n	mat4 skinMatrix = mat4( 0.0 );\n	skinMatrix += skinWeight.x * boneMatX;\n	skinMatrix += skinWeight.y * boneMatY;\n	skinMatrix += skinWeight.z * boneMatZ;\n	skinMatrix += skinWeight.w * boneMatW;\n	skinMatrix  = bindMatrixInverse * skinMatrix * bindMatrix;\n\n	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/specularmap_fragment.glsl
THREE.ShaderChunk['specularmap_fragment']="float specularStrength;\n\n#ifdef USE_SPECULARMAP\n\n	vec4 texelSpecular = texture2D( specularMap, vUv );\n	specularStrength = texelSpecular.r;\n\n#else\n\n	specularStrength = 1.0;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/specularmap_pars_fragment.glsl
THREE.ShaderChunk['specularmap_pars_fragment']="#ifdef USE_SPECULARMAP\n\n	uniform sampler2D specularMap;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/uv2_pars_fragment.glsl
THREE.ShaderChunk['uv2_pars_fragment']="#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n\n	varying vec2 vUv2;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/uv2_pars_vertex.glsl
THREE.ShaderChunk['uv2_pars_vertex']="#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n\n	attribute vec2 uv2;\n	varying vec2 vUv2;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/uv2_vertex.glsl
THREE.ShaderChunk['uv2_vertex']="#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n\n	vUv2 = uv2;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/uv_pars_fragment.glsl
THREE.ShaderChunk['uv_pars_fragment']="#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP )\n\n	varying vec2 vUv;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/uv_pars_vertex.glsl
THREE.ShaderChunk['uv_pars_vertex']="#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP )\n\n	varying vec2 vUv;\n	uniform vec4 offsetRepeat;\n\n#endif\n"; // File:src/renderers/shaders/ShaderChunk/uv_vertex.glsl
THREE.ShaderChunk['uv_vertex']="#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP )\n\n	vUv = uv * offsetRepeat.zw + offsetRepeat.xy;\n\n#endif"; // File:src/renderers/shaders/ShaderChunk/worldpos_vertex.glsl
THREE.ShaderChunk['worldpos_vertex']="#if defined( USE_ENVMAP ) || defined( PHONG ) || defined( LAMBERT ) || defined ( USE_SHADOWMAP )\n\n	#ifdef USE_SKINNING\n\n		vec4 worldPosition = modelMatrix * skinned;\n\n	#else\n\n		vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );\n\n	#endif\n\n#endif\n"; // File:src/renderers/shaders/UniformsUtils.js
/**
 * Uniform Utilities
 */THREE.UniformsUtils={merge:function merge(uniforms){var merged={};for(var u=0;u<uniforms.length;u++){var tmp=this.clone(uniforms[u]);for(var p in tmp){merged[p]=tmp[p];}}return merged;},clone:function clone(uniforms_src){var uniforms_dst={};for(var u in uniforms_src){uniforms_dst[u]={};for(var p in uniforms_src[u]){var parameter_src=uniforms_src[u][p];if(parameter_src instanceof THREE.Color||parameter_src instanceof THREE.Vector2||parameter_src instanceof THREE.Vector3||parameter_src instanceof THREE.Vector4||parameter_src instanceof THREE.Matrix3||parameter_src instanceof THREE.Matrix4||parameter_src instanceof THREE.Texture){uniforms_dst[u][p]=parameter_src.clone();}else if(Array.isArray(parameter_src)){uniforms_dst[u][p]=parameter_src.slice();}else {uniforms_dst[u][p]=parameter_src;}}}return uniforms_dst;}}; // File:src/renderers/shaders/UniformsLib.js
/**
 * Uniforms library for shared webgl shaders
 */THREE.UniformsLib={common:{"diffuse":{type:"c",value:new THREE.Color(0xeeeeee)},"opacity":{type:"f",value:1.0},"map":{type:"t",value:null},"offsetRepeat":{type:"v4",value:new THREE.Vector4(0,0,1,1)},"specularMap":{type:"t",value:null},"alphaMap":{type:"t",value:null},"envMap":{type:"t",value:null},"flipEnvMap":{type:"f",value:-1},"reflectivity":{type:"f",value:1.0},"refractionRatio":{type:"f",value:0.98}},aomap:{"aoMap":{type:"t",value:null},"aoMapIntensity":{type:"f",value:1}},lightmap:{"lightMap":{type:"t",value:null},"lightMapIntensity":{type:"f",value:1}},emissivemap:{"emissiveMap":{type:"t",value:null}},bumpmap:{"bumpMap":{type:"t",value:null},"bumpScale":{type:"f",value:1}},normalmap:{"normalMap":{type:"t",value:null},"normalScale":{type:"v2",value:new THREE.Vector2(1,1)}},displacementmap:{"displacementMap":{type:"t",value:null},"displacementScale":{type:"f",value:1},"displacementBias":{type:"f",value:0}},fog:{"fogDensity":{type:"f",value:0.00025},"fogNear":{type:"f",value:1},"fogFar":{type:"f",value:2000},"fogColor":{type:"c",value:new THREE.Color(0xffffff)}},lights:{"ambientLightColor":{type:"fv",value:[]},"directionalLightDirection":{type:"fv",value:[]},"directionalLightColor":{type:"fv",value:[]},"hemisphereLightDirection":{type:"fv",value:[]},"hemisphereLightSkyColor":{type:"fv",value:[]},"hemisphereLightGroundColor":{type:"fv",value:[]},"pointLightColor":{type:"fv",value:[]},"pointLightPosition":{type:"fv",value:[]},"pointLightDistance":{type:"fv1",value:[]},"pointLightDecay":{type:"fv1",value:[]},"spotLightColor":{type:"fv",value:[]},"spotLightPosition":{type:"fv",value:[]},"spotLightDirection":{type:"fv",value:[]},"spotLightDistance":{type:"fv1",value:[]},"spotLightAngleCos":{type:"fv1",value:[]},"spotLightExponent":{type:"fv1",value:[]},"spotLightDecay":{type:"fv1",value:[]}},points:{"psColor":{type:"c",value:new THREE.Color(0xeeeeee)},"opacity":{type:"f",value:1.0},"size":{type:"f",value:1.0},"scale":{type:"f",value:1.0},"map":{type:"t",value:null},"offsetRepeat":{type:"v4",value:new THREE.Vector4(0,0,1,1)},"fogDensity":{type:"f",value:0.00025},"fogNear":{type:"f",value:1},"fogFar":{type:"f",value:2000},"fogColor":{type:"c",value:new THREE.Color(0xffffff)}},shadowmap:{"shadowMap":{type:"tv",value:[]},"shadowMapSize":{type:"v2v",value:[]},"shadowBias":{type:"fv1",value:[]},"shadowDarkness":{type:"fv1",value:[]},"shadowMatrix":{type:"m4v",value:[]}}}; // File:src/renderers/shaders/ShaderLib.js
/**
 * Webgl Shader Library for three.js
 *
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author mikael emtinger / http://gomo.se/
 */THREE.ShaderLib={'basic':{uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib["common"],THREE.UniformsLib["aomap"],THREE.UniformsLib["fog"],THREE.UniformsLib["shadowmap"]]),vertexShader:[THREE.ShaderChunk["common"],THREE.ShaderChunk["uv_pars_vertex"],THREE.ShaderChunk["uv2_pars_vertex"],THREE.ShaderChunk["envmap_pars_vertex"],THREE.ShaderChunk["color_pars_vertex"],THREE.ShaderChunk["morphtarget_pars_vertex"],THREE.ShaderChunk["skinning_pars_vertex"],THREE.ShaderChunk["shadowmap_pars_vertex"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {",THREE.ShaderChunk["uv_vertex"],THREE.ShaderChunk["uv2_vertex"],THREE.ShaderChunk["color_vertex"],THREE.ShaderChunk["skinbase_vertex"],"	#ifdef USE_ENVMAP",THREE.ShaderChunk["beginnormal_vertex"],THREE.ShaderChunk["morphnormal_vertex"],THREE.ShaderChunk["skinnormal_vertex"],THREE.ShaderChunk["defaultnormal_vertex"],"	#endif",THREE.ShaderChunk["begin_vertex"],THREE.ShaderChunk["morphtarget_vertex"],THREE.ShaderChunk["skinning_vertex"],THREE.ShaderChunk["project_vertex"],THREE.ShaderChunk["logdepthbuf_vertex"],THREE.ShaderChunk["worldpos_vertex"],THREE.ShaderChunk["envmap_vertex"],THREE.ShaderChunk["shadowmap_vertex"],"}"].join("\n"),fragmentShader:["uniform vec3 diffuse;","uniform float opacity;",THREE.ShaderChunk["common"],THREE.ShaderChunk["color_pars_fragment"],THREE.ShaderChunk["uv_pars_fragment"],THREE.ShaderChunk["uv2_pars_fragment"],THREE.ShaderChunk["map_pars_fragment"],THREE.ShaderChunk["alphamap_pars_fragment"],THREE.ShaderChunk["aomap_pars_fragment"],THREE.ShaderChunk["envmap_pars_fragment"],THREE.ShaderChunk["fog_pars_fragment"],THREE.ShaderChunk["shadowmap_pars_fragment"],THREE.ShaderChunk["specularmap_pars_fragment"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {","	vec3 outgoingLight = vec3( 0.0 );","	vec4 diffuseColor = vec4( diffuse, opacity );","	vec3 totalAmbientLight = vec3( 1.0 );", // hardwired
"	vec3 shadowMask = vec3( 1.0 );",THREE.ShaderChunk["logdepthbuf_fragment"],THREE.ShaderChunk["map_fragment"],THREE.ShaderChunk["color_fragment"],THREE.ShaderChunk["alphamap_fragment"],THREE.ShaderChunk["alphatest_fragment"],THREE.ShaderChunk["specularmap_fragment"],THREE.ShaderChunk["aomap_fragment"],THREE.ShaderChunk["shadowmap_fragment"],"	outgoingLight = diffuseColor.rgb * totalAmbientLight * shadowMask;",THREE.ShaderChunk["envmap_fragment"],THREE.ShaderChunk["linear_to_gamma_fragment"],THREE.ShaderChunk["fog_fragment"],"	gl_FragColor = vec4( outgoingLight, diffuseColor.a );","}"].join("\n")},'lambert':{uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib["common"],THREE.UniformsLib["fog"],THREE.UniformsLib["lights"],THREE.UniformsLib["shadowmap"],{"emissive":{type:"c",value:new THREE.Color(0x000000)}}]),vertexShader:["#define LAMBERT","varying vec3 vLightFront;","#ifdef DOUBLE_SIDED","	varying vec3 vLightBack;","#endif",THREE.ShaderChunk["common"],THREE.ShaderChunk["uv_pars_vertex"],THREE.ShaderChunk["uv2_pars_vertex"],THREE.ShaderChunk["envmap_pars_vertex"],THREE.ShaderChunk["lights_lambert_pars_vertex"],THREE.ShaderChunk["color_pars_vertex"],THREE.ShaderChunk["morphtarget_pars_vertex"],THREE.ShaderChunk["skinning_pars_vertex"],THREE.ShaderChunk["shadowmap_pars_vertex"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {",THREE.ShaderChunk["uv_vertex"],THREE.ShaderChunk["uv2_vertex"],THREE.ShaderChunk["color_vertex"],THREE.ShaderChunk["beginnormal_vertex"],THREE.ShaderChunk["morphnormal_vertex"],THREE.ShaderChunk["skinbase_vertex"],THREE.ShaderChunk["skinnormal_vertex"],THREE.ShaderChunk["defaultnormal_vertex"],THREE.ShaderChunk["begin_vertex"],THREE.ShaderChunk["morphtarget_vertex"],THREE.ShaderChunk["skinning_vertex"],THREE.ShaderChunk["project_vertex"],THREE.ShaderChunk["logdepthbuf_vertex"],THREE.ShaderChunk["worldpos_vertex"],THREE.ShaderChunk["envmap_vertex"],THREE.ShaderChunk["lights_lambert_vertex"],THREE.ShaderChunk["shadowmap_vertex"],"}"].join("\n"),fragmentShader:["uniform vec3 diffuse;","uniform vec3 emissive;","uniform float opacity;","uniform vec3 ambientLightColor;","varying vec3 vLightFront;","#ifdef DOUBLE_SIDED","	varying vec3 vLightBack;","#endif",THREE.ShaderChunk["common"],THREE.ShaderChunk["color_pars_fragment"],THREE.ShaderChunk["uv_pars_fragment"],THREE.ShaderChunk["uv2_pars_fragment"],THREE.ShaderChunk["map_pars_fragment"],THREE.ShaderChunk["alphamap_pars_fragment"],THREE.ShaderChunk["envmap_pars_fragment"],THREE.ShaderChunk["fog_pars_fragment"],THREE.ShaderChunk["shadowmap_pars_fragment"],THREE.ShaderChunk["specularmap_pars_fragment"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {","	vec3 outgoingLight = vec3( 0.0 );", // outgoing light does not have an alpha, the surface does
"	vec4 diffuseColor = vec4( diffuse, opacity );","	vec3 totalAmbientLight = ambientLightColor;","	vec3 shadowMask = vec3( 1.0 );",THREE.ShaderChunk["logdepthbuf_fragment"],THREE.ShaderChunk["map_fragment"],THREE.ShaderChunk["color_fragment"],THREE.ShaderChunk["alphamap_fragment"],THREE.ShaderChunk["alphatest_fragment"],THREE.ShaderChunk["specularmap_fragment"],THREE.ShaderChunk["shadowmap_fragment"],"	#ifdef DOUBLE_SIDED","		if ( gl_FrontFacing )","			outgoingLight += diffuseColor.rgb * ( vLightFront * shadowMask + totalAmbientLight ) + emissive;","		else","			outgoingLight += diffuseColor.rgb * ( vLightBack * shadowMask + totalAmbientLight ) + emissive;","	#else","		outgoingLight += diffuseColor.rgb * ( vLightFront * shadowMask + totalAmbientLight ) + emissive;","	#endif",THREE.ShaderChunk["envmap_fragment"],THREE.ShaderChunk["linear_to_gamma_fragment"],THREE.ShaderChunk["fog_fragment"],"	gl_FragColor = vec4( outgoingLight, diffuseColor.a );","}"].join("\n")},'phong':{uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib["common"],THREE.UniformsLib["aomap"],THREE.UniformsLib["lightmap"],THREE.UniformsLib["emissivemap"],THREE.UniformsLib["bumpmap"],THREE.UniformsLib["normalmap"],THREE.UniformsLib["displacementmap"],THREE.UniformsLib["fog"],THREE.UniformsLib["lights"],THREE.UniformsLib["shadowmap"],{"emissive":{type:"c",value:new THREE.Color(0x000000)},"specular":{type:"c",value:new THREE.Color(0x111111)},"shininess":{type:"f",value:30}}]),vertexShader:["#define PHONG","varying vec3 vViewPosition;","#ifndef FLAT_SHADED","	varying vec3 vNormal;","#endif",THREE.ShaderChunk["common"],THREE.ShaderChunk["uv_pars_vertex"],THREE.ShaderChunk["uv2_pars_vertex"],THREE.ShaderChunk["displacementmap_pars_vertex"],THREE.ShaderChunk["envmap_pars_vertex"],THREE.ShaderChunk["lights_phong_pars_vertex"],THREE.ShaderChunk["color_pars_vertex"],THREE.ShaderChunk["morphtarget_pars_vertex"],THREE.ShaderChunk["skinning_pars_vertex"],THREE.ShaderChunk["shadowmap_pars_vertex"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {",THREE.ShaderChunk["uv_vertex"],THREE.ShaderChunk["uv2_vertex"],THREE.ShaderChunk["color_vertex"],THREE.ShaderChunk["beginnormal_vertex"],THREE.ShaderChunk["morphnormal_vertex"],THREE.ShaderChunk["skinbase_vertex"],THREE.ShaderChunk["skinnormal_vertex"],THREE.ShaderChunk["defaultnormal_vertex"],"#ifndef FLAT_SHADED", // Normal computed with derivatives when FLAT_SHADED
"	vNormal = normalize( transformedNormal );","#endif",THREE.ShaderChunk["begin_vertex"],THREE.ShaderChunk["displacementmap_vertex"],THREE.ShaderChunk["morphtarget_vertex"],THREE.ShaderChunk["skinning_vertex"],THREE.ShaderChunk["project_vertex"],THREE.ShaderChunk["logdepthbuf_vertex"],"	vViewPosition = - mvPosition.xyz;",THREE.ShaderChunk["worldpos_vertex"],THREE.ShaderChunk["envmap_vertex"],THREE.ShaderChunk["lights_phong_vertex"],THREE.ShaderChunk["shadowmap_vertex"],"}"].join("\n"),fragmentShader:["#define PHONG","uniform vec3 diffuse;","uniform vec3 emissive;","uniform vec3 specular;","uniform float shininess;","uniform float opacity;",THREE.ShaderChunk["common"],THREE.ShaderChunk["color_pars_fragment"],THREE.ShaderChunk["uv_pars_fragment"],THREE.ShaderChunk["uv2_pars_fragment"],THREE.ShaderChunk["map_pars_fragment"],THREE.ShaderChunk["alphamap_pars_fragment"],THREE.ShaderChunk["aomap_pars_fragment"],THREE.ShaderChunk["lightmap_pars_fragment"],THREE.ShaderChunk["emissivemap_pars_fragment"],THREE.ShaderChunk["envmap_pars_fragment"],THREE.ShaderChunk["fog_pars_fragment"],THREE.ShaderChunk["lights_phong_pars_fragment"],THREE.ShaderChunk["shadowmap_pars_fragment"],THREE.ShaderChunk["bumpmap_pars_fragment"],THREE.ShaderChunk["normalmap_pars_fragment"],THREE.ShaderChunk["specularmap_pars_fragment"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {","	vec3 outgoingLight = vec3( 0.0 );","	vec4 diffuseColor = vec4( diffuse, opacity );","	vec3 totalAmbientLight = ambientLightColor;","	vec3 totalEmissiveLight = emissive;","	vec3 shadowMask = vec3( 1.0 );",THREE.ShaderChunk["logdepthbuf_fragment"],THREE.ShaderChunk["map_fragment"],THREE.ShaderChunk["color_fragment"],THREE.ShaderChunk["alphamap_fragment"],THREE.ShaderChunk["alphatest_fragment"],THREE.ShaderChunk["specularmap_fragment"],THREE.ShaderChunk["normal_phong_fragment"],THREE.ShaderChunk["lightmap_fragment"],THREE.ShaderChunk["hemilight_fragment"],THREE.ShaderChunk["aomap_fragment"],THREE.ShaderChunk["emissivemap_fragment"],THREE.ShaderChunk["lights_phong_fragment"],THREE.ShaderChunk["shadowmap_fragment"],"totalDiffuseLight *= shadowMask;","totalSpecularLight *= shadowMask;","#ifdef METAL","	outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + totalAmbientLight ) * specular + totalSpecularLight + totalEmissiveLight;","#else","	outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + totalAmbientLight ) + totalSpecularLight + totalEmissiveLight;","#endif",THREE.ShaderChunk["envmap_fragment"],THREE.ShaderChunk["linear_to_gamma_fragment"],THREE.ShaderChunk["fog_fragment"],"	gl_FragColor = vec4( outgoingLight, diffuseColor.a );","}"].join("\n")},'points':{uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib["points"],THREE.UniformsLib["shadowmap"]]),vertexShader:["uniform float size;","uniform float scale;",THREE.ShaderChunk["common"],THREE.ShaderChunk["color_pars_vertex"],THREE.ShaderChunk["shadowmap_pars_vertex"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {",THREE.ShaderChunk["color_vertex"],"	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );","	#ifdef USE_SIZEATTENUATION","		gl_PointSize = size * ( scale / length( mvPosition.xyz ) );","	#else","		gl_PointSize = size;","	#endif","	gl_Position = projectionMatrix * mvPosition;",THREE.ShaderChunk["logdepthbuf_vertex"],THREE.ShaderChunk["worldpos_vertex"],THREE.ShaderChunk["shadowmap_vertex"],"}"].join("\n"),fragmentShader:["uniform vec3 psColor;","uniform float opacity;",THREE.ShaderChunk["common"],THREE.ShaderChunk["color_pars_fragment"],THREE.ShaderChunk["map_particle_pars_fragment"],THREE.ShaderChunk["fog_pars_fragment"],THREE.ShaderChunk["shadowmap_pars_fragment"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {","	vec3 outgoingLight = vec3( 0.0 );","	vec4 diffuseColor = vec4( psColor, opacity );","	vec3 shadowMask = vec3( 1.0 );",THREE.ShaderChunk["logdepthbuf_fragment"],THREE.ShaderChunk["map_particle_fragment"],THREE.ShaderChunk["color_fragment"],THREE.ShaderChunk["alphatest_fragment"],THREE.ShaderChunk["shadowmap_fragment"],"	outgoingLight = diffuseColor.rgb * shadowMask;",THREE.ShaderChunk["fog_fragment"],"	gl_FragColor = vec4( outgoingLight, diffuseColor.a );","}"].join("\n")},'dashed':{uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib["common"],THREE.UniformsLib["fog"],{"scale":{type:"f",value:1},"dashSize":{type:"f",value:1},"totalSize":{type:"f",value:2}}]),vertexShader:["uniform float scale;","attribute float lineDistance;","varying float vLineDistance;",THREE.ShaderChunk["common"],THREE.ShaderChunk["color_pars_vertex"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {",THREE.ShaderChunk["color_vertex"],"	vLineDistance = scale * lineDistance;","	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );","	gl_Position = projectionMatrix * mvPosition;",THREE.ShaderChunk["logdepthbuf_vertex"],"}"].join("\n"),fragmentShader:["uniform vec3 diffuse;","uniform float opacity;","uniform float dashSize;","uniform float totalSize;","varying float vLineDistance;",THREE.ShaderChunk["common"],THREE.ShaderChunk["color_pars_fragment"],THREE.ShaderChunk["fog_pars_fragment"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {","	if ( mod( vLineDistance, totalSize ) > dashSize ) {","		discard;","	}","	vec3 outgoingLight = vec3( 0.0 );","	vec4 diffuseColor = vec4( diffuse, opacity );",THREE.ShaderChunk["logdepthbuf_fragment"],THREE.ShaderChunk["color_fragment"],"	outgoingLight = diffuseColor.rgb;", // simple shader
THREE.ShaderChunk["fog_fragment"],"	gl_FragColor = vec4( outgoingLight, diffuseColor.a );","}"].join("\n")},'depth':{uniforms:{"mNear":{type:"f",value:1.0},"mFar":{type:"f",value:2000.0},"opacity":{type:"f",value:1.0}},vertexShader:[THREE.ShaderChunk["common"],THREE.ShaderChunk["morphtarget_pars_vertex"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {",THREE.ShaderChunk["begin_vertex"],THREE.ShaderChunk["morphtarget_vertex"],THREE.ShaderChunk["project_vertex"],THREE.ShaderChunk["logdepthbuf_vertex"],"}"].join("\n"),fragmentShader:["uniform float mNear;","uniform float mFar;","uniform float opacity;",THREE.ShaderChunk["common"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {",THREE.ShaderChunk["logdepthbuf_fragment"],"	#ifdef USE_LOGDEPTHBUF_EXT","		float depth = gl_FragDepthEXT / gl_FragCoord.w;","	#else","		float depth = gl_FragCoord.z / gl_FragCoord.w;","	#endif","	float color = 1.0 - smoothstep( mNear, mFar, depth );","	gl_FragColor = vec4( vec3( color ), opacity );","}"].join("\n")},'normal':{uniforms:{"opacity":{type:"f",value:1.0}},vertexShader:["varying vec3 vNormal;",THREE.ShaderChunk["common"],THREE.ShaderChunk["morphtarget_pars_vertex"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {","	vNormal = normalize( normalMatrix * normal );",THREE.ShaderChunk["begin_vertex"],THREE.ShaderChunk["morphtarget_vertex"],THREE.ShaderChunk["project_vertex"],THREE.ShaderChunk["logdepthbuf_vertex"],"}"].join("\n"),fragmentShader:["uniform float opacity;","varying vec3 vNormal;",THREE.ShaderChunk["common"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {","	gl_FragColor = vec4( 0.5 * normalize( vNormal ) + 0.5, opacity );",THREE.ShaderChunk["logdepthbuf_fragment"],"}"].join("\n")}, /* -------------------------------------------------------------------------
	//	Cube map shader
	 ------------------------------------------------------------------------- */'cube':{uniforms:{"tCube":{type:"t",value:null},"tFlip":{type:"f",value:-1}},vertexShader:["varying vec3 vWorldPosition;",THREE.ShaderChunk["common"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {","	vWorldPosition = transformDirection( position, modelMatrix );","	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",THREE.ShaderChunk["logdepthbuf_vertex"],"}"].join("\n"),fragmentShader:["uniform samplerCube tCube;","uniform float tFlip;","varying vec3 vWorldPosition;",THREE.ShaderChunk["common"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {","	gl_FragColor = textureCube( tCube, vec3( tFlip * vWorldPosition.x, vWorldPosition.yz ) );",THREE.ShaderChunk["logdepthbuf_fragment"],"}"].join("\n")}, /* -------------------------------------------------------------------------
	//	Cube map shader
	 ------------------------------------------------------------------------- */'equirect':{uniforms:{"tEquirect":{type:"t",value:null},"tFlip":{type:"f",value:-1}},vertexShader:["varying vec3 vWorldPosition;",THREE.ShaderChunk["common"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {","	vWorldPosition = transformDirection( position, modelMatrix );","	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",THREE.ShaderChunk["logdepthbuf_vertex"],"}"].join("\n"),fragmentShader:["uniform sampler2D tEquirect;","uniform float tFlip;","varying vec3 vWorldPosition;",THREE.ShaderChunk["common"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"void main() {", // "	gl_FragColor = textureCube( tCube, vec3( tFlip * vWorldPosition.x, vWorldPosition.yz ) );",
"vec3 direction = normalize( vWorldPosition );","vec2 sampleUV;","sampleUV.y = saturate( tFlip * direction.y * -0.5 + 0.5 );","sampleUV.x = atan( direction.z, direction.x ) * RECIPROCAL_PI2 + 0.5;","gl_FragColor = texture2D( tEquirect, sampleUV );",THREE.ShaderChunk["logdepthbuf_fragment"],"}"].join("\n")}, /* Depth encoding into RGBA texture
	 *
	 * based on SpiderGL shadow map example
	 * http://spidergl.org/example.php?id=6
	 *
	 * originally from
	 * http://www.gamedev.net/topic/442138-packing-a-float-into-a-a8r8g8b8-texture-shader/page__whichpage__1%25EF%25BF%25BD
	 *
	 * see also
	 * http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
	 */'depthRGBA':{uniforms:{},vertexShader:[THREE.ShaderChunk["common"],THREE.ShaderChunk["morphtarget_pars_vertex"],THREE.ShaderChunk["skinning_pars_vertex"],THREE.ShaderChunk["logdepthbuf_pars_vertex"],"void main() {",THREE.ShaderChunk["skinbase_vertex"],THREE.ShaderChunk["begin_vertex"],THREE.ShaderChunk["morphtarget_vertex"],THREE.ShaderChunk["skinning_vertex"],THREE.ShaderChunk["project_vertex"],THREE.ShaderChunk["logdepthbuf_vertex"],"}"].join("\n"),fragmentShader:[THREE.ShaderChunk["common"],THREE.ShaderChunk["logdepthbuf_pars_fragment"],"vec4 pack_depth( const in float depth ) {","	const vec4 bit_shift = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );","	const vec4 bit_mask = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );","	vec4 res = mod( depth * bit_shift * vec4( 255 ), vec4( 256 ) ) / vec4( 255 );", // "	vec4 res = fract( depth * bit_shift );",
"	res -= res.xxyz * bit_mask;","	return res;","}","void main() {",THREE.ShaderChunk["logdepthbuf_fragment"],"	#ifdef USE_LOGDEPTHBUF_EXT","		gl_FragData[ 0 ] = pack_depth( gl_FragDepthEXT );","	#else","		gl_FragData[ 0 ] = pack_depth( gl_FragCoord.z );","	#endif", //"gl_FragData[ 0 ] = pack_depth( gl_FragCoord.z / gl_FragCoord.w );",
//"float z = ( ( gl_FragCoord.z / gl_FragCoord.w ) - 3.0 ) / ( 4000.0 - 3.0 );",
//"gl_FragData[ 0 ] = pack_depth( z );",
//"gl_FragData[ 0 ] = vec4( z, z, z, 1.0 );",
"}"].join("\n")},'distanceRGBA':{uniforms:{"lightPos":{type:"v3",value:new THREE.Vector3(0,0,0)}},vertexShader:["varying vec4 vWorldPosition;",THREE.ShaderChunk["common"],THREE.ShaderChunk["morphtarget_pars_vertex"],THREE.ShaderChunk["skinning_pars_vertex"],"void main() {",THREE.ShaderChunk["skinbase_vertex"],THREE.ShaderChunk["begin_vertex"],THREE.ShaderChunk["morphtarget_vertex"],THREE.ShaderChunk["skinning_vertex"],THREE.ShaderChunk["project_vertex"],THREE.ShaderChunk["worldpos_vertex"],"vWorldPosition = worldPosition;","}"].join("\n"),fragmentShader:["uniform vec3 lightPos;","varying vec4 vWorldPosition;",THREE.ShaderChunk["common"],"vec4 pack1K ( float depth ) {","   depth /= 1000.0;","   const vec4 bitSh = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );","	const vec4 bitMsk = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );","	vec4 res = fract( depth * bitSh );","	res -= res.xxyz * bitMsk;","	return res; ","}","float unpack1K ( vec4 color ) {","	const vec4 bitSh = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );","	return dot( color, bitSh ) * 1000.0;","}","void main () {","	gl_FragColor = pack1K( length( vWorldPosition.xyz - lightPos.xyz ) );","}"].join("\n")}}; // File:src/renderers/WebGLRenderer.js
/**
 * @author supereggbert / http://www.paulbrunt.co.uk/
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author szimek / https://github.com/szimek/
 */THREE.WebGLRenderer=function(parameters){console.log('THREE.WebGLRenderer',THREE.REVISION);parameters=parameters||{};var _canvas=parameters.canvas!==undefined?parameters.canvas:document.createElement('canvas'),_context=parameters.context!==undefined?parameters.context:null,_width=_canvas.width,_height=_canvas.height,pixelRatio=1,_alpha=parameters.alpha!==undefined?parameters.alpha:false,_depth=parameters.depth!==undefined?parameters.depth:true,_stencil=parameters.stencil!==undefined?parameters.stencil:true,_antialias=parameters.antialias!==undefined?parameters.antialias:false,_premultipliedAlpha=parameters.premultipliedAlpha!==undefined?parameters.premultipliedAlpha:true,_preserveDrawingBuffer=parameters.preserveDrawingBuffer!==undefined?parameters.preserveDrawingBuffer:false,_clearColor=new THREE.Color(0x000000),_clearAlpha=0;var lights=[];var opaqueObjects=[];var opaqueObjectsLastIndex=-1;var transparentObjects=[];var transparentObjectsLastIndex=-1;var morphInfluences=new Float32Array(8);var sprites=[];var lensFlares=[]; // public properties
this.domElement=_canvas;this.context=null; // clearing
this.autoClear=true;this.autoClearColor=true;this.autoClearDepth=true;this.autoClearStencil=true; // scene graph
this.sortObjects=true; // physically based shading
this.gammaFactor=2.0; // for backwards compatibility
this.gammaInput=false;this.gammaOutput=false; // morphs
this.maxMorphTargets=8;this.maxMorphNormals=4; // flags
this.autoScaleCubemaps=true; // internal properties
var _this=this, // internal state cache
_currentProgram=null,_currentFramebuffer=null,_currentMaterialId=-1,_currentGeometryProgram='',_currentCamera=null,_usedTextureUnits=0,_viewportX=0,_viewportY=0,_viewportWidth=_canvas.width,_viewportHeight=_canvas.height,_currentWidth=0,_currentHeight=0, // frustum
_frustum=new THREE.Frustum(), // camera matrices cache
_projScreenMatrix=new THREE.Matrix4(),_vector3=new THREE.Vector3(), // light arrays cache
_direction=new THREE.Vector3(),_lightsNeedUpdate=true,_lights={ambient:[0,0,0],directional:{length:0,colors:[],positions:[]},point:{length:0,colors:[],positions:[],distances:[],decays:[]},spot:{length:0,colors:[],positions:[],distances:[],directions:[],anglesCos:[],exponents:[],decays:[]},hemi:{length:0,skyColors:[],groundColors:[],positions:[]}}, // info
_infoMemory={geometries:0,textures:0},_infoRender={calls:0,vertices:0,faces:0,points:0};this.info={render:_infoRender,memory:_infoMemory,programs:null}; // initialize
var _gl;try{var attributes={alpha:_alpha,depth:_depth,stencil:_stencil,antialias:_antialias,premultipliedAlpha:_premultipliedAlpha,preserveDrawingBuffer:_preserveDrawingBuffer};_gl=_context||_canvas.getContext('webgl',attributes)||_canvas.getContext('experimental-webgl',attributes);if(_gl===null){if(_canvas.getContext('webgl')!==null){throw 'Error creating WebGL context with your selected attributes.';}else {throw 'Error creating WebGL context.';}}_canvas.addEventListener('webglcontextlost',onContextLost,false);}catch(error){console.error('THREE.WebGLRenderer: '+error);}var extensions=new THREE.WebGLExtensions(_gl);extensions.get('OES_texture_float');extensions.get('OES_texture_float_linear');extensions.get('OES_texture_half_float');extensions.get('OES_texture_half_float_linear');extensions.get('OES_standard_derivatives');extensions.get('ANGLE_instanced_arrays');if(extensions.get('OES_element_index_uint')){THREE.BufferGeometry.MaxIndex=4294967296;}var capabilities=new THREE.WebGLCapabilities(_gl,extensions,parameters);var state=new THREE.WebGLState(_gl,extensions,paramThreeToGL);var properties=new THREE.WebGLProperties();var objects=new THREE.WebGLObjects(_gl,properties,this.info);var programCache=new THREE.WebGLPrograms(this,capabilities);this.info.programs=programCache.programs;var bufferRenderer=new THREE.WebGLBufferRenderer(_gl,extensions,_infoRender);var indexedBufferRenderer=new THREE.WebGLIndexedBufferRenderer(_gl,extensions,_infoRender); //
function glClearColor(r,g,b,a){if(_premultipliedAlpha===true){r*=a;g*=a;b*=a;}_gl.clearColor(r,g,b,a);}function setDefaultGLState(){state.init();_gl.viewport(_viewportX,_viewportY,_viewportWidth,_viewportHeight);glClearColor(_clearColor.r,_clearColor.g,_clearColor.b,_clearAlpha);}function resetGLState(){_currentProgram=null;_currentCamera=null;_currentGeometryProgram='';_currentMaterialId=-1;_lightsNeedUpdate=true;state.reset();}setDefaultGLState();this.context=_gl;this.capabilities=capabilities;this.extensions=extensions;this.state=state; // shadow map
var shadowMap=new THREE.WebGLShadowMap(this,lights,objects);this.shadowMap=shadowMap; // Plugins
var spritePlugin=new THREE.SpritePlugin(this,sprites);var lensFlarePlugin=new THREE.LensFlarePlugin(this,lensFlares); // API
this.getContext=function(){return _gl;};this.getContextAttributes=function(){return _gl.getContextAttributes();};this.forceContextLoss=function(){extensions.get('WEBGL_lose_context').loseContext();};this.getMaxAnisotropy=function(){var value;return function getMaxAnisotropy(){if(value!==undefined)return value;var extension=extensions.get('EXT_texture_filter_anisotropic');if(extension!==null){value=_gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);}else {value=0;}return value;};}();this.getPrecision=function(){return capabilities.precision;};this.getPixelRatio=function(){return pixelRatio;};this.setPixelRatio=function(value){if(value!==undefined)pixelRatio=value;};this.getSize=function(){return {width:_width,height:_height};};this.setSize=function(width,height,updateStyle){_width=width;_height=height;_canvas.width=width*pixelRatio;_canvas.height=height*pixelRatio;if(updateStyle!==false){_canvas.style.width=width+'px';_canvas.style.height=height+'px';}this.setViewport(0,0,width,height);};this.setViewport=function(x,y,width,height){_viewportX=x*pixelRatio;_viewportY=y*pixelRatio;_viewportWidth=width*pixelRatio;_viewportHeight=height*pixelRatio;_gl.viewport(_viewportX,_viewportY,_viewportWidth,_viewportHeight);};this.getViewport=function(dimensions){dimensions.x=_viewportX/pixelRatio;dimensions.y=_viewportY/pixelRatio;dimensions.z=_viewportWidth/pixelRatio;dimensions.w=_viewportHeight/pixelRatio;};this.setScissor=function(x,y,width,height){_gl.scissor(x*pixelRatio,y*pixelRatio,width*pixelRatio,height*pixelRatio);};this.enableScissorTest=function(boolean){state.setScissorTest(boolean);}; // Clearing
this.getClearColor=function(){return _clearColor;};this.setClearColor=function(color,alpha){_clearColor.set(color);_clearAlpha=alpha!==undefined?alpha:1;glClearColor(_clearColor.r,_clearColor.g,_clearColor.b,_clearAlpha);};this.getClearAlpha=function(){return _clearAlpha;};this.setClearAlpha=function(alpha){_clearAlpha=alpha;glClearColor(_clearColor.r,_clearColor.g,_clearColor.b,_clearAlpha);};this.clear=function(color,depth,stencil){var bits=0;if(color===undefined||color)bits|=_gl.COLOR_BUFFER_BIT;if(depth===undefined||depth)bits|=_gl.DEPTH_BUFFER_BIT;if(stencil===undefined||stencil)bits|=_gl.STENCIL_BUFFER_BIT;_gl.clear(bits);};this.clearColor=function(){_gl.clear(_gl.COLOR_BUFFER_BIT);};this.clearDepth=function(){_gl.clear(_gl.DEPTH_BUFFER_BIT);};this.clearStencil=function(){_gl.clear(_gl.STENCIL_BUFFER_BIT);};this.clearTarget=function(renderTarget,color,depth,stencil){this.setRenderTarget(renderTarget);this.clear(color,depth,stencil);}; // Reset
this.resetGLState=resetGLState;this.dispose=function(){_canvas.removeEventListener('webglcontextlost',onContextLost,false);}; // Events
function onContextLost(event){event.preventDefault();resetGLState();setDefaultGLState();properties.clear();};function onTextureDispose(event){var texture=event.target;texture.removeEventListener('dispose',onTextureDispose);deallocateTexture(texture);_infoMemory.textures--;}function onRenderTargetDispose(event){var renderTarget=event.target;renderTarget.removeEventListener('dispose',onRenderTargetDispose);deallocateRenderTarget(renderTarget);_infoMemory.textures--;}function onMaterialDispose(event){var material=event.target;material.removeEventListener('dispose',onMaterialDispose);deallocateMaterial(material);} // Buffer deallocation
function deallocateTexture(texture){var textureProperties=properties.get(texture);if(texture.image&&textureProperties.__image__webglTextureCube){ // cube texture
_gl.deleteTexture(textureProperties.__image__webglTextureCube);}else { // 2D texture
if(textureProperties.__webglInit===undefined)return;_gl.deleteTexture(textureProperties.__webglTexture);} // remove all webgl properties
properties.delete(texture);}function deallocateRenderTarget(renderTarget){var renderTargetProperties=properties.get(renderTarget);var textureProperties=properties.get(renderTarget.texture);if(!renderTarget||textureProperties.__webglTexture===undefined)return;_gl.deleteTexture(textureProperties.__webglTexture);if(renderTarget instanceof THREE.WebGLRenderTargetCube){for(var i=0;i<6;i++){_gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer[i]);_gl.deleteRenderbuffer(renderTargetProperties.__webglRenderbuffer[i]);}}else {_gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer);_gl.deleteRenderbuffer(renderTargetProperties.__webglRenderbuffer);}properties.delete(renderTarget.texture);properties.delete(renderTarget);}function deallocateMaterial(material){releaseMaterialProgramReference(material);properties.delete(material);}function releaseMaterialProgramReference(material){var programInfo=properties.get(material).program;material.program=undefined;if(programInfo!==undefined){programCache.releaseProgram(programInfo);}} // Buffer rendering
this.renderBufferImmediate=function(object,program,material){state.initAttributes();var buffers=properties.get(object);if(object.hasPositions&&!buffers.position)buffers.position=_gl.createBuffer();if(object.hasNormals&&!buffers.normal)buffers.normal=_gl.createBuffer();if(object.hasUvs&&!buffers.uv)buffers.uv=_gl.createBuffer();if(object.hasColors&&!buffers.color)buffers.color=_gl.createBuffer();var attributes=program.getAttributes();if(object.hasPositions){_gl.bindBuffer(_gl.ARRAY_BUFFER,buffers.position);_gl.bufferData(_gl.ARRAY_BUFFER,object.positionArray,_gl.DYNAMIC_DRAW);state.enableAttribute(attributes.position);_gl.vertexAttribPointer(attributes.position,3,_gl.FLOAT,false,0,0);}if(object.hasNormals){_gl.bindBuffer(_gl.ARRAY_BUFFER,buffers.normal);if(material.type!=='MeshPhongMaterial'&&material.shading===THREE.FlatShading){for(var i=0,l=object.count*3;i<l;i+=9){var array=object.normalArray;var nx=(array[i+0]+array[i+3]+array[i+6])/3;var ny=(array[i+1]+array[i+4]+array[i+7])/3;var nz=(array[i+2]+array[i+5]+array[i+8])/3;array[i+0]=nx;array[i+1]=ny;array[i+2]=nz;array[i+3]=nx;array[i+4]=ny;array[i+5]=nz;array[i+6]=nx;array[i+7]=ny;array[i+8]=nz;}}_gl.bufferData(_gl.ARRAY_BUFFER,object.normalArray,_gl.DYNAMIC_DRAW);state.enableAttribute(attributes.normal);_gl.vertexAttribPointer(attributes.normal,3,_gl.FLOAT,false,0,0);}if(object.hasUvs&&material.map){_gl.bindBuffer(_gl.ARRAY_BUFFER,buffers.uv);_gl.bufferData(_gl.ARRAY_BUFFER,object.uvArray,_gl.DYNAMIC_DRAW);state.enableAttribute(attributes.uv);_gl.vertexAttribPointer(attributes.uv,2,_gl.FLOAT,false,0,0);}if(object.hasColors&&material.vertexColors!==THREE.NoColors){_gl.bindBuffer(_gl.ARRAY_BUFFER,buffers.color);_gl.bufferData(_gl.ARRAY_BUFFER,object.colorArray,_gl.DYNAMIC_DRAW);state.enableAttribute(attributes.color);_gl.vertexAttribPointer(attributes.color,3,_gl.FLOAT,false,0,0);}state.disableUnusedAttributes();_gl.drawArrays(_gl.TRIANGLES,0,object.count);object.count=0;};this.renderBufferDirect=function(camera,lights,fog,geometry,material,object,group){setMaterial(material);var program=setProgram(camera,lights,fog,material,object);var updateBuffers=false;var geometryProgram=geometry.id+'_'+program.id+'_'+material.wireframe;if(geometryProgram!==_currentGeometryProgram){_currentGeometryProgram=geometryProgram;updateBuffers=true;} // morph targets
var morphTargetInfluences=object.morphTargetInfluences;if(morphTargetInfluences!==undefined){var activeInfluences=[];for(var i=0,l=morphTargetInfluences.length;i<l;i++){var influence=morphTargetInfluences[i];activeInfluences.push([influence,i]);}activeInfluences.sort(numericalSort);if(activeInfluences.length>8){activeInfluences.length=8;}var morphAttributes=geometry.morphAttributes;for(var i=0,l=activeInfluences.length;i<l;i++){var influence=activeInfluences[i];morphInfluences[i]=influence[0];if(influence[0]!==0){var index=influence[1];if(material.morphTargets===true&&morphAttributes.position)geometry.addAttribute('morphTarget'+i,morphAttributes.position[index]);if(material.morphNormals===true&&morphAttributes.normal)geometry.addAttribute('morphNormal'+i,morphAttributes.normal[index]);}else {if(material.morphTargets===true)geometry.removeAttribute('morphTarget'+i);if(material.morphNormals===true)geometry.removeAttribute('morphNormal'+i);}}var uniforms=program.getUniforms();if(uniforms.morphTargetInfluences!==null){_gl.uniform1fv(uniforms.morphTargetInfluences,morphInfluences);}updateBuffers=true;} //
var index=geometry.index;var position=geometry.attributes.position;if(material.wireframe===true){index=objects.getWireframeAttribute(geometry);}var renderer;if(index!==null){renderer=indexedBufferRenderer;renderer.setIndex(index);}else {renderer=bufferRenderer;}if(updateBuffers){setupVertexAttributes(material,program,geometry);if(index!==null){_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER,objects.getAttributeBuffer(index));}} //
var dataStart=0;var dataCount=Infinity;if(index!==null){dataCount=index.count;}else if(position!==undefined){dataCount=position.count;}var rangeStart=geometry.drawRange.start;var rangeCount=geometry.drawRange.count;var groupStart=group!==null?group.start:0;var groupCount=group!==null?group.count:Infinity;var drawStart=Math.max(dataStart,rangeStart,groupStart);var drawEnd=Math.min(dataStart+dataCount,rangeStart+rangeCount,groupStart+groupCount)-1;var drawCount=Math.max(0,drawEnd-drawStart+1); //
if(object instanceof THREE.Mesh){if(material.wireframe===true){state.setLineWidth(material.wireframeLinewidth*pixelRatio);renderer.setMode(_gl.LINES);}else {renderer.setMode(_gl.TRIANGLES);}if(geometry instanceof THREE.InstancedBufferGeometry&&geometry.maxInstancedCount>0){renderer.renderInstances(geometry);}else {renderer.render(drawStart,drawCount);}}else if(object instanceof THREE.Line){var lineWidth=material.linewidth;if(lineWidth===undefined)lineWidth=1; // Not using Line*Material
state.setLineWidth(lineWidth*pixelRatio);if(object instanceof THREE.LineSegments){renderer.setMode(_gl.LINES);}else {renderer.setMode(_gl.LINE_STRIP);}renderer.render(drawStart,drawCount);}else if(object instanceof THREE.Points){renderer.setMode(_gl.POINTS);renderer.render(drawStart,drawCount);}};function setupVertexAttributes(material,program,geometry,startIndex){var extension;if(geometry instanceof THREE.InstancedBufferGeometry){extension=extensions.get('ANGLE_instanced_arrays');if(extension===null){console.error('THREE.WebGLRenderer.setupVertexAttributes: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.');return;}}if(startIndex===undefined)startIndex=0;state.initAttributes();var geometryAttributes=geometry.attributes;var programAttributes=program.getAttributes();var materialDefaultAttributeValues=material.defaultAttributeValues;for(var name in programAttributes){var programAttribute=programAttributes[name];if(programAttribute>=0){var geometryAttribute=geometryAttributes[name];if(geometryAttribute!==undefined){var size=geometryAttribute.itemSize;var buffer=objects.getAttributeBuffer(geometryAttribute);if(geometryAttribute instanceof THREE.InterleavedBufferAttribute){var data=geometryAttribute.data;var stride=data.stride;var offset=geometryAttribute.offset;if(data instanceof THREE.InstancedInterleavedBuffer){state.enableAttributeAndDivisor(programAttribute,data.meshPerAttribute,extension);if(geometry.maxInstancedCount===undefined){geometry.maxInstancedCount=data.meshPerAttribute*data.count;}}else {state.enableAttribute(programAttribute);}_gl.bindBuffer(_gl.ARRAY_BUFFER,buffer);_gl.vertexAttribPointer(programAttribute,size,_gl.FLOAT,false,stride*data.array.BYTES_PER_ELEMENT,(startIndex*stride+offset)*data.array.BYTES_PER_ELEMENT);}else {if(geometryAttribute instanceof THREE.InstancedBufferAttribute){state.enableAttributeAndDivisor(programAttribute,geometryAttribute.meshPerAttribute,extension);if(geometry.maxInstancedCount===undefined){geometry.maxInstancedCount=geometryAttribute.meshPerAttribute*geometryAttribute.count;}}else {state.enableAttribute(programAttribute);}_gl.bindBuffer(_gl.ARRAY_BUFFER,buffer);_gl.vertexAttribPointer(programAttribute,size,_gl.FLOAT,false,0,startIndex*size*4); // 4 bytes per Float32
}}else if(materialDefaultAttributeValues!==undefined){var value=materialDefaultAttributeValues[name];if(value!==undefined){switch(value.length){case 2:_gl.vertexAttrib2fv(programAttribute,value);break;case 3:_gl.vertexAttrib3fv(programAttribute,value);break;case 4:_gl.vertexAttrib4fv(programAttribute,value);break;default:_gl.vertexAttrib1fv(programAttribute,value);}}}}}state.disableUnusedAttributes();} // Sorting
function numericalSort(a,b){return b[0]-a[0];}function painterSortStable(a,b){if(a.object.renderOrder!==b.object.renderOrder){return a.object.renderOrder-b.object.renderOrder;}else if(a.material.id!==b.material.id){return a.material.id-b.material.id;}else if(a.z!==b.z){return a.z-b.z;}else {return a.id-b.id;}}function reversePainterSortStable(a,b){if(a.object.renderOrder!==b.object.renderOrder){return a.object.renderOrder-b.object.renderOrder;}if(a.z!==b.z){return b.z-a.z;}else {return a.id-b.id;}} // Rendering
this.render=function(scene,camera,renderTarget,forceClear){if(camera instanceof THREE.Camera===false){console.error('THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.');return;}var fog=scene.fog; // reset caching for this frame
_currentGeometryProgram='';_currentMaterialId=-1;_currentCamera=null;_lightsNeedUpdate=true; // update scene graph
if(scene.autoUpdate===true)scene.updateMatrixWorld(); // update camera matrices and frustum
if(camera.parent===null)camera.updateMatrixWorld();camera.matrixWorldInverse.getInverse(camera.matrixWorld);_projScreenMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);_frustum.setFromMatrix(_projScreenMatrix);lights.length=0;opaqueObjectsLastIndex=-1;transparentObjectsLastIndex=-1;sprites.length=0;lensFlares.length=0;projectObject(scene,camera);opaqueObjects.length=opaqueObjectsLastIndex+1;transparentObjects.length=transparentObjectsLastIndex+1;if(_this.sortObjects===true){opaqueObjects.sort(painterSortStable);transparentObjects.sort(reversePainterSortStable);} //
shadowMap.render(scene); //
_infoRender.calls=0;_infoRender.vertices=0;_infoRender.faces=0;_infoRender.points=0;this.setRenderTarget(renderTarget);if(this.autoClear||forceClear){this.clear(this.autoClearColor,this.autoClearDepth,this.autoClearStencil);} //
if(scene.overrideMaterial){var overrideMaterial=scene.overrideMaterial;renderObjects(opaqueObjects,camera,lights,fog,overrideMaterial);renderObjects(transparentObjects,camera,lights,fog,overrideMaterial);}else { // opaque pass (front-to-back order)
state.setBlending(THREE.NoBlending);renderObjects(opaqueObjects,camera,lights,fog); // transparent pass (back-to-front order)
renderObjects(transparentObjects,camera,lights,fog);} // custom render plugins (post pass)
spritePlugin.render(scene,camera);lensFlarePlugin.render(scene,camera,_currentWidth,_currentHeight); // Generate mipmap if we're using any kind of mipmap filtering
if(renderTarget){var texture=renderTarget.texture;var isTargetPowerOfTwo=isPowerOfTwo(renderTarget);if(texture.generateMipmaps&&isTargetPowerOfTwo&&texture.minFilter!==THREE.NearestFilter&&texture.minFilter!==THREE.LinearFilter){updateRenderTargetMipmap(renderTarget);}} // Ensure depth buffer writing is enabled so it can be cleared on next render
state.setDepthTest(true);state.setDepthWrite(true);state.setColorWrite(true); // _gl.finish();
};function pushRenderItem(object,geometry,material,z,group){var array,index; // allocate the next position in the appropriate array
if(material.transparent){array=transparentObjects;index=++transparentObjectsLastIndex;}else {array=opaqueObjects;index=++opaqueObjectsLastIndex;} // recycle existing render item or grow the array
var renderItem=array[index];if(renderItem!==undefined){renderItem.id=object.id;renderItem.object=object;renderItem.geometry=geometry;renderItem.material=material;renderItem.z=_vector3.z;renderItem.group=group;}else {renderItem={id:object.id,object:object,geometry:geometry,material:material,z:_vector3.z,group:group}; // assert( index === array.length );
array.push(renderItem);}}function projectObject(object,camera){if(object.visible===false)return;if((object.channels.mask&camera.channels.mask)!==0){if(object instanceof THREE.Light){lights.push(object);}else if(object instanceof THREE.Sprite){sprites.push(object);}else if(object instanceof THREE.LensFlare){lensFlares.push(object);}else if(object instanceof THREE.ImmediateRenderObject){if(_this.sortObjects===true){_vector3.setFromMatrixPosition(object.matrixWorld);_vector3.applyProjection(_projScreenMatrix);}pushRenderItem(object,null,object.material,_vector3.z,null);}else if(object instanceof THREE.Mesh||object instanceof THREE.Line||object instanceof THREE.Points){if(object instanceof THREE.SkinnedMesh){object.skeleton.update();}if(object.frustumCulled===false||_frustum.intersectsObject(object)===true){var material=object.material;if(material.visible===true){if(_this.sortObjects===true){_vector3.setFromMatrixPosition(object.matrixWorld);_vector3.applyProjection(_projScreenMatrix);}var geometry=objects.update(object);if(material instanceof THREE.MeshFaceMaterial){var groups=geometry.groups;var materials=material.materials;for(var i=0,l=groups.length;i<l;i++){var group=groups[i];var groupMaterial=materials[group.materialIndex];if(groupMaterial.visible===true){pushRenderItem(object,geometry,groupMaterial,_vector3.z,group);}}}else {pushRenderItem(object,geometry,material,_vector3.z,null);}}}}}var children=object.children;for(var i=0,l=children.length;i<l;i++){projectObject(children[i],camera);}}function renderObjects(renderList,camera,lights,fog,overrideMaterial){for(var i=0,l=renderList.length;i<l;i++){var renderItem=renderList[i];var object=renderItem.object;var geometry=renderItem.geometry;var material=overrideMaterial===undefined?renderItem.material:overrideMaterial;var group=renderItem.group;object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse,object.matrixWorld);object.normalMatrix.getNormalMatrix(object.modelViewMatrix);if(object instanceof THREE.ImmediateRenderObject){setMaterial(material);var program=setProgram(camera,lights,fog,material,object);_currentGeometryProgram='';object.render(function(object){_this.renderBufferImmediate(object,program,material);});}else {_this.renderBufferDirect(camera,lights,fog,geometry,material,object,group);}}}function initMaterial(material,lights,fog,object){var materialProperties=properties.get(material);var parameters=programCache.getParameters(material,lights,fog,object);var code=programCache.getProgramCode(material,parameters);var program=materialProperties.program;var programChange=true;if(program===undefined){ // new material
material.addEventListener('dispose',onMaterialDispose);}else if(program.code!==code){ // changed glsl or parameters
releaseMaterialProgramReference(material);}else if(parameters.shaderID!==undefined){ // same glsl and uniform list
return;}else { // only rebuild uniform list
programChange=false;}if(programChange){if(parameters.shaderID){var shader=THREE.ShaderLib[parameters.shaderID];materialProperties.__webglShader={name:material.type,uniforms:THREE.UniformsUtils.clone(shader.uniforms),vertexShader:shader.vertexShader,fragmentShader:shader.fragmentShader};}else {materialProperties.__webglShader={name:material.type,uniforms:material.uniforms,vertexShader:material.vertexShader,fragmentShader:material.fragmentShader};}material.__webglShader=materialProperties.__webglShader;program=programCache.acquireProgram(material,parameters,code);materialProperties.program=program;material.program=program;}var attributes=program.getAttributes();if(material.morphTargets){material.numSupportedMorphTargets=0;for(var i=0;i<_this.maxMorphTargets;i++){if(attributes['morphTarget'+i]>=0){material.numSupportedMorphTargets++;}}}if(material.morphNormals){material.numSupportedMorphNormals=0;for(i=0;i<_this.maxMorphNormals;i++){if(attributes['morphNormal'+i]>=0){material.numSupportedMorphNormals++;}}}materialProperties.uniformsList=[];var uniformLocations=materialProperties.program.getUniforms();for(var u in materialProperties.__webglShader.uniforms){var location=uniformLocations[u];if(location){materialProperties.uniformsList.push([materialProperties.__webglShader.uniforms[u],location]);}}}function setMaterial(material){setMaterialFaces(material);if(material.transparent===true){state.setBlending(material.blending,material.blendEquation,material.blendSrc,material.blendDst,material.blendEquationAlpha,material.blendSrcAlpha,material.blendDstAlpha);}else {state.setBlending(THREE.NoBlending);}state.setDepthFunc(material.depthFunc);state.setDepthTest(material.depthTest);state.setDepthWrite(material.depthWrite);state.setColorWrite(material.colorWrite);state.setPolygonOffset(material.polygonOffset,material.polygonOffsetFactor,material.polygonOffsetUnits);}function setMaterialFaces(material){material.side!==THREE.DoubleSide?state.enable(_gl.CULL_FACE):state.disable(_gl.CULL_FACE);state.setFlipSided(material.side===THREE.BackSide);}function setProgram(camera,lights,fog,material,object){_usedTextureUnits=0;var materialProperties=properties.get(material);if(material.needsUpdate||!materialProperties.program){initMaterial(material,lights,fog,object);material.needsUpdate=false;}var refreshProgram=false;var refreshMaterial=false;var refreshLights=false;var program=materialProperties.program,p_uniforms=program.getUniforms(),m_uniforms=materialProperties.__webglShader.uniforms;if(program.id!==_currentProgram){_gl.useProgram(program.program);_currentProgram=program.id;refreshProgram=true;refreshMaterial=true;refreshLights=true;}if(material.id!==_currentMaterialId){if(_currentMaterialId===-1)refreshLights=true;_currentMaterialId=material.id;refreshMaterial=true;}if(refreshProgram||camera!==_currentCamera){_gl.uniformMatrix4fv(p_uniforms.projectionMatrix,false,camera.projectionMatrix.elements);if(capabilities.logarithmicDepthBuffer){_gl.uniform1f(p_uniforms.logDepthBufFC,2.0/(Math.log(camera.far+1.0)/Math.LN2));}if(camera!==_currentCamera)_currentCamera=camera; // load material specific uniforms
// (shader material also gets them for the sake of genericity)
if(material instanceof THREE.ShaderMaterial||material instanceof THREE.MeshPhongMaterial||material.envMap){if(p_uniforms.cameraPosition!==undefined){_vector3.setFromMatrixPosition(camera.matrixWorld);_gl.uniform3f(p_uniforms.cameraPosition,_vector3.x,_vector3.y,_vector3.z);}}if(material instanceof THREE.MeshPhongMaterial||material instanceof THREE.MeshLambertMaterial||material instanceof THREE.MeshBasicMaterial||material instanceof THREE.ShaderMaterial||material.skinning){if(p_uniforms.viewMatrix!==undefined){_gl.uniformMatrix4fv(p_uniforms.viewMatrix,false,camera.matrixWorldInverse.elements);}}} // skinning uniforms must be set even if material didn't change
// auto-setting of texture unit for bone texture must go before other textures
// not sure why, but otherwise weird things happen
if(material.skinning){if(object.bindMatrix&&p_uniforms.bindMatrix!==undefined){_gl.uniformMatrix4fv(p_uniforms.bindMatrix,false,object.bindMatrix.elements);}if(object.bindMatrixInverse&&p_uniforms.bindMatrixInverse!==undefined){_gl.uniformMatrix4fv(p_uniforms.bindMatrixInverse,false,object.bindMatrixInverse.elements);}if(capabilities.floatVertexTextures&&object.skeleton&&object.skeleton.useVertexTexture){if(p_uniforms.boneTexture!==undefined){var textureUnit=getTextureUnit();_gl.uniform1i(p_uniforms.boneTexture,textureUnit);_this.setTexture(object.skeleton.boneTexture,textureUnit);}if(p_uniforms.boneTextureWidth!==undefined){_gl.uniform1i(p_uniforms.boneTextureWidth,object.skeleton.boneTextureWidth);}if(p_uniforms.boneTextureHeight!==undefined){_gl.uniform1i(p_uniforms.boneTextureHeight,object.skeleton.boneTextureHeight);}}else if(object.skeleton&&object.skeleton.boneMatrices){if(p_uniforms.boneGlobalMatrices!==undefined){_gl.uniformMatrix4fv(p_uniforms.boneGlobalMatrices,false,object.skeleton.boneMatrices);}}}if(refreshMaterial){ // refresh uniforms common to several materials
if(fog&&material.fog){refreshUniformsFog(m_uniforms,fog);}if(material instanceof THREE.MeshPhongMaterial||material instanceof THREE.MeshLambertMaterial||material.lights){if(_lightsNeedUpdate){refreshLights=true;setupLights(lights,camera);_lightsNeedUpdate=false;}if(refreshLights){refreshUniformsLights(m_uniforms,_lights);markUniformsLightsNeedsUpdate(m_uniforms,true);}else {markUniformsLightsNeedsUpdate(m_uniforms,false);}}if(material instanceof THREE.MeshBasicMaterial||material instanceof THREE.MeshLambertMaterial||material instanceof THREE.MeshPhongMaterial){refreshUniformsCommon(m_uniforms,material);} // refresh single material specific uniforms
if(material instanceof THREE.LineBasicMaterial){refreshUniformsLine(m_uniforms,material);}else if(material instanceof THREE.LineDashedMaterial){refreshUniformsLine(m_uniforms,material);refreshUniformsDash(m_uniforms,material);}else if(material instanceof THREE.PointsMaterial){refreshUniformsParticle(m_uniforms,material);}else if(material instanceof THREE.MeshPhongMaterial){refreshUniformsPhong(m_uniforms,material);}else if(material instanceof THREE.MeshDepthMaterial){m_uniforms.mNear.value=camera.near;m_uniforms.mFar.value=camera.far;m_uniforms.opacity.value=material.opacity;}else if(material instanceof THREE.MeshNormalMaterial){m_uniforms.opacity.value=material.opacity;}if(object.receiveShadow&&!material._shadowPass){refreshUniformsShadow(m_uniforms,lights,camera);} // load common uniforms
loadUniformsGeneric(materialProperties.uniformsList);}loadUniformsMatrices(p_uniforms,object);if(p_uniforms.modelMatrix!==undefined){_gl.uniformMatrix4fv(p_uniforms.modelMatrix,false,object.matrixWorld.elements);}return program;} // Uniforms (refresh uniforms objects)
function refreshUniformsCommon(uniforms,material){uniforms.opacity.value=material.opacity;uniforms.diffuse.value=material.color;if(material.emissive){uniforms.emissive.value=material.emissive;}uniforms.map.value=material.map;uniforms.specularMap.value=material.specularMap;uniforms.alphaMap.value=material.alphaMap;if(material.aoMap){uniforms.aoMap.value=material.aoMap;uniforms.aoMapIntensity.value=material.aoMapIntensity;} // uv repeat and offset setting priorities
// 1. color map
// 2. specular map
// 3. normal map
// 4. bump map
// 5. alpha map
// 6. emissive map
var uvScaleMap;if(material.map){uvScaleMap=material.map;}else if(material.specularMap){uvScaleMap=material.specularMap;}else if(material.displacementMap){uvScaleMap=material.displacementMap;}else if(material.normalMap){uvScaleMap=material.normalMap;}else if(material.bumpMap){uvScaleMap=material.bumpMap;}else if(material.alphaMap){uvScaleMap=material.alphaMap;}else if(material.emissiveMap){uvScaleMap=material.emissiveMap;}if(uvScaleMap!==undefined){if(uvScaleMap instanceof THREE.WebGLRenderTarget)uvScaleMap=uvScaleMap.texture;var offset=uvScaleMap.offset;var repeat=uvScaleMap.repeat;uniforms.offsetRepeat.value.set(offset.x,offset.y,repeat.x,repeat.y);}uniforms.envMap.value=material.envMap;uniforms.flipEnvMap.value=material.envMap instanceof THREE.WebGLRenderTargetCube?1:-1;uniforms.reflectivity.value=material.reflectivity;uniforms.refractionRatio.value=material.refractionRatio;}function refreshUniformsLine(uniforms,material){uniforms.diffuse.value=material.color;uniforms.opacity.value=material.opacity;}function refreshUniformsDash(uniforms,material){uniforms.dashSize.value=material.dashSize;uniforms.totalSize.value=material.dashSize+material.gapSize;uniforms.scale.value=material.scale;}function refreshUniformsParticle(uniforms,material){uniforms.psColor.value=material.color;uniforms.opacity.value=material.opacity;uniforms.size.value=material.size;uniforms.scale.value=_canvas.height/2.0; // TODO: Cache this.
uniforms.map.value=material.map;if(material.map!==null){var offset=material.map.offset;var repeat=material.map.repeat;uniforms.offsetRepeat.value.set(offset.x,offset.y,repeat.x,repeat.y);}}function refreshUniformsFog(uniforms,fog){uniforms.fogColor.value=fog.color;if(fog instanceof THREE.Fog){uniforms.fogNear.value=fog.near;uniforms.fogFar.value=fog.far;}else if(fog instanceof THREE.FogExp2){uniforms.fogDensity.value=fog.density;}}function refreshUniformsPhong(uniforms,material){uniforms.specular.value=material.specular;uniforms.shininess.value=Math.max(material.shininess,1e-4); // to prevent pow( 0.0, 0.0 )
if(material.lightMap){uniforms.lightMap.value=material.lightMap;uniforms.lightMapIntensity.value=material.lightMapIntensity;}if(material.emissiveMap){uniforms.emissiveMap.value=material.emissiveMap;}if(material.bumpMap){uniforms.bumpMap.value=material.bumpMap;uniforms.bumpScale.value=material.bumpScale;}if(material.normalMap){uniforms.normalMap.value=material.normalMap;uniforms.normalScale.value.copy(material.normalScale);}if(material.displacementMap){uniforms.displacementMap.value=material.displacementMap;uniforms.displacementScale.value=material.displacementScale;uniforms.displacementBias.value=material.displacementBias;}}function refreshUniformsLights(uniforms,lights){uniforms.ambientLightColor.value=lights.ambient;uniforms.directionalLightColor.value=lights.directional.colors;uniforms.directionalLightDirection.value=lights.directional.positions;uniforms.pointLightColor.value=lights.point.colors;uniforms.pointLightPosition.value=lights.point.positions;uniforms.pointLightDistance.value=lights.point.distances;uniforms.pointLightDecay.value=lights.point.decays;uniforms.spotLightColor.value=lights.spot.colors;uniforms.spotLightPosition.value=lights.spot.positions;uniforms.spotLightDistance.value=lights.spot.distances;uniforms.spotLightDirection.value=lights.spot.directions;uniforms.spotLightAngleCos.value=lights.spot.anglesCos;uniforms.spotLightExponent.value=lights.spot.exponents;uniforms.spotLightDecay.value=lights.spot.decays;uniforms.hemisphereLightSkyColor.value=lights.hemi.skyColors;uniforms.hemisphereLightGroundColor.value=lights.hemi.groundColors;uniforms.hemisphereLightDirection.value=lights.hemi.positions;} // If uniforms are marked as clean, they don't need to be loaded to the GPU.
function markUniformsLightsNeedsUpdate(uniforms,value){uniforms.ambientLightColor.needsUpdate=value;uniforms.directionalLightColor.needsUpdate=value;uniforms.directionalLightDirection.needsUpdate=value;uniforms.pointLightColor.needsUpdate=value;uniforms.pointLightPosition.needsUpdate=value;uniforms.pointLightDistance.needsUpdate=value;uniforms.pointLightDecay.needsUpdate=value;uniforms.spotLightColor.needsUpdate=value;uniforms.spotLightPosition.needsUpdate=value;uniforms.spotLightDistance.needsUpdate=value;uniforms.spotLightDirection.needsUpdate=value;uniforms.spotLightAngleCos.needsUpdate=value;uniforms.spotLightExponent.needsUpdate=value;uniforms.spotLightDecay.needsUpdate=value;uniforms.hemisphereLightSkyColor.needsUpdate=value;uniforms.hemisphereLightGroundColor.needsUpdate=value;uniforms.hemisphereLightDirection.needsUpdate=value;}function refreshUniformsShadow(uniforms,lights,camera){if(uniforms.shadowMatrix){var j=0;for(var i=0,il=lights.length;i<il;i++){var light=lights[i];if(light.castShadow===true){if(light instanceof THREE.PointLight||light instanceof THREE.SpotLight||light instanceof THREE.DirectionalLight){var shadow=light.shadow;if(light instanceof THREE.PointLight){ // for point lights we set the shadow matrix to be a translation-only matrix
// equal to inverse of the light's position
_vector3.setFromMatrixPosition(light.matrixWorld).negate();shadow.matrix.identity().setPosition(_vector3); // for point lights we set the sign of the shadowDarkness uniform to be negative
uniforms.shadowDarkness.value[j]=-shadow.darkness;}else {uniforms.shadowDarkness.value[j]=shadow.darkness;}uniforms.shadowMatrix.value[j]=shadow.matrix;uniforms.shadowMap.value[j]=shadow.map;uniforms.shadowMapSize.value[j]=shadow.mapSize;uniforms.shadowBias.value[j]=shadow.bias;j++;}}}}} // Uniforms (load to GPU)
function loadUniformsMatrices(uniforms,object){_gl.uniformMatrix4fv(uniforms.modelViewMatrix,false,object.modelViewMatrix.elements);if(uniforms.normalMatrix){_gl.uniformMatrix3fv(uniforms.normalMatrix,false,object.normalMatrix.elements);}}function getTextureUnit(){var textureUnit=_usedTextureUnits;if(textureUnit>=capabilities.maxTextures){console.warn('WebGLRenderer: trying to use '+textureUnit+' texture units while this GPU supports only '+capabilities.maxTextures);}_usedTextureUnits+=1;return textureUnit;}function loadUniformsGeneric(uniforms){var texture,textureUnit;for(var j=0,jl=uniforms.length;j<jl;j++){var uniform=uniforms[j][0]; // needsUpdate property is not added to all uniforms.
if(uniform.needsUpdate===false)continue;var type=uniform.type;var value=uniform.value;var location=uniforms[j][1];switch(type){case '1i':_gl.uniform1i(location,value);break;case '1f':_gl.uniform1f(location,value);break;case '2f':_gl.uniform2f(location,value[0],value[1]);break;case '3f':_gl.uniform3f(location,value[0],value[1],value[2]);break;case '4f':_gl.uniform4f(location,value[0],value[1],value[2],value[3]);break;case '1iv':_gl.uniform1iv(location,value);break;case '3iv':_gl.uniform3iv(location,value);break;case '1fv':_gl.uniform1fv(location,value);break;case '2fv':_gl.uniform2fv(location,value);break;case '3fv':_gl.uniform3fv(location,value);break;case '4fv':_gl.uniform4fv(location,value);break;case 'Matrix3fv':_gl.uniformMatrix3fv(location,false,value);break;case 'Matrix4fv':_gl.uniformMatrix4fv(location,false,value);break; //
case 'i': // single integer
_gl.uniform1i(location,value);break;case 'f': // single float
_gl.uniform1f(location,value);break;case 'v2': // single THREE.Vector2
_gl.uniform2f(location,value.x,value.y);break;case 'v3': // single THREE.Vector3
_gl.uniform3f(location,value.x,value.y,value.z);break;case 'v4': // single THREE.Vector4
_gl.uniform4f(location,value.x,value.y,value.z,value.w);break;case 'c': // single THREE.Color
_gl.uniform3f(location,value.r,value.g,value.b);break;case 'iv1': // flat array of integers (JS or typed array)
_gl.uniform1iv(location,value);break;case 'iv': // flat array of integers with 3 x N size (JS or typed array)
_gl.uniform3iv(location,value);break;case 'fv1': // flat array of floats (JS or typed array)
_gl.uniform1fv(location,value);break;case 'fv': // flat array of floats with 3 x N size (JS or typed array)
_gl.uniform3fv(location,value);break;case 'v2v': // array of THREE.Vector2
if(uniform._array===undefined){uniform._array=new Float32Array(2*value.length);}for(var i=0,i2=0,il=value.length;i<il;i++,i2+=2){uniform._array[i2+0]=value[i].x;uniform._array[i2+1]=value[i].y;}_gl.uniform2fv(location,uniform._array);break;case 'v3v': // array of THREE.Vector3
if(uniform._array===undefined){uniform._array=new Float32Array(3*value.length);}for(var i=0,i3=0,il=value.length;i<il;i++,i3+=3){uniform._array[i3+0]=value[i].x;uniform._array[i3+1]=value[i].y;uniform._array[i3+2]=value[i].z;}_gl.uniform3fv(location,uniform._array);break;case 'v4v': // array of THREE.Vector4
if(uniform._array===undefined){uniform._array=new Float32Array(4*value.length);}for(var i=0,i4=0,il=value.length;i<il;i++,i4+=4){uniform._array[i4+0]=value[i].x;uniform._array[i4+1]=value[i].y;uniform._array[i4+2]=value[i].z;uniform._array[i4+3]=value[i].w;}_gl.uniform4fv(location,uniform._array);break;case 'm3': // single THREE.Matrix3
_gl.uniformMatrix3fv(location,false,value.elements);break;case 'm3v': // array of THREE.Matrix3
if(uniform._array===undefined){uniform._array=new Float32Array(9*value.length);}for(var i=0,il=value.length;i<il;i++){value[i].flattenToArrayOffset(uniform._array,i*9);}_gl.uniformMatrix3fv(location,false,uniform._array);break;case 'm4': // single THREE.Matrix4
_gl.uniformMatrix4fv(location,false,value.elements);break;case 'm4v': // array of THREE.Matrix4
if(uniform._array===undefined){uniform._array=new Float32Array(16*value.length);}for(var i=0,il=value.length;i<il;i++){value[i].flattenToArrayOffset(uniform._array,i*16);}_gl.uniformMatrix4fv(location,false,uniform._array);break;case 't': // single THREE.Texture (2d or cube)
texture=value;textureUnit=getTextureUnit();_gl.uniform1i(location,textureUnit);if(!texture)continue;if(texture instanceof THREE.CubeTexture||Array.isArray(texture.image)&&texture.image.length===6){ // CompressedTexture can have Array in image :/
setCubeTexture(texture,textureUnit);}else if(texture instanceof THREE.WebGLRenderTargetCube){setCubeTextureDynamic(texture.texture,textureUnit);}else if(texture instanceof THREE.WebGLRenderTarget){_this.setTexture(texture.texture,textureUnit);}else {_this.setTexture(texture,textureUnit);}break;case 'tv': // array of THREE.Texture (2d or cube)
if(uniform._array===undefined){uniform._array=[];}for(var i=0,il=uniform.value.length;i<il;i++){uniform._array[i]=getTextureUnit();}_gl.uniform1iv(location,uniform._array);for(var i=0,il=uniform.value.length;i<il;i++){texture=uniform.value[i];textureUnit=uniform._array[i];if(!texture)continue;if(texture instanceof THREE.CubeTexture||texture.image instanceof Array&&texture.image.length===6){ // CompressedTexture can have Array in image :/
setCubeTexture(texture,textureUnit);}else if(texture instanceof THREE.WebGLRenderTarget){_this.setTexture(texture.texture,textureUnit);}else if(texture instanceof THREE.WebGLRenderTargetCube){setCubeTextureDynamic(texture.texture,textureUnit);}else {_this.setTexture(texture,textureUnit);}}break;default:console.warn('THREE.WebGLRenderer: Unknown uniform type: '+type);}}}function setColorLinear(array,offset,color,intensity){array[offset+0]=color.r*intensity;array[offset+1]=color.g*intensity;array[offset+2]=color.b*intensity;}function setupLights(lights,camera){var l,ll,light,r=0,g=0,b=0,color,skyColor,groundColor,intensity,distance,zlights=_lights,viewMatrix=camera.matrixWorldInverse,dirColors=zlights.directional.colors,dirPositions=zlights.directional.positions,pointColors=zlights.point.colors,pointPositions=zlights.point.positions,pointDistances=zlights.point.distances,pointDecays=zlights.point.decays,spotColors=zlights.spot.colors,spotPositions=zlights.spot.positions,spotDistances=zlights.spot.distances,spotDirections=zlights.spot.directions,spotAnglesCos=zlights.spot.anglesCos,spotExponents=zlights.spot.exponents,spotDecays=zlights.spot.decays,hemiSkyColors=zlights.hemi.skyColors,hemiGroundColors=zlights.hemi.groundColors,hemiPositions=zlights.hemi.positions,dirLength=0,pointLength=0,spotLength=0,hemiLength=0,dirCount=0,pointCount=0,spotCount=0,hemiCount=0,dirOffset=0,pointOffset=0,spotOffset=0,hemiOffset=0;for(l=0,ll=lights.length;l<ll;l++){light=lights[l];color=light.color;intensity=light.intensity;distance=light.distance;if(light instanceof THREE.AmbientLight){if(!light.visible)continue;r+=color.r;g+=color.g;b+=color.b;}else if(light instanceof THREE.DirectionalLight){dirCount+=1;if(!light.visible)continue;_direction.setFromMatrixPosition(light.matrixWorld);_vector3.setFromMatrixPosition(light.target.matrixWorld);_direction.sub(_vector3);_direction.transformDirection(viewMatrix);dirOffset=dirLength*3;dirPositions[dirOffset+0]=_direction.x;dirPositions[dirOffset+1]=_direction.y;dirPositions[dirOffset+2]=_direction.z;setColorLinear(dirColors,dirOffset,color,intensity);dirLength+=1;}else if(light instanceof THREE.PointLight){pointCount+=1;if(!light.visible)continue;pointOffset=pointLength*3;setColorLinear(pointColors,pointOffset,color,intensity);_vector3.setFromMatrixPosition(light.matrixWorld);_vector3.applyMatrix4(viewMatrix);pointPositions[pointOffset+0]=_vector3.x;pointPositions[pointOffset+1]=_vector3.y;pointPositions[pointOffset+2]=_vector3.z; // distance is 0 if decay is 0, because there is no attenuation at all.
pointDistances[pointLength]=distance;pointDecays[pointLength]=light.distance===0?0.0:light.decay;pointLength+=1;}else if(light instanceof THREE.SpotLight){spotCount+=1;if(!light.visible)continue;spotOffset=spotLength*3;setColorLinear(spotColors,spotOffset,color,intensity);_direction.setFromMatrixPosition(light.matrixWorld);_vector3.copy(_direction).applyMatrix4(viewMatrix);spotPositions[spotOffset+0]=_vector3.x;spotPositions[spotOffset+1]=_vector3.y;spotPositions[spotOffset+2]=_vector3.z;spotDistances[spotLength]=distance;_vector3.setFromMatrixPosition(light.target.matrixWorld);_direction.sub(_vector3);_direction.transformDirection(viewMatrix);spotDirections[spotOffset+0]=_direction.x;spotDirections[spotOffset+1]=_direction.y;spotDirections[spotOffset+2]=_direction.z;spotAnglesCos[spotLength]=Math.cos(light.angle);spotExponents[spotLength]=light.exponent;spotDecays[spotLength]=light.distance===0?0.0:light.decay;spotLength+=1;}else if(light instanceof THREE.HemisphereLight){hemiCount+=1;if(!light.visible)continue;_direction.setFromMatrixPosition(light.matrixWorld);_direction.transformDirection(viewMatrix);hemiOffset=hemiLength*3;hemiPositions[hemiOffset+0]=_direction.x;hemiPositions[hemiOffset+1]=_direction.y;hemiPositions[hemiOffset+2]=_direction.z;skyColor=light.color;groundColor=light.groundColor;setColorLinear(hemiSkyColors,hemiOffset,skyColor,intensity);setColorLinear(hemiGroundColors,hemiOffset,groundColor,intensity);hemiLength+=1;}} // null eventual remains from removed lights
// (this is to avoid if in shader)
for(l=dirLength*3,ll=Math.max(dirColors.length,dirCount*3);l<ll;l++){dirColors[l]=0.0;}for(l=pointLength*3,ll=Math.max(pointColors.length,pointCount*3);l<ll;l++){pointColors[l]=0.0;}for(l=spotLength*3,ll=Math.max(spotColors.length,spotCount*3);l<ll;l++){spotColors[l]=0.0;}for(l=hemiLength*3,ll=Math.max(hemiSkyColors.length,hemiCount*3);l<ll;l++){hemiSkyColors[l]=0.0;}for(l=hemiLength*3,ll=Math.max(hemiGroundColors.length,hemiCount*3);l<ll;l++){hemiGroundColors[l]=0.0;}zlights.directional.length=dirLength;zlights.point.length=pointLength;zlights.spot.length=spotLength;zlights.hemi.length=hemiLength;zlights.ambient[0]=r;zlights.ambient[1]=g;zlights.ambient[2]=b;} // GL state setting
this.setFaceCulling=function(cullFace,frontFaceDirection){if(cullFace===THREE.CullFaceNone){state.disable(_gl.CULL_FACE);}else {if(frontFaceDirection===THREE.FrontFaceDirectionCW){_gl.frontFace(_gl.CW);}else {_gl.frontFace(_gl.CCW);}if(cullFace===THREE.CullFaceBack){_gl.cullFace(_gl.BACK);}else if(cullFace===THREE.CullFaceFront){_gl.cullFace(_gl.FRONT);}else {_gl.cullFace(_gl.FRONT_AND_BACK);}state.enable(_gl.CULL_FACE);}}; // Textures
function setTextureParameters(textureType,texture,isImagePowerOfTwo){var extension;if(isImagePowerOfTwo){_gl.texParameteri(textureType,_gl.TEXTURE_WRAP_S,paramThreeToGL(texture.wrapS));_gl.texParameteri(textureType,_gl.TEXTURE_WRAP_T,paramThreeToGL(texture.wrapT));_gl.texParameteri(textureType,_gl.TEXTURE_MAG_FILTER,paramThreeToGL(texture.magFilter));_gl.texParameteri(textureType,_gl.TEXTURE_MIN_FILTER,paramThreeToGL(texture.minFilter));}else {_gl.texParameteri(textureType,_gl.TEXTURE_WRAP_S,_gl.CLAMP_TO_EDGE);_gl.texParameteri(textureType,_gl.TEXTURE_WRAP_T,_gl.CLAMP_TO_EDGE);if(texture.wrapS!==THREE.ClampToEdgeWrapping||texture.wrapT!==THREE.ClampToEdgeWrapping){console.warn('THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping.',texture);}_gl.texParameteri(textureType,_gl.TEXTURE_MAG_FILTER,filterFallback(texture.magFilter));_gl.texParameteri(textureType,_gl.TEXTURE_MIN_FILTER,filterFallback(texture.minFilter));if(texture.minFilter!==THREE.NearestFilter&&texture.minFilter!==THREE.LinearFilter){console.warn('THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.',texture);}}extension=extensions.get('EXT_texture_filter_anisotropic');if(extension){if(texture.type===THREE.FloatType&&extensions.get('OES_texture_float_linear')===null)return;if(texture.type===THREE.HalfFloatType&&extensions.get('OES_texture_half_float_linear')===null)return;if(texture.anisotropy>1||properties.get(texture).__currentAnisotropy){_gl.texParameterf(textureType,extension.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(texture.anisotropy,_this.getMaxAnisotropy()));properties.get(texture).__currentAnisotropy=texture.anisotropy;}}}function uploadTexture(textureProperties,texture,slot){if(textureProperties.__webglInit===undefined){textureProperties.__webglInit=true;texture.addEventListener('dispose',onTextureDispose);textureProperties.__webglTexture=_gl.createTexture();_infoMemory.textures++;}state.activeTexture(_gl.TEXTURE0+slot);state.bindTexture(_gl.TEXTURE_2D,textureProperties.__webglTexture);_gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL,texture.flipY);_gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,texture.premultiplyAlpha);_gl.pixelStorei(_gl.UNPACK_ALIGNMENT,texture.unpackAlignment);texture.image=clampToMaxSize(texture.image,capabilities.maxTextureSize);if(textureNeedsPowerOfTwo(texture)&&isPowerOfTwo(texture.image)===false){texture.image=makePowerOfTwo(texture.image);}var image=texture.image,isImagePowerOfTwo=isPowerOfTwo(image),glFormat=paramThreeToGL(texture.format),glType=paramThreeToGL(texture.type);setTextureParameters(_gl.TEXTURE_2D,texture,isImagePowerOfTwo);var mipmap,mipmaps=texture.mipmaps;if(texture instanceof THREE.DataTexture){ // use manually created mipmaps if available
// if there are no manual mipmaps
// set 0 level mipmap and then use GL to generate other mipmap levels
if(mipmaps.length>0&&isImagePowerOfTwo){for(var i=0,il=mipmaps.length;i<il;i++){mipmap=mipmaps[i];state.texImage2D(_gl.TEXTURE_2D,i,glFormat,mipmap.width,mipmap.height,0,glFormat,glType,mipmap.data);}texture.generateMipmaps=false;}else {state.texImage2D(_gl.TEXTURE_2D,0,glFormat,image.width,image.height,0,glFormat,glType,image.data);}}else if(texture instanceof THREE.CompressedTexture){for(var i=0,il=mipmaps.length;i<il;i++){mipmap=mipmaps[i];if(texture.format!==THREE.RGBAFormat&&texture.format!==THREE.RGBFormat){if(state.getCompressedTextureFormats().indexOf(glFormat)>-1){state.compressedTexImage2D(_gl.TEXTURE_2D,i,glFormat,mipmap.width,mipmap.height,0,mipmap.data);}else {console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");}}else {state.texImage2D(_gl.TEXTURE_2D,i,glFormat,mipmap.width,mipmap.height,0,glFormat,glType,mipmap.data);}}}else { // regular Texture (image, video, canvas)
// use manually created mipmaps if available
// if there are no manual mipmaps
// set 0 level mipmap and then use GL to generate other mipmap levels
if(mipmaps.length>0&&isImagePowerOfTwo){for(var i=0,il=mipmaps.length;i<il;i++){mipmap=mipmaps[i];state.texImage2D(_gl.TEXTURE_2D,i,glFormat,glFormat,glType,mipmap);}texture.generateMipmaps=false;}else {state.texImage2D(_gl.TEXTURE_2D,0,glFormat,glFormat,glType,texture.image);}}if(texture.generateMipmaps&&isImagePowerOfTwo)_gl.generateMipmap(_gl.TEXTURE_2D);textureProperties.__version=texture.version;if(texture.onUpdate)texture.onUpdate(texture);}this.setTexture=function(texture,slot){var textureProperties=properties.get(texture);if(texture.version>0&&textureProperties.__version!==texture.version){var image=texture.image;if(image===undefined){console.warn('THREE.WebGLRenderer: Texture marked for update but image is undefined',texture);return;}if(image.complete===false){console.warn('THREE.WebGLRenderer: Texture marked for update but image is incomplete',texture);return;}uploadTexture(textureProperties,texture,slot);return;}state.activeTexture(_gl.TEXTURE0+slot);state.bindTexture(_gl.TEXTURE_2D,textureProperties.__webglTexture);};function clampToMaxSize(image,maxSize){if(image.width>maxSize||image.height>maxSize){ // Warning: Scaling through the canvas will only work with images that use
// premultiplied alpha.
var scale=maxSize/Math.max(image.width,image.height);var canvas=document.createElement('canvas');canvas.width=Math.floor(image.width*scale);canvas.height=Math.floor(image.height*scale);var context=canvas.getContext('2d');context.drawImage(image,0,0,image.width,image.height,0,0,canvas.width,canvas.height);console.warn('THREE.WebGLRenderer: image is too big ('+image.width+'x'+image.height+'). Resized to '+canvas.width+'x'+canvas.height,image);return canvas;}return image;}function isPowerOfTwo(image){return THREE.Math.isPowerOfTwo(image.width)&&THREE.Math.isPowerOfTwo(image.height);}function textureNeedsPowerOfTwo(texture){if(texture.wrapS!==THREE.ClampToEdgeWrapping||texture.wrapT!==THREE.ClampToEdgeWrapping)return true;if(texture.minFilter!==THREE.NearestFilter&&texture.minFilter!==THREE.LinearFilter)return true;return false;}function makePowerOfTwo(image){if(image instanceof HTMLImageElement||image instanceof HTMLCanvasElement){var canvas=document.createElement('canvas');canvas.width=THREE.Math.nearestPowerOfTwo(image.width);canvas.height=THREE.Math.nearestPowerOfTwo(image.height);var context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);console.warn('THREE.WebGLRenderer: image is not power of two ('+image.width+'x'+image.height+'). Resized to '+canvas.width+'x'+canvas.height,image);return canvas;}return image;}function setCubeTexture(texture,slot){var textureProperties=properties.get(texture);if(texture.image.length===6){if(texture.version>0&&textureProperties.__version!==texture.version){if(!textureProperties.__image__webglTextureCube){texture.addEventListener('dispose',onTextureDispose);textureProperties.__image__webglTextureCube=_gl.createTexture();_infoMemory.textures++;}state.activeTexture(_gl.TEXTURE0+slot);state.bindTexture(_gl.TEXTURE_CUBE_MAP,textureProperties.__image__webglTextureCube);_gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL,texture.flipY);var isCompressed=texture instanceof THREE.CompressedTexture;var isDataTexture=texture.image[0] instanceof THREE.DataTexture;var cubeImage=[];for(var i=0;i<6;i++){if(_this.autoScaleCubemaps&&!isCompressed&&!isDataTexture){cubeImage[i]=clampToMaxSize(texture.image[i],capabilities.maxCubemapSize);}else {cubeImage[i]=isDataTexture?texture.image[i].image:texture.image[i];}}var image=cubeImage[0],isImagePowerOfTwo=isPowerOfTwo(image),glFormat=paramThreeToGL(texture.format),glType=paramThreeToGL(texture.type);setTextureParameters(_gl.TEXTURE_CUBE_MAP,texture,isImagePowerOfTwo);for(var i=0;i<6;i++){if(!isCompressed){if(isDataTexture){state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,glFormat,cubeImage[i].width,cubeImage[i].height,0,glFormat,glType,cubeImage[i].data);}else {state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,glFormat,glFormat,glType,cubeImage[i]);}}else {var mipmap,mipmaps=cubeImage[i].mipmaps;for(var j=0,jl=mipmaps.length;j<jl;j++){mipmap=mipmaps[j];if(texture.format!==THREE.RGBAFormat&&texture.format!==THREE.RGBFormat){if(state.getCompressedTextureFormats().indexOf(glFormat)>-1){state.compressedTexImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,j,glFormat,mipmap.width,mipmap.height,0,mipmap.data);}else {console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setCubeTexture()");}}else {state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,j,glFormat,mipmap.width,mipmap.height,0,glFormat,glType,mipmap.data);}}}}if(texture.generateMipmaps&&isImagePowerOfTwo){_gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);}textureProperties.__version=texture.version;if(texture.onUpdate)texture.onUpdate(texture);}else {state.activeTexture(_gl.TEXTURE0+slot);state.bindTexture(_gl.TEXTURE_CUBE_MAP,textureProperties.__image__webglTextureCube);}}}function setCubeTextureDynamic(texture,slot){state.activeTexture(_gl.TEXTURE0+slot);state.bindTexture(_gl.TEXTURE_CUBE_MAP,properties.get(texture).__webglTexture);} // Render targets
function setupFrameBuffer(framebuffer,renderTarget,textureTarget){_gl.bindFramebuffer(_gl.FRAMEBUFFER,framebuffer);_gl.framebufferTexture2D(_gl.FRAMEBUFFER,_gl.COLOR_ATTACHMENT0,textureTarget,properties.get(renderTarget.texture).__webglTexture,0);}function setupRenderBuffer(renderbuffer,renderTarget){_gl.bindRenderbuffer(_gl.RENDERBUFFER,renderbuffer);if(renderTarget.depthBuffer&&!renderTarget.stencilBuffer){_gl.renderbufferStorage(_gl.RENDERBUFFER,_gl.DEPTH_COMPONENT16,renderTarget.width,renderTarget.height);_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER,_gl.DEPTH_ATTACHMENT,_gl.RENDERBUFFER,renderbuffer); /* For some reason this is not working. Defaulting to RGBA4.
		} else if ( ! renderTarget.depthBuffer && renderTarget.stencilBuffer ) {

			_gl.renderbufferStorage( _gl.RENDERBUFFER, _gl.STENCIL_INDEX8, renderTarget.width, renderTarget.height );
			_gl.framebufferRenderbuffer( _gl.FRAMEBUFFER, _gl.STENCIL_ATTACHMENT, _gl.RENDERBUFFER, renderbuffer );
		*/}else if(renderTarget.depthBuffer&&renderTarget.stencilBuffer){_gl.renderbufferStorage(_gl.RENDERBUFFER,_gl.DEPTH_STENCIL,renderTarget.width,renderTarget.height);_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER,_gl.DEPTH_STENCIL_ATTACHMENT,_gl.RENDERBUFFER,renderbuffer);}else {_gl.renderbufferStorage(_gl.RENDERBUFFER,_gl.RGBA4,renderTarget.width,renderTarget.height);}}this.setRenderTarget=function(renderTarget){var isCube=renderTarget instanceof THREE.WebGLRenderTargetCube;if(renderTarget&&properties.get(renderTarget).__webglFramebuffer===undefined){var renderTargetProperties=properties.get(renderTarget);var textureProperties=properties.get(renderTarget.texture);if(renderTarget.depthBuffer===undefined)renderTarget.depthBuffer=true;if(renderTarget.stencilBuffer===undefined)renderTarget.stencilBuffer=true;renderTarget.addEventListener('dispose',onRenderTargetDispose);textureProperties.__webglTexture=_gl.createTexture();_infoMemory.textures++; // Setup texture, create render and frame buffers
var isTargetPowerOfTwo=isPowerOfTwo(renderTarget),glFormat=paramThreeToGL(renderTarget.texture.format),glType=paramThreeToGL(renderTarget.texture.type);if(isCube){renderTargetProperties.__webglFramebuffer=[];renderTargetProperties.__webglRenderbuffer=[];state.bindTexture(_gl.TEXTURE_CUBE_MAP,textureProperties.__webglTexture);setTextureParameters(_gl.TEXTURE_CUBE_MAP,renderTarget.texture,isTargetPowerOfTwo);for(var i=0;i<6;i++){renderTargetProperties.__webglFramebuffer[i]=_gl.createFramebuffer();renderTargetProperties.__webglRenderbuffer[i]=_gl.createRenderbuffer();state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,glFormat,renderTarget.width,renderTarget.height,0,glFormat,glType,null);setupFrameBuffer(renderTargetProperties.__webglFramebuffer[i],renderTarget,_gl.TEXTURE_CUBE_MAP_POSITIVE_X+i);setupRenderBuffer(renderTargetProperties.__webglRenderbuffer[i],renderTarget);}if(renderTarget.texture.generateMipmaps&&isTargetPowerOfTwo)_gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);}else {renderTargetProperties.__webglFramebuffer=_gl.createFramebuffer();if(renderTarget.shareDepthFrom){renderTargetProperties.__webglRenderbuffer=renderTarget.shareDepthFrom.__webglRenderbuffer;}else {renderTargetProperties.__webglRenderbuffer=_gl.createRenderbuffer();}state.bindTexture(_gl.TEXTURE_2D,textureProperties.__webglTexture);setTextureParameters(_gl.TEXTURE_2D,renderTarget.texture,isTargetPowerOfTwo);state.texImage2D(_gl.TEXTURE_2D,0,glFormat,renderTarget.width,renderTarget.height,0,glFormat,glType,null);setupFrameBuffer(renderTargetProperties.__webglFramebuffer,renderTarget,_gl.TEXTURE_2D);if(renderTarget.shareDepthFrom){if(renderTarget.depthBuffer&&!renderTarget.stencilBuffer){_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER,_gl.DEPTH_ATTACHMENT,_gl.RENDERBUFFER,renderTargetProperties.__webglRenderbuffer);}else if(renderTarget.depthBuffer&&renderTarget.stencilBuffer){_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER,_gl.DEPTH_STENCIL_ATTACHMENT,_gl.RENDERBUFFER,renderTargetProperties.__webglRenderbuffer);}}else {setupRenderBuffer(renderTargetProperties.__webglRenderbuffer,renderTarget);}if(renderTarget.texture.generateMipmaps&&isTargetPowerOfTwo)_gl.generateMipmap(_gl.TEXTURE_2D);} // Release everything
if(isCube){state.bindTexture(_gl.TEXTURE_CUBE_MAP,null);}else {state.bindTexture(_gl.TEXTURE_2D,null);}_gl.bindRenderbuffer(_gl.RENDERBUFFER,null);_gl.bindFramebuffer(_gl.FRAMEBUFFER,null);}var framebuffer,width,height,vx,vy;if(renderTarget){var renderTargetProperties=properties.get(renderTarget);if(isCube){framebuffer=renderTargetProperties.__webglFramebuffer[renderTarget.activeCubeFace];}else {framebuffer=renderTargetProperties.__webglFramebuffer;}width=renderTarget.width;height=renderTarget.height;vx=0;vy=0;}else {framebuffer=null;width=_viewportWidth;height=_viewportHeight;vx=_viewportX;vy=_viewportY;}if(framebuffer!==_currentFramebuffer){_gl.bindFramebuffer(_gl.FRAMEBUFFER,framebuffer);_gl.viewport(vx,vy,width,height);_currentFramebuffer=framebuffer;}if(isCube){var textureProperties=properties.get(renderTarget.texture);_gl.framebufferTexture2D(_gl.FRAMEBUFFER,_gl.COLOR_ATTACHMENT0,_gl.TEXTURE_CUBE_MAP_POSITIVE_X+renderTarget.activeCubeFace,textureProperties.__webglTexture,0);}_currentWidth=width;_currentHeight=height;};this.readRenderTargetPixels=function(renderTarget,x,y,width,height,buffer){if(renderTarget instanceof THREE.WebGLRenderTarget===false){console.error('THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.');return;}var framebuffer=properties.get(renderTarget).__webglFramebuffer;if(framebuffer){var restore=false;if(framebuffer!==_currentFramebuffer){_gl.bindFramebuffer(_gl.FRAMEBUFFER,framebuffer);restore=true;}try{var texture=renderTarget.texture;if(texture.format!==THREE.RGBAFormat&&paramThreeToGL(texture.format)!==_gl.getParameter(_gl.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error('THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.');return;}if(texture.type!==THREE.UnsignedByteType&&paramThreeToGL(texture.type)!==_gl.getParameter(_gl.IMPLEMENTATION_COLOR_READ_TYPE)&&!(texture.type===THREE.FloatType&&extensions.get('WEBGL_color_buffer_float'))&&!(texture.type===THREE.HalfFloatType&&extensions.get('EXT_color_buffer_half_float'))){console.error('THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.');return;}if(_gl.checkFramebufferStatus(_gl.FRAMEBUFFER)===_gl.FRAMEBUFFER_COMPLETE){_gl.readPixels(x,y,width,height,paramThreeToGL(texture.format),paramThreeToGL(texture.type),buffer);}else {console.error('THREE.WebGLRenderer.readRenderTargetPixels: readPixels from renderTarget failed. Framebuffer not complete.');}}finally {if(restore){_gl.bindFramebuffer(_gl.FRAMEBUFFER,_currentFramebuffer);}}}};function updateRenderTargetMipmap(renderTarget){var target=renderTarget instanceof THREE.WebGLRenderTargetCube?_gl.TEXTURE_CUBE_MAP:_gl.TEXTURE_2D;var texture=properties.get(renderTarget.texture).__webglTexture;state.bindTexture(target,texture);_gl.generateMipmap(target);state.bindTexture(target,null);} // Fallback filters for non-power-of-2 textures
function filterFallback(f){if(f===THREE.NearestFilter||f===THREE.NearestMipMapNearestFilter||f===THREE.NearestMipMapLinearFilter){return _gl.NEAREST;}return _gl.LINEAR;} // Map three.js constants to WebGL constants
function paramThreeToGL(p){var extension;if(p===THREE.RepeatWrapping)return _gl.REPEAT;if(p===THREE.ClampToEdgeWrapping)return _gl.CLAMP_TO_EDGE;if(p===THREE.MirroredRepeatWrapping)return _gl.MIRRORED_REPEAT;if(p===THREE.NearestFilter)return _gl.NEAREST;if(p===THREE.NearestMipMapNearestFilter)return _gl.NEAREST_MIPMAP_NEAREST;if(p===THREE.NearestMipMapLinearFilter)return _gl.NEAREST_MIPMAP_LINEAR;if(p===THREE.LinearFilter)return _gl.LINEAR;if(p===THREE.LinearMipMapNearestFilter)return _gl.LINEAR_MIPMAP_NEAREST;if(p===THREE.LinearMipMapLinearFilter)return _gl.LINEAR_MIPMAP_LINEAR;if(p===THREE.UnsignedByteType)return _gl.UNSIGNED_BYTE;if(p===THREE.UnsignedShort4444Type)return _gl.UNSIGNED_SHORT_4_4_4_4;if(p===THREE.UnsignedShort5551Type)return _gl.UNSIGNED_SHORT_5_5_5_1;if(p===THREE.UnsignedShort565Type)return _gl.UNSIGNED_SHORT_5_6_5;if(p===THREE.ByteType)return _gl.BYTE;if(p===THREE.ShortType)return _gl.SHORT;if(p===THREE.UnsignedShortType)return _gl.UNSIGNED_SHORT;if(p===THREE.IntType)return _gl.INT;if(p===THREE.UnsignedIntType)return _gl.UNSIGNED_INT;if(p===THREE.FloatType)return _gl.FLOAT;extension=extensions.get('OES_texture_half_float');if(extension!==null){if(p===THREE.HalfFloatType)return extension.HALF_FLOAT_OES;}if(p===THREE.AlphaFormat)return _gl.ALPHA;if(p===THREE.RGBFormat)return _gl.RGB;if(p===THREE.RGBAFormat)return _gl.RGBA;if(p===THREE.LuminanceFormat)return _gl.LUMINANCE;if(p===THREE.LuminanceAlphaFormat)return _gl.LUMINANCE_ALPHA;if(p===THREE.AddEquation)return _gl.FUNC_ADD;if(p===THREE.SubtractEquation)return _gl.FUNC_SUBTRACT;if(p===THREE.ReverseSubtractEquation)return _gl.FUNC_REVERSE_SUBTRACT;if(p===THREE.ZeroFactor)return _gl.ZERO;if(p===THREE.OneFactor)return _gl.ONE;if(p===THREE.SrcColorFactor)return _gl.SRC_COLOR;if(p===THREE.OneMinusSrcColorFactor)return _gl.ONE_MINUS_SRC_COLOR;if(p===THREE.SrcAlphaFactor)return _gl.SRC_ALPHA;if(p===THREE.OneMinusSrcAlphaFactor)return _gl.ONE_MINUS_SRC_ALPHA;if(p===THREE.DstAlphaFactor)return _gl.DST_ALPHA;if(p===THREE.OneMinusDstAlphaFactor)return _gl.ONE_MINUS_DST_ALPHA;if(p===THREE.DstColorFactor)return _gl.DST_COLOR;if(p===THREE.OneMinusDstColorFactor)return _gl.ONE_MINUS_DST_COLOR;if(p===THREE.SrcAlphaSaturateFactor)return _gl.SRC_ALPHA_SATURATE;extension=extensions.get('WEBGL_compressed_texture_s3tc');if(extension!==null){if(p===THREE.RGB_S3TC_DXT1_Format)return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;if(p===THREE.RGBA_S3TC_DXT1_Format)return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(p===THREE.RGBA_S3TC_DXT3_Format)return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(p===THREE.RGBA_S3TC_DXT5_Format)return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;}extension=extensions.get('WEBGL_compressed_texture_pvrtc');if(extension!==null){if(p===THREE.RGB_PVRTC_4BPPV1_Format)return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(p===THREE.RGB_PVRTC_2BPPV1_Format)return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(p===THREE.RGBA_PVRTC_4BPPV1_Format)return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(p===THREE.RGBA_PVRTC_2BPPV1_Format)return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;}extension=extensions.get('EXT_blend_minmax');if(extension!==null){if(p===THREE.MinEquation)return extension.MIN_EXT;if(p===THREE.MaxEquation)return extension.MAX_EXT;}return 0;} // DEPRECATED
this.supportsFloatTextures=function(){console.warn('THREE.WebGLRenderer: .supportsFloatTextures() is now .extensions.get( \'OES_texture_float\' ).');return extensions.get('OES_texture_float');};this.supportsHalfFloatTextures=function(){console.warn('THREE.WebGLRenderer: .supportsHalfFloatTextures() is now .extensions.get( \'OES_texture_half_float\' ).');return extensions.get('OES_texture_half_float');};this.supportsStandardDerivatives=function(){console.warn('THREE.WebGLRenderer: .supportsStandardDerivatives() is now .extensions.get( \'OES_standard_derivatives\' ).');return extensions.get('OES_standard_derivatives');};this.supportsCompressedTextureS3TC=function(){console.warn('THREE.WebGLRenderer: .supportsCompressedTextureS3TC() is now .extensions.get( \'WEBGL_compressed_texture_s3tc\' ).');return extensions.get('WEBGL_compressed_texture_s3tc');};this.supportsCompressedTexturePVRTC=function(){console.warn('THREE.WebGLRenderer: .supportsCompressedTexturePVRTC() is now .extensions.get( \'WEBGL_compressed_texture_pvrtc\' ).');return extensions.get('WEBGL_compressed_texture_pvrtc');};this.supportsBlendMinMax=function(){console.warn('THREE.WebGLRenderer: .supportsBlendMinMax() is now .extensions.get( \'EXT_blend_minmax\' ).');return extensions.get('EXT_blend_minmax');};this.supportsVertexTextures=function(){return capabilities.vertexTextures;};this.supportsInstancedArrays=function(){console.warn('THREE.WebGLRenderer: .supportsInstancedArrays() is now .extensions.get( \'ANGLE_instanced_arrays\' ).');return extensions.get('ANGLE_instanced_arrays');}; //
this.initMaterial=function(){console.warn('THREE.WebGLRenderer: .initMaterial() has been removed.');};this.addPrePlugin=function(){console.warn('THREE.WebGLRenderer: .addPrePlugin() has been removed.');};this.addPostPlugin=function(){console.warn('THREE.WebGLRenderer: .addPostPlugin() has been removed.');};this.updateShadowMap=function(){console.warn('THREE.WebGLRenderer: .updateShadowMap() has been removed.');};Object.defineProperties(this,{shadowMapEnabled:{get:function get(){return shadowMap.enabled;},set:function set(value){console.warn('THREE.WebGLRenderer: .shadowMapEnabled is now .shadowMap.enabled.');shadowMap.enabled=value;}},shadowMapType:{get:function get(){return shadowMap.type;},set:function set(value){console.warn('THREE.WebGLRenderer: .shadowMapType is now .shadowMap.type.');shadowMap.type=value;}},shadowMapCullFace:{get:function get(){return shadowMap.cullFace;},set:function set(value){console.warn('THREE.WebGLRenderer: .shadowMapCullFace is now .shadowMap.cullFace.');shadowMap.cullFace=value;}},shadowMapDebug:{get:function get(){return shadowMap.debug;},set:function set(value){console.warn('THREE.WebGLRenderer: .shadowMapDebug is now .shadowMap.debug.');shadowMap.debug=value;}}});}; // File:src/renderers/WebGLRenderTarget.js
/**
 * @author szimek / https://github.com/szimek/
 * @author alteredq / http://alteredqualia.com/
 */THREE.WebGLRenderTarget=function(width,height,options){this.uuid=THREE.Math.generateUUID();this.width=width;this.height=height;options=options||{};if(options.minFilter===undefined)options.minFilter=THREE.LinearFilter;this.texture=new THREE.Texture(undefined,undefined,options.wrapS,options.wrapT,options.magFilter,options.minFilter,options.format,options.type,options.anisotropy);this.depthBuffer=options.depthBuffer!==undefined?options.depthBuffer:true;this.stencilBuffer=options.stencilBuffer!==undefined?options.stencilBuffer:true;this.shareDepthFrom=options.shareDepthFrom!==undefined?options.shareDepthFrom:null;};THREE.WebGLRenderTarget.prototype={constructor:THREE.WebGLRenderTarget,get wrapS(){console.warn('THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS.');return this.texture.wrapS;},set wrapS(value){console.warn('THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS.');this.texture.wrapS=value;},get wrapT(){console.warn('THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT.');return this.texture.wrapT;},set wrapT(value){console.warn('THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT.');this.texture.wrapT=value;},get magFilter(){console.warn('THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter.');return this.texture.magFilter;},set magFilter(value){console.warn('THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter.');this.texture.magFilter=value;},get minFilter(){console.warn('THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter.');return this.texture.minFilter;},set minFilter(value){console.warn('THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter.');this.texture.minFilter=value;},get anisotropy(){console.warn('THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy.');return this.texture.anisotropy;},set anisotropy(value){console.warn('THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy.');this.texture.anisotropy=value;},get offset(){console.warn('THREE.WebGLRenderTarget: .offset is now .texture.offset.');return this.texture.offset;},set offset(value){console.warn('THREE.WebGLRenderTarget: .offset is now .texture.offset.');this.texture.offset=value;},get repeat(){console.warn('THREE.WebGLRenderTarget: .repeat is now .texture.repeat.');return this.texture.repeat;},set repeat(value){console.warn('THREE.WebGLRenderTarget: .repeat is now .texture.repeat.');this.texture.repeat=value;},get format(){console.warn('THREE.WebGLRenderTarget: .format is now .texture.format.');return this.texture.format;},set format(value){console.warn('THREE.WebGLRenderTarget: .format is now .texture.format.');this.texture.format=value;},get type(){console.warn('THREE.WebGLRenderTarget: .type is now .texture.type.');return this.texture.type;},set type(value){console.warn('THREE.WebGLRenderTarget: .type is now .texture.type.');this.texture.type=value;},get generateMipmaps(){console.warn('THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps.');return this.texture.generateMipmaps;},set generateMipmaps(value){console.warn('THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps.');this.texture.generateMipmaps=value;}, //
setSize:function setSize(width,height){if(this.width!==width||this.height!==height){this.width=width;this.height=height;this.dispose();}},clone:function clone(){return new this.constructor().copy(this);},copy:function copy(source){this.width=source.width;this.height=source.height;this.texture=source.texture.clone();this.depthBuffer=source.depthBuffer;this.stencilBuffer=source.stencilBuffer;this.shareDepthFrom=source.shareDepthFrom;return this;},dispose:function dispose(){this.dispatchEvent({type:'dispose'});}};THREE.EventDispatcher.prototype.apply(THREE.WebGLRenderTarget.prototype); // File:src/renderers/WebGLRenderTargetCube.js
/**
 * @author alteredq / http://alteredqualia.com
 */THREE.WebGLRenderTargetCube=function(width,height,options){THREE.WebGLRenderTarget.call(this,width,height,options);this.activeCubeFace=0; // PX 0, NX 1, PY 2, NY 3, PZ 4, NZ 5
};THREE.WebGLRenderTargetCube.prototype=Object.create(THREE.WebGLRenderTarget.prototype);THREE.WebGLRenderTargetCube.prototype.constructor=THREE.WebGLRenderTargetCube; // File:src/renderers/webgl/WebGLBufferRenderer.js
/**
* @author mrdoob / http://mrdoob.com/
*/THREE.WebGLBufferRenderer=function(_gl,extensions,_infoRender){var mode;function setMode(value){mode=value;}function render(start,count){_gl.drawArrays(mode,start,count);_infoRender.calls++;_infoRender.vertices+=count;if(mode===_gl.TRIANGLES)_infoRender.faces+=count/3;}function renderInstances(geometry){var extension=extensions.get('ANGLE_instanced_arrays');if(extension===null){console.error('THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.');return;}var position=geometry.attributes.position;if(position instanceof THREE.InterleavedBufferAttribute){extension.drawArraysInstancedANGLE(mode,0,position.data.count,geometry.maxInstancedCount);}else {extension.drawArraysInstancedANGLE(mode,0,position.count,geometry.maxInstancedCount);}}this.setMode=setMode;this.render=render;this.renderInstances=renderInstances;}; // File:src/renderers/webgl/WebGLIndexedBufferRenderer.js
/**
* @author mrdoob / http://mrdoob.com/
*/THREE.WebGLIndexedBufferRenderer=function(_gl,extensions,_infoRender){var mode;function setMode(value){mode=value;}var type,size;function setIndex(index){if(index.array instanceof Uint32Array&&extensions.get('OES_element_index_uint')){type=_gl.UNSIGNED_INT;size=4;}else {type=_gl.UNSIGNED_SHORT;size=2;}}function render(start,count){_gl.drawElements(mode,count,type,start*size);_infoRender.calls++;_infoRender.vertices+=count;if(mode===_gl.TRIANGLES)_infoRender.faces+=count/3;}function renderInstances(geometry){var extension=extensions.get('ANGLE_instanced_arrays');if(extension===null){console.error('THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.');return;}var index=geometry.index;extension.drawElementsInstancedANGLE(mode,index.array.length,type,0,geometry.maxInstancedCount);}this.setMode=setMode;this.setIndex=setIndex;this.render=render;this.renderInstances=renderInstances;}; // File:src/renderers/webgl/WebGLExtensions.js
/**
* @author mrdoob / http://mrdoob.com/
*/THREE.WebGLExtensions=function(gl){var extensions={};this.get=function(name){if(extensions[name]!==undefined){return extensions[name];}var extension;switch(name){case 'EXT_texture_filter_anisotropic':extension=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('MOZ_EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');break;case 'WEBGL_compressed_texture_s3tc':extension=gl.getExtension('WEBGL_compressed_texture_s3tc')||gl.getExtension('MOZ_WEBGL_compressed_texture_s3tc')||gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc');break;case 'WEBGL_compressed_texture_pvrtc':extension=gl.getExtension('WEBGL_compressed_texture_pvrtc')||gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc');break;default:extension=gl.getExtension(name);}if(extension===null){console.warn('THREE.WebGLRenderer: '+name+' extension not supported.');}extensions[name]=extension;return extension;};}; // File:src/renderers/webgl/WebGLCapabilities.js
THREE.WebGLCapabilities=function(gl,extensions,parameters){function getMaxPrecision(precision){if(precision==='highp'){if(gl.getShaderPrecisionFormat(gl.VERTEX_SHADER,gl.HIGH_FLOAT).precision>0&&gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision>0){return 'highp';}precision='mediump';}if(precision==='mediump'){if(gl.getShaderPrecisionFormat(gl.VERTEX_SHADER,gl.MEDIUM_FLOAT).precision>0&&gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.MEDIUM_FLOAT).precision>0){return 'mediump';}}return 'lowp';}this.getMaxPrecision=getMaxPrecision;this.precision=parameters.precision!==undefined?parameters.precision:'highp',this.logarithmicDepthBuffer=parameters.logarithmicDepthBuffer!==undefined?parameters.logarithmicDepthBuffer:false;this.maxTextures=gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);this.maxVertexTextures=gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);this.maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);this.maxCubemapSize=gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);this.maxAttributes=gl.getParameter(gl.MAX_VERTEX_ATTRIBS);this.maxVertexUniforms=gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);this.maxVaryings=gl.getParameter(gl.MAX_VARYING_VECTORS);this.maxFragmentUniforms=gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);this.vertexTextures=this.maxVertexTextures>0;this.floatFragmentTextures=!!extensions.get('OES_texture_float');this.floatVertexTextures=this.vertexTextures&&this.floatFragmentTextures;var _maxPrecision=getMaxPrecision(this.precision);if(_maxPrecision!==this.precision){console.warn('THREE.WebGLRenderer:',this.precision,'not supported, using',_maxPrecision,'instead.');this.precision=_maxPrecision;}if(this.logarithmicDepthBuffer){this.logarithmicDepthBuffer=!!extensions.get('EXT_frag_depth');}}; // File:src/renderers/webgl/WebGLGeometries.js
/**
* @author mrdoob / http://mrdoob.com/
*/THREE.WebGLGeometries=function(gl,properties,info){var geometries={};function get(object){var geometry=object.geometry;if(geometries[geometry.id]!==undefined){return geometries[geometry.id];}geometry.addEventListener('dispose',onGeometryDispose);var buffergeometry;if(geometry instanceof THREE.BufferGeometry){buffergeometry=geometry;}else if(geometry instanceof THREE.Geometry){if(geometry._bufferGeometry===undefined){geometry._bufferGeometry=new THREE.BufferGeometry().setFromObject(object);}buffergeometry=geometry._bufferGeometry;}geometries[geometry.id]=buffergeometry;info.memory.geometries++;return buffergeometry;}function onGeometryDispose(event){var geometry=event.target;var buffergeometry=geometries[geometry.id];deleteAttributes(buffergeometry.attributes);geometry.removeEventListener('dispose',onGeometryDispose);delete geometries[geometry.id];var property=properties.get(geometry);if(property.wireframe)deleteAttribute(property.wireframe);info.memory.geometries--;}function getAttributeBuffer(attribute){if(attribute instanceof THREE.InterleavedBufferAttribute){return properties.get(attribute.data).__webglBuffer;}return properties.get(attribute).__webglBuffer;}function deleteAttribute(attribute){var buffer=getAttributeBuffer(attribute);if(buffer!==undefined){gl.deleteBuffer(buffer);removeAttributeBuffer(attribute);}}function deleteAttributes(attributes){for(var name in attributes){deleteAttribute(attributes[name]);}}function removeAttributeBuffer(attribute){if(attribute instanceof THREE.InterleavedBufferAttribute){properties.delete(attribute.data);}else {properties.delete(attribute);}}this.get=get;}; // File:src/renderers/webgl/WebGLObjects.js
/**
* @author mrdoob / http://mrdoob.com/
*/THREE.WebGLObjects=function(gl,properties,info){var geometries=new THREE.WebGLGeometries(gl,properties,info); //
function update(object){ // TODO: Avoid updating twice (when using shadowMap). Maybe add frame counter.
var geometry=geometries.get(object);if(object.geometry instanceof THREE.Geometry){geometry.updateFromObject(object);}var index=geometry.index;var attributes=geometry.attributes;if(index!==null){updateAttribute(index,gl.ELEMENT_ARRAY_BUFFER);}for(var name in attributes){updateAttribute(attributes[name],gl.ARRAY_BUFFER);} // morph targets
var morphAttributes=geometry.morphAttributes;for(var name in morphAttributes){var array=morphAttributes[name];for(var i=0,l=array.length;i<l;i++){updateAttribute(array[i],gl.ARRAY_BUFFER);}}return geometry;}function updateAttribute(attribute,bufferType){var data=attribute instanceof THREE.InterleavedBufferAttribute?attribute.data:attribute;var attributeProperties=properties.get(data);if(attributeProperties.__webglBuffer===undefined){createBuffer(attributeProperties,data,bufferType);}else if(attributeProperties.version!==data.version){updateBuffer(attributeProperties,data,bufferType);}}function createBuffer(attributeProperties,data,bufferType){attributeProperties.__webglBuffer=gl.createBuffer();gl.bindBuffer(bufferType,attributeProperties.__webglBuffer);var usage=data.dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW;gl.bufferData(bufferType,data.array,usage);attributeProperties.version=data.version;}function updateBuffer(attributeProperties,data,bufferType){gl.bindBuffer(bufferType,attributeProperties.__webglBuffer);if(data.dynamic===false||data.updateRange.count===-1){ // Not using update ranges
gl.bufferSubData(bufferType,0,data.array);}else if(data.updateRange.count===0){console.error('THREE.WebGLObjects.updateBuffer: dynamic THREE.BufferAttribute marked as needsUpdate but updateRange.count is 0, ensure you are using set methods or updating manually.');}else {gl.bufferSubData(bufferType,data.updateRange.offset*data.array.BYTES_PER_ELEMENT,data.array.subarray(data.updateRange.offset,data.updateRange.offset+data.updateRange.count));data.updateRange.count=0; // reset range
}attributeProperties.version=data.version;}function getAttributeBuffer(attribute){if(attribute instanceof THREE.InterleavedBufferAttribute){return properties.get(attribute.data).__webglBuffer;}return properties.get(attribute).__webglBuffer;}function getWireframeAttribute(geometry){var property=properties.get(geometry);if(property.wireframe!==undefined){return property.wireframe;}var indices=[];var index=geometry.index;var attributes=geometry.attributes;var position=attributes.position; // console.time( 'wireframe' );
if(index!==null){var edges={};var array=index.array;for(var i=0,l=array.length;i<l;i+=3){var a=array[i+0];var b=array[i+1];var c=array[i+2];if(checkEdge(edges,a,b))indices.push(a,b);if(checkEdge(edges,b,c))indices.push(b,c);if(checkEdge(edges,c,a))indices.push(c,a);}}else {var array=attributes.position.array;for(var i=0,l=array.length/3-1;i<l;i+=3){var a=i+0;var b=i+1;var c=i+2;indices.push(a,b,b,c,c,a);}} // console.timeEnd( 'wireframe' );
var TypeArray=position.count>65535?Uint32Array:Uint16Array;var attribute=new THREE.BufferAttribute(new TypeArray(indices),1);updateAttribute(attribute,gl.ELEMENT_ARRAY_BUFFER);property.wireframe=attribute;return attribute;}function checkEdge(edges,a,b){if(a>b){var tmp=a;a=b;b=tmp;}var list=edges[a];if(list===undefined){edges[a]=[b];return true;}else if(list.indexOf(b)===-1){list.push(b);return true;}return false;}this.getAttributeBuffer=getAttributeBuffer;this.getWireframeAttribute=getWireframeAttribute;this.update=update;}; // File:src/renderers/webgl/WebGLProgram.js
THREE.WebGLProgram=function(){var programIdCount=0;function generateDefines(defines){var chunks=[];for(var name in defines){var value=defines[name];if(value===false)continue;chunks.push('#define '+name+' '+value);}return chunks.join('\n');}function fetchUniformLocations(gl,program,identifiers){var uniforms={};var n=gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);for(var i=0;i<n;i++){var info=gl.getActiveUniform(program,i);var name=info.name;var location=gl.getUniformLocation(program,name); // console.log("THREE.WebGLProgram: ACTIVE UNIFORM:", name);
var suffixPos=name.lastIndexOf('[0]');if(suffixPos!==-1&&suffixPos===name.length-3){uniforms[name.substr(0,suffixPos)]=location;}uniforms[name]=location;}return uniforms;}function fetchAttributeLocations(gl,program,identifiers){var attributes={};var n=gl.getProgramParameter(program,gl.ACTIVE_ATTRIBUTES);for(var i=0;i<n;i++){var info=gl.getActiveAttrib(program,i);var name=info.name; // console.log("THREE.WebGLProgram: ACTIVE VERTEX ATTRIBUTE:", name, i );
attributes[name]=gl.getAttribLocation(program,name);}return attributes;}function filterEmptyLine(string){return string!=='';}return function WebGLProgram(renderer,code,material,parameters){var gl=renderer.context;var defines=material.defines;var vertexShader=material.__webglShader.vertexShader;var fragmentShader=material.__webglShader.fragmentShader;var shadowMapTypeDefine='SHADOWMAP_TYPE_BASIC';if(parameters.shadowMapType===THREE.PCFShadowMap){shadowMapTypeDefine='SHADOWMAP_TYPE_PCF';}else if(parameters.shadowMapType===THREE.PCFSoftShadowMap){shadowMapTypeDefine='SHADOWMAP_TYPE_PCF_SOFT';}var envMapTypeDefine='ENVMAP_TYPE_CUBE';var envMapModeDefine='ENVMAP_MODE_REFLECTION';var envMapBlendingDefine='ENVMAP_BLENDING_MULTIPLY';if(parameters.envMap){switch(material.envMap.mapping){case THREE.CubeReflectionMapping:case THREE.CubeRefractionMapping:envMapTypeDefine='ENVMAP_TYPE_CUBE';break;case THREE.EquirectangularReflectionMapping:case THREE.EquirectangularRefractionMapping:envMapTypeDefine='ENVMAP_TYPE_EQUIREC';break;case THREE.SphericalReflectionMapping:envMapTypeDefine='ENVMAP_TYPE_SPHERE';break;}switch(material.envMap.mapping){case THREE.CubeRefractionMapping:case THREE.EquirectangularRefractionMapping:envMapModeDefine='ENVMAP_MODE_REFRACTION';break;}switch(material.combine){case THREE.MultiplyOperation:envMapBlendingDefine='ENVMAP_BLENDING_MULTIPLY';break;case THREE.MixOperation:envMapBlendingDefine='ENVMAP_BLENDING_MIX';break;case THREE.AddOperation:envMapBlendingDefine='ENVMAP_BLENDING_ADD';break;}}var gammaFactorDefine=renderer.gammaFactor>0?renderer.gammaFactor:1.0; // console.log( 'building new program ' );
//
var customDefines=generateDefines(defines); //
var program=gl.createProgram();var prefixVertex,prefixFragment;if(material instanceof THREE.RawShaderMaterial){prefixVertex='';prefixFragment='';}else {prefixVertex=['precision '+parameters.precision+' float;','precision '+parameters.precision+' int;','#define SHADER_NAME '+material.__webglShader.name,customDefines,parameters.supportsVertexTextures?'#define VERTEX_TEXTURES':'',renderer.gammaInput?'#define GAMMA_INPUT':'',renderer.gammaOutput?'#define GAMMA_OUTPUT':'','#define GAMMA_FACTOR '+gammaFactorDefine,'#define MAX_DIR_LIGHTS '+parameters.maxDirLights,'#define MAX_POINT_LIGHTS '+parameters.maxPointLights,'#define MAX_SPOT_LIGHTS '+parameters.maxSpotLights,'#define MAX_HEMI_LIGHTS '+parameters.maxHemiLights,'#define MAX_SHADOWS '+parameters.maxShadows,'#define MAX_BONES '+parameters.maxBones,parameters.map?'#define USE_MAP':'',parameters.envMap?'#define USE_ENVMAP':'',parameters.envMap?'#define '+envMapModeDefine:'',parameters.lightMap?'#define USE_LIGHTMAP':'',parameters.aoMap?'#define USE_AOMAP':'',parameters.emissiveMap?'#define USE_EMISSIVEMAP':'',parameters.bumpMap?'#define USE_BUMPMAP':'',parameters.normalMap?'#define USE_NORMALMAP':'',parameters.displacementMap&&parameters.supportsVertexTextures?'#define USE_DISPLACEMENTMAP':'',parameters.specularMap?'#define USE_SPECULARMAP':'',parameters.alphaMap?'#define USE_ALPHAMAP':'',parameters.vertexColors?'#define USE_COLOR':'',parameters.flatShading?'#define FLAT_SHADED':'',parameters.skinning?'#define USE_SKINNING':'',parameters.useVertexTexture?'#define BONE_TEXTURE':'',parameters.morphTargets?'#define USE_MORPHTARGETS':'',parameters.morphNormals&&parameters.flatShading===false?'#define USE_MORPHNORMALS':'',parameters.doubleSided?'#define DOUBLE_SIDED':'',parameters.flipSided?'#define FLIP_SIDED':'',parameters.shadowMapEnabled?'#define USE_SHADOWMAP':'',parameters.shadowMapEnabled?'#define '+shadowMapTypeDefine:'',parameters.shadowMapDebug?'#define SHADOWMAP_DEBUG':'',parameters.pointLightShadows>0?'#define POINT_LIGHT_SHADOWS':'',parameters.sizeAttenuation?'#define USE_SIZEATTENUATION':'',parameters.logarithmicDepthBuffer?'#define USE_LOGDEPTHBUF':'',parameters.logarithmicDepthBuffer&&renderer.extensions.get('EXT_frag_depth')?'#define USE_LOGDEPTHBUF_EXT':'','uniform mat4 modelMatrix;','uniform mat4 modelViewMatrix;','uniform mat4 projectionMatrix;','uniform mat4 viewMatrix;','uniform mat3 normalMatrix;','uniform vec3 cameraPosition;','attribute vec3 position;','attribute vec3 normal;','attribute vec2 uv;','#ifdef USE_COLOR','	attribute vec3 color;','#endif','#ifdef USE_MORPHTARGETS','	attribute vec3 morphTarget0;','	attribute vec3 morphTarget1;','	attribute vec3 morphTarget2;','	attribute vec3 morphTarget3;','	#ifdef USE_MORPHNORMALS','		attribute vec3 morphNormal0;','		attribute vec3 morphNormal1;','		attribute vec3 morphNormal2;','		attribute vec3 morphNormal3;','	#else','		attribute vec3 morphTarget4;','		attribute vec3 morphTarget5;','		attribute vec3 morphTarget6;','		attribute vec3 morphTarget7;','	#endif','#endif','#ifdef USE_SKINNING','	attribute vec4 skinIndex;','	attribute vec4 skinWeight;','#endif','\n'].filter(filterEmptyLine).join('\n');prefixFragment=[parameters.bumpMap||parameters.normalMap||parameters.flatShading||material.derivatives?'#extension GL_OES_standard_derivatives : enable':'',parameters.logarithmicDepthBuffer&&renderer.extensions.get('EXT_frag_depth')?'#extension GL_EXT_frag_depth : enable':'','precision '+parameters.precision+' float;','precision '+parameters.precision+' int;','#define SHADER_NAME '+material.__webglShader.name,customDefines,'#define MAX_DIR_LIGHTS '+parameters.maxDirLights,'#define MAX_POINT_LIGHTS '+parameters.maxPointLights,'#define MAX_SPOT_LIGHTS '+parameters.maxSpotLights,'#define MAX_HEMI_LIGHTS '+parameters.maxHemiLights,'#define MAX_SHADOWS '+parameters.maxShadows,parameters.alphaTest?'#define ALPHATEST '+parameters.alphaTest:'',renderer.gammaInput?'#define GAMMA_INPUT':'',renderer.gammaOutput?'#define GAMMA_OUTPUT':'','#define GAMMA_FACTOR '+gammaFactorDefine,parameters.useFog&&parameters.fog?'#define USE_FOG':'',parameters.useFog&&parameters.fogExp?'#define FOG_EXP2':'',parameters.map?'#define USE_MAP':'',parameters.envMap?'#define USE_ENVMAP':'',parameters.envMap?'#define '+envMapTypeDefine:'',parameters.envMap?'#define '+envMapModeDefine:'',parameters.envMap?'#define '+envMapBlendingDefine:'',parameters.lightMap?'#define USE_LIGHTMAP':'',parameters.aoMap?'#define USE_AOMAP':'',parameters.emissiveMap?'#define USE_EMISSIVEMAP':'',parameters.bumpMap?'#define USE_BUMPMAP':'',parameters.normalMap?'#define USE_NORMALMAP':'',parameters.specularMap?'#define USE_SPECULARMAP':'',parameters.alphaMap?'#define USE_ALPHAMAP':'',parameters.vertexColors?'#define USE_COLOR':'',parameters.flatShading?'#define FLAT_SHADED':'',parameters.metal?'#define METAL':'',parameters.doubleSided?'#define DOUBLE_SIDED':'',parameters.flipSided?'#define FLIP_SIDED':'',parameters.shadowMapEnabled?'#define USE_SHADOWMAP':'',parameters.shadowMapEnabled?'#define '+shadowMapTypeDefine:'',parameters.shadowMapDebug?'#define SHADOWMAP_DEBUG':'',parameters.pointLightShadows>0?'#define POINT_LIGHT_SHADOWS':'',parameters.logarithmicDepthBuffer?'#define USE_LOGDEPTHBUF':'',parameters.logarithmicDepthBuffer&&renderer.extensions.get('EXT_frag_depth')?'#define USE_LOGDEPTHBUF_EXT':'','uniform mat4 viewMatrix;','uniform vec3 cameraPosition;','\n'].filter(filterEmptyLine).join('\n');}var vertexGlsl=prefixVertex+vertexShader;var fragmentGlsl=prefixFragment+fragmentShader;var glVertexShader=THREE.WebGLShader(gl,gl.VERTEX_SHADER,vertexGlsl);var glFragmentShader=THREE.WebGLShader(gl,gl.FRAGMENT_SHADER,fragmentGlsl);gl.attachShader(program,glVertexShader);gl.attachShader(program,glFragmentShader); // Force a particular attribute to index 0.
if(material.index0AttributeName!==undefined){gl.bindAttribLocation(program,0,material.index0AttributeName);}else if(parameters.morphTargets===true){ // programs with morphTargets displace position out of attribute 0
gl.bindAttribLocation(program,0,'position');}gl.linkProgram(program);var programLog=gl.getProgramInfoLog(program);var vertexLog=gl.getShaderInfoLog(glVertexShader);var fragmentLog=gl.getShaderInfoLog(glFragmentShader);var runnable=true;var haveDiagnostics=true;if(gl.getProgramParameter(program,gl.LINK_STATUS)===false){runnable=false;console.error('THREE.WebGLProgram: shader error: ',gl.getError(),'gl.VALIDATE_STATUS',gl.getProgramParameter(program,gl.VALIDATE_STATUS),'gl.getProgramInfoLog',programLog,vertexLog,fragmentLog);}else if(programLog!==''){console.warn('THREE.WebGLProgram: gl.getProgramInfoLog()',programLog);}else if(vertexLog===''||fragmentLog===''){haveDiagnostics=false;}if(haveDiagnostics){this.diagnostics={runnable:runnable,material:material,programLog:programLog,vertexShader:{log:vertexLog,prefix:prefixVertex},fragmentShader:{log:fragmentLog,prefix:prefixFragment}};} // clean up
gl.deleteShader(glVertexShader);gl.deleteShader(glFragmentShader); // set up caching for uniform locations
var cachedUniforms;this.getUniforms=function(){if(cachedUniforms===undefined){cachedUniforms=fetchUniformLocations(gl,program);}return cachedUniforms;}; // set up caching for attribute locations
var cachedAttributes;this.getAttributes=function(){if(cachedAttributes===undefined){cachedAttributes=fetchAttributeLocations(gl,program);}return cachedAttributes;}; // free resource
this.destroy=function(){gl.deleteProgram(program);this.program=undefined;}; // DEPRECATED
Object.defineProperties(this,{uniforms:{get:function get(){console.warn('THREE.WebGLProgram: .uniforms is now .getUniforms().');return this.getUniforms();}},attributes:{get:function get(){console.warn('THREE.WebGLProgram: .attributes is now .getAttributes().');return this.getAttributes();}}}); //
this.id=programIdCount++;this.code=code;this.usedTimes=1;this.program=program;this.vertexShader=glVertexShader;this.fragmentShader=glFragmentShader;return this;};}(); // File:src/renderers/webgl/WebGLPrograms.js
THREE.WebGLPrograms=function(renderer,capabilities){var programs=[];var shaderIDs={MeshDepthMaterial:'depth',MeshNormalMaterial:'normal',MeshBasicMaterial:'basic',MeshLambertMaterial:'lambert',MeshPhongMaterial:'phong',LineBasicMaterial:'basic',LineDashedMaterial:'dashed',PointsMaterial:'points'};var parameterNames=["precision","supportsVertexTextures","map","envMap","envMapMode","lightMap","aoMap","emissiveMap","bumpMap","normalMap","displacementMap","specularMap","alphaMap","combine","vertexColors","fog","useFog","fogExp","flatShading","sizeAttenuation","logarithmicDepthBuffer","skinning","maxBones","useVertexTexture","morphTargets","morphNormals","maxMorphTargets","maxMorphNormals","maxDirLights","maxPointLights","maxSpotLights","maxHemiLights","maxShadows","shadowMapEnabled","pointLightShadows","shadowMapType","shadowMapDebug","alphaTest","metal","doubleSided","flipSided"];function allocateBones(object){if(capabilities.floatVertexTextures&&object&&object.skeleton&&object.skeleton.useVertexTexture){return 1024;}else { // default for when object is not specified
// ( for example when prebuilding shader to be used with multiple objects )
//
//  - leave some extra space for other uniforms
//  - limit here is ANGLE's 254 max uniform vectors
//    (up to 54 should be safe)
var nVertexUniforms=capabilities.maxVertexUniforms;var nVertexMatrices=Math.floor((nVertexUniforms-20)/4);var maxBones=nVertexMatrices;if(object!==undefined&&object instanceof THREE.SkinnedMesh){maxBones=Math.min(object.skeleton.bones.length,maxBones);if(maxBones<object.skeleton.bones.length){console.warn('WebGLRenderer: too many bones - '+object.skeleton.bones.length+', this GPU supports just '+maxBones+' (try OpenGL instead of ANGLE)');}}return maxBones;}}function allocateLights(lights){var dirLights=0;var pointLights=0;var spotLights=0;var hemiLights=0;for(var l=0,ll=lights.length;l<ll;l++){var light=lights[l];if(light.visible===false)continue;if(light instanceof THREE.DirectionalLight)dirLights++;if(light instanceof THREE.PointLight)pointLights++;if(light instanceof THREE.SpotLight)spotLights++;if(light instanceof THREE.HemisphereLight)hemiLights++;}return {'directional':dirLights,'point':pointLights,'spot':spotLights,'hemi':hemiLights};}function allocateShadows(lights){var maxShadows=0;var pointLightShadows=0;for(var l=0,ll=lights.length;l<ll;l++){var light=lights[l];if(!light.castShadow)continue;if(light instanceof THREE.SpotLight||light instanceof THREE.DirectionalLight)maxShadows++;if(light instanceof THREE.PointLight){maxShadows++;pointLightShadows++;}}return {'maxShadows':maxShadows,'pointLightShadows':pointLightShadows};}this.getParameters=function(material,lights,fog,object){var shaderID=shaderIDs[material.type]; // heuristics to create shader parameters according to lights in the scene
// (not to blow over maxLights budget)
var maxLightCount=allocateLights(lights);var allocatedShadows=allocateShadows(lights);var maxBones=allocateBones(object);var precision=renderer.getPrecision();if(material.precision!==null){precision=capabilities.getMaxPrecision(material.precision);if(precision!==material.precision){console.warn('THREE.WebGLRenderer.initMaterial:',material.precision,'not supported, using',precision,'instead.');}}var parameters={shaderID:shaderID,precision:precision,supportsVertexTextures:capabilities.vertexTextures,map:!!material.map,envMap:!!material.envMap,envMapMode:material.envMap&&material.envMap.mapping,lightMap:!!material.lightMap,aoMap:!!material.aoMap,emissiveMap:!!material.emissiveMap,bumpMap:!!material.bumpMap,normalMap:!!material.normalMap,displacementMap:!!material.displacementMap,specularMap:!!material.specularMap,alphaMap:!!material.alphaMap,combine:material.combine,vertexColors:material.vertexColors,fog:fog,useFog:material.fog,fogExp:fog instanceof THREE.FogExp2,flatShading:material.shading===THREE.FlatShading,sizeAttenuation:material.sizeAttenuation,logarithmicDepthBuffer:capabilities.logarithmicDepthBuffer,skinning:material.skinning,maxBones:maxBones,useVertexTexture:capabilities.floatVertexTextures&&object&&object.skeleton&&object.skeleton.useVertexTexture,morphTargets:material.morphTargets,morphNormals:material.morphNormals,maxMorphTargets:renderer.maxMorphTargets,maxMorphNormals:renderer.maxMorphNormals,maxDirLights:maxLightCount.directional,maxPointLights:maxLightCount.point,maxSpotLights:maxLightCount.spot,maxHemiLights:maxLightCount.hemi,maxShadows:allocatedShadows.maxShadows,pointLightShadows:allocatedShadows.pointLightShadows,shadowMapEnabled:renderer.shadowMap.enabled&&object.receiveShadow&&allocatedShadows.maxShadows>0,shadowMapType:renderer.shadowMap.type,shadowMapDebug:renderer.shadowMap.debug,alphaTest:material.alphaTest,metal:material.metal,doubleSided:material.side===THREE.DoubleSide,flipSided:material.side===THREE.BackSide};return parameters;};this.getProgramCode=function(material,parameters){var chunks=[];if(parameters.shaderID){chunks.push(parameters.shaderID);}else {chunks.push(material.fragmentShader);chunks.push(material.vertexShader);}if(material.defines!==undefined){for(var name in material.defines){chunks.push(name);chunks.push(material.defines[name]);}}for(var i=0;i<parameterNames.length;i++){var parameterName=parameterNames[i];chunks.push(parameterName);chunks.push(parameters[parameterName]);}return chunks.join();};this.acquireProgram=function(material,parameters,code){var program; // Check if code has been already compiled
for(var p=0,pl=programs.length;p<pl;p++){var programInfo=programs[p];if(programInfo.code===code){program=programInfo;++program.usedTimes;break;}}if(program===undefined){program=new THREE.WebGLProgram(renderer,code,material,parameters);programs.push(program);}return program;};this.releaseProgram=function(program){if(--program.usedTimes===0){ // Remove from unordered set
var i=programs.indexOf(program);programs[i]=programs[programs.length-1];programs.pop(); // Free WebGL resources
program.destroy();}}; // Exposed for resource monitoring & error feedback via renderer.info:
this.programs=programs;}; // File:src/renderers/webgl/WebGLProperties.js
/**
* @author fordacious / fordacious.github.io
*/THREE.WebGLProperties=function(){var properties={};this.get=function(object){var uuid=object.uuid;var map=properties[uuid];if(map===undefined){map={};properties[uuid]=map;}return map;};this.delete=function(object){delete properties[object.uuid];};this.clear=function(){properties={};};}; // File:src/renderers/webgl/WebGLShader.js
THREE.WebGLShader=function(){function addLineNumbers(string){var lines=string.split('\n');for(var i=0;i<lines.length;i++){lines[i]=i+1+': '+lines[i];}return lines.join('\n');}return function WebGLShader(gl,type,string){var shader=gl.createShader(type);gl.shaderSource(shader,string);gl.compileShader(shader);if(gl.getShaderParameter(shader,gl.COMPILE_STATUS)===false){console.error('THREE.WebGLShader: Shader couldn\'t compile.');}if(gl.getShaderInfoLog(shader)!==''){console.warn('THREE.WebGLShader: gl.getShaderInfoLog()',type===gl.VERTEX_SHADER?'vertex':'fragment',gl.getShaderInfoLog(shader),addLineNumbers(string));} // --enable-privileged-webgl-extension
// console.log( type, gl.getExtension( 'WEBGL_debug_shaders' ).getTranslatedShaderSource( shader ) );
return shader;};}(); // File:src/renderers/webgl/WebGLShadowMap.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */THREE.WebGLShadowMap=function(_renderer,_lights,_objects){var _gl=_renderer.context,_state=_renderer.state,_frustum=new THREE.Frustum(),_projScreenMatrix=new THREE.Matrix4(),_min=new THREE.Vector3(),_max=new THREE.Vector3(),_lookTarget=new THREE.Vector3(),_lightPositionWorld=new THREE.Vector3(),_renderList=[],_MorphingFlag=1,_SkinningFlag=2,_NumberOfMaterialVariants=(_MorphingFlag|_SkinningFlag)+1,_depthMaterials=new Array(_NumberOfMaterialVariants),_distanceMaterials=new Array(_NumberOfMaterialVariants);var cubeDirections=[new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)];var cubeUps=[new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)];var cube2DViewPorts=[new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4()];var _vector4=new THREE.Vector4(); // init
var depthShader=THREE.ShaderLib["depthRGBA"];var depthUniforms=THREE.UniformsUtils.clone(depthShader.uniforms);var distanceShader=THREE.ShaderLib["distanceRGBA"];var distanceUniforms=THREE.UniformsUtils.clone(distanceShader.uniforms);for(var i=0;i!==_NumberOfMaterialVariants;++i){var useMorphing=(i&_MorphingFlag)!==0;var useSkinning=(i&_SkinningFlag)!==0;var depthMaterial=new THREE.ShaderMaterial({uniforms:depthUniforms,vertexShader:depthShader.vertexShader,fragmentShader:depthShader.fragmentShader,morphTargets:useMorphing,skinning:useSkinning});depthMaterial._shadowPass=true;_depthMaterials[i]=depthMaterial;var distanceMaterial=new THREE.ShaderMaterial({uniforms:distanceUniforms,vertexShader:distanceShader.vertexShader,fragmentShader:distanceShader.fragmentShader,morphTargets:useMorphing,skinning:useSkinning});distanceMaterial._shadowPass=true;_distanceMaterials[i]=distanceMaterial;} //
var scope=this;this.enabled=false;this.autoUpdate=true;this.needsUpdate=false;this.type=THREE.PCFShadowMap;this.cullFace=THREE.CullFaceFront;this.render=function(scene){var faceCount,isPointLight;if(scope.enabled===false)return;if(scope.autoUpdate===false&&scope.needsUpdate===false)return; // Set GL state for depth map.
_gl.clearColor(1,1,1,1);_state.disable(_gl.BLEND);_state.enable(_gl.CULL_FACE);_gl.frontFace(_gl.CCW);_gl.cullFace(scope.cullFace===THREE.CullFaceFront?_gl.FRONT:_gl.BACK);_state.setDepthTest(true); // save the existing viewport so it can be restored later
_renderer.getViewport(_vector4); // render depth map
for(var i=0,il=_lights.length;i<il;i++){var light=_lights[i];if(light.castShadow===true){var shadow=light.shadow;var shadowCamera=shadow.camera;var shadowMapSize=shadow.mapSize;if(light instanceof THREE.PointLight){faceCount=6;isPointLight=true;var vpWidth=shadowMapSize.x/4.0;var vpHeight=shadowMapSize.y/2.0; // These viewports map a cube-map onto a 2D texture with the
// following orientation:
//
//  xzXZ
//   y Y
//
// X - Positive x direction
// x - Negative x direction
// Y - Positive y direction
// y - Negative y direction
// Z - Positive z direction
// z - Negative z direction
// positive X
cube2DViewPorts[0].set(vpWidth*2,vpHeight,vpWidth,vpHeight); // negative X
cube2DViewPorts[1].set(0,vpHeight,vpWidth,vpHeight); // positive Z
cube2DViewPorts[2].set(vpWidth*3,vpHeight,vpWidth,vpHeight); // negative Z
cube2DViewPorts[3].set(vpWidth,vpHeight,vpWidth,vpHeight); // positive Y
cube2DViewPorts[4].set(vpWidth*3,0,vpWidth,vpHeight); // negative Y
cube2DViewPorts[5].set(vpWidth,0,vpWidth,vpHeight);}else {faceCount=1;isPointLight=false;}if(shadow.map===null){var shadowFilter=THREE.LinearFilter;if(scope.type===THREE.PCFSoftShadowMap){shadowFilter=THREE.NearestFilter;}var pars={minFilter:shadowFilter,magFilter:shadowFilter,format:THREE.RGBAFormat};shadow.map=new THREE.WebGLRenderTarget(shadowMapSize.x,shadowMapSize.y,pars);shadow.matrix=new THREE.Matrix4(); //
if(light instanceof THREE.SpotLight){shadowCamera.aspect=shadowMapSize.x/shadowMapSize.y;}shadowCamera.updateProjectionMatrix();}var shadowMap=shadow.map;var shadowMatrix=shadow.matrix;_lightPositionWorld.setFromMatrixPosition(light.matrixWorld);shadowCamera.position.copy(_lightPositionWorld);_renderer.setRenderTarget(shadowMap);_renderer.clear(); // render shadow map for each cube face (if omni-directional) or
// run a single pass if not
for(var face=0;face<faceCount;face++){if(isPointLight){_lookTarget.copy(shadowCamera.position);_lookTarget.add(cubeDirections[face]);shadowCamera.up.copy(cubeUps[face]);shadowCamera.lookAt(_lookTarget);var vpDimensions=cube2DViewPorts[face];_renderer.setViewport(vpDimensions.x,vpDimensions.y,vpDimensions.z,vpDimensions.w);}else {_lookTarget.setFromMatrixPosition(light.target.matrixWorld);shadowCamera.lookAt(_lookTarget);}shadowCamera.updateMatrixWorld();shadowCamera.matrixWorldInverse.getInverse(shadowCamera.matrixWorld); // compute shadow matrix
shadowMatrix.set(0.5,0.0,0.0,0.5,0.0,0.5,0.0,0.5,0.0,0.0,0.5,0.5,0.0,0.0,0.0,1.0);shadowMatrix.multiply(shadowCamera.projectionMatrix);shadowMatrix.multiply(shadowCamera.matrixWorldInverse); // update camera matrices and frustum
_projScreenMatrix.multiplyMatrices(shadowCamera.projectionMatrix,shadowCamera.matrixWorldInverse);_frustum.setFromMatrix(_projScreenMatrix); // set object matrices & frustum culling
_renderList.length=0;projectObject(scene,shadowCamera); // render shadow map
// render regular objects
for(var j=0,jl=_renderList.length;j<jl;j++){var object=_renderList[j];var geometry=_objects.update(object);var material=object.material;if(material instanceof THREE.MeshFaceMaterial){var groups=geometry.groups;var materials=material.materials;for(var k=0,kl=groups.length;k<kl;k++){var group=groups[k];var groupMaterial=materials[group.materialIndex];if(groupMaterial.visible===true){var depthMaterial=getDepthMaterial(object,groupMaterial,isPointLight,_lightPositionWorld);_renderer.renderBufferDirect(shadowCamera,_lights,null,geometry,depthMaterial,object,group);}}}else {var depthMaterial=getDepthMaterial(object,material,isPointLight,_lightPositionWorld);_renderer.renderBufferDirect(shadowCamera,_lights,null,geometry,depthMaterial,object,null);}}} // We must call _renderer.resetGLState() at the end of each iteration of
// the light loop in order to force material updates for each light.
_renderer.resetGLState();}}_renderer.setViewport(_vector4.x,_vector4.y,_vector4.z,_vector4.w); // Restore GL state.
var clearColor=_renderer.getClearColor(),clearAlpha=_renderer.getClearAlpha();_renderer.setClearColor(clearColor,clearAlpha);_state.enable(_gl.BLEND);if(scope.cullFace===THREE.CullFaceFront){_gl.cullFace(_gl.BACK);}_renderer.resetGLState();scope.needsUpdate=false;};function getDepthMaterial(object,material,isPointLight,lightPositionWorld){var geometry=object.geometry;var newMaterial=null;var materialVariants=_depthMaterials;var customMaterial=object.customDepthMaterial;if(isPointLight){materialVariants=_distanceMaterials;customMaterial=object.customDistanceMaterial;}if(!customMaterial){var useMorphing=geometry.morphTargets!==undefined&&geometry.morphTargets.length>0&&material.morphTargets;var useSkinning=object instanceof THREE.SkinnedMesh&&material.skinning;var variantIndex=0;if(useMorphing)variantIndex|=_MorphingFlag;if(useSkinning)variantIndex|=_SkinningFlag;newMaterial=materialVariants[variantIndex];}else {newMaterial=customMaterial;}newMaterial.visible=material.visible;newMaterial.wireframe=material.wireframe;newMaterial.wireframeLinewidth=material.wireframeLinewidth;if(isPointLight&&newMaterial.uniforms.lightPos!==undefined){newMaterial.uniforms.lightPos.value.copy(lightPositionWorld);}return newMaterial;}function projectObject(object,camera){if(object.visible===false)return;if(object instanceof THREE.Mesh||object instanceof THREE.Line||object instanceof THREE.Points){if(object.castShadow&&(object.frustumCulled===false||_frustum.intersectsObject(object)===true)){var material=object.material;if(material.visible===true){object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse,object.matrixWorld);_renderList.push(object);}}}var children=object.children;for(var i=0,l=children.length;i<l;i++){projectObject(children[i],camera);}}}; // File:src/renderers/webgl/WebGLState.js
/**
* @author mrdoob / http://mrdoob.com/
*/THREE.WebGLState=function(gl,extensions,paramThreeToGL){var _this=this;var newAttributes=new Uint8Array(16);var enabledAttributes=new Uint8Array(16);var attributeDivisors=new Uint8Array(16);var capabilities={};var compressedTextureFormats=null;var currentBlending=null;var currentBlendEquation=null;var currentBlendSrc=null;var currentBlendDst=null;var currentBlendEquationAlpha=null;var currentBlendSrcAlpha=null;var currentBlendDstAlpha=null;var currentDepthFunc=null;var currentDepthWrite=null;var currentColorWrite=null;var currentFlipSided=null;var currentLineWidth=null;var currentPolygonOffsetFactor=null;var currentPolygonOffsetUnits=null;var maxTextures=gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);var currentTextureSlot=undefined;var currentBoundTextures={};this.init=function(){gl.clearColor(0,0,0,1);gl.clearDepth(1);gl.clearStencil(0);this.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.frontFace(gl.CCW);gl.cullFace(gl.BACK);this.enable(gl.CULL_FACE);this.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);};this.initAttributes=function(){for(var i=0,l=newAttributes.length;i<l;i++){newAttributes[i]=0;}};this.enableAttribute=function(attribute){newAttributes[attribute]=1;if(enabledAttributes[attribute]===0){gl.enableVertexAttribArray(attribute);enabledAttributes[attribute]=1;}if(attributeDivisors[attribute]!==0){var extension=extensions.get('ANGLE_instanced_arrays');extension.vertexAttribDivisorANGLE(attribute,0);attributeDivisors[attribute]=0;}};this.enableAttributeAndDivisor=function(attribute,meshPerAttribute,extension){newAttributes[attribute]=1;if(enabledAttributes[attribute]===0){gl.enableVertexAttribArray(attribute);enabledAttributes[attribute]=1;}if(attributeDivisors[attribute]!==meshPerAttribute){extension.vertexAttribDivisorANGLE(attribute,meshPerAttribute);attributeDivisors[attribute]=meshPerAttribute;}};this.disableUnusedAttributes=function(){for(var i=0,l=enabledAttributes.length;i<l;i++){if(enabledAttributes[i]!==newAttributes[i]){gl.disableVertexAttribArray(i);enabledAttributes[i]=0;}}};this.enable=function(id){if(capabilities[id]!==true){gl.enable(id);capabilities[id]=true;}};this.disable=function(id){if(capabilities[id]!==false){gl.disable(id);capabilities[id]=false;}};this.getCompressedTextureFormats=function(){if(compressedTextureFormats===null){compressedTextureFormats=[];if(extensions.get('WEBGL_compressed_texture_pvrtc')||extensions.get('WEBGL_compressed_texture_s3tc')){var formats=gl.getParameter(gl.COMPRESSED_TEXTURE_FORMATS);for(var i=0;i<formats.length;i++){compressedTextureFormats.push(formats[i]);}}}return compressedTextureFormats;};this.setBlending=function(blending,blendEquation,blendSrc,blendDst,blendEquationAlpha,blendSrcAlpha,blendDstAlpha){if(blending!==currentBlending){if(blending===THREE.NoBlending){this.disable(gl.BLEND);}else if(blending===THREE.AdditiveBlending){this.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);}else if(blending===THREE.SubtractiveBlending){ // TODO: Find blendFuncSeparate() combination
this.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ZERO,gl.ONE_MINUS_SRC_COLOR);}else if(blending===THREE.MultiplyBlending){ // TODO: Find blendFuncSeparate() combination
this.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ZERO,gl.SRC_COLOR);}else if(blending===THREE.CustomBlending){this.enable(gl.BLEND);}else {this.enable(gl.BLEND);gl.blendEquationSeparate(gl.FUNC_ADD,gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);}currentBlending=blending;}if(blending===THREE.CustomBlending){blendEquationAlpha=blendEquationAlpha||blendEquation;blendSrcAlpha=blendSrcAlpha||blendSrc;blendDstAlpha=blendDstAlpha||blendDst;if(blendEquation!==currentBlendEquation||blendEquationAlpha!==currentBlendEquationAlpha){gl.blendEquationSeparate(paramThreeToGL(blendEquation),paramThreeToGL(blendEquationAlpha));currentBlendEquation=blendEquation;currentBlendEquationAlpha=blendEquationAlpha;}if(blendSrc!==currentBlendSrc||blendDst!==currentBlendDst||blendSrcAlpha!==currentBlendSrcAlpha||blendDstAlpha!==currentBlendDstAlpha){gl.blendFuncSeparate(paramThreeToGL(blendSrc),paramThreeToGL(blendDst),paramThreeToGL(blendSrcAlpha),paramThreeToGL(blendDstAlpha));currentBlendSrc=blendSrc;currentBlendDst=blendDst;currentBlendSrcAlpha=blendSrcAlpha;currentBlendDstAlpha=blendDstAlpha;}}else {currentBlendEquation=null;currentBlendSrc=null;currentBlendDst=null;currentBlendEquationAlpha=null;currentBlendSrcAlpha=null;currentBlendDstAlpha=null;}};this.setDepthFunc=function(depthFunc){if(currentDepthFunc!==depthFunc){if(depthFunc){switch(depthFunc){case THREE.NeverDepth:gl.depthFunc(gl.NEVER);break;case THREE.AlwaysDepth:gl.depthFunc(gl.ALWAYS);break;case THREE.LessDepth:gl.depthFunc(gl.LESS);break;case THREE.LessEqualDepth:gl.depthFunc(gl.LEQUAL);break;case THREE.EqualDepth:gl.depthFunc(gl.EQUAL);break;case THREE.GreaterEqualDepth:gl.depthFunc(gl.GEQUAL);break;case THREE.GreaterDepth:gl.depthFunc(gl.GREATER);break;case THREE.NotEqualDepth:gl.depthFunc(gl.NOTEQUAL);break;default:gl.depthFunc(gl.LEQUAL);}}else {gl.depthFunc(gl.LEQUAL);}currentDepthFunc=depthFunc;}};this.setDepthTest=function(depthTest){if(depthTest){this.enable(gl.DEPTH_TEST);}else {this.disable(gl.DEPTH_TEST);}};this.setDepthWrite=function(depthWrite){if(currentDepthWrite!==depthWrite){gl.depthMask(depthWrite);currentDepthWrite=depthWrite;}};this.setColorWrite=function(colorWrite){if(currentColorWrite!==colorWrite){gl.colorMask(colorWrite,colorWrite,colorWrite,colorWrite);currentColorWrite=colorWrite;}};this.setFlipSided=function(flipSided){if(currentFlipSided!==flipSided){if(flipSided){gl.frontFace(gl.CW);}else {gl.frontFace(gl.CCW);}currentFlipSided=flipSided;}};this.setLineWidth=function(width){if(width!==currentLineWidth){gl.lineWidth(width);currentLineWidth=width;}};this.setPolygonOffset=function(polygonOffset,factor,units){if(polygonOffset){this.enable(gl.POLYGON_OFFSET_FILL);}else {this.disable(gl.POLYGON_OFFSET_FILL);}if(polygonOffset&&(currentPolygonOffsetFactor!==factor||currentPolygonOffsetUnits!==units)){gl.polygonOffset(factor,units);currentPolygonOffsetFactor=factor;currentPolygonOffsetUnits=units;}};this.setScissorTest=function(scissorTest){if(scissorTest){this.enable(gl.SCISSOR_TEST);}else {this.disable(gl.SCISSOR_TEST);}}; // texture
this.activeTexture=function(webglSlot){if(webglSlot===undefined)webglSlot=gl.TEXTURE0+maxTextures-1;if(currentTextureSlot!==webglSlot){gl.activeTexture(webglSlot);currentTextureSlot=webglSlot;}};this.bindTexture=function(webglType,webglTexture){if(currentTextureSlot===undefined){_this.activeTexture();}var boundTexture=currentBoundTextures[currentTextureSlot];if(boundTexture===undefined){boundTexture={type:undefined,texture:undefined};currentBoundTextures[currentTextureSlot]=boundTexture;}if(boundTexture.type!==webglType||boundTexture.texture!==webglTexture){gl.bindTexture(webglType,webglTexture);boundTexture.type=webglType;boundTexture.texture=webglTexture;}};this.compressedTexImage2D=function(){try{gl.compressedTexImage2D.apply(gl,arguments);}catch(error){console.error(error);}};this.texImage2D=function(){try{gl.texImage2D.apply(gl,arguments);}catch(error){console.error(error);}}; //
this.reset=function(){for(var i=0;i<enabledAttributes.length;i++){if(enabledAttributes[i]===1){gl.disableVertexAttribArray(i);enabledAttributes[i]=0;}}capabilities={};compressedTextureFormats=null;currentBlending=null;currentDepthWrite=null;currentColorWrite=null;currentFlipSided=null;};}; // File:src/renderers/webgl/plugins/LensFlarePlugin.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 */THREE.LensFlarePlugin=function(renderer,flares){var gl=renderer.context;var state=renderer.state;var vertexBuffer,elementBuffer;var program,attributes,uniforms;var hasVertexTexture;var tempTexture,occlusionTexture;function init(){var vertices=new Float32Array([-1,-1,0,0,1,-1,1,0,1,1,1,1,-1,1,0,1]);var faces=new Uint16Array([0,1,2,0,2,3]); // buffers
vertexBuffer=gl.createBuffer();elementBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elementBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,faces,gl.STATIC_DRAW); // textures
tempTexture=gl.createTexture();occlusionTexture=gl.createTexture();state.bindTexture(gl.TEXTURE_2D,tempTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,16,16,0,gl.RGB,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);state.bindTexture(gl.TEXTURE_2D,occlusionTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,16,16,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);hasVertexTexture=gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)>0;var shader;if(hasVertexTexture){shader={vertexShader:["uniform lowp int renderType;","uniform vec3 screenPosition;","uniform vec2 scale;","uniform float rotation;","uniform sampler2D occlusionMap;","attribute vec2 position;","attribute vec2 uv;","varying vec2 vUV;","varying float vVisibility;","void main() {","vUV = uv;","vec2 pos = position;","if ( renderType == 2 ) {","vec4 visibility = texture2D( occlusionMap, vec2( 0.1, 0.1 ) );","visibility += texture2D( occlusionMap, vec2( 0.5, 0.1 ) );","visibility += texture2D( occlusionMap, vec2( 0.9, 0.1 ) );","visibility += texture2D( occlusionMap, vec2( 0.9, 0.5 ) );","visibility += texture2D( occlusionMap, vec2( 0.9, 0.9 ) );","visibility += texture2D( occlusionMap, vec2( 0.5, 0.9 ) );","visibility += texture2D( occlusionMap, vec2( 0.1, 0.9 ) );","visibility += texture2D( occlusionMap, vec2( 0.1, 0.5 ) );","visibility += texture2D( occlusionMap, vec2( 0.5, 0.5 ) );","vVisibility =        visibility.r / 9.0;","vVisibility *= 1.0 - visibility.g / 9.0;","vVisibility *=       visibility.b / 9.0;","vVisibility *= 1.0 - visibility.a / 9.0;","pos.x = cos( rotation ) * position.x - sin( rotation ) * position.y;","pos.y = sin( rotation ) * position.x + cos( rotation ) * position.y;","}","gl_Position = vec4( ( pos * scale + screenPosition.xy ).xy, screenPosition.z, 1.0 );","}"].join("\n"),fragmentShader:["uniform lowp int renderType;","uniform sampler2D map;","uniform float opacity;","uniform vec3 color;","varying vec2 vUV;","varying float vVisibility;","void main() {", // pink square
"if ( renderType == 0 ) {","gl_FragColor = vec4( 1.0, 0.0, 1.0, 0.0 );", // restore
"} else if ( renderType == 1 ) {","gl_FragColor = texture2D( map, vUV );", // flare
"} else {","vec4 texture = texture2D( map, vUV );","texture.a *= opacity * vVisibility;","gl_FragColor = texture;","gl_FragColor.rgb *= color;","}","}"].join("\n")};}else {shader={vertexShader:["uniform lowp int renderType;","uniform vec3 screenPosition;","uniform vec2 scale;","uniform float rotation;","attribute vec2 position;","attribute vec2 uv;","varying vec2 vUV;","void main() {","vUV = uv;","vec2 pos = position;","if ( renderType == 2 ) {","pos.x = cos( rotation ) * position.x - sin( rotation ) * position.y;","pos.y = sin( rotation ) * position.x + cos( rotation ) * position.y;","}","gl_Position = vec4( ( pos * scale + screenPosition.xy ).xy, screenPosition.z, 1.0 );","}"].join("\n"),fragmentShader:["precision mediump float;","uniform lowp int renderType;","uniform sampler2D map;","uniform sampler2D occlusionMap;","uniform float opacity;","uniform vec3 color;","varying vec2 vUV;","void main() {", // pink square
"if ( renderType == 0 ) {","gl_FragColor = vec4( texture2D( map, vUV ).rgb, 0.0 );", // restore
"} else if ( renderType == 1 ) {","gl_FragColor = texture2D( map, vUV );", // flare
"} else {","float visibility = texture2D( occlusionMap, vec2( 0.5, 0.1 ) ).a;","visibility += texture2D( occlusionMap, vec2( 0.9, 0.5 ) ).a;","visibility += texture2D( occlusionMap, vec2( 0.5, 0.9 ) ).a;","visibility += texture2D( occlusionMap, vec2( 0.1, 0.5 ) ).a;","visibility = ( 1.0 - visibility / 4.0 );","vec4 texture = texture2D( map, vUV );","texture.a *= opacity * visibility;","gl_FragColor = texture;","gl_FragColor.rgb *= color;","}","}"].join("\n")};}program=createProgram(shader);attributes={vertex:gl.getAttribLocation(program,"position"),uv:gl.getAttribLocation(program,"uv")};uniforms={renderType:gl.getUniformLocation(program,"renderType"),map:gl.getUniformLocation(program,"map"),occlusionMap:gl.getUniformLocation(program,"occlusionMap"),opacity:gl.getUniformLocation(program,"opacity"),color:gl.getUniformLocation(program,"color"),scale:gl.getUniformLocation(program,"scale"),rotation:gl.getUniformLocation(program,"rotation"),screenPosition:gl.getUniformLocation(program,"screenPosition")};} /*
	 * Render lens flares
	 * Method: renders 16x16 0xff00ff-colored points scattered over the light source area,
	 *         reads these back and calculates occlusion.
	 */this.render=function(scene,camera,viewportWidth,viewportHeight){if(flares.length===0)return;var tempPosition=new THREE.Vector3();var invAspect=viewportHeight/viewportWidth,halfViewportWidth=viewportWidth*0.5,halfViewportHeight=viewportHeight*0.5;var size=16/viewportHeight,scale=new THREE.Vector2(size*invAspect,size);var screenPosition=new THREE.Vector3(1,1,0),screenPositionPixels=new THREE.Vector2(1,1);if(program===undefined){init();}gl.useProgram(program);state.initAttributes();state.enableAttribute(attributes.vertex);state.enableAttribute(attributes.uv);state.disableUnusedAttributes(); // loop through all lens flares to update their occlusion and positions
// setup gl and common used attribs/uniforms
gl.uniform1i(uniforms.occlusionMap,0);gl.uniform1i(uniforms.map,1);gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.vertexAttribPointer(attributes.vertex,2,gl.FLOAT,false,2*8,0);gl.vertexAttribPointer(attributes.uv,2,gl.FLOAT,false,2*8,8);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elementBuffer);state.disable(gl.CULL_FACE);gl.depthMask(false);for(var i=0,l=flares.length;i<l;i++){size=16/viewportHeight;scale.set(size*invAspect,size); // calc object screen position
var flare=flares[i];tempPosition.set(flare.matrixWorld.elements[12],flare.matrixWorld.elements[13],flare.matrixWorld.elements[14]);tempPosition.applyMatrix4(camera.matrixWorldInverse);tempPosition.applyProjection(camera.projectionMatrix); // setup arrays for gl programs
screenPosition.copy(tempPosition);screenPositionPixels.x=screenPosition.x*halfViewportWidth+halfViewportWidth;screenPositionPixels.y=screenPosition.y*halfViewportHeight+halfViewportHeight; // screen cull
if(hasVertexTexture||screenPositionPixels.x>0&&screenPositionPixels.x<viewportWidth&&screenPositionPixels.y>0&&screenPositionPixels.y<viewportHeight){ // save current RGB to temp texture
state.activeTexture(gl.TEXTURE0);state.bindTexture(gl.TEXTURE_2D,null);state.activeTexture(gl.TEXTURE1);state.bindTexture(gl.TEXTURE_2D,tempTexture);gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGB,screenPositionPixels.x-8,screenPositionPixels.y-8,16,16,0); // render pink quad
gl.uniform1i(uniforms.renderType,0);gl.uniform2f(uniforms.scale,scale.x,scale.y);gl.uniform3f(uniforms.screenPosition,screenPosition.x,screenPosition.y,screenPosition.z);state.disable(gl.BLEND);state.enable(gl.DEPTH_TEST);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0); // copy result to occlusionMap
state.activeTexture(gl.TEXTURE0);state.bindTexture(gl.TEXTURE_2D,occlusionTexture);gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGBA,screenPositionPixels.x-8,screenPositionPixels.y-8,16,16,0); // restore graphics
gl.uniform1i(uniforms.renderType,1);state.disable(gl.DEPTH_TEST);state.activeTexture(gl.TEXTURE1);state.bindTexture(gl.TEXTURE_2D,tempTexture);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0); // update object positions
flare.positionScreen.copy(screenPosition);if(flare.customUpdateCallback){flare.customUpdateCallback(flare);}else {flare.updateLensFlares();} // render flares
gl.uniform1i(uniforms.renderType,2);state.enable(gl.BLEND);for(var j=0,jl=flare.lensFlares.length;j<jl;j++){var sprite=flare.lensFlares[j];if(sprite.opacity>0.001&&sprite.scale>0.001){screenPosition.x=sprite.x;screenPosition.y=sprite.y;screenPosition.z=sprite.z;size=sprite.size*sprite.scale/viewportHeight;scale.x=size*invAspect;scale.y=size;gl.uniform3f(uniforms.screenPosition,screenPosition.x,screenPosition.y,screenPosition.z);gl.uniform2f(uniforms.scale,scale.x,scale.y);gl.uniform1f(uniforms.rotation,sprite.rotation);gl.uniform1f(uniforms.opacity,sprite.opacity);gl.uniform3f(uniforms.color,sprite.color.r,sprite.color.g,sprite.color.b);state.setBlending(sprite.blending,sprite.blendEquation,sprite.blendSrc,sprite.blendDst);renderer.setTexture(sprite.texture,1);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);}}}} // restore gl
state.enable(gl.CULL_FACE);state.enable(gl.DEPTH_TEST);gl.depthMask(true);renderer.resetGLState();};function createProgram(shader){var program=gl.createProgram();var fragmentShader=gl.createShader(gl.FRAGMENT_SHADER);var vertexShader=gl.createShader(gl.VERTEX_SHADER);var prefix="precision "+renderer.getPrecision()+" float;\n";gl.shaderSource(fragmentShader,prefix+shader.fragmentShader);gl.shaderSource(vertexShader,prefix+shader.vertexShader);gl.compileShader(fragmentShader);gl.compileShader(vertexShader);gl.attachShader(program,fragmentShader);gl.attachShader(program,vertexShader);gl.linkProgram(program);return program;}}; // File:src/renderers/webgl/plugins/SpritePlugin.js
/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 */THREE.SpritePlugin=function(renderer,sprites){var gl=renderer.context;var state=renderer.state;var vertexBuffer,elementBuffer;var program,attributes,uniforms;var texture; // decompose matrixWorld
var spritePosition=new THREE.Vector3();var spriteRotation=new THREE.Quaternion();var spriteScale=new THREE.Vector3();function init(){var vertices=new Float32Array([-0.5,-0.5,0,0,0.5,-0.5,1,0,0.5,0.5,1,1,-0.5,0.5,0,1]);var faces=new Uint16Array([0,1,2,0,2,3]);vertexBuffer=gl.createBuffer();elementBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elementBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,faces,gl.STATIC_DRAW);program=createProgram();attributes={position:gl.getAttribLocation(program,'position'),uv:gl.getAttribLocation(program,'uv')};uniforms={uvOffset:gl.getUniformLocation(program,'uvOffset'),uvScale:gl.getUniformLocation(program,'uvScale'),rotation:gl.getUniformLocation(program,'rotation'),scale:gl.getUniformLocation(program,'scale'),color:gl.getUniformLocation(program,'color'),map:gl.getUniformLocation(program,'map'),opacity:gl.getUniformLocation(program,'opacity'),modelViewMatrix:gl.getUniformLocation(program,'modelViewMatrix'),projectionMatrix:gl.getUniformLocation(program,'projectionMatrix'),fogType:gl.getUniformLocation(program,'fogType'),fogDensity:gl.getUniformLocation(program,'fogDensity'),fogNear:gl.getUniformLocation(program,'fogNear'),fogFar:gl.getUniformLocation(program,'fogFar'),fogColor:gl.getUniformLocation(program,'fogColor'),alphaTest:gl.getUniformLocation(program,'alphaTest')};var canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;var context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,8,8);texture=new THREE.Texture(canvas);texture.needsUpdate=true;}this.render=function(scene,camera){if(sprites.length===0)return; // setup gl
if(program===undefined){init();}gl.useProgram(program);state.initAttributes();state.enableAttribute(attributes.position);state.enableAttribute(attributes.uv);state.disableUnusedAttributes();state.disable(gl.CULL_FACE);state.enable(gl.BLEND);gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.vertexAttribPointer(attributes.position,2,gl.FLOAT,false,2*8,0);gl.vertexAttribPointer(attributes.uv,2,gl.FLOAT,false,2*8,8);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elementBuffer);gl.uniformMatrix4fv(uniforms.projectionMatrix,false,camera.projectionMatrix.elements);state.activeTexture(gl.TEXTURE0);gl.uniform1i(uniforms.map,0);var oldFogType=0;var sceneFogType=0;var fog=scene.fog;if(fog){gl.uniform3f(uniforms.fogColor,fog.color.r,fog.color.g,fog.color.b);if(fog instanceof THREE.Fog){gl.uniform1f(uniforms.fogNear,fog.near);gl.uniform1f(uniforms.fogFar,fog.far);gl.uniform1i(uniforms.fogType,1);oldFogType=1;sceneFogType=1;}else if(fog instanceof THREE.FogExp2){gl.uniform1f(uniforms.fogDensity,fog.density);gl.uniform1i(uniforms.fogType,2);oldFogType=2;sceneFogType=2;}}else {gl.uniform1i(uniforms.fogType,0);oldFogType=0;sceneFogType=0;} // update positions and sort
for(var i=0,l=sprites.length;i<l;i++){var sprite=sprites[i];sprite.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse,sprite.matrixWorld);sprite.z=-sprite.modelViewMatrix.elements[14];}sprites.sort(painterSortStable); // render all sprites
var scale=[];for(var i=0,l=sprites.length;i<l;i++){var sprite=sprites[i];var material=sprite.material;gl.uniform1f(uniforms.alphaTest,material.alphaTest);gl.uniformMatrix4fv(uniforms.modelViewMatrix,false,sprite.modelViewMatrix.elements);sprite.matrixWorld.decompose(spritePosition,spriteRotation,spriteScale);scale[0]=spriteScale.x;scale[1]=spriteScale.y;var fogType=0;if(scene.fog&&material.fog){fogType=sceneFogType;}if(oldFogType!==fogType){gl.uniform1i(uniforms.fogType,fogType);oldFogType=fogType;}if(material.map!==null){gl.uniform2f(uniforms.uvOffset,material.map.offset.x,material.map.offset.y);gl.uniform2f(uniforms.uvScale,material.map.repeat.x,material.map.repeat.y);}else {gl.uniform2f(uniforms.uvOffset,0,0);gl.uniform2f(uniforms.uvScale,1,1);}gl.uniform1f(uniforms.opacity,material.opacity);gl.uniform3f(uniforms.color,material.color.r,material.color.g,material.color.b);gl.uniform1f(uniforms.rotation,material.rotation);gl.uniform2fv(uniforms.scale,scale);state.setBlending(material.blending,material.blendEquation,material.blendSrc,material.blendDst);state.setDepthTest(material.depthTest);state.setDepthWrite(material.depthWrite);if(material.map&&material.map.image&&material.map.image.width){renderer.setTexture(material.map,0);}else {renderer.setTexture(texture,0);}gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);} // restore gl
state.enable(gl.CULL_FACE);renderer.resetGLState();};function createProgram(){var program=gl.createProgram();var vertexShader=gl.createShader(gl.VERTEX_SHADER);var fragmentShader=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(vertexShader,['precision '+renderer.getPrecision()+' float;','uniform mat4 modelViewMatrix;','uniform mat4 projectionMatrix;','uniform float rotation;','uniform vec2 scale;','uniform vec2 uvOffset;','uniform vec2 uvScale;','attribute vec2 position;','attribute vec2 uv;','varying vec2 vUV;','void main() {','vUV = uvOffset + uv * uvScale;','vec2 alignedPosition = position * scale;','vec2 rotatedPosition;','rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;','rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;','vec4 finalPosition;','finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );','finalPosition.xy += rotatedPosition;','finalPosition = projectionMatrix * finalPosition;','gl_Position = finalPosition;','}'].join('\n'));gl.shaderSource(fragmentShader,['precision '+renderer.getPrecision()+' float;','uniform vec3 color;','uniform sampler2D map;','uniform float opacity;','uniform int fogType;','uniform vec3 fogColor;','uniform float fogDensity;','uniform float fogNear;','uniform float fogFar;','uniform float alphaTest;','varying vec2 vUV;','void main() {','vec4 texture = texture2D( map, vUV );','if ( texture.a < alphaTest ) discard;','gl_FragColor = vec4( color * texture.xyz, texture.a * opacity );','if ( fogType > 0 ) {','float depth = gl_FragCoord.z / gl_FragCoord.w;','float fogFactor = 0.0;','if ( fogType == 1 ) {','fogFactor = smoothstep( fogNear, fogFar, depth );','} else {','const float LOG2 = 1.442695;','fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );','fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );','}','gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );','}','}'].join('\n'));gl.compileShader(vertexShader);gl.compileShader(fragmentShader);gl.attachShader(program,vertexShader);gl.attachShader(program,fragmentShader);gl.linkProgram(program);return program;}function painterSortStable(a,b){if(a.z!==b.z){return b.z-a.z;}else {return b.id-a.id;}}}; // File:src/extras/CurveUtils.js
/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 */THREE.CurveUtils={tangentQuadraticBezier:function tangentQuadraticBezier(t,p0,p1,p2){return 2*(1-t)*(p1-p0)+2*t*(p2-p1);}, // Puay Bing, thanks for helping with this derivative!
tangentCubicBezier:function tangentCubicBezier(t,p0,p1,p2,p3){return -3*p0*(1-t)*(1-t)+3*p1*(1-t)*(1-t)-6*t*p1*(1-t)+6*t*p2*(1-t)-3*t*t*p2+3*t*t*p3;},tangentSpline:function tangentSpline(t,p0,p1,p2,p3){ // To check if my formulas are correct
var h00=6*t*t-6*t; // derived from 2t^3 − 3t^2 + 1
var h10=3*t*t-4*t+1; // t^3 − 2t^2 + t
var h01=-6*t*t+6*t; // − 2t3 + 3t2
var h11=3*t*t-2*t; // t3 − t2
return h00+h10+h01+h11;}, // Catmull-Rom
interpolate:function interpolate(p0,p1,p2,p3,t){var v0=(p2-p0)*0.5;var v1=(p3-p1)*0.5;var t2=t*t;var t3=t*t2;return (2*p1-2*p2+v0+v1)*t3+(-3*p1+3*p2-2*v0-v1)*t2+v0*t+p1;}}; // File:src/extras/GeometryUtils.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.GeometryUtils={merge:function merge(geometry1,geometry2,materialIndexOffset){console.warn('THREE.GeometryUtils: .merge() has been moved to Geometry. Use geometry.merge( geometry2, matrix, materialIndexOffset ) instead.');var matrix;if(geometry2 instanceof THREE.Mesh){geometry2.matrixAutoUpdate&&geometry2.updateMatrix();matrix=geometry2.matrix;geometry2=geometry2.geometry;}geometry1.merge(geometry2,matrix,materialIndexOffset);},center:function center(geometry){console.warn('THREE.GeometryUtils: .center() has been moved to Geometry. Use geometry.center() instead.');return geometry.center();}}; // File:src/extras/ImageUtils.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author Daosheng Mu / https://github.com/DaoshengMu/
 */THREE.ImageUtils={crossOrigin:undefined,loadTexture:function loadTexture(url,mapping,onLoad,onError){console.warn('THREE.ImageUtils.loadTexture is being deprecated. Use THREE.TextureLoader() instead.');var loader=new THREE.TextureLoader();loader.setCrossOrigin(this.crossOrigin);var texture=loader.load(url,onLoad,undefined,onError);if(mapping)texture.mapping=mapping;return texture;},loadTextureCube:function loadTextureCube(urls,mapping,onLoad,onError){console.warn('THREE.ImageUtils.loadTextureCube is being deprecated. Use THREE.CubeTextureLoader() instead.');var loader=new THREE.CubeTextureLoader();loader.setCrossOrigin(this.crossOrigin);var texture=loader.load(urls,onLoad,undefined,onError);if(mapping)texture.mapping=mapping;return texture;},loadCompressedTexture:function loadCompressedTexture(){console.error('THREE.ImageUtils.loadCompressedTexture has been removed. Use THREE.DDSLoader instead.');},loadCompressedTextureCube:function loadCompressedTextureCube(){console.error('THREE.ImageUtils.loadCompressedTextureCube has been removed. Use THREE.DDSLoader instead.');}}; // File:src/extras/SceneUtils.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.SceneUtils={createMultiMaterialObject:function createMultiMaterialObject(geometry,materials){var group=new THREE.Group();for(var i=0,l=materials.length;i<l;i++){group.add(new THREE.Mesh(geometry,materials[i]));}return group;},detach:function detach(child,parent,scene){child.applyMatrix(parent.matrixWorld);parent.remove(child);scene.add(child);},attach:function attach(child,scene,parent){var matrixWorldInverse=new THREE.Matrix4();matrixWorldInverse.getInverse(parent.matrixWorld);child.applyMatrix(matrixWorldInverse);scene.remove(child);parent.add(child);}}; // File:src/extras/ShapeUtils.js
/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 */THREE.ShapeUtils={ // calculate area of the contour polygon
area:function area(contour){var n=contour.length;var a=0.0;for(var p=n-1,q=0;q<n;p=q++){a+=contour[p].x*contour[q].y-contour[q].x*contour[p].y;}return a*0.5;},triangulate:function(){ /**
		 * This code is a quick port of code written in C++ which was submitted to
		 * flipcode.com by John W. Ratcliff  // July 22, 2000
		 * See original code and more information here:
		 * http://www.flipcode.com/archives/Efficient_Polygon_Triangulation.shtml
		 *
		 * ported to actionscript by Zevan Rosser
		 * www.actionsnippet.com
		 *
		 * ported to javascript by Joshua Koo
		 * http://www.lab4games.net/zz85/blog
		 *
		 */function snip(contour,u,v,w,n,verts){var p;var ax,ay,bx,by;var cx,cy,px,py;ax=contour[verts[u]].x;ay=contour[verts[u]].y;bx=contour[verts[v]].x;by=contour[verts[v]].y;cx=contour[verts[w]].x;cy=contour[verts[w]].y;if(Number.EPSILON>(bx-ax)*(cy-ay)-(by-ay)*(cx-ax))return false;var aX,aY,bX,bY,cX,cY;var apx,apy,bpx,bpy,cpx,cpy;var cCROSSap,bCROSScp,aCROSSbp;aX=cx-bx;aY=cy-by;bX=ax-cx;bY=ay-cy;cX=bx-ax;cY=by-ay;for(p=0;p<n;p++){px=contour[verts[p]].x;py=contour[verts[p]].y;if(px===ax&&py===ay||px===bx&&py===by||px===cx&&py===cy)continue;apx=px-ax;apy=py-ay;bpx=px-bx;bpy=py-by;cpx=px-cx;cpy=py-cy; // see if p is inside triangle abc
aCROSSbp=aX*bpy-aY*bpx;cCROSSap=cX*apy-cY*apx;bCROSScp=bX*cpy-bY*cpx;if(aCROSSbp>=-Number.EPSILON&&bCROSScp>=-Number.EPSILON&&cCROSSap>=-Number.EPSILON)return false;}return true;} // takes in an contour array and returns
return function(contour,indices){var n=contour.length;if(n<3)return null;var result=[],verts=[],vertIndices=[]; /* we want a counter-clockwise polygon in verts */var u,v,w;if(THREE.ShapeUtils.area(contour)>0.0){for(v=0;v<n;v++){verts[v]=v;}}else {for(v=0;v<n;v++){verts[v]=n-1-v;}}var nv=n; /*  remove nv - 2 vertices, creating 1 triangle every time */var count=2*nv; /* error detection */for(v=nv-1;nv>2;){ /* if we loop, it is probably a non-simple polygon */if(count--<=0){ //** Triangulate: ERROR - probable bad polygon!
//throw ( "Warning, unable to triangulate polygon!" );
//return null;
// Sometimes warning is fine, especially polygons are triangulated in reverse.
console.warn('THREE.ShapeUtils: Unable to triangulate polygon! in triangulate()');if(indices)return vertIndices;return result;} /* three consecutive vertices in current polygon, <u,v,w> */u=v;if(nv<=u)u=0; /* previous */v=u+1;if(nv<=v)v=0; /* new v    */w=v+1;if(nv<=w)w=0; /* next     */if(snip(contour,u,v,w,nv,verts)){var a,b,c,s,t; /* true names of the vertices */a=verts[u];b=verts[v];c=verts[w]; /* output Triangle */result.push([contour[a],contour[b],contour[c]]);vertIndices.push([verts[u],verts[v],verts[w]]); /* remove v from the remaining polygon */for(s=v,t=v+1;t<nv;s++,t++){verts[s]=verts[t];}nv--; /* reset error detection counter */count=2*nv;}}if(indices)return vertIndices;return result;};}(),triangulateShape:function triangulateShape(contour,holes){function point_in_segment_2D_colin(inSegPt1,inSegPt2,inOtherPt){ // inOtherPt needs to be collinear to the inSegment
if(inSegPt1.x!==inSegPt2.x){if(inSegPt1.x<inSegPt2.x){return inSegPt1.x<=inOtherPt.x&&inOtherPt.x<=inSegPt2.x;}else {return inSegPt2.x<=inOtherPt.x&&inOtherPt.x<=inSegPt1.x;}}else {if(inSegPt1.y<inSegPt2.y){return inSegPt1.y<=inOtherPt.y&&inOtherPt.y<=inSegPt2.y;}else {return inSegPt2.y<=inOtherPt.y&&inOtherPt.y<=inSegPt1.y;}}}function intersect_segments_2D(inSeg1Pt1,inSeg1Pt2,inSeg2Pt1,inSeg2Pt2,inExcludeAdjacentSegs){var seg1dx=inSeg1Pt2.x-inSeg1Pt1.x,seg1dy=inSeg1Pt2.y-inSeg1Pt1.y;var seg2dx=inSeg2Pt2.x-inSeg2Pt1.x,seg2dy=inSeg2Pt2.y-inSeg2Pt1.y;var seg1seg2dx=inSeg1Pt1.x-inSeg2Pt1.x;var seg1seg2dy=inSeg1Pt1.y-inSeg2Pt1.y;var limit=seg1dy*seg2dx-seg1dx*seg2dy;var perpSeg1=seg1dy*seg1seg2dx-seg1dx*seg1seg2dy;if(Math.abs(limit)>Number.EPSILON){ // not parallel
var perpSeg2;if(limit>0){if(perpSeg1<0||perpSeg1>limit)return [];perpSeg2=seg2dy*seg1seg2dx-seg2dx*seg1seg2dy;if(perpSeg2<0||perpSeg2>limit)return [];}else {if(perpSeg1>0||perpSeg1<limit)return [];perpSeg2=seg2dy*seg1seg2dx-seg2dx*seg1seg2dy;if(perpSeg2>0||perpSeg2<limit)return [];} // i.e. to reduce rounding errors
// intersection at endpoint of segment#1?
if(perpSeg2===0){if(inExcludeAdjacentSegs&&(perpSeg1===0||perpSeg1===limit))return [];return [inSeg1Pt1];}if(perpSeg2===limit){if(inExcludeAdjacentSegs&&(perpSeg1===0||perpSeg1===limit))return [];return [inSeg1Pt2];} // intersection at endpoint of segment#2?
if(perpSeg1===0)return [inSeg2Pt1];if(perpSeg1===limit)return [inSeg2Pt2]; // return real intersection point
var factorSeg1=perpSeg2/limit;return [{x:inSeg1Pt1.x+factorSeg1*seg1dx,y:inSeg1Pt1.y+factorSeg1*seg1dy}];}else { // parallel or collinear
if(perpSeg1!==0||seg2dy*seg1seg2dx!==seg2dx*seg1seg2dy)return []; // they are collinear or degenerate
var seg1Pt=seg1dx===0&&seg1dy===0; // segment1 is just a point?
var seg2Pt=seg2dx===0&&seg2dy===0; // segment2 is just a point?
// both segments are points
if(seg1Pt&&seg2Pt){if(inSeg1Pt1.x!==inSeg2Pt1.x||inSeg1Pt1.y!==inSeg2Pt1.y)return []; // they are distinct  points
return [inSeg1Pt1]; // they are the same point
} // segment#1  is a single point
if(seg1Pt){if(!point_in_segment_2D_colin(inSeg2Pt1,inSeg2Pt2,inSeg1Pt1))return []; // but not in segment#2
return [inSeg1Pt1];} // segment#2  is a single point
if(seg2Pt){if(!point_in_segment_2D_colin(inSeg1Pt1,inSeg1Pt2,inSeg2Pt1))return []; // but not in segment#1
return [inSeg2Pt1];} // they are collinear segments, which might overlap
var seg1min,seg1max,seg1minVal,seg1maxVal;var seg2min,seg2max,seg2minVal,seg2maxVal;if(seg1dx!==0){ // the segments are NOT on a vertical line
if(inSeg1Pt1.x<inSeg1Pt2.x){seg1min=inSeg1Pt1;seg1minVal=inSeg1Pt1.x;seg1max=inSeg1Pt2;seg1maxVal=inSeg1Pt2.x;}else {seg1min=inSeg1Pt2;seg1minVal=inSeg1Pt2.x;seg1max=inSeg1Pt1;seg1maxVal=inSeg1Pt1.x;}if(inSeg2Pt1.x<inSeg2Pt2.x){seg2min=inSeg2Pt1;seg2minVal=inSeg2Pt1.x;seg2max=inSeg2Pt2;seg2maxVal=inSeg2Pt2.x;}else {seg2min=inSeg2Pt2;seg2minVal=inSeg2Pt2.x;seg2max=inSeg2Pt1;seg2maxVal=inSeg2Pt1.x;}}else { // the segments are on a vertical line
if(inSeg1Pt1.y<inSeg1Pt2.y){seg1min=inSeg1Pt1;seg1minVal=inSeg1Pt1.y;seg1max=inSeg1Pt2;seg1maxVal=inSeg1Pt2.y;}else {seg1min=inSeg1Pt2;seg1minVal=inSeg1Pt2.y;seg1max=inSeg1Pt1;seg1maxVal=inSeg1Pt1.y;}if(inSeg2Pt1.y<inSeg2Pt2.y){seg2min=inSeg2Pt1;seg2minVal=inSeg2Pt1.y;seg2max=inSeg2Pt2;seg2maxVal=inSeg2Pt2.y;}else {seg2min=inSeg2Pt2;seg2minVal=inSeg2Pt2.y;seg2max=inSeg2Pt1;seg2maxVal=inSeg2Pt1.y;}}if(seg1minVal<=seg2minVal){if(seg1maxVal<seg2minVal)return [];if(seg1maxVal===seg2minVal){if(inExcludeAdjacentSegs)return [];return [seg2min];}if(seg1maxVal<=seg2maxVal)return [seg2min,seg1max];return [seg2min,seg2max];}else {if(seg1minVal>seg2maxVal)return [];if(seg1minVal===seg2maxVal){if(inExcludeAdjacentSegs)return [];return [seg1min];}if(seg1maxVal<=seg2maxVal)return [seg1min,seg1max];return [seg1min,seg2max];}}}function isPointInsideAngle(inVertex,inLegFromPt,inLegToPt,inOtherPt){ // The order of legs is important
// translation of all points, so that Vertex is at (0,0)
var legFromPtX=inLegFromPt.x-inVertex.x,legFromPtY=inLegFromPt.y-inVertex.y;var legToPtX=inLegToPt.x-inVertex.x,legToPtY=inLegToPt.y-inVertex.y;var otherPtX=inOtherPt.x-inVertex.x,otherPtY=inOtherPt.y-inVertex.y; // main angle >0: < 180 deg.; 0: 180 deg.; <0: > 180 deg.
var from2toAngle=legFromPtX*legToPtY-legFromPtY*legToPtX;var from2otherAngle=legFromPtX*otherPtY-legFromPtY*otherPtX;if(Math.abs(from2toAngle)>Number.EPSILON){ // angle != 180 deg.
var other2toAngle=otherPtX*legToPtY-otherPtY*legToPtX; // console.log( "from2to: " + from2toAngle + ", from2other: " + from2otherAngle + ", other2to: " + other2toAngle );
if(from2toAngle>0){ // main angle < 180 deg.
return from2otherAngle>=0&&other2toAngle>=0;}else { // main angle > 180 deg.
return from2otherAngle>=0||other2toAngle>=0;}}else { // angle == 180 deg.
// console.log( "from2to: 180 deg., from2other: " + from2otherAngle  );
return from2otherAngle>0;}}function removeHoles(contour,holes){var shape=contour.concat(); // work on this shape
var hole;function isCutLineInsideAngles(inShapeIdx,inHoleIdx){ // Check if hole point lies within angle around shape point
var lastShapeIdx=shape.length-1;var prevShapeIdx=inShapeIdx-1;if(prevShapeIdx<0)prevShapeIdx=lastShapeIdx;var nextShapeIdx=inShapeIdx+1;if(nextShapeIdx>lastShapeIdx)nextShapeIdx=0;var insideAngle=isPointInsideAngle(shape[inShapeIdx],shape[prevShapeIdx],shape[nextShapeIdx],hole[inHoleIdx]);if(!insideAngle){ // console.log( "Vertex (Shape): " + inShapeIdx + ", Point: " + hole[inHoleIdx].x + "/" + hole[inHoleIdx].y );
return false;} // Check if shape point lies within angle around hole point
var lastHoleIdx=hole.length-1;var prevHoleIdx=inHoleIdx-1;if(prevHoleIdx<0)prevHoleIdx=lastHoleIdx;var nextHoleIdx=inHoleIdx+1;if(nextHoleIdx>lastHoleIdx)nextHoleIdx=0;insideAngle=isPointInsideAngle(hole[inHoleIdx],hole[prevHoleIdx],hole[nextHoleIdx],shape[inShapeIdx]);if(!insideAngle){ // console.log( "Vertex (Hole): " + inHoleIdx + ", Point: " + shape[inShapeIdx].x + "/" + shape[inShapeIdx].y );
return false;}return true;}function intersectsShapeEdge(inShapePt,inHolePt){ // checks for intersections with shape edges
var sIdx,nextIdx,intersection;for(sIdx=0;sIdx<shape.length;sIdx++){nextIdx=sIdx+1;nextIdx%=shape.length;intersection=intersect_segments_2D(inShapePt,inHolePt,shape[sIdx],shape[nextIdx],true);if(intersection.length>0)return true;}return false;}var indepHoles=[];function intersectsHoleEdge(inShapePt,inHolePt){ // checks for intersections with hole edges
var ihIdx,chkHole,hIdx,nextIdx,intersection;for(ihIdx=0;ihIdx<indepHoles.length;ihIdx++){chkHole=holes[indepHoles[ihIdx]];for(hIdx=0;hIdx<chkHole.length;hIdx++){nextIdx=hIdx+1;nextIdx%=chkHole.length;intersection=intersect_segments_2D(inShapePt,inHolePt,chkHole[hIdx],chkHole[nextIdx],true);if(intersection.length>0)return true;}}return false;}var holeIndex,shapeIndex,shapePt,holePt,holeIdx,cutKey,failedCuts=[],tmpShape1,tmpShape2,tmpHole1,tmpHole2;for(var h=0,hl=holes.length;h<hl;h++){indepHoles.push(h);}var minShapeIndex=0;var counter=indepHoles.length*2;while(indepHoles.length>0){counter--;if(counter<0){console.log("Infinite Loop! Holes left:"+indepHoles.length+", Probably Hole outside Shape!");break;} // search for shape-vertex and hole-vertex,
// which can be connected without intersections
for(shapeIndex=minShapeIndex;shapeIndex<shape.length;shapeIndex++){shapePt=shape[shapeIndex];holeIndex=-1; // search for hole which can be reached without intersections
for(var h=0;h<indepHoles.length;h++){holeIdx=indepHoles[h]; // prevent multiple checks
cutKey=shapePt.x+":"+shapePt.y+":"+holeIdx;if(failedCuts[cutKey]!==undefined)continue;hole=holes[holeIdx];for(var h2=0;h2<hole.length;h2++){holePt=hole[h2];if(!isCutLineInsideAngles(shapeIndex,h2))continue;if(intersectsShapeEdge(shapePt,holePt))continue;if(intersectsHoleEdge(shapePt,holePt))continue;holeIndex=h2;indepHoles.splice(h,1);tmpShape1=shape.slice(0,shapeIndex+1);tmpShape2=shape.slice(shapeIndex);tmpHole1=hole.slice(holeIndex);tmpHole2=hole.slice(0,holeIndex+1);shape=tmpShape1.concat(tmpHole1).concat(tmpHole2).concat(tmpShape2);minShapeIndex=shapeIndex; // Debug only, to show the selected cuts
// glob_CutLines.push( [ shapePt, holePt ] );
break;}if(holeIndex>=0)break; // hole-vertex found
failedCuts[cutKey]=true; // remember failure
}if(holeIndex>=0)break; // hole-vertex found
}}return shape; /* shape with no holes */}var i,il,f,face,key,index,allPointsMap={}; // To maintain reference to old shape, one must match coordinates, or offset the indices from original arrays. It's probably easier to do the first.
var allpoints=contour.concat();for(var h=0,hl=holes.length;h<hl;h++){Array.prototype.push.apply(allpoints,holes[h]);} //console.log( "allpoints",allpoints, allpoints.length );
// prepare all points map
for(i=0,il=allpoints.length;i<il;i++){key=allpoints[i].x+":"+allpoints[i].y;if(allPointsMap[key]!==undefined){console.warn("THREE.Shape: Duplicate point",key);}allPointsMap[key]=i;} // remove holes by cutting paths to holes and adding them to the shape
var shapeWithoutHoles=removeHoles(contour,holes);var triangles=THREE.ShapeUtils.triangulate(shapeWithoutHoles,false); // True returns indices for points of spooled shape
//console.log( "triangles",triangles, triangles.length );
// check all face vertices against all points map
for(i=0,il=triangles.length;i<il;i++){face=triangles[i];for(f=0;f<3;f++){key=face[f].x+":"+face[f].y;index=allPointsMap[key];if(index!==undefined){face[f]=index;}}}return triangles.concat();},isClockWise:function isClockWise(pts){return THREE.ShapeUtils.area(pts)<0;}, // Bezier Curves formulas obtained from
// http://en.wikipedia.org/wiki/B%C3%A9zier_curve
// Quad Bezier Functions
b2:function(){function b2p0(t,p){var k=1-t;return k*k*p;}function b2p1(t,p){return 2*(1-t)*t*p;}function b2p2(t,p){return t*t*p;}return function(t,p0,p1,p2){return b2p0(t,p0)+b2p1(t,p1)+b2p2(t,p2);};}(), // Cubic Bezier Functions
b3:function(){function b3p0(t,p){var k=1-t;return k*k*k*p;}function b3p1(t,p){var k=1-t;return 3*k*k*t*p;}function b3p2(t,p){var k=1-t;return 3*k*t*t*p;}function b3p3(t,p){return t*t*t*p;}return function(t,p0,p1,p2,p3){return b3p0(t,p0)+b3p1(t,p1)+b3p2(t,p2)+b3p3(t,p3);};}()}; // File:src/extras/audio/Audio.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.Audio=function(listener){THREE.Object3D.call(this);this.type='Audio';this.context=listener.context;this.source=this.context.createBufferSource();this.source.onended=this.onEnded.bind(this);this.gain=this.context.createGain();this.gain.connect(this.context.destination);this.panner=this.context.createPanner();this.panner.connect(this.gain);this.autoplay=false;this.startTime=0;this.playbackRate=1;this.isPlaying=false;};THREE.Audio.prototype=Object.create(THREE.Object3D.prototype);THREE.Audio.prototype.constructor=THREE.Audio;THREE.Audio.prototype.load=function(file){var scope=this;var request=new XMLHttpRequest();request.open('GET',file,true);request.responseType='arraybuffer';request.onload=function(e){scope.context.decodeAudioData(this.response,function(buffer){scope.source.buffer=buffer;if(scope.autoplay)scope.play();});};request.send();return this;};THREE.Audio.prototype.play=function(){if(this.isPlaying===true){console.warn('THREE.Audio: Audio is already playing.');return;}var source=this.context.createBufferSource();source.buffer=this.source.buffer;source.loop=this.source.loop;source.onended=this.source.onended;source.start(0,this.startTime);source.playbackRate.value=this.playbackRate;this.isPlaying=true;this.source=source;this.connect();};THREE.Audio.prototype.pause=function(){this.source.stop();this.startTime=this.context.currentTime;};THREE.Audio.prototype.stop=function(){this.source.stop();this.startTime=0;};THREE.Audio.prototype.connect=function(){if(this.filter!==undefined){this.source.connect(this.filter);this.filter.connect(this.panner);}else {this.source.connect(this.panner);}};THREE.Audio.prototype.disconnect=function(){if(this.filter!==undefined){this.source.disconnect(this.filter);this.filter.disconnect(this.panner);}else {this.source.disconnect(this.panner);}};THREE.Audio.prototype.setFilter=function(value){if(this.isPlaying===true){this.disconnect();this.filter=value;this.connect();}else {this.filter=value;}};THREE.Audio.prototype.getFilter=function(){return this.filter;};THREE.Audio.prototype.setPlaybackRate=function(value){this.playbackRate=value;if(this.isPlaying===true){this.source.playbackRate.value=this.playbackRate;}};THREE.Audio.prototype.getPlaybackRate=function(){return this.playbackRate;};THREE.Audio.prototype.onEnded=function(){this.isPlaying=false;};THREE.Audio.prototype.setLoop=function(value){this.source.loop=value;};THREE.Audio.prototype.getLoop=function(){return this.source.loop;};THREE.Audio.prototype.setRefDistance=function(value){this.panner.refDistance=value;};THREE.Audio.prototype.getRefDistance=function(){return this.panner.refDistance;};THREE.Audio.prototype.setRolloffFactor=function(value){this.panner.rolloffFactor=value;};THREE.Audio.prototype.getRolloffFactor=function(){return this.panner.rolloffFactor;};THREE.Audio.prototype.setVolume=function(value){this.gain.gain.value=value;};THREE.Audio.prototype.getVolume=function(){return this.gain.gain.value;};THREE.Audio.prototype.updateMatrixWorld=function(){var position=new THREE.Vector3();return function updateMatrixWorld(force){THREE.Object3D.prototype.updateMatrixWorld.call(this,force);position.setFromMatrixPosition(this.matrixWorld);this.panner.setPosition(position.x,position.y,position.z);};}(); // File:src/extras/audio/AudioListener.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.AudioListener=function(){THREE.Object3D.call(this);this.type='AudioListener';this.context=new (window.AudioContext||window.webkitAudioContext)();};THREE.AudioListener.prototype=Object.create(THREE.Object3D.prototype);THREE.AudioListener.prototype.constructor=THREE.AudioListener;THREE.AudioListener.prototype.updateMatrixWorld=function(){var position=new THREE.Vector3();var quaternion=new THREE.Quaternion();var scale=new THREE.Vector3();var orientation=new THREE.Vector3();return function updateMatrixWorld(force){THREE.Object3D.prototype.updateMatrixWorld.call(this,force);var listener=this.context.listener;var up=this.up;this.matrixWorld.decompose(position,quaternion,scale);orientation.set(0,0,-1).applyQuaternion(quaternion);listener.setPosition(position.x,position.y,position.z);listener.setOrientation(orientation.x,orientation.y,orientation.z,up.x,up.y,up.z);};}(); // File:src/extras/core/Curve.js
/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 * Extensible curve object
 *
 * Some common of Curve methods
 * .getPoint(t), getTangent(t)
 * .getPointAt(u), getTagentAt(u)
 * .getPoints(), .getSpacedPoints()
 * .getLength()
 * .updateArcLengths()
 *
 * This following classes subclasses THREE.Curve:
 *
 * -- 2d classes --
 * THREE.LineCurve
 * THREE.QuadraticBezierCurve
 * THREE.CubicBezierCurve
 * THREE.SplineCurve
 * THREE.ArcCurve
 * THREE.EllipseCurve
 *
 * -- 3d classes --
 * THREE.LineCurve3
 * THREE.QuadraticBezierCurve3
 * THREE.CubicBezierCurve3
 * THREE.SplineCurve3
 * THREE.ClosedSplineCurve3
 *
 * A series of curves can be represented as a THREE.CurvePath
 *
 **/ /**************************************************************
 *	Abstract Curve base class
 **************************************************************/THREE.Curve=function(){};THREE.Curve.prototype={constructor:THREE.Curve, // Virtual base class method to overwrite and implement in subclasses
//	- t [0 .. 1]
getPoint:function getPoint(t){console.warn("THREE.Curve: Warning, getPoint() not implemented!");return null;}, // Get point at relative position in curve according to arc length
// - u [0 .. 1]
getPointAt:function getPointAt(u){var t=this.getUtoTmapping(u);return this.getPoint(t);}, // Get sequence of points using getPoint( t )
getPoints:function getPoints(divisions){if(!divisions)divisions=5;var d,pts=[];for(d=0;d<=divisions;d++){pts.push(this.getPoint(d/divisions));}return pts;}, // Get sequence of points using getPointAt( u )
getSpacedPoints:function getSpacedPoints(divisions){if(!divisions)divisions=5;var d,pts=[];for(d=0;d<=divisions;d++){pts.push(this.getPointAt(d/divisions));}return pts;}, // Get total curve arc length
getLength:function getLength(){var lengths=this.getLengths();return lengths[lengths.length-1];}, // Get list of cumulative segment lengths
getLengths:function getLengths(divisions){if(!divisions)divisions=this.__arcLengthDivisions?this.__arcLengthDivisions:200;if(this.cacheArcLengths&&this.cacheArcLengths.length===divisions+1&&!this.needsUpdate){ //console.log( "cached", this.cacheArcLengths );
return this.cacheArcLengths;}this.needsUpdate=false;var cache=[];var current,last=this.getPoint(0);var p,sum=0;cache.push(0);for(p=1;p<=divisions;p++){current=this.getPoint(p/divisions);sum+=current.distanceTo(last);cache.push(sum);last=current;}this.cacheArcLengths=cache;return cache; // { sums: cache, sum:sum }; Sum is in the last element.
},updateArcLengths:function updateArcLengths(){this.needsUpdate=true;this.getLengths();}, // Given u ( 0 .. 1 ), get a t to find p. This gives you points which are equidistant
getUtoTmapping:function getUtoTmapping(u,distance){var arcLengths=this.getLengths();var i=0,il=arcLengths.length;var targetArcLength; // The targeted u distance value to get
if(distance){targetArcLength=distance;}else {targetArcLength=u*arcLengths[il-1];} //var time = Date.now();
// binary search for the index with largest value smaller than target u distance
var low=0,high=il-1,comparison;while(low<=high){i=Math.floor(low+(high-low)/2); // less likely to overflow, though probably not issue here, JS doesn't really have integers, all numbers are floats
comparison=arcLengths[i]-targetArcLength;if(comparison<0){low=i+1;}else if(comparison>0){high=i-1;}else {high=i;break; // DONE
}}i=high; //console.log('b' , i, low, high, Date.now()- time);
if(arcLengths[i]===targetArcLength){var t=i/(il-1);return t;} // we could get finer grain at lengths, or use simple interpolation between two points
var lengthBefore=arcLengths[i];var lengthAfter=arcLengths[i+1];var segmentLength=lengthAfter-lengthBefore; // determine where we are between the 'before' and 'after' points
var segmentFraction=(targetArcLength-lengthBefore)/segmentLength; // add that fractional amount to t
var t=(i+segmentFraction)/(il-1);return t;}, // Returns a unit vector tangent at t
// In case any sub curve does not implement its tangent derivation,
// 2 points a small delta apart will be used to find its gradient
// which seems to give a reasonable approximation
getTangent:function getTangent(t){var delta=0.0001;var t1=t-delta;var t2=t+delta; // Capping in case of danger
if(t1<0)t1=0;if(t2>1)t2=1;var pt1=this.getPoint(t1);var pt2=this.getPoint(t2);var vec=pt2.clone().sub(pt1);return vec.normalize();},getTangentAt:function getTangentAt(u){var t=this.getUtoTmapping(u);return this.getTangent(t);}};THREE.Curve.Utils=THREE.CurveUtils; // backwards compatibility
// TODO: Transformation for Curves?
/**************************************************************
 *	3D Curves
 **************************************************************/ // A Factory method for creating new curve subclasses
THREE.Curve.create=function(constructor,getPointFunc){constructor.prototype=Object.create(THREE.Curve.prototype);constructor.prototype.constructor=constructor;constructor.prototype.getPoint=getPointFunc;return constructor;}; // File:src/extras/core/CurvePath.js
/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 **/ /**************************************************************
 *	Curved Path - a curve path is simply a array of connected
 *  curves, but retains the api of a curve
 **************************************************************/THREE.CurvePath=function(){this.curves=[];this.autoClose=false; // Automatically closes the path
};THREE.CurvePath.prototype=Object.create(THREE.Curve.prototype);THREE.CurvePath.prototype.constructor=THREE.CurvePath;THREE.CurvePath.prototype.add=function(curve){this.curves.push(curve);}; /*
THREE.CurvePath.prototype.checkConnection = function() {
	// TODO
	// If the ending of curve is not connected to the starting
	// or the next curve, then, this is not a real path
};
*/THREE.CurvePath.prototype.closePath=function(){ // TODO Test
// and verify for vector3 (needs to implement equals)
// Add a line curve if start and end of lines are not connected
var startPoint=this.curves[0].getPoint(0);var endPoint=this.curves[this.curves.length-1].getPoint(1);if(!startPoint.equals(endPoint)){this.curves.push(new THREE.LineCurve(endPoint,startPoint));}}; // To get accurate point with reference to
// entire path distance at time t,
// following has to be done:
// 1. Length of each sub path have to be known
// 2. Locate and identify type of curve
// 3. Get t for the curve
// 4. Return curve.getPointAt(t')
THREE.CurvePath.prototype.getPoint=function(t){var d=t*this.getLength();var curveLengths=this.getCurveLengths();var i=0; // To think about boundaries points.
while(i<curveLengths.length){if(curveLengths[i]>=d){var diff=curveLengths[i]-d;var curve=this.curves[i];var u=1-diff/curve.getLength();return curve.getPointAt(u);}i++;}return null; // loop where sum != 0, sum > d , sum+1 <d
}; /*
THREE.CurvePath.prototype.getTangent = function( t ) {
};
*/ // We cannot use the default THREE.Curve getPoint() with getLength() because in
// THREE.Curve, getLength() depends on getPoint() but in THREE.CurvePath
// getPoint() depends on getLength
THREE.CurvePath.prototype.getLength=function(){var lens=this.getCurveLengths();return lens[lens.length-1];}; // Compute lengths and cache them
// We cannot overwrite getLengths() because UtoT mapping uses it.
THREE.CurvePath.prototype.getCurveLengths=function(){ // We use cache values if curves and cache array are same length
if(this.cacheLengths&&this.cacheLengths.length===this.curves.length){return this.cacheLengths;} // Get length of sub-curve
// Push sums into cached array
var lengths=[],sums=0;for(var i=0,l=this.curves.length;i<l;i++){sums+=this.curves[i].getLength();lengths.push(sums);}this.cacheLengths=lengths;return lengths;}; /**************************************************************
 *	Create Geometries Helpers
 **************************************************************/ /// Generate geometry from path points (for Line or Points objects)
THREE.CurvePath.prototype.createPointsGeometry=function(divisions){var pts=this.getPoints(divisions,true);return this.createGeometry(pts);}; // Generate geometry from equidistant sampling along the path
THREE.CurvePath.prototype.createSpacedPointsGeometry=function(divisions){var pts=this.getSpacedPoints(divisions,true);return this.createGeometry(pts);};THREE.CurvePath.prototype.createGeometry=function(points){var geometry=new THREE.Geometry();for(var i=0,l=points.length;i<l;i++){var point=points[i];geometry.vertices.push(new THREE.Vector3(point.x,point.y,point.z||0));}return geometry;}; // File:src/extras/core/Path.js
/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 * Creates free form 2d path using series of points, lines or curves.
 *
 **/THREE.Path=function(points){THREE.CurvePath.call(this);this.actions=[];if(points){this.fromPoints(points);}};THREE.Path.prototype=Object.create(THREE.CurvePath.prototype);THREE.Path.prototype.constructor=THREE.Path; // TODO Clean up PATH API
// Create path using straight lines to connect all points
// - vectors: array of Vector2
THREE.Path.prototype.fromPoints=function(vectors){this.moveTo(vectors[0].x,vectors[0].y);for(var i=1,l=vectors.length;i<l;i++){this.lineTo(vectors[i].x,vectors[i].y);}}; // startPath() endPath()?
THREE.Path.prototype.moveTo=function(x,y){this.actions.push({action:'moveTo',args:[x,y]});};THREE.Path.prototype.lineTo=function(x,y){var lastargs=this.actions[this.actions.length-1].args;var x0=lastargs[lastargs.length-2];var y0=lastargs[lastargs.length-1];var curve=new THREE.LineCurve(new THREE.Vector2(x0,y0),new THREE.Vector2(x,y));this.curves.push(curve);this.actions.push({action:'lineTo',args:[x,y]});};THREE.Path.prototype.quadraticCurveTo=function(aCPx,aCPy,aX,aY){var lastargs=this.actions[this.actions.length-1].args;var x0=lastargs[lastargs.length-2];var y0=lastargs[lastargs.length-1];var curve=new THREE.QuadraticBezierCurve(new THREE.Vector2(x0,y0),new THREE.Vector2(aCPx,aCPy),new THREE.Vector2(aX,aY));this.curves.push(curve);this.actions.push({action:'quadraticCurveTo',args:[aCPx,aCPy,aX,aY]});};THREE.Path.prototype.bezierCurveTo=function(aCP1x,aCP1y,aCP2x,aCP2y,aX,aY){var lastargs=this.actions[this.actions.length-1].args;var x0=lastargs[lastargs.length-2];var y0=lastargs[lastargs.length-1];var curve=new THREE.CubicBezierCurve(new THREE.Vector2(x0,y0),new THREE.Vector2(aCP1x,aCP1y),new THREE.Vector2(aCP2x,aCP2y),new THREE.Vector2(aX,aY));this.curves.push(curve);this.actions.push({action:'bezierCurveTo',args:[aCP1x,aCP1y,aCP2x,aCP2y,aX,aY]});};THREE.Path.prototype.splineThru=function(pts /*Array of Vector*/){var args=Array.prototype.slice.call(arguments);var lastargs=this.actions[this.actions.length-1].args;var x0=lastargs[lastargs.length-2];var y0=lastargs[lastargs.length-1];var npts=[new THREE.Vector2(x0,y0)];Array.prototype.push.apply(npts,pts);var curve=new THREE.SplineCurve(npts);this.curves.push(curve);this.actions.push({action:'splineThru',args:args});}; // FUTURE: Change the API or follow canvas API?
THREE.Path.prototype.arc=function(aX,aY,aRadius,aStartAngle,aEndAngle,aClockwise){var lastargs=this.actions[this.actions.length-1].args;var x0=lastargs[lastargs.length-2];var y0=lastargs[lastargs.length-1];this.absarc(aX+x0,aY+y0,aRadius,aStartAngle,aEndAngle,aClockwise);};THREE.Path.prototype.absarc=function(aX,aY,aRadius,aStartAngle,aEndAngle,aClockwise){this.absellipse(aX,aY,aRadius,aRadius,aStartAngle,aEndAngle,aClockwise);};THREE.Path.prototype.ellipse=function(aX,aY,xRadius,yRadius,aStartAngle,aEndAngle,aClockwise,aRotation){var lastargs=this.actions[this.actions.length-1].args;var x0=lastargs[lastargs.length-2];var y0=lastargs[lastargs.length-1];this.absellipse(aX+x0,aY+y0,xRadius,yRadius,aStartAngle,aEndAngle,aClockwise,aRotation);};THREE.Path.prototype.absellipse=function(aX,aY,xRadius,yRadius,aStartAngle,aEndAngle,aClockwise,aRotation){var args=[aX,aY,xRadius,yRadius,aStartAngle,aEndAngle,aClockwise,aRotation||0 // aRotation is optional.
];var curve=new THREE.EllipseCurve(aX,aY,xRadius,yRadius,aStartAngle,aEndAngle,aClockwise,aRotation);this.curves.push(curve);var lastPoint=curve.getPoint(1);args.push(lastPoint.x);args.push(lastPoint.y);this.actions.push({action:'ellipse',args:args});};THREE.Path.prototype.getSpacedPoints=function(divisions,closedPath){if(!divisions)divisions=40;var points=[];for(var i=0;i<divisions;i++){points.push(this.getPoint(i/divisions)); //if ( !this.getPoint( i / divisions ) ) throw "DIE";
} // if ( closedPath ) {
//
// 	points.push( points[ 0 ] );
//
// }
return points;}; /* Return an array of vectors based on contour of the path */THREE.Path.prototype.getPoints=function(divisions,closedPath){divisions=divisions||12;var b2=THREE.ShapeUtils.b2;var b3=THREE.ShapeUtils.b3;var points=[];var cpx,cpy,cpx2,cpy2,cpx1,cpy1,cpx0,cpy0,laste,tx,ty;for(var i=0,l=this.actions.length;i<l;i++){var item=this.actions[i];var action=item.action;var args=item.args;switch(action){case 'moveTo':points.push(new THREE.Vector2(args[0],args[1]));break;case 'lineTo':points.push(new THREE.Vector2(args[0],args[1]));break;case 'quadraticCurveTo':cpx=args[2];cpy=args[3];cpx1=args[0];cpy1=args[1];if(points.length>0){laste=points[points.length-1];cpx0=laste.x;cpy0=laste.y;}else {laste=this.actions[i-1].args;cpx0=laste[laste.length-2];cpy0=laste[laste.length-1];}for(var j=1;j<=divisions;j++){var t=j/divisions;tx=b2(t,cpx0,cpx1,cpx);ty=b2(t,cpy0,cpy1,cpy);points.push(new THREE.Vector2(tx,ty));}break;case 'bezierCurveTo':cpx=args[4];cpy=args[5];cpx1=args[0];cpy1=args[1];cpx2=args[2];cpy2=args[3];if(points.length>0){laste=points[points.length-1];cpx0=laste.x;cpy0=laste.y;}else {laste=this.actions[i-1].args;cpx0=laste[laste.length-2];cpy0=laste[laste.length-1];}for(var j=1;j<=divisions;j++){var t=j/divisions;tx=b3(t,cpx0,cpx1,cpx2,cpx);ty=b3(t,cpy0,cpy1,cpy2,cpy);points.push(new THREE.Vector2(tx,ty));}break;case 'splineThru':laste=this.actions[i-1].args;var last=new THREE.Vector2(laste[laste.length-2],laste[laste.length-1]);var spts=[last];var n=divisions*args[0].length;spts=spts.concat(args[0]);var spline=new THREE.SplineCurve(spts);for(var j=1;j<=n;j++){points.push(spline.getPointAt(j/n));}break;case 'arc':var aX=args[0],aY=args[1],aRadius=args[2],aStartAngle=args[3],aEndAngle=args[4],aClockwise=!!args[5];var deltaAngle=aEndAngle-aStartAngle;var angle;var tdivisions=divisions*2;for(var j=1;j<=tdivisions;j++){var t=j/tdivisions;if(!aClockwise){t=1-t;}angle=aStartAngle+t*deltaAngle;tx=aX+aRadius*Math.cos(angle);ty=aY+aRadius*Math.sin(angle); //console.log('t', t, 'angle', angle, 'tx', tx, 'ty', ty);
points.push(new THREE.Vector2(tx,ty));} //console.log(points);
break;case 'ellipse':var aX=args[0],aY=args[1],xRadius=args[2],yRadius=args[3],aStartAngle=args[4],aEndAngle=args[5],aClockwise=!!args[6],aRotation=args[7];var deltaAngle=aEndAngle-aStartAngle;var angle;var tdivisions=divisions*2;var cos,sin;if(aRotation!==0){cos=Math.cos(aRotation);sin=Math.sin(aRotation);}for(var j=1;j<=tdivisions;j++){var t=j/tdivisions;if(!aClockwise){t=1-t;}angle=aStartAngle+t*deltaAngle;tx=aX+xRadius*Math.cos(angle);ty=aY+yRadius*Math.sin(angle);if(aRotation!==0){var x=tx,y=ty; // Rotate the point about the center of the ellipse.
tx=(x-aX)*cos-(y-aY)*sin+aX;ty=(x-aX)*sin+(y-aY)*cos+aY;} //console.log('t', t, 'angle', angle, 'tx', tx, 'ty', ty);
points.push(new THREE.Vector2(tx,ty));} //console.log(points);
break;} // end switch
} // Normalize to remove the closing point by default.
var lastPoint=points[points.length-1];if(Math.abs(lastPoint.x-points[0].x)<Number.EPSILON&&Math.abs(lastPoint.y-points[0].y)<Number.EPSILON)points.splice(points.length-1,1);if(closedPath){points.push(points[0]);}return points;}; //
// Breaks path into shapes
//
//	Assumptions (if parameter isCCW==true the opposite holds):
//	- solid shapes are defined clockwise (CW)
//	- holes are defined counterclockwise (CCW)
//
//	If parameter noHoles==true:
//  - all subPaths are regarded as solid shapes
//  - definition order CW/CCW has no relevance
//
THREE.Path.prototype.toShapes=function(isCCW,noHoles){function extractSubpaths(inActions){var subPaths=[],lastPath=new THREE.Path();for(var i=0,l=inActions.length;i<l;i++){var item=inActions[i];var args=item.args;var action=item.action;if(action==='moveTo'){if(lastPath.actions.length!==0){subPaths.push(lastPath);lastPath=new THREE.Path();}}lastPath[action].apply(lastPath,args);}if(lastPath.actions.length!==0){subPaths.push(lastPath);} // console.log(subPaths);
return subPaths;}function toShapesNoHoles(inSubpaths){var shapes=[];for(var i=0,l=inSubpaths.length;i<l;i++){var tmpPath=inSubpaths[i];var tmpShape=new THREE.Shape();tmpShape.actions=tmpPath.actions;tmpShape.curves=tmpPath.curves;shapes.push(tmpShape);} //console.log("shape", shapes);
return shapes;}function isPointInsidePolygon(inPt,inPolygon){var polyLen=inPolygon.length; // inPt on polygon contour => immediate success    or
// toggling of inside/outside at every single! intersection point of an edge
//  with the horizontal line through inPt, left of inPt
//  not counting lowerY endpoints of edges and whole edges on that line
var inside=false;for(var p=polyLen-1,q=0;q<polyLen;p=q++){var edgeLowPt=inPolygon[p];var edgeHighPt=inPolygon[q];var edgeDx=edgeHighPt.x-edgeLowPt.x;var edgeDy=edgeHighPt.y-edgeLowPt.y;if(Math.abs(edgeDy)>Number.EPSILON){ // not parallel
if(edgeDy<0){edgeLowPt=inPolygon[q];edgeDx=-edgeDx;edgeHighPt=inPolygon[p];edgeDy=-edgeDy;}if(inPt.y<edgeLowPt.y||inPt.y>edgeHighPt.y)continue;if(inPt.y===edgeLowPt.y){if(inPt.x===edgeLowPt.x)return true; // inPt is on contour ?
// continue;				// no intersection or edgeLowPt => doesn't count !!!
}else {var perpEdge=edgeDy*(inPt.x-edgeLowPt.x)-edgeDx*(inPt.y-edgeLowPt.y);if(perpEdge===0)return true; // inPt is on contour ?
if(perpEdge<0)continue;inside=!inside; // true intersection left of inPt
}}else { // parallel or collinear
if(inPt.y!==edgeLowPt.y)continue; // parallel
// edge lies on the same horizontal line as inPt
if(edgeHighPt.x<=inPt.x&&inPt.x<=edgeLowPt.x||edgeLowPt.x<=inPt.x&&inPt.x<=edgeHighPt.x)return true; // inPt: Point on contour !
// continue;
}}return inside;}var isClockWise=THREE.ShapeUtils.isClockWise;var subPaths=extractSubpaths(this.actions);if(subPaths.length===0)return [];if(noHoles===true)return toShapesNoHoles(subPaths);var solid,tmpPath,tmpShape,shapes=[];if(subPaths.length===1){tmpPath=subPaths[0];tmpShape=new THREE.Shape();tmpShape.actions=tmpPath.actions;tmpShape.curves=tmpPath.curves;shapes.push(tmpShape);return shapes;}var holesFirst=!isClockWise(subPaths[0].getPoints());holesFirst=isCCW?!holesFirst:holesFirst; // console.log("Holes first", holesFirst);
var betterShapeHoles=[];var newShapes=[];var newShapeHoles=[];var mainIdx=0;var tmpPoints;newShapes[mainIdx]=undefined;newShapeHoles[mainIdx]=[];for(var i=0,l=subPaths.length;i<l;i++){tmpPath=subPaths[i];tmpPoints=tmpPath.getPoints();solid=isClockWise(tmpPoints);solid=isCCW?!solid:solid;if(solid){if(!holesFirst&&newShapes[mainIdx])mainIdx++;newShapes[mainIdx]={s:new THREE.Shape(),p:tmpPoints};newShapes[mainIdx].s.actions=tmpPath.actions;newShapes[mainIdx].s.curves=tmpPath.curves;if(holesFirst)mainIdx++;newShapeHoles[mainIdx]=[]; //console.log('cw', i);
}else {newShapeHoles[mainIdx].push({h:tmpPath,p:tmpPoints[0]}); //console.log('ccw', i);
}} // only Holes? -> probably all Shapes with wrong orientation
if(!newShapes[0])return toShapesNoHoles(subPaths);if(newShapes.length>1){var ambiguous=false;var toChange=[];for(var sIdx=0,sLen=newShapes.length;sIdx<sLen;sIdx++){betterShapeHoles[sIdx]=[];}for(var sIdx=0,sLen=newShapes.length;sIdx<sLen;sIdx++){var sho=newShapeHoles[sIdx];for(var hIdx=0;hIdx<sho.length;hIdx++){var ho=sho[hIdx];var hole_unassigned=true;for(var s2Idx=0;s2Idx<newShapes.length;s2Idx++){if(isPointInsidePolygon(ho.p,newShapes[s2Idx].p)){if(sIdx!==s2Idx)toChange.push({froms:sIdx,tos:s2Idx,hole:hIdx});if(hole_unassigned){hole_unassigned=false;betterShapeHoles[s2Idx].push(ho);}else {ambiguous=true;}}}if(hole_unassigned){betterShapeHoles[sIdx].push(ho);}}} // console.log("ambiguous: ", ambiguous);
if(toChange.length>0){ // console.log("to change: ", toChange);
if(!ambiguous)newShapeHoles=betterShapeHoles;}}var tmpHoles;for(var i=0,il=newShapes.length;i<il;i++){tmpShape=newShapes[i].s;shapes.push(tmpShape);tmpHoles=newShapeHoles[i];for(var j=0,jl=tmpHoles.length;j<jl;j++){tmpShape.holes.push(tmpHoles[j].h);}} //console.log("shape", shapes);
return shapes;}; // File:src/extras/core/Shape.js
/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 * Defines a 2d shape plane using paths.
 **/ // STEP 1 Create a path.
// STEP 2 Turn path into shape.
// STEP 3 ExtrudeGeometry takes in Shape/Shapes
// STEP 3a - Extract points from each shape, turn to vertices
// STEP 3b - Triangulate each shape, add faces.
THREE.Shape=function(){THREE.Path.apply(this,arguments);this.holes=[];};THREE.Shape.prototype=Object.create(THREE.Path.prototype);THREE.Shape.prototype.constructor=THREE.Shape; // Convenience method to return ExtrudeGeometry
THREE.Shape.prototype.extrude=function(options){return new THREE.ExtrudeGeometry(this,options);}; // Convenience method to return ShapeGeometry
THREE.Shape.prototype.makeGeometry=function(options){return new THREE.ShapeGeometry(this,options);}; // Get points of holes
THREE.Shape.prototype.getPointsHoles=function(divisions){var holesPts=[];for(var i=0,l=this.holes.length;i<l;i++){holesPts[i]=this.holes[i].getPoints(divisions);}return holesPts;}; // Get points of shape and holes (keypoints based on segments parameter)
THREE.Shape.prototype.extractAllPoints=function(divisions){return {shape:this.getPoints(divisions),holes:this.getPointsHoles(divisions)};};THREE.Shape.prototype.extractPoints=function(divisions){return this.extractAllPoints(divisions);};THREE.Shape.Utils=THREE.ShapeUtils; // backwards compatibility
// File:src/extras/curves/LineCurve.js
/**************************************************************
 *	Line
 **************************************************************/THREE.LineCurve=function(v1,v2){this.v1=v1;this.v2=v2;};THREE.LineCurve.prototype=Object.create(THREE.Curve.prototype);THREE.LineCurve.prototype.constructor=THREE.LineCurve;THREE.LineCurve.prototype.getPoint=function(t){var point=this.v2.clone().sub(this.v1);point.multiplyScalar(t).add(this.v1);return point;}; // Line curve is linear, so we can overwrite default getPointAt
THREE.LineCurve.prototype.getPointAt=function(u){return this.getPoint(u);};THREE.LineCurve.prototype.getTangent=function(t){var tangent=this.v2.clone().sub(this.v1);return tangent.normalize();}; // File:src/extras/curves/QuadraticBezierCurve.js
/**************************************************************
 *	Quadratic Bezier curve
 **************************************************************/THREE.QuadraticBezierCurve=function(v0,v1,v2){this.v0=v0;this.v1=v1;this.v2=v2;};THREE.QuadraticBezierCurve.prototype=Object.create(THREE.Curve.prototype);THREE.QuadraticBezierCurve.prototype.constructor=THREE.QuadraticBezierCurve;THREE.QuadraticBezierCurve.prototype.getPoint=function(t){var b2=THREE.ShapeUtils.b2;return new THREE.Vector2(b2(t,this.v0.x,this.v1.x,this.v2.x),b2(t,this.v0.y,this.v1.y,this.v2.y));};THREE.QuadraticBezierCurve.prototype.getTangent=function(t){var tangentQuadraticBezier=THREE.CurveUtils.tangentQuadraticBezier;return new THREE.Vector2(tangentQuadraticBezier(t,this.v0.x,this.v1.x,this.v2.x),tangentQuadraticBezier(t,this.v0.y,this.v1.y,this.v2.y)).normalize();}; // File:src/extras/curves/CubicBezierCurve.js
/**************************************************************
 *	Cubic Bezier curve
 **************************************************************/THREE.CubicBezierCurve=function(v0,v1,v2,v3){this.v0=v0;this.v1=v1;this.v2=v2;this.v3=v3;};THREE.CubicBezierCurve.prototype=Object.create(THREE.Curve.prototype);THREE.CubicBezierCurve.prototype.constructor=THREE.CubicBezierCurve;THREE.CubicBezierCurve.prototype.getPoint=function(t){var b3=THREE.ShapeUtils.b3;return new THREE.Vector2(b3(t,this.v0.x,this.v1.x,this.v2.x,this.v3.x),b3(t,this.v0.y,this.v1.y,this.v2.y,this.v3.y));};THREE.CubicBezierCurve.prototype.getTangent=function(t){var tangentCubicBezier=THREE.CurveUtils.tangentCubicBezier;return new THREE.Vector2(tangentCubicBezier(t,this.v0.x,this.v1.x,this.v2.x,this.v3.x),tangentCubicBezier(t,this.v0.y,this.v1.y,this.v2.y,this.v3.y)).normalize();}; // File:src/extras/curves/SplineCurve.js
/**************************************************************
 *	Spline curve
 **************************************************************/THREE.SplineCurve=function(points /* array of Vector2 */){this.points=points==undefined?[]:points;};THREE.SplineCurve.prototype=Object.create(THREE.Curve.prototype);THREE.SplineCurve.prototype.constructor=THREE.SplineCurve;THREE.SplineCurve.prototype.getPoint=function(t){var points=this.points;var point=(points.length-1)*t;var intPoint=Math.floor(point);var weight=point-intPoint;var point0=points[intPoint===0?intPoint:intPoint-1];var point1=points[intPoint];var point2=points[intPoint>points.length-2?points.length-1:intPoint+1];var point3=points[intPoint>points.length-3?points.length-1:intPoint+2];var interpolate=THREE.CurveUtils.interpolate;return new THREE.Vector2(interpolate(point0.x,point1.x,point2.x,point3.x,weight),interpolate(point0.y,point1.y,point2.y,point3.y,weight));}; // File:src/extras/curves/EllipseCurve.js
/**************************************************************
 *	Ellipse curve
 **************************************************************/THREE.EllipseCurve=function(aX,aY,xRadius,yRadius,aStartAngle,aEndAngle,aClockwise,aRotation){this.aX=aX;this.aY=aY;this.xRadius=xRadius;this.yRadius=yRadius;this.aStartAngle=aStartAngle;this.aEndAngle=aEndAngle;this.aClockwise=aClockwise;this.aRotation=aRotation||0;};THREE.EllipseCurve.prototype=Object.create(THREE.Curve.prototype);THREE.EllipseCurve.prototype.constructor=THREE.EllipseCurve;THREE.EllipseCurve.prototype.getPoint=function(t){var deltaAngle=this.aEndAngle-this.aStartAngle;if(deltaAngle<0)deltaAngle+=Math.PI*2;if(deltaAngle>Math.PI*2)deltaAngle-=Math.PI*2;var angle;if(this.aClockwise===true){angle=this.aEndAngle+(1-t)*(Math.PI*2-deltaAngle);}else {angle=this.aStartAngle+t*deltaAngle;}var x=this.aX+this.xRadius*Math.cos(angle);var y=this.aY+this.yRadius*Math.sin(angle);if(this.aRotation!==0){var cos=Math.cos(this.aRotation);var sin=Math.sin(this.aRotation);var tx=x,ty=y; // Rotate the point about the center of the ellipse.
x=(tx-this.aX)*cos-(ty-this.aY)*sin+this.aX;y=(tx-this.aX)*sin+(ty-this.aY)*cos+this.aY;}return new THREE.Vector2(x,y);}; // File:src/extras/curves/ArcCurve.js
/**************************************************************
 *	Arc curve
 **************************************************************/THREE.ArcCurve=function(aX,aY,aRadius,aStartAngle,aEndAngle,aClockwise){THREE.EllipseCurve.call(this,aX,aY,aRadius,aRadius,aStartAngle,aEndAngle,aClockwise);};THREE.ArcCurve.prototype=Object.create(THREE.EllipseCurve.prototype);THREE.ArcCurve.prototype.constructor=THREE.ArcCurve; // File:src/extras/curves/LineCurve3.js
/**************************************************************
 *	Line3D
 **************************************************************/THREE.LineCurve3=THREE.Curve.create(function(v1,v2){this.v1=v1;this.v2=v2;},function(t){var vector=new THREE.Vector3();vector.subVectors(this.v2,this.v1); // diff
vector.multiplyScalar(t);vector.add(this.v1);return vector;}); // File:src/extras/curves/QuadraticBezierCurve3.js
/**************************************************************
 *	Quadratic Bezier 3D curve
 **************************************************************/THREE.QuadraticBezierCurve3=THREE.Curve.create(function(v0,v1,v2){this.v0=v0;this.v1=v1;this.v2=v2;},function(t){var b2=THREE.ShapeUtils.b2;return new THREE.Vector3(b2(t,this.v0.x,this.v1.x,this.v2.x),b2(t,this.v0.y,this.v1.y,this.v2.y),b2(t,this.v0.z,this.v1.z,this.v2.z));}); // File:src/extras/curves/CubicBezierCurve3.js
/**************************************************************
 *	Cubic Bezier 3D curve
 **************************************************************/THREE.CubicBezierCurve3=THREE.Curve.create(function(v0,v1,v2,v3){this.v0=v0;this.v1=v1;this.v2=v2;this.v3=v3;},function(t){var b3=THREE.ShapeUtils.b3;return new THREE.Vector3(b3(t,this.v0.x,this.v1.x,this.v2.x,this.v3.x),b3(t,this.v0.y,this.v1.y,this.v2.y,this.v3.y),b3(t,this.v0.z,this.v1.z,this.v2.z,this.v3.z));}); // File:src/extras/curves/SplineCurve3.js
/**************************************************************
 *	Spline 3D curve
 **************************************************************/THREE.SplineCurve3=THREE.Curve.create(function(points /* array of Vector3 */){console.warn('THREE.SplineCurve3 will be deprecated. Please use THREE.CatmullRomCurve3');this.points=points==undefined?[]:points;},function(t){var points=this.points;var point=(points.length-1)*t;var intPoint=Math.floor(point);var weight=point-intPoint;var point0=points[intPoint==0?intPoint:intPoint-1];var point1=points[intPoint];var point2=points[intPoint>points.length-2?points.length-1:intPoint+1];var point3=points[intPoint>points.length-3?points.length-1:intPoint+2];var interpolate=THREE.CurveUtils.interpolate;return new THREE.Vector3(interpolate(point0.x,point1.x,point2.x,point3.x,weight),interpolate(point0.y,point1.y,point2.y,point3.y,weight),interpolate(point0.z,point1.z,point2.z,point3.z,weight));}); // File:src/extras/curves/CatmullRomCurve3.js
/**
 * @author zz85 https://github.com/zz85
 *
 * Centripetal CatmullRom Curve - which is useful for avoiding
 * cusps and self-intersections in non-uniform catmull rom curves.
 * http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf
 *
 * curve.type accepts centripetal(default), chordal and catmullrom
 * curve.tension is used for catmullrom which defaults to 0.5
 */THREE.CatmullRomCurve3=function(){var tmp=new THREE.Vector3(),px=new CubicPoly(),py=new CubicPoly(),pz=new CubicPoly(); /*
	Based on an optimized c++ solution in
	 - http://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections/
	 - http://ideone.com/NoEbVM

	This CubicPoly class could be used for reusing some variables and calculations,
	but for three.js curve use, it could be possible inlined and flatten into a single function call
	which can be placed in CurveUtils.
	*/function CubicPoly(){} /*
	 * Compute coefficients for a cubic polynomial
	 *   p(s) = c0 + c1*s + c2*s^2 + c3*s^3
	 * such that
	 *   p(0) = x0, p(1) = x1
	 *  and
	 *   p'(0) = t0, p'(1) = t1.
	 */CubicPoly.prototype.init=function(x0,x1,t0,t1){this.c0=x0;this.c1=t0;this.c2=-3*x0+3*x1-2*t0-t1;this.c3=2*x0-2*x1+t0+t1;};CubicPoly.prototype.initNonuniformCatmullRom=function(x0,x1,x2,x3,dt0,dt1,dt2){ // compute tangents when parameterized in [t1,t2]
var t1=(x1-x0)/dt0-(x2-x0)/(dt0+dt1)+(x2-x1)/dt1;var t2=(x2-x1)/dt1-(x3-x1)/(dt1+dt2)+(x3-x2)/dt2; // rescale tangents for parametrization in [0,1]
t1*=dt1;t2*=dt1; // initCubicPoly
this.init(x1,x2,t1,t2);}; // standard Catmull-Rom spline: interpolate between x1 and x2 with previous/following points x1/x4
CubicPoly.prototype.initCatmullRom=function(x0,x1,x2,x3,tension){this.init(x1,x2,tension*(x2-x0),tension*(x3-x1));};CubicPoly.prototype.calc=function(t){var t2=t*t;var t3=t2*t;return this.c0+this.c1*t+this.c2*t2+this.c3*t3;}; // Subclass Three.js curve
return THREE.Curve.create(function(p /* array of Vector3 */){this.points=p||[];},function(t){var points=this.points,point,intPoint,weight,l;l=points.length;if(l<2)console.log('duh, you need at least 2 points');point=(l-1)*t;intPoint=Math.floor(point);weight=point-intPoint;if(weight===0&&intPoint===l-1){intPoint=l-2;weight=1;}var p0,p1,p2,p3;if(intPoint===0){ // extrapolate first point
tmp.subVectors(points[0],points[1]).add(points[0]);p0=tmp;}else {p0=points[intPoint-1];}p1=points[intPoint];p2=points[intPoint+1];if(intPoint+2<l){p3=points[intPoint+2];}else { // extrapolate last point
tmp.subVectors(points[l-1],points[l-2]).add(points[l-2]);p3=tmp;}if(this.type===undefined||this.type==='centripetal'||this.type==='chordal'){ // init Centripetal / Chordal Catmull-Rom
var pow=this.type==='chordal'?0.5:0.25;var dt0=Math.pow(p0.distanceToSquared(p1),pow);var dt1=Math.pow(p1.distanceToSquared(p2),pow);var dt2=Math.pow(p2.distanceToSquared(p3),pow); // safety check for repeated points
if(dt1<1e-4)dt1=1.0;if(dt0<1e-4)dt0=dt1;if(dt2<1e-4)dt2=dt1;px.initNonuniformCatmullRom(p0.x,p1.x,p2.x,p3.x,dt0,dt1,dt2);py.initNonuniformCatmullRom(p0.y,p1.y,p2.y,p3.y,dt0,dt1,dt2);pz.initNonuniformCatmullRom(p0.z,p1.z,p2.z,p3.z,dt0,dt1,dt2);}else if(this.type==='catmullrom'){var tension=this.tension!==undefined?this.tension:0.5;px.initCatmullRom(p0.x,p1.x,p2.x,p3.x,tension);py.initCatmullRom(p0.y,p1.y,p2.y,p3.y,tension);pz.initCatmullRom(p0.z,p1.z,p2.z,p3.z,tension);}var v=new THREE.Vector3(px.calc(weight),py.calc(weight),pz.calc(weight));return v;});}(); // File:src/extras/curves/ClosedSplineCurve3.js
/**************************************************************
 *	Closed Spline 3D curve
 **************************************************************/THREE.ClosedSplineCurve3=THREE.Curve.create(function(points /* array of Vector3 */){this.points=points==undefined?[]:points;},function(t){var points=this.points;var point=(points.length-0)*t; // This needs to be from 0-length +1
var intPoint=Math.floor(point);var weight=point-intPoint;intPoint+=intPoint>0?0:(Math.floor(Math.abs(intPoint)/points.length)+1)*points.length;var point0=points[(intPoint-1)%points.length];var point1=points[intPoint%points.length];var point2=points[(intPoint+1)%points.length];var point3=points[(intPoint+2)%points.length];var interpolate=THREE.CurveUtils.interpolate;return new THREE.Vector3(interpolate(point0.x,point1.x,point2.x,point3.x,weight),interpolate(point0.y,point1.y,point2.y,point3.y,weight),interpolate(point0.z,point1.z,point2.z,point3.z,weight));}); // File:src/extras/geometries/BoxGeometry.js
/**
 * @author mrdoob / http://mrdoob.com/
 * based on http://papervision3d.googlecode.com/svn/trunk/as3/trunk/src/org/papervision3d/objects/primitives/Cube.as
 */THREE.BoxGeometry=function(width,height,depth,widthSegments,heightSegments,depthSegments){THREE.Geometry.call(this);this.type='BoxGeometry';this.parameters={width:width,height:height,depth:depth,widthSegments:widthSegments,heightSegments:heightSegments,depthSegments:depthSegments};this.widthSegments=widthSegments||1;this.heightSegments=heightSegments||1;this.depthSegments=depthSegments||1;var scope=this;var width_half=width/2;var height_half=height/2;var depth_half=depth/2;buildPlane('z','y',-1,-1,depth,height,width_half,0); // px
buildPlane('z','y',1,-1,depth,height,-width_half,1); // nx
buildPlane('x','z',1,1,width,depth,height_half,2); // py
buildPlane('x','z',1,-1,width,depth,-height_half,3); // ny
buildPlane('x','y',1,-1,width,height,depth_half,4); // pz
buildPlane('x','y',-1,-1,width,height,-depth_half,5); // nz
function buildPlane(u,v,udir,vdir,width,height,depth,materialIndex){var w,ix,iy,gridX=scope.widthSegments,gridY=scope.heightSegments,width_half=width/2,height_half=height/2,offset=scope.vertices.length;if(u==='x'&&v==='y'||u==='y'&&v==='x'){w='z';}else if(u==='x'&&v==='z'||u==='z'&&v==='x'){w='y';gridY=scope.depthSegments;}else if(u==='z'&&v==='y'||u==='y'&&v==='z'){w='x';gridX=scope.depthSegments;}var gridX1=gridX+1,gridY1=gridY+1,segment_width=width/gridX,segment_height=height/gridY,normal=new THREE.Vector3();normal[w]=depth>0?1:-1;for(iy=0;iy<gridY1;iy++){for(ix=0;ix<gridX1;ix++){var vector=new THREE.Vector3();vector[u]=(ix*segment_width-width_half)*udir;vector[v]=(iy*segment_height-height_half)*vdir;vector[w]=depth;scope.vertices.push(vector);}}for(iy=0;iy<gridY;iy++){for(ix=0;ix<gridX;ix++){var a=ix+gridX1*iy;var b=ix+gridX1*(iy+1);var c=ix+1+gridX1*(iy+1);var d=ix+1+gridX1*iy;var uva=new THREE.Vector2(ix/gridX,1-iy/gridY);var uvb=new THREE.Vector2(ix/gridX,1-(iy+1)/gridY);var uvc=new THREE.Vector2((ix+1)/gridX,1-(iy+1)/gridY);var uvd=new THREE.Vector2((ix+1)/gridX,1-iy/gridY);var face=new THREE.Face3(a+offset,b+offset,d+offset);face.normal.copy(normal);face.vertexNormals.push(normal.clone(),normal.clone(),normal.clone());face.materialIndex=materialIndex;scope.faces.push(face);scope.faceVertexUvs[0].push([uva,uvb,uvd]);face=new THREE.Face3(b+offset,c+offset,d+offset);face.normal.copy(normal);face.vertexNormals.push(normal.clone(),normal.clone(),normal.clone());face.materialIndex=materialIndex;scope.faces.push(face);scope.faceVertexUvs[0].push([uvb.clone(),uvc,uvd.clone()]);}}}this.mergeVertices();};THREE.BoxGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.BoxGeometry.prototype.constructor=THREE.BoxGeometry;THREE.BoxGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.BoxGeometry(parameters.width,parameters.height,parameters.depth,parameters.widthSegments,parameters.heightSegments,parameters.depthSegments);};THREE.CubeGeometry=THREE.BoxGeometry; // backwards compatibility
// File:src/extras/geometries/CircleGeometry.js
/**
 * @author hughes
 */THREE.CircleGeometry=function(radius,segments,thetaStart,thetaLength){THREE.Geometry.call(this);this.type='CircleGeometry';this.parameters={radius:radius,segments:segments,thetaStart:thetaStart,thetaLength:thetaLength};this.fromBufferGeometry(new THREE.CircleBufferGeometry(radius,segments,thetaStart,thetaLength));};THREE.CircleGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.CircleGeometry.prototype.constructor=THREE.CircleGeometry;THREE.CircleGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.CircleGeometry(parameters.radius,parameters.segments,parameters.thetaStart,parameters.thetaLength);}; // File:src/extras/geometries/CircleBufferGeometry.js
/**
 * @author benaadams / https://twitter.com/ben_a_adams
 */THREE.CircleBufferGeometry=function(radius,segments,thetaStart,thetaLength){THREE.BufferGeometry.call(this);this.type='CircleBufferGeometry';this.parameters={radius:radius,segments:segments,thetaStart:thetaStart,thetaLength:thetaLength};radius=radius||50;segments=segments!==undefined?Math.max(3,segments):8;thetaStart=thetaStart!==undefined?thetaStart:0;thetaLength=thetaLength!==undefined?thetaLength:Math.PI*2;var vertices=segments+2;var positions=new Float32Array(vertices*3);var normals=new Float32Array(vertices*3);var uvs=new Float32Array(vertices*2); // center data is already zero, but need to set a few extras
normals[2]=1.0;uvs[0]=0.5;uvs[1]=0.5;for(var s=0,i=3,ii=2;s<=segments;s++,i+=3,ii+=2){var segment=thetaStart+s/segments*thetaLength;positions[i]=radius*Math.cos(segment);positions[i+1]=radius*Math.sin(segment);normals[i+2]=1; // normal z
uvs[ii]=(positions[i]/radius+1)/2;uvs[ii+1]=(positions[i+1]/radius+1)/2;}var indices=[];for(var i=1;i<=segments;i++){indices.push(i,i+1,0);}this.setIndex(new THREE.BufferAttribute(new Uint16Array(indices),1));this.addAttribute('position',new THREE.BufferAttribute(positions,3));this.addAttribute('normal',new THREE.BufferAttribute(normals,3));this.addAttribute('uv',new THREE.BufferAttribute(uvs,2));this.boundingSphere=new THREE.Sphere(new THREE.Vector3(),radius);};THREE.CircleBufferGeometry.prototype=Object.create(THREE.BufferGeometry.prototype);THREE.CircleBufferGeometry.prototype.constructor=THREE.CircleBufferGeometry;THREE.CircleBufferGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.CircleBufferGeometry(parameters.radius,parameters.segments,parameters.thetaStart,parameters.thetaLength);}; // File:src/extras/geometries/CylinderGeometry.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.CylinderGeometry=function(radiusTop,radiusBottom,height,radialSegments,heightSegments,openEnded,thetaStart,thetaLength){THREE.Geometry.call(this);this.type='CylinderGeometry';this.parameters={radiusTop:radiusTop,radiusBottom:radiusBottom,height:height,radialSegments:radialSegments,heightSegments:heightSegments,openEnded:openEnded,thetaStart:thetaStart,thetaLength:thetaLength};radiusTop=radiusTop!==undefined?radiusTop:20;radiusBottom=radiusBottom!==undefined?radiusBottom:20;height=height!==undefined?height:100;radialSegments=radialSegments||8;heightSegments=heightSegments||1;openEnded=openEnded!==undefined?openEnded:false;thetaStart=thetaStart!==undefined?thetaStart:0;thetaLength=thetaLength!==undefined?thetaLength:2*Math.PI;var heightHalf=height/2;var x,y,vertices=[],uvs=[];for(y=0;y<=heightSegments;y++){var verticesRow=[];var uvsRow=[];var v=y/heightSegments;var radius=v*(radiusBottom-radiusTop)+radiusTop;for(x=0;x<=radialSegments;x++){var u=x/radialSegments;var vertex=new THREE.Vector3();vertex.x=radius*Math.sin(u*thetaLength+thetaStart);vertex.y=-v*height+heightHalf;vertex.z=radius*Math.cos(u*thetaLength+thetaStart);this.vertices.push(vertex);verticesRow.push(this.vertices.length-1);uvsRow.push(new THREE.Vector2(u,1-v));}vertices.push(verticesRow);uvs.push(uvsRow);}var tanTheta=(radiusBottom-radiusTop)/height;var na,nb;for(x=0;x<radialSegments;x++){if(radiusTop!==0){na=this.vertices[vertices[0][x]].clone();nb=this.vertices[vertices[0][x+1]].clone();}else {na=this.vertices[vertices[1][x]].clone();nb=this.vertices[vertices[1][x+1]].clone();}na.setY(Math.sqrt(na.x*na.x+na.z*na.z)*tanTheta).normalize();nb.setY(Math.sqrt(nb.x*nb.x+nb.z*nb.z)*tanTheta).normalize();for(y=0;y<heightSegments;y++){var v1=vertices[y][x];var v2=vertices[y+1][x];var v3=vertices[y+1][x+1];var v4=vertices[y][x+1];var n1=na.clone();var n2=na.clone();var n3=nb.clone();var n4=nb.clone();var uv1=uvs[y][x].clone();var uv2=uvs[y+1][x].clone();var uv3=uvs[y+1][x+1].clone();var uv4=uvs[y][x+1].clone();this.faces.push(new THREE.Face3(v1,v2,v4,[n1,n2,n4]));this.faceVertexUvs[0].push([uv1,uv2,uv4]);this.faces.push(new THREE.Face3(v2,v3,v4,[n2.clone(),n3,n4.clone()]));this.faceVertexUvs[0].push([uv2.clone(),uv3,uv4.clone()]);}} // top cap
if(openEnded===false&&radiusTop>0){this.vertices.push(new THREE.Vector3(0,heightHalf,0));for(x=0;x<radialSegments;x++){var v1=vertices[0][x];var v2=vertices[0][x+1];var v3=this.vertices.length-1;var n1=new THREE.Vector3(0,1,0);var n2=new THREE.Vector3(0,1,0);var n3=new THREE.Vector3(0,1,0);var uv1=uvs[0][x].clone();var uv2=uvs[0][x+1].clone();var uv3=new THREE.Vector2(uv2.x,0);this.faces.push(new THREE.Face3(v1,v2,v3,[n1,n2,n3],undefined,1));this.faceVertexUvs[0].push([uv1,uv2,uv3]);}} // bottom cap
if(openEnded===false&&radiusBottom>0){this.vertices.push(new THREE.Vector3(0,-heightHalf,0));for(x=0;x<radialSegments;x++){var v1=vertices[heightSegments][x+1];var v2=vertices[heightSegments][x];var v3=this.vertices.length-1;var n1=new THREE.Vector3(0,-1,0);var n2=new THREE.Vector3(0,-1,0);var n3=new THREE.Vector3(0,-1,0);var uv1=uvs[heightSegments][x+1].clone();var uv2=uvs[heightSegments][x].clone();var uv3=new THREE.Vector2(uv2.x,1);this.faces.push(new THREE.Face3(v1,v2,v3,[n1,n2,n3],undefined,2));this.faceVertexUvs[0].push([uv1,uv2,uv3]);}}this.computeFaceNormals();};THREE.CylinderGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.CylinderGeometry.prototype.constructor=THREE.CylinderGeometry;THREE.CylinderGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.CylinderGeometry(parameters.radiusTop,parameters.radiusBottom,parameters.height,parameters.radialSegments,parameters.heightSegments,parameters.openEnded,parameters.thetaStart,parameters.thetaLength);}; // File:src/extras/geometries/EdgesGeometry.js
/**
 * @author WestLangley / http://github.com/WestLangley
 */THREE.EdgesGeometry=function(geometry,thresholdAngle){THREE.BufferGeometry.call(this);thresholdAngle=thresholdAngle!==undefined?thresholdAngle:1;var thresholdDot=Math.cos(THREE.Math.degToRad(thresholdAngle));var edge=[0,0],hash={};function sortFunction(a,b){return a-b;}var keys=['a','b','c'];var geometry2;if(geometry instanceof THREE.BufferGeometry){geometry2=new THREE.Geometry();geometry2.fromBufferGeometry(geometry);}else {geometry2=geometry.clone();}geometry2.mergeVertices();geometry2.computeFaceNormals();var vertices=geometry2.vertices;var faces=geometry2.faces;for(var i=0,l=faces.length;i<l;i++){var face=faces[i];for(var j=0;j<3;j++){edge[0]=face[keys[j]];edge[1]=face[keys[(j+1)%3]];edge.sort(sortFunction);var key=edge.toString();if(hash[key]===undefined){hash[key]={vert1:edge[0],vert2:edge[1],face1:i,face2:undefined};}else {hash[key].face2=i;}}}var coords=[];for(var key in hash){var h=hash[key];if(h.face2===undefined||faces[h.face1].normal.dot(faces[h.face2].normal)<=thresholdDot){var vertex=vertices[h.vert1];coords.push(vertex.x);coords.push(vertex.y);coords.push(vertex.z);vertex=vertices[h.vert2];coords.push(vertex.x);coords.push(vertex.y);coords.push(vertex.z);}}this.addAttribute('position',new THREE.BufferAttribute(new Float32Array(coords),3));};THREE.EdgesGeometry.prototype=Object.create(THREE.BufferGeometry.prototype);THREE.EdgesGeometry.prototype.constructor=THREE.EdgesGeometry; // File:src/extras/geometries/ExtrudeGeometry.js
/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 * Creates extruded geometry from a path shape.
 *
 * parameters = {
 *
 *  curveSegments: <int>, // number of points on the curves
 *  steps: <int>, // number of points for z-side extrusions / used for subdividing segments of extrude spline too
 *  amount: <int>, // Depth to extrude the shape
 *
 *  bevelEnabled: <bool>, // turn on bevel
 *  bevelThickness: <float>, // how deep into the original shape bevel goes
 *  bevelSize: <float>, // how far from shape outline is bevel
 *  bevelSegments: <int>, // number of bevel layers
 *
 *  extrudePath: <THREE.CurvePath> // 3d spline path to extrude shape along. (creates Frames if .frames aren't defined)
 *  frames: <THREE.TubeGeometry.FrenetFrames> // containing arrays of tangents, normals, binormals
 *
 *  uvGenerator: <Object> // object that provides UV generator functions
 *
 * }
 **/THREE.ExtrudeGeometry=function(shapes,options){if(typeof shapes==="undefined"){shapes=[];return;}THREE.Geometry.call(this);this.type='ExtrudeGeometry';shapes=Array.isArray(shapes)?shapes:[shapes];this.addShapeList(shapes,options);this.computeFaceNormals(); // can't really use automatic vertex normals
// as then front and back sides get smoothed too
// should do separate smoothing just for sides
//this.computeVertexNormals();
//console.log( "took", ( Date.now() - startTime ) );
};THREE.ExtrudeGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.ExtrudeGeometry.prototype.constructor=THREE.ExtrudeGeometry;THREE.ExtrudeGeometry.prototype.addShapeList=function(shapes,options){var sl=shapes.length;for(var s=0;s<sl;s++){var shape=shapes[s];this.addShape(shape,options);}};THREE.ExtrudeGeometry.prototype.addShape=function(shape,options){var amount=options.amount!==undefined?options.amount:100;var bevelThickness=options.bevelThickness!==undefined?options.bevelThickness:6; // 10
var bevelSize=options.bevelSize!==undefined?options.bevelSize:bevelThickness-2; // 8
var bevelSegments=options.bevelSegments!==undefined?options.bevelSegments:3;var bevelEnabled=options.bevelEnabled!==undefined?options.bevelEnabled:true; // false
var curveSegments=options.curveSegments!==undefined?options.curveSegments:12;var steps=options.steps!==undefined?options.steps:1;var extrudePath=options.extrudePath;var extrudePts,extrudeByPath=false; // Use default WorldUVGenerator if no UV generators are specified.
var uvgen=options.UVGenerator!==undefined?options.UVGenerator:THREE.ExtrudeGeometry.WorldUVGenerator;var splineTube,binormal,normal,position2;if(extrudePath){extrudePts=extrudePath.getSpacedPoints(steps);extrudeByPath=true;bevelEnabled=false; // bevels not supported for path extrusion
// SETUP TNB variables
// Reuse TNB from TubeGeomtry for now.
// TODO1 - have a .isClosed in spline?
splineTube=options.frames!==undefined?options.frames:new THREE.TubeGeometry.FrenetFrames(extrudePath,steps,false); // console.log(splineTube, 'splineTube', splineTube.normals.length, 'steps', steps, 'extrudePts', extrudePts.length);
binormal=new THREE.Vector3();normal=new THREE.Vector3();position2=new THREE.Vector3();} // Safeguards if bevels are not enabled
if(!bevelEnabled){bevelSegments=0;bevelThickness=0;bevelSize=0;} // Variables initialization
var ahole,h,hl; // looping of holes
var scope=this;var shapesOffset=this.vertices.length;var shapePoints=shape.extractPoints(curveSegments);var vertices=shapePoints.shape;var holes=shapePoints.holes;var reverse=!THREE.ShapeUtils.isClockWise(vertices);if(reverse){vertices=vertices.reverse(); // Maybe we should also check if holes are in the opposite direction, just to be safe ...
for(h=0,hl=holes.length;h<hl;h++){ahole=holes[h];if(THREE.ShapeUtils.isClockWise(ahole)){holes[h]=ahole.reverse();}}reverse=false; // If vertices are in order now, we shouldn't need to worry about them again (hopefully)!
}var faces=THREE.ShapeUtils.triangulateShape(vertices,holes); /* Vertices */var contour=vertices; // vertices has all points but contour has only points of circumference
for(h=0,hl=holes.length;h<hl;h++){ahole=holes[h];vertices=vertices.concat(ahole);}function scalePt2(pt,vec,size){if(!vec)console.error("THREE.ExtrudeGeometry: vec does not exist");return vec.clone().multiplyScalar(size).add(pt);}var b,bs,t,z,vert,vlen=vertices.length,face,flen=faces.length; // Find directions for point movement
function getBevelVec(inPt,inPrev,inNext){ // computes for inPt the corresponding point inPt' on a new contour
//   shifted by 1 unit (length of normalized vector) to the left
// if we walk along contour clockwise, this new contour is outside the old one
//
// inPt' is the intersection of the two lines parallel to the two
//  adjacent edges of inPt at a distance of 1 unit on the left side.
var v_trans_x,v_trans_y,shrink_by=1; // resulting translation vector for inPt
// good reading for geometry algorithms (here: line-line intersection)
// http://geomalgorithms.com/a05-_intersect-1.html
var v_prev_x=inPt.x-inPrev.x,v_prev_y=inPt.y-inPrev.y;var v_next_x=inNext.x-inPt.x,v_next_y=inNext.y-inPt.y;var v_prev_lensq=v_prev_x*v_prev_x+v_prev_y*v_prev_y; // check for collinear edges
var collinear0=v_prev_x*v_next_y-v_prev_y*v_next_x;if(Math.abs(collinear0)>Number.EPSILON){ // not collinear
// length of vectors for normalizing
var v_prev_len=Math.sqrt(v_prev_lensq);var v_next_len=Math.sqrt(v_next_x*v_next_x+v_next_y*v_next_y); // shift adjacent points by unit vectors to the left
var ptPrevShift_x=inPrev.x-v_prev_y/v_prev_len;var ptPrevShift_y=inPrev.y+v_prev_x/v_prev_len;var ptNextShift_x=inNext.x-v_next_y/v_next_len;var ptNextShift_y=inNext.y+v_next_x/v_next_len; // scaling factor for v_prev to intersection point
var sf=((ptNextShift_x-ptPrevShift_x)*v_next_y-(ptNextShift_y-ptPrevShift_y)*v_next_x)/(v_prev_x*v_next_y-v_prev_y*v_next_x); // vector from inPt to intersection point
v_trans_x=ptPrevShift_x+v_prev_x*sf-inPt.x;v_trans_y=ptPrevShift_y+v_prev_y*sf-inPt.y; // Don't normalize!, otherwise sharp corners become ugly
//  but prevent crazy spikes
var v_trans_lensq=v_trans_x*v_trans_x+v_trans_y*v_trans_y;if(v_trans_lensq<=2){return new THREE.Vector2(v_trans_x,v_trans_y);}else {shrink_by=Math.sqrt(v_trans_lensq/2);}}else { // handle special case of collinear edges
var direction_eq=false; // assumes: opposite
if(v_prev_x>Number.EPSILON){if(v_next_x>Number.EPSILON){direction_eq=true;}}else {if(v_prev_x<-Number.EPSILON){if(v_next_x<-Number.EPSILON){direction_eq=true;}}else {if(Math.sign(v_prev_y)===Math.sign(v_next_y)){direction_eq=true;}}}if(direction_eq){ // console.log("Warning: lines are a straight sequence");
v_trans_x=-v_prev_y;v_trans_y=v_prev_x;shrink_by=Math.sqrt(v_prev_lensq);}else { // console.log("Warning: lines are a straight spike");
v_trans_x=v_prev_x;v_trans_y=v_prev_y;shrink_by=Math.sqrt(v_prev_lensq/2);}}return new THREE.Vector2(v_trans_x/shrink_by,v_trans_y/shrink_by);}var contourMovements=[];for(var i=0,il=contour.length,j=il-1,k=i+1;i<il;i++,j++,k++){if(j===il)j=0;if(k===il)k=0; //  (j)---(i)---(k)
// console.log('i,j,k', i, j , k)
contourMovements[i]=getBevelVec(contour[i],contour[j],contour[k]);}var holesMovements=[],oneHoleMovements,verticesMovements=contourMovements.concat();for(h=0,hl=holes.length;h<hl;h++){ahole=holes[h];oneHoleMovements=[];for(i=0,il=ahole.length,j=il-1,k=i+1;i<il;i++,j++,k++){if(j===il)j=0;if(k===il)k=0; //  (j)---(i)---(k)
oneHoleMovements[i]=getBevelVec(ahole[i],ahole[j],ahole[k]);}holesMovements.push(oneHoleMovements);verticesMovements=verticesMovements.concat(oneHoleMovements);} // Loop bevelSegments, 1 for the front, 1 for the back
for(b=0;b<bevelSegments;b++){ //for ( b = bevelSegments; b > 0; b -- ) {
t=b/bevelSegments;z=bevelThickness*(1-t); //z = bevelThickness * t;
bs=bevelSize*Math.sin(t*Math.PI/2); // curved
//bs = bevelSize * t; // linear
// contract shape
for(i=0,il=contour.length;i<il;i++){vert=scalePt2(contour[i],contourMovements[i],bs);v(vert.x,vert.y,-z);} // expand holes
for(h=0,hl=holes.length;h<hl;h++){ahole=holes[h];oneHoleMovements=holesMovements[h];for(i=0,il=ahole.length;i<il;i++){vert=scalePt2(ahole[i],oneHoleMovements[i],bs);v(vert.x,vert.y,-z);}}}bs=bevelSize; // Back facing vertices
for(i=0;i<vlen;i++){vert=bevelEnabled?scalePt2(vertices[i],verticesMovements[i],bs):vertices[i];if(!extrudeByPath){v(vert.x,vert.y,0);}else { // v( vert.x, vert.y + extrudePts[ 0 ].y, extrudePts[ 0 ].x );
normal.copy(splineTube.normals[0]).multiplyScalar(vert.x);binormal.copy(splineTube.binormals[0]).multiplyScalar(vert.y);position2.copy(extrudePts[0]).add(normal).add(binormal);v(position2.x,position2.y,position2.z);}} // Add stepped vertices...
// Including front facing vertices
var s;for(s=1;s<=steps;s++){for(i=0;i<vlen;i++){vert=bevelEnabled?scalePt2(vertices[i],verticesMovements[i],bs):vertices[i];if(!extrudeByPath){v(vert.x,vert.y,amount/steps*s);}else { // v( vert.x, vert.y + extrudePts[ s - 1 ].y, extrudePts[ s - 1 ].x );
normal.copy(splineTube.normals[s]).multiplyScalar(vert.x);binormal.copy(splineTube.binormals[s]).multiplyScalar(vert.y);position2.copy(extrudePts[s]).add(normal).add(binormal);v(position2.x,position2.y,position2.z);}}} // Add bevel segments planes
//for ( b = 1; b <= bevelSegments; b ++ ) {
for(b=bevelSegments-1;b>=0;b--){t=b/bevelSegments;z=bevelThickness*(1-t); //bs = bevelSize * ( 1-Math.sin ( ( 1 - t ) * Math.PI/2 ) );
bs=bevelSize*Math.sin(t*Math.PI/2); // contract shape
for(i=0,il=contour.length;i<il;i++){vert=scalePt2(contour[i],contourMovements[i],bs);v(vert.x,vert.y,amount+z);} // expand holes
for(h=0,hl=holes.length;h<hl;h++){ahole=holes[h];oneHoleMovements=holesMovements[h];for(i=0,il=ahole.length;i<il;i++){vert=scalePt2(ahole[i],oneHoleMovements[i],bs);if(!extrudeByPath){v(vert.x,vert.y,amount+z);}else {v(vert.x,vert.y+extrudePts[steps-1].y,extrudePts[steps-1].x+z);}}}} /* Faces */ // Top and bottom faces
buildLidFaces(); // Sides faces
buildSideFaces(); /////  Internal functions
function buildLidFaces(){if(bevelEnabled){var layer=0; // steps + 1
var offset=vlen*layer; // Bottom faces
for(i=0;i<flen;i++){face=faces[i];f3(face[2]+offset,face[1]+offset,face[0]+offset);}layer=steps+bevelSegments*2;offset=vlen*layer; // Top faces
for(i=0;i<flen;i++){face=faces[i];f3(face[0]+offset,face[1]+offset,face[2]+offset);}}else { // Bottom faces
for(i=0;i<flen;i++){face=faces[i];f3(face[2],face[1],face[0]);} // Top faces
for(i=0;i<flen;i++){face=faces[i];f3(face[0]+vlen*steps,face[1]+vlen*steps,face[2]+vlen*steps);}}} // Create faces for the z-sides of the shape
function buildSideFaces(){var layeroffset=0;sidewalls(contour,layeroffset);layeroffset+=contour.length;for(h=0,hl=holes.length;h<hl;h++){ahole=holes[h];sidewalls(ahole,layeroffset); //, true
layeroffset+=ahole.length;}}function sidewalls(contour,layeroffset){var j,k;i=contour.length;while(--i>=0){j=i;k=i-1;if(k<0)k=contour.length-1; //console.log('b', i,j, i-1, k,vertices.length);
var s=0,sl=steps+bevelSegments*2;for(s=0;s<sl;s++){var slen1=vlen*s;var slen2=vlen*(s+1);var a=layeroffset+j+slen1,b=layeroffset+k+slen1,c=layeroffset+k+slen2,d=layeroffset+j+slen2;f4(a,b,c,d,contour,s,sl,j,k);}}}function v(x,y,z){scope.vertices.push(new THREE.Vector3(x,y,z));}function f3(a,b,c){a+=shapesOffset;b+=shapesOffset;c+=shapesOffset;scope.faces.push(new THREE.Face3(a,b,c,null,null,0));var uvs=uvgen.generateTopUV(scope,a,b,c);scope.faceVertexUvs[0].push(uvs);}function f4(a,b,c,d,wallContour,stepIndex,stepsLength,contourIndex1,contourIndex2){a+=shapesOffset;b+=shapesOffset;c+=shapesOffset;d+=shapesOffset;scope.faces.push(new THREE.Face3(a,b,d,null,null,1));scope.faces.push(new THREE.Face3(b,c,d,null,null,1));var uvs=uvgen.generateSideWallUV(scope,a,b,c,d);scope.faceVertexUvs[0].push([uvs[0],uvs[1],uvs[3]]);scope.faceVertexUvs[0].push([uvs[1],uvs[2],uvs[3]]);}};THREE.ExtrudeGeometry.WorldUVGenerator={generateTopUV:function generateTopUV(geometry,indexA,indexB,indexC){var vertices=geometry.vertices;var a=vertices[indexA];var b=vertices[indexB];var c=vertices[indexC];return [new THREE.Vector2(a.x,a.y),new THREE.Vector2(b.x,b.y),new THREE.Vector2(c.x,c.y)];},generateSideWallUV:function generateSideWallUV(geometry,indexA,indexB,indexC,indexD){var vertices=geometry.vertices;var a=vertices[indexA];var b=vertices[indexB];var c=vertices[indexC];var d=vertices[indexD];if(Math.abs(a.y-b.y)<0.01){return [new THREE.Vector2(a.x,1-a.z),new THREE.Vector2(b.x,1-b.z),new THREE.Vector2(c.x,1-c.z),new THREE.Vector2(d.x,1-d.z)];}else {return [new THREE.Vector2(a.y,1-a.z),new THREE.Vector2(b.y,1-b.z),new THREE.Vector2(c.y,1-c.z),new THREE.Vector2(d.y,1-d.z)];}}}; // File:src/extras/geometries/ShapeGeometry.js
/**
 * @author jonobr1 / http://jonobr1.com
 *
 * Creates a one-sided polygonal geometry from a path shape. Similar to
 * ExtrudeGeometry.
 *
 * parameters = {
 *
 *	curveSegments: <int>, // number of points on the curves. NOT USED AT THE MOMENT.
 *
 *	material: <int> // material index for front and back faces
 *	uvGenerator: <Object> // object that provides UV generator functions
 *
 * }
 **/THREE.ShapeGeometry=function(shapes,options){THREE.Geometry.call(this);this.type='ShapeGeometry';if(Array.isArray(shapes)===false)shapes=[shapes];this.addShapeList(shapes,options);this.computeFaceNormals();};THREE.ShapeGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.ShapeGeometry.prototype.constructor=THREE.ShapeGeometry; /**
 * Add an array of shapes to THREE.ShapeGeometry.
 */THREE.ShapeGeometry.prototype.addShapeList=function(shapes,options){for(var i=0,l=shapes.length;i<l;i++){this.addShape(shapes[i],options);}return this;}; /**
 * Adds a shape to THREE.ShapeGeometry, based on THREE.ExtrudeGeometry.
 */THREE.ShapeGeometry.prototype.addShape=function(shape,options){if(options===undefined)options={};var curveSegments=options.curveSegments!==undefined?options.curveSegments:12;var material=options.material;var uvgen=options.UVGenerator===undefined?THREE.ExtrudeGeometry.WorldUVGenerator:options.UVGenerator; //
var i,l,hole;var shapesOffset=this.vertices.length;var shapePoints=shape.extractPoints(curveSegments);var vertices=shapePoints.shape;var holes=shapePoints.holes;var reverse=!THREE.ShapeUtils.isClockWise(vertices);if(reverse){vertices=vertices.reverse(); // Maybe we should also check if holes are in the opposite direction, just to be safe...
for(i=0,l=holes.length;i<l;i++){hole=holes[i];if(THREE.ShapeUtils.isClockWise(hole)){holes[i]=hole.reverse();}}reverse=false;}var faces=THREE.ShapeUtils.triangulateShape(vertices,holes); // Vertices
for(i=0,l=holes.length;i<l;i++){hole=holes[i];vertices=vertices.concat(hole);} //
var vert,vlen=vertices.length;var face,flen=faces.length;for(i=0;i<vlen;i++){vert=vertices[i];this.vertices.push(new THREE.Vector3(vert.x,vert.y,0));}for(i=0;i<flen;i++){face=faces[i];var a=face[0]+shapesOffset;var b=face[1]+shapesOffset;var c=face[2]+shapesOffset;this.faces.push(new THREE.Face3(a,b,c,null,null,material));this.faceVertexUvs[0].push(uvgen.generateTopUV(this,a,b,c));}}; // File:src/extras/geometries/LatheGeometry.js
/**
 * @author astrodud / http://astrodud.isgreat.org/
 * @author zz85 / https://github.com/zz85
 * @author bhouston / http://clara.io
 */ // points - to create a closed torus, one must use a set of points 
//    like so: [ a, b, c, d, a ], see first is the same as last.
// segments - the number of circumference segments to create
// phiStart - the starting radian
// phiLength - the radian (0 to 2*PI) range of the lathed section
//    2*pi is a closed lathe, less than 2PI is a portion.
THREE.LatheGeometry=function(points,segments,phiStart,phiLength){THREE.Geometry.call(this);this.type='LatheGeometry';this.parameters={points:points,segments:segments,phiStart:phiStart,phiLength:phiLength};segments=segments||12;phiStart=phiStart||0;phiLength=phiLength||2*Math.PI;var inversePointLength=1.0/(points.length-1);var inverseSegments=1.0/segments;for(var i=0,il=segments;i<=il;i++){var phi=phiStart+i*inverseSegments*phiLength;var c=Math.cos(phi),s=Math.sin(phi);for(var j=0,jl=points.length;j<jl;j++){var pt=points[j];var vertex=new THREE.Vector3();vertex.x=c*pt.x-s*pt.y;vertex.y=s*pt.x+c*pt.y;vertex.z=pt.z;this.vertices.push(vertex);}}var np=points.length;for(var i=0,il=segments;i<il;i++){for(var j=0,jl=points.length-1;j<jl;j++){var base=j+np*i;var a=base;var b=base+np;var c=base+1+np;var d=base+1;var u0=i*inverseSegments;var v0=j*inversePointLength;var u1=u0+inverseSegments;var v1=v0+inversePointLength;this.faces.push(new THREE.Face3(a,b,d));this.faceVertexUvs[0].push([new THREE.Vector2(u0,v0),new THREE.Vector2(u1,v0),new THREE.Vector2(u0,v1)]);this.faces.push(new THREE.Face3(b,c,d));this.faceVertexUvs[0].push([new THREE.Vector2(u1,v0),new THREE.Vector2(u1,v1),new THREE.Vector2(u0,v1)]);}}this.mergeVertices();this.computeFaceNormals();this.computeVertexNormals();};THREE.LatheGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.LatheGeometry.prototype.constructor=THREE.LatheGeometry; // File:src/extras/geometries/PlaneGeometry.js
/**
 * @author mrdoob / http://mrdoob.com/
 * based on http://papervision3d.googlecode.com/svn/trunk/as3/trunk/src/org/papervision3d/objects/primitives/Plane.as
 */THREE.PlaneGeometry=function(width,height,widthSegments,heightSegments){THREE.Geometry.call(this);this.type='PlaneGeometry';this.parameters={width:width,height:height,widthSegments:widthSegments,heightSegments:heightSegments};this.fromBufferGeometry(new THREE.PlaneBufferGeometry(width,height,widthSegments,heightSegments));};THREE.PlaneGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.PlaneGeometry.prototype.constructor=THREE.PlaneGeometry;THREE.PlaneGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.PlaneGeometry(parameters.width,parameters.height,parameters.widthSegments,parameters.heightSegments);}; // File:src/extras/geometries/PlaneBufferGeometry.js
/**
 * @author mrdoob / http://mrdoob.com/
 * based on http://papervision3d.googlecode.com/svn/trunk/as3/trunk/src/org/papervision3d/objects/primitives/Plane.as
 */THREE.PlaneBufferGeometry=function(width,height,widthSegments,heightSegments){THREE.BufferGeometry.call(this);this.type='PlaneBufferGeometry';this.parameters={width:width,height:height,widthSegments:widthSegments,heightSegments:heightSegments};var width_half=width/2;var height_half=height/2;var gridX=Math.floor(widthSegments)||1;var gridY=Math.floor(heightSegments)||1;var gridX1=gridX+1;var gridY1=gridY+1;var segment_width=width/gridX;var segment_height=height/gridY;var vertices=new Float32Array(gridX1*gridY1*3);var normals=new Float32Array(gridX1*gridY1*3);var uvs=new Float32Array(gridX1*gridY1*2);var offset=0;var offset2=0;for(var iy=0;iy<gridY1;iy++){var y=iy*segment_height-height_half;for(var ix=0;ix<gridX1;ix++){var x=ix*segment_width-width_half;vertices[offset]=x;vertices[offset+1]=-y;normals[offset+2]=1;uvs[offset2]=ix/gridX;uvs[offset2+1]=1-iy/gridY;offset+=3;offset2+=2;}}offset=0;var indices=new (vertices.length/3>65535?Uint32Array:Uint16Array)(gridX*gridY*6);for(var iy=0;iy<gridY;iy++){for(var ix=0;ix<gridX;ix++){var a=ix+gridX1*iy;var b=ix+gridX1*(iy+1);var c=ix+1+gridX1*(iy+1);var d=ix+1+gridX1*iy;indices[offset]=a;indices[offset+1]=b;indices[offset+2]=d;indices[offset+3]=b;indices[offset+4]=c;indices[offset+5]=d;offset+=6;}}this.setIndex(new THREE.BufferAttribute(indices,1));this.addAttribute('position',new THREE.BufferAttribute(vertices,3));this.addAttribute('normal',new THREE.BufferAttribute(normals,3));this.addAttribute('uv',new THREE.BufferAttribute(uvs,2));};THREE.PlaneBufferGeometry.prototype=Object.create(THREE.BufferGeometry.prototype);THREE.PlaneBufferGeometry.prototype.constructor=THREE.PlaneBufferGeometry;THREE.PlaneBufferGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.PlaneBufferGeometry(parameters.width,parameters.height,parameters.widthSegments,parameters.heightSegments);}; // File:src/extras/geometries/RingGeometry.js
/**
 * @author Kaleb Murphy
 */THREE.RingGeometry=function(innerRadius,outerRadius,thetaSegments,phiSegments,thetaStart,thetaLength){THREE.Geometry.call(this);this.type='RingGeometry';this.parameters={innerRadius:innerRadius,outerRadius:outerRadius,thetaSegments:thetaSegments,phiSegments:phiSegments,thetaStart:thetaStart,thetaLength:thetaLength};innerRadius=innerRadius||0;outerRadius=outerRadius||50;thetaStart=thetaStart!==undefined?thetaStart:0;thetaLength=thetaLength!==undefined?thetaLength:Math.PI*2;thetaSegments=thetaSegments!==undefined?Math.max(3,thetaSegments):8;phiSegments=phiSegments!==undefined?Math.max(1,phiSegments):8;var i,o,uvs=[],radius=innerRadius,radiusStep=(outerRadius-innerRadius)/phiSegments;for(i=0;i<phiSegments+1;i++){ // concentric circles inside ring
for(o=0;o<thetaSegments+1;o++){ // number of segments per circle
var vertex=new THREE.Vector3();var segment=thetaStart+o/thetaSegments*thetaLength;vertex.x=radius*Math.cos(segment);vertex.y=radius*Math.sin(segment);this.vertices.push(vertex);uvs.push(new THREE.Vector2((vertex.x/outerRadius+1)/2,(vertex.y/outerRadius+1)/2));}radius+=radiusStep;}var n=new THREE.Vector3(0,0,1);for(i=0;i<phiSegments;i++){ // concentric circles inside ring
var thetaSegment=i*(thetaSegments+1);for(o=0;o<thetaSegments;o++){ // number of segments per circle
var segment=o+thetaSegment;var v1=segment;var v2=segment+thetaSegments+1;var v3=segment+thetaSegments+2;this.faces.push(new THREE.Face3(v1,v2,v3,[n.clone(),n.clone(),n.clone()]));this.faceVertexUvs[0].push([uvs[v1].clone(),uvs[v2].clone(),uvs[v3].clone()]);v1=segment;v2=segment+thetaSegments+2;v3=segment+1;this.faces.push(new THREE.Face3(v1,v2,v3,[n.clone(),n.clone(),n.clone()]));this.faceVertexUvs[0].push([uvs[v1].clone(),uvs[v2].clone(),uvs[v3].clone()]);}}this.computeFaceNormals();this.boundingSphere=new THREE.Sphere(new THREE.Vector3(),radius);};THREE.RingGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.RingGeometry.prototype.constructor=THREE.RingGeometry;THREE.RingGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.RingGeometry(parameters.innerRadius,parameters.outerRadius,parameters.thetaSegments,parameters.phiSegments,parameters.thetaStart,parameters.thetaLength);}; // File:src/extras/geometries/SphereGeometry.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.SphereGeometry=function(radius,widthSegments,heightSegments,phiStart,phiLength,thetaStart,thetaLength){THREE.Geometry.call(this);this.type='SphereGeometry';this.parameters={radius:radius,widthSegments:widthSegments,heightSegments:heightSegments,phiStart:phiStart,phiLength:phiLength,thetaStart:thetaStart,thetaLength:thetaLength};this.fromBufferGeometry(new THREE.SphereBufferGeometry(radius,widthSegments,heightSegments,phiStart,phiLength,thetaStart,thetaLength));};THREE.SphereGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.SphereGeometry.prototype.constructor=THREE.SphereGeometry;THREE.SphereGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.SphereGeometry(parameters.radius,parameters.widthSegments,parameters.heightSegments,parameters.phiStart,parameters.phiLength,parameters.thetaStart,parameters.thetaLength);}; // File:src/extras/geometries/SphereBufferGeometry.js
/**
 * @author benaadams / https://twitter.com/ben_a_adams
 * based on THREE.SphereGeometry
 */THREE.SphereBufferGeometry=function(radius,widthSegments,heightSegments,phiStart,phiLength,thetaStart,thetaLength){THREE.BufferGeometry.call(this);this.type='SphereBufferGeometry';this.parameters={radius:radius,widthSegments:widthSegments,heightSegments:heightSegments,phiStart:phiStart,phiLength:phiLength,thetaStart:thetaStart,thetaLength:thetaLength};radius=radius||50;widthSegments=Math.max(3,Math.floor(widthSegments)||8);heightSegments=Math.max(2,Math.floor(heightSegments)||6);phiStart=phiStart!==undefined?phiStart:0;phiLength=phiLength!==undefined?phiLength:Math.PI*2;thetaStart=thetaStart!==undefined?thetaStart:0;thetaLength=thetaLength!==undefined?thetaLength:Math.PI;var thetaEnd=thetaStart+thetaLength;var vertexCount=(widthSegments+1)*(heightSegments+1);var positions=new THREE.BufferAttribute(new Float32Array(vertexCount*3),3);var normals=new THREE.BufferAttribute(new Float32Array(vertexCount*3),3);var uvs=new THREE.BufferAttribute(new Float32Array(vertexCount*2),2);var index=0,vertices=[],normal=new THREE.Vector3();for(var y=0;y<=heightSegments;y++){var verticesRow=[];var v=y/heightSegments;for(var x=0;x<=widthSegments;x++){var u=x/widthSegments;var px=-radius*Math.cos(phiStart+u*phiLength)*Math.sin(thetaStart+v*thetaLength);var py=radius*Math.cos(thetaStart+v*thetaLength);var pz=radius*Math.sin(phiStart+u*phiLength)*Math.sin(thetaStart+v*thetaLength);normal.set(px,py,pz).normalize();positions.setXYZ(index,px,py,pz);normals.setXYZ(index,normal.x,normal.y,normal.z);uvs.setXY(index,u,1-v);verticesRow.push(index);index++;}vertices.push(verticesRow);}var indices=[];for(var y=0;y<heightSegments;y++){for(var x=0;x<widthSegments;x++){var v1=vertices[y][x+1];var v2=vertices[y][x];var v3=vertices[y+1][x];var v4=vertices[y+1][x+1];if(y!==0||thetaStart>0)indices.push(v1,v2,v4);if(y!==heightSegments-1||thetaEnd<Math.PI)indices.push(v2,v3,v4);}}this.setIndex(new (positions.count>65535?THREE.Uint32Attribute:THREE.Uint16Attribute)(indices,1));this.addAttribute('position',positions);this.addAttribute('normal',normals);this.addAttribute('uv',uvs);this.boundingSphere=new THREE.Sphere(new THREE.Vector3(),radius);};THREE.SphereBufferGeometry.prototype=Object.create(THREE.BufferGeometry.prototype);THREE.SphereBufferGeometry.prototype.constructor=THREE.SphereBufferGeometry;THREE.SphereBufferGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.SphereBufferGeometry(parameters.radius,parameters.widthSegments,parameters.heightSegments,parameters.phiStart,parameters.phiLength,parameters.thetaStart,parameters.thetaLength);}; // File:src/extras/geometries/TorusGeometry.js
/**
 * @author oosmoxiecode
 * @author mrdoob / http://mrdoob.com/
 * based on http://code.google.com/p/away3d/source/browse/trunk/fp10/Away3DLite/src/away3dlite/primitives/Torus.as?r=2888
 */THREE.TorusGeometry=function(radius,tube,radialSegments,tubularSegments,arc){THREE.Geometry.call(this);this.type='TorusGeometry';this.parameters={radius:radius,tube:tube,radialSegments:radialSegments,tubularSegments:tubularSegments,arc:arc};radius=radius||100;tube=tube||40;radialSegments=radialSegments||8;tubularSegments=tubularSegments||6;arc=arc||Math.PI*2;var center=new THREE.Vector3(),uvs=[],normals=[];for(var j=0;j<=radialSegments;j++){for(var i=0;i<=tubularSegments;i++){var u=i/tubularSegments*arc;var v=j/radialSegments*Math.PI*2;center.x=radius*Math.cos(u);center.y=radius*Math.sin(u);var vertex=new THREE.Vector3();vertex.x=(radius+tube*Math.cos(v))*Math.cos(u);vertex.y=(radius+tube*Math.cos(v))*Math.sin(u);vertex.z=tube*Math.sin(v);this.vertices.push(vertex);uvs.push(new THREE.Vector2(i/tubularSegments,j/radialSegments));normals.push(vertex.clone().sub(center).normalize());}}for(var j=1;j<=radialSegments;j++){for(var i=1;i<=tubularSegments;i++){var a=(tubularSegments+1)*j+i-1;var b=(tubularSegments+1)*(j-1)+i-1;var c=(tubularSegments+1)*(j-1)+i;var d=(tubularSegments+1)*j+i;var face=new THREE.Face3(a,b,d,[normals[a].clone(),normals[b].clone(),normals[d].clone()]);this.faces.push(face);this.faceVertexUvs[0].push([uvs[a].clone(),uvs[b].clone(),uvs[d].clone()]);face=new THREE.Face3(b,c,d,[normals[b].clone(),normals[c].clone(),normals[d].clone()]);this.faces.push(face);this.faceVertexUvs[0].push([uvs[b].clone(),uvs[c].clone(),uvs[d].clone()]);}}this.computeFaceNormals();};THREE.TorusGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.TorusGeometry.prototype.constructor=THREE.TorusGeometry;THREE.TorusGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.TorusGeometry(parameters.radius,parameters.tube,parameters.radialSegments,parameters.tubularSegments,parameters.arc);}; // File:src/extras/geometries/TorusKnotGeometry.js
/**
 * @author oosmoxiecode
 * based on http://code.google.com/p/away3d/source/browse/trunk/fp10/Away3D/src/away3d/primitives/TorusKnot.as?spec=svn2473&r=2473
 */THREE.TorusKnotGeometry=function(radius,tube,radialSegments,tubularSegments,p,q,heightScale){THREE.Geometry.call(this);this.type='TorusKnotGeometry';this.parameters={radius:radius,tube:tube,radialSegments:radialSegments,tubularSegments:tubularSegments,p:p,q:q,heightScale:heightScale};radius=radius||100;tube=tube||40;radialSegments=radialSegments||64;tubularSegments=tubularSegments||8;p=p||2;q=q||3;heightScale=heightScale||1;var grid=new Array(radialSegments);var tang=new THREE.Vector3();var n=new THREE.Vector3();var bitan=new THREE.Vector3();for(var i=0;i<radialSegments;++i){grid[i]=new Array(tubularSegments);var u=i/radialSegments*2*p*Math.PI;var p1=getPos(u,q,p,radius,heightScale);var p2=getPos(u+0.01,q,p,radius,heightScale);tang.subVectors(p2,p1);n.addVectors(p2,p1);bitan.crossVectors(tang,n);n.crossVectors(bitan,tang);bitan.normalize();n.normalize();for(var j=0;j<tubularSegments;++j){var v=j/tubularSegments*2*Math.PI;var cx=-tube*Math.cos(v); // TODO: Hack: Negating it so it faces outside.
var cy=tube*Math.sin(v);var pos=new THREE.Vector3();pos.x=p1.x+cx*n.x+cy*bitan.x;pos.y=p1.y+cx*n.y+cy*bitan.y;pos.z=p1.z+cx*n.z+cy*bitan.z;grid[i][j]=this.vertices.push(pos)-1;}}for(var i=0;i<radialSegments;++i){for(var j=0;j<tubularSegments;++j){var ip=(i+1)%radialSegments;var jp=(j+1)%tubularSegments;var a=grid[i][j];var b=grid[ip][j];var c=grid[ip][jp];var d=grid[i][jp];var uva=new THREE.Vector2(i/radialSegments,j/tubularSegments);var uvb=new THREE.Vector2((i+1)/radialSegments,j/tubularSegments);var uvc=new THREE.Vector2((i+1)/radialSegments,(j+1)/tubularSegments);var uvd=new THREE.Vector2(i/radialSegments,(j+1)/tubularSegments);this.faces.push(new THREE.Face3(a,b,d));this.faceVertexUvs[0].push([uva,uvb,uvd]);this.faces.push(new THREE.Face3(b,c,d));this.faceVertexUvs[0].push([uvb.clone(),uvc,uvd.clone()]);}}this.computeFaceNormals();this.computeVertexNormals();function getPos(u,in_q,in_p,radius,heightScale){var cu=Math.cos(u);var su=Math.sin(u);var quOverP=in_q/in_p*u;var cs=Math.cos(quOverP);var tx=radius*(2+cs)*0.5*cu;var ty=radius*(2+cs)*su*0.5;var tz=heightScale*radius*Math.sin(quOverP)*0.5;return new THREE.Vector3(tx,ty,tz);}};THREE.TorusKnotGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.TorusKnotGeometry.prototype.constructor=THREE.TorusKnotGeometry;THREE.TorusKnotGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.TorusKnotGeometry(parameters.radius,parameters.tube,parameters.radialSegments,parameters.tubularSegments,parameters.p,parameters.q,parameters.heightScale);}; // File:src/extras/geometries/TubeGeometry.js
/**
 * @author WestLangley / https://github.com/WestLangley
 * @author zz85 / https://github.com/zz85
 * @author miningold / https://github.com/miningold
 * @author jonobr1 / https://github.com/jonobr1
 *
 * Modified from the TorusKnotGeometry by @oosmoxiecode
 *
 * Creates a tube which extrudes along a 3d spline
 *
 * Uses parallel transport frames as described in
 * http://www.cs.indiana.edu/pub/techreports/TR425.pdf
 */THREE.TubeGeometry=function(path,segments,radius,radialSegments,closed,taper){THREE.Geometry.call(this);this.type='TubeGeometry';this.parameters={path:path,segments:segments,radius:radius,radialSegments:radialSegments,closed:closed,taper:taper};segments=segments||64;radius=radius||1;radialSegments=radialSegments||8;closed=closed||false;taper=taper||THREE.TubeGeometry.NoTaper;var grid=[];var scope=this,tangent,normal,binormal,numpoints=segments+1,u,v,r,cx,cy,pos,pos2=new THREE.Vector3(),i,j,ip,jp,a,b,c,d,uva,uvb,uvc,uvd;var frames=new THREE.TubeGeometry.FrenetFrames(path,segments,closed),tangents=frames.tangents,normals=frames.normals,binormals=frames.binormals; // proxy internals
this.tangents=tangents;this.normals=normals;this.binormals=binormals;function vert(x,y,z){return scope.vertices.push(new THREE.Vector3(x,y,z))-1;} // construct the grid
for(i=0;i<numpoints;i++){grid[i]=[];u=i/(numpoints-1);pos=path.getPointAt(u);tangent=tangents[i];normal=normals[i];binormal=binormals[i];r=radius*taper(u);for(j=0;j<radialSegments;j++){v=j/radialSegments*2*Math.PI;cx=-r*Math.cos(v); // TODO: Hack: Negating it so it faces outside.
cy=r*Math.sin(v);pos2.copy(pos);pos2.x+=cx*normal.x+cy*binormal.x;pos2.y+=cx*normal.y+cy*binormal.y;pos2.z+=cx*normal.z+cy*binormal.z;grid[i][j]=vert(pos2.x,pos2.y,pos2.z);}} // construct the mesh
for(i=0;i<segments;i++){for(j=0;j<radialSegments;j++){ip=closed?(i+1)%segments:i+1;jp=(j+1)%radialSegments;a=grid[i][j]; // *** NOT NECESSARILY PLANAR ! ***
b=grid[ip][j];c=grid[ip][jp];d=grid[i][jp];uva=new THREE.Vector2(i/segments,j/radialSegments);uvb=new THREE.Vector2((i+1)/segments,j/radialSegments);uvc=new THREE.Vector2((i+1)/segments,(j+1)/radialSegments);uvd=new THREE.Vector2(i/segments,(j+1)/radialSegments);this.faces.push(new THREE.Face3(a,b,d));this.faceVertexUvs[0].push([uva,uvb,uvd]);this.faces.push(new THREE.Face3(b,c,d));this.faceVertexUvs[0].push([uvb.clone(),uvc,uvd.clone()]);}}this.computeFaceNormals();this.computeVertexNormals();};THREE.TubeGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.TubeGeometry.prototype.constructor=THREE.TubeGeometry;THREE.TubeGeometry.prototype.clone=function(){return new this.constructor(this.parameters.path,this.parameters.segments,this.parameters.radius,this.parameters.radialSegments,this.parameters.closed,this.parameters.taper);};THREE.TubeGeometry.NoTaper=function(u){return 1;};THREE.TubeGeometry.SinusoidalTaper=function(u){return Math.sin(Math.PI*u);}; // For computing of Frenet frames, exposing the tangents, normals and binormals the spline
THREE.TubeGeometry.FrenetFrames=function(path,segments,closed){var normal=new THREE.Vector3(),tangents=[],normals=[],binormals=[],vec=new THREE.Vector3(),mat=new THREE.Matrix4(),numpoints=segments+1,theta,smallest,tx,ty,tz,i,u; // expose internals
this.tangents=tangents;this.normals=normals;this.binormals=binormals; // compute the tangent vectors for each segment on the path
for(i=0;i<numpoints;i++){u=i/(numpoints-1);tangents[i]=path.getTangentAt(u);tangents[i].normalize();}initialNormal3(); /*
	function initialNormal1(lastBinormal) {
		// fixed start binormal. Has dangers of 0 vectors
		normals[ 0 ] = new THREE.Vector3();
		binormals[ 0 ] = new THREE.Vector3();
		if (lastBinormal===undefined) lastBinormal = new THREE.Vector3( 0, 0, 1 );
		normals[ 0 ].crossVectors( lastBinormal, tangents[ 0 ] ).normalize();
		binormals[ 0 ].crossVectors( tangents[ 0 ], normals[ 0 ] ).normalize();
	}

	function initialNormal2() {

		// This uses the Frenet-Serret formula for deriving binormal
		var t2 = path.getTangentAt( epsilon );

		normals[ 0 ] = new THREE.Vector3().subVectors( t2, tangents[ 0 ] ).normalize();
		binormals[ 0 ] = new THREE.Vector3().crossVectors( tangents[ 0 ], normals[ 0 ] );

		normals[ 0 ].crossVectors( binormals[ 0 ], tangents[ 0 ] ).normalize(); // last binormal x tangent
		binormals[ 0 ].crossVectors( tangents[ 0 ], normals[ 0 ] ).normalize();

	}
	*/function initialNormal3(){ // select an initial normal vector perpendicular to the first tangent vector,
// and in the direction of the smallest tangent xyz component
normals[0]=new THREE.Vector3();binormals[0]=new THREE.Vector3();smallest=Number.MAX_VALUE;tx=Math.abs(tangents[0].x);ty=Math.abs(tangents[0].y);tz=Math.abs(tangents[0].z);if(tx<=smallest){smallest=tx;normal.set(1,0,0);}if(ty<=smallest){smallest=ty;normal.set(0,1,0);}if(tz<=smallest){normal.set(0,0,1);}vec.crossVectors(tangents[0],normal).normalize();normals[0].crossVectors(tangents[0],vec);binormals[0].crossVectors(tangents[0],normals[0]);} // compute the slowly-varying normal and binormal vectors for each segment on the path
for(i=1;i<numpoints;i++){normals[i]=normals[i-1].clone();binormals[i]=binormals[i-1].clone();vec.crossVectors(tangents[i-1],tangents[i]);if(vec.length()>Number.EPSILON){vec.normalize();theta=Math.acos(THREE.Math.clamp(tangents[i-1].dot(tangents[i]),-1,1)); // clamp for floating pt errors
normals[i].applyMatrix4(mat.makeRotationAxis(vec,theta));}binormals[i].crossVectors(tangents[i],normals[i]);} // if the curve is closed, postprocess the vectors so the first and last normal vectors are the same
if(closed){theta=Math.acos(THREE.Math.clamp(normals[0].dot(normals[numpoints-1]),-1,1));theta/=numpoints-1;if(tangents[0].dot(vec.crossVectors(normals[0],normals[numpoints-1]))>0){theta=-theta;}for(i=1;i<numpoints;i++){ // twist a little...
normals[i].applyMatrix4(mat.makeRotationAxis(tangents[i],theta*i));binormals[i].crossVectors(tangents[i],normals[i]);}}}; // File:src/extras/geometries/PolyhedronGeometry.js
/**
 * @author clockworkgeek / https://github.com/clockworkgeek
 * @author timothypratley / https://github.com/timothypratley
 * @author WestLangley / http://github.com/WestLangley
*/THREE.PolyhedronGeometry=function(vertices,indices,radius,detail){THREE.Geometry.call(this);this.type='PolyhedronGeometry';this.parameters={vertices:vertices,indices:indices,radius:radius,detail:detail};radius=radius||1;detail=detail||0;var that=this;for(var i=0,l=vertices.length;i<l;i+=3){prepare(new THREE.Vector3(vertices[i],vertices[i+1],vertices[i+2]));}var p=this.vertices;var faces=[];for(var i=0,j=0,l=indices.length;i<l;i+=3,j++){var v1=p[indices[i]];var v2=p[indices[i+1]];var v3=p[indices[i+2]];faces[j]=new THREE.Face3(v1.index,v2.index,v3.index,[v1.clone(),v2.clone(),v3.clone()],undefined,j);}var centroid=new THREE.Vector3();for(var i=0,l=faces.length;i<l;i++){subdivide(faces[i],detail);} // Handle case when face straddles the seam
for(var i=0,l=this.faceVertexUvs[0].length;i<l;i++){var uvs=this.faceVertexUvs[0][i];var x0=uvs[0].x;var x1=uvs[1].x;var x2=uvs[2].x;var max=Math.max(x0,x1,x2);var min=Math.min(x0,x1,x2);if(max>0.9&&min<0.1){ // 0.9 is somewhat arbitrary
if(x0<0.2)uvs[0].x+=1;if(x1<0.2)uvs[1].x+=1;if(x2<0.2)uvs[2].x+=1;}} // Apply radius
for(var i=0,l=this.vertices.length;i<l;i++){this.vertices[i].multiplyScalar(radius);} // Merge vertices
this.mergeVertices();this.computeFaceNormals();this.boundingSphere=new THREE.Sphere(new THREE.Vector3(),radius); // Project vector onto sphere's surface
function prepare(vector){var vertex=vector.normalize().clone();vertex.index=that.vertices.push(vertex)-1; // Texture coords are equivalent to map coords, calculate angle and convert to fraction of a circle.
var u=azimuth(vector)/2/Math.PI+0.5;var v=inclination(vector)/Math.PI+0.5;vertex.uv=new THREE.Vector2(u,1-v);return vertex;} // Approximate a curved face with recursively sub-divided triangles.
function make(v1,v2,v3,materialIndex){var face=new THREE.Face3(v1.index,v2.index,v3.index,[v1.clone(),v2.clone(),v3.clone()],undefined,materialIndex);that.faces.push(face);centroid.copy(v1).add(v2).add(v3).divideScalar(3);var azi=azimuth(centroid);that.faceVertexUvs[0].push([correctUV(v1.uv,v1,azi),correctUV(v2.uv,v2,azi),correctUV(v3.uv,v3,azi)]);} // Analytically subdivide a face to the required detail level.
function subdivide(face,detail){var cols=Math.pow(2,detail);var a=prepare(that.vertices[face.a]);var b=prepare(that.vertices[face.b]);var c=prepare(that.vertices[face.c]);var v=[];var materialIndex=face.materialIndex; // Construct all of the vertices for this subdivision.
for(var i=0;i<=cols;i++){v[i]=[];var aj=prepare(a.clone().lerp(c,i/cols));var bj=prepare(b.clone().lerp(c,i/cols));var rows=cols-i;for(var j=0;j<=rows;j++){if(j===0&&i===cols){v[i][j]=aj;}else {v[i][j]=prepare(aj.clone().lerp(bj,j/rows));}}} // Construct all of the faces.
for(var i=0;i<cols;i++){for(var j=0;j<2*(cols-i)-1;j++){var k=Math.floor(j/2);if(j%2===0){make(v[i][k+1],v[i+1][k],v[i][k],materialIndex);}else {make(v[i][k+1],v[i+1][k+1],v[i+1][k],materialIndex);}}}} // Angle around the Y axis, counter-clockwise when looking from above.
function azimuth(vector){return Math.atan2(vector.z,-vector.x);} // Angle above the XZ plane.
function inclination(vector){return Math.atan2(-vector.y,Math.sqrt(vector.x*vector.x+vector.z*vector.z));} // Texture fixing helper. Spheres have some odd behaviours.
function correctUV(uv,vector,azimuth){if(azimuth<0&&uv.x===1)uv=new THREE.Vector2(uv.x-1,uv.y);if(vector.x===0&&vector.z===0)uv=new THREE.Vector2(azimuth/2/Math.PI+0.5,uv.y);return uv.clone();}};THREE.PolyhedronGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.PolyhedronGeometry.prototype.constructor=THREE.PolyhedronGeometry;THREE.PolyhedronGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.PolyhedronGeometry(parameters.vertices,parameters.indices,parameters.radius,parameters.detail);}; // File:src/extras/geometries/DodecahedronGeometry.js
/**
 * @author Abe Pazos / https://hamoid.com
 */THREE.DodecahedronGeometry=function(radius,detail){var t=(1+Math.sqrt(5))/2;var r=1/t;var vertices=[ // (±1, ±1, ±1)
-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1, // (0, ±1/φ, ±φ)
0,-r,-t,0,-r,t,0,r,-t,0,r,t, // (±1/φ, ±φ, 0)
-r,-t,0,-r,t,0,r,-t,0,r,t,0, // (±φ, 0, ±1/φ)
-t,0,-r,t,0,-r,-t,0,r,t,0,r];var indices=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];THREE.PolyhedronGeometry.call(this,vertices,indices,radius,detail);this.type='DodecahedronGeometry';this.parameters={radius:radius,detail:detail};};THREE.DodecahedronGeometry.prototype=Object.create(THREE.PolyhedronGeometry.prototype);THREE.DodecahedronGeometry.prototype.constructor=THREE.DodecahedronGeometry;THREE.DodecahedronGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.DodecahedronGeometry(parameters.radius,parameters.detail);}; // File:src/extras/geometries/IcosahedronGeometry.js
/**
 * @author timothypratley / https://github.com/timothypratley
 */THREE.IcosahedronGeometry=function(radius,detail){var t=(1+Math.sqrt(5))/2;var vertices=[-1,t,0,1,t,0,-1,-t,0,1,-t,0,0,-1,t,0,1,t,0,-1,-t,0,1,-t,t,0,-1,t,0,1,-t,0,-1,-t,0,1];var indices=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];THREE.PolyhedronGeometry.call(this,vertices,indices,radius,detail);this.type='IcosahedronGeometry';this.parameters={radius:radius,detail:detail};};THREE.IcosahedronGeometry.prototype=Object.create(THREE.PolyhedronGeometry.prototype);THREE.IcosahedronGeometry.prototype.constructor=THREE.IcosahedronGeometry;THREE.IcosahedronGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.IcosahedronGeometry(parameters.radius,parameters.detail);}; // File:src/extras/geometries/OctahedronGeometry.js
/**
 * @author timothypratley / https://github.com/timothypratley
 */THREE.OctahedronGeometry=function(radius,detail){var vertices=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1];var indices=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];THREE.PolyhedronGeometry.call(this,vertices,indices,radius,detail);this.type='OctahedronGeometry';this.parameters={radius:radius,detail:detail};};THREE.OctahedronGeometry.prototype=Object.create(THREE.PolyhedronGeometry.prototype);THREE.OctahedronGeometry.prototype.constructor=THREE.OctahedronGeometry;THREE.OctahedronGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.OctahedronGeometry(parameters.radius,parameters.detail);}; // File:src/extras/geometries/TetrahedronGeometry.js
/**
 * @author timothypratley / https://github.com/timothypratley
 */THREE.TetrahedronGeometry=function(radius,detail){var vertices=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1];var indices=[2,1,0,0,3,2,1,3,0,2,3,1];THREE.PolyhedronGeometry.call(this,vertices,indices,radius,detail);this.type='TetrahedronGeometry';this.parameters={radius:radius,detail:detail};};THREE.TetrahedronGeometry.prototype=Object.create(THREE.PolyhedronGeometry.prototype);THREE.TetrahedronGeometry.prototype.constructor=THREE.TetrahedronGeometry;THREE.TetrahedronGeometry.prototype.clone=function(){var parameters=this.parameters;return new THREE.TetrahedronGeometry(parameters.radius,parameters.detail);}; // File:src/extras/geometries/ParametricGeometry.js
/**
 * @author zz85 / https://github.com/zz85
 * Parametric Surfaces Geometry
 * based on the brilliant article by @prideout http://prideout.net/blog/?p=44
 *
 * new THREE.ParametricGeometry( parametricFunction, uSegments, ySegements );
 *
 */THREE.ParametricGeometry=function(func,slices,stacks){THREE.Geometry.call(this);this.type='ParametricGeometry';this.parameters={func:func,slices:slices,stacks:stacks};var verts=this.vertices;var faces=this.faces;var uvs=this.faceVertexUvs[0];var i,j,p;var u,v;var sliceCount=slices+1;for(i=0;i<=stacks;i++){v=i/stacks;for(j=0;j<=slices;j++){u=j/slices;p=func(u,v);verts.push(p);}}var a,b,c,d;var uva,uvb,uvc,uvd;for(i=0;i<stacks;i++){for(j=0;j<slices;j++){a=i*sliceCount+j;b=i*sliceCount+j+1;c=(i+1)*sliceCount+j+1;d=(i+1)*sliceCount+j;uva=new THREE.Vector2(j/slices,i/stacks);uvb=new THREE.Vector2((j+1)/slices,i/stacks);uvc=new THREE.Vector2((j+1)/slices,(i+1)/stacks);uvd=new THREE.Vector2(j/slices,(i+1)/stacks);faces.push(new THREE.Face3(a,b,d));uvs.push([uva,uvb,uvd]);faces.push(new THREE.Face3(b,c,d));uvs.push([uvb.clone(),uvc,uvd.clone()]);}} // console.log(this);
// magic bullet
// var diff = this.mergeVertices();
// console.log('removed ', diff, ' vertices by merging');
this.computeFaceNormals();this.computeVertexNormals();};THREE.ParametricGeometry.prototype=Object.create(THREE.Geometry.prototype);THREE.ParametricGeometry.prototype.constructor=THREE.ParametricGeometry; // File:src/extras/geometries/WireframeGeometry.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.WireframeGeometry=function(geometry){THREE.BufferGeometry.call(this);var edge=[0,0],hash={};function sortFunction(a,b){return a-b;}var keys=['a','b','c'];if(geometry instanceof THREE.Geometry){var vertices=geometry.vertices;var faces=geometry.faces;var numEdges=0; // allocate maximal size
var edges=new Uint32Array(6*faces.length);for(var i=0,l=faces.length;i<l;i++){var face=faces[i];for(var j=0;j<3;j++){edge[0]=face[keys[j]];edge[1]=face[keys[(j+1)%3]];edge.sort(sortFunction);var key=edge.toString();if(hash[key]===undefined){edges[2*numEdges]=edge[0];edges[2*numEdges+1]=edge[1];hash[key]=true;numEdges++;}}}var coords=new Float32Array(numEdges*2*3);for(var i=0,l=numEdges;i<l;i++){for(var j=0;j<2;j++){var vertex=vertices[edges[2*i+j]];var index=6*i+3*j;coords[index+0]=vertex.x;coords[index+1]=vertex.y;coords[index+2]=vertex.z;}}this.addAttribute('position',new THREE.BufferAttribute(coords,3));}else if(geometry instanceof THREE.BufferGeometry){if(geometry.index!==null){ // Indexed BufferGeometry
var indices=geometry.index.array;var vertices=geometry.attributes.position;var drawcalls=geometry.drawcalls;var numEdges=0;if(drawcalls.length===0){geometry.addGroup(0,indices.length);} // allocate maximal size
var edges=new Uint32Array(2*indices.length);for(var o=0,ol=drawcalls.length;o<ol;++o){var drawcall=drawcalls[o];var start=drawcall.start;var count=drawcall.count;for(var i=start,il=start+count;i<il;i+=3){for(var j=0;j<3;j++){edge[0]=indices[i+j];edge[1]=indices[i+(j+1)%3];edge.sort(sortFunction);var key=edge.toString();if(hash[key]===undefined){edges[2*numEdges]=edge[0];edges[2*numEdges+1]=edge[1];hash[key]=true;numEdges++;}}}}var coords=new Float32Array(numEdges*2*3);for(var i=0,l=numEdges;i<l;i++){for(var j=0;j<2;j++){var index=6*i+3*j;var index2=edges[2*i+j];coords[index+0]=vertices.getX(index2);coords[index+1]=vertices.getY(index2);coords[index+2]=vertices.getZ(index2);}}this.addAttribute('position',new THREE.BufferAttribute(coords,3));}else { // non-indexed BufferGeometry
var vertices=geometry.attributes.position.array;var numEdges=vertices.length/3;var numTris=numEdges/3;var coords=new Float32Array(numEdges*2*3);for(var i=0,l=numTris;i<l;i++){for(var j=0;j<3;j++){var index=18*i+6*j;var index1=9*i+3*j;coords[index+0]=vertices[index1];coords[index+1]=vertices[index1+1];coords[index+2]=vertices[index1+2];var index2=9*i+3*((j+1)%3);coords[index+3]=vertices[index2];coords[index+4]=vertices[index2+1];coords[index+5]=vertices[index2+2];}}this.addAttribute('position',new THREE.BufferAttribute(coords,3));}}};THREE.WireframeGeometry.prototype=Object.create(THREE.BufferGeometry.prototype);THREE.WireframeGeometry.prototype.constructor=THREE.WireframeGeometry; // File:src/extras/helpers/AxisHelper.js
/**
 * @author sroucheray / http://sroucheray.org/
 * @author mrdoob / http://mrdoob.com/
 */THREE.AxisHelper=function(size){size=size||1;var vertices=new Float32Array([0,0,0,size,0,0,0,0,0,0,size,0,0,0,0,0,0,size]);var colors=new Float32Array([1,0,0,1,0.6,0,0,1,0,0.6,1,0,0,0,1,0,0.6,1]);var geometry=new THREE.BufferGeometry();geometry.addAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.addAttribute('color',new THREE.BufferAttribute(colors,3));var material=new THREE.LineBasicMaterial({vertexColors:THREE.VertexColors});THREE.LineSegments.call(this,geometry,material);};THREE.AxisHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.AxisHelper.prototype.constructor=THREE.AxisHelper; // File:src/extras/helpers/ArrowHelper.js
/**
 * @author WestLangley / http://github.com/WestLangley
 * @author zz85 / http://github.com/zz85
 * @author bhouston / http://clara.io
 *
 * Creates an arrow for visualizing directions
 *
 * Parameters:
 *  dir - Vector3
 *  origin - Vector3
 *  length - Number
 *  color - color in hex value
 *  headLength - Number
 *  headWidth - Number
 */THREE.ArrowHelper=function(){var lineGeometry=new THREE.Geometry();lineGeometry.vertices.push(new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,0));var coneGeometry=new THREE.CylinderGeometry(0,0.5,1,5,1);coneGeometry.translate(0,-0.5,0);return function ArrowHelper(dir,origin,length,color,headLength,headWidth){ // dir is assumed to be normalized
THREE.Object3D.call(this);if(color===undefined)color=0xffff00;if(length===undefined)length=1;if(headLength===undefined)headLength=0.2*length;if(headWidth===undefined)headWidth=0.2*headLength;this.position.copy(origin);if(headLength<length){this.line=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:color}));this.line.matrixAutoUpdate=false;this.add(this.line);}this.cone=new THREE.Mesh(coneGeometry,new THREE.MeshBasicMaterial({color:color}));this.cone.matrixAutoUpdate=false;this.add(this.cone);this.setDirection(dir);this.setLength(length,headLength,headWidth);};}();THREE.ArrowHelper.prototype=Object.create(THREE.Object3D.prototype);THREE.ArrowHelper.prototype.constructor=THREE.ArrowHelper;THREE.ArrowHelper.prototype.setDirection=function(){var axis=new THREE.Vector3();var radians;return function setDirection(dir){ // dir is assumed to be normalized
if(dir.y>0.99999){this.quaternion.set(0,0,0,1);}else if(dir.y<-0.99999){this.quaternion.set(1,0,0,0);}else {axis.set(dir.z,0,-dir.x).normalize();radians=Math.acos(dir.y);this.quaternion.setFromAxisAngle(axis,radians);}};}();THREE.ArrowHelper.prototype.setLength=function(length,headLength,headWidth){if(headLength===undefined)headLength=0.2*length;if(headWidth===undefined)headWidth=0.2*headLength;if(headLength<length){this.line.scale.set(1,length-headLength,1);this.line.updateMatrix();}this.cone.scale.set(headWidth,headLength,headWidth);this.cone.position.y=length;this.cone.updateMatrix();};THREE.ArrowHelper.prototype.setColor=function(color){if(this.line!==undefined)this.line.material.color.set(color);this.cone.material.color.set(color);}; // File:src/extras/helpers/BoxHelper.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.BoxHelper=function(object){var indices=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]);var positions=new Float32Array(8*3);var geometry=new THREE.BufferGeometry();geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.addAttribute('position',new THREE.BufferAttribute(positions,3));THREE.LineSegments.call(this,geometry,new THREE.LineBasicMaterial({color:0xffff00}));if(object!==undefined){this.update(object);}};THREE.BoxHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.BoxHelper.prototype.constructor=THREE.BoxHelper;THREE.BoxHelper.prototype.update=function(){var box=new THREE.Box3();return function(object){box.setFromObject(object);if(box.empty())return;var min=box.min;var max=box.max; /*
		  5____4
		1/___0/|
		| 6__|_7
		2/___3/

		0: max.x, max.y, max.z
		1: min.x, max.y, max.z
		2: min.x, min.y, max.z
		3: max.x, min.y, max.z
		4: max.x, max.y, min.z
		5: min.x, max.y, min.z
		6: min.x, min.y, min.z
		7: max.x, min.y, min.z
		*/var position=this.geometry.attributes.position;var array=position.array;array[0]=max.x;array[1]=max.y;array[2]=max.z;array[3]=min.x;array[4]=max.y;array[5]=max.z;array[6]=min.x;array[7]=min.y;array[8]=max.z;array[9]=max.x;array[10]=min.y;array[11]=max.z;array[12]=max.x;array[13]=max.y;array[14]=min.z;array[15]=min.x;array[16]=max.y;array[17]=min.z;array[18]=min.x;array[19]=min.y;array[20]=min.z;array[21]=max.x;array[22]=min.y;array[23]=min.z;position.needsUpdate=true;this.geometry.computeBoundingSphere();};}(); // File:src/extras/helpers/BoundingBoxHelper.js
/**
 * @author WestLangley / http://github.com/WestLangley
 */ // a helper to show the world-axis-aligned bounding box for an object
THREE.BoundingBoxHelper=function(object,hex){var color=hex!==undefined?hex:0x888888;this.object=object;this.box=new THREE.Box3();THREE.Mesh.call(this,new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:color,wireframe:true}));};THREE.BoundingBoxHelper.prototype=Object.create(THREE.Mesh.prototype);THREE.BoundingBoxHelper.prototype.constructor=THREE.BoundingBoxHelper;THREE.BoundingBoxHelper.prototype.update=function(){this.box.setFromObject(this.object);this.box.size(this.scale);this.box.center(this.position);}; // File:src/extras/helpers/CameraHelper.js
/**
 * @author alteredq / http://alteredqualia.com/
 *
 *	- shows frustum, line of sight and up of the camera
 *	- suitable for fast updates
 * 	- based on frustum visualization in lightgl.js shadowmap example
 *		http://evanw.github.com/lightgl.js/tests/shadowmap.html
 */THREE.CameraHelper=function(camera){var geometry=new THREE.Geometry();var material=new THREE.LineBasicMaterial({color:0xffffff,vertexColors:THREE.FaceColors});var pointMap={}; // colors
var hexFrustum=0xffaa00;var hexCone=0xff0000;var hexUp=0x00aaff;var hexTarget=0xffffff;var hexCross=0x333333; // near
addLine("n1","n2",hexFrustum);addLine("n2","n4",hexFrustum);addLine("n4","n3",hexFrustum);addLine("n3","n1",hexFrustum); // far
addLine("f1","f2",hexFrustum);addLine("f2","f4",hexFrustum);addLine("f4","f3",hexFrustum);addLine("f3","f1",hexFrustum); // sides
addLine("n1","f1",hexFrustum);addLine("n2","f2",hexFrustum);addLine("n3","f3",hexFrustum);addLine("n4","f4",hexFrustum); // cone
addLine("p","n1",hexCone);addLine("p","n2",hexCone);addLine("p","n3",hexCone);addLine("p","n4",hexCone); // up
addLine("u1","u2",hexUp);addLine("u2","u3",hexUp);addLine("u3","u1",hexUp); // target
addLine("c","t",hexTarget);addLine("p","c",hexCross); // cross
addLine("cn1","cn2",hexCross);addLine("cn3","cn4",hexCross);addLine("cf1","cf2",hexCross);addLine("cf3","cf4",hexCross);function addLine(a,b,hex){addPoint(a,hex);addPoint(b,hex);}function addPoint(id,hex){geometry.vertices.push(new THREE.Vector3());geometry.colors.push(new THREE.Color(hex));if(pointMap[id]===undefined){pointMap[id]=[];}pointMap[id].push(geometry.vertices.length-1);}THREE.LineSegments.call(this,geometry,material);this.camera=camera;this.camera.updateProjectionMatrix();this.matrix=camera.matrixWorld;this.matrixAutoUpdate=false;this.pointMap=pointMap;this.update();};THREE.CameraHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.CameraHelper.prototype.constructor=THREE.CameraHelper;THREE.CameraHelper.prototype.update=function(){var geometry,pointMap;var vector=new THREE.Vector3();var camera=new THREE.Camera();function setPoint(point,x,y,z){vector.set(x,y,z).unproject(camera);var points=pointMap[point];if(points!==undefined){for(var i=0,il=points.length;i<il;i++){geometry.vertices[points[i]].copy(vector);}}}return function(){geometry=this.geometry;pointMap=this.pointMap;var w=1,h=1; // we need just camera projection matrix
// world matrix must be identity
camera.projectionMatrix.copy(this.camera.projectionMatrix); // center / target
setPoint("c",0,0,-1);setPoint("t",0,0,1); // near
setPoint("n1",-w,-h,-1);setPoint("n2",w,-h,-1);setPoint("n3",-w,h,-1);setPoint("n4",w,h,-1); // far
setPoint("f1",-w,-h,1);setPoint("f2",w,-h,1);setPoint("f3",-w,h,1);setPoint("f4",w,h,1); // up
setPoint("u1",w*0.7,h*1.1,-1);setPoint("u2",-w*0.7,h*1.1,-1);setPoint("u3",0,h*2,-1); // cross
setPoint("cf1",-w,0,1);setPoint("cf2",w,0,1);setPoint("cf3",0,-h,1);setPoint("cf4",0,h,1);setPoint("cn1",-w,0,-1);setPoint("cn2",w,0,-1);setPoint("cn3",0,-h,-1);setPoint("cn4",0,h,-1);geometry.verticesNeedUpdate=true;};}(); // File:src/extras/helpers/DirectionalLightHelper.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author WestLangley / http://github.com/WestLangley
 */THREE.DirectionalLightHelper=function(light,size){THREE.Object3D.call(this);this.light=light;this.light.updateMatrixWorld();this.matrix=light.matrixWorld;this.matrixAutoUpdate=false;size=size||1;var geometry=new THREE.Geometry();geometry.vertices.push(new THREE.Vector3(-size,size,0),new THREE.Vector3(size,size,0),new THREE.Vector3(size,-size,0),new THREE.Vector3(-size,-size,0),new THREE.Vector3(-size,size,0));var material=new THREE.LineBasicMaterial({fog:false});material.color.copy(this.light.color).multiplyScalar(this.light.intensity);this.lightPlane=new THREE.Line(geometry,material);this.add(this.lightPlane);geometry=new THREE.Geometry();geometry.vertices.push(new THREE.Vector3(),new THREE.Vector3());material=new THREE.LineBasicMaterial({fog:false});material.color.copy(this.light.color).multiplyScalar(this.light.intensity);this.targetLine=new THREE.Line(geometry,material);this.add(this.targetLine);this.update();};THREE.DirectionalLightHelper.prototype=Object.create(THREE.Object3D.prototype);THREE.DirectionalLightHelper.prototype.constructor=THREE.DirectionalLightHelper;THREE.DirectionalLightHelper.prototype.dispose=function(){this.lightPlane.geometry.dispose();this.lightPlane.material.dispose();this.targetLine.geometry.dispose();this.targetLine.material.dispose();};THREE.DirectionalLightHelper.prototype.update=function(){var v1=new THREE.Vector3();var v2=new THREE.Vector3();var v3=new THREE.Vector3();return function(){v1.setFromMatrixPosition(this.light.matrixWorld);v2.setFromMatrixPosition(this.light.target.matrixWorld);v3.subVectors(v2,v1);this.lightPlane.lookAt(v3);this.lightPlane.material.color.copy(this.light.color).multiplyScalar(this.light.intensity);this.targetLine.geometry.vertices[1].copy(v3);this.targetLine.geometry.verticesNeedUpdate=true;this.targetLine.material.color.copy(this.lightPlane.material.color);};}(); // File:src/extras/helpers/EdgesHelper.js
/**
 * @author WestLangley / http://github.com/WestLangley
 * @param object THREE.Mesh whose geometry will be used
 * @param hex line color
 * @param thresholdAngle the minimum angle (in degrees),
 * between the face normals of adjacent faces,
 * that is required to render an edge. A value of 10 means
 * an edge is only rendered if the angle is at least 10 degrees.
 */THREE.EdgesHelper=function(object,hex,thresholdAngle){var color=hex!==undefined?hex:0xffffff;THREE.LineSegments.call(this,new THREE.EdgesGeometry(object.geometry,thresholdAngle),new THREE.LineBasicMaterial({color:color}));this.matrix=object.matrixWorld;this.matrixAutoUpdate=false;};THREE.EdgesHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.EdgesHelper.prototype.constructor=THREE.EdgesHelper; // File:src/extras/helpers/FaceNormalsHelper.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author WestLangley / http://github.com/WestLangley
*/THREE.FaceNormalsHelper=function(object,size,hex,linewidth){ // FaceNormalsHelper only supports THREE.Geometry
this.object=object;this.size=size!==undefined?size:1;var color=hex!==undefined?hex:0xffff00;var width=linewidth!==undefined?linewidth:1; //
var nNormals=0;var objGeometry=this.object.geometry;if(objGeometry instanceof THREE.Geometry){nNormals=objGeometry.faces.length;}else {console.warn('THREE.FaceNormalsHelper: only THREE.Geometry is supported. Use THREE.VertexNormalsHelper, instead.');} //
var geometry=new THREE.BufferGeometry();var positions=new THREE.Float32Attribute(nNormals*2*3,3);geometry.addAttribute('position',positions);THREE.LineSegments.call(this,geometry,new THREE.LineBasicMaterial({color:color,linewidth:width})); //
this.matrixAutoUpdate=false;this.update();};THREE.FaceNormalsHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.FaceNormalsHelper.prototype.constructor=THREE.FaceNormalsHelper;THREE.FaceNormalsHelper.prototype.update=function(){var v1=new THREE.Vector3();var v2=new THREE.Vector3();var normalMatrix=new THREE.Matrix3();return function update(){this.object.updateMatrixWorld(true);normalMatrix.getNormalMatrix(this.object.matrixWorld);var matrixWorld=this.object.matrixWorld;var position=this.geometry.attributes.position; //
var objGeometry=this.object.geometry;var vertices=objGeometry.vertices;var faces=objGeometry.faces;var idx=0;for(var i=0,l=faces.length;i<l;i++){var face=faces[i];var normal=face.normal;v1.copy(vertices[face.a]).add(vertices[face.b]).add(vertices[face.c]).divideScalar(3).applyMatrix4(matrixWorld);v2.copy(normal).applyMatrix3(normalMatrix).normalize().multiplyScalar(this.size).add(v1);position.setXYZ(idx,v1.x,v1.y,v1.z);idx=idx+1;position.setXYZ(idx,v2.x,v2.y,v2.z);idx=idx+1;}position.needsUpdate=true;return this;};}(); // File:src/extras/helpers/GridHelper.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.GridHelper=function(size,step){var geometry=new THREE.Geometry();var material=new THREE.LineBasicMaterial({vertexColors:THREE.VertexColors});this.color1=new THREE.Color(0x444444);this.color2=new THREE.Color(0x888888);for(var i=-size;i<=size;i+=step){geometry.vertices.push(new THREE.Vector3(-size,0,i),new THREE.Vector3(size,0,i),new THREE.Vector3(i,0,-size),new THREE.Vector3(i,0,size));var color=i===0?this.color1:this.color2;geometry.colors.push(color,color,color,color);}THREE.LineSegments.call(this,geometry,material);};THREE.GridHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.GridHelper.prototype.constructor=THREE.GridHelper;THREE.GridHelper.prototype.setColors=function(colorCenterLine,colorGrid){this.color1.set(colorCenterLine);this.color2.set(colorGrid);this.geometry.colorsNeedUpdate=true;}; // File:src/extras/helpers/HemisphereLightHelper.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */THREE.HemisphereLightHelper=function(light,sphereSize){THREE.Object3D.call(this);this.light=light;this.light.updateMatrixWorld();this.matrix=light.matrixWorld;this.matrixAutoUpdate=false;this.colors=[new THREE.Color(),new THREE.Color()];var geometry=new THREE.SphereGeometry(sphereSize,4,2);geometry.rotateX(-Math.PI/2);for(var i=0,il=8;i<il;i++){geometry.faces[i].color=this.colors[i<4?0:1];}var material=new THREE.MeshBasicMaterial({vertexColors:THREE.FaceColors,wireframe:true});this.lightSphere=new THREE.Mesh(geometry,material);this.add(this.lightSphere);this.update();};THREE.HemisphereLightHelper.prototype=Object.create(THREE.Object3D.prototype);THREE.HemisphereLightHelper.prototype.constructor=THREE.HemisphereLightHelper;THREE.HemisphereLightHelper.prototype.dispose=function(){this.lightSphere.geometry.dispose();this.lightSphere.material.dispose();};THREE.HemisphereLightHelper.prototype.update=function(){var vector=new THREE.Vector3();return function(){this.colors[0].copy(this.light.color).multiplyScalar(this.light.intensity);this.colors[1].copy(this.light.groundColor).multiplyScalar(this.light.intensity);this.lightSphere.lookAt(vector.setFromMatrixPosition(this.light.matrixWorld).negate());this.lightSphere.geometry.colorsNeedUpdate=true;};}(); // File:src/extras/helpers/PointLightHelper.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */THREE.PointLightHelper=function(light,sphereSize){this.light=light;this.light.updateMatrixWorld();var geometry=new THREE.SphereGeometry(sphereSize,4,2);var material=new THREE.MeshBasicMaterial({wireframe:true,fog:false});material.color.copy(this.light.color).multiplyScalar(this.light.intensity);THREE.Mesh.call(this,geometry,material);this.matrix=this.light.matrixWorld;this.matrixAutoUpdate=false; /*
	var distanceGeometry = new THREE.IcosahedronGeometry( 1, 2 );
	var distanceMaterial = new THREE.MeshBasicMaterial( { color: hexColor, fog: false, wireframe: true, opacity: 0.1, transparent: true } );

	this.lightSphere = new THREE.Mesh( bulbGeometry, bulbMaterial );
	this.lightDistance = new THREE.Mesh( distanceGeometry, distanceMaterial );

	var d = light.distance;

	if ( d === 0.0 ) {

		this.lightDistance.visible = false;

	} else {

		this.lightDistance.scale.set( d, d, d );

	}

	this.add( this.lightDistance );
	*/};THREE.PointLightHelper.prototype=Object.create(THREE.Mesh.prototype);THREE.PointLightHelper.prototype.constructor=THREE.PointLightHelper;THREE.PointLightHelper.prototype.dispose=function(){this.geometry.dispose();this.material.dispose();};THREE.PointLightHelper.prototype.update=function(){this.material.color.copy(this.light.color).multiplyScalar(this.light.intensity); /*
	var d = this.light.distance;

	if ( d === 0.0 ) {

		this.lightDistance.visible = false;

	} else {

		this.lightDistance.visible = true;
		this.lightDistance.scale.set( d, d, d );

	}
	*/}; // File:src/extras/helpers/SkeletonHelper.js
/**
 * @author Sean Griffin / http://twitter.com/sgrif
 * @author Michael Guerrero / http://realitymeltdown.com
 * @author mrdoob / http://mrdoob.com/
 * @author ikerr / http://verold.com
 */THREE.SkeletonHelper=function(object){this.bones=this.getBoneList(object);var geometry=new THREE.Geometry();for(var i=0;i<this.bones.length;i++){var bone=this.bones[i];if(bone.parent instanceof THREE.Bone){geometry.vertices.push(new THREE.Vector3());geometry.vertices.push(new THREE.Vector3());geometry.colors.push(new THREE.Color(0,0,1));geometry.colors.push(new THREE.Color(0,1,0));}}geometry.dynamic=true;var material=new THREE.LineBasicMaterial({vertexColors:THREE.VertexColors,depthTest:false,depthWrite:false,transparent:true});THREE.LineSegments.call(this,geometry,material);this.root=object;this.matrix=object.matrixWorld;this.matrixAutoUpdate=false;this.update();};THREE.SkeletonHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.SkeletonHelper.prototype.constructor=THREE.SkeletonHelper;THREE.SkeletonHelper.prototype.getBoneList=function(object){var boneList=[];if(object instanceof THREE.Bone){boneList.push(object);}for(var i=0;i<object.children.length;i++){boneList.push.apply(boneList,this.getBoneList(object.children[i]));}return boneList;};THREE.SkeletonHelper.prototype.update=function(){var geometry=this.geometry;var matrixWorldInv=new THREE.Matrix4().getInverse(this.root.matrixWorld);var boneMatrix=new THREE.Matrix4();var j=0;for(var i=0;i<this.bones.length;i++){var bone=this.bones[i];if(bone.parent instanceof THREE.Bone){boneMatrix.multiplyMatrices(matrixWorldInv,bone.matrixWorld);geometry.vertices[j].setFromMatrixPosition(boneMatrix);boneMatrix.multiplyMatrices(matrixWorldInv,bone.parent.matrixWorld);geometry.vertices[j+1].setFromMatrixPosition(boneMatrix);j+=2;}}geometry.verticesNeedUpdate=true;geometry.computeBoundingSphere();}; // File:src/extras/helpers/SpotLightHelper.js
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author WestLangley / http://github.com/WestLangley
*/THREE.SpotLightHelper=function(light){THREE.Object3D.call(this);this.light=light;this.light.updateMatrixWorld();this.matrix=light.matrixWorld;this.matrixAutoUpdate=false;var geometry=new THREE.CylinderGeometry(0,1,1,8,1,true);geometry.translate(0,-0.5,0);geometry.rotateX(-Math.PI/2);var material=new THREE.MeshBasicMaterial({wireframe:true,fog:false});this.cone=new THREE.Mesh(geometry,material);this.add(this.cone);this.update();};THREE.SpotLightHelper.prototype=Object.create(THREE.Object3D.prototype);THREE.SpotLightHelper.prototype.constructor=THREE.SpotLightHelper;THREE.SpotLightHelper.prototype.dispose=function(){this.cone.geometry.dispose();this.cone.material.dispose();};THREE.SpotLightHelper.prototype.update=function(){var vector=new THREE.Vector3();var vector2=new THREE.Vector3();return function(){var coneLength=this.light.distance?this.light.distance:10000;var coneWidth=coneLength*Math.tan(this.light.angle);this.cone.scale.set(coneWidth,coneWidth,coneLength);vector.setFromMatrixPosition(this.light.matrixWorld);vector2.setFromMatrixPosition(this.light.target.matrixWorld);this.cone.lookAt(vector2.sub(vector));this.cone.material.color.copy(this.light.color).multiplyScalar(this.light.intensity);};}(); // File:src/extras/helpers/VertexNormalsHelper.js
/**
 * @author mrdoob / http://mrdoob.com/
 * @author WestLangley / http://github.com/WestLangley
*/THREE.VertexNormalsHelper=function(object,size,hex,linewidth){this.object=object;this.size=size!==undefined?size:1;var color=hex!==undefined?hex:0xff0000;var width=linewidth!==undefined?linewidth:1; //
var nNormals=0;var objGeometry=this.object.geometry;if(objGeometry instanceof THREE.Geometry){nNormals=objGeometry.faces.length*3;}else if(objGeometry instanceof THREE.BufferGeometry){nNormals=objGeometry.attributes.normal.count;} //
var geometry=new THREE.BufferGeometry();var positions=new THREE.Float32Attribute(nNormals*2*3,3);geometry.addAttribute('position',positions);THREE.LineSegments.call(this,geometry,new THREE.LineBasicMaterial({color:color,linewidth:width})); //
this.matrixAutoUpdate=false;this.update();};THREE.VertexNormalsHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.VertexNormalsHelper.prototype.constructor=THREE.VertexNormalsHelper;THREE.VertexNormalsHelper.prototype.update=function(){var v1=new THREE.Vector3();var v2=new THREE.Vector3();var normalMatrix=new THREE.Matrix3();return function update(){var keys=['a','b','c'];this.object.updateMatrixWorld(true);normalMatrix.getNormalMatrix(this.object.matrixWorld);var matrixWorld=this.object.matrixWorld;var position=this.geometry.attributes.position; //
var objGeometry=this.object.geometry;if(objGeometry instanceof THREE.Geometry){var vertices=objGeometry.vertices;var faces=objGeometry.faces;var idx=0;for(var i=0,l=faces.length;i<l;i++){var face=faces[i];for(var j=0,jl=face.vertexNormals.length;j<jl;j++){var vertex=vertices[face[keys[j]]];var normal=face.vertexNormals[j];v1.copy(vertex).applyMatrix4(matrixWorld);v2.copy(normal).applyMatrix3(normalMatrix).normalize().multiplyScalar(this.size).add(v1);position.setXYZ(idx,v1.x,v1.y,v1.z);idx=idx+1;position.setXYZ(idx,v2.x,v2.y,v2.z);idx=idx+1;}}}else if(objGeometry instanceof THREE.BufferGeometry){var objPos=objGeometry.attributes.position;var objNorm=objGeometry.attributes.normal;var idx=0; // for simplicity, ignore index and drawcalls, and render every normal
for(var j=0,jl=objPos.count;j<jl;j++){v1.set(objPos.getX(j),objPos.getY(j),objPos.getZ(j)).applyMatrix4(matrixWorld);v2.set(objNorm.getX(j),objNorm.getY(j),objNorm.getZ(j));v2.applyMatrix3(normalMatrix).normalize().multiplyScalar(this.size).add(v1);position.setXYZ(idx,v1.x,v1.y,v1.z);idx=idx+1;position.setXYZ(idx,v2.x,v2.y,v2.z);idx=idx+1;}}position.needsUpdate=true;return this;};}(); // File:src/extras/helpers/WireframeHelper.js
/**
 * @author mrdoob / http://mrdoob.com/
 */THREE.WireframeHelper=function(object,hex){var color=hex!==undefined?hex:0xffffff;THREE.LineSegments.call(this,new THREE.WireframeGeometry(object.geometry),new THREE.LineBasicMaterial({color:color}));this.matrix=object.matrixWorld;this.matrixAutoUpdate=false;};THREE.WireframeHelper.prototype=Object.create(THREE.LineSegments.prototype);THREE.WireframeHelper.prototype.constructor=THREE.WireframeHelper; // File:src/extras/objects/ImmediateRenderObject.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.ImmediateRenderObject=function(material){THREE.Object3D.call(this);this.material=material;this.render=function(renderCallback){};};THREE.ImmediateRenderObject.prototype=Object.create(THREE.Object3D.prototype);THREE.ImmediateRenderObject.prototype.constructor=THREE.ImmediateRenderObject; // File:src/extras/objects/MorphBlendMesh.js
/**
 * @author alteredq / http://alteredqualia.com/
 */THREE.MorphBlendMesh=function(geometry,material){THREE.Mesh.call(this,geometry,material);this.animationsMap={};this.animationsList=[]; // prepare default animation
// (all frames played together in 1 second)
var numFrames=this.geometry.morphTargets.length;var name="__default";var startFrame=0;var endFrame=numFrames-1;var fps=numFrames/1;this.createAnimation(name,startFrame,endFrame,fps);this.setAnimationWeight(name,1);};THREE.MorphBlendMesh.prototype=Object.create(THREE.Mesh.prototype);THREE.MorphBlendMesh.prototype.constructor=THREE.MorphBlendMesh;THREE.MorphBlendMesh.prototype.createAnimation=function(name,start,end,fps){var animation={start:start,end:end,length:end-start+1,fps:fps,duration:(end-start)/fps,lastFrame:0,currentFrame:0,active:false,time:0,direction:1,weight:1,directionBackwards:false,mirroredLoop:false};this.animationsMap[name]=animation;this.animationsList.push(animation);};THREE.MorphBlendMesh.prototype.autoCreateAnimations=function(fps){var pattern=/([a-z]+)_?(\d+)/;var firstAnimation,frameRanges={};var geometry=this.geometry;for(var i=0,il=geometry.morphTargets.length;i<il;i++){var morph=geometry.morphTargets[i];var chunks=morph.name.match(pattern);if(chunks&&chunks.length>1){var name=chunks[1];if(!frameRanges[name])frameRanges[name]={start:Infinity,end:-Infinity};var range=frameRanges[name];if(i<range.start)range.start=i;if(i>range.end)range.end=i;if(!firstAnimation)firstAnimation=name;}}for(var name in frameRanges){var range=frameRanges[name];this.createAnimation(name,range.start,range.end,fps);}this.firstAnimation=firstAnimation;};THREE.MorphBlendMesh.prototype.setAnimationDirectionForward=function(name){var animation=this.animationsMap[name];if(animation){animation.direction=1;animation.directionBackwards=false;}};THREE.MorphBlendMesh.prototype.setAnimationDirectionBackward=function(name){var animation=this.animationsMap[name];if(animation){animation.direction=-1;animation.directionBackwards=true;}};THREE.MorphBlendMesh.prototype.setAnimationFPS=function(name,fps){var animation=this.animationsMap[name];if(animation){animation.fps=fps;animation.duration=(animation.end-animation.start)/animation.fps;}};THREE.MorphBlendMesh.prototype.setAnimationDuration=function(name,duration){var animation=this.animationsMap[name];if(animation){animation.duration=duration;animation.fps=(animation.end-animation.start)/animation.duration;}};THREE.MorphBlendMesh.prototype.setAnimationWeight=function(name,weight){var animation=this.animationsMap[name];if(animation){animation.weight=weight;}};THREE.MorphBlendMesh.prototype.setAnimationTime=function(name,time){var animation=this.animationsMap[name];if(animation){animation.time=time;}};THREE.MorphBlendMesh.prototype.getAnimationTime=function(name){var time=0;var animation=this.animationsMap[name];if(animation){time=animation.time;}return time;};THREE.MorphBlendMesh.prototype.getAnimationDuration=function(name){var duration=-1;var animation=this.animationsMap[name];if(animation){duration=animation.duration;}return duration;};THREE.MorphBlendMesh.prototype.playAnimation=function(name){var animation=this.animationsMap[name];if(animation){animation.time=0;animation.active=true;}else {console.warn("THREE.MorphBlendMesh: animation["+name+"] undefined in .playAnimation()");}};THREE.MorphBlendMesh.prototype.stopAnimation=function(name){var animation=this.animationsMap[name];if(animation){animation.active=false;}};THREE.MorphBlendMesh.prototype.update=function(delta){for(var i=0,il=this.animationsList.length;i<il;i++){var animation=this.animationsList[i];if(!animation.active)continue;var frameTime=animation.duration/animation.length;animation.time+=animation.direction*delta;if(animation.mirroredLoop){if(animation.time>animation.duration||animation.time<0){animation.direction*=-1;if(animation.time>animation.duration){animation.time=animation.duration;animation.directionBackwards=true;}if(animation.time<0){animation.time=0;animation.directionBackwards=false;}}}else {animation.time=animation.time%animation.duration;if(animation.time<0)animation.time+=animation.duration;}var keyframe=animation.start+THREE.Math.clamp(Math.floor(animation.time/frameTime),0,animation.length-1);var weight=animation.weight;if(keyframe!==animation.currentFrame){this.morphTargetInfluences[animation.lastFrame]=0;this.morphTargetInfluences[animation.currentFrame]=1*weight;this.morphTargetInfluences[keyframe]=0;animation.lastFrame=animation.currentFrame;animation.currentFrame=keyframe;}var mix=animation.time%frameTime/frameTime;if(animation.directionBackwards)mix=1-mix;if(animation.currentFrame!==animation.lastFrame){this.morphTargetInfluences[animation.currentFrame]=mix*weight;this.morphTargetInfluences[animation.lastFrame]=(1-mix)*weight;}else {this.morphTargetInfluences[animation.currentFrame]=weight;}}};

},{}],4:[function(require,module,exports){
'use strict';

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
/*global THREE, console */

(function () {

	function OrbitConstraint(object) {

		this.object = object;

		// "target" sets the location of focus, where the object orbits around
		// and where it pans with respect to.
		this.target = new THREE.Vector3();

		// Limits to how far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// Limits to how far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this.minAzimuthAngle = -Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.25;

		////////////
		// internals

		var scope = this;

		var EPS = 0.000001;

		// Current position in spherical coordinate system.
		var theta;
		var phi;

		// Pending changes
		var phiDelta = 0;
		var thetaDelta = 0;
		var scale = 1;
		var panOffset = new THREE.Vector3();
		var zoomChanged = false;

		// API

		this.getPolarAngle = function () {

			return phi;
		};

		this.getAzimuthalAngle = function () {

			return theta;
		};

		this.rotateLeft = function (angle) {

			thetaDelta -= angle;
		};

		this.rotateUp = function (angle) {

			phiDelta -= angle;
		};

		// pass in distance in world space to move left
		this.panLeft = function () {

			var v = new THREE.Vector3();

			return function panLeft(distance) {

				var te = this.object.matrix.elements;

				// get X column of matrix
				v.set(te[0], te[1], te[2]);
				v.multiplyScalar(-distance);

				panOffset.add(v);
			};
		}();

		// pass in distance in world space to move up
		this.panUp = function () {

			var v = new THREE.Vector3();

			return function panUp(distance) {

				var te = this.object.matrix.elements;

				// get Y column of matrix
				v.set(te[4], te[5], te[6]);
				v.multiplyScalar(distance);

				panOffset.add(v);
			};
		}();

		// pass in x,y of change desired in pixel space,
		// right and down are positive
		this.pan = function (deltaX, deltaY, screenWidth, screenHeight) {

			if (scope.object instanceof THREE.PerspectiveCamera) {

				// perspective
				var position = scope.object.position;
				var offset = position.clone().sub(scope.target);
				var targetDistance = offset.length();

				// half of the fov is center to top of screen
				targetDistance *= Math.tan(scope.object.fov / 2 * Math.PI / 180.0);

				// we actually don't use screenWidth, since perspective camera is fixed to screen height
				scope.panLeft(2 * deltaX * targetDistance / screenHeight);
				scope.panUp(2 * deltaY * targetDistance / screenHeight);
			} else if (scope.object instanceof THREE.OrthographicCamera) {

				// orthographic
				scope.panLeft(deltaX * (scope.object.right - scope.object.left) / screenWidth);
				scope.panUp(deltaY * (scope.object.top - scope.object.bottom) / screenHeight);
			} else {

				// camera neither orthographic or perspective
				console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
			}
		};

		this.dollyIn = function (dollyScale) {

			if (scope.object instanceof THREE.PerspectiveCamera) {

				scale /= dollyScale;
			} else if (scope.object instanceof THREE.OrthographicCamera) {

				scope.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
				scope.object.updateProjectionMatrix();
				zoomChanged = true;
			} else {

				console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			}
		};

		this.dollyOut = function (dollyScale) {

			if (scope.object instanceof THREE.PerspectiveCamera) {

				scale *= dollyScale;
			} else if (scope.object instanceof THREE.OrthographicCamera) {

				scope.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
				scope.object.updateProjectionMatrix();
				zoomChanged = true;
			} else {

				console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			}
		};

		this.update = function () {

			var offset = new THREE.Vector3();

			// so camera.up is the orbit axis
			var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
			var quatInverse = quat.clone().inverse();

			var lastPosition = new THREE.Vector3();
			var lastQuaternion = new THREE.Quaternion();

			return function () {

				var position = this.object.position;

				offset.copy(position).sub(this.target);

				// rotate offset to "y-axis-is-up" space
				offset.applyQuaternion(quat);

				// angle from z-axis around y-axis

				theta = Math.atan2(offset.x, offset.z);

				// angle from y-axis

				phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);

				theta += thetaDelta;
				phi += phiDelta;

				// restrict theta to be between desired limits
				theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, theta));

				// restrict phi to be between desired limits
				phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));

				// restrict phi to be betwee EPS and PI-EPS
				phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));

				var radius = offset.length() * scale;

				// restrict radius to be between desired limits
				radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));

				// move target to panned location
				this.target.add(panOffset);

				offset.x = radius * Math.sin(phi) * Math.sin(theta);
				offset.y = radius * Math.cos(phi);
				offset.z = radius * Math.sin(phi) * Math.cos(theta);

				// rotate offset back to "camera-up-vector-is-up" space
				offset.applyQuaternion(quatInverse);

				position.copy(this.target).add(offset);

				this.object.lookAt(this.target);

				if (this.enableDamping === true) {

					thetaDelta *= 1 - this.dampingFactor;
					phiDelta *= 1 - this.dampingFactor;
				} else {

					thetaDelta = 0;
					phiDelta = 0;
				}

				scale = 1;
				panOffset.set(0, 0, 0);

				// update condition is:
				// min(camera displacement, camera rotation in radians)^2 > EPS
				// using small-angle approximation cos(x/2) = 1 - x^2 / 8

				if (zoomChanged || lastPosition.distanceToSquared(this.object.position) > EPS || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS) {

					lastPosition.copy(this.object.position);
					lastQuaternion.copy(this.object.quaternion);
					zoomChanged = false;

					return true;
				}

				return false;
			};
		}();
	};

	// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
	// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
	// supported.
	//
	//    Orbit - left mouse / touch: one finger move
	//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
	//    Pan - right mouse, or arrow keys / touch: three finter swipe

	THREE.OrbitControls = function (object, domElement) {

		var constraint = new OrbitConstraint(object);

		this.domElement = domElement !== undefined ? domElement : document;

		// API

		Object.defineProperty(this, 'constraint', {

			get: function get() {

				return constraint;
			}

		});

		this.getPolarAngle = function () {

			return constraint.getPolarAngle();
		};

		this.getAzimuthalAngle = function () {

			return constraint.getAzimuthalAngle();
		};

		// Set to false to disable this control
		this.enabled = true;

		// center is old, deprecated; use "target" instead
		this.center = this.target;

		// This option actually enables dollying in and out; left as "zoom" for
		// backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.keyPanSpeed = 7.0; // pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// Set to false to disable use of the keys
		this.enableKeys = true;

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

		// Mouse buttons
		this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

		////////////
		// internals

		var scope = this;

		var rotateStart = new THREE.Vector2();
		var rotateEnd = new THREE.Vector2();
		var rotateDelta = new THREE.Vector2();

		var panStart = new THREE.Vector2();
		var panEnd = new THREE.Vector2();
		var panDelta = new THREE.Vector2();

		var dollyStart = new THREE.Vector2();
		var dollyEnd = new THREE.Vector2();
		var dollyDelta = new THREE.Vector2();

		var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };

		var state = STATE.NONE;

		// for reset

		this.target0 = this.target.clone();
		this.position0 = this.object.position.clone();
		this.zoom0 = this.object.zoom;

		// events

		var changeEvent = { type: 'change' };
		var startEvent = { type: 'start' };
		var endEvent = { type: 'end' };

		// pass in x,y of change desired in pixel space,
		// right and down are positive
		function pan(deltaX, deltaY) {

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			constraint.pan(deltaX, deltaY, element.clientWidth, element.clientHeight);
		}

		this.update = function () {

			if (this.autoRotate && state === STATE.NONE) {

				constraint.rotateLeft(getAutoRotationAngle());
			}

			if (constraint.update() === true) {

				this.dispatchEvent(changeEvent);
			}
		};

		this.reset = function () {

			state = STATE.NONE;

			this.target.copy(this.target0);
			this.object.position.copy(this.position0);
			this.object.zoom = this.zoom0;

			this.object.updateProjectionMatrix();
			this.dispatchEvent(changeEvent);

			this.update();
		};

		function getAutoRotationAngle() {

			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
		}

		function getZoomScale() {

			return Math.pow(0.95, scope.zoomSpeed);
		}

		function onMouseDown(event) {

			if (scope.enabled === false) return;

			event.preventDefault();

			if (event.button === scope.mouseButtons.ORBIT) {

				if (scope.enableRotate === false) return;

				state = STATE.ROTATE;

				rotateStart.set(event.clientX, event.clientY);
			} else if (event.button === scope.mouseButtons.ZOOM) {

				if (scope.enableZoom === false) return;

				state = STATE.DOLLY;

				dollyStart.set(event.clientX, event.clientY);
			} else if (event.button === scope.mouseButtons.PAN) {

				if (scope.enablePan === false) return;

				state = STATE.PAN;

				panStart.set(event.clientX, event.clientY);
			}

			if (state !== STATE.NONE) {

				document.addEventListener('mousemove', onMouseMove, false);
				document.addEventListener('mouseup', onMouseUp, false);
				scope.dispatchEvent(startEvent);
			}
		}

		function onMouseMove(event) {

			if (scope.enabled === false) return;

			event.preventDefault();

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			if (state === STATE.ROTATE) {

				if (scope.enableRotate === false) return;

				rotateEnd.set(event.clientX, event.clientY);
				rotateDelta.subVectors(rotateEnd, rotateStart);

				// rotating across whole screen goes 360 degrees around
				constraint.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);

				// rotating up and down along whole screen attempts to go 360, but limited to 180
				constraint.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

				rotateStart.copy(rotateEnd);
			} else if (state === STATE.DOLLY) {

				if (scope.enableZoom === false) return;

				dollyEnd.set(event.clientX, event.clientY);
				dollyDelta.subVectors(dollyEnd, dollyStart);

				if (dollyDelta.y > 0) {

					constraint.dollyIn(getZoomScale());
				} else if (dollyDelta.y < 0) {

					constraint.dollyOut(getZoomScale());
				}

				dollyStart.copy(dollyEnd);
			} else if (state === STATE.PAN) {

				if (scope.enablePan === false) return;

				panEnd.set(event.clientX, event.clientY);
				panDelta.subVectors(panEnd, panStart);

				pan(panDelta.x, panDelta.y);

				panStart.copy(panEnd);
			}

			if (state !== STATE.NONE) scope.update();
		}

		function onMouseUp() /* event */{

			if (scope.enabled === false) return;

			document.removeEventListener('mousemove', onMouseMove, false);
			document.removeEventListener('mouseup', onMouseUp, false);
			scope.dispatchEvent(endEvent);
			state = STATE.NONE;
		}

		function onMouseWheel(event) {

			if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE) return;

			event.preventDefault();
			event.stopPropagation();

			var delta = 0;

			if (event.wheelDelta !== undefined) {

				// WebKit / Opera / Explorer 9

				delta = event.wheelDelta;
			} else if (event.detail !== undefined) {

				// Firefox

				delta = -event.detail;
			}

			if (delta > 0) {

				constraint.dollyOut(getZoomScale());
			} else if (delta < 0) {

				constraint.dollyIn(getZoomScale());
			}

			scope.update();
			scope.dispatchEvent(startEvent);
			scope.dispatchEvent(endEvent);
		}

		function onKeyDown(event) {

			if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

			switch (event.keyCode) {

				case scope.keys.UP:
					pan(0, scope.keyPanSpeed);
					scope.update();
					break;

				case scope.keys.BOTTOM:
					pan(0, -scope.keyPanSpeed);
					scope.update();
					break;

				case scope.keys.LEFT:
					pan(scope.keyPanSpeed, 0);
					scope.update();
					break;

				case scope.keys.RIGHT:
					pan(-scope.keyPanSpeed, 0);
					scope.update();
					break;

			}
		}

		function touchstart(event) {

			if (scope.enabled === false) return;

			switch (event.touches.length) {

				case 1:
					// one-fingered touch: rotate

					if (scope.enableRotate === false) return;

					state = STATE.TOUCH_ROTATE;

					rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
					break;

				case 2:
					// two-fingered touch: dolly

					if (scope.enableZoom === false) return;

					state = STATE.TOUCH_DOLLY;

					var dx = event.touches[0].pageX - event.touches[1].pageX;
					var dy = event.touches[0].pageY - event.touches[1].pageY;
					var distance = Math.sqrt(dx * dx + dy * dy);
					dollyStart.set(0, distance);
					break;

				case 3:
					// three-fingered touch: pan

					if (scope.enablePan === false) return;

					state = STATE.TOUCH_PAN;

					panStart.set(event.touches[0].pageX, event.touches[0].pageY);
					break;

				default:

					state = STATE.NONE;

			}

			if (state !== STATE.NONE) scope.dispatchEvent(startEvent);
		}

		function touchmove(event) {

			if (scope.enabled === false) return;

			event.preventDefault();
			event.stopPropagation();

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			switch (event.touches.length) {

				case 1:
					// one-fingered touch: rotate

					if (scope.enableRotate === false) return;
					if (state !== STATE.TOUCH_ROTATE) return;

					rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
					rotateDelta.subVectors(rotateEnd, rotateStart);

					// rotating across whole screen goes 360 degrees around
					constraint.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);
					// rotating up and down along whole screen attempts to go 360, but limited to 180
					constraint.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

					rotateStart.copy(rotateEnd);

					scope.update();
					break;

				case 2:
					// two-fingered touch: dolly

					if (scope.enableZoom === false) return;
					if (state !== STATE.TOUCH_DOLLY) return;

					var dx = event.touches[0].pageX - event.touches[1].pageX;
					var dy = event.touches[0].pageY - event.touches[1].pageY;
					var distance = Math.sqrt(dx * dx + dy * dy);

					dollyEnd.set(0, distance);
					dollyDelta.subVectors(dollyEnd, dollyStart);

					if (dollyDelta.y > 0) {

						constraint.dollyOut(getZoomScale());
					} else if (dollyDelta.y < 0) {

						constraint.dollyIn(getZoomScale());
					}

					dollyStart.copy(dollyEnd);

					scope.update();
					break;

				case 3:
					// three-fingered touch: pan

					if (scope.enablePan === false) return;
					if (state !== STATE.TOUCH_PAN) return;

					panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
					panDelta.subVectors(panEnd, panStart);

					pan(panDelta.x, panDelta.y);

					panStart.copy(panEnd);

					scope.update();
					break;

				default:

					state = STATE.NONE;

			}
		}

		function touchend() /* event */{

			if (scope.enabled === false) return;

			scope.dispatchEvent(endEvent);
			state = STATE.NONE;
		}

		function contextmenu(event) {

			event.preventDefault();
		}

		this.dispose = function () {

			this.domElement.removeEventListener('contextmenu', contextmenu, false);
			this.domElement.removeEventListener('mousedown', onMouseDown, false);
			this.domElement.removeEventListener('mousewheel', onMouseWheel, false);
			this.domElement.removeEventListener('MozMousePixelScroll', onMouseWheel, false); // firefox

			this.domElement.removeEventListener('touchstart', touchstart, false);
			this.domElement.removeEventListener('touchend', touchend, false);
			this.domElement.removeEventListener('touchmove', touchmove, false);

			document.removeEventListener('mousemove', onMouseMove, false);
			document.removeEventListener('mouseup', onMouseUp, false);

			window.removeEventListener('keydown', onKeyDown, false);
		};

		this.domElement.addEventListener('contextmenu', contextmenu, false);

		this.domElement.addEventListener('mousedown', onMouseDown, false);
		this.domElement.addEventListener('mousewheel', onMouseWheel, false);
		this.domElement.addEventListener('MozMousePixelScroll', onMouseWheel, false); // firefox

		this.domElement.addEventListener('touchstart', touchstart, false);
		this.domElement.addEventListener('touchend', touchend, false);
		this.domElement.addEventListener('touchmove', touchmove, false);

		window.addEventListener('keydown', onKeyDown, false);

		// force an update at start
		this.update();
	};

	THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
	THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

	Object.defineProperties(THREE.OrbitControls.prototype, {

		object: {

			get: function get() {

				return this.constraint.object;
			}

		},

		target: {

			get: function get() {

				return this.constraint.target;
			},

			set: function set(value) {

				console.warn('THREE.OrbitControls: target is now immutable. Use target.set() instead.');
				this.constraint.target.copy(value);
			}

		},

		minDistance: {

			get: function get() {

				return this.constraint.minDistance;
			},

			set: function set(value) {

				this.constraint.minDistance = value;
			}

		},

		maxDistance: {

			get: function get() {

				return this.constraint.maxDistance;
			},

			set: function set(value) {

				this.constraint.maxDistance = value;
			}

		},

		minZoom: {

			get: function get() {

				return this.constraint.minZoom;
			},

			set: function set(value) {

				this.constraint.minZoom = value;
			}

		},

		maxZoom: {

			get: function get() {

				return this.constraint.maxZoom;
			},

			set: function set(value) {

				this.constraint.maxZoom = value;
			}

		},

		minPolarAngle: {

			get: function get() {

				return this.constraint.minPolarAngle;
			},

			set: function set(value) {

				this.constraint.minPolarAngle = value;
			}

		},

		maxPolarAngle: {

			get: function get() {

				return this.constraint.maxPolarAngle;
			},

			set: function set(value) {

				this.constraint.maxPolarAngle = value;
			}

		},

		minAzimuthAngle: {

			get: function get() {

				return this.constraint.minAzimuthAngle;
			},

			set: function set(value) {

				this.constraint.minAzimuthAngle = value;
			}

		},

		maxAzimuthAngle: {

			get: function get() {

				return this.constraint.maxAzimuthAngle;
			},

			set: function set(value) {

				this.constraint.maxAzimuthAngle = value;
			}

		},

		enableDamping: {

			get: function get() {

				return this.constraint.enableDamping;
			},

			set: function set(value) {

				this.constraint.enableDamping = value;
			}

		},

		dampingFactor: {

			get: function get() {

				return this.constraint.dampingFactor;
			},

			set: function set(value) {

				this.constraint.dampingFactor = value;
			}

		},

		// backward compatibility

		noZoom: {

			get: function get() {

				console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
				return !this.enableZoom;
			},

			set: function set(value) {

				console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
				this.enableZoom = !value;
			}

		},

		noRotate: {

			get: function get() {

				console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
				return !this.enableRotate;
			},

			set: function set(value) {

				console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
				this.enableRotate = !value;
			}

		},

		noPan: {

			get: function get() {

				console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
				return !this.enablePan;
			},

			set: function set(value) {

				console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
				this.enablePan = !value;
			}

		},

		noKeys: {

			get: function get() {

				console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
				return !this.enableKeys;
			},

			set: function set(value) {

				console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
				this.enableKeys = !value;
			}

		},

		staticMoving: {

			get: function get() {

				console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
				return !this.constraint.enableDamping;
			},

			set: function set(value) {

				console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
				this.constraint.enableDamping = !value;
			}

		},

		dynamicDampingFactor: {

			get: function get() {

				console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
				return this.constraint.dampingFactor;
			},

			set: function set(value) {

				console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
				this.constraint.dampingFactor = value;
			}

		}

	});
})();

},{}],5:[function(require,module,exports){
"use strict";

var _three = require("./../../bower_components/three.js/build/three.js");

var _three2 = _interopRequireDefault(_three);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Tetris3d() {
  var _this = this;

  // 変数宣言 ----------------------------------------------------------------------------------------------------
  this.container;
  this.stats;
  this.camera;
  this.scene;
  this.renderer;
  this.projector;
  this.plane;
  this.cube;
  this.mouse2D = {};
  // mouse3D, raycaster,
  // rollOveredFace,
  // theta = 45 * 0.5,
  // thetaY = 30,
  this.rollOverMesh;
  this.rollOverMaterial;
  this.voxelPosition = new _three2.default.Vector3();
  this.tmpVec = new _three2.default.Vector3();
  this.normalMatrix = new _three2.default.Matrix3();
  this.cubeGeo;
  this.cubeMaterial = [];
  this.i;
  this.intersector;
  this.objects = [];
  this.orthocamera;
  this.ortho = false;
  this.width = window.innerWidth;
  this.height = window.innerHeight;
  this.fieldsize = 10;
  this.fieldHeight = 20;
  this.boardSizeX = 10;
  this.boardSizeY = 20; // 高さ
  this.boardSizeZ = 10;
  this.board = [];
  for (var x = 0; x < this.boardSizeX; x++) {
    this.board[x] = [];
    for (var y = 0; y < this.boardSizeY; y++) {
      this.board[x][y] = [];
      for (var z = 0; z < this.boardSizeZ; z++) {
        this.board[x][y][z] = 0;
      }
    }
  }
  this.current; // 現在操作しているブロック
  this.currentX;
  this.currentY; // 現在操作しているブロックのいち
  this.lastAnimTime = 0;
  _this.lastMoveTime = 0;
  this.framecount = 0;
  this.voxels = [], this.blocks = [];
  // 球座標
  this.r = 1400;
  this.theta = 60;
  this.phi = 0;
  this.isAnykeyDown = this.isRightDown = this.isLeftDown = this.isUpDown = this.isDownDown = this.is59Down = this.isStarDown = this.isPlusDown = this.is190Down = this.is191Down = this.is_Down = this.isShiftDown = this.isCtrlDown = this.isZdown = this.isXdown = this.isAdown = this.isSdown = this.isDdown = this.isQdown = this.isWdown = this.isEdown = this.is0down = this.is1down = this.is2down = this.is3down = false;
  // var isKeyDown = [
  //  "right", "left", "up", "down",
  //  "59", "star", "plus", "190", "191", "_",
  //  "shift", "ctrl",
  //  "z", "x",
  //  "a", "s", "d", "q", "w", "e",
  //  "0", "1", "2", "3"
  // ];

  // ブロックの色
  this.colors = ["rgb(254,183,76)", "rgb(251,122,111)", "rgb(247,181,90)", "rgb(241,221,96)", "rgb(191,216,94)", "rgb(107,180,252)", "rgb(202,162,221)", "rgb(100,198,173)"];

  // 4 x 4 x 4
  this.shapes = [[[// 1.横棒
  [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], [[// 2.四角
  [1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], [[// 3.L字
  [1, 1, 1, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], [[// 4.Z字(S字)
  [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], [[// 5.T字
  [1, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], [[// 6.3方向
  [1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], [[// 7.うねうね1
  [1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], [[// 8.うねうね2
  [1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]];
}

Tetris3d.prototype.init = function () {
  var _this = this;

  // container ------------------------------
  this.container = document.getElementById('canvas-container');

  // renderer ------------------------------
  this.renderer = new _three2.default.WebGLRenderer({ antialias: true });
  this.renderer.setClearColor(0xf0f0f0); // 背景色
  this.renderer.setSize(this.width, this.height);
  this.container.appendChild(this.renderer.domElement);

  // scene ------------------------------
  this.scene = new _three2.default.Scene();

  // camera ------------------------------
  this.perscamera = new _three2.default.PerspectiveCamera(45, this.width / this.height, 1, 10000); // fov(視野角),aspect,near,far
  this.orthocamera = new _three2.default.OrthographicCamera(this.width / -2, this.width / 2, this.height / 2, this.height / -2, 1, 10000);
  // this.combinedcamera = new THREE.CombinedCamera( this.width, this.height, 45, 1, 10000, 1, 10000 );
  this.camera = this.perscamera;
  // this.camera.position.y = 800;
  this.camera.position.set(100, 100, 100);
  this.camera.up.set(0, 1, 0);
  this.camera.lookAt({ x: 0, y: 0, z: 0 });

  // axis ------------------------------
  var axis = new _three2.default.AxisHelper(1000);
  axis.position.set(0, 0, 0);
  this.scene.add(axis);

  // grid ------------------------------
  // var gridstep = 50, // gridの間隔
  //  gridsize = 10, // gridのマスの数
  //  size = gridsize/2 * gridstep;
  // var size = fieldsize/2 * 50,
  var size = this.fieldsize * 50;
  var step = 50;
  var geometry = new _three2.default.Geometry();
  for (var i = 0; i <= size; i += step) {
    geometry.vertices.push(new _three2.default.Vector3(0, 0, i));
    geometry.vertices.push(new _three2.default.Vector3(size, 0, i));
    geometry.vertices.push(new _three2.default.Vector3(i, 0, 0));
    geometry.vertices.push(new _three2.default.Vector3(i, 0, size));
  }
  var material = new _three2.default.LineBasicMaterial({ color: 0x000000, opacity: 0.2, transparent: true });
  var line = new _three2.default.Line(geometry, material);
  line.type = _three2.default.LinePieces;
  this.scene.add(line);

  // plane ------------------------------
  // plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() );
  // plane.rotation.x = - Math.PI / 2;
  // plane.visible = false;
  // this.scene.add( plane );
  // objects.push( plane );

  // Lights ------------------------------
  var ambientLight = new _three2.default.AmbientLight(0x606060);
  this.scene.add(ambientLight);
  var directionalLight = new _three2.default.DirectionalLight(0xffffff);
  // directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
  directionalLight.position.set(0.5, 0.75, 1).normalize();
  this.scene.add(directionalLight);

  // picking ------------------------------
  // projector = new THREE.Projector();

  // mouse ------------------------------
  this.mouse2D = new _three2.default.Vector3(0, 10000, 0.5);

  // roll-over helpers ------------------------------
  // rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
  // rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
  // rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
  // this.scene.add( rollOverMesh );

  // stats ------------------------------
  // stats = new Stats();
  // stats.domElement.style.position = 'absolute';
  // stats.domElement.style.top = '0px';
  // container.appendChild( stats.domElement );

  // cubes ------------------------------
  this.cubeGeo = new _three2.default.BoxGeometry(50, 50, 50);
  // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, ambient: 0x00ff80, shading: THREE.FlatShading, map: THREE.ImageUtils.loadTexture( "textures/square-outline-textured.png" ) } );
  // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, ambient: 0x00ff80, shading: THREE.FlatShading } );
  // this.cubeMaterial.ambient = this.cubeMaterial.color;
  // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, shading: THREE.FlatShading } );
  // this.cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, ambient: 0xfeb74c });
  this.cubeMaterial[0] = new _three2.default.MeshLambertMaterial({ color: "rgb(254,183,76)", ambient: "rgb(254, 183, 76)" });
  this.cubeMaterial[1] = new _three2.default.MeshLambertMaterial({ color: "rgb(251,122,111)", ambient: "rgb(251,122,111)" });
  this.cubeMaterial[2] = new _three2.default.MeshLambertMaterial({ color: "rgb(247,181,90)", ambient: "rgb(247,181,90)" });
  this.cubeMaterial[3] = new _three2.default.MeshLambertMaterial({ color: "rgb(241,221,96)", ambient: "rgb(241,221,96)" });
  this.cubeMaterial[4] = new _three2.default.MeshLambertMaterial({ color: "rgb(191,216,94)", ambient: "rgb(191,216,94)" });
  this.cubeMaterial[5] = new _three2.default.MeshLambertMaterial({ color: "rgb(107,180,252)", ambient: "rgb(107,180,252)" });
  this.cubeMaterial[6] = new _three2.default.MeshLambertMaterial({ color: "rgb(202,162,221)", ambient: "rgb(202,162,221)" });
  this.cubeMaterial[7] = new _three2.default.MeshLambertMaterial({ color: "rgb(100,198,173)", ambient: "rgb(100,198,173)" });
  // this.cubeMaterial.ambient = this.cubeMaterial.color;

  // event bind ------------------------------
  document.addEventListener('mousemove', function (evt) {
    evt.preventDefault();
    _this.mouse2D.x = evt.clientX / _this.width * 2 - 1;
    _this.mouse2D.y = -(evt.clientY / _this.height) * 2 + 1;
  }, false);
  // document.addEventListener('mousedown', function(evt){
  //   _this.onDocumentMouseDown(evt);
  // }, false);
  document.addEventListener('keydown', function (evt) {
    evt.preventDefault();
    _this.onDocumentKeyDown(evt);
  }, false);
  document.addEventListener('keyup', function (evt) {
    _this.onDocumentKeyUp(evt);
  }, false);
  window.addEventListener('resize', function (evt) {
    _this.setSize();
  }, false);

  // start ------------------------------
  _this.animate();
}; // ~ init

// ユーザ制御系・操作系・描画制御系 ----------------------------------------------------------------------------------------------------
Tetris3d.prototype.onDocumentKeyDown = function (event) {
  var _this = this;

  _this.isAnykeyDown = true;
  switch (event.keyCode) {
    case 16:
      _this.isShiftDown = true;break;
    case 17:
      _this.isCtrlDown = true;break;

    case 90:
      _this.isZdown = true;break;
    case 88:
      _this.isXdown = true;break;
    case 65:
      _this.isAdown = true;break;
    case 83:
      _this.isSdown = true;break;
    case 68:
      _this.isDdown = true;break;
    case 81:
      _this.isQdown = true;break;
    case 87:
      _this.isWdown = true;break;
    case 69:
      _this.isEdown = true;break;

    case 37:
      _this.isLeftDown = true;_this.ortho = false;break;
    case 38:
      _this.isUpDown = true;_this.ortho = false;break;
    case 39:
      _this.isRightDown = true;_this.ortho = false;break;
    case 40:
      _this.isDownDown = true;_this.ortho = false;break;

    case 59:
      _this.is59Down = true;break; // ]
    case 58:
      _this.isStarDown = true;break; // *
    case 221:
      _this.isPlusDown = true;break; // +

    case 190:
      _this.is190Down = true;break; // >

    case 191:
      _this.is191Down = true;break; // ?
    case 167:
      _this.is_Down = true;break; // _

    case 48:
      // 0
      _this.is0down = true;
      if (_this.ortho) {
        _this.ortho = false;
      } else {
        _this.ortho = true;
      }
      break;
    case 49:
      _this.is1down = true;_this.ortho = true;break;
    case 50:
      _this.is2down = true;_this.ortho = true;break;
    case 51:
      _this.is3down = true;_this.ortho = true;break;
  }
};

Tetris3d.prototype.onDocumentKeyUp = function (event) {
  var _this = this;
  _this.isAnykeyDown = false;
  switch (event.keyCode) {
    case 16:
      _this.isShiftDown = false;break;
    case 17:
      _this.isCtrlDown = false;break;
    case 90:
      _this.isZdown = false;break;
    case 88:
      _this.isXdown = false;break;
    case 65:
      _this.isAdown = false;break;
    case 83:
      _this.isSdown = false;break;
    case 68:
      _this.isDdown = false;break;
    case 81:
      _this.isQdown = false;break;
    case 87:
      _this.isWdown = false;break;
    case 69:
      _this.isEdown = false;break;
    case 37:
      _this.isLeftDown = false;break;
    case 38:
      _this.isUpDown = false;break;
    case 39:
      _this.isRightDown = false;break;
    case 40:
      _this.isDownDown = false;break;
    case 59:
      _this.is59Down = false;break;
    case 58:
      _this.isStarDown = false;break;
    case 221:
      _this.isPlusDown = false;break;
    case 190:
      _this.is190Down = false;break;
    case 191:
      _this.is191Down = false;break;
    case 167:
      _this.is_Down = false;break;
    case 48:
      _this.is0down = false;break;
    case 49:
      _this.is1down = false;break;
    case 50:
      _this.is2down = false;break;
    case 51:
      _this.is3down = false;break;
  }
};

Tetris3d.prototype.setSize = function () {
  var _this = this;
  _this.width = window.innerWidth;
  _this.height = window.innerHeight;
  // _this.camera.aspect = _this.width / _this.height;
  _this.perscamera.aspect = _this.width / _this.height;
  // if( _this.width > 600 ){
  //  _this.orthocamera.left = -_this.width;
  //  _this.orthocamera.right = _this.width;
  // }else{
  //  _this.orthocamera.left = -600;
  //  _this.orthocamera.right = 600;
  // }
  // if( _this.height > 600 ){
  //  _this.orthocamera.top = _this.height;
  //  _this.orthocamera.bottom = -_this.height;
  // }else{
  //  _this.orthocamera.top = 600;
  //  _this.orthocamera.bottom = -600;
  // }
  _this.camera.updateProjectionMatrix();
  _this.renderer.setSize(_this.width, _this.height);
};

// ブロック制御系 ----------------------------------------------------------------------------------------------------
Tetris3d.prototype.moveBlock = function () {
  var _this = this;
  var processtime = window.performance.now() - _this.lastMoveTime;
  if (processtime > 500) {
    var n = _this.blocks.length - 1;
    if (!_this.blocks[n].stopped) {
      if (_this.detectCollision(n)) {
        _this.blocks[n].stopped = true;
      } else {
        for (var j = 0; j < _this.blocks[n].length; j++) {

          if (_this.isSdown) {
            _this.blocks[n][j].position.z += 50;
          }
          if (_this.isDdown) {
            _this.blocks[n][j].position.x += 50;
          }
          if (_this.isWdown) {
            _this.blocks[n][j].position.z -= 50;
          }
          if (_this.isAdown) {
            _this.blocks[n][j].position.x -= 50;
          }

          _this.scene.add(_this.blocks[n][j]);
        }
        _this.lastMoveTime = window.performance.now();
      }
    }
  }
};

Tetris3d.prototype.updateBlocks = function () {
  var _this = this;
  var n = _this.blocks.length - 1;
  if (!_this.blocks[n].stopped) {
    if (_this.detectCollision(n)) {
      _this.blocks[n].stopped = true;
    } else {
      for (var j = 0; j < _this.blocks[n].length; j++) {
        _this.blocks[n][j].position.y -= 50;
        _this.scene.add(_this.blocks[n][j]);
      }
    }
  }
};

Tetris3d.prototype.createBlock = function () {
  var _this = this;
  // var block_num = 7;
  var block_num = Math.floor(Math.random() * 7) + 1;
  // var x = Math.floor(Math.random() * 20) - 10;   // -10~9の整数の乱数
  var x = Math.floor(Math.random() * _this.fieldsize) - _this.fieldsize / 2;
  var z = Math.floor(Math.random() * _this.fieldsize) - _this.fieldsize / 2;

  var y = 20 * 50;

  var voxel = new Array(4);
  // var cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, ambient: 0xfeb74c });
  for (var i = 0; i < voxel.length; i++) {
    voxel[i] = new _three2.default.Mesh(_this.cubeGeo, _this.cubeMaterial[block_num]);
  }
  // voxel.forEach(function(element, index, array){
  //  element = new THREE.Mesh( _this.cubeGeo, _this.cubeMaterial );
  // });
  switch (block_num) {
    case 0:
      // voxel.forEach(function(element){ element.material.color.set("rgb(254, 183, 76)"); });
      voxel[0].position.set(x * 50, y, z * 50);
      voxel[1].position.set((x + 1) * 50, y, z * 50);
      voxel[2].position.set((x + 1) * 50, y, (z + 1) * 50);
      voxel[3].position.set(x * 50, y, (z + 1) * 50);
      break;
    case 1:
      // voxel.forEach(function(element){ element.material.color.set("rgb(251,122,111)"); });
      voxel[0].position.set(x * 50, y, z * 50);
      voxel[1].position.set(x * 50, y + 50, z * 50);
      voxel[2].position.set(x * 50, y + 50 * 2, z * 50);
      voxel[3].position.set(x * 50, y + 50 * 3, z * 50);
      break;
    case 2:
      // voxel.forEach(function(element){ element.material.color.set("rgb(247,181,90)"); });
      voxel[0].position.set(x * 50, y, z * 50);
      voxel[1].position.set((x + 1) * 50, y, z * 50);
      voxel[2].position.set((x + 1) * 50, y + 50, z * 50);
      voxel[3].position.set((x + 2) * 50, y + 50, z * 50);
      break;
    case 3:
      // voxel.forEach(function(element){ element.material.color.set("rgb(241,221,96)"); });
      voxel[0].position.set(x * 50, y, z * 50);
      voxel[1].position.set((x + 1) * 50, y, z * 50);
      voxel[2].position.set((x + 2) * 50, y, z * 50);
      voxel[3].position.set((x + 1) * 50, y + 50, z * 50);
      break;
    case 4:
      // voxel.forEach(function(element){ element.material.color.set("rgb(191,216,94)"); });
      voxel[0].position.set(x * 50, y, z * 50);
      voxel[1].position.set((x + 1) * 50, y, z * 50);
      voxel[2].position.set((x + 1) * 50, y + 50, z * 50);
      voxel[3].position.set((x + 1) * 50, y + 50 * 2, z * 50);
      break;
    case 5:
      // voxel.forEach(function(element){ element.material.color.set("rgb(107,180,252)"); });
      voxel[0].position.set(x * 50, y, z * 50);
      voxel[1].position.set((x + 1) * 50, y, z * 50);
      voxel[2].position.set((x + 1) * 50, y, (z + 1) * 50);
      voxel[3].position.set((x + 1) * 50, y + 50, z * 50);
      break;
    case 6:
      // voxel.forEach(function(element){ element.material.color.set("rgb(202,162,221)"); });
      voxel[0].position.set(x * 50, y, z * 50);
      voxel[1].position.set((x + 1) * 50, y, z * 50);
      voxel[2].position.set((x + 1) * 50, y, (z + 1) * 50);
      voxel[3].position.set(x * 50, y + 50, z * 50);
      break;
    case 7:
      // voxel.forEach(function(element){ element.material.color.set("rgb(182,182,182)"); });
      voxel[0].position.set(x * 50, y, z * 50);
      voxel[1].position.set((x + 1) * 50, y, z * 50);
      voxel[2].position.set((x + 1) * 50, y, (z + 1) * 50);
      voxel[3].position.set((x + 1) * 50, y + 50, (z + 1) * 50);
      break;
  }
  voxel.forEach(function (element, index, array) {
    // element.material.ambient = element.material.color;
    element.position.addScalar(25); // グリッドに合わせる。
    // voxels.push(element);
  });
  _this.blocks.push(voxel);
};

Tetris3d.prototype.detectCollision = function (index) {
  // 衝突判定 Collision Detection
  var _this = this;
  var block = _this.blocks[index];
  for (var i = 0; i < block.length; i++) {
    var vx = block[i].position.x,
        vy = block[i].position.y,
        vz = block[i].position.z;

    if (vy <= 25) {
      // 床
      return true;
    } else {
      for (var j = 0; j < _this.blocks.length; j++) {
        if (j != index) {
          // 自分自身でなければ
          for (var k = 0; k < _this.blocks[j].length; k++) {
            if (vx == _this.blocks[j][k].position.x && vy - 50 == _this.blocks[j][k].position.y && vz == _this.blocks[j][k].position.z) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
};

// 描画フレーム・フレーム制御 ----------------------------------------------------------------------------------------------------
Tetris3d.prototype.animate = function () {
  var _this = this;

  var rendering = false;
  var processtime = window.performance.now() - _this.lastAnimTime;

  if (_this.blocks.length == 0 || _this.blocks[_this.blocks.length - 1].stopped) {
    _this.createBlock();
  }

  // if( (isZdown || isXdown || isAdown || isSdown) && (processtime > 800) ){
  // if( isZdown || isXdown || isAdown || isSdown ){
  if (_this.isAnykeyDown) {
    rendering = true;
    _this.moveBlock();
  }

  // if( isCtrlDown || isShiftDown ){
  // if( isAnykeyDown ){
  //  _this.render();
  // }else
  if (processtime > 800) {
    _this.updateBlocks();
    // _this.render();
    rendering = true;
    _this.lastAnimTime = window.performance.now();
  }
  if (rendering) {
    _this.render();
  }

  // stats.update();

  requestAnimationFrame(function () {
    _this.animate();
  });
};

// 描画系 ----------------------------------------------------------------------------------------------------
Tetris3d.prototype.render = function () {
  var _this = this;
  _this.framecount++;

  // if( _this.framecount % 5 == 0 ){
  // if( blocks.length == 0 || blocks[blocks.length-1].stopped ){
  //  _this.createBlock();
  // }

  // for(var i=0; i<voxels.length; i++){
  //  if( !voxels[i].stopped && voxels[i].position.y > 25 && !_this.detectCollision(voxels[i]) ){
  //      voxels[i].position.y -= 50;
  //      scene.add( voxels[i] );
  //  }else{
  //      voxels[i].stopped = true;
  //  }
  // }
  // for(var i=0; i<blocks.length; i++){
  //  if( !blocks[i].stopped ){
  //      // if( _this.detectCollision(blocks[i]) ){
  //      if( _this.detectCollision(i) ){
  //          blocks[i].stopped = true;
  //      }else{
  //          for(var j=0; j<blocks[i].length; j++){
  //              // if( blocks[i][j].position.y > 25 ){
  //                  blocks[i][j].position.y -= 50;
  //              // }
  //              scene.add( blocks[i][j] );
  //          }
  //      }
  //  }
  // }

  // voxels.forEach(function(element, index, array){
  // });

  if (_this.isCtrlDown) {
    // _this.theta += _this.mouse2D.x * 1.5;
    // _this.theta += 1.5;
    // camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( _this.theta ) );
    // camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( _this.theta ) );
  }
  if (_this.isShiftDown) {
    // thetaY += _this.mouse2D.y * 1.5;
    // thetaY += 1.5;
    // if(thetaY > 50){ thetaY = 50 }
    // else if(thetaY < -50){ thetaY = -50 }
    // camera.position.y = 1400 * Math.sin( THREE.Math.degToRad( thetaY ) );
    // camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( _this.theta ) ) - Math.abs(camera.position.y);
    // camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( _this.theta ) ) - Math.abs(camera.position.y);
  }
  if (_this.isUpDown) {
    _this.theta -= 1.5;
    if (_this.theta < 0.01) {
      _this.theta = 0.01;
    }
  }
  if (_this.isDownDown) {
    _this.theta += 1.5;
    if (_this.theta > 180) {
      _this.theta = 180;
    }
  }
  if (_this.isRightDown) {
    _this.phi += 1.5;
  }
  if (_this.isLeftDown) {
    _this.phi -= 1.5;
  }
  if (_this.is_Down) {
    _this.r += 10;
  }
  if (_this.is191Down) {
    _this.r -= 10;
  }

  if (_this.is1down) {
    // z方向から
    _this.theta = 90;
    _this.phi = 0;
  }
  if (_this.is2down) {
    // x方向から
    _this.theta = 90;
    _this.phi = 90;
  }
  if (_this.is3down) {
    // y方向から
    _this.theta = 0.01;
    _this.phi = 0;
  }

  if (_this.ortho) {
    _this.camera = _this.orthocamera;
  } else {
    _this.camera = _this.perscamera;
  }

  _this.camera.position.z = _this.r * Math.sin(_this.theta / 180 * Math.PI) * Math.cos(_this.phi / 180 * Math.PI);
  _this.camera.position.x = _this.r * Math.sin(_this.theta / 180 * Math.PI) * Math.sin(_this.phi / 180 * Math.PI);
  _this.camera.position.y = _this.r * Math.cos(_this.theta / 180 * Math.PI);
  // _this.camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( _this.theta ) );
  // _this.camera.position.y = 1400 * Math.tan( THREE.Math.degToRad( thetaY ) );
  // _this.camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( _this.theta ) );
  // _this.camera.position.set(0,100,-500);
  _this.camera.lookAt(_this.scene.position);
  _this.renderer.render(_this.scene, _this.camera);
}; // ~ render

module.exports = Tetris3d;

},{"./../../bower_components/three.js/build/three.js":3}],6:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Tetris3dCONST = function Tetris3dCONST() {
  _classCallCheck(this, Tetris3dCONST);

  this.COLS = 10; // x, z field size
  this.ROWS = 20; // y field size
  this.FIELD_SIZE = 10; // this.COLS

  // NUMBER_OF_BLOCK = 4;
  // NUMBER_OF_VOXEL = 4; // number of voxel in a block
  this.VOXEL_LENGTH = 4; // voxel length in a block
  // BLOCK_SIZE = 4;
  // BLOCK_SIZE = 50;
  this.VOXEL_SIZE = 50;

  this.START_X = Math.floor((this.COLS - this.VOXEL_LENGTH) / 2);
  this.START_Y = 0;
  this.START_Z = Math.floor((this.COLS - this.VOXEL_LENGTH) / 2);

  this.HIDDEN_ROWS = this.VOXEL_LENGTH;
  this.LOGICAL_ROWS = this.ROWS + this.HIDDEN_ROWS;

  this.WIDTH = this.VOXEL_SIZE * this.COLS;
  this.HEIGHT = this.VOXEL_SIZE * this.ROWS;

  this.CENTER_X = this.WIDTH / 2;
  this.CENTER_Y = this.HEIGHT / 2;
  this.CENTER_Z = this.WIDTH / 2;

  this.CLEARLINE_BLOCK_ID = 14;
  this.GAMEOVER_BLOCK_ID = 15;

  this.RENDER_INTERVAL = 30;
  this.TICK_INTERVAL = 250; // default tick interval
  this.SPEEDUP_RATE = 10;

  this.KEYS_MODEL = {
    37: 'left', // ←
    39: 'right', // →
    40: 'down', // ↓
    38: 'rotate', // ↑
    32: 'rotate' // space
  };

  this.KEYS_VIEW = {
    48: 'pers', // 0
    49: 'ortho1', // 1
    50: 'ortho2', // 2
    51: 'ortho3' };

  // shape: 4 x 4 x 4
  // 3
  this.BLOCK_LIST = [{
    id: 0,
    color: "rgb(254,183,76)",
    shape: [// 横棒
    [[1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]
  }, {
    id: 1,
    color: "rgb(251,122,111)",
    shape: [// 四角
    [[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]
  }, {
    id: 2,
    color: "rgb(247,181,90)",
    shape: [// L字
    [[1, 1, 1, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]
  }, {
    id: 3,
    color: "rgb(241,221,96)",
    shape: [// Z字(S字)
    [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]
  }, {
    id: 4,
    color: "rgb(191,216,94)",
    shape: [// T字
    [[1, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]
  }, {
    id: 5,
    color: "rgb(107,180,252)",
    shape: [// 3方向
    [[1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]
  }, {
    id: 6,
    color: "rgb(202,162,221)",
    shape: [// うねうね1
    [[1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]
  }, {
    id: 7,
    color: "rgb(100,198,173)",
    shape: [// うねうね2
    [[1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]]
  }];
};

;

module.exports = new Tetris3dCONST();

},{}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _jquery = require("./../../bower_components/jquery/dist/jquery.js");

var _jquery2 = _interopRequireDefault(_jquery);

var _eventemitter = require("./../../bower_components/eventemitter2/lib/eventemitter2.js");

var _Tetris3dCONST = require('./Tetris3dCONST');

var _Tetris3dCONST2 = _interopRequireDefault(_Tetris3dCONST);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CONST = _Tetris3dCONST2.default;

var Tetris3dController = function (_EventEmitter) {
  _inherits(Tetris3dController, _EventEmitter);

  function Tetris3dController(model, view) {
    _classCallCheck(this, Tetris3dController);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Tetris3dController).call(this));

    _this.model = model;
    _this.view = view;

    _this.setModelEvent();
    _this.setBlurEvent();
    _this.setKeyEvent();
    return _this;
  }

  _createClass(Tetris3dController, [{
    key: 'newGame',
    value: function newGame() {
      this.view.init();
      this.view.start();
      this.model.initGame();
      this.model.startGame();
    }
  }, {
    key: 'setModelEvent',
    value: function setModelEvent() {
      var _this2 = this;

      this.model.on('gamestart', function () {});
      this.model.on('newblockcreated', function () {});
      this.model.on('currentblockcreated', function () {
        _this2.view.drawBlock(_this2.model.currentBlock);
      });
      this.model.on('nextblockcreated', function () {});
      this.model.on('gameover', function () {
        alert('gameover!!');
      });
      this.model.on('tick', function (isNewBlock) {
        _this2.view.moveBlock(_this2.model.currentBlock);
      });
      this.model.on('gamequit', function () {});
      this.model.on('freeze', function () {});
      this.model.on('clearline', function (filledRowList) {});
    }
  }, {
    key: 'setBlurEvent',
    value: function setBlurEvent() {
      var _this3 = this;

      (0, _jquery2.default)(window).on('blur', function () {
        _this3.view.stop();
        _this3.model.pauseGame();
      }).on('focus', function () {
        _this3.view.start();
        _this3.model.resumeGame();
      });
    }
  }, {
    key: 'setKeyEvent',
    value: function setKeyEvent() {
      var _this4 = this;

      (0, _jquery2.default)(document).on('keydown', function (evt) {
        // console.log(evt.keyCode, CONST.KEYS_MODEL[evt.keyCode], CONST.KEYS_VIEW[evt.keyCode]);
        if (typeof CONST.KEYS_MODEL[evt.keyCode] !== 'undefined') {
          evt.preventDefault();
          _this4.model.moveBlock(CONST.KEYS_MODEL[evt.keyCode]);
        }
        if (typeof CONST.KEYS_VIEW[evt.keyCode] !== 'undefined') {
          evt.preventDefault();
          _this4.view.setCamera(CONST.KEYS_VIEW[evt.keyCode]);
        }
      });
    }
  }, {
    key: 'setTouchEvent',
    value: function setTouchEvent() {
      var _this5 = this;

      var touch = new TouchController(this.$cnvs);
      var touchStartX;
      var touchStartY;
      var isTap = false;
      var isFreeze = false;

      touch.on('touchstart', function (evt, info) {
        touchStartX = info.touchStartX;
        touchStartY = info.touchStartY;
        isTap = true;
        isFreeze = false;
      });
      touch.on('touchmove', function (evt, info) {
        // var blockMoveX = (info.moveX / this.BLOCK_SIZE) | 0;
        var moveX = info.touchX - touchStartX;
        var moveY = info.touchY - touchStartY;
        var blockMoveX = moveX / _this5.BLOCK_SIZE | 0;
        var blockMoveY = moveY / _this5.BLOCK_SIZE | 0;

        if (isFreeze) return;

        // 1マスずつバリデーション（すり抜け対策）
        while (!!blockMoveX) {
          var sign = blockMoveX / Math.abs(blockMoveX); // 1 or -1
          if (!_this5.valid(sign, 0)) break;
          _this5.currentX += sign;
          blockMoveX -= sign;
          touchStartX = info.touchX;
        }
        while (blockMoveY > 0) {
          if (!_this5.valid(0, 1)) break;
          _this5.currentY++;
          blockMoveY--;
          touchStartY = info.touchY;
        }
        isTap = false;
      });
      touch.on('touchend', function (evt, info) {
        if (!!isTap) _this5.moveBlock('rotate');
      });
      this.on('freeze', function () {
        isFreeze = true;
      });
    }
  }]);

  return Tetris3dController;
}(_eventemitter.EventEmitter2);

module.exports = Tetris3dController;

},{"./../../bower_components/eventemitter2/lib/eventemitter2.js":1,"./../../bower_components/jquery/dist/jquery.js":2,"./Tetris3dCONST":6}],8:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _jquery = require("./../../bower_components/jquery/dist/jquery.js");

var _jquery2 = _interopRequireDefault(_jquery);

var _eventemitter = require("./../../bower_components/eventemitter2/lib/eventemitter2.js");

var _Tetris3dCONST = require('./Tetris3dCONST');

var _Tetris3dCONST2 = _interopRequireDefault(_Tetris3dCONST);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CONST = _Tetris3dCONST2.default;

var Tetris3dModel = function (_EventEmitter) {
  _inherits(Tetris3dModel, _EventEmitter);

  function Tetris3dModel() {
    _classCallCheck(this, Tetris3dModel);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Tetris3dModel).call(this));
  }

  _createClass(Tetris3dModel, [{
    key: 'newGame',
    value: function newGame() {
      this.initGame();
      this.startGame();
    }
  }, {
    key: 'initGame',
    value: function initGame() {
      clearTimeout(this.tickId);
      clearInterval(this.renderId);
      this.isPlayng = false;
      this.lose = false;
      this.tickInterval = CONST.TICK_INTERVAL;
      this.sumOfClearLines = 0;
      this.score = 0;
      this.frameCount = 0;
      this.initBoad();
      this.initBlock();
      this.createNextBlock();
      // this.render();
    }
  }, {
    key: 'startGame',
    value: function startGame() {
      this.isPlayng = true;
      this.createCurrentBlock();
      this.createNextBlock();
      this.tick();
      // this.renderId = setInterval(() => { this.render(); }, this.RENDER_INTERVAL);
      this.emit('gamestart');
    }
  }, {
    key: 'initBoad',
    value: function initBoad() {
      this.board = [];
      for (var z = 0; z < CONST.COLS; ++z) {
        this.board[z] = [];
        for (var y = 0; y < CONST.LOGICAL_ROWS; ++y) {
          this.board[z][y] = [];
          for (var x = 0; x < CONST.COLS; ++x) {
            this.board[z][y][x] = 0;
          }
        }
      }
    }
  }, {
    key: 'initBlock',
    value: function initBlock() {
      this.nextBlock = this.createBlock(0);
      this.currentBlock = this.createBlock(0);
      this.currentBlock.x = CONST.START_X;
      this.currentBlock.y = CONST.START_Y;
      this.currentBlock.z = CONST.START_Z;
    }
  }, {
    key: 'createBlock',
    value: function createBlock(id) {
      // id = id || 0;
      // const block = {};
      // Object.assign(block, CONST.BLOCK_LIST[id]); // オブジェクトの複製（シャローコピー）
      var blockCONST = CONST.BLOCK_LIST[id] || {};
      var block = {
        id: id,
        color: blockCONST.color,
        shape: [], // blockの形状
        x: 0,
        y: 0,
        z: 0
      };
      var shape = blockCONST.shape;
      block.shape = [];
      for (var z = 0; z < CONST.VOXEL_LENGTH; ++z) {
        block.shape[z] = [];
        for (var y = 0; y < CONST.VOXEL_LENGTH; ++y) {
          block.shape[z][y] = [];
          for (var x = 0; x < CONST.VOXEL_LENGTH; ++x) {
            block.shape[z][y][x] = shape[z][y][x] || 0;
          }
        }
      }
      this.emit('newblockcreated');
      return block;
    }
  }, {
    key: 'createCurrentBlock',
    value: function createCurrentBlock() {
      if (!this.nextBlock) this.createNextBlock();
      this.currentBlock = this.nextBlock;
      this.currentBlock.x = CONST.START_X;
      this.currentBlock.y = CONST.START_Y;
      this.currentBlock.z = CONST.START_Z;
      this.emit('currentblockcreated');
    }
  }, {
    key: 'createNextBlock',
    value: function createNextBlock() {
      var id = Math.floor(Math.random() * CONST.BLOCK_LIST.length);
      this.nextBlock = this.createBlock(id);
      this.emit('nextblockcreated');
    }
  }, {
    key: 'tick',

    // メインでループする関数
    value: function tick() {
      var _this3 = this;

      clearTimeout(this.tickId);
      var isMoveDown = this.moveBlock('down');
      console.log("tick", isMoveDown, this.checkGameOver());
      if (!isMoveDown) {
        // if (false) {
        this.freeze();
        // this.clearLines();
        if (this.checkGameOver()) {
          this.emit('gameover');
          // this.quitGame().then(function(){});
          return false;
        }
        this.frameCount++;
        this.createCurrentBlock();
        this.createNextBlock();
      }
      this.tickId = setTimeout(function () {
        _this3.tick();
      }, this.tickInterval);
      this.emit('tick', !isMoveDown);
    }
  }, {
    key: 'quitGame',
    value: function quitGame() {
      var dfd = _jquery2.default.Deferred();
      // this.gameOverEffect().then(() => {
      //   this.isPlayng = false;
      //   this.emit('gamequit');
      //   dfd.resolve();
      // });
      return dfd.promise();
    }
  }, {
    key: 'stopGame',
    value: function stopGame() {
      this.quitGame();
    }
  }, {
    key: 'pauseGame',
    // alias

    value: function pauseGame() {
      clearTimeout(this.tickId);
    }
  }, {
    key: 'resumeGame',
    value: function resumeGame() {
      var _this4 = this;

      if (!this.isPlayng) return;
      this.tickId = setTimeout(function () {
        _this4.tick();
      }, this.tickInterval);
    }
  }, {
    key: 'freeze',
    value: function freeze() {
      for (var z = 0; z < CONST.VOXEL_LENGTH; ++z) {
        for (var y = 0; y < CONST.VOXEL_LENGTH; ++y) {
          for (var x = 0; x < CONST.VOXEL_LENGTH; ++x) {
            var boardX = x + this.currentBlock.x;
            var boardY = y + this.currentBlock.y;
            var boardZ = z + this.currentBlock.z;
            if (!this.currentBlock.shape[z][y][x] || boardZ < 0) continue;
            this.board[boardZ][boardY][boardX] = this.currentBlock.shape[z][y][x];
          }
        }
      }
      this.emit('freeze');
    }
  }, {
    key: 'clearLines',
    value: function clearLines() {
      var _this = this;
      var clearLineLength = 0; // 同時消去ライン数
      var filledRowList = [];
      var blankRow = Array.apply(null, Array(CONST.COLS)).map(function () {
        return 0;
      }); // => [0,0,0,0,0,...]
      var dfd = _jquery2.default.Deferred();
      dfd.resolve();
      for (var y = CONST.LOGICAL_ROWS - 1; y >= 0; --y) {
        var isRowFilled = this.board[y].every(function (val) {
          return val !== 0;
        });
        if (!isRowFilled) continue;
        filledRowList.push(y);
        clearLineLength++;
        this.sumOfClearLines++;
        this.tickInterval -= CONST.SPEEDUP_RATE; // 1行消去で速度を上げる
      }
      // clear line drop
      // dfd.then(dropRow(x, y));

      // calc score
      this.score += clearLineLength <= 1 ? clearLineLength : Math.pow(2, clearLineLength);

      if (clearLineLength > 0) this.emit('clearline', filledRowList);

      function dropRow(x, y) {
        return function () {
          var dfd = _jquery2.default.Deferred();
          if (!filledRowList.length) return;
          filledRowList.reverse().forEach(function (row) {
            _this.board.splice(row, 1);
            _this.board.unshift(blankRow);
          });
          dfd.resolve();
          return dfd.promise();
        };
      }
    }
  }, {
    key: 'moveBlock',
    value: function moveBlock(code) {
      switch (code) {
        case 'left':
          if (this.valid(-1, 0, 0)) {
            --this.currentBlock.x;
            return true;
          }
          return false;
          break;
        case 'right':
          if (this.valid(1, 0, 0)) {
            ++this.currentBlock.x;
            return true;
          }
          return false;
          break;
        case 'down':
          if (this.valid(0, 1, 0)) {
            ++this.currentBlock.y;
            return true;
          }
          return false;
          break;
        case 'rotate':
          var rotatedBlockShape = this.rotate(this.currentBlock);
          if (this.valid(0, 0, 0, rotatedBlockShape)) {
            this.currentBlock.shape = rotatedBlockShape;
            return true;
          }
          return false;
          break;
      }
    }
  }, {
    key: 'rotate',
    value: function rotate(block) {
      var newBlockShape = [];
      for (var z = 0; z < CONST.VOXEL_LENGTH; ++z) {
        newBlockShape[z] = [];
        for (var y = 0; y < CONST.VOXEL_LENGTH; ++y) {
          newBlockShape[z][y] = [];
          for (var x = 0; x < CONST.VOXEL_LENGTH; ++x) {
            newBlockShape[z][y][x] = block.shape[CONST.VOXEL_LENGTH - 1 - x][y];
          }
        }
      }
      return newBlockShape;
    }
  }, {
    key: 'valid',
    value: function valid(offsetX, offsetY, offsetZ, newBlockShape) {
      offsetX = offsetX || 0;
      offsetY = offsetY || 0;
      offsetZ = offsetZ || 0;
      var nextX = this.currentBlock.x + offsetX;
      var nextY = this.currentBlock.y + offsetY;
      var nextZ = this.currentBlock.z + offsetZ;
      var blockShape = newBlockShape || this.currentBlock.shape;

      for (var z = 0; z < CONST.VOXEL_LENGTH; ++z) {
        for (var y = 0; y < CONST.VOXEL_LENGTH; ++y) {
          for (var x = 0; x < CONST.VOXEL_LENGTH; ++x) {
            var boardX = x + nextX;
            var boardY = y + nextY;
            var boardZ = z + nextZ;
            if (!blockShape[z][y][x]) continue;
            if (typeof this.board[boardZ] === 'undefined' // 次の位置が盤面外なら
             || typeof this.board[boardZ][boardY] === 'undefined' // 盤面外なら
             || typeof this.board[boardZ][boardY][boardX] === 'undefined' // 盤面外なら
             || !!this.board[boardZ][boardY][boardX] // 次の位置にブロックがあれば
             || boardX < 0 // 壁
             || boardX >= CONST.COLS // 壁
             || boardZ < 0 // 壁
             || boardZ >= CONST.COLS // 壁
             || boardY >= CONST.LOGICAL_ROWS) {
              // 底面

              return false;
            }
          }
        }
      }
      return true;
    }
  }, {
    key: 'checkGameOver',
    value: function checkGameOver() {
      // ブロックの全てが画面外ならゲームオーバー
      var isGameOver = true;
      for (var z = 0; z < CONST.VOXEL_LENGTH; ++z) {
        for (var y = 0; y < CONST.VOXEL_LENGTH; ++y) {
          for (var x = 0; x < CONST.VOXEL_LENGTH; ++x) {
            var boardX = x + this.currentBlock.x;
            var boardY = y + this.currentBlock.y;
            var boardZ = z + this.currentBlock.z;
            if (boardY >= CONST.HIDDEN_ROWS) {
              isGameOver = false;
              break;
            }
          }
        }
      }
      return isGameOver;
    }
  }]);

  return Tetris3dModel;
}(_eventemitter.EventEmitter2);

module.exports = Tetris3dModel;

},{"./../../bower_components/eventemitter2/lib/eventemitter2.js":1,"./../../bower_components/jquery/dist/jquery.js":2,"./Tetris3dCONST":6}],9:[function(require,module,exports){
(function (global){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Tetris3dCONST = require('./Tetris3dCONST');

var _Tetris3dCONST2 = _interopRequireDefault(_Tetris3dCONST);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// import THREE from 'three.js';
global.THREE = require("./../../bower_components/three.js/build/three.js"); // global === window
// import OrbitControls from 'three.js/examples/js/controls/OrbitControls.js'; // これじゃだめ
var OrbitControls = require("./../../bower_components/three.js/examples/js/controls/OrbitControls.js");

var CONST = _Tetris3dCONST2.default;

var Tetris3dView = function () {
  function Tetris3dView() {
    _classCallCheck(this, Tetris3dView);

    this.framecount = 0;
    this.ZERO_VECTOR = new THREE.Vector3(0, 0, 0);
    this.CENTER_VECTOR = new THREE.Vector3(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
    // this.CENTER_VECTOR = { x: CONST.CENTER_X, y: CONST.CENTER_Y, z: CONST.CENTER_Z };
    this.CAMERA_POSITION = new THREE.Vector3(2000, CONST.CENTER_Y, 2000);
    // this.CAMERA_POSITION = { x: 2000, y: CONST.CENTER_Y, z: 2000 };
    this.CAMERA_NEAR = 1;
    this.CAMERA_FAR = 100000;
  }

  _createClass(Tetris3dView, [{
    key: 'init',
    value: function init() {
      // container ------------------------------
      this.container = document.getElementById('canvas-container');

      // renderer ------------------------------
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setClearColor(0xf0f0f0); // 背景色
      this.renderer.setSize(CONST.WIDTH, CONST.HEIGHT);
      this.container.appendChild(this.renderer.domElement);

      // scene ------------------------------
      this.scene = new THREE.Scene();

      // camera ------------------------------
      this.perscamera = new THREE.PerspectiveCamera(45, CONST.WIDTH / CONST.HEIGHT, this.CAMERA_NEAR, this.CAMERA_FAR); // fov(視野角), aspect, near, far
      // this.orthocamera = new THREE.OrthographicCamera( -CONST.WIDTH / 2, CONST.WIDTH / 2, CONST.HEIGHT / 2, -CONST.HEIGHT / 2, this.CAMERA_NEAR, this.CAMERA_FAR ); // left, right, top, bottom, near, far
      this.orthocamera = new THREE.OrthographicCamera(-window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, this.CAMERA_NEAR, this.CAMERA_FAR); // left, right, top, bottom, near, far
      this.cubecamera = new THREE.CubeCamera(this.CAMERA_NEAR, this.CAMERA_FAR, 128); // near, far, cubeResolution
      this.setCamera();
      /*
      this.camera = this.perscamera;
      // this.camera = this.orthocamera;
      // this.camera = new THREE.Camera();
      // this.camera.clone(this.perscamera);
      this.camera.position.set(2000, CONST.CENTER_Y, 2000);
      // this.camera.position.set(this.CAMERA_POSITION);
      // this.camera.position.add(this.CAMERA_POSITION);
      // this.camera.position.copy(this.CAMERA_POSITION);
      // this.camera.position.addVectors(this.ZERO_VECTOR, this.CAMERA_POSITION);
      // this.camera.position = this.CAMERA_POSITION;
      this.camera.up.set(0, -1, 0); // y down
      // this.camera.lookAt(this.CENTER_VECTOR);
      // this.camera.lookAt(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
      // let lookatVector = new THREE.Vector3().subVectors(this.CENTER_VECTOR, this.camera.position);
      // let lookatVector = new THREE.Vector3().addVectors(this.CENTER_VECTOR, this.camera.position);
      // this.camera.lookAt(lookatVector);
      // this.camera.lookAt(0,1,0);
      // this.camera.lookAt(new THREE.Vector3(0,1,0));
      // console.log(lookatVector, this.camera.getWorldDirection());
      
      
      // controls ------------------------------
      this.controls = new THREE.OrbitControls(this.camera);
      // this.controls.center.set(CONST.CENTER_X, 0, CONST.CENTER_Z);
      // this.controls.center = this.CENTER_VECTOR;
      // this.controls.center.set(this.CENTER_VECTOR);
      // this.controls.center.set(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
      // this.controls.target.set(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
      // this.controls.target = new THREE.Vector3(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
      this.controls.target = this.CENTER_VECTOR;
      // this.controls.target.set(this.CENTER_VECTOR);
      // this.controls.noKeys = true;
      this.controls.enableKeys = false;
      this.controls.update();
      */

      // axis ------------------------------
      var axis = new THREE.AxisHelper(this.CAMERA_FAR);
      axis.position.set(0, 0, 0);
      this.scene.add(axis);

      // grid top ------------------------------
      var size = CONST.CENTER_X;
      var step = CONST.VOXEL_SIZE;
      var grid = new THREE.GridHelper(size, step);
      // grid.position.add( new THREE.Vector3( size, 0, size ) ); // 0,0が端になるように移動
      grid.position.set(size, 0, size); // 0,0が端になるように移動
      this.scene.add(grid);

      // grid bottom ------------------------------
      var gridBtm = new THREE.GridHelper(size, step);
      gridBtm.position.set(size, CONST.HEIGHT, size);
      this.scene.add(gridBtm);

      // plane ------------------------------
      // plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() );
      // plane.rotation.x = - Math.PI / 2;
      // plane.visible = false;
      // this.scene.add( plane );
      // objects.push( plane );

      // Lights ------------------------------
      var ambientLight = new THREE.AmbientLight(0x606060);
      this.scene.add(ambientLight);
      var directionalLight = new THREE.DirectionalLight(0xffffff);
      directionalLight.position.set(0.5, -0.75, 1).normalize();
      this.scene.add(directionalLight);

      // picking ------------------------------
      // projector = new THREE.Projector();

      // mouse ------------------------------
      this.mouse2D = new THREE.Vector3(0, 10000, 0.5);

      // roll-over helpers ------------------------------
      // rollOverGeo = new THREE.BoxGeometry( CONST.VOXEL_SIZE, CONST.VOXEL_SIZE, CONST.VOXEL_SIZE );
      // rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
      // rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
      // this.scene.add( rollOverMesh );

      // stats ------------------------------
      // stats = new Stats();
      // stats.domElement.style.position = 'absolute';
      // stats.domElement.style.top = '0px';
      // container.appendChild( stats.domElement );

      // cubes ------------------------------
      this.cubeGeo = new THREE.BoxGeometry(CONST.VOXEL_SIZE, CONST.VOXEL_SIZE, CONST.VOXEL_SIZE);
      this.cubeMaterial = [];
      // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, ambient: 0x00ff80, shading: THREE.FlatShading, map: THREE.ImageUtils.loadTexture( "textures/square-outline-textured.png" ) } );
      // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, ambient: 0x00ff80, shading: THREE.FlatShading } );
      // this.cubeMaterial.ambient = this.cubeMaterial.color;
      // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, shading: THREE.FlatShading } );
      // this.cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, ambient: 0xfeb74c });
      this.cubeMaterial[0] = new THREE.MeshLambertMaterial({ color: "rgb(254,183,76)", ambient: "rgb(254, 183, 76)" });
      this.cubeMaterial[1] = new THREE.MeshLambertMaterial({ color: "rgb(251,122,111)", ambient: "rgb(251,122,111)" });
      this.cubeMaterial[2] = new THREE.MeshLambertMaterial({ color: "rgb(247,181,90)", ambient: "rgb(247,181,90)" });
      this.cubeMaterial[3] = new THREE.MeshLambertMaterial({ color: "rgb(241,221,96)", ambient: "rgb(241,221,96)" });
      this.cubeMaterial[4] = new THREE.MeshLambertMaterial({ color: "rgb(191,216,94)", ambient: "rgb(191,216,94)" });
      this.cubeMaterial[5] = new THREE.MeshLambertMaterial({ color: "rgb(107,180,252)", ambient: "rgb(107,180,252)" });
      this.cubeMaterial[6] = new THREE.MeshLambertMaterial({ color: "rgb(202,162,221)", ambient: "rgb(202,162,221)" });
      this.cubeMaterial[7] = new THREE.MeshLambertMaterial({ color: "rgb(100,198,173)", ambient: "rgb(100,198,173)" });
      // this.cubeMaterial.ambient = this.cubeMaterial.color;

      this.setSize();
    }
  }, {
    key: 'setSize',
    value: function setSize() {
      CONST.WIDTH = window.innerWidth;
      CONST.HEIGHT = window.innerHeight;
      this.camera.aspect = CONST.WIDTH / CONST.HEIGHT;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(CONST.WIDTH, CONST.HEIGHT);
    }
  }, {
    key: 'setCamera',
    value: function setCamera(code) {
      switch (code) {
        case 'ortho1':
          this.camera = this.orthocamera;
          // this.camera.clone(this.orthocamera);
          this.camera.position.set(CONST.CENTER_X, CONST.CENTER_Y, 2000);
          break;
        case 'ortho2':
          this.camera = this.orthocamera;
          // this.camera.clone(this.orthocamera);
          this.camera.position.set(2000, CONST.CENTER_Y, CONST.CENTER_Z);
          break;
        case 'ortho3':
          this.camera = this.orthocamera;
          // this.camera.clone(this.orthocamera);
          this.camera.position.set(CONST.CENTER_X, -1000, CONST.CENTER_Z);
          break;
        default:
          // 'pers'
          this.camera = this.perscamera;
          // this.camera.clone(this.perscamera);
          // this.camera.position.addVectors(this.ZERO_VECTOR, this.CAMERA_POSITION);
          this.camera.position.set(2000, CONST.CENTER_Y, 2000);
          break;
      }
      this.camera.up.set(0, -1, 0); // y down
      this.camera.zoom = 1;

      if (this.controls) this.controls.dispose();
      this.controls = new THREE.OrbitControls(this.camera);
      this.controls.target = this.CENTER_VECTOR;
      this.controls.enableKeys = false;
      // this.controls.reset();
      this.controls.update();
    }
  }, {
    key: 'tick',
    value: function tick() {
      this.framecount++;

      // this.controls.update();

      // this.radius += this.radiusStep;
      // this.phi++;
      // this.camera.position.x = this.radius * Math.sin(this.theta /180 * Math.PI) * Math.sin(this.phi /180 * Math.PI); // 極座標変換
      // this.camera.position.y = this.radius * Math.sin(this.theta /180 * Math.PI) * Math.cos(this.phi /180 * Math.PI);
      // this.camera.position.z = this.radius * Math.cos(this.theta /180 * Math.PI);
      // this.camera.lookAt( this.scene.position );
      // if (this.radius < this.MIN_RADIUS || this.radius > this.MAX_RADIUS) this.radiusStep *= -1;

      // this.camera.position.x += ( this.mouseX - this.camera.position.x ) * 0.005;
      // this.camera.position.y += ( - this.mouseY - this.camera.position.y ) * 0.005;
      // this.camera.lookAt( this.scene.position );

      // this.camera.position.z = this.r * Math.sin(this.theta /180 * Math.PI) * Math.cos(this.phi /180 * Math.PI);
      // this.camera.position.x = this.r * Math.sin(this.theta /180 * Math.PI) * Math.sin(this.phi /180 * Math.PI);
      // this.camera.position.y = this.r * Math.cos(this.theta /180 * Math.PI);
      // this.camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( this.theta ) );
      // this.camera.position.y = 1400 * Math.tan( THREE.Math.degToRad( thetaY ) );
      // this.camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( this.theta ) );
      // this.camera.position.set(0,100,-500);
      // this.camera.lookAt( this.scene.position );
    }
  }, {
    key: 'render',
    value: function render() {
      this.renderer.render(this.scene, this.camera);

      this.renderBoard();
      this.renderCurrentBlock();
    }
  }, {
    key: 'renderBoard',
    value: function renderBoard() {}
  }, {
    key: 'renderCurrentBlock',
    value: function renderCurrentBlock() {}
  }, {
    key: 'drawBlock',
    value: function drawBlock(block) {
      this.currentBlock = block;
      this.currentBlock.voxels = [];
      for (var z = 0; z < CONST.VOXEL_LENGTH; ++z) {
        for (var y = 0; y < CONST.VOXEL_LENGTH; ++y) {
          for (var x = 0; x < CONST.VOXEL_LENGTH; ++x) {
            if (!block || !block.shape[z][y][x]) continue;
            var drawX = x + block.x;
            var drawY = y + block.y - CONST.HIDDEN_ROWS;
            var drawZ = z + block.z;
            this.drawVoxel(drawX, drawY, drawZ, block.id);
          }
        }
      }
    }
  }, {
    key: 'drawVoxel',
    value: function drawVoxel(x, y, z, id) {
      var blockX = x * CONST.VOXEL_SIZE;
      var blockY = y * CONST.VOXEL_SIZE;
      var blockZ = z * CONST.VOXEL_SIZE;

      var voxel = new THREE.Mesh(this.cubeGeo, this.cubeMaterial[id]);
      voxel.position.set(blockX, blockY, blockZ);
      voxel.position.addScalar(CONST.VOXEL_SIZE / 2); // グリッドに合わせる。

      // this.voxels = this.voxels || [];
      // this.voxels.push(voxel);
      this.currentBlock.voxels.push(voxel);

      if (y < 0) return; // 盤面外は描画しない
      this.scene.add(voxel);
    }
  }, {
    key: 'moveBlock',
    value: function moveBlock(block) {
      if (!this.currentBlock) return;
      var index = 0;
      for (var z = 0; z < CONST.VOXEL_LENGTH; ++z) {
        for (var y = 0; y < CONST.VOXEL_LENGTH; ++y) {
          for (var x = 0; x < CONST.VOXEL_LENGTH; ++x) {
            if (!block || !block.shape[z][y][x]) continue;
            var drawX = x + block.x;
            var drawY = y + block.y - CONST.HIDDEN_ROWS;
            var drawZ = z + block.z;
            this.moveVoxel(drawX, drawY, drawZ, index);
            index++;
          }
        }
      }
    }
  }, {
    key: 'moveVoxel',
    value: function moveVoxel(x, y, z, index) {
      if (y < 0) return; // 盤面外は描画しない

      var blockX = x * CONST.VOXEL_SIZE;
      var blockY = y * CONST.VOXEL_SIZE;
      var blockZ = z * CONST.VOXEL_SIZE;

      var voxel = this.currentBlock.voxels[index];
      voxel.position.set(blockX, blockY, blockZ);
      voxel.position.addScalar(CONST.VOXEL_SIZE / 2); // グリッドに合わせる。
      this.scene.add(voxel);
    }
  }, {
    key: 'start',
    value: function start() {
      var _this = this;
      var startTime = Date.now();
      var previousTime = startTime;
      var previousRenderTime = previousTime;
      var previousTickTime = previousTime;
      this.loopId = null;

      (function loop(timestamp) {
        var nowTime = Date.now();
        var elapsedTime = nowTime - startTime;
        var deltaTime = nowTime - previousTime;
        var deltaRenderTime = nowTime - previousRenderTime;
        var deltaTickTime = nowTime - previousTickTime;

        if (deltaRenderTime > CONST.RENDER_INTERVAL) {
          previousRenderTime = nowTime;
          _this.render();
        }
        if (deltaTickTime > CONST.TICK_INTERVAL) {
          previousTickTime = nowTime;
          _this.tick();
        }

        previousTime = nowTime;
        _this.loopId = requestAnimationFrame(loop);
      })();
    }
  }, {
    key: 'stop',
    value: function stop() {
      cancelAnimationFrame(this.loopId);
    }
  }]);

  return Tetris3dView;
}();

module.exports = Tetris3dView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./../../bower_components/three.js/build/three.js":3,"./../../bower_components/three.js/examples/js/controls/OrbitControls.js":4,"./Tetris3dCONST":6}],10:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // import $ from 'jquery';
// import Util from './Util';

var _Tetris3d = require('./Tetris3d');

var _Tetris3d2 = _interopRequireDefault(_Tetris3d);

var _Tetris3dView = require('./Tetris3dView');

var _Tetris3dView2 = _interopRequireDefault(_Tetris3dView);

var _Tetris3dModel = require('./Tetris3dModel');

var _Tetris3dModel2 = _interopRequireDefault(_Tetris3dModel);

var _Tetris3dController = require('./Tetris3dController');

var _Tetris3dController2 = _interopRequireDefault(_Tetris3dController);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// const tetris = new Tetris3d();
var tetris3dModel = new _Tetris3dModel2.default();
var tetris3dView = new _Tetris3dView2.default();
var tetris3dController = new _Tetris3dController2.default(tetris3dModel, tetris3dView);

var Main = function () {
  function Main() {
    _classCallCheck(this, Main);
  }

  _createClass(Main, [{
    key: 'exec',
    value: function exec() {
      // tetris.init();
      tetris3dController.newGame();
    }
  }]);

  return Main;
}();

var main = new Main();
main.exec();

},{"./Tetris3d":5,"./Tetris3dController":7,"./Tetris3dModel":8,"./Tetris3dView":9}]},{},[10]);
