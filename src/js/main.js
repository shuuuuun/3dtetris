import $ from 'jquery';
// import THREE from 'three.js';
import Util from './Util';
import Tetris3d from './Tetris3d';

const tetris = new Tetris3d();

class Main {
  constructor() {
  }
  exec() {
    tetris.init();
  }
}

const main = new Main();
main.exec();
