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
			gridSpacing: 5,	//5 grid lines per grid

			particleCount: 100,

			minParticleSize: 0.5,
			maxParticleSize: 0.5,

			minParticleMass: 1,
			maxParticleMass: 1,
			
			drawTrails: false,
			trailLength: 100,

			startingSpeed: 0,

			detectCollisions: false,

			softenGravity: true,
			softeningDistance: 3,
			softeningFactor: 5,

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

			softeningFactor: args.softeningFactor || defaults.softeningFactor,
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

		state.useComputeRenderer = false;
		
		//this will be used for color calculations, there is probably a better way.
		state.roughTotalMass = ( state.particleCount * (state.minParticleMass + state.maxParticleMass) / 2);

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

			var randomSizeMass;

			var radiusRange = state.maxParticleSize - state.minParticleSize;
			var massRange = state.maxParticleMass - state.minParticleMass;

			var radius;
			var mass;
			var velocity;
			
			var body;

			state.bodyArray = new Array(state.particleCount);
			
			for (i = 0; i < state.particleCount; ++i) {

				randX = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				randY = (getRandom() * maxAbsRange * 2) - maxAbsRange;
				randZ = (getRandom() * maxAbsRange * 2) - maxAbsRange;

				randomSizeMass = getRandom();

				radius = (randomSizeMass * radiusRange) + state.minParticleSize;
				mass   = (randomSizeMass * massRange) + state.minParticleMass;

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
					radius: radius,
					// mass is in kg
					mass: mass,
					// velocity is in meters / second
					velocity: velocity,
					color: calculateColor(mass),
					isLocked: false,
					drawTrails: state.drawTrails,
					trailLength: state.trailLength
				});
				
				addToScene(body);
				
				state.bodyArray[i] = body;
			}

			if (state.useComputeRenderer) {
				initComputeRenderer();
			}

		};
		
		var initComputeRenderer = function initComputeRenderer() {

			state.computeRenderer = new THREE.WebGLRenderer();
			state.computeRenderer.setSize(window.innerWidth, window.innerHeight);
			state.computeRenderer.setPixelRatio(window.devicePixelRatio);
			state.computeRenderer.setClearColor(0xFFFFFF, 1);

			state.computeScene = new THREE.Scene();
			state.computeCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1e6);

			createPointCloud();

			initShaders();
		};

		var initShaders = function initShaders() {

			var gl = state.computeRenderer.context;

			var glVertexShader = new THREE.WebGLShader(gl, gl.VERTEX_SHADER, [
				'',
				'',
				'void main()',
				'{',
				'	gl_Position = vec4(1.0, 1.0, 1.0, 1.0);',
				'',
				'}'
			].join('\n'));

			state.shaderProgram = gl.createProgram();

			gl.attachShader(state.shaderProgram, glVertexShader);

			gl.linkProgram(state.shaderProgram);
		};

		var createPointCloud = function createPointCloud() {

			var positions = new Float32Array(state.particleCount * 3);
			var colors = new Float32Array(state.particleCount * 3);
			
			var x;
			var y;
			var z;

			for (var i = 0; i < positions.length; i += 3) {
					
				x = y = z = i;

				positions[i    ] = x;
				positions[i + 1] = y;
				positions[i + 2] = z;

				colors[i    ] = x;
				colors[i + 1] = y;
				colors[i + 2] = z;
			}

			var geometry = new THREE.BufferGeometry();
			var material = new THREE.PointsMaterial({ size: 1, vertexColors: THREE.VertexColors });

			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
			geometry.dynamic = true;

			state.pointCloud = new THREE.Points(geometry, material);
			state.computeScene.add(state.pointCloud);
		};

		var addToScene = function addToScene(body) {
			var bodyState = body.getState();
				
			state.scene.add(bodyState.mesh);

			if (bodyState.drawTrails) {
				state.scene.add(bodyState.trail);
			}
			
			bodyState.mesh.translateX(bodyState.position.x);
			bodyState.mesh.translateY(bodyState.position.y);
			bodyState.mesh.translateZ(bodyState.position.z);
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
				
				if (state.useComputeRenderer) {
					updateWithComputeRenderer();
				} else {
					updateSingleThreaded();
				}

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
		
		var updateWithComputeRenderer = function updateWithComputeRenderer() {

			// we don't care what it looks like because we will never see this,
			// but it's required for the render.
			var shadingMaterial = new THREE.Material();

			//state.computeRenderer.renderBufferImmediate(state.pointCloud, state.shaderProgram, shadingMaterial);
			state.computeRenderer.render(state.computeScene, state.computeCamera);
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
			var softeningFactorSq = state.softeningFactor * state.softeningFactor;
			var softeningDistanceSq = state.softeningDistance * state.softeningDistance;
			var accelerationScalar;
			var accelerationVector;

			var distanceSq;
			var collisionDistanceSq;
			var totalMomentum;

			var finalMass;
			var finalVelocity;
			var finalRadius;
			
			var dontCalculate;

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
					
					if (state.softenGravity && distanceSq < softeningDistanceSq) {
						adjustedGravityPerDistanceSquared = adjustedGravity / (distanceSq + softeningFactorSq * (1 - distanceSq / softeningDistanceSq));
					}

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

			var bodyArray = state.bodyArray;
			var body;
			var bodyState;
			var arrayLen = bodyArray.length;

			if (state.useComputeRenderer) {

				var x, y, z;
				var pointCloud = state.pointCloud;

				var positions = pointCloud.geometry.getAttribute('position');

				for (var i = 0; i < arrayLen; i++) {

					body = bodyArray[i];
					bodyState = body.getState();

					x = positions[i * 3    ];
					y = positions[i * 3 + 1];
					z = positions[i * 3 + 2];

					bodyState.position.x = x;
					bodyState.position.y = y;
					bodyState.position.z = z;
				
					bodyState.mesh.position.x = x;
					bodyState.mesh.position.y = y;
					bodyState.mesh.position.z = z;
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