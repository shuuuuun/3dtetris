// import THREE from 'three.js';
// global.THREE = require('three.js'); // global === window
import 'three.js/examples/js/controls/OrbitControls.js';
// import 'three.js/examples/js/controls/EditorControls.js';
import './lib/EditorControls2';
import Tetris3dCONST from './Tetris3dCONST';

const CONST = Tetris3dCONST;

export default class Tetris3dView {
  constructor() {
    this.framecount = 0;
    this.ZERO_VECTOR = new THREE.Vector3(0,0,0);
    this.CAMERA_DISTANCE_DEFAULT = 1500;
    this.CENTER_VECTOR = new THREE.Vector3(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
    this.CAMERA_POSITION = new THREE.Vector3(CONST.CENTER_X, -100, this.CAMERA_DISTANCE_DEFAULT);
    this.CAMERA_NEAR = 1;
    this.CAMERA_FAR = 100000;
  }
  
  init() {
    // container ------------------------------
    this.container = document.getElementById('canvas-container');
    
    
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
    // this.startControls();
    
    
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
    
    // container top ------------------------------
    {
      const size = CONST.CENTER_X;
      const step = size * 2;
      const grid = new THREE.GridHelper(size, step);
      grid.position.set( size, 0, size ); // 0,0が端になるように移動
      // this.scene.add( grid );
    }
    
    // container line ------------------------------
    {
      const size = CONST.COLS * CONST.VOXEL_SIZE;
      const geometry = new THREE.Geometry();
      geometry.vertices.push(
        new THREE.Vector3(    0, CONST.HEIGHT,    0 ),
        new THREE.Vector3(    0, CONST.HEIGHT, size ),
        new THREE.Vector3(    0,            0, size ),
        new THREE.Vector3( size,            0, size ),
        new THREE.Vector3( size, CONST.HEIGHT, size ),
        new THREE.Vector3( size, CONST.HEIGHT,    0 ),
        new THREE.Vector3( size,            0,    0 ),
        new THREE.Vector3(    0,            0,    0 ),
        new THREE.Vector3(    0, CONST.HEIGHT,    0 )
      );
      const material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );
      const line = new THREE.Line( geometry, material );
      line.type = THREE.LinePieces;
      // this.scene.add( line );
    }
    
    
    // Lights ------------------------------
    const ambientLight = new THREE.AmbientLight( 0x606060 );
    this.scene.add( ambientLight );
    const directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 0.5, -0.75, 1 ).normalize();
    this.scene.add( directionalLight );
    
    
    // mouse ------------------------------
    this.mouse2D = new THREE.Vector3( 0, 10000, 0.5 );
    
    
    // cubes ------------------------------
    this.cubeGeo = new THREE.BoxGeometry( CONST.VOXEL_SIZE, CONST.VOXEL_SIZE, CONST.VOXEL_SIZE );
    this.cubeMaterial = [];
    CONST.BLOCK_LIST.forEach((block) => {
      const material = new THREE.MeshLambertMaterial({ color: block.color });
      this.cubeMaterial.push(material);
    });
    { // shadow block color
      const material = new THREE.MeshLambertMaterial({ color: CONST.SHADOW_BLOCK.color, transparent: true, opacity: CONST.SHADOW_BLOCK.opacity });
      this.cubeMaterial.push(material);
    }
    
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
        this.camera.position.set(CONST.CENTER_X, CONST.CENTER_Y, this.CAMERA_DISTANCE_DEFAULT);
        break;
      case 'ortho2':
        this.camera = this.orthocamera;
        this.camera.position.set(this.CAMERA_DISTANCE_DEFAULT, CONST.CENTER_Y, CONST.CENTER_Z);
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
    
    this.stopControls();
    this.startControls();
  }
  
  stopControls() {
    if (this.controls) this.controls.dispose();
  }
  
  startControls() {
    if (this.controls) this.stopControls();
    // this.controls = new THREE.OrbitControls(this.camera);
    // this.controls.target = this.CENTER_VECTOR;
    // this.controls.enableKeys = false;
    // this.controls.update();
    this.controls = new THREE.EditorControls(this.camera);
    this.controls.center = this.CENTER_VECTOR;
  }
  
  checkCameraDirection() {
    const cameraVector = this.camera.position.clone().sub(this.CENTER_VECTOR);
    let direction = {
      x: Math.sign(Math.abs(cameraVector.x) > Math.abs(cameraVector.z) ? cameraVector.x : 0),
      y: Math.sign(-cameraVector.y),
      z: Math.sign(Math.abs(cameraVector.z) > Math.abs(cameraVector.x) ? cameraVector.z : 0),
    };
    return direction;
  };
  
  tick() {
    this.framecount++;
  }
  
  render() {
    this.renderer.render( this.scene, this.camera );
  }
  
  drawCurrentBlock(block) {
    this.currentBlock = block;
    this.currentBlock.voxels = [];
    this.drawBlock(block, true);
  }
  
  drawShadowBlock(block) {
    if (this.shadowBlock) {
      this.shadowBlock.voxels.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.scene.remove(mesh);
      });
    }
    this.shadowBlock = block;
    this.shadowBlock.voxels = [];
    this.drawBlock(block, false, true);
  }
  
  drawBlock(block, isCurrent, isShadow) {
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          if (!block || !block.shape[z][y][x]) continue;
          let drawX = x + block.x;
          let drawY = y + block.y - CONST.HIDDEN_ROWS;
          let drawZ = z + block.z;
          if (isCurrent) {
            this.drawCurrentVoxel(drawX, drawY, drawZ, block.id);
          }
          else if (isShadow) {
            this.drawShadowVoxel(drawX, drawY, drawZ, block.id);
          }
          else {
            this.drawVoxel(drawX, drawY, drawZ, block.id);
          }
        }
      }
    }
  }
  
  drawCurrentVoxel(x, y, z, id) {
    const voxel = this.drawVoxel(x, y, z, id);
    this.currentBlock.voxels.push(voxel);
  }
  
  drawShadowVoxel(x, y, z, id) {
    const voxel = this.drawVoxel(x, y, z, id);
    this.shadowBlock.voxels.push(voxel);
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
    this.moveBlock(block, true);
  }
  
  moveShadowBlock(block) {
    if (!this.shadowBlock) return;
    this.moveBlock(block, false, true);
  }
  
  moveBlock(block, isCurrent, isShadow) {
    let index = 0;
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          if (!block || !block.shape[z][y][x]) continue;
          let drawX = x + block.x;
          let drawY = y + block.y - CONST.HIDDEN_ROWS;
          let drawZ = z + block.z;
          if (isCurrent) {
            this.moveCurrentVoxel(drawX, drawY, drawZ, index);
          }
          else if (isShadow) {
            this.moveShadowVoxel(drawX, drawY, drawZ, index);
          }
          else {
            this.moveVoxel(drawX, drawY, drawZ, index);
          }
          index++;
        }
      }
    }
  }
  
  moveCurrentVoxel(x, y, z, index) {
    if (y < 0) return; // 盤面外は描画しない
    
    const blockX = x * CONST.VOXEL_SIZE;
    const blockY = y * CONST.VOXEL_SIZE;
    const blockZ = z * CONST.VOXEL_SIZE;
    
    const voxel = this.currentBlock.voxels[index];
    voxel.position.set(blockX, blockY, blockZ);
    voxel.position.addScalar( CONST.VOXEL_SIZE / 2 ); // グリッドに合わせる。
    this.scene.add( voxel );
  }
  
  moveShadowVoxel(x, y, z, index) {
    if (y < 0) return; // 盤面外は描画しない
    
    const blockX = x * CONST.VOXEL_SIZE;
    const blockY = y * CONST.VOXEL_SIZE;
    const blockZ = z * CONST.VOXEL_SIZE;
    
    const voxel = this.shadowBlock.voxels[index];
    voxel.position.set(blockX, blockY, blockZ);
    voxel.position.addScalar( CONST.VOXEL_SIZE / 2 ); // グリッドに合わせる。
    this.scene.add( voxel );
  }
  
  moveVoxel(x, y, z, index) {
    if (y < 0) return; // 盤面外は描画しない
    
    const blockX = x * CONST.VOXEL_SIZE;
    const blockY = y * CONST.VOXEL_SIZE;
    const blockZ = z * CONST.VOXEL_SIZE;
    
    const voxel = this.currentBlock.voxels[index];
    voxel.position.set(blockX, blockY, blockZ);
    voxel.position.addScalar( CONST.VOXEL_SIZE / 2 ); // グリッドに合わせる。
    this.scene.add( voxel );
  }
  
  start() {
    let _this = this;
    let startTime = Date.now();
    let previousTime = startTime;
    let previousRenderTime = previousTime;
    let previousTickTime = previousTime;
    this.loopId = null;
    
    (function loop(timestamp) {
      let nowTime = Date.now();
      let elapsedTime = nowTime - startTime;
      let deltaTime = nowTime - previousTime;
      let deltaRenderTime = nowTime - previousRenderTime;
      let deltaTickTime = nowTime - previousTickTime;
      
      if (deltaRenderTime > CONST.RENDER_INTERVAL) {
        previousRenderTime = nowTime;
        _this.render();
      }
      if (deltaTickTime > CONST.TICK_INTERVAL) {
        previousTickTime = nowTime;
        _this.tick();
      }
      
      previousTime = nowTime;
      _this.loopId = requestAnimationFrame(loop);
    })();
  }
  
  stop() {
    cancelAnimationFrame(this.loopId);
  }
}
