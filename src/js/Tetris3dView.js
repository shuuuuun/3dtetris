// import THREE from 'three.js';
global.THREE = require('three.js'); // global === window
// import OrbitControls from 'three.js/examples/js/controls/OrbitControls.js'; // これじゃだめ
const OrbitControls = require('three.js/examples/js/controls/OrbitControls.js');
import Tetris3dCONST from './Tetris3dCONST';

const CONST = Tetris3dCONST;

class Tetris3dView {
  constructor() {
    this.framecount = 0;
    this.ZERO_VECTOR = new THREE.Vector3(0,0,0);
    this.CAMERA_DISTANCE_DEFAULT = 1700;
    this.CENTER_VECTOR = new THREE.Vector3(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
    // this.CENTER_VECTOR = { x: CONST.CENTER_X, y: CONST.CENTER_Y, z: CONST.CENTER_Z };
    this.CAMERA_POSITION = new THREE.Vector3(this.CAMERA_DISTANCE_DEFAULT, CONST.HEIGHT, this.CAMERA_DISTANCE_DEFAULT);
    // this.CAMERA_POSITION = { x: this.CAMERA_DISTANCE_DEFAULT, y: CONST.CENTER_Y, z: this.CAMERA_DISTANCE_DEFAULT };
    this.CAMERA_NEAR = 1;
    this.CAMERA_FAR = 100000;
  }
  
  init() {
    // container ------------------------------
    this.container = document.getElementById('canvas-container');
    
    
    // renderer ------------------------------
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor( 0xf0f0f0 ); // 背景色
    this.renderer.setSize( CONST.WIDTH, CONST.HEIGHT );
    this.container.appendChild( this.renderer.domElement );
    
    
    // scene ------------------------------
    this.scene = new THREE.Scene();
    
    
    // camera ------------------------------
    this.perscamera = new THREE.PerspectiveCamera( 45, CONST.WIDTH / CONST.HEIGHT, this.CAMERA_NEAR, this.CAMERA_FAR ); // fov(視野角), aspect, near, far
    // this.orthocamera = new THREE.OrthographicCamera( -CONST.WIDTH / 2, CONST.WIDTH / 2, CONST.HEIGHT / 2, -CONST.HEIGHT / 2, this.CAMERA_NEAR, this.CAMERA_FAR ); // left, right, top, bottom, near, far
    this.orthocamera = new THREE.OrthographicCamera( -window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, this.CAMERA_NEAR, this.CAMERA_FAR ); // left, right, top, bottom, near, far
    this.cubecamera = new THREE.CubeCamera( this.CAMERA_NEAR, this.CAMERA_FAR, 128 ); // near, far, cubeResolution
    this.setCamera();
    /*
    this.camera = this.perscamera;
    // this.camera = this.orthocamera;
    // this.camera = new THREE.Camera();
    // this.camera.clone(this.perscamera);
    this.camera.position.set(2000, CONST.CENTER_Y, 2000);
    // this.camera.position.set(this.CAMERA_POSITION);
    // this.camera.position.add(this.CAMERA_POSITION);
    // this.camera.position.copy(this.CAMERA_POSITION);
    // this.camera.position.addVectors(this.ZERO_VECTOR, this.CAMERA_POSITION);
    // this.camera.position = this.CAMERA_POSITION;
    this.camera.up.set(0, -1, 0); // y down
    // this.camera.lookAt(this.CENTER_VECTOR);
    // this.camera.lookAt(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
    // let lookatVector = new THREE.Vector3().subVectors(this.CENTER_VECTOR, this.camera.position);
    // let lookatVector = new THREE.Vector3().addVectors(this.CENTER_VECTOR, this.camera.position);
    // this.camera.lookAt(lookatVector);
    // this.camera.lookAt(0,1,0);
    // this.camera.lookAt(new THREE.Vector3(0,1,0));
    // console.log(lookatVector, this.camera.getWorldDirection());
    
    
    // controls ------------------------------
    this.controls = new THREE.OrbitControls(this.camera);
    // this.controls.center.set(CONST.CENTER_X, 0, CONST.CENTER_Z);
    // this.controls.center = this.CENTER_VECTOR;
    // this.controls.center.set(this.CENTER_VECTOR);
    // this.controls.center.set(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
    // this.controls.target.set(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
    // this.controls.target = new THREE.Vector3(CONST.CENTER_X, CONST.CENTER_Y, CONST.CENTER_Z);
    this.controls.target = this.CENTER_VECTOR;
    // this.controls.target.set(this.CENTER_VECTOR);
    // this.controls.noKeys = true;
    this.controls.enableKeys = false;
    this.controls.update();
    */
    
    // axis ------------------------------
    const axis = new THREE.AxisHelper(this.CAMERA_FAR);
    axis.position.set(0,0,0);
    this.scene.add(axis);
    
    
    // grid top ------------------------------
    const size = CONST.CENTER_X;
    const step = CONST.VOXEL_SIZE;
    const grid = new THREE.GridHelper(size, step);
    // grid.position.add( new THREE.Vector3( size, 0, size ) ); // 0,0が端になるように移動
    grid.position.set( size, 0, size ); // 0,0が端になるように移動
    this.scene.add( grid );
    
    
    // grid bottom ------------------------------
    const gridBtm = new THREE.GridHelper(size, step);
    gridBtm.position.set( size, CONST.HEIGHT, size );
    this.scene.add( gridBtm );
    
    
    // plane ------------------------------
    // plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() );
    // plane.rotation.x = - Math.PI / 2;
    // plane.visible = false;
    // this.scene.add( plane );
    // objects.push( plane );
    
    
    // Lights ------------------------------
    const ambientLight = new THREE.AmbientLight( 0x606060 );
    this.scene.add( ambientLight );
    const directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 0.5, -0.75, 1 ).normalize();
    this.scene.add( directionalLight );
    
    
    // picking ------------------------------
    // projector = new THREE.Projector();
    
    
    // mouse ------------------------------
    this.mouse2D = new THREE.Vector3( 0, 10000, 0.5 );
    
    
    // roll-over helpers ------------------------------
    // rollOverGeo = new THREE.BoxGeometry( CONST.VOXEL_SIZE, CONST.VOXEL_SIZE, CONST.VOXEL_SIZE );
    // rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
    // rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    // this.scene.add( rollOverMesh );
    
    
    // stats ------------------------------
    // stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.top = '0px';
    // container.appendChild( stats.domElement );
    
    
    // cubes ------------------------------
    this.cubeGeo = new THREE.BoxGeometry( CONST.VOXEL_SIZE, CONST.VOXEL_SIZE, CONST.VOXEL_SIZE );
    this.cubeMaterial = [];
    // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, ambient: 0x00ff80, shading: THREE.FlatShading, map: THREE.ImageUtils.loadTexture( "textures/square-outline-textured.png" ) } );
    // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, ambient: 0x00ff80, shading: THREE.FlatShading } );
    // this.cubeMaterial.ambient = this.cubeMaterial.color;
    // this.cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, shading: THREE.FlatShading } );
    // this.cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, ambient: 0xfeb74c });
    this.cubeMaterial[0] = new THREE.MeshLambertMaterial({ color: "rgb(254,183,76)", ambient: "rgb(254, 183, 76)" });
    this.cubeMaterial[1] = new THREE.MeshLambertMaterial({ color: "rgb(251,122,111)", ambient: "rgb(251,122,111)" });
    this.cubeMaterial[2] = new THREE.MeshLambertMaterial({ color: "rgb(247,181,90)", ambient: "rgb(247,181,90)" });
    this.cubeMaterial[3] = new THREE.MeshLambertMaterial({ color: "rgb(241,221,96)", ambient: "rgb(241,221,96)" });
    this.cubeMaterial[4] = new THREE.MeshLambertMaterial({ color: "rgb(191,216,94)", ambient: "rgb(191,216,94)" });
    this.cubeMaterial[5] = new THREE.MeshLambertMaterial({ color: "rgb(107,180,252)", ambient: "rgb(107,180,252)" });
    this.cubeMaterial[6] = new THREE.MeshLambertMaterial({ color: "rgb(202,162,221)", ambient: "rgb(202,162,221)" });
    this.cubeMaterial[7] = new THREE.MeshLambertMaterial({ color: "rgb(100,198,173)", ambient: "rgb(100,198,173)" });
    // this.cubeMaterial.ambient = this.cubeMaterial.color;
    
    
    this.setSize();
  }
  
  setSize() {
    CONST.WIDTH = window.innerWidth;
    CONST.HEIGHT = window.innerHeight;
    this.camera.aspect = CONST.WIDTH / CONST.HEIGHT;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( CONST.WIDTH, CONST.HEIGHT );
  }
  
  setCamera(code) {
    switch (code) {
      case 'ortho1':
        this.camera = this.orthocamera;
        // this.camera.clone(this.orthocamera);
        this.camera.position.set(CONST.CENTER_X, CONST.CENTER_Y, this.CAMERA_DISTANCE_DEFAULT);
        break;
      case 'ortho2':
        this.camera = this.orthocamera;
        // this.camera.clone(this.orthocamera);
        this.camera.position.set(this.CAMERA_DISTANCE_DEFAULT, CONST.CENTER_Y, CONST.CENTER_Z);
        break;
      case 'ortho3':
        this.camera = this.orthocamera;
        // this.camera.clone(this.orthocamera);
        this.camera.position.set(CONST.CENTER_X, -1000, CONST.CENTER_Z);
        break;
      default: // 'pers'
        this.camera = this.perscamera;
        // this.camera.clone(this.perscamera);
        // this.camera.position.addVectors(this.ZERO_VECTOR, this.CAMERA_POSITION);
        this.camera.position.set(this.CAMERA_DISTANCE_DEFAULT, 0, this.CAMERA_DISTANCE_DEFAULT);
        break;
    }
    this.camera.up.set(0, -1, 0); // y down
    this.camera.zoom = 1;
    
    this.stopControls();
    this.startControls();
  }
  
  stopControls() {
    if (this.controls) this.controls.dispose();
  }
  
  startControls() {
    if (this.controls) this.stopControls();
    this.controls = new THREE.OrbitControls(this.camera);
    this.controls.target = this.CENTER_VECTOR;
    this.controls.enableKeys = false;
    // this.controls.reset();
    this.controls.update();
  }
  
  // checkCameraPosition() {
  checkCameraDirection() {
  // checkForward() {
    // const pos = this.camera.position.clone().normalize();
    // const cameraVector = new THREE.Vector3().subVectors(this.camera.position, this.CENTER_VECTOR);
    // const cameraVector = this.camera.position.clone().sub(this.CENTER_VECTOR).normalize();
    const cameraVector = this.camera.position.clone().sub(this.CENTER_VECTOR).round();
    // angleTo
    // fromArray
    let direction = {
      x: Math.sign(Math.abs(cameraVector.x) > Math.abs(cameraVector.z) ? cameraVector.x : 0),
      y: Math.sign(-cameraVector.y),
      z: Math.sign(Math.abs(cameraVector.z) > Math.abs(cameraVector.x) ? cameraVector.z : 0),
    };
    // console.log(cameraVector.toArray(), direction);
    // return { x: 1, y: 0, z: 0 };
    return direction;
  };
  
  tick() {
    this.framecount++;
    
    // this.controls.update();
    
    // this.radius += this.radiusStep;
    // this.phi++;
    // this.camera.position.x = this.radius * Math.sin(this.theta /180 * Math.PI) * Math.sin(this.phi /180 * Math.PI); // 極座標変換
    // this.camera.position.y = this.radius * Math.sin(this.theta /180 * Math.PI) * Math.cos(this.phi /180 * Math.PI);
    // this.camera.position.z = this.radius * Math.cos(this.theta /180 * Math.PI);
    // this.camera.lookAt( this.scene.position );
    // if (this.radius < this.MIN_RADIUS || this.radius > this.MAX_RADIUS) this.radiusStep *= -1;
    
    // this.camera.position.x += ( this.mouseX - this.camera.position.x ) * 0.005;
    // this.camera.position.y += ( - this.mouseY - this.camera.position.y ) * 0.005;
    // this.camera.lookAt( this.scene.position );
    
    // this.camera.position.z = this.r * Math.sin(this.theta /180 * Math.PI) * Math.cos(this.phi /180 * Math.PI);
    // this.camera.position.x = this.r * Math.sin(this.theta /180 * Math.PI) * Math.sin(this.phi /180 * Math.PI);
    // this.camera.position.y = this.r * Math.cos(this.theta /180 * Math.PI);
    // this.camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( this.theta ) );
    // this.camera.position.y = 1400 * Math.tan( THREE.Math.degToRad( thetaY ) );
    // this.camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( this.theta ) );
    // this.camera.position.set(0,100,-500);
    // this.camera.lookAt( this.scene.position );
  }
  
  render() {
    this.renderer.render( this.scene, this.camera );
    
    this.renderBoard();
    this.renderCurrentBlock();
  }
  
  renderBoard() {
  }
  
  renderCurrentBlock() {
  }
  
  drawBlock(block) {
    this.currentBlock = block;
    this.currentBlock.voxels = [];
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          if (!block || !block.shape[z][y][x]) continue;
          let drawX = x + block.x;
          let drawY = y + block.y - CONST.HIDDEN_ROWS;
          let drawZ = z + block.z;
          this.drawVoxel(drawX, drawY, drawZ, block.id);
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
    
    // this.voxels = this.voxels || [];
    // this.voxels.push(voxel);
    this.currentBlock.voxels.push(voxel);
    
    if (y < 0) return; // 盤面外は描画しない
    this.scene.add( voxel );
  }
  
  moveBlock(block) {
    if (!this.currentBlock) return;
    let index = 0;
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          if (!block || !block.shape[z][y][x]) continue;
          let drawX = x + block.x;
          let drawY = y + block.y - CONST.HIDDEN_ROWS;
          let drawZ = z + block.z;
          this.moveVoxel(drawX, drawY, drawZ, index);
          index++;
        }
      }
    }
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

module.exports = Tetris3dView;
