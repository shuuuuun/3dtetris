class Tetris3dCONST {
  constructor() {
    this.COLS = 10; // x, y field size
    this.ROWS = 30; // z field size
    this.FIELD_SIZE = 10;
    
    // NUMBER_OF_BLOCK = 4;
    // NUMBER_OF_VOXEL = 4; // number of voxel in a block
    this.VOXEL_LENGTH = 4; // voxel length in a block
    // BLOCK_SIZE = 4;
    // BLOCK_SIZE = 50;
    this.VOXEL_SIZE = 50;
    
    this.START_X = Math.floor((this.COLS - this.VOXEL_LENGTH) / 2);
    this.START_Y = 0;
    this.START_Z = 0;
    
    this.HIDDEN_ROWS = this.VOXEL_LENGTH;
    this.LOGICAL_ROWS = this.ROWS + this.HIDDEN_ROWS;
    
    this.WIDTH = this.BLOCK_SIZE * this.COLS;
    this.HEIGHT = this.BLOCK_SIZE * this.ROWS;
    
    this.CLEARLINE_BLOCK_ID = 14;
    this.GAMEOVER_BLOCK_ID = 15;
    
    this.RENDER_INTERVAL = 30;
    this.TICK_INTERVAL = 250; // default tick interval
    this.SPEEDUP_RATE = 10;
    
    this.KEYS = {
      37: 'left',  // ←
      39: 'right',  // →
      40: 'down',  // ↓
      38: 'rotate',  // ↑
      32: 'rotate'  // space
    };
  };
};

module.exports = new Tetris3dCONST();
