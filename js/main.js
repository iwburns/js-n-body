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
		farPlane = 1000, 
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
			renderer.setClearColor(0xFFFFFF, 1);
			
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
					inputParams.stop().animate({height: "400px"}, 750);
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
				config.numParticles = parseInt($("#numParticles").val());
				config.trailLength = parseInt($("#trailLength").val());
				config.minSize = parseFloat($("#minSize").val());
				config.maxSize = parseFloat($("#maxSize").val());
				config.minMass = parseFloat($("#minMass").val());
				config.maxMass = parseFloat($("#maxMass").val());
				config.startingVelocity = parseFloat($("#startingVelocity").val());
				config.gridSize = parseInt($("#gridSize").val());
				config.drawLines = ($("input:radio[name=showTrails]:checked").val() === "true");
				config.seed = parseInt($("#seed").val());
				config.timeMultiplier = parseInt($("#timeMultiplier").val());
	
				removeAllBodies();
				initSimulation(config);
			});
	
			$("button#pausePlayToggle").click(function() {
				togglePausePlay();
			});
		}
		
		function initSimulation(config) {
			
			currentSimulationTimeMillis = 0;
			
			scene = new THREE.Scene();
			
			config.afterValidation = function afterValidation(state) {
				//todo: set html values here.
			};
			
			simulation = APP.simulation.make(config);
			
			var simState = simulation.getState();
			
			cameraRig = new THREE.Object3D();
			scene.add(cameraRig);
			
			camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, nearPlane, farPlane);
			cameraRig.add(camera);
			
			cameraOffset = new THREE.Vector3();
			
			cameraRig.position.set(0, simState.gridSize, simState.gridSize);
			camera.rotation.x -= Math.PI/4;
			
			lastFrameTime = Date.now();
		}
		
		function run() {
			//run the simulation
		}
		
		function togglePausePlay() {
			simulation.togglePausePlay();
		}
		
		function removeAllBodies() {
			console.log('remove all bodies (nothing right now)');
			//todo: we shouldn't need this...
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
	
}(THREE, Stats, jQuery));