/*global THREE */

var APP  = APP || {};

APP.simulation = (function simulation(THREE) {
	'use strict';

	var make = function make(args, afterValidation) {

		args = args || {};

		var defaults = {
			timeMultiplier: 1000000,
			gravityMultiplier: 1,

			gridSize: 150,
			gridSpacing: 5,	//5 grid lines per grid

			particleCount: 100,

			minParticleSize: 0.1,
			maxParticleSize: 1,

			minParticleMass: 0.5,
			maxParticleMass: 5,
			
			drawTrails: false,
			trailLength: 100,

			startingVelocity: 1,

			detectCollisions: true,

			seed: Date.now()
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
			maxParticlemass: args.maxParticleMass || defaults.maxParticleMass,

			//drawTrails is checked below
			trailLength: args.trailLength || defaults.trailLength,

			startingVelocity: args.startingVelocity || defaults.startingVelocity,

			seed: args.seed || defaults.seed
		};

		//need special checks for booleans
		if (args.drawTrails === undefined) {
			state.drawTrails = defaults.drawTrails;
		} else {
			state.drawTrails = args.drawTrails;
		}
		if (args.detectCollisions === undefined) {
			state.detectCollisions = defaults.detectCollisions;
		} else {
			state.detectCollisions = args.detectCollisions;
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
		if (state.startingVelocity !== state.startingVelocity) {
			state.startingVelocity = defaults.startingVelocity;
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
		if (state.startingVelocity < 0) {
			state.startingVelocity = -state.startingVelocity;
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

		// ideally this will be used to set input values to their validated values
		afterValidation();

		var init = function init() {
			var i;
			var maxAbsRange = state.gridSize;
			
			var getRandom = new Math.seedrandom(state.seed);
			
			var randX;
			var randY;
			var randZ;

			var randVX;
			var randVY;
			var randVZ;

			var randomSizeMassColor;

			var radiusRange = state.maxParticleSize - state.minParticleSize;
			var massRange = state.maxParticleMass - state.minParticleMass;

			var radius;
			var mass;
			var color;
			var velocity;

			state.bodyArray = [];

			for (i = 0; i < state.particleCount; ++i) {

				randX = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				randY = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				randZ = (getRandom() * maxAbsRange * 2) - maxAbsRange;

				randomSizeMassColor = getRandom();

				radius = (randomSizeMassColor * radiusRange) + state.minParticleSize;
				mass   = (randomSizeMassColor * massRange) + state.minParticleMass;
				color = randomSizeMassColor * 0.5; // todo: this will need to be changed

				randVX = (getRandom() * 2) - 1;
				randVY = (getRandom() * 2) - 1;
				randVZ = (getRandom() * 2) - 1;

				velocity = new THREE.Vector3(randVX, randVY, randVZ);
				velocity.normalize();
				velocity.multiplyScalar(sim.startingVelocity / timeMultiplier);

				state.bodyArray[i] = APP.body.make({
					// position is in meters
					position: new THREE.Vector3(randX,randY,randZ),
					// radius is in meters
					radius: radius,
					// mass is in kg
					mass: mass,
					// color: (new THREE.Color()).setHSL(color, 1, 0.5),
					color: (new THREE.Color()).setRGB(color, color, color),
					// velocity is in meters / second
					velocity: velocity,
					isLocked: false,
					drawLines: state.drawLines,
					totalMass: roughTotalMass,
					trailLength: state.trailLength
				});

			}

		};

		var pause = function pause() {
			state.paused = true;
		};

		var play = function play() {
			state.paused = false;
		};

		var getState = function getState() {
			return state;
		};

		var update = function update() {

			updateSingleThreaded();

			updatePositions();

		};
		
		var updateSingleThreaded = function updateSingleThreaded() {
			var i;
			var j;
			var bodyArray = state.bodyArray;
			var arrayLen = bodyArray.length;

			var thisState;
			var thisPosition;
			var thisVelocity;
			var thisMass;
			var thisRadius;
			var thisMomentum;

			var otherState;
			var otherPosition;
			var otherVelocity;
			var otherMass;
			var otherRadius;
			var otherMomentum;

			var positionDiff;
			var accelerationDirection;
			var adjustedGravity = state.gravity * state.gravityMultiplier;
			var adjustedGravityPerDistanceSquared;

			var distanceSq;
			var collisionDistanceSq;
			var totalMomentum;

			var finalMass;
			var finalVelocity;
			var finalRadius;

			outerLoop:
			for (i = 0; i < arrayLen; ++i) {

				thisState = bodyArray[i].getState();

				if (thisState.mass === 0) {
					continue;
				}

				thisPosition = thisState.position;
				thisMass = thisState.mass;

				innerLoop:
				for (j = i + 1; j < arrayLen; ++j) {

					otherState = bodyArray[j].getState();

					if (otherState.mass === 0) {
						continue;
					}

					otherPosition = otherState.position;
					otherMass = otherState.mass;

					positionDiff = cloneVector(otherPosition).sub(thisPosition);
					distanceSq = positionDiff.lengthSq();

					if (state.detectCollisions) {

						thisRadius = thisState.radius;
						otherRadius = otherState.radius;
						collisionDistanceSq = (thisRadius + otherRadius) * (thisRadius + otherRadius);

						if (distanceSq <= collisionDistanceSq ) {

							thisVelocity = thisState.velocity;
							otherVelocity = otherState.velocity;

							//we don't want to modify the velocity vectors here so we must clone
							thisMomentum = cloneVector(thisVelocity).multiplyScalar(thisMass);
							otherMomentum = cloneVector(otherVelocity).multiplyScalar(otherMass);
							totalMomentum = thisMomentum.add(otherMomentum);

							finalMass = thisMass + otherMass;
							finalVelocity = totalMomentum.divideScalar(finalMass);
							finalRadius = Math.pow((thisRadius * thisRadius * thisRadius + otherRadius * otherRadius * otherRadius), 1/3);

							if (thisRadius >= otherRadius) {
								thisState.velocity = cloneVector(finalVelocity); // this may not be necessary
								thisState.mass = finalMass;
								thisState.radius = finalRadius;
								otherState.mass = 0;

								// we should keep calculating for "this" object (bodyArray[i])
								// but we need to skip accel. calculations
								// between the current "this" object and the current "other" object (bodyArray[j])
								// because they will result in a 0 add to accel for "this" object.
								continue innerLoop;
							} else {
								otherState.velocity = cloneVector(finalVelocity); // this may not be necessary
								otherState.mass = finalMass;
								otherState.radius = finalRadius;
								thisState.mass = 0;

								// we should stop calculating for "this" object (bodyArray[i])
								// because this object will soon be removed
								// and all subsequent calculations on it will result in a 0 add to accel.
								continue outerLoop;								
							}
						}
					}

					adjustedGravityPerDistanceSquared = adjustedGravity / distanceSq;
					accelerationDirection = positionDiff.normalize();

					//calculate accel Vector for 'this' object.


					

					accelerationDirection.negate();
					//calculate accel Vector for 'other' object.

				}
			}
		};

		var updatePositions = function updatePositions() {
			var i;
			var bodyArray = state.bodyArray;
			var arrayLen = bodyArray.length;

			for (i = 0; i < arrayLen; ++i) {
				//update positions
			}
		};

		var cloneVector = function cloneVector(v) {
			return new THREE.Vector3(v.x, v.y, v.z);
		};

		return {
			init: init,
			start: start,
			pause: pause,
			getState: getState,
			update: update
		};

	};

	return {
		make: make
	};
}(THREE));