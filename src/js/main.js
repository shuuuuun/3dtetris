import Util from './Util';
import SoundController from './SoundController';
import Tetris3dCONST from './Tetris3dCONST';
import Tetris3dView from './Tetris3dView';
import Tetris3dModel from './Tetris3dModel';
import Tetris3dController from './Tetris3dController';
import Tetris3dUI from './Tetris3dUI';

const tetris3dModel = new Tetris3dModel();
const tetris3dView = new Tetris3dView();
const tetris3dController = new Tetris3dController(tetris3dModel, tetris3dView);
const tetris3dUI = new Tetris3dUI(tetris3dController);

const sound = new SoundController({
  src: './audio/bgm.mp3',
  COOKIE_NAME: 'TETRICUS-isMute',
});


// event
tetris3dController.on('startGame', () => {
  sound.play();
});
tetris3dUI.on('toggleSound', (evt) => {
  sound.toggleMute(!evt.isSoundOn);
  sound.togglePlay(evt.isSoundOn);
});


// start
tetris3dUI.toggleBtnSound(!sound.audio.muted);
tetris3dUI.showStartModal();
tetris3dController.isAutoMode = true;
tetris3dController.newGame();


// debug mode
const query = Util.getQueryString();
if (query.debug) {
  const blockId = +query.debug || 0;
  const shape = Tetris3dCONST.BLOCK_LIST[blockId].shape;
  Tetris3dCONST.BLOCK_LIST.forEach(function(data){
    data.shape = shape;
  });
  const resetCONST = () => {
    Tetris3dCONST.START_X = Math.floor((Tetris3dCONST.COLS - Tetris3dCONST.VOXEL_LENGTH) / 2);
    Tetris3dCONST.START_Y = 0;
    Tetris3dCONST.START_Z = Math.floor((Tetris3dCONST.COLS - Tetris3dCONST.VOXEL_LENGTH) / 2);
    
    Tetris3dCONST.HIDDEN_ROWS = Tetris3dCONST.VOXEL_LENGTH;
    Tetris3dCONST.LOGICAL_ROWS = Tetris3dCONST.ROWS + Tetris3dCONST.HIDDEN_ROWS;
    
    Tetris3dCONST.WIDTH = Tetris3dCONST.VOXEL_SIZE * Tetris3dCONST.COLS;
    Tetris3dCONST.HEIGHT = Tetris3dCONST.VOXEL_SIZE * Tetris3dCONST.ROWS;
    
    Tetris3dCONST.CENTER_X = Tetris3dCONST.WIDTH / 2;
    Tetris3dCONST.CENTER_Y = Tetris3dCONST.HEIGHT / 2;
    Tetris3dCONST.CENTER_Z = Tetris3dCONST.WIDTH / 2;
    
    tetris3dView.constructor();
  };
  if (query.interval) {
    tetris3dModel.tickInterval = +query.interval;
  }
  if (query.cols) {
    Tetris3dCONST.COLS = +query.cols;
    resetCONST();
  }
  if (query.rows) {
    Tetris3dCONST.ROWS = +query.rows;
    resetCONST();
  }
  if (query.voxel_size) {
    Tetris3dCONST.VOXEL_SIZE = +query.voxel_size;
    resetCONST();
  }
  if (query.render_interval) {
    Tetris3dCONST.RENDER_INTERVAL = +query.render_interval;
  }
  if (query.tick_interval) {
    Tetris3dCONST.TICK_INTERVAL = +query.tick_interval;
  }
  if (query.speedup_rate) {
    Tetris3dCONST.SPEEDUP_RATE = +query.speedup_rate;
  }
  tetris3dController.newGame();
}
