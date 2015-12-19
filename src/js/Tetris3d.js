(function(win, doc){
  var ns = win.App = win.App || {};
  
  var util = new ns.Util();
  
  ns.Tetris3d = Tetris3d;
  
  function Tetris3d(){
    var _this = this;
    
    // 変数宣言 ----------------------------------------------------------------------------------------------------
    this.container;
    this.stats;
    this.camera;
    this.scene;
    this.renderer;
    this.projector;
    this.plane;
    this.cube;
    this.mouse2D = {};
      // mouse3D, raycaster,
      // rollOveredFace,
      // theta = 45 * 0.5,
      // thetaY = 30,
    this.rollOverMesh;
    this.rollOverMaterial;
    this.voxelPosition = new THREE.Vector3();
    this.tmpVec = new THREE.Vector3();
    this.normalMatrix = new THREE.Matrix3();
    this.cubeGeo;
    this.cubeMaterial = [];
    this.i;
    this.intersector;
    this.objects = [];
    this.orthocamera;
    this.ortho = false;
    this.width = window.innerWidth
    this.height = window.innerHeight;
    this.fieldsize = 10;
    this.fieldHeight = 20;
    this.boardSizeX = 10;
    this.boardSizeY = 20; // 高さ
    this.boardSizeZ = 10;
    this.board = [];
    for(var x=0; x<this.boardSizeX; x++){
      this.board[x] = [];
      for(var y=0; y<this.boardSizeY; y++){
        this.board[x][y] = [];
        for(var z=0; z<this.boardSizeZ; z++){
          this.board[x][y][z] = 0;
        }
      }
    }
    this.current; // 現在操作しているブロック
    this.currentX;
    this.currentY; // 現在操作しているブロックのいち
    this.lastAnimTime = 0;
    _this.lastMoveTime = 0;
    this.framecount = 0;
    this.voxels = [],
    this.blocks = [];
    // 球座標
    this.r = 1400;
    this.theta = 60;
    this.phi = 0;
    this.isAnykeyDown
     = this.isRightDown = this.isLeftDown = this.isUpDown = this.isDownDown
     = this.is59Down = this.isStarDown = this.isPlusDown = this.is190Down = this.is191Down = this.is_Down
     = this.isShiftDown = this.isCtrlDown
     = this.isZdown = this.isXdown
     = this.isAdown = this.isSdown = this.isDdown = this.isQdown = this.isWdown = this.isEdown
     = this.is0down = this.is1down = this.is2down = this.is3down
     = false;
    // var isKeyDown = [
    //  "right", "left", "up", "down",
    //  "59", "star", "plus", "190", "191", "_",
    //  "shift", "ctrl",
    //  "z", "x",
    //  "a", "s", "d", "q", "w", "e",
    //  "0", "1", "2", "3"
    // ];
    
    // ブロックの色
    this.colors = [
      "rgb(254,183,76)",
      "rgb(251,122,111)",
      "rgb(247,181,90)",
      "rgb(241,221,96)",
      "rgb(191,216,94)",
      "rgb(107,180,252)",
      "rgb(202,162,221)",
      "rgb(100,198,173)"
    ];

    // 4 x 4 x 4
    this.shapes = [
      [[ // 1.横棒
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]],
      [[ // 2.四角
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]],
      [[ // 3.L字
        [1, 1, 1, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]],
      [[ // 4.Z字(S字)
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]],
      [[ // 5.T字
        [1, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]],
      [[ // 6.3方向
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [1, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]],
      [[ // 7.うねうね1
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]],
      [[ // 8.うねうね2
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],[
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]]
    ];
    
  }
  
  Tetris3d.prototype.init = function() {
    var _this = this;
    
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
    this.camera.up.set(0, -1, 0);
    this.camera.lookAt({ x:0, y:0, z:0 });
    
    
    // axis ------------------------------
    var axis = new THREE.AxisHelper(1000);
    axis.position.set(0,0,0);
    this.scene.add(axis);
    
    
    // // axis helper -----
    // var axis = new THREE.AxisHelper(1000);
    // axis.position.set(0,0,0);
    // scene.add(axis);
    
    
    // grid ------------------------------
    // var gridstep = 50, // gridの間隔
    //  gridsize = 10, // gridのマスの数
    //  size = gridsize/2 * gridstep;
    // var size = fieldsize/2 * 50,
    var size = this.fieldsize * 50;
    var step = 50;
    var geometry = new THREE.Geometry();
    for ( var i = 0; i <= size; i += step ) {
      geometry.vertices.push( new THREE.Vector3(    0, 0, i ) );
      geometry.vertices.push( new THREE.Vector3( size, 0, i ) );
      geometry.vertices.push( new THREE.Vector3( i, 0,    0 ) );
      geometry.vertices.push( new THREE.Vector3( i, 0, size ) );
    }
    var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );
    var line = new THREE.Line( geometry, material );
    line.type = THREE.LinePieces;
    this.scene.add( line );
    
    
    // plane ------------------------------
    // plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() );
    // plane.rotation.x = - Math.PI / 2;
    // plane.visible = false;
    // this.scene.add( plane );
    // objects.push( plane );
    
    
    // Lights ------------------------------
    var ambientLight = new THREE.AmbientLight( 0x606060 );
    this.scene.add( ambientLight );
    var directionalLight = new THREE.DirectionalLight( 0xffffff );
    // directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
    directionalLight.position.set( 0.5, 0.75, 1 ).normalize();
    this.scene.add( directionalLight );
    
    
    // picking ------------------------------
    // projector = new THREE.Projector();
    
    
    // mouse ------------------------------
    this.mouse2D = new THREE.Vector3( 0, 10000, 0.5 );
    
    
    // roll-over helpers ------------------------------
    // rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
    // rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
    // rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    // this.scene.add( rollOverMesh );
    
    
    // stats ------------------------------
    // stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.top = '0px';
    // container.appendChild( stats.domElement );
    
    
    // cubes ------------------------------
    this.cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
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
    
    
    // event bind ------------------------------
    document.addEventListener('mousemove', function(evt){
      evt.preventDefault();
      _this.mouse2D.x = ( evt.clientX / _this.width ) * 2 - 1;
      _this.mouse2D.y = - ( evt.clientY / _this.height ) * 2 + 1;
    }, false);
    // document.addEventListener('mousedown', function(evt){
    //   _this.onDocumentMouseDown(evt);
    // }, false);
    document.addEventListener('keydown', function(evt){
      evt.preventDefault();
      _this.onDocumentKeyDown(evt);
    }, false);
    document.addEventListener('keyup', function(evt){
      _this.onDocumentKeyUp(evt);
    }, false);
    window.addEventListener('resize', function(evt){
      _this.setSize();
    }, false);
    
    
    // start ------------------------------
    _this.animate();
    
  }; // ~ init
  
  
  // ユーザ制御系・操作系・描画制御系 ----------------------------------------------------------------------------------------------------
  Tetris3d.prototype.onDocumentKeyDown = function( event ) {
    var _this = this;
    
    _this.isAnykeyDown = true;
    switch( event.keyCode ) {
      case 16: _this.isShiftDown = true; break;
      case 17: _this.isCtrlDown = true; break;
      
      case 90: _this.isZdown = true; break;
      case 88: _this.isXdown = true; break;
      case 65: _this.isAdown = true; break;
      case 83: _this.isSdown = true; break;
      case 68: _this.isDdown = true; break;
      case 81: _this.isQdown = true; break;
      case 87: _this.isWdown = true; break;
      case 69: _this.isEdown = true; break;
      
      case 37: _this.isLeftDown = true; _this.ortho = false; break;
      case 38: _this.isUpDown = true; _this.ortho = false; break;
      case 39: _this.isRightDown = true; _this.ortho = false; break;
      case 40: _this.isDownDown = true; _this.ortho = false; break;
      
      case 59: _this.is59Down = true; break;   // ]
      case 58: _this.isStarDown = true; break;   // *
      case 221: _this.isPlusDown = true; break;   // +
      
      case 190: _this.is190Down = true; break;   // >
      
      case 191: _this.is191Down = true; break;   // ?
      case 167: _this.is_Down = true; break;   // _
      
      case 48:   // 0
        _this.is0down = true;
        if( _this.ortho ){ _this.ortho = false; }
        else{ _this.ortho = true; }
      break;
      case 49: _this.is1down = true; _this.ortho = true; break;
      case 50: _this.is2down = true; _this.ortho = true; break;
      case 51: _this.is3down = true; _this.ortho = true; break;
    }
  };
  
  Tetris3d.prototype.onDocumentKeyUp = function( event ) {
    var _this = this;
    _this.isAnykeyDown = false;
    switch ( event.keyCode ) {
      case 16: _this.isShiftDown = false; break;
      case 17: _this.isCtrlDown = false; break;
      case 90: _this.isZdown = false; break;
      case 88: _this.isXdown = false; break;
      case 65: _this.isAdown = false; break;
      case 83: _this.isSdown = false; break;
      case 68: _this.isDdown = false; break;
      case 81: _this.isQdown = false; break;
      case 87: _this.isWdown = false; break;
      case 69: _this.isEdown = false; break;
      case 37: _this.isLeftDown = false; break;
      case 38: _this.isUpDown = false; break;
      case 39: _this.isRightDown = false; break;
      case 40: _this.isDownDown = false; break;
      case 59: _this.is59Down = false; break;
      case 58: _this.isStarDown = false; break;
      case 221: _this.isPlusDown = false; break;
      case 190: _this.is190Down = false; break;
      case 191: _this.is191Down = false; break;
      case 167: _this.is_Down = false; break;
      case 48: _this.is0down = false; break;
      case 49: _this.is1down = false; break;
      case 50: _this.is2down = false; break;
      case 51: _this.is3down = false; break;
    }
  };
  
  Tetris3d.prototype.setSize = function() {
    var _this = this;
    _this.width = window.innerWidth;
    _this.height = window.innerHeight;
    // _this.camera.aspect = _this.width / _this.height;
    _this.perscamera.aspect = _this.width / _this.height;
    // if( _this.width > 600 ){
    //  _this.orthocamera.left = -_this.width;
    //  _this.orthocamera.right = _this.width;
    // }else{
    //  _this.orthocamera.left = -600;
    //  _this.orthocamera.right = 600;
    // }
    // if( _this.height > 600 ){
    //  _this.orthocamera.top = _this.height;
    //  _this.orthocamera.bottom = -_this.height;
    // }else{
    //  _this.orthocamera.top = 600;
    //  _this.orthocamera.bottom = -600;
    // }
    _this.camera.updateProjectionMatrix();
    _this.renderer.setSize( _this.width, _this.height );
  };
  
  // ブロック制御系 ----------------------------------------------------------------------------------------------------
  Tetris3d.prototype.moveBlock = function(){
    var _this = this;
    var processtime = window.performance.now() - _this.lastMoveTime;
    if(processtime > 500){
      var n = _this.blocks.length-1;
      if( !_this.blocks[n].stopped ){
        if( _this.detectCollision(n) ){
          _this.blocks[n].stopped = true;
        }else{
          for(var j=0; j<_this.blocks[n].length; j++){
            
            if( _this.isSdown ){ _this.blocks[n][j].position.z += 50; }
            if( _this.isDdown ){ _this.blocks[n][j].position.x += 50; }
            if( _this.isWdown ){ _this.blocks[n][j].position.z -= 50; }
            if( _this.isAdown ){ _this.blocks[n][j].position.x -= 50; }
            
            _this.scene.add( _this.blocks[n][j] );
          }
          _this.lastMoveTime = window.performance.now();
        }
      }
    }
  };
  
  Tetris3d.prototype.updateBlocks = function(){
    var _this = this;
    var n = _this.blocks.length-1;
    if( !_this.blocks[n].stopped ){
      if( _this.detectCollision(n) ){
        _this.blocks[n].stopped = true;
      }else{
        for(var j=0; j<_this.blocks[n].length; j++){
          _this.blocks[n][j].position.y -= 50;
          _this.scene.add( _this.blocks[n][j] );
        }
      }
    }
  };
  
  Tetris3d.prototype.createBlock = function(){
    var _this = this;
    // var block_num = 7;
    var block_num = Math.floor(Math.random() * 7) + 1;
    // var x = Math.floor(Math.random() * 20) - 10;   // -10~9の整数の乱数
    var x = Math.floor(Math.random() * _this.fieldsize) - _this.fieldsize/2;
    var z = Math.floor(Math.random() * _this.fieldsize) - _this.fieldsize/2;
    
    var y = 20 * 50;
    
    var voxel = new Array(4);
    // var cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, ambient: 0xfeb74c });
    for(var i=0; i<voxel.length; i++){
      voxel[i] = new THREE.Mesh( _this.cubeGeo, _this.cubeMaterial[block_num] );
    }
    // voxel.forEach(function(element, index, array){
    //  element = new THREE.Mesh( _this.cubeGeo, _this.cubeMaterial );
    // });
    switch(block_num){
      case 0:
        // voxel.forEach(function(element){ element.material.color.set("rgb(254, 183, 76)"); });
        voxel[0].position.set(x*50, y, z*50);
        voxel[1].position.set((x+1)*50, y, z*50);
        voxel[2].position.set((x+1)*50, y, (z+1)*50);
        voxel[3].position.set(x*50, y, (z+1)*50);
      break;
      case 1:
        // voxel.forEach(function(element){ element.material.color.set("rgb(251,122,111)"); });
        voxel[0].position.set(x*50, y, z*50);
        voxel[1].position.set(x*50, y+50, z*50);
        voxel[2].position.set(x*50, y+50*2, z*50);
        voxel[3].position.set(x*50, y+50*3, z*50);
      break;
      case 2:
        // voxel.forEach(function(element){ element.material.color.set("rgb(247,181,90)"); });
        voxel[0].position.set(x*50, y, z*50);
        voxel[1].position.set((x+1)*50, y, z*50);
        voxel[2].position.set((x+1)*50, y+50, z*50);
        voxel[3].position.set((x+2)*50, y+50, z*50);
      break;
      case 3:
        // voxel.forEach(function(element){ element.material.color.set("rgb(241,221,96)"); });
        voxel[0].position.set(x*50, y, z*50);
        voxel[1].position.set((x+1)*50, y, z*50);
        voxel[2].position.set((x+2)*50, y, z*50);
        voxel[3].position.set((x+1)*50, y+50, z*50);
      break;
      case 4:
        // voxel.forEach(function(element){ element.material.color.set("rgb(191,216,94)"); });
        voxel[0].position.set(x*50, y, z*50);
        voxel[1].position.set((x+1)*50, y, z*50);
        voxel[2].position.set((x+1)*50, y+50, z*50);
        voxel[3].position.set((x+1)*50, y+50*2, z*50);
      break;
      case 5:
        // voxel.forEach(function(element){ element.material.color.set("rgb(107,180,252)"); });
        voxel[0].position.set(x*50, y, z*50);
        voxel[1].position.set((x+1)*50, y, z*50);
        voxel[2].position.set((x+1)*50, y, (z+1)*50);
        voxel[3].position.set((x+1)*50, y+50, z*50);
      break;
      case 6:
        // voxel.forEach(function(element){ element.material.color.set("rgb(202,162,221)"); });
        voxel[0].position.set(x*50, y, z*50);
        voxel[1].position.set((x+1)*50, y, z*50);
        voxel[2].position.set((x+1)*50, y, (z+1)*50);
        voxel[3].position.set(x*50, y+50, z*50);
      break;
      case 7:
        // voxel.forEach(function(element){ element.material.color.set("rgb(182,182,182)"); });
        voxel[0].position.set(x*50, y, z*50);
        voxel[1].position.set((x+1)*50, y, z*50);
        voxel[2].position.set((x+1)*50, y, (z+1)*50);
        voxel[3].position.set((x+1)*50, y+50, (z+1)*50);
      break;
    }
    voxel.forEach(function(element, index, array){
      // element.material.ambient = element.material.color;
      element.position.addScalar( 25 );   // グリッドに合わせる。
      // voxels.push(element);
    });
    _this.blocks.push(voxel);
  };
  
  Tetris3d.prototype.detectCollision = function(index){   // 衝突判定 Collision Detection
    var _this = this;
    var block = _this.blocks[index];
    for(var i=0; i<block.length; i++){
      var vx = block[i].position.x,
        vy = block[i].position.y,
        vz = block[i].position.z;
      
      if( vy <= 25 ){   // 床
        return true;
      }else{
        for(var j=0; j<_this.blocks.length; j++){
          if( j != index ){   // 自分自身でなければ
            for(var k=0; k<_this.blocks[j].length; k++){
              if( vx == _this.blocks[j][k].position.x && (vy-50) == _this.blocks[j][k].position.y && vz == _this.blocks[j][k].position.z ){
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  };
  
  // 描画フレーム・フレーム制御 ----------------------------------------------------------------------------------------------------
  Tetris3d.prototype.animate = function() {
    var _this = this;
    
    var rendering = false;
    var processtime = window.performance.now() - _this.lastAnimTime;
    
    if( _this.blocks.length == 0 || _this.blocks[_this.blocks.length-1].stopped ){
      _this.createBlock();
    }
    
    // if( (isZdown || isXdown || isAdown || isSdown) && (processtime > 800) ){
    // if( isZdown || isXdown || isAdown || isSdown ){
    if( _this.isAnykeyDown ){
      rendering = true;
      _this.moveBlock();
    }
    
    // if( isCtrlDown || isShiftDown ){
    // if( isAnykeyDown ){
    //  _this.render();
    // }else 
    if( processtime > 800 ){
      _this.updateBlocks();
      // _this.render();
      rendering = true;
      _this.lastAnimTime = window.performance.now();
    }
    if( rendering ){
      _this.render();
    }
    
    // stats.update();
    
    requestAnimationFrame(function(){
     _this.animate();
    });
  };
  
  // 描画系 ----------------------------------------------------------------------------------------------------
  Tetris3d.prototype.render = function(){
    var _this = this;
    _this.framecount++;
    
    // if( _this.framecount % 5 == 0 ){
    // if( blocks.length == 0 || blocks[blocks.length-1].stopped ){
    //  _this.createBlock();
    // }
    
    // for(var i=0; i<voxels.length; i++){
    //  if( !voxels[i].stopped && voxels[i].position.y > 25 && !_this.detectCollision(voxels[i]) ){
    //      voxels[i].position.y -= 50;
    //      scene.add( voxels[i] );
    //  }else{
    //      voxels[i].stopped = true;
    //  }
    // }
    // for(var i=0; i<blocks.length; i++){
    //  if( !blocks[i].stopped ){
    //      // if( _this.detectCollision(blocks[i]) ){
    //      if( _this.detectCollision(i) ){
    //          blocks[i].stopped = true;
    //      }else{
    //          for(var j=0; j<blocks[i].length; j++){
    //              // if( blocks[i][j].position.y > 25 ){
    //                  blocks[i][j].position.y -= 50;
    //              // }
    //              scene.add( blocks[i][j] );
    //          }
    //      }
    //  }
    // }
    
    // voxels.forEach(function(element, index, array){
    // });
    
    
    if( _this.isCtrlDown ){
      // _this.theta += _this.mouse2D.x * 1.5;
      // _this.theta += 1.5;
      // camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( _this.theta ) );
      // camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( _this.theta ) );
    }
    if( _this.isShiftDown ){
      // thetaY += _this.mouse2D.y * 1.5;
      // thetaY += 1.5;
      // if(thetaY > 50){ thetaY = 50 }
      // else if(thetaY < -50){ thetaY = -50 }
      // camera.position.y = 1400 * Math.sin( THREE.Math.degToRad( thetaY ) );
      // camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( _this.theta ) ) - Math.abs(camera.position.y);
      // camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( _this.theta ) ) - Math.abs(camera.position.y);
    }
    if( _this.isUpDown ){
      _this.theta -= 1.5;
      if( _this.theta < 0.01 ){ _this.theta = 0.01; }
    }
    if( _this.isDownDown ){
      _this.theta += 1.5;
      if( _this.theta > 180 ){ _this.theta = 180; }
    }
    if( _this.isRightDown ){
      _this.phi += 1.5;
    }
    if( _this.isLeftDown ){
      _this.phi -= 1.5;
    }
    if( _this.is_Down ){
      _this.r += 10;
    }
    if( _this.is191Down ){
      _this.r -= 10;
    }
    
    if( _this.is1down ){   // z方向から
      _this.theta = 90;
      _this.phi = 0;
    }
    if( _this.is2down ){   // x方向から
      _this.theta = 90;
      _this.phi = 90;
    }
    if( _this.is3down ){   // y方向から
      _this.theta = 0.01;
      _this.phi = 0;
    }
    
    if( _this.ortho ){
      _this.camera = _this.orthocamera;
    }else{
      _this.camera = _this.perscamera;
    }
    
    _this.camera.position.z = _this.r * Math.sin(_this.theta /180 * Math.PI) * Math.cos(_this.phi /180 * Math.PI);
    _this.camera.position.x = _this.r * Math.sin(_this.theta /180 * Math.PI) * Math.sin(_this.phi /180 * Math.PI);
    _this.camera.position.y = _this.r * Math.cos(_this.theta /180 * Math.PI);
    // _this.camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( _this.theta ) );
    // _this.camera.position.y = 1400 * Math.tan( THREE.Math.degToRad( thetaY ) );
    // _this.camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( _this.theta ) );
    // _this.camera.position.set(0,100,-500);
    _this.camera.lookAt( _this.scene.position );
    _this.renderer.render( _this.scene, _this.camera );
  };  // ~ render
  
  
  
})(this, document);

