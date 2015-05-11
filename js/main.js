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
		
		simulation;
		
		function init() {
			
			scene = new THREE.Scene();
			
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
			//controls
		}
		
		function initSimulation() {
			simulation = APP.simulation.make({
				//settings
			});
			
		}
		
		function run() {
			//run the simulation
		}
		
		
	
}(THREE, Stats, jQuery));