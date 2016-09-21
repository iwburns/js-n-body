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

			particleCount: 50,

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
		
		//this will be used for color calculations, there is probably a better way.
		state.roughTotalMass = ( state.particleCount * (state.minParticleMass + state.maxParticleMass) / 2);

		//forcing this to be false for now.
		state.detectCollisions = false;

		// ideally this will be used to set input values to their validated values
		args.afterValidation(state);

		var init = function init() {

			var positions = new Float32Array(state.particleCount * 3);
			var colors = new Float32Array(state.particleCount * 3);

			var i;
			var j = 0;
			var maxAbsRange = state.gridSize;
			
			var getRandom = new Math.seedrandom(state.seed);
			
			var randX;
			var randY;
			var randZ;

			var randVX;
			var randVY;
			var randVZ;

			var randomSizeMass;

			var radiusRange = state.maxParticleSize - state.minParticleSize;
			var massRange = state.maxParticleMass - state.minParticleMass;

			var radius;
			var mass;
			var velocity;
			
			var color;
			var body;

			state.bodyArray = new Array(state.particleCount);
			
			for (i = 0; i < state.particleCount; ++i) {

				randX = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				randY = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				randZ = (getRandom() * maxAbsRange * 2) - maxAbsRange;

				randomSizeMass = getRandom();

				radius = (randomSizeMass * radiusRange) + state.minParticleSize;
				mass   = (randomSizeMass * massRange) + state.minParticleMass;

				color = calculateColor(mass);

				positions[j    ] = randX;
				positions[j + 1] = randY;
				positions[j + 2] = randZ;
				colors[j    ] = color.r;
				colors[j + 1] = color.g;
				colors[j + 2] = color.b;
				j += 3;

				randVX = (getRandom() * 2) - 1;
				randVY = (getRandom() * 2) - 1;
				randVZ = (getRandom() * 2) - 1;

				velocity = new THREE.Vector3(randVX, randVY, randVZ);
				velocity.normalize();
				velocity.multiplyScalar(state.startingSpeed / state.timeMultiplier);

				body = APP.body.make({
					// position is in meters
					position: new THREE.Vector3(randX, randY, randZ),
					// radius is in meters
					radius: 1,
					// mass is in kg
					mass: mass,
					// velocity is in meters / second
					velocity: velocity,
					color: color,
					isLocked: false,
					drawTrails: state.drawTrails,
					trailLength: state.trailLength
				});
				
				state.bodyArray[i] = body;

				if (state.drawTrails) {
					state.scene.add(body.getState().trail);
				}

			}

			var pointSize = 5;

			var geometry = new THREE.BufferGeometry();
			var material = new THREE.PointsMaterial({
				size: pointSize,
				vertexColors: THREE.VertexColors
			});

			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
			geometry.dynamic = true;

			state.pointCloud = new THREE.Points(geometry, material);

			state.scene.add(state.pointCloud);


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
				
				simulationDelta = timeDelta * state.timeMultiplier;
				
				startingLength = state.bodyArray.length;
				
				updateSingleThreaded();
				updatePositions(simulationDelta);
				
				endingLength = state.bodyArray.length;
				
				var data = {
					simulationDelta: simulationDelta,
					particleCountChanged: startingLength !== endingLength,
					currentNumParticles: endingLength
				};
				
				afterUpdate(data);
			}

		};
		
		var updateSingleThreaded = function updateSingleThreaded() {
			var i;
			var j;
			var bodyArray = state.bodyArray;
			var arrayLen = bodyArray.length;

			var thisBody;
			var thisPosition;
			var thisMass;

			var otherBody;
			var otherPosition;
			var otherMass;

			var positionDiff;
			var accelerationDirection;
			var adjustedGravity = state.gravity * state.gravityMultiplier;
			var adjustedGravityPerDistanceSquared;
			var softeningDistanceSq = state.softeningDistance * state.softeningDistance;
			var accelerationScalar;
			var accelerationVector;

			var distanceSq;
			
			var dontCalculate;

			outerLoop:
			for (i = 0; i < arrayLen; ++i) {

				thisBody = bodyArray[i].getState();
				thisPosition = thisBody.position;
				thisMass = thisBody.mass;

				innerLoop:
				for (j = i + 1; j < arrayLen; ++j) {

					otherBody = bodyArray[j].getState();
					otherPosition = otherBody.position;
					otherMass = otherBody.mass;

					positionDiff = cloneVector(otherPosition).sub(thisPosition);
					distanceSq = positionDiff.lengthSq();

					adjustedGravityPerDistanceSquared = adjustedGravity / distanceSq;

					accelerationDirection = positionDiff.normalize(); // for "this" object

					dontCalculate = thisBody.isLocked || (thisBody.respectOnlyLocked && !otherBody.isLocked);

					if (!dontCalculate) {
						//calculate accel Vector for 'this' object.
						accelerationScalar = adjustedGravityPerDistanceSquared * otherMass;
						accelerationVector = cloneVector(accelerationDirection).multiplyScalar(accelerationScalar);
						thisBody.thisFrameAcceleration.add(accelerationVector);
					}

					dontCalculate = otherBody.isLocked || (otherBody.respectOnlyLocked && !thisBody.isLocked);

					if (!dontCalculate) {
						accelerationDirection.negate();	// for "other" object
						//calculate accel Vector for 'other' object.
						accelerationScalar = adjustedGravityPerDistanceSquared * thisMass;
						accelerationVector = accelerationDirection.multiplyScalar(accelerationScalar);
						otherBody.thisFrameAcceleration.add(accelerationVector);
					}
				}
			}
		};

		var updatePositions = function updatePositions(delta) {
			var i;
			var bodyArray = state.bodyArray;
			var arrayLen = bodyArray.length;
			var body;
			var bodyState;

			var positions = state.pointCloud.geometry.getAttribute('position');
			
			//miliseconds to seconds
			delta /= 1000;

			for (i = 0; i < arrayLen; ++i) {
				body = bodyArray[i];
				bodyState = body.getState();
				
				var accelerationVector = bodyState.thisFrameAcceleration;
			
				// d = v1*t + (1/2)*a*(t^2)
				var velocityTime = cloneVector(bodyState.velocity).multiplyScalar(delta);
				var positionDelta = velocityTime.add(cloneVector(accelerationVector).multiplyScalar(0.5 * delta * delta));
	
				var velocityDelta = accelerationVector.multiplyScalar(delta);
				
				bodyState.position.add(positionDelta);
				bodyState.velocity.add(velocityDelta);
				
				positions.setX(i, bodyState.position.x);
				positions.setY(i, bodyState.position.y);
				positions.setZ(i, bodyState.position.z);

				if (bodyState.drawTrails) {
					var vertices = bodyState.trail.geometry.vertices;
					vertices.pop();
					vertices.unshift(cloneVector(bodyState.position));
					bodyState.trail.geometry.verticesNeedUpdate = true;
				}
				
				bodyState.thisFrameAcceleration = new THREE.Vector3();
			}
			
			positions.needsUpdate = true;
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