class TetricusCONST {
  constructor() {
    this.COLS = 7; // x, z field size
    this.ROWS = 9; // y field size
    // this.FIELD_SIZE = 10; // this.COLS
    
    // NUMBER_OF_BLOCK = 4;
    // NUMBER_OF_VOXEL = 4; // number of voxel in a block
    this.VOXEL_LENGTH = 4; // voxel length in a block
    this.VOXEL_SIZE = 55; // (px)
    
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
    
    this.FIELD_MARK_LENGTH = 50;
    
    this.RENDER_INTERVAL = 30;
    this.TICK_INTERVAL = 700; // default tick interval
    this.SPEEDUP_RATE = 100;
    
    this.CLEARLINE_EFFECT_INTERVAL = 50;
    
    this.AUTO_ROTATE_SPEED = 0.02;
    
    this.STICK_WEIGHT = 850;
    this.STICK_CONTROLL_THROTTLE = 50;
    
    this.CAMERA_HEIGHT_DEFAULT = 300;
    this.CAMERA_DISTANCE_DEFAULT = 1400;
    
    this.SHADOW_BLOCK = {
      id: 8,
      color: '#000',
      opacity: 0.3,
    };
    
    this.CLEARLINE_BLOCK = {
      id: 9,
      color: '#CC66FF',
    };
    
    this.GAMEOVER_BLOCK = {
      id: 10,
      color: '#FF66FF',
    };
    
    // shape: 4 x 4 x 4
    this.BLOCK_LIST = [
      {
        id: 0,
        color: '#FF6666',
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
        color: '#FFCC66',
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
        color: '#FFFF66',
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
        color: '#CCFF66',
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
        color: '#66FF66',
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
        color: '#66FFCC',
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
        color: '#66FFFF',
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
        color: '#66CCFF',
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
  }
}

module.exports = new TetricusCONST();
