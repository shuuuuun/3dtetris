import $ from 'jquery';
// import THREE from 'three.js';
import Util from './Util';
import Tetris3d from './Tetris3d';
import Tetris3dView from './Tetris3dView';
import Tetris3dModel from './Tetris3dModel';

// const tetris = new Tetris3d();
const tetris3dModel = new Tetris3dModel();
const tetrisView = new Tetris3dView();

class Main {
  constructor() {
  }
  exec() {
    // tetris.init();
    tetrisView.init();
    tetrisView.start();
    tetrisView.drawBlock(0, 0, 0, 0);
    tetrisView.drawBlock(0, 0, 1, 1);
  }
}

const main = new Main();
main.exec();
