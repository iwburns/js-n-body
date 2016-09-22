/*global _, jQuery, THREE, Stats, console, window, document */

var APP = APP || {};

APP.main = (function main(THREE, Stats, $){
	'use strict';
	
	var stats,
		showStats = true,
		
		stereoEffect,
		useStereoEffect = false,
		
		scene,
		renderer,
		
		camera,
		cameraRig,
		cameraOffset,
		
		mousedown,
		lastMousePos = { x: 0, y: 0 },
		currentMousePos = { x: 0, y: 0 },
		keydown = [],
		
		nearPlane = 0.1,
		farPlane = 1e6,
		motionMultiplier,
		
		gridHelper,
		gridHelperExists = false,
		
		now,
		lastFrameTime,
		timeDelta,
		currentSimulationTimeMillis = 0,
		
		simulation;
		
		function init() {
			
			renderer = new THREE.WebGLRenderer({
				antialias: true,
				alpha: true,
				logarithmicDepthBuffer: true
			});
			
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setClearColor(0x000000, 1);
			
			document.body.appendChild(renderer.domElement);
			
			if (useStereoEffect) {
				stereoEffect = new THREE.StereoEffect(renderer);
				stereoEffect.eyeSeparation = 1; // no idea what this value needs to be.
				stereoEffect.setSize(window.innerHeight, window.innerWidth);
			}
			
			if (showStats) {
				stats = new Stats();
				stats.domElement.style.position = 'absolute';
				stats.domElement.style.left = '0px';
				stats.domElement.style.top = '0px';
				document.body.appendChild( stats.domElement );
			}
			
			initControls();
			initSimulation();
			run();	
		}
		
		function initControls() {
			$(window).on("resize", function () {
				updateWindowSize();
			});
			$(window).on("mousedown", function(event) {
				currentMousePos = { x: event.clientX, y: event.clientY };
				lastMousePos = currentMousePos;
				mousedown = true;
			});
			$(window).on("mouseup mouseleave mouseenter", function() {
				mousedown = false;
			});
			$(window).on("mousemove", function (event) {
				if (mousedown) {
					currentMousePos = { x: event.clientX, y: event.clientY };
				}
			});
	
			$(window).on("keydown", function (event) {
				keydown[event.keyCode] = true;
			});
	
			$(window).on("keyup", function (event) {
				keydown[event.keyCode] = false;
			});
	
			$(window).on("contextmenu", function() {
				return false;
			});
	
			$("#showHideSettings").on("click", function() {
				var inputParams = $("#inputParams");
				if (inputParams.hasClass("open")) {
					inputParams.removeClass("open");
					inputParams.stop().animate({height: "20px"}, 750);
				} else {
					inputParams.addClass("open");
					inputParams.stop().animate({height: "410px"}, 750);
				}
			});
	
			$("#showHideControls").on("click", function() {
				var controls = $("#controls");
				if (controls.hasClass("open")) {
					controls.removeClass("open");
					controls.stop().animate({height: "20px"}, 750);
				} else {
					controls.addClass("open");
					controls.stop().animate({height: "195px"}, 750);
				}
			});
	
			$("button#restartButton").click(function() {
				var config = {};
				
				config.particleCount = parseInt($("#numParticles").val());
				config.trailLength = parseInt($("#trailLength").val());
				config.minParticleSize = parseFloat($("#minSize").val());
				config.maxParticleSize = parseFloat($("#maxSize").val());
				config.minParticleMass = parseFloat($("#minMass").val());
				config.maxParticleMass = parseFloat($("#maxMass").val());
				config.startingSpeed = parseFloat($("#startingSpeed").val());
				config.gridSize = parseInt($("#gridSize").val());
				config.drawTrails = ($("input:radio[name=drawTrails]:checked").val() === "true");
				config.detectCollisions = ($("input:radio[name=detectCollisions]:checked").val() === "true");
				config.seed = parseInt($("#seed").val());
				config.timeMultiplier = parseInt($("#timeMultiplier").val());
				
				initSimulation(config);
			});
	
			$("button#pausePlayToggle").click(function() {
				togglePausePlay();
			});
		}
		
		function initSimulation(config) {
			
			config = config || {};
			
			currentSimulationTimeMillis = 0;

			scene = new THREE.Scene();

			cameraRig = new THREE.Object3D();
			scene.add(cameraRig);
			
			camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, nearPlane, farPlane);
			cameraRig.add(camera);
			
			config.scene = scene;
			config.camera = camera;
			
			config.afterValidation = function afterValidation(state) {
				$("#numParticles").val(state.particleCount);
				$("#trailLength").val(state.trailLength);
				$("#minSize").val(state.minParticleSize);
				$("#maxSize").val(state.maxParticleSize);
				$("#minMass").val(state.minParticleMass);
				$("#maxMass").val(state.maxParticleMass);
				$("#startingSpeed").val(state.startingSpeed);
				$("#gridSize").val(state.gridSize);
				$("#timeMultiplier").val(state.timeMultiplier);
				$("#currentSeed").html(state.seed);
				$("#currentNumParticles").html(state.particleCount);
			};
			
			simulation = APP.simulation.make(config);
			simulation.init();
			
			var simState = simulation.getState();

			cameraOffset = new THREE.Vector3();
			
			cameraRig.position.set(0, simState.gridSize, simState.gridSize);
			camera.rotation.x -= Math.PI/4;
			
			motionMultiplier = 0.0005 * simState.gridSize;
			
			lastFrameTime = Date.now();
		}
		
		function run() {
			now = Date.now();
			timeDelta = now - lastFrameTime;
			lastFrameTime = now;
			
			update(timeDelta);
			render();
			
			if (showStats) {
				stats.update();
			}
			
			window.requestAnimationFrame(run);
		}
		
		function update(timeDelta) {
			
			simulation.update(timeDelta, function (data) {
				
				updateSimulationTime(data.simulationDelta);
				if (data.particleCountChanged) {
					$("#currentNumParticles").html(data.currentNumParticles);
				}
				
			});
			
			updateCamera(timeDelta);
		}
		
		function updateCamera(timeDelta) {
			updateCameraRotation(timeDelta);
			updateCameraRigPosition(timeDelta);
			
			cameraRig.position.add(cameraOffset);
			cameraOffset = new THREE.Vector3();
		}
		
		function render() {
			if (useStereoEffect) {
				stereoEffect.render(scene, camera);
			} else {
				renderer.render(scene, camera);
			}
		}
		
		function updateCameraRotation(timeDelta) {
			var rotationFactor = 0.00008 * timeDelta;

			var deltaX = currentMousePos.x - lastMousePos.x;
			var deltaY = currentMousePos.y - lastMousePos.y;
	
			cameraRig.rotation.y -= deltaX * rotationFactor;
			camera.rotation.x -= deltaY * rotationFactor;
	
			lastMousePos = currentMousePos;
		}
		
		function updateCameraRigPosition(timeDelta) {
			var motionFactor;

			var motion = new THREE.Vector3();
			var moved = false;
	
			if (keydown["W".charCodeAt(0)]) {
				motion.z -= 1;
				moved = true;
			}
			if (keydown["S".charCodeAt(0)]) {
				motion.z += 1;
				moved = true;
			}
			if (keydown["A".charCodeAt(0)]) {
				motion.x -= 1;
				moved = true;
			}
			if (keydown["D".charCodeAt(0)]) {
				motion.x += 1;
				moved = true;
			}
			if (keydown[32]) { //space
				motion.y += 1;
				moved = true;
			}
			if (keydown[16]) { //shift
				motion.y -= 1;
				moved = true;
			}
			
			if (keydown["G".charCodeAt(0)]) {
				if (!gridHelperExists) {
					gridHelperExists = true;
					gridHelper = createGrid();
					scene.add(gridHelper);
				} else {
					gridHelperExists = false;
					scene.remove(gridHelper);
				}
				keydown["G".charCodeAt(0)] = false;
			}
			if (keydown["P".charCodeAt(0)]) {
				togglePausePlay();
				keydown["P".charCodeAt(0)] = false;
			}
			if (keydown["R".charCodeAt(0)]) {
				$("button#restartButton").click();
				keydown["R".charCodeAt(0)] = false;
			}
	
			if (moved) {
				motionFactor = motionMultiplier * timeDelta;
				motion.normalize().multiplyScalar(motionFactor);
				
				cameraOffset.add(camera.localToWorld(motion).sub(cameraRig.position));
			}
		}
		
		function togglePausePlay() {
			simulation.togglePausePlay();
		}
		
		function updateWindowSize() {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			if (useStereoEffect) {
				stereoEffect.setSize(window.innerWidth, window.innerHeight);
			} else {
				renderer.setSize(window.innerWidth, window.innerHeight);
			}
		}
		
		function updateSimulationTime(simulationDelta) {
			currentSimulationTimeMillis += simulationDelta;
			
			var seconds = Math.floor(currentSimulationTimeMillis / 1000);
			var minutes = Math.floor(seconds / 60);
			var hours = Math.floor(minutes / 60);
			var days = Math.floor(hours / 24);
			var years = Math.floor(days / 365);
	
			minutes %= 60;
			hours %= 24;
			days %= 365;
	
			if (days < 10) {
				days = '00' + days;
			} else if (days < 100) {
				days = '0' + days;
			}
			if (hours < 10) {
				hours = '0' + hours;
			}
			if (minutes < 10) {
				minutes = '0' + minutes;
			}
	
			var simulationTime = years + '|' + days + '|' + hours + '|' + minutes;
	
			$("#simulationTime").html(simulationTime);
		}
		
		function createGrid() {
			var simState = simulation.getState();
			var grid = new THREE.GridHelper( simState.gridSize, simState.gridSize / simState.gridSpacing );
			grid.frustumCulled = false;
			return grid;
		}
		
		return {
			init: init
		};
}(THREE, Stats, jQuery));