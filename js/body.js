/*global THREE */

var APP  = APP || {};

APP.body = (function body(THREE) {
	'use strict';

	var make = function make(args) {

		args = args || {};

		var defaults = {
			widthSegements: 15,
			heightSegments: 15,

			isLocked: false,
			respectOnlyLocked: false,
			drawTrail: true,
			trailLength: 100,

			mass: 1,
			radius: 1,
			position: new THREE.Vector3(),
			velocity: new THREE.Vector3(),

			totalMass: 1000, //need to figure out a better way to deal with colors than using this variable.

			material: new THREE.MeshBasicMaterial({ color: 0x0000ff })
		};
		
		var state = {

			//isLocked is checked below
			//respectOnlyLocked is checked below
			//drawTrail is checked below
			trailLength: args.trailLength || defaults.trailLength,

			mass: args.mass || defaults.mass,
			radius: args.radius || defaults.radius,
			position: args.position || defaults.position,
			velocity: args.velocity || defaults.velocity,

			totalMass: args.totalMass || defaults.totalMass,

			mesh: {},
			trail: {},
			thisFrameAcceleration: new THREE.Vector3(),
			radiusChanged: false
		};

		//need special checks for booleans
		if (args.isLocked === undefined) {
			state.isLocked = defaults.isLocked;
		} else {
			state.isLocked = args.isLocked;
		}
		if (args.respectOnlyLocked === undefined) {
			state.respectOnlyLocked = defaults.respectOnlyLocked;
		} else {
			state.respectOnlyLocked = args.respectOnlyLocked;
		}
		if (args.drawTrail === undefined) {
			state.drawTrail = defaults.drawTrail;
		} else {
			state.drawTrail = args.drawTrail;
		}

		if (state.trailLength === 0) {
			state.drawTrail = false;
		}

		var trailGeometry = new THREE.Geometry();
		var trailMaterial = new THREE.LineBasicMaterial({color: 0x0000ff});

		var vertices = [];

		for (var i = 0; i < state.trailLength; i++) {
			vertices.push(new THREE.Vector3(state.position.x, state.position.y, state.position.z));
		}

		trailGeometry.vertices = vertices;
		trailGeometry.dynamic = true;

		state.trail = new THREE.Line(trailGeometry, trailMaterial);
		state.trail.frustumCulled = false;

		var geometry = new THREE.SphereGeometry(args.radius, defaults.widthSegements, defaults.heightSegments);
		var material = defaults.material;

		if (args.color !== undefined) {
			material.color = args.color;
		}
		
		state.mesh = new THREE.Mesh(geometry, material);

		var getState = function getState() {
			return state;
		};
		
		var setRadius = function setRadius(r) {
			state.radius = r;
			state.radiusChanged = true;
		};

		return {
			getState: getState,
			setRadius: setRadius
		};
	};

	return {
		make: make
	};
}(THREE));