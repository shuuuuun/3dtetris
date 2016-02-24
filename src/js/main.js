// import $ from 'jquery';
// import Util from './Util';
// import Tetris3d from './Tetris3d';
import Tetris3dView from './Tetris3dView';
import Tetris3dModel from './Tetris3dModel';
import Tetris3dController from './Tetris3dController';
import UserInterface from './UserInterface';

// const tetris = new Tetris3d();
const tetris3dModel = new Tetris3dModel();
const tetris3dView = new Tetris3dView();
const tetris3dController = new Tetris3dController(tetris3dModel, tetris3dView);
const ui = new UserInterface();

// event
ui.on('switchCameraClick', () => {
  tetris3dController.switchModeCamera();
});
ui.on('switchBlockClick', () => {
  tetris3dController.switchModeBlock();
});
tetris3dController.on('switchModeCamera', () => {
  ui.switchModeCamera();
});
tetris3dController.on('switchModeBlock', () => {
  ui.switchModeBlock();
});

// start
tetris3dController.newGame();

// default mode
ui.switchModeCamera();
tetris3dController.switchModeCamera();
