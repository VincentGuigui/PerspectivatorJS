/**
 * PerspectivatorJS v1.0
 * Lightweight Perspective and Gradient effect based on mouse movement or device orientation in pure Javascript
 * https://github.com/VincentGuigui/PerspectivatorJS
 *
 * Copyright (c) Vincent Guigui
 * Published under MIT License
 */
 
if (typeof(window.PerspectivatorOptions) == 'undefined')
	window.PerspectivatorOptions = {};
window.Perspectivator = {
	defaults: {
		motionEnabled : true,
		interactionSurface : window,
		perspectiveClassName : "perspective",
		perspectiveGradientClassName : "perspectiveGradient",
		perspectiveSelfClassName : "perspectiveSelf",
		perspectiveGradientSelfClassName : "perspectiveGradientSelf",
		transition : "transform 0.3s cubic-bezier(0.215, 0.61, 0.344, 0.6)",
		perspectiveDistance : "800px",
		amplitudeX : 10,
		amplitudeY : 10,
		motionAttenuation : 120
	},
	
	perspectiveElements : undefined,
	perspectiveElementsSelf : undefined,
	
	computePerspectiveFromCursor: function(el, x, y, bself) {
		let box = el.getBoundingClientRect();
		let interactionSurfaceBox = bself ? box : 
			(Perspectivator.options.interactionSurface == window ? {top:0, left:0, height:window.innerHeight, width:window.innerWidth} : Perspectivator.options.interactionSurface.getBoundingClientRect());
		
		let calcX = -((y-interactionSurfaceBox.top) - (interactionSurfaceBox.height*0.5)) / interactionSurfaceBox.height;
		let calcY = ((x-interactionSurfaceBox.left) - (interactionSurfaceBox.width*0.5)) / interactionSurfaceBox.width;
		return {x:calcX, y:calcY};
	},
	
	applyTransform: function (el, perspectiveXY) {
		el.style.transform = "perspective("+ Perspectivator.options.perspectiveDistance + ") "
			+ "rotateX("+ (perspectiveXY.x * Perspectivator.options.amplitudeX) +"deg) "
			+ "rotateY("+ (perspectiveXY.y * Perspectivator.options.amplitudeY) +"deg) ";	
	},
	
	applyGradient: function (el, perspectiveXY) {
		let computedGradient = el.getAttribute("computedGradient");
		if (computedGradient != null) {
			var t = 0;
			el.style.backgroundImage = computedGradient.replace(/([\d\.]+deg)/g, match => (parseInt(match) + perspectiveXY.x * 90)+"deg");
			el.style.backgroundImage = el.style.backgroundImage.replace(/([\d\.]+%)/g, match => {
				++t;
				if (t == 1)
					return parseInt((0.25 + perspectiveXY.y) * 100) + '%';
				else 
					return parseInt((0.75 + perspectiveXY.y) * 100) + '%';				
			});
		}
	},
	
	applyTransformAndGradient: function (x, y, el, bself) {
		window.requestAnimationFrame(function(){
			let perspectiveXY = Perspectivator.computePerspectiveFromCursor(el, x, y, bself);
			if (bself) {
				if (el.classList.contains("perspectiveSelf"))
					Perspectivator.applyTransform(el, perspectiveXY);
				if (el.classList.contains("perspectiveGradientSelf"))
					Perspectivator.applyGradient(el, perspectiveXY);
			}
			else {
				if (el.classList.contains("perspective"))
					Perspectivator.applyTransform(el, perspectiveXY);
				if (el.classList.contains("perspectiveGradient"))
					Perspectivator.applyGradient(el, perspectiveXY);
			}
		});  
	},
	
	computePerspectiveFromMotion: function (pitch, yaw, roll) {
		let x = (pitch || 0) / Perspectivator.options.motionAttenuation;
		let y = -(yaw || 0) / Perspectivator.options.motionAttenuation;
		let z = (roll || 0) / Perspectivator.options.motionAttenuation;
		if (!Perspectivator.isDesktop) {
			z = -z;
			if (window.innerHeight < window.innerWidth) {
				[x, y] = [y, x];
			}
		}
		return {x:x, y:y};
	},
	
	applyTransformAndGradientFromMotion: function(pitch, yaw, roll, el) {
		let perspectiveXY = Perspectivator.computePerspectiveFromMotion(pitch, yaw, roll);
		if (el.classList.contains("perspective") || el.classList.contains("perspectiveSelf"))
			Perspectivator.applyTransform(el, perspectiveXY);
		if (el.classList.contains("perspectiveGradient") || el.classList.contains("perspectiveGradientSelf"))
			Perspectivator.applyGradient(el, {x:perspectiveXY.x / 5, y: perspectiveXY.y / 5});
	},
	
	onDeviceMotion: function(e) {
		if (e.rotationRate !== null) {
			let pitch = e.rotationRate.alpha;
			let yaw = e.rotationRate.beta;
			let roll = e.rotationRate.gamma;
			if (Math.abs(pitch) > 5 || Math.abs(yaw) > 5 || Math.abs(roll) > 5) {
				for (let el of Perspectivator.allElements) {
					Perspectivator.applyTransformAndGradientFromMotion(pitch, yaw, roll, el);
				}
			}
		}
	},
	
	resetTransform: function (el) {
		el.style.transform = "";
		el.style.backgroundImage = el.getAttribute("computedGradient");
	},
	
	initTransformForElement: function (el) {
		el.style.transition = Perspectivator.options.transition;
	},
	
	initGradientForElement: function (el) {
		let bgI = window.getComputedStyle(el).backgroundImage;
		if (el.getAttribute("computedGradient") == null && bgI != null && bgI != "" && bgI.indexOf("gradient") >= 0) {
			el.setAttribute("computedGradient", bgI);
		}
	},
	
	merge: function (ar1, ar2){
		let merged = [...ar1].concat([...ar2]);
		// DEDUP
		merged = merged.filter((item, pos) => merged.indexOf(item) === pos); 
		return merged;
	},
	
	init: function() {
		this.isDesktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|BB10|mobi|tablet|opera mini|nexus 7)/i);
    	this.motionSupport = !!window.DeviceMotionEvent;// && !this.desktop;
		this.options = Object.assign({}, this.defaults, window.PerspectivatorOptions);
		this.options.motionEnabled = this.motionSupport & this.options.motionEnabled;
		this.transformElements = document.getElementsByClassName(this.options.perspectiveClassName);
		this.gradientElements = document.getElementsByClassName(this.options.perspectiveGradientClassName);
		this.transformElementsSelf = document.getElementsByClassName(this.options.perspectiveSelfClassName);
		this.gradientElementsSelf = document.getElementsByClassName(this.options.perspectiveGradientSelfClassName);
		
		// ALL ELEMENTS
		this.allTransformElements = this.merge(this.transformElements, this.transformElementsSelf);
		this.allGradientElements = this.merge(this.gradientElements, this.gradientElementsSelf);
		this.allElementsSurface = this.merge(this.transformElements, this.gradientElements);
		this.allElementsSelf = this.merge(this.transformElementsSelf, this.gradientElementsSelf);
		this.allElements = this.merge(this.allTransformElements, this.allGradientElements);

		// INIT
		for (let el of Perspectivator.allTransformElements) {
			Perspectivator.initTransformForElement(el);
		}
		for (let el of Perspectivator.allGradientElements) {
			Perspectivator.initGradientForElement(el);
		}

		// MOUSE MOVE
		if (this.isDesktop) {
			this.options.interactionSurface.onmousemove = function(e) {
				for (let el of Perspectivator.allElementsSurface) {
					Perspectivator.applyTransformAndGradient(e.clientX, e.clientY, el, false);
				}
			};

			this.options.interactionSurface.onmouseout = function(e) {
				for (let el of Perspectivator.allElementsSurface) {    
					Perspectivator.resetTransform(el);
				}
			};

			for (let el of Perspectivator.allElementsSelf) {
				el.onmousemove = function(e) {
					Perspectivator.applyTransformAndGradient(e.clientX, e.clientY, el, true);
				};
				el.onmouseout = function(e) {
					Perspectivator.resetTransform(el);
				};
			}
		}
		// MOTION
		if (this.options.motionEnabled) {		
	  		// https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event
      		window.addEventListener('devicemotion', this.onDeviceMotion)
		}
	}
};
window.Perspectivator.init();