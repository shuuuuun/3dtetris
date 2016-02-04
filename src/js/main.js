import $ from 'jquery';
// import THREE from 'three.js';
import Util from './Util';
import Tetris3d from './Tetris3d';
import Tetris3dView from './Tetris3dView';
import Tetris3dModel from './Tetris3dModel';
import Tetris3dController from './Tetris3dController';

// const tetris = new Tetris3d();
const tetris3dModel = new Tetris3dModel();
const tetris3dView = new Tetris3dView();
const tetris3dController = new Tetris3dController(tetris3dModel, tetris3dView);

class Main {
  constructor() {
  }
  exec() {
    // tetris.init();
    // tetris3dModel.newGame();
    tetris3dView.init();
    tetris3dView.start();
    tetris3dView.drawBlock(0, 0, 0, 0);
    tetris3dView.drawBlock(0, 0, 1, 1);
    tetris3dController.newGame();
  }
}

const main = new Main();
main.exec();
