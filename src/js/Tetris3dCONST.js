class Tetris3dCONST {
  constructor() {
    this.COLS = 10; // x, z field size
    this.ROWS = 15; // y field size
    // this.FIELD_SIZE = 10; // this.COLS
    
    // NUMBER_OF_BLOCK = 4;
    // NUMBER_OF_VOXEL = 4; // number of voxel in a block
    this.VOXEL_LENGTH = 4; // voxel length in a block
    // BLOCK_SIZE = 4;
    // BLOCK_SIZE = 50;
    this.VOXEL_SIZE = 50;
    
    this.START_X = Math.floor((this.COLS - this.VOXEL_LENGTH) / 2);
    this.START_Y = 0;
    this.START_Z = Math.floor((this.COLS - this.VOXEL_LENGTH) / 2);
    
    this.HIDDEN_ROWS = this.VOXEL_LENGTH;
    this.LOGICAL_ROWS = this.ROWS + this.HIDDEN_ROWS;
    
    this.WIDTH = this.VOXEL_SIZE * this.COLS;
    this.HEIGHT = this.VOXEL_SIZE * this.ROWS;
    
    this.CENTER_X = this.WIDTH / 2;
    this.CENTER_Y = this.HEIGHT / 2;
    this.CENTER_Z = this.WIDTH / 2;
    
    this.CLEARLINE_BLOCK_ID = 14;
    this.GAMEOVER_BLOCK_ID = 15;
    
    this.RENDER_INTERVAL = 30;
    this.TICK_INTERVAL = 700; // default tick interval
    this.SPEEDUP_RATE = 10;
    
    this.KEYS_MODEL = {
      37: 'left', // ←
      39: 'right', // →
      40: 'forward', // ↓
      38: 'backward', // ↑
      32: 'rotate', // space
      16: 'rotateX', // shift
      17: 'rotateY', // control
    };
    
    this.KEYS_VIEW = {
      48: 'pers', // 0
      49: 'ortho1', // 1
      50: 'ortho2', // 2
      51: 'ortho3', // 3
    };
    
    this.KEYS_CONTROLLER = {
      67: 'camera', // c
      66: 'block', // b
    };
    
    this.SHADOW_BLOCK = {
      id: 8,
      color: '#000',
      opacity: 0.3,
    };
    
    // shape: 4 x 4 x 4
    this.BLOCK_LIST = [
      {
        id: 0,
        color: 'rgb(254,183,76)',
        shape: [ // 横棒
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      {
        id: 1,
        color: 'rgb(251,122,111)',
        shape: [ // 四角
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      {
        id: 2,
        color: 'rgb(247,181,90)',
        shape: [ // L字
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 1, 1, 1],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      {
        id: 3,
        color: 'rgb(241,221,96)',
        shape: [ // Z字(S字)
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [1, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      {
        id: 4,
        color: 'rgb(191,216,94)',
        shape: [ // T字
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [1, 1, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      {
        id: 5,
        color: 'rgb(107,180,252)',
        shape: [ // 3方向
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      {
        id: 6,
        color: 'rgb(202,162,221)',
        shape: [ // うねうね1
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      {
        id: 7,
        color: 'rgb(100,198,173)',
        shape: [ // うねうね2
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
    ];
  };
};

module.exports = new Tetris3dCONST();
