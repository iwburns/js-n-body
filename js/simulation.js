/*global THREE */

var APP  = APP || {};

APP.simulation = (function simulation(THREE) {
	'use strict';

	var make = function make(args) {

		args = args || {};
		
		if (!args.scene) {
			throw new Error('Simulation Error: No "scene" provided in make(), "scene" is required.');
		}

		var defaults = {
			timeMultiplier: 1000000,
			gravityMultiplier: 1,

			gridSize: 100,
			gridSpacing: 5,

			particleCount: 100,

			minParticleSize: 1,
			maxParticleSize: 1,

			minParticleMass: 1,
			maxParticleMass: 1,
			
			drawTrails: false,
			trailLength: 100,

			startingSpeed: 2,

			detectCollisions: false,

			softenGravity: true,
			softeningDistance: 5,

			seed: Date.now(),
			
			paused: false
		};

		var inputValidationSettings = {
			minGridSize: 10,
			maxGridSize: 10000,

			minParticleCount: 1,
			maxParticleCount: 1000,

			minTrailLength: 0,
			maxTrailLength: 1000
		};
		
		var state = {
			gravity: 6.673e-11,

			timeMultiplier: args.timeMultiplier || defaults.timeMultiplier,
			gravityMultiplier: args.gravityMultiplier || defaults.gravityMultiplier,

			gridSize: args.gridSize || defaults.gridSize,
			gridSpacing: args.gridSpacing || defaults.gridSpacing,

			particleCount: args.particleCount || defaults.particleCount,

			minParticleSize: args.minParticleSize || defaults.minParticleSize,
			maxParticleSize: args.maxParticleSize || defaults.maxParticleSize,

			minParticleMass: args.minParticleMass || defaults.minParticleMass,
			maxParticleMass: args.maxParticleMass || defaults.maxParticleMass,

			//drawTrails is checked below
			trailLength: args.trailLength || defaults.trailLength,

			softeningDistance: args.softeningDistance || defaults.softeningDistance,

			//startingSpeed is checked below

			seed: args.seed || defaults.seed,
			
			scene: args.scene // guaranteed to exist
		};

		//need special checks for booleans
		if (args.drawTrails === undefined) {
			state.drawTrails = defaults.drawTrails;
		} else {
			state.drawTrails = args.drawTrails;
		}
		if (args.softenGravity === undefined) {
			state.softenGravity = defaults.softenGravity;
		} else {
			state.softenGravity = args.softenGravity;
		}
		//startingSpeed isn't a boolean but 0 == false so we have to do a special check.
		if (args.startingSpeed === undefined) {
			state.startingSpeed = defaults.startingSpeed;
		} else {
			state.startingSpeed = args.startingSpeed;
		}
		if (args.detectCollisions === undefined) {
			state.detectCollisions = defaults.detectCollisions;
		} else {
			state.detectCollisions = args.detectCollisions;
		}
		if (args.paused === undefined) {
			state.paused = defaults.paused;
		} else {
			state.paused = args.paused;
		}

		//check for NaN values from textfield inputs
		if (state.minParticleSize !== state.minParticleSize) {
			state.minParticleSize = defaults.minParticleSize;
		}
		if (state.maxParticleSize !== state.maxParticleSize) {
			state.maxParticleSize = defaults.maxParticleSize;
		}
		if (state.minParticleMass !== state.minParticleMass) {
			state.minParticleMass = defaults.minParticleMass;
		}
		if (state.maxParticleMass !== state.maxParticleMass) {
			state.maxParticleMass = defaults.maxParticleMass;
		}
		if (state.startingSpeed !== state.startingSpeed) {
			state.startingSpeed = defaults.startingSpeed;
		}

		if (state.particleCount < 0) {
			state.particleCount = -state.particleCount;
		}
		if (state.trailLength < 0) {
			state.trailLength = -state.trailLength;
		}
		if (state.gridSize < 0) {
			state.gridSize = -state.gridSize;
		}
		if (state.minParticleSize < 0) {
			state.minParticleSize = -state.minParticleSize;
		}
		if (state.maxParticleSize < 0) {
			state.maxParticleSize = -state.maxParticleSize;
		}
		if (state.minParticleMass < 0) {
			state.minParticleMass = -state.minParticleMass;
		}
		if (state.maxParticleMass < 0) {
			state.maxParticleMass = -state.maxParticleMass;
		}
		if (state.startingSpeed < 0) {
			state.startingSpeed = -state.startingSpeed;
		}

		if (state.particleCount < inputValidationSettings.minParticleCount) {
			state.particleCount = inputValidationSettings.minParticleCount;
		} else if (state.particleCount > inputValidationSettings.maxParticleCount) {
			state.particleCount = inputValidationSettings.maxParticleCount;
		}
		if (state.trailLength < inputValidationSettings.minTrailLength) {
			state.trailLength = inputValidationSettings.minTrailLength;
		} else if (state.trailLength > inputValidationSettings.maxTrailLength) {
			state.trailLength = inputValidationSettings.maxTrailLength;
		}
		if (state.gridSize < inputValidationSettings.minGridSize) {
			state.gridSize = inputValidationSettings.minGridSize;
		}
		if (state.minParticleSize > state.maxParticleSize) {
			state.maxParticleSize = state.minParticleSize;
		}
		if (state.minParticleMass > state.maxParticleMass) {
			state.maxParticleMass = state.minParticleMass;
		}

		state.useComputeRenderer = true;
		
		//this will be used for color calculations, there is probably a better way.
		state.roughTotalMass = ( state.particleCount * (state.minParticleMass + state.maxParticleMass) / 2);

		// ideally this will be used to set input values to their validated values
		args.afterValidation(state);

		var init = function init() {

			var positions = new Float32Array(state.particleCount * 3);
			var colors = new Float32Array(state.particleCount * 3);

			var x;
			var y;
			var z;

			var getRandom = new Math.seedrandom(state.seed);
			var maxAbsRange = state.gridSize;
			//var radiusRange = state.maxParticleSize - state.minParticleSize;
			var massRange = state.maxParticleMass - state.minParticleMass;
			var randomSizeMass;
			var mass;
			var color;
			
			for (var i = 0; i < positions.length; i += 3) {
					
				x = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				y = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				z = (getRandom() * maxAbsRange * 2) - maxAbsRange;

				randomSizeMass = getRandom();
				mass   = (randomSizeMass * massRange) + state.minParticleMass;
				color = calculateColor(mass);

				positions[i    ] = i;
				positions[i + 1] = i;
				positions[i + 2] = i;

				colors[i    ] = color.r;
				colors[i + 1] = color.g;
				colors[i + 2] = color.b;
			}

			var geometry = new THREE.BufferGeometry();
			var material = new THREE.ShaderMaterial(getShaderConfig());
			
			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
			geometry.dynamic = true;

			state.pointCloud = new THREE.Points(geometry, material);
			state.scene.add(state.pointCloud);

			console.log(state.pointCloud);
		};

		var getShaderConfig = function getShaderConfig() {

			var config = {};

			config.vertexShader = [
				'',
				'',
				'void main()',
				'{',
				'   gl_PointSize = 10.0;',
				'	gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);',
				'',
				'}'
			].join('\n');

			config.vertexColors = THREE.VertexColors;

			config.fragmentShader = [
				'',
				'',
				'void main()',
				'{',
				'	gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);',
				'',
				'}'
			].join('\n');

			return config;
		};

		var pause = function pause() {
			state.paused = true;
		};

		var play = function play() {
			state.paused = false;
		};
		
		var togglePausePlay = function togglePausePlay() {
			state.paused = !state.paused;	
		};

		var getState = function getState() {
			return state;
		};

		var update = function update(timeDelta, afterUpdate) {
			
			var simulationDelta;
			var startingLength;
			var endingLength;

			if (!state.paused) {
				
				// simulationDelta = timeDelta * state.timeMultiplier;
				
				//startingLength = state.bodyArray.length;
				

				updateWithComputeRenderer();


				//updatePositions(simulationDelta);
				
				//endingLength = state.bodyArray.length;
				
				// var data = {
				// 	simulationDelta: simulationDelta,
				// 	particleCountChanged: startingLength !== endingLength,
				// 	currentNumParticles: endingLength
				// };
				
				// afterUpdate(data);
			}

		};
		
		var updateWithComputeRenderer = function updateWithComputeRenderer() {
			state.pointCloud.geometry.getAttribute('position').needsUpdate = true;
		};

		var updatePositions = function updatePositions(delta) {

			var bodyArray = state.bodyArray;
			var body;
			var bodyState;
			var arrayLen = bodyArray.length;

			if (state.useComputeRenderer) {

				var x, y, z;
				var pointCloud = state.pointCloud;

				var positions = pointCloud.geometry.getAttribute('position');
				var position;

				for (var i = 0; i < arrayLen; i++) {

					body = bodyArray[i];
					bodyState = body.getState();

					x = positions.array[i * positions.itemSize    ];
					y = positions.array[i * positions.itemSize + 1];
					z = positions.array[i * positions.itemSize + 2];

					position = new THREE.Vector3(x, y, z);

					bodyState.position = position;
					bodyState.mesh.position.set(position.x, position.y, position.z);
				}

				return;
			}

			var i;
			//we can't use a fixed array here because we don't know how many bodies will be removed.
			var newBodyArray = [];
			
			//miliseconds to seconds
			delta /= 1000;

			for (i = 0; i < arrayLen; ++i) {
				body = bodyArray[i];
				bodyState = body.getState();
				
				if (bodyState.mass === 0) {
					state.scene.remove(bodyState.mesh);
					
					if (bodyState.drawTrails) {
						state.scene.remove(bodyState.trail);
					}
					continue;
				}
				
				newBodyArray.push(body);
				
				if (bodyState.isLocked) {
					continue;
				}
				
				if (bodyState.radiusChanged) {
					bodyState.radiusChanged = false;
					
					state.scene.remove(bodyState.mesh);
					
					var bodyDefaults = body.getDefaults();
					
					var geometry = new THREE.SphereGeometry(bodyState.radius, bodyDefaults.widthSegements, bodyDefaults.heightSegments);
					var material = body.getDefaults().material;
			
					material.color = calculateColor(bodyState.mass);
					
					bodyState.mesh = new THREE.Mesh(geometry, material);
					
					state.scene.add(bodyState.mesh);
					
					bodyState.mesh.translateX(bodyState.position.x);
					bodyState.mesh.translateY(bodyState.position.y);
					bodyState.mesh.translateZ(bodyState.position.z);
				}
				
				var accelerationVector = bodyState.thisFrameAcceleration;
			
				// d = v1*t + (1/2)*a*(t^2)
				var velocityTime = cloneVector(bodyState.velocity).multiplyScalar(delta);
				var positionDelta = velocityTime.add(cloneVector(accelerationVector).multiplyScalar(0.5 * delta * delta));
	
				var velocityDelta = accelerationVector.multiplyScalar(delta);
				
				bodyState.position.add(positionDelta);
				bodyState.velocity.add(velocityDelta);
				
				bodyState.mesh.translateX(positionDelta.x);
				bodyState.mesh.translateY(positionDelta.y);
				bodyState.mesh.translateZ(positionDelta.z);
				
				if (bodyState.drawTrails) {
					var vertices = bodyState.trail.geometry.vertices;
					vertices.pop();
					vertices.unshift(cloneVector(bodyState.position));
					bodyState.trail.geometry.verticesNeedUpdate = true;
				}
				
				bodyState.thisFrameAcceleration = new THREE.Vector3();
			}
			
			
			state.bodyArray = newBodyArray;
		};

		var cloneVector = function cloneVector(v) {
			return new THREE.Vector3(v.x, v.y, v.z);
		};
		
		var calculateColor = function calculateColor(mass) {
			var rgb = 0.75 - (mass / state.roughTotalMass);
			if (rgb > 1) {
				rgb = 1;
			}
			return new THREE.Color(rgb, rgb, rgb);
		};

		return {
			init: init,
			play: play,
			pause: pause,
			togglePausePlay: togglePausePlay,
			getState: getState,
			update: update
		};

	};

	return {
		make: make
	};
}(THREE));