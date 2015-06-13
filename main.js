window.onload = function(){
	main();
	// var main = new Main();
	// main.init();
	// main.animate();
};

// var Main = function(){
function main(){
// (function(){
	
	// 変数宣言 ----------------------------------------------------------------------------------------------------
	var container, stats, camera, scene, renderer, projector, plane, cube, mouse2D;
		// mouse3D, raycaster,
		// rollOveredFace,
		// theta = 45 * 0.5,
		// thetaY = 30,
	// var rollOverMesh, rollOverMaterial;
	// var voxelPosition = new THREE.Vector3(), tmpVec = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
	var cubeGeo, cubeMaterial = [];
	// var i, intersector;
	// var objects = [];
	
	var isAnykeyDown
	 = isRightDown = isLeftDown = isUpDown = isDownDown
	 = is59Down = isStarDown = isPlusDown = is190Down = is191Down = is_Down
	 = isShiftDown = isCtrlDown
	 = isZdown = isXdown
	 = isAdown = isSdown = isDdown = isQdown = isWdown = isEdown
	 = is0down = is1down = is2down = is3down
	 = false;
	
	// var isKeyDown = [
	//  "right", "left", "up", "down",
	//  "59", "star", "plus", "190", "191", "_",
	//  "shift", "ctrl",
	//  "z", "x",
	//  "a", "s", "d", "q", "w", "e",
	//  "0", "1", "2", "3"
	// ];
	
	var orthocamera,
		ortho = false;
	
	var width = window.innerWidth, height = window.innerHeight;
	
	var lastAnimTime = 0,
		framecount = 0,
		voxels = [],
		blocks = [];
	
	// 球座標
	var r = 1400,
		theta = 60,
		phi = 0;
	
	var fieldsize = 10;
	
	
	// 初期化 ----------------------------------------------------------------------------------------------------
	// this.init = function(){
	(function init() {
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		
		// var info = document.createElement( 'div' );
		// info.style.position = 'absolute';
		// info.style.top = '10px';
		// info.style.width = '100%';
		// info.style.textAlign = 'center';
		// info.innerHTML = '<a href="http://threejs.org" target="_blank">three.js</a> - voxel painter - webgl<br><strong>click</strong>: add voxel, <strong>shift + click</strong>: remove voxel, <strong>control</strong>: rotate';
		// container.appendChild( info );
		
		perscamera = new THREE.PerspectiveCamera( 45, width / height, 1, 10000 );
		// orthocamera = new THREE.OrthographicCamera( - width / 2, width / 2, height / 2, - height / 2, 1, 10000 );
		orthocamera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 10000 );
		// orthocamera = new THREE.OrthographicCamera( - 600, 600, 600, - 600, 1, 10000 );
		// combinedcamera = new THREE.CombinedCamera( width, height, 45, 1, 10000, 1, 10000 );
		camera = perscamera;
		camera.position.y = 800;
		
		scene = new THREE.Scene();
		
		// // roll-over helpers
		// rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
		// rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
		// rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
		// scene.add( rollOverMesh );
		
		// cubes
		cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
		// cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, ambient: 0x00ff80, shading: THREE.FlatShading, map: THREE.ImageUtils.loadTexture( "textures/square-outline-textured.png" ) } );
		// cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, ambient: 0x00ff80, shading: THREE.FlatShading } );
		// cubeMaterial.ambient = cubeMaterial.color;
		// cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, shading: THREE.FlatShading } );
		// cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, ambient: 0xfeb74c });
		cubeMaterial[0] = new THREE.MeshLambertMaterial({ color: "rgb(254, 183, 76)", ambient: "rgb(254, 183, 76)" });
		cubeMaterial[1] = new THREE.MeshLambertMaterial({ color: "rgb(251,122,111)", ambient: "rgb(251,122,111)" });
		cubeMaterial[2] = new THREE.MeshLambertMaterial({ color: "rgb(247,181,90)", ambient: "rgb(247,181,90)" });
		cubeMaterial[3] = new THREE.MeshLambertMaterial({ color: "rgb(241,221,96)", ambient: "rgb(241,221,96)" });
		cubeMaterial[4] = new THREE.MeshLambertMaterial({ color: "rgb(191,216,94)", ambient: "rgb(191,216,94)" });
		cubeMaterial[5] = new THREE.MeshLambertMaterial({ color: "rgb(107,180,252)", ambient: "rgb(107,180,252)" });
		cubeMaterial[6] = new THREE.MeshLambertMaterial({ color: "rgb(202,162,221)", ambient: "rgb(202,162,221)" });
		cubeMaterial[7] = new THREE.MeshLambertMaterial({ color: "rgb(100,198,173)", ambient: "rgb(100,198,173)" });
		// cubeMaterial.ambient = cubeMaterial.color;
		
		
		// picking
		projector = new THREE.Projector();
		
		// grid
		var size = fieldsize/2 * 50, step = 50;
		var geometry = new THREE.Geometry();
		for ( var i = - size; i <= size; i += step ) {
			geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
			geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );
			geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
			geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );
		}
		var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );
		var line = new THREE.Line( geometry, material );
		line.type = THREE.LinePieces;
		scene.add( line );
		
		plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() );
		plane.rotation.x = - Math.PI / 2;
		plane.visible = false;
		scene.add( plane );
		// objects.push( plane );
		
		mouse2D = new THREE.Vector3( 0, 10000, 0.5 );
		
		// Lights
		var ambientLight = new THREE.AmbientLight( 0x606060 );
		scene.add( ambientLight );
		var directionalLight = new THREE.DirectionalLight( 0xffffff );
		// directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
		directionalLight.position.set( 0.5, 0.75, 1 ).normalize();
		scene.add( directionalLight );
		
		renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setClearColor( 0xf0f0f0 );
		renderer.setSize( width, height );
		container.appendChild( renderer.domElement );
		
		// stats = new Stats();
		// stats.domElement.style.position = 'absolute';
		// stats.domElement.style.top = '0px';
		// container.appendChild( stats.domElement );
		
		document.addEventListener( 'mousemove', onDocumentMouseMove, false );
		// document.addEventListener( 'mousedown', onDocumentMouseDown, false );
		document.addEventListener( 'keydown', onDocumentKeyDown, false );
		document.addEventListener( 'keyup', onDocumentKeyUp, false );
		
		window.addEventListener( 'resize', onWindowResize, false );
		
		animate();
		
	})();   // ~ init
	
	
	// ブロック制御系 ----------------------------------------------------------------------------------------------------
	var lastMoveTime = 0;
	function moveBlock(){
		
		var processtime = window.performance.now() - lastMoveTime;
		if(processtime > 500){
			var n = blocks.length-1;
			if( !blocks[n].stopped ){
				if( detectCollision(n) ){
					blocks[n].stopped = true;
				}else{
					for(var j=0; j<blocks[n].length; j++){
						
						if( isSdown ){ blocks[n][j].position.z += 50; }
						if( isDdown ){ blocks[n][j].position.x += 50; }
						if( isWdown ){ blocks[n][j].position.z -= 50; }
						if( isAdown ){ blocks[n][j].position.x -= 50; }
						
						scene.add( blocks[n][j] );
					}
					lastMoveTime = window.performance.now();
				}
			}
		}
	}
	
	function updateBlocks(){
		
		var n = blocks.length-1;
		if( !blocks[n].stopped ){
			if( detectCollision(n) ){
				blocks[n].stopped = true;
			}else{
				for(var j=0; j<blocks[n].length; j++){
					blocks[n][j].position.y -= 50;
					scene.add( blocks[n][j] );
				}
			}
		}
	}
	
	function createBlock(){
		// var block_num = 7;
		var block_num = Math.floor(Math.random() * 7) + 1;
		// var x = Math.floor(Math.random() * 20) - 10;   // -10~9の整数の乱数
		var x = Math.floor(Math.random() * fieldsize) - fieldsize/2;
		var z = Math.floor(Math.random() * fieldsize) - fieldsize/2;
		
		var y = 20 * 50;
		
		var voxel = new Array(4);
		// var cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, ambient: 0xfeb74c });
		for(var i=0; i<voxel.length; i++){
			voxel[i] = new THREE.Mesh( cubeGeo, cubeMaterial[block_num] );
		}
		// voxel.forEach(function(element, index, array){
		//  element = new THREE.Mesh( cubeGeo, cubeMaterial );
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
		blocks.push(voxel);
	}
	
	function detectCollision(index){   // 衝突判定 Collision Detection
		var block = blocks[index];
		for(var i=0; i<block.length; i++){
			var vx = block[i].position.x,
				vy = block[i].position.y,
				vz = block[i].position.z;
			
			if( vy <= 25 ){   // 床
				return true;
			}else{
				for(var j=0; j<blocks.length; j++){
					if( j != index ){   // 自分自身でなければ
						for(var k=0; k<blocks[j].length; k++){
							if( vx == blocks[j][k].position.x && (vy-50) == blocks[j][k].position.y && vz == blocks[j][k].position.z ){
								return true;
							}
						}
					}
				}
			}
		}
		return false;
	}
	
	
	// 描画フレーム・フレーム制御 ----------------------------------------------------------------------------------------------------
	// this.animate = function(){
	function animate() {
		requestAnimationFrame( animate );
		
		var rendering = false;
		var processtime = window.performance.now() - lastAnimTime;
		
		if( blocks.length == 0 || blocks[blocks.length-1].stopped ){
			createBlock();
		}
		
		// if( (isZdown || isXdown || isAdown || isSdown) && (processtime > 800) ){
		// if( isZdown || isXdown || isAdown || isSdown ){
		if( isAnykeyDown ){
			rendering = true;
			moveBlock();
		}
		
		// if( isCtrlDown || isShiftDown ){
		// if( isAnykeyDown ){
		//  render();
		// }else 
		if( processtime > 800 ){
			updateBlocks();
			// render();
			rendering = true;
			lastAnimTime = window.performance.now();
		}
		if( rendering ){
			render();
		}
		
		// stats.update();
	};
	
	
	// 描画系 ----------------------------------------------------------------------------------------------------
	function render(){
		framecount++;
		
		// if( framecount % 5 == 0 ){
		// if( blocks.length == 0 || blocks[blocks.length-1].stopped ){
		//  createBlock();
		// }
		
		// for(var i=0; i<voxels.length; i++){
		//  if( !voxels[i].stopped && voxels[i].position.y > 25 && !detectCollision(voxels[i]) ){
		//      voxels[i].position.y -= 50;
		//      scene.add( voxels[i] );
		//  }else{
		//      voxels[i].stopped = true;
		//  }
		// }
		// for(var i=0; i<blocks.length; i++){
		//  if( !blocks[i].stopped ){
		//      // if( detectCollision(blocks[i]) ){
		//      if( detectCollision(i) ){
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
		
		
		if( isCtrlDown ){
			// theta += mouse2D.x * 1.5;
			// theta += 1.5;
			// camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( theta ) );
			// camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( theta ) );
		}
		if( isShiftDown ){
			// thetaY += mouse2D.y * 1.5;
			// thetaY += 1.5;
			// if(thetaY > 50){ thetaY = 50 }
			// else if(thetaY < -50){ thetaY = -50 }
			// camera.position.y = 1400 * Math.sin( THREE.Math.degToRad( thetaY ) );
			// camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( theta ) ) - Math.abs(camera.position.y);
			// camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( theta ) ) - Math.abs(camera.position.y);
		}
		if( isUpDown ){
			theta -= 1.5;
			if( theta < 0.01 ){ theta = 0.01; }
		}
		if( isDownDown ){
			theta += 1.5;
			if( theta > 180 ){ theta = 180; }
		}
		if( isRightDown ){
			phi += 1.5;
		}
		if( isLeftDown ){
			phi -= 1.5;
		}
		if( is_Down ){
			r += 10;
		}
		if( is191Down ){
			r -= 10;
		}
		
		if( is1down ){   // z方向から
			theta = 90;
			phi = 0;
		}
		if( is2down ){   // x方向から
			theta = 90;
			phi = 90;
		}
		if( is3down ){   // y方向から
			theta = 0.01;
			phi = 0;
		}
		
		if( ortho ){
			camera = orthocamera;
		}else{
			camera = perscamera;
		}
		
		camera.position.z = r * Math.sin(theta /180 * Math.PI) * Math.cos(phi /180 * Math.PI);
		camera.position.x = r * Math.sin(theta /180 * Math.PI) * Math.sin(phi /180 * Math.PI);
		camera.position.y = r * Math.cos(theta /180 * Math.PI);
		// camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( theta ) );
		// camera.position.y = 1400 * Math.tan( THREE.Math.degToRad( thetaY ) );
		// camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( theta ) );
		camera.lookAt( scene.position );
		renderer.render( scene, camera );
	}  // ~ render
	
	
	// ユーザ制御系・操作系・描画制御系 ----------------------------------------------------------------------------------------------------
	function onWindowResize() {
		width = window.innerWidth;
		height = window.innerHeight;
		// camera.aspect = width / height;
		perscamera.aspect = width / height;
		// if( width > 600 ){
		//  orthocamera.left = -width;
		//  orthocamera.right = width;
		// }else{
		//  orthocamera.left = -600;
		//  orthocamera.right = 600;
		// }
		// if( height > 600 ){
		//  orthocamera.top = height;
		//  orthocamera.bottom = -height;
		// }else{
		//  orthocamera.top = 600;
		//  orthocamera.bottom = -600;
		// }
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
	}
	function onDocumentMouseMove( event ) {
		event.preventDefault();
		mouse2D.x = ( event.clientX / width ) * 2 - 1;
		mouse2D.y = - ( event.clientY / height ) * 2 + 1;
	}
	
	function onDocumentKeyDown( event ) {
		event.preventDefault();
		isAnykeyDown = true;
		switch( event.keyCode ) {
			case 16: isShiftDown = true; break;
			case 17: isCtrlDown = true; break;
			
			case 90: isZdown = true; break;
			case 88: isXdown = true; break;
			case 65: isAdown = true; break;
			case 83: isSdown = true; break;
			case 68: isDdown = true; break;
			case 81: isQdown = true; break;
			case 87: isWdown = true; break;
			case 69: isEdown = true; break;
			
			case 37: isLeftDown = true; ortho = false; break;
			case 38: isUpDown = true; ortho = false; break;
			case 39: isRightDown = true; ortho = false; break;
			case 40: isDownDown = true; ortho = false; break;
			
			case 59: is59Down = true; break;   // ]
			case 58: isStarDown = true; break;   // *
			case 221: isPlusDown = true; break;   // +
			
			case 190: is190Down = true; break;   // >
			
			case 191: is191Down = true; break;   // ?
			case 167: is_Down = true; break;   // _
			
			case 48:   // 0
				is0down = true;
				if( ortho ){ ortho = false; }
				else{ ortho = true; }
			break;
			case 49: is1down = true; ortho = true; break;
			case 50: is2down = true; ortho = true; break;
			case 51: is3down = true; ortho = true; break;
		}
	}
	function onDocumentKeyUp( event ) {
		isAnykeyDown = false;
		switch ( event.keyCode ) {
			case 16: isShiftDown = false; break;
			case 17: isCtrlDown = false; break;
			case 90: isZdown = false; break;
			case 88: isXdown = false; break;
			case 65: isAdown = false; break;
			case 83: isSdown = false; break;
			case 68: isDdown = false; break;
			case 81: isQdown = false; break;
			case 87: isWdown = false; break;
			case 69: isEdown = false; break;
			case 37: isLeftDown = false; break;
			case 38: isUpDown = false; break;
			case 39: isRightDown = false; break;
			case 40: isDownDown = false; break;
			case 59: is59Down = false; break;
			case 58: isStarDown = false; break;
			case 221: isPlusDown = false; break;
			case 190: is190Down = false; break;
			case 191: is191Down = false; break;
			case 167: is_Down = false; break;
			case 48: is0down = false; break;
			case 49: is1down = false; break;
			case 50: is2down = false; break;
			case 51: is3down = false; break;
		}
	}
	
	
	// axis helper -----
	var axis = new THREE.AxisHelper(1000);
	axis.position.set(0,0,0);
	scene.add(axis);
	
// })();
};
