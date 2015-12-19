(function(win, doc){
  var ns = win.App = win.App || {};
  
  var $win = $(win);
  
  function Util(){
    this.getWinSize();
  }
  
  Util.prototype.bindOnResize = function(){
    var that = this;
    
    $win.on("resize", that.throttle(function(){
      that.getWinSize();
    },500));
  };
  
  Util.prototype.getWinSize = function(){
      ns.winW = Math.max( $win.width(), (win.innerWidth || 0) );
      ns.winH = Math.max( $win.height(), (win.innerHeight || 0) );
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
    return function(callback){ setTimeout(callback,time); };
  };
  
  Util.prototype.zeroPadding = function(num, len){
      return (new Array(len).join("0") + num).slice(-len);
  };
  
  ns.Util = Util;
  
})(this, document);
