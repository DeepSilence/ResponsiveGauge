/*!
 * ResponsiveGauge
 * version : 0.1.0
 * license : MIT
 * authors : Mikaël Restoux, Matt Magoffin (http://bl.ocks.org/msqr/3202712)
 * 
 */
var ResponsiveGaugeFactory = (function(_d3, _numbro) {
	'use strict';

	// handle dependencies injection using requireJS
	if (typeof d3 === 'undefined') {
		d3 = _d3;
	}
	if (typeof numbro === 'undefined') {
		numbro = _numbro;
	}

	/* PRIVATE CONSTANTS */
	// padding around the gauge
	var PADDING = 6;
	var NEEDLE_RADIUS = 2;
	// diameter of the gauge (including ticks and labels), used only as
	// reference for drawing; the actual size on screen depends on the size of
	// the gauge container
	var GAUGE_DIAMETER = 100;
	// Number of parts of gauge to simulate a color gradient
	var GRADIENT_ELT_NUMBER = 40;

	var FORMATTER = numbro();
	// formatter will use SI prefixes (G, M, k, µ, ...), and round values
	var DEFAULT_FORMATTER = function(value, isForLabel) {
		function buildFormat(formatOptions, formatName) {
			if (formatOptions.decimalsMax === 0) {
				this[formatName] = formatOptions.mantissaMax + '.a';
			} else {
				this[formatName] = formatOptions.mantissaMax + '.[' + new Array(formatOptions.decimalsMax + 1).join('0') + ']a';
			}
		}

		// build FORMAT only once
		var formatName, formatOptions;
		if (isForLabel) {
			formatName = 'LABEL_FORMAT';
			formatOptions = this.labels;
			if (this.LABEL_FORMAT === undefined) {
				buildFormat.call(this, formatOptions, formatName);
			}
		} else {
			formatName = 'VALUE_FORMAT';
			formatOptions = this.value;
			if (this.VALUE_FORMAT === undefined) {
				buildFormat.call(this, formatOptions, formatName);
			}
		}

		return FORMATTER.set(value).format(this[formatName]);
	};

	/* DEFAULT CONFIGURATION */
	var defaultConfig = {
		ring : {
			// Shift of the ring from the container side (%)
			shift : 3,
			// Width of the ring (%)
			width : 7,
			// Angle at which the ring starts. -90 is the minimum value, and 0
			// is at
			// the top of the vertical axis
			minAngle : -90,
			// Angle at which the ring ends.
			maxAngle : 90,

			/* SECTORS */
			// Number of sectors of the ring.
			sectorsNumber : 5,
			// Enables the border around the ring
			border : false,

			// Color(s) of the gauge; values are :<br>
			// 'gradient' for a gradient color gradient<br>
			// 'sectors' for coloring on each sector (gradient)<br>
			// [#111, #222, ...] for specifying the color of each sector<br>
			// false : no color (CSS color can be used)<br>
			colors : false,
			// If colors = 'gradient' or 'sectors', used as first gradient color
			startColor : '#ffebee',
			// If colors = 'gradient' or 'sectors', used as last gradient color
			endColor : '#810301'
		},

		pointer : {
			// Type of pointer; values are :<br>
			// 'needle',<br>
			// 'filament', <br>
			// 'filler'
			type : 'needle',
			// Time (in millis) for the pointer to stabilize at the correct
			// position
			slowness : 200,
			// Length of 'needle' pointers (%)
			needleLength : 90,
			// Overflow of 'filament' pointers over the ring (%)
			filamentLength : 2,
			// Width of 'filled' pointers (%)
			fillerWidth : null, /* by default, as wide as the ring */
			// Shift of the 'filled' pointers from the container side (%)
			fillerShift : 0
		},

		data : {
			// Minimum value displayed on the gauge
			min : 0,
			// Maximum value displayed on the gauge
			max : 100,
			// Value displayed on the gauge
			value : 0
		},

		labels : {
			// Number of labels around the gauges (ticks)
			number : null, /* by default, as many as sectors */

			// Function used to format the labels (can be d3.format). The
			// formatter context is the config object.
			// @param v the value to format
			formatter : function(v) {
				return DEFAULT_FORMATTER.call(this, v, true);
			},
			// If no custom labelFormatter is specified, number of mantissa
			// digits
			// before using SI units (Mega, Kilo...)
			mantissaMax : 4,
			// If no custom labelFormatter is specified, limits the number of
			// decimal digits of labels
			decimalsMax : 0,
			// Shift of the label from the container side (%)
			shift : 0
		},

		value : {
			// enable value display
			show : true,
			// Shift of the label from the center of the gauge (%)
			shift : 22,
			// format function to apply to the value (can use d3.format). The
			// formatter context is the config object
			// @param v the value to format
			formatter : function(v) {
				return DEFAULT_FORMATTER.call(this, v, false);
			},
			// If no custom valueFormatter is specified, number of mantissa
			// digits
			// before using SI units (Mega, Kilo...)
			mantissaMax : 4,
			// If no custom valueFormatter is specified, limits the number of
			// decimal digits of labels
			decimalsMax : 0,
			// unit of the displayed value
			unit : ''
		}
	};

	var ResponsiveGauge = function(container, configuration) {
		var config = {};

		/* MISC VALUES */
		var radius = GAUGE_DIAMETER / 2;
		var range, scale;

		/* ELEMENTS */
		var valueLabel, svgContainer, svg, pointer;

		/* DATA */
		var arcData, fullArcData, labelData;

		/* COLORS */
		var colors, arcColorFn;

		/**
		 * Indicates the gauge size is wide (more than an half circle)
		 */
		var isWide = false;

		/**
		 * Size of the layout
		 */
		var width = 0;
		var height = 0;
		/**
		 * Translation of the gauge so that is stays inside the layout
		 */
		var centerTranslation;

		/**
		 * Transfom degree angles to radian
		 */
		function deg2rad(deg) {
			return deg * Math.PI / 180;
		}

		/**
		 * Due to the way d3 computes ticks (only modulo 10), we need to rewrite
		 * this...
		 */
		function computeTicks() {
			if (config.labels.number === null) {
				config.labels.number = config.ring.sectorsNumber;
			}
			if (config.labels.number === 0) {
				return [];
			}

			var step = (config.data.max - config.data.min) / (config.labels.number - 1);
			var ticks = d3.range(config.data.min, config.data.max, step);
			ticks.push(config.data.max);
			return ticks;
		}

		/**
		 * Merges the source object into the target object. The reference is
		 * used to check whether source do contain unknown properties
		 */
		function merge(target, source, reference) {
			for ( var prop in source) {
				if (source.hasOwnProperty(prop)) {
					var data = source[prop];
					if (typeof data === 'object' && data.constructor !== Array) {
						if (target[prop] === undefined) {
							target[prop] = {};
						}
						merge(target[prop], data, reference[prop]);
					} else {
						// scalar data
						target[prop] = data;
						if (reference[prop] === undefined) {
							console.warn('Config property ' + prop + ' is unknwon');
						}
					}
				}
			}
		}

		/**
		 * Creates the actual gauge configuration using default values and user
		 * values
		 * 
		 */
		function createConfig(configuration) {
			// inits with default config
			config = JSON.parse(JSON.stringify(defaultConfig));
			config.labels.formatter = defaultConfig.labels.formatter;
			config.value.formatter = defaultConfig.value.formatter;
			// adds the users config
			merge(config, configuration, defaultConfig);
			// reset format
			config.FORMAT = undefined;
			// binds the formatter so that it can access config
			config.labels.formatter = config.labels.formatter.bind(config);
			config.value.formatter = config.value.formatter.bind(config);

		}

		/**
		 * Do config related computations
		 */
		function configure(configuration) {
			createConfig(configuration);

			range = config.ring.maxAngle - config.ring.minAngle;
			computeLayout();

			// a linear scale that maps domain values to a percent from 0..1
			scale = d3.scale.linear().range([ 0, 1 ]).domain([ config.data.min, config.data.max ]);

			// label ticks
			labelData = computeTicks();

			// coloring / gradient
			if (config.ring.colors.constructor === Array) {
				colors = d3.range(config.ring.sectorsNumber).map(function() {
					return 1 / config.ring.sectorsNumber;
				});
				arcColorFn = function(i) {
					/* fix me : ugly */
					var index = Math.floor(i * config.ring.sectorsNumber);
					index = Math.min(index, config.ring.colors.length - 1);
					return config.ring.colors[index];
				};
			} else if (config.ring.colors) {
				if (config.ring.colors === 'gradient') {
					colors = d3.range(GRADIENT_ELT_NUMBER).map(function() {
						return 1 / GRADIENT_ELT_NUMBER;
					});
				} else {
					colors = d3.range(config.ring.sectorsNumber).map(function() {
						return 1 / config.ring.sectorsNumber;
					});
				}
				arcColorFn = d3.interpolateHsl(d3.rgb(config.ring.startColor), d3.rgb(config.ring.endColor));
			} else {
				colors = [ 1 ];
			}

			// sectors of the arc
			arcData = getArcData(function(d, i) {
				var ratio = d * i;
				// - 0.5 allow shapes borders collapse, except on first arc
				var collapsing = (i === 0 ? 0 : 0.5);
				return deg2rad(config.ring.minAngle + (ratio * range) - collapsing);
			}, function(d, i) {
				var ratio = d * (i + 1);
				return deg2rad(config.ring.minAngle + (ratio * range));
			}, config.ring.width, config.ring.shift);

			// complete arc for the border drawing
			if (config.ring.border) {
				fullArcData = getArcData(deg2rad(config.ring.minAngle), deg2rad(config.ring.maxAngle), config.ring.width, config.ring.shift);
			}

			// Pointer
			if (config.pointer.type === 'filler' && config.pointer.fillerWidth === null) {
				config.pointer.fillerWidth = config.ring.width;
				config.pointer.fillerShift = config.ring.shift;
			}
		}

		/**
		 * Creates an arc data starting and ending at the specified angles
		 */
		function getArcData(startAngle, endAngle, width, shift) {
			return d3.svg.arc()//
			.innerRadius(radius - width - shift)//
			.outerRadius(radius - shift)//
			.startAngle(startAngle)//
			.endAngle(endAngle);
		}

		/**
		 * Returns a readonly access to the actual config (use update() to
		 * modify the config)
		 */
		function getReadOnlyConfig() {
			var configClone = JSON.parse(JSON.stringify(config));
			Object.freeze(configClone);
			return configClone;
		}

		/**
		 * Calculates ideal size of the gauge depending its min&max angles along
		 * with the required translations to draw it. Note : assumes
		 * minAngle>=-90 and maxAngle<=450, and range <=360
		 */
		function computeLayout() {
			// manage space for long labels
			var minAngle = config.ring.minAngle;
			var maxAngle = config.ring.maxAngle;
			// radius depends if all elements have are shifted inside the gauge
			var maxRadius = radius - Math.min(config.ring.shift, config.pointer.fillerShift, config.labels.shift);

			function spaces(angleShift) {
				// space is the space needed to display the part of
				// the gauge, ie for the right space, the part between 0° and
				// minAngle, or the part
				// between 180° and maxAngle
				return [ size(minAngle + angleShift), size(maxAngle + angleShift) ];
			}
			function size(angle) {
				return maxRadius * Math.sin(deg2rad(angle));
			}

			var leftSpace = 0;
			var rightSpace = 0;
			var topSpace = 0;
			var bottomSpace = 0;
			// computes axis totally covered by the gauges :
			// if min and max angles are on both sides of an axis,
			// then the summit of the arc require all available space.
			// top of the vertical axis is at index 0
			var firstCrossedAxisIndex = Math.floor(minAngle / 90);
			var lastCrossedAxisIndex = Math.floor(maxAngle / 90);
			for (var crossedAxisIndex = firstCrossedAxisIndex; crossedAxisIndex <= lastCrossedAxisIndex; crossedAxisIndex++) {
				switch (crossedAxisIndex % 4) { // % 4 to handle angles >= 360
				case 0:
					topSpace = maxRadius;
					break;
				case 1:
					rightSpace = maxRadius;
					break;
				case 2:
					bottomSpace = maxRadius;
					break;
				case 3:
					leftSpace = maxRadius;
					break;
				}
			}

			// in case an axis is not totally covered by the gauge,
			// computes space needed (depending the min and max angles)
			var horizontalSpaces = spaces(0);
			// same operation, shifted by -90 to be like horizontal computation
			var verticalSpaces = spaces(-90);
			leftSpace = Math.abs(Math.min(-leftSpace, horizontalSpaces[0], horizontalSpaces[1]));
			rightSpace = Math.max(rightSpace, horizontalSpaces[0], horizontalSpaces[1]);
			topSpace = Math.abs(Math.min(-topSpace, verticalSpaces[0], verticalSpaces[1]));
			bottomSpace = Math.max(bottomSpace, verticalSpaces[0], verticalSpaces[1]);

			width = leftSpace + rightSpace + PADDING * 2;
			height = topSpace + bottomSpace + PADDING * 2;

			var ty = topSpace + PADDING;
			var tx = leftSpace + PADDING;
			// if more than 2 axis are fully shown
			// the gauge is considered as 'wide'
			var fullSize = maxRadius * 3 + PADDING * 4;
			if (fullSize < height + width) {
				isWide = true;
				width += PADDING * 2;
				height += PADDING * 2;
				ty += PADDING;
				tx += PADDING;
			}

			centerTranslation = 'translate(' + tx + ',' + ty + ')';
		}

		/**
		 * Render the gauge
		 */
		function render(configuration) {
			configure(configuration);

			renderContainer();

			// gauge arc
			var arcs = svg.append('g')//
			.attr('class', 'gauge-arc')//
			.attr('transform', centerTranslation);

			// gauge sectors
			var sectors = arcs.selectAll('path')//
			.data(colors).enter()//
			.append('path')//
			.attr('d', arcData);
			if (config.ring.colors) {
				sectors.attr('fill', function(d, i) {
					return arcColorFn(d * i);
				});
			}

			// gauge border
			if (config.ring.border) {
				arcs.append('path')//
				.attr('fill', 'none')//
				.attr('class', 'gauge-arc-border')//
				.attr('d', fullArcData);
			}

			// pointer
			var pointerLine = d3.svg.line().interpolate('monotone');
			var pointerContainer = svg.append('g')//
			.attr('class', 'gauge-pointer gauge-' + config.pointer.type)//
			.attr('transform', centerTranslation);
			if (config.pointer.type === 'filler') {
				pointer = pointerContainer.append('path');

			} else {
				if (config.pointer.type === 'needle') {
					pointer = pointerContainer.data([ [ [ 0, -NEEDLE_RADIUS ], [ 0, -config.pointer.needleLength / 2 ] ] ])//
					.append('path')//
					.attr('d', pointerLine);
					pointerContainer.append('circle')//
					.attr('r', NEEDLE_RADIUS);

				} else if (config.pointer.type === 'filament') {
					var top = radius - config.ring.shift - config.ring.width - config.pointer.filamentLength;
					var bottom = radius - config.ring.shift + config.pointer.filamentLength;
					pointer = pointerContainer.data([ [ [ 0, -top ], [ 0, -bottom ] ] ])//
					.append('path')//
					.attr('d', pointerLine);
				}
			}

			// labels
			var lg = svg.append('g')//
			.attr('class', 'gauge-label')//
			.attr('transform', centerTranslation)//
			.selectAll('text')//
			.data(labelData)//
			.enter()//
			.append('g')//
			.attr('transform', function(d) {
				var ratio = scale(d);
				var newAngle = config.ring.minAngle + (ratio * range);
				return 'rotate(' + newAngle + ') translate(0,' + (config.labels.shift - radius) + ')';
			})//
			.append('text')//
			.text(config.labels.formatter);

			// value display
			if (config.value.show) {
				var valueTx = config.value.shift;
				// placed between the two bounds
				var angle = config.ring.minAngle + Math.abs(range) / 2;
				if (isWide) {
					// keep centered
					valueTx = 0;
					angle = 0;
				}
				var translationTf = 'translate(0, ' + -valueTx + ')';

				var valueZone = svg.append('g')//
				.attr('class', 'gauge-value')//
				.attr('transform', centerTranslation + ' rotate(' + angle + ')')//
				.append('g')//
				.attr('transform', translationTf + ' rotate(' + -angle + ')')//
				.append('text');

				// value (dy required by IE that do not support
				// dominant-baseline
				valueLabel = valueZone.append('tspan').attr('dy', '0.4em');// 
				// value suffix
				valueZone.append('tspan')//
				.text(config.value.unit)//
				.attr('class', 'unit')//
				.attr('x', 0)//
				.attr('dy', '1em');
			}
		}

		/**
		 * Creates the gauge containers.<br>
		 * Mainly required by IE inefficiency
		 * (http://nicolasgallagher.com/canvas-fix-svg-scaling-in-internet-explorer/)
		 */
		function renderContainer() {
			svgContainer = d3.select(container)//

			// only for ie
			if (window.navigator.userAgent.match(/(MSIE|Trident|Edge)/)) {
				svgContainer//
				.classed('gauge-container', true);

				svgContainer.append('canvas')//
				.attr({
					'class' : 'gauge-ie-fix',
					width : width,
					height : height
				});

				ieHandleResizing();
			}

			// sufficient for other browsers
			svg = svgContainer.classed('wide-gauge', isWide)//
			.append('svg:svg')//
			.attr('class', 'gauge')//
			.attr('viewBox', '0 0 ' + width + ' ' + height)//
			.attr('preserveAspectRatio', 'xMinYMin meet');
		}

		/**
		 * IE does not always repaint gauges once resized, so we have to force
		 * it...
		 */
		function ieHandleResizing() {
			function debounce(callback, delay) {
				var timer = null;
				return function() {
					clearTimeout(timer);
					timer = setTimeout(function() {
						callback();
					}, delay);
				};
			}

			if (!ResponsiveGauge.ieListenerSet) {
				// force repaint by changing the height to the same height...
				window.addEventListener('resize', debounce(function() {
					var canvas = document.querySelectorAll('canvas');
					for (var i = 0; i < canvas.length; ++i) {
						var c = canvas[i];
						c.setAttribute('height', c.getAttribute('height'));
					}
				}, 250));
				// sets only one listener for the whole page
				ResponsiveGauge.ieListenerSet = true;
			}
		}

		/**
		 * Render the pointer part of the gauge
		 */
		function renderPointer(newValue) {
			// pointer
			if (config.pointer.type === 'filler') {
				var pointerArcData = getArcData(deg2rad(config.ring.minAngle),//
				deg2rad(getPointerRotation(newValue)),//
				config.pointer.fillerWidth, config.pointer.fillerShift);
				pointer.attr('d', pointerArcData);
			} else {
				pointer.//
				transition()//
				.duration(config.pointer.slowness)//
				.ease('elastic')//
				.attr('transform', 'rotate(' + getPointerRotation(newValue) + ')');
			}
		}

		/**
		 * Returns the angle of the pointer.
		 */
		function getPointerRotation(newValue) {
			// forces the value into the gauge's bounds
			var value = Math.max(newValue, config.data.min);
			value = Math.min(value, config.data.max);

			var ratio = scale(value);
			return config.ring.minAngle + (ratio * range);
		}

		/**
		 * Updates the displayed gauge
		 * 
		 */
		function update(newValue, newConfiguration) {
			newValue = (newValue === undefined ? 0 : newValue);

			// update pointer position
			renderPointer(newValue);

			// updates value label
			if (config.value.show) {
				valueLabel.text(config.value.formatter(newValue));
			}
		}

		render(configuration);
		update(config.data.value);

		return {
			update : update,
			getConfig : getReadOnlyConfig,
			container : svgContainer,

			/*
			 * Expose private functions for testing. Do not change the starting
			 * and ending comments; they are used to strip private functions
			 * from distribution file.
			 */
			/* start-test-code */
			deg2rad : deg2rad,
			computeTicks : computeTicks,
			merge : merge,
			createConfig : createConfig,
			computeLayout : computeLayout,
			width : width,
			height : height,
			centerTranslation : centerTranslation
		/* end-test-code */
		};
	}

	/***************************************************************************
	 * Exposing ResponsiveGauge
	 **************************************************************************/
	ResponsiveGauge.config = defaultConfig;

	// CommonJS module is defined
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = ResponsiveGauge;

		// RequireJS : returns the current instance
	} else if (typeof requirejs !== 'undefined') {
		return ResponsiveGauge;

		// vanilla JS : places the current instance in the root scope
	} else {
		// here, `this` means `window` in the browser, or `global` on the
		// server
		this.ResponsiveGauge = ResponsiveGauge;
	}
});

/*******************************************************************************
 * Initializing ResponsiveGauge dependencies
 ******************************************************************************/
// CommonJS : sets the dependencies
if (typeof module !== 'undefined' && module.exports) {
	var _d3 = require('d3');
	var _numbro = require('numbro');

	ResponsiveGaugeFactory(_d3, _numbro)

	// RequireJS : sets the dependencies url and define the module
} else if (typeof requirejs !== 'undefined') {

	// retrieve the protocol to allow use in a https page
	var protocol = document.location.protocol;
	protocol = (protocol === 'file:' ? 'http:' : protocol); // for local tests

	// loads CSS
	var cssId = 'responsive-gauge-css';
	if (!document.getElementById(cssId)) {
		var head = document.getElementsByTagName('head')[0];
		var link = document.createElement('link');
		link.id = cssId;
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = protocol + '//cdn.rawgit.com/DeepSilence/ResponsiveGauge/9c2fa1bdced20a59f84d9385eebefae489e2dce0/dist/ResponsiveGauge.min.css';
		link.media = 'all';
		head.appendChild(link);
	}

	requirejs.config({
		"paths" : {
			"d3" : protocol + "//cdn.jsdelivr.net/d3js/3.5.16/d3.min",
			"numbro" : protocol + "//cdnjs.cloudflare.com/ajax/libs/numbro/1.7.1/numbro.min"
		}
	});

	define([ 'd3', 'numbro' ], function(d3, numbro) {
		return ResponsiveGaugeFactory(d3, numbro);
	});

	// Vanilla : dependencies must be set on <head> of the page
} else {
	ResponsiveGaugeFactory.call(typeof window === 'undefined' ? this : window);
}
