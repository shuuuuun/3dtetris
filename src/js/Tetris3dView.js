import THREE from 'three.js';

class Tetris3dView {
  constructor() {
    this.RENDER_INTERVAL = 30;
    this.TICK_INTERVAL = 250;
    this.BLOCK_SIZE = 50;
    this.FIELD_SIZE = 10;
    
    this.framecount = 0;
  }
  
  init() {
    // container ------------------------------
    this.container = document.getElementById('canvas-container');
    
    
    // renderer ------------------------------
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor( 0xf0f0f0 ); // 背景色
    this.renderer.setSize( this.width, this.height );
    this.container.appendChild( this.renderer.domElement );
    
    
    // scene ------------------------------
    this.scene = new THREE.Scene();
    
    
    // camera ------------------------------
    this.perscamera = new THREE.PerspectiveCamera( 45, this.width / this.height, 1, 10000 ); // fov(視野角),aspect,near,far
    this.orthocamera = new THREE.OrthographicCamera( this.width / -2, this.width / 2, this.height / 2, this.height / -2, 1, 10000 );
    // this.combinedcamera = new THREE.CombinedCamera( this.width, this.height, 45, 1, 10000, 1, 10000 );
    this.camera = this.perscamera;
    // this.camera.position.y = 800;
    this.camera.position.set(100, 100, 100);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt({ x:0, y:0, z:0 });
    
    
    // axis ------------------------------
    const axis = new THREE.AxisHelper(1000);
    axis.position.set(0,0,0);
    this.scene.add(axis);
    
    
    // grid ------------------------------
    // const gridstep = this.BLOCK_SIZE, // gridの間隔
    //  gridsize = 10, // gridのマスの数
    const size = this.FIELD_SIZE * this.BLOCK_SIZE;
    const step = this.BLOCK_SIZE;
    const geometry = new THREE.Geometry();
    for ( let i = 0; i <= size; i += step ) {
      geometry.vertices.push( new THREE.Vector3(    0, 0, i ) );
      geometry.vertices.push( new THREE.Vector3( size, 0, i ) );
      geometry.vertices.push( new THREE.Vector3( i, 0,    0 ) );
      geometry.vertices.push( new THREE.Vector3( i, 0, size ) );
    }
    const material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );
    const line = new THREE.Line( geometry, material );
    line.type = THREE.LinePieces;
    this.scene.add( line );
    
    
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
    // directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
    directionalLight.position.set( 0.5, 0.75, 1 ).normalize();
    this.scene.add( directionalLight );
    
    
    // picking ------------------------------
    // projector = new THREE.Projector();
    
    
    // mouse ------------------------------
    this.mouse2D = new THREE.Vector3( 0, 10000, 0.5 );
    
    
    // roll-over helpers ------------------------------
    // rollOverGeo = new THREE.BoxGeometry( this.BLOCK_SIZE, this.BLOCK_SIZE, this.BLOCK_SIZE );
    // rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
    // rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    // this.scene.add( rollOverMesh );
    
    
    // stats ------------------------------
    // stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.top = '0px';
    // container.appendChild( stats.domElement );
    
    
    // cubes ------------------------------
    this.cubeGeo = new THREE.BoxGeometry( this.BLOCK_SIZE, this.BLOCK_SIZE, this.BLOCK_SIZE );
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
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( this.width, this.height );
  }
  
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
    
    // this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
    
    this.renderBoard();
    this.renderCurrentBlock();
  }
  
  renderBoard() {
  }
  
  renderCurrentBlock() {
  }
  
  drawBlock(x, y, z, id) {
    const blockX = x * this.BLOCK_SIZE;
    const blockY = y * this.BLOCK_SIZE + this.BLOCK_SIZE / 2;
    const blockZ = z * this.BLOCK_SIZE;
    
    const voxel = new THREE.Mesh( this.cubeGeo, this.cubeMaterial[id] );
    voxel.position.set(blockX, blockY, blockZ);
    // voxel.position.addScalar( this.BLOCK_SIZE / 2 );   // グリッドに合わせる。
    // this.blocks.push(voxel);
    // this.scene.add( this.blocks[n][j] );
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
      
      if (deltaRenderTime > _this.RENDER_INTERVAL) {
        previousRenderTime = nowTime;
        _this.render();
      }
      if (deltaTickTime > _this.TICK_INTERVAL) {
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
