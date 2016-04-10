import Util from './Util';
import Tetris3dCONST from './Tetris3dCONST';
import Tetris3dView from './Tetris3dView';
import Tetris3dModel from './Tetris3dModel';
import Tetris3dController from './Tetris3dController';
import Tetris3dUI from './Tetris3dUI';

const tetris3dModel = new Tetris3dModel();
const tetris3dView = new Tetris3dView();
const tetris3dController = new Tetris3dController(tetris3dModel, tetris3dView);
const tetris3dUI = new Tetris3dUI(tetris3dController);

// event

// start
tetris3dController.newGame();

// default mode
tetris3dUI.switchModeBlock();
tetris3dController.switchModeBlock();


// debug mode
const query = Util.getQueryString();
if (query.debug) {
  const blockId = +query.debug || 0;
  const shape = Tetris3dCONST.BLOCK_LIST[blockId].shape;
  Tetris3dCONST.BLOCK_LIST.forEach(function(data){
    data.shape = shape;
  });
  if (query.interval) {
    tetris3dModel.tickInterval = +query.interval;
  }
  // tetris3dController.newGame();
}
