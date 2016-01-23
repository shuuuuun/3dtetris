(function(win, doc){
  var ns = win.App = win.App || {};
  
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || function(callback){ var id = window.setTimeout(callback,1000/60); return id; };
  window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame || window.oCancelAnimationFrame || function(id){ window.clearTimeout(id); };
  
  var util = new Util();
  var tetris = new ns.Tetris3d();
  
  tetris.init();
  
})(this, document);
