import $ from 'jquery';
// import THREE from 'three.js';
import Util from './Util';
import Tetris3d from './Tetris3d';

var util = new Util();
var tetris = new Tetris3d();

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || function(callback){ var id = window.setTimeout(callback,1000/60); return id; };
window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame || window.oCancelAnimationFrame || function(id){ window.clearTimeout(id); };

class Main {
  constructor() {
  }
  exec() {
    tetris.init();
  }
}

var main = new Main();
main.exec();
