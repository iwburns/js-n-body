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

			particleCount: 800,

			minParticleSize: 1,
			maxParticleSize: 1,

			minParticleMass: 1,
			maxParticleMass: 1,
			
			drawTrails: false,
			trailLength: 100,

			startingSpeed: 0,

			detectCollisions: false,

			softenGravity: true,
			softeningDistance: 10,

			seed: Date.now(),
			
			paused: false
		};

		var inputValidationSettings = {
			minGridSize: 10,
			maxGridSize: 10000,

			minParticleCount: 1,
			maxParticleCount: 1000000,

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

			state.positions = new Float32Array(state.particleCount * 3);
			state.velocities = new Float32Array(state.particleCount * 3);
			state.accelerations = new Float32Array(state.particleCount * 3);
			state.masses = new Float32Array(state.particleCount);

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
			
			for (var i = 0; i < state.particleCount; ++i) {
					
				x = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				y = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				z = (getRandom() * maxAbsRange * 2) - maxAbsRange;

				randomSizeMass = getRandom();
				mass   = (randomSizeMass * massRange) + state.minParticleMass;
				color = calculateColor(mass);

				//for computation
				state.positions[i * 3    ] = x;
				state.positions[i * 3 + 1] = y;
				state.positions[i * 3 + 2] = z;
				state.velocities[i * 3    ] = 0;
				state.velocities[i * 3 + 1] = 0;
				state.velocities[i * 3 + 2] = 0;
				state.accelerations[i * 3    ] = 0;
				state.accelerations[i * 3 + 1] = 0;
				state.accelerations[i * 3 + 2] = 0;
				state.masses[i] = mass;

				//for geometry
				positions[i * 3    ] = x;
				positions[i * 3 + 1] = y;
				positions[i * 3 + 2] = z;
				colors[i * 3    ] = color.r;
				colors[i * 3 + 1] = color.g;
				colors[i * 3 + 2] = color.b;
			}

			var geometry = new THREE.BufferGeometry();
			var material = new THREE.ShaderMaterial(getShaderConfig());
			
			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
			geometry.dynamic = true;

			state.pointCloud = new THREE.Points(geometry, material);
			state.pointCloudPositions = state.pointCloud.geometry.getAttribute('position');
			state.scene.add(state.pointCloud);
		};

		var getShaderConfig = function getShaderConfig() {

			var config = {};

			config.vertexShader = [
				'',
				'',
				'void main()',
				'{',
				'   gl_PointSize = 2.0;',
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

			if (!state.paused) {

				simulationDelta = timeDelta * state.timeMultiplier;

				updateSingleThreaded();
				updatePositions(simulationDelta);

				var data = {
					simulationDelta: simulationDelta,
					particleCountChanged: false,
					currentNumParticles: state.particleCount
				};

                afterUpdate(data);
			}
		};

		var updateSingleThreaded = function updateSingleThreaded() {
			var i, j;
			var particleCount = state.particleCount;
			var thisPosition;
			var thisVelocity;
			var thisMass;

			var otherPosition;
			var otherVelocity;
			var otherMass;

			var positionDiff = {};
			var distanceSq;
			var softeningDistanceSq = state.softeningDistance * state.softeningDistance;

			var adjustedGravity = state.gravity * state.gravityMultiplier;
			var adjustedGravityPerDistanceSquared;

			var accelerationDirection = {};
			var accelerationScalar;
			var accelerationVector = {};

			var thisAccelVector;

			for (i = 0; i < particleCount; ++i) {
				thisPosition = getBodyPosition(i);
				thisVelocity = getBodyVelocity(i);
				thisMass = getBodyMass(i);

				thisAccelVector = getEmptyVector();

				for (j = i + 1; j < particleCount; ++j) {
					otherPosition = getBodyPosition(j);
					otherVelocity = getBodyVelocity(j);
					otherMass = getBodyMass(j);

					subVectors(otherPosition, thisPosition, positionDiff);
					distanceSq = lengthSq(positionDiff);

					distanceSq = Math.max(distanceSq, softeningDistanceSq);
					adjustedGravityPerDistanceSquared = adjustedGravity / distanceSq;

					normalize(positionDiff, accelerationDirection); // for "this" object
					//calculate accel Vector for 'this' object.
					accelerationScalar = adjustedGravityPerDistanceSquared * otherMass;
					multiplyScalar(accelerationDirection, accelerationScalar, accelerationVector);
					addVectors(thisAccelVector, accelerationVector, thisAccelVector);
					// addBodyAcceleration(i, accelerationVector);

					negate(accelerationDirection, accelerationDirection); // for "other" object
					//calculate accel Vector for 'other' object.
					accelerationScalar = adjustedGravityPerDistanceSquared * thisMass;
					multiplyScalar(accelerationDirection, accelerationScalar, accelerationVector);
					addBodyAcceleration(j, accelerationVector);
				}

				addBodyAcceleration(i, thisAccelVector);
			}
		};

		var updatePositions = function updatePositions(delta) {
			var i;
			var particleCount = state.particleCount;

			var position;
			var velocity;

			var accelerationVector = {};
			var velocityTime = {};
			var accelTimeSqOver2 = {};

			var positionDelta = {};
			var velocityDelta = {};

			delta /= 1000;
			var deltaSqOver2 = (delta * delta) / 2;

			for (i = 0; i < particleCount; ++i) {
				position = getBodyPosition(i);
				velocity = getBodyVelocity(i);
				accelerationVector = getBodyAcceleration(i);

				// deltaD = v1*t + (1/2)*a*(t^2)
				multiplyScalar(velocity, delta, velocityTime);
				multiplyScalar(accelerationVector, deltaSqOver2, accelTimeSqOver2);
				addVectors(velocityTime, accelTimeSqOver2, positionDelta);

				// deltaV = a * t
				multiplyScalar(accelerationVector, delta, velocityDelta);

				addBodyPosition(i, positionDelta);
				addBodyVelocity(i, velocityDelta);

				clearBodyAcceleration(i);
			}

			//update positions in point cloud.
			state.pointCloudPositions.set(state.positions);
			state.pointCloudPositions.needsUpdate = true;
		};

		var getEmptyVector = function getEmptyVector() {
			return {x: 0, y: 0, z: 0};
		};

		var getBodyPosition = function getBodyPosition(bodyIndex) {
			var positions = state.positions;
			var x = positions[bodyIndex * 3    ];
			var y = positions[bodyIndex * 3 + 1];
			var z = positions[bodyIndex * 3 + 2];
			return {x: x, y: y, z: z};
		};

		var setBodyPosition = function setBodyPosition(bodyIndex, position) {
			var positions = state.positions;
			positions[bodyIndex * 3    ] = position.x;
			positions[bodyIndex * 3 + 1] = position.y;
			positions[bodyIndex * 3 + 2] = position.z;
		};

		var addBodyPosition = function addBodyPosition(bodyIndex, position) {
			var positions = state.positions;
			positions[bodyIndex * 3    ] += position.x;
			positions[bodyIndex * 3 + 1] += position.y;
			positions[bodyIndex * 3 + 2] += position.z;
		};

		var getBodyVelocity = function getBodyVelocity(bodyIndex) {
			var velocities = state.velocities;
			var x = velocities[bodyIndex * 3    ];
			var y = velocities[bodyIndex * 3 + 1];
			var z = velocities[bodyIndex * 3 + 2];
			return {x: x, y: y, z: z};
		};

		var setBodyVelocity = function setBodyVelocity(bodyIndex, velocity) {
			var velocities = state.velocities;
			velocities[bodyIndex * 3    ] = velocity.x;
			velocities[bodyIndex * 3 + 1] = velocity.y;
			velocities[bodyIndex * 3 + 2] = velocity.z;
		};

		var addBodyVelocity = function addBodyVelocity(bodyIndex, velocity) {
			var velocities = state.velocities;
			velocities[bodyIndex * 3    ] += velocity.x;
			velocities[bodyIndex * 3 + 1] += velocity.y;
			velocities[bodyIndex * 3 + 2] += velocity.z;
		};

		var getBodyAcceleration = function getBodyAcceleration(bodyIndex) {
			var accelerations = state.accelerations;
			var x = accelerations[bodyIndex * 3    ];
			var y = accelerations[bodyIndex * 3 + 1];
			var z = accelerations[bodyIndex * 3 + 2];
			return {x: x, y: y, z: z};
		};

		var setBodyAcceleration = function setBodyAcceleration(bodyIndex, accel) {
			var accelerations = state.accelerations;
			accelerations[bodyIndex * 3    ] = accel.x;
			accelerations[bodyIndex * 3 + 1] = accel.y;
			accelerations[bodyIndex * 3 + 2] = accel.z;
		};

		var addBodyAcceleration = function addBodyAcceleration(bodyIndex, accel) {
			var accelerations = state.accelerations;
			accelerations[bodyIndex * 3    ] += accel.x;
			accelerations[bodyIndex * 3 + 1] += accel.y;
			accelerations[bodyIndex * 3 + 2] += accel.z;
		};

		var clearBodyAcceleration = function clearBodyAcceleration(bodyIndex) {
			var accelerations = state.accelerations;
			accelerations[bodyIndex * 3    ] = 0;
			accelerations[bodyIndex * 3 + 1] = 0;
			accelerations[bodyIndex * 3 + 2] = 0;
		};

		var getBodyMass = function getBodyMass(bodyIndex) {
			return state.masses[bodyIndex];
		};

		var subVectors = function subVectors(a, b, result) {
			result.x = a.x - b.x;
			result.y = a.y - b.y;
			result.z = a.z - b.z;
		};

		var addVectors = function addVectors(a, b, result) {
			result.x = a.x + b.x;
			result.y = a.y + b.y;
			result.z = a.z + b.z;
		};

		var multiplyScalar = function multiplyScalar(vector, scalar, result) {
			result.x = vector.x * scalar;
			result.y = vector.y * scalar;
			result.z = vector.z * scalar;
		};

		var normalize = function normalize(vector, result) {
			var length = Math.sqrt(lengthSq(vector));
			result.x = vector.x / length;
			result.y = vector.y / length;
			result.z = vector.z / length;
		};

		var negate = function negate(vector, result) {
			result.x = -vector.x;
			result.y = -vector.y;
			result.z = -vector.z;
		};

		var lengthSq = function lengthSq(a) {
			return (a.x * a.x) + (a.y * a.y) + (a.z * a.z);
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