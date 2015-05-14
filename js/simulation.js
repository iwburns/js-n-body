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

			gridSize: 150,
			gridSpacing: 5,	//5 grid lines per grid

			particleCount: 100,

			minParticleSize: 0.1,
			maxParticleSize: 1,

			minParticleMass: 0.5,
			maxParticleMass: 5,
			
			drawTrails: false,
			trailLength: 100,

			startingSpeed: 1,

			detectCollisions: true,

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

			startingSpeed: args.startingSpeed || defaults.startingSpeed,

			seed: args.seed || defaults.seed,
			
			scene: args.scene // guaranteed to exist
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
		state.roughTotalMass = ( state.particleCount * (state.minParticleCount + state.maxParticleCount) / 2);

		// ideally this will be used to set input values to their validated values
		args.afterValidation(state);

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
			
			var bodyState;

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
				velocity.multiplyScalar(state.startingSpeed / state.timeMultiplier);

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
					drawTrails: state.drawTrails,
					trailLength: state.trailLength
				});
				
				bodyState = state.bodyArray[i].getState();
				
				state.scene.add(bodyState.mesh);

				if (bodyState.drawTrails) {
					state.scene.add(bodyState.trail);
				}
				
				bodyState.mesh.translateX(bodyState.position.x);
				bodyState.mesh.translateY(bodyState.position.y);
				bodyState.mesh.translateZ(bodyState.position.z);
				
			}

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
			var thisVelocity;
			var thisMass;
			var thisRadius;
			var thisMomentum;

			var otherBody;
			var otherPosition;
			var otherVelocity;
			var otherMass;
			var otherRadius;
			var otherMomentum;

			var positionDiff;
			var accelerationDirection;
			var adjustedGravity = state.gravity * state.gravityMultiplier;
			var adjustedGravityPerDistanceSquared;
			var accelerationScalar;
			var accelerationVector;

			var distanceSq;
			var collisionDistanceSq;
			var totalMomentum;

			var finalMass;
			var finalVelocity;
			var finalRadius;
			
			var calculate;

			outerLoop:
			for (i = 0; i < arrayLen; ++i) {

				thisBody = bodyArray[i].getState();

				if (thisBody.mass === 0) {
					continue outerLoop;
				}

				thisPosition = thisBody.position;
				thisMass = thisBody.mass;

				innerLoop:
				for (j = i + 1; j < arrayLen; ++j) {

					otherBody = bodyArray[j].getState();

					if (otherBody.mass === 0) {
						continue innerLoop;
					}

					otherPosition = otherBody.position;
					otherMass = otherBody.mass;

					positionDiff = cloneVector(otherPosition).sub(thisPosition);
					distanceSq = positionDiff.lengthSq();

					if (state.detectCollisions) {

						thisRadius = thisBody.radius;
						otherRadius = otherBody.radius;
						collisionDistanceSq = (thisRadius + otherRadius) * (thisRadius + otherRadius);

						if (distanceSq <= collisionDistanceSq) {

							thisVelocity = thisBody.velocity;
							otherVelocity = otherBody.velocity;

							//we don't want to modify the velocity vectors here so we must clone
							thisMomentum = cloneVector(thisVelocity).multiplyScalar(thisMass);
							otherMomentum = cloneVector(otherVelocity).multiplyScalar(otherMass);
							totalMomentum = thisMomentum.add(otherMomentum);

							finalMass = thisMass + otherMass;
							finalVelocity = totalMomentum.divideScalar(finalMass);
							finalRadius = Math.pow((thisRadius * thisRadius * thisRadius + otherRadius * otherRadius * otherRadius), 1/3);

							if (thisRadius >= otherRadius) {
								thisBody.velocity = cloneVector(finalVelocity); // this may not be necessary
								thisBody.mass = finalMass;
								bodyArray[i].setRadius(finalRadius); // we use this so that we don't have to set "radiusChanged" manually.
								otherBody.mass = 0;

								// we should keep calculating for "this" object (bodyArray[i])
								// but we need to skip accel. calculations
								// between the current "this" object and the current "other" object (bodyArray[j])
								// because they will result in a 0 add to accel for "this" object.
								continue innerLoop;
							} else {
								otherBody.velocity = cloneVector(finalVelocity); // this may not be necessary
								otherBody.mass = finalMass;
								bodyArray[j].setRadius(finalRadius); // we use this so that we don't have to set "radiusChanged" manually.
								thisBody.mass = 0;

								// we should stop calculating for "this" object (bodyArray[i])
								// because this object will soon be removed
								// and all subsequent calculations on it will result in a 0 add to accel.
								continue outerLoop;
							}
						}
					}

					adjustedGravityPerDistanceSquared = adjustedGravity / distanceSq;

					accelerationDirection = positionDiff.normalize(); // for "this" object

					calculate = true;
					if (thisBody.isLocked || (thisBody.respectOnlyLocked && !otherBody.isLocked)) {
						calculate = false;
					}

					if (calculate) {
						//calculate accel Vector for 'this' object.
						accelerationScalar = adjustedGravityPerDistanceSquared * otherMass;
						accelerationVector = cloneVector(accelerationDirection).multiplyScalar(accelerationScalar);
						thisBody.thisFrameAcceleration.add(accelerationVector);
					}

					calculate = true;
					if (otherBody.isLocked || (otherBody.respectOnlyLocked && !thisBody.isLocked)) {
						calculate = false;
					}

					if (calculate) {
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
			var thisBody;
			
			var newBodyArray = [];
			
			//miliseconds to seconds
			delta /= 1000;

			for (i = 0; i < arrayLen; ++i) {
				thisBody = bodyArray[i].getState();
				
				if (thisBody.mass === 0) {
					state.scene.remove(thisBody.mesh);
					
					if (thisBody.drawTrails) {
						state.scene.remove(thisBody.trail);
					}
					continue;
				}
				
				newBodyArray.push(bodyArray[i]);
				
				if (thisBody.isLocked) {
					continue;
				}
				
				if (thisBody.radiusChanged) {
					thisBody.radiusChanged = false;
					
					state.scene.remove(thisBody.mesh);
					
					var bodyDefaults = bodyArray[i].getDefaults();
					
					var geometry = new THREE.SphereGeometry(thisBody.radius, bodyDefaults.widthSegements, bodyDefaults.heightSegments);
					var material = bodyArray[i].getDefaults().material;
			
					material.color = 1 - (thisBody.mass / state.roughtotalMass) - 0.2;
					if (material.color > 1) {
						material.color = 1;
					}
					
					thisBody.mesh = new THREE.Mesh(geometry, material);
					
					state.scene.add(thisBody.mesh);
					
					thisBody.mesh.translateX(thisBody.position.x);
					thisBody.mesh.translateY(thisBody.position.y);
					thisBody.mesh.translateZ(thisBody.position.z);
				}
				
				var accelerationVector = thisBody.thisFrameAcceleration;
			
				// d = v1*t + (1/2)*a*(t^2)
				var velocityTime = cloneVector(thisBody.velocity).multiplyScalar(delta);
				var positionDelta = velocityTime.add(cloneVector(accelerationVector).multiplyScalar(0.5 * delta * delta));
	
				var velocityDelta = accelerationVector.multiplyScalar(delta);
				
				thisBody.position.add(positionDelta);
				thisBody.velocity.add(velocityDelta);
				
				thisBody.mesh.translateX(positionDelta.x);
				thisBody.mesh.translateY(positionDelta.y);
				thisBody.mesh.translateZ(positionDelta.z);
				
				if (thisBody.drawTrails) {
					var vertices = thisBody.trail.geometry.vertices;
					vertices.pop();
					vertices.unshift(cloneVector(thisBody.position));
					thisBody.trail.geometry.verticesNeedUpdate = true;
				}
				
				thisBody.thisFrameAcceleration = new THREE.Vector3();
			}
			
			
			state.bodyArray = newBodyArray;
		};

		var cloneVector = function cloneVector(v) {
			return new THREE.Vector3(v.x, v.y, v.z);
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