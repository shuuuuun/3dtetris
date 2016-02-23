// import $ from 'jquery';
// import Util from './Util';
// import Tetris3d from './Tetris3d';
import Tetris3dView from './Tetris3dView';
import Tetris3dModel from './Tetris3dModel';
import Tetris3dController from './Tetris3dController';

// const tetris = new Tetris3d();
const tetris3dModel = new Tetris3dModel();
const tetris3dView = new Tetris3dView();
const tetris3dController = new Tetris3dController(tetris3dModel, tetris3dView);

const $switchCamera = $('.js-switch-camera');
const $switchBlock = $('.js-switch-block');
const $btns = $switchCamera.add($switchBlock);

// event
$switchCamera.on('click', function(){
  $btns.removeClass('is-active');
  $(this).addClass('is-active');
  tetris3dController.swithModeCamera();
});
$switchBlock.on('click', function(){
  $btns.removeClass('is-active');
  $(this).addClass('is-active');
  tetris3dController.swithModeBlock();
});

// start
tetris3dController.newGame();

// default mode
$switchCamera.trigger('click');
