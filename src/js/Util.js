(function(win, doc){
  var $win = $(win);
  
  function Util(){
    this.getUserAgent();
    this.getWinSize();
  }
  
  Util.prototype.bindOnResize = function(){
    var that = this;
    
    $win.on("resize", that.throttle(function(){
      that.getWinSize();
    },500));
  };
  
  Util.prototype.getWinSize = function(){
    win.winW = Math.max( $win.width(), (win.innerWidth || 0) );
    win.winH = Math.max( $win.height(), (win.innerHeight || 0) );
  };
  
  Util.prototype.getRandomInt = function(min, max){
    return Math.floor( Math.random() * (max - min + 1) ) + min;
  };
  
  Util.prototype.throttle = function(fn, interval){
    var isWaiting = false;
    var exec = function(event) {
      if (isWaiting) return;
      isWaiting = true;
      setTimeout(function() {
        isWaiting = false;
        fn(event);
      }, interval);
    };
    return exec;
  };
  
  Util.prototype.debounce = function(fn, interval){
    var timer;
    var exec = function(event) {
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn(event);
      }, interval);
    };
    return exec;
  };
  
  Util.prototype.async = function(fnList){
    // fnList ... 第一引数にcallbackを取る関数の配列
    (function exec(index){
      if (!fnList[index]) return;
      fnList[index](function(){
        exec(index + 1);
      });
    })(0);
  };
  
  Util.prototype.delay = function(time){ // asyncで使う用
    return function(callback){
      setTimeout(callback, time);
    };
  };
  
  Util.prototype.sleep = function(time){ // Deferred
    return function(){
      var dfd = $.Deferred();
      setTimeout(function(){
        dfd.resolve();
      }, time);
      return dfd.promise(); 
    };
  };
  
  Util.prototype.zeroPadding = function(num, len){
    return (new Array(len).join("0") + num).slice(-len);
  };
  
  Util.prototype.getQueryString = function(){
    var result = {};
    var search = win.location.search;
    if (search.length > 1) {
      var query = search.substring(1);
      var parameters = query.split("&");
      for(var i = 0; i < parameters.length; i++){
        var element = parameters[i].split("=");
        var paramName = decodeURIComponent(element[0]);
        var paramValue = decodeURIComponent(element[1]);
        result[paramName] = paramValue;
      }
    }
    return result;
  };
  
  Util.prototype.getUserAgent = function(){
    this.ua = {};
    this.ua.name = win.navigator.userAgent.toLowerCase();
    this.ua.isSP = /ipod|iphone|ipad|android/i.test(this.ua.name);
    this.ua.isPC = !this.ua.isSP;
    this.ua.isIOS = /ipod|iphone|ipad/i.test(this.ua.name);
    this.ua.isAndroid = /android/.test(this.ua.name);
    this.ua.isIE8 = /msie 8/.test(this.ua.name);
    this.ua.isIE9 = /msie 9/.test(this.ua.name);
    if (this.ua.isSP) doc.body.className += " isSP";
    if (this.ua.isPC) doc.body.className += " isPC";
  };
  
  win.Util = Util;
  
})(this, document);
