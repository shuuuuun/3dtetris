import Util from './Util';
import SoundController from './SoundController';
import TetricusCONST from './TetricusCONST';
import TetricusView from './TetricusView';
import TetricusModel from './TetricusModel';
import TetricusController from './TetricusController';
import TetricusUI from './TetricusUI';

const tetricusModel = new TetricusModel();
const tetricusView = new TetricusView();
const tetricusController = new TetricusController(tetricusModel, tetricusView);
const tetricusUI = new TetricusUI(tetricusController);

const sound = new SoundController({
  src: './audio/bgm.mp3',
  COOKIE_NAME: 'TETRICUS-isMute',
  howl: {
    urls: ['./audio/bgm.mp3'],
    loop: true,
    volume: 0.2,
  },
});


// event
tetricusController.on('startGame', () => {
  // TODO: startGameでなくUIのクリックイベントにしたほうがいいかも
  // ただ、それでpcはautoplayを使おうとすると意図せぬ挙動になる
  sound.play();
});
tetricusUI.on('toggleSound', (evt) => {
  sound.toggleMute(!evt.isSoundOn);
  sound.togglePlay(evt.isSoundOn);
});


// start
tetricusUI.toggleBtnSound(!sound.isMute);
tetricusUI.showStartModal();
tetricusController.isAutoMode = true;
tetricusController.newGame();


// debug mode
const query = Util.getQueryString();
if (query.debug) {
  const blockId = +query.debug || 0;
  const shape = TetricusCONST.BLOCK_LIST[blockId].shape;
  TetricusCONST.BLOCK_LIST.forEach(function(data){
    data.shape = shape;
  });
  const resetCONST = () => {
    TetricusCONST.START_X = Math.floor((TetricusCONST.COLS - TetricusCONST.VOXEL_LENGTH) / 2);
    TetricusCONST.START_Y = 0;
    TetricusCONST.START_Z = Math.floor((TetricusCONST.COLS - TetricusCONST.VOXEL_LENGTH) / 2);
    
    TetricusCONST.HIDDEN_ROWS = TetricusCONST.VOXEL_LENGTH;
    TetricusCONST.LOGICAL_ROWS = TetricusCONST.ROWS + TetricusCONST.HIDDEN_ROWS;
    
    TetricusCONST.WIDTH = TetricusCONST.VOXEL_SIZE * TetricusCONST.COLS;
    TetricusCONST.HEIGHT = TetricusCONST.VOXEL_SIZE * TetricusCONST.ROWS;
    
    TetricusCONST.CENTER_X = TetricusCONST.WIDTH / 2;
    TetricusCONST.CENTER_Y = TetricusCONST.HEIGHT / 2;
    TetricusCONST.CENTER_Z = TetricusCONST.WIDTH / 2;
    
    tetricusView.constructor();
  };
  if (query.interval) {
    tetricusModel.tickInterval = +query.interval;
  }
  if (query.cols) {
    TetricusCONST.COLS = +query.cols;
    resetCONST();
  }
  if (query.rows) {
    TetricusCONST.ROWS = +query.rows;
    resetCONST();
  }
  if (query.voxel_size) {
    TetricusCONST.VOXEL_SIZE = +query.voxel_size;
    resetCONST();
  }
  if (query.render_interval) {
    TetricusCONST.RENDER_INTERVAL = +query.render_interval;
  }
  if (query.tick_interval) {
    TetricusCONST.TICK_INTERVAL = +query.tick_interval;
  }
  if (query.speedup_rate) {
    TetricusCONST.SPEEDUP_RATE = +query.speedup_rate;
  }
  tetricusController.newGame();
}
