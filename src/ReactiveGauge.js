/*!
 * ResponsiveGauge
 * version : 0.1.0
 * license : MIT
 * 
 */
(function() {
	'use strict';

	/* PRIVATE CONSTANTS */
	var PADDING = 6, NEEDLE_RADIUS = 2,
	// diameter of the gauge (including ticks and labels), used only as
	// reference for drawing; the actual size on screen depends on the size of
	// the gauge container
	GAUGE_DIAMETER = 100,
	// Number of parts of gauge to simulate a color gradient
	GRADIENT_ELT_NUMBER = 40,

	FORMATTER = numbro(),
	// formatter that will try to optimize the display on labels:
	// uses SI prefixes (G, M, k, µ, ...), and round values
	// depending the available space (related to config.labelNumber)
	DEFAULT_FORMAT = function(value) {
		if (this.FORMAT === undefined) {
			// sets the format regex
			if (this.labelDecimalsMax === 0) {
				this.FORMAT = this.labelMantissaMax + '.a';
			} else {
				var format = new Array(this.labelDecimalsMax + 1).join('0');
				this.FORMAT = this.labelMantissaMax + '.[' + format + ']a';
			}
		}

		var format = this.FORMAT;
		return FORMATTER.set(value).format(format);
	};

	/* DEFAULT CONFIGURATION, all size/position values are in % */
	var defaultConfig = {
		/* ring size */
		ringInset : 3,
		ringWidth : 7,
		minAngle : -90,
		maxAngle : 90,

		/* pointer types: 'needle', 'filament', 'filler' */
		pointerType : 'needle',
		pointerSlowness : 200,
		// for 'needle' pointers
		needleLength : 90,
		// for 'filament'
		filamentLength : 2,
		// for 'filler'
		fillerWidth : NaN, /* by default, as wide as ring */
		fillerInset : 0,

		/* gauge scale */
		minValue : 0,
		maxValue : 10,

		/* sectors */
		sectorsNumber : 5,

		/* labels */
		labelNumber : NaN, /* by default, as many as sectors */
		/* format function to apply (can use d3.format). context is the config */
		labelFormat : DEFAULT_FORMAT,
		/*
		 * If no custom labelFormat specified, number of mantissa digits before
		 * using SI units (Mega, Kilo...)
		 */
		labelMantissaMax : 4,
		/*
		 * If no custom labelFormat specified, limits the number of decimal
		 * digits of labels
		 */
		labelDecimalsMax : 0,
		labelInset : 0,

		/* colors */
		// 'smooth' for a gradient color gradient
		// 'sectors' for coloring on each sector (gradient)
		// [#111, #222, ...] for specifying the color of each sector
		// false (default) : no color (CSS color can be used)
		colors : false,
		startColor : '#ffebee',
		endColor : '#d50000',

		/* enables the border */
		border : false,

		/* enable value display */
		showValue : false,
		valueInset : 22,
	}

	var ReactiveGauge = function(container, configuration) {
		var config = {};

		/* MISC VALUES */
		var radius = GAUGE_DIAMETER / 2;
		var range = undefined;
		var scale = undefined;

		/* ELEMENTS */
		var valueLabel = undefined;
		var svg = undefined;
		var pointer = undefined;

		/* DATA */
		var arcData = undefined;
		var fullArcData = undefined;
		var labelData = undefined;

		/* COLORS */
		var colors = undefined;
		var arcColorFn = undefined;
		
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
		var tx = 0;
		var ty = 0;

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
			if (isNaN(config.labelNumber)) {
				config.labelNumber = config.sectorsNumber;
			}
			if (config.labelNumber === 0) {
				return [];
			}

			var step = (config.maxValue - config.minValue) / (config.labelNumber - 1);
			var ticks = d3.range(config.minValue, config.maxValue, step);
			ticks.push(config.maxValue);
			return ticks;
		}

		/**
		 * Do config related computations
		 */
		function configure(configuration) {
			// merge default config and custom config
			for ( var prop in defaultConfig) {
				config[prop] = defaultConfig[prop];
			}
			for ( var prop in configuration) {
				config[prop] = configuration[prop];
				if (defaultConfig[prop] == undefined) {
					console.warn('Config property ' + prop + ' is unknwon');
				}
			}
			// reset format
			config.FORMAT == undefined;

			range = config.maxAngle - config.minAngle;
			computeLayout();

			// a linear scale that maps domain values to a percent from 0..1
			scale = d3.scale.linear().range([ 0, 1 ]).domain([ config.minValue, config.maxValue ]);

			// label ticks
			labelData = computeTicks();

			// coloring / gradient
			if (config.colors.constructor === Array) {
				colors = d3.range(config.sectorsNumber).map(function() {
					return 1 / config.sectorsNumber
				});
				arcColorFn = function(i) {
					/* fix me : ugly */
					var index = Math.floor(i * config.sectorsNumber);
					index = Math.min(index, config.colors.length - 1);
					return config.colors[index];
				}
			} else if (config.colors) {
				if (config.colors === 'gradient') {
					colors = d3.range(GRADIENT_ELT_NUMBER).map(function() {
						return 1 / GRADIENT_ELT_NUMBER
					});
				} else {
					colors = d3.range(config.sectorsNumber).map(function() {
						return 1 / config.sectorsNumber
					});
				}
				arcColorFn = d3.interpolateHsl(d3.rgb(config.startColor), d3.rgb(config.endColor));
			} else {
				colors = [ 1 ];
			}

			// sectors of the arc
			arcData = getArcData(function(d, i) {
				var ratio = d * i;
				// - 0.5 allow shapes borders collapse
				return deg2rad(config.minAngle + (ratio * range) - 0.5);
			}, function(d, i) {
				var ratio = d * (i + 1);
				return deg2rad(config.minAngle + (ratio * range));
			}, config.ringWidth, config.ringInset);

			// complete arc for the border drawing
			if (config.border) {
				fullArcData = getArcData(deg2rad(config.minAngle), deg2rad(config.maxAngle), config.ringWidth, config.ringInset);
			}

			// Pointer
			if (config.pointerType === 'filler' && isNaN(config.fillerWidth)) {
				config.fillerWidth = config.ringWidth;
				config.fillerInset = config.ringInset;
			}
		}

		/**
		 * Creates an arc data starting and ending at the specified angles
		 */
		function getArcData(startAngle, endAngle, width, inset) {
			return d3.svg.arc()//
			.innerRadius(radius - width - inset)//
			.outerRadius(radius - inset)//
			.startAngle(startAngle)//
			.endAngle(endAngle);
		}

		/**
		 * Return TRUE if the gauge is already rendered
		 */
		function isRendered() {
			return (svg !== undefined);
		}

		/**
		 * Note : calculates ideal size of the gauge depending its min&max
		 * angles along with the required translations to draw it. Assumes
		 * minAngle>=-90 and maxAngle<=450, and range <=360
		 */
		function computeLayout() {
			// manage space for long labels
			var padding = PADDING;
			var minAngle = config.minAngle;
			var maxAngle = config.maxAngle;

			function biggestSpace(angleShift) {
				return Math.max(0, size(minAngle + angleShift), size(maxAngle + angleShift))
			}
			function size(angle) {
				return radius * Math.sin(deg2rad(angle));
			}

			var leftSpace = 0;
			var rightSpace = 0;
			var topSpace = 0;
			var bottomSpace = 0;
			// computes quarters totally covered by the gauges :
			// if min and max angles are on both sides of an axis,
			// then the summit of the arc require all available space
			// FIXME : more elegant way to do this (xxxSpaces in an array with
			// indexes mapped to angles?)
			if (minAngle <= 0) {
				if (maxAngle >= 0) {
					topSpace = radius;
				}
				if (maxAngle >= 90) {
					rightSpace = radius;
				}
				if (maxAngle >= 180) {
					bottomSpace = radius;
				}
				if (maxAngle >= 270) {
					leftSpace = radius;
				}
			} else if (minAngle <= 90) {
				if (maxAngle >= 90) {
					rightSpace = radius;
				}
				if (maxAngle >= 180) {
					bottomSpace = radius;
				}
				if (maxAngle >= 270) {
					leftSpace = radius;
				}
			} else if (minAngle <= 180) {
				if (maxAngle >= 180) {
					bottomSpace = radius;
				}
				if (maxAngle >= 270) {
					leftSpace = radius;
				}
				if (maxAngle >= 360) {
					topSpace = radius;
				}
			} else if (minAngle <= 270 && maxAngle >= 270) {
				leftSpace = radius;
			}

			// computes quarters not totally covered by the gauge
			if (leftSpace == 0) {
				// left space is the space needed to display the left part of
				// the gauge, ie the part between 0° and minAngle, or the part
				// between 180° and maxAngle
				leftSpace = biggestSpace(180);
			}
			if (rightSpace == 0) {
				rightSpace = biggestSpace(0);
			}
			if (topSpace == 0) {
				topSpace = biggestSpace(90);
			}
			if (bottomSpace == 0) {
				bottomSpace = biggestSpace(-90);
			}
			// console.log('leftSpace', leftSpace);
			// console.log('topSpace', topSpace);
			// console.log('rightSpace', rightSpace);
			// console.log('bottomSpace', bottomSpace);

			width = leftSpace + rightSpace + padding * 2;
			height = topSpace + bottomSpace + padding * 2;
			// console.log('width', width);
			// console.log('height', height);

			ty = topSpace + padding;
			tx = leftSpace + padding;
			// console.log('ty', ty);
			// console.log('tx', tx);

			// computes some flags
			var fullSize = radius * 2 + padding * 2;
			if (fullSize == height && fullSize == width) {
				isWide = true;
			}
		}

		function render(configuration) {
			configure(configuration);

			svg = d3.select(container)//
			.classed('gauge-360', (range === 360))//
			.append('svg:svg')//
			.attr('class', 'gauge')//
			.attr('viewBox', '0 0 ' + width + ' ' + height)//
			.attr('preserveAspectRatio', 'xMinYMin meet');

			var centerTx = 'translate(' + tx + ',' + ty + ')';

			// gauge arc
			var arcs = svg.append('g')//
			.attr('class', 'gauge-arc')//
			.attr('transform', centerTx);

			// gauge sectors
			var sectors = arcs.selectAll('path')//
			.data(colors).enter()//
			.append('path')//
			.attr('d', arcData);
			if (config.colors) {
				sectors.attr('fill', function(d, i) {
					return arcColorFn(d * i);
				});
			}

			// gauge border
			if (config.border) {
				arcs.append('path')//
				.attr('fill', 'none')//
				.attr('class', 'gauge-arc-border')//
				.attr('d', fullArcData);
			}

			// pointer
			var pointerLine = d3.svg.line().interpolate('monotone');
			var pointerContainer = svg.append('g')//
			.attr('class', 'gauge-pointer gauge-' + config.pointerType)//
			.attr('transform', centerTx)//
			if (config.pointerType === 'filler') {
				pointer = pointerContainer.append('path');

			} else {
				if (config.pointerType === 'needle') {
					pointer = pointerContainer.data([ [ [ 0, -NEEDLE_RADIUS ], [ 0, -config.needleLength / 2 ] ] ])//
					.append('path')//
					.attr('d', pointerLine);
					pointerContainer.append('circle')//
					.attr('r', NEEDLE_RADIUS);

				} else if (config.pointerType === 'filament') {
					var top = radius - config.ringInset - config.ringWidth - config.filamentLength;
					var bottom = radius - config.ringInset + config.filamentLength;
					pointer = pointerContainer.data([ [ [ 0, -top ], [ 0, -bottom ] ] ])//
					.append('path')//
					.attr('d', pointerLine);
				}
			}

			// labels
			var lg = svg.append('g')//
			.attr('class', 'gauge-label')//
			.attr('transform', centerTx)//
			.selectAll('text')//
			.data(labelData)//
			.enter()//
			.append('text')//
			.attr('transform', function(d) {
				var ratio = scale(d);
				var newAngle = config.minAngle + (ratio * range);
				var transform = 'rotate(' + newAngle + ') translate(0,' + (config.labelInset - radius) + ')';
				/* more space = zoom out = need bigger font */
				if (isWide) {
					transform += ' scale(2,2)';
				}

				return transform;
			})//
			.text(config.labelFormat.bind(config));

			// value display
			if (config.showValue) {
				var valueTx = config.valueInset;
				// placed between the two bounds
				var angle = config.minAngle + Math.abs(range) / 2;
				var fontScale = 3;
				if (isWide) {
					fontScale *= 2; /* more space = zoom out = need bigger font */
					// keep centered
					valueTx = 0;
					angle = 0;
				}
				var translationTf = 'translate(0, ' + -valueTx + ')';

				valueLabel = svg.append('g')//
				.attr('class', 'gauge-value')//
				.attr('transform', centerTx + ' rotate(' + angle + ')')//
				.append('text')//
				.attr('transform', translationTf //
						+ ' scale(' + fontScale + ',' + fontScale + ')' //
						+ ' rotate(' + -angle + ')');
			}
		}

		function renderPointer(newValue) {
			// pointer
			if (config.pointerType === 'filler') {
				var pointerArcData = getArcData(deg2rad(config.minAngle),//
				deg2rad(getPointerRotation(newValue)),//
				config.fillerWidth, config.fillerInset);
				pointer.attr('d', pointerArcData);
			} else {
				pointer.//
				transition()//
				.duration(config.pointerSlowness)//
				.ease('elastic')//
				.attr('transform', 'rotate(' + getPointerRotation(newValue) + ')');
			}
		}

		/**
		 * Updates the displayed gauge
		 * 
		 */
		function update(newValue, newConfiguration) {
			newValue === undefined ? 0 : newValue;

			// if update is actually the first gauge display or need a full
			// redraw
			if (!isRendered() || newConfiguration) {
				render(newConfiguration);
			}

			// update pointer position
			renderPointer(newValue);

			// updates value label
			if (config.showValue) {
				valueLabel.text(config.labelFormat(newValue));
			}
		}

		/**
		 * Returns the angle of the pointer.
		 */
		function getPointerRotation(newValue) {
			// forces the value into the gauge's bounds
			var value = Math.max(newValue, config.minValue);
			value = Math.min(value, config.maxValue);

			var ratio = scale(value);
			return config.minAngle + (ratio * range);
		}

		render(configuration);
		update(0);

		return {
			isRendered : isRendered,
			update : update
		}
	}

	/***************************************************************************
	 * Exposing ReactiveGauge
	 **************************************************************************/
	ReactiveGauge.config = defaultConfig;

	// CommonJS module is defined
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = ReactiveGauge;
	} else {
		/* global ender:false */
		if (typeof ender === 'undefined') {
			// here, `this` means `window` in the browser, or `global` on the
			// server
			this.ReactiveGauge = ReactiveGauge;
		}

		/* global define:false */
		if (typeof define === 'function' && define.amd) {
			define([], function() {
				return ReactiveGauge;
			});
		}
	}
}.call(typeof window === 'undefined' ? this : window));