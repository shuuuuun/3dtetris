// import THREE from 'three.js';
// global.THREE = require('three.js'); // global === window
// import 'three.js/examples/js/controls/OrbitControls.js';
// import 'three.js/examples/js/controls/EditorControls.js';
import './lib/EditorControls_';
// import TWEEN from 'tween.js';
import TetricusCONST from './TetricusCONST';

const CONST = TetricusCONST;

export default class TetricusView {
  constructor() {
    this.framecount = 0;
    this.isAutoRotate = false;
    this.CONTAINER_ID = 'js-game-view';
    this.ZERO_VECTOR = new THREE.Vector3(0,0,0);
    this.CENTER_VECTOR = new THREE.Vector3(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
    this.CAMERA_POSITION = new THREE.Vector3(CONST.CENTER_X, -CONST.CAMERA_HEIGHT_DEFAULT, CONST.CAMERA_DISTANCE_DEFAULT);
    this.CAMERA_NEAR = 1;
    this.CAMERA_FAR = 100000;
    this.VIEW_BLOCK_LIST = CONST.BLOCK_LIST.concat([CONST.SHADOW_BLOCK, CONST.CLEARLINE_BLOCK, CONST.GAMEOVER_BLOCK]);
  }
  
  dispose() {
    this.stop();
    if (this.container) {
      this.container.innerHTML = '';
    }
    if (this.renderer) {
      this.renderer.dispose();
      delete this.renderer;
    }
    if (this.scene) {
      delete this.scene;
    }
    if (this.camera) {
      delete this.camera;
    }
    if (this.controls) {
      this.controls.dispose();
      delete this.controls;
    }
  }
  
  init() {
    // container ------------------------------
    this.container = document.getElementById(this.CONTAINER_ID);
    
    
    // renderer ------------------------------
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor( 0xf0f0f0 ); // 背景色
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize( CONST.WIDTH, CONST.HEIGHT );
    this.container.appendChild( this.renderer.domElement );
    
    
    // scene ------------------------------
    this.scene = new THREE.Scene();
    
    
    // camera ------------------------------
    this.perscamera = new THREE.PerspectiveCamera( 45, CONST.WIDTH / CONST.HEIGHT, this.CAMERA_NEAR, this.CAMERA_FAR ); // fov(視野角), aspect, near, far
    this.orthocamera = new THREE.OrthographicCamera( -window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, this.CAMERA_NEAR, this.CAMERA_FAR ); // left, right, top, bottom, near, far
    this.cubecamera = new THREE.CubeCamera( this.CAMERA_NEAR, this.CAMERA_FAR, 128 ); // near, far, cubeResolution
    this.setCamera();
    
    
    // controls ------------------------------
    // this.controls = new THREE.OrbitControls(this.camera);
    // this.controls.target = this.CENTER_VECTOR;
    // this.controls.enableKeys = false;
    this.controls = new THREE.EditorControls(this.camera);
    this.controls.center = this.CENTER_VECTOR;
    this.disableControls();
    
    
    // axis ------------------------------
    const axis = new THREE.AxisHelper(this.CAMERA_FAR);
    axis.position.set(0,0,0);
    // this.scene.add(axis);
    
    
    // grid bottom ------------------------------
    {
      const size = CONST.CENTER_X;
      const step = CONST.VOXEL_SIZE;
      const grid = new THREE.GridHelper(size, step);
      grid.position.set( size, CONST.HEIGHT, size );
      this.scene.add( grid );
    }
    
    // field mark ------------------------------
    {
      const geometry = new THREE.Geometry();
      geometry.vertices.push(
        new THREE.Vector3( 0, CONST.FIELD_MARK_LENGTH, 0 ),
        new THREE.Vector3( 0, 0, 0 ),
        new THREE.Vector3( 0, 0, CONST.FIELD_MARK_LENGTH ),
        new THREE.Vector3( 0, 0, 0 ),
        new THREE.Vector3( CONST.FIELD_MARK_LENGTH, 0, 0 )
      );
      const material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );
      const line = new THREE.Line( geometry, material );
      line.type = THREE.LinePieces;
      const line2 = line.clone().translateX(CONST.WIDTH).rotateY(-Math.PI / 2);
      const line3 = line.clone().translateZ(CONST.WIDTH).rotateY(Math.PI / 2);
      const line4 = line.clone().translateX(CONST.WIDTH).translateZ(CONST.WIDTH).rotateY(Math.PI);
      this.scene.add( line, line2, line3, line4 );
    }
    
    
    // Lights ------------------------------
    const ambientLight = new THREE.AmbientLight( 0x606060 );
    this.scene.add( ambientLight );
    const directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 0.5, -0.75, 1 ).normalize();
    this.scene.add( directionalLight );
    
    
    // cubes ------------------------------
    this.cubeGeo = new THREE.BoxGeometry( CONST.VOXEL_SIZE, CONST.VOXEL_SIZE, CONST.VOXEL_SIZE );
    this.cubeMaterial = [];
    this.VIEW_BLOCK_LIST.forEach((block) => {
      const material = new THREE.MeshLambertMaterial({ color: block.color });
      if (block.opacity >= 0) {
        material.transparent = true;
        material.opacity = 0.3;
      }
      this.cubeMaterial.push(material);
    });
    
    this.setSize();
  }
  
  setSize() {
    this.width = window.innerWidth || CONST.WIDTH;
    this.height = window.innerHeight || CONST.HEIGHT;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( this.width, this.height );
  }
  
  setCamera(code) {
    switch (code) {
      case 'ortho1':
        this.camera = this.orthocamera;
        this.camera.position.set(CONST.CENTER_X, CONST.CENTER_Y, CONST.CAMERA_DISTANCE_DEFAULT);
        break;
      case 'ortho2':
        this.camera = this.orthocamera;
        this.camera.position.set(CONST.CAMERA_DISTANCE_DEFAULT, CONST.CENTER_Y, CONST.CENTER_Z);
        break;
      case 'ortho3':
        this.camera = this.orthocamera;
        this.camera.position.set(CONST.CENTER_X, -1000, CONST.CENTER_Z);
        break;
      default: // 'pers'
        this.camera = this.perscamera;
        this.camera.position.copy(this.CAMERA_POSITION);
        break;
    }
    this.camera.up.set(0, -1, 0); // y down
    this.camera.zoom = 1;
    this.camera.lookAt(this.CENTER_VECTOR);
  }
  
  disableControls() {
    if (!this.controls) return;
    this.controls.enabled = false;
  }
  
  enableControls() {
    if (!this.controls) return;
    this.controls.enabled = true;
  }
  
  checkCameraDirection() {
    const cameraVector = this.camera.position.clone().sub(this.CENTER_VECTOR);
    let direction = {
      x: Math.sign(Math.abs(cameraVector.x) > Math.abs(cameraVector.z) ? cameraVector.x : 0),
      y: Math.sign(-cameraVector.y),
      z: Math.sign(Math.abs(cameraVector.z) > Math.abs(cameraVector.x) ? cameraVector.z : 0),
    };
    return direction;
  }
  
  rotateCamera() {
    this.controls.rotate({
      x: CONST.AUTO_ROTATE_SPEED,
      y: 0,
    });
  }
  
  tick() {
    this.framecount++;
  }
  
  render() {
    if (this.isAutoRotate) {
      this.rotateCamera();
    }
    
    this.renderer.render( this.scene, this.camera );
  }
  
  drawBoard(board) {
    this.boardVoxels = [];
    for ( let z = 0; z < CONST.COLS; ++z ) {
      for ( let y = 0; y < CONST.ROWS; ++y ) {
        for ( let x = 0; x < CONST.COLS; ++x ) {
          const boardX = x;
          const boardY = y;
          const boardZ = z;
          const id = board[boardZ][boardY][boardX] - 1; // 1始まりになってるため-1
          if (!board[boardZ][boardY][boardX]) continue;
          const voxel = this.drawVoxel(boardX, boardY, boardZ, id);
          this.boardVoxels.push(voxel);
        }
      }
    }
  }
  
  disposeBoard() {
    if (!this.boardVoxels || !this.boardVoxels.length) return;
    this.disposeVoxels(this.boardVoxels);
  }
  
  disposeBlock(block) {
    this.disposeVoxels(block.voxels);
  }
  
  disposeVoxels(voxels) {
    voxels.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.scene.remove(mesh);
    });
  }
  
  drawCurrentBlock(block) {
    if (this.currentBlock) {
      this.disposeBlock(this.currentBlock);
    }
    this.currentBlock = Object.assign({}, block);
    this.drawBlock(this.currentBlock);
  }
  
  drawBlock(block) {
    if (!block) return;
    block.voxels = [];
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          if (!block.shape[z][y][x]) continue;
          const drawX = x + block.x;
          const drawY = y + block.y - CONST.HIDDEN_ROWS;
          const drawZ = z + block.z;
          const voxel = this.drawVoxel(drawX, drawY, drawZ, block.id);
          block.voxels.push(voxel);
        }
      }
    }
  }
  
  drawVoxel(x, y, z, id) {
    const blockX = x * CONST.VOXEL_SIZE;
    const blockY = y * CONST.VOXEL_SIZE;
    const blockZ = z * CONST.VOXEL_SIZE;
    
    const voxel = new THREE.Mesh( this.cubeGeo, this.cubeMaterial[id] );
    voxel.position.set(blockX, blockY, blockZ);
    voxel.position.addScalar( CONST.VOXEL_SIZE / 2 ); // グリッドに合わせる。
    
    if (y < 0) return voxel; // 盤面外は描画しない
    this.scene.add( voxel );
    return voxel;
  }
  
  moveCurrentBlock(block) {
    if (!this.currentBlock) return;
    Object.assign(this.currentBlock, block);
    this.moveBlock(this.currentBlock);
  }
  
  moveBlock(block) {
    if (!block) return;
    let index = 0;
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          if (!block.shape[z][y][x]) continue;
          const drawX = x + block.x;
          const drawY = y + block.y - CONST.HIDDEN_ROWS;
          const drawZ = z + block.z;
          const voxel = block.voxels[index];
          this.moveVoxel(drawX, drawY, drawZ, voxel);
          index++;
        }
      }
    }
  }
  
  moveVoxel(x, y, z, voxel) {
    if (y < 0) return; // 盤面外は描画しない
    
    const blockX = x * CONST.VOXEL_SIZE;
    const blockY = y * CONST.VOXEL_SIZE;
    const blockZ = z * CONST.VOXEL_SIZE;
    
    voxel.position.set(blockX, blockY, blockZ);
    voxel.position.addScalar( CONST.VOXEL_SIZE / 2 ); // グリッドに合わせる。
    this.scene.add( voxel );
  }
  
  start() {
    let startTime = Date.now();
    let previousTime = startTime;
    let previousRenderTime = previousTime;
    let previousTickTime = previousTime;
    
    if (typeof this.loopId === 'number') return;
    
    this.loopId = null;
    
    let loop = (timestamp) => {
      let nowTime = Date.now();
      let elapsedTime = nowTime - startTime;
      let deltaTime = nowTime - previousTime;
      let deltaRenderTime = nowTime - previousRenderTime;
      let deltaTickTime = nowTime - previousTickTime;
      
      if (deltaRenderTime > CONST.RENDER_INTERVAL) {
        previousRenderTime = nowTime;
        this.render();
      }
      if (deltaTickTime > CONST.TICK_INTERVAL) {
        previousTickTime = nowTime;
        this.tick();
      }
      
      previousTime = nowTime;
      this.loopId = requestAnimationFrame(loop);
    };
    
    loop();
  }
  
  stop() {
    cancelAnimationFrame(this.loopId);
    this.loopId = null;
  }
}
