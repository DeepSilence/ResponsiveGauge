/*!
 * ResponsiveGauge
 * version : 0.1.0
 * license : MIT
 * author : Mikaël Restoux
 * 
 */
var ReactiveGaugeFactory = (function(_d3, _numbro) {
	'use strict';

	// handle dependencies injection using requireJS
	if (typeof d3 === 'undefined') {
		d3 = _d3;
	}
	if (typeof numbro === 'undefined') {
		numbro = _numbro;
	}

	/* PRIVATE CONSTANTS */
	var PADDING = 6;
	var NEEDLE_RADIUS = 2;
	// diameter of the gauge (including ticks and labels), used only as
	// reference for drawing; the actual size on screen depends on the size of
	// the gauge container
	var GAUGE_DIAMETER = 100;
	// Number of parts of gauge to simulate a color gradient
	var GRADIENT_ELT_NUMBER = 40;

	var FORMATTER = numbro();
	// formatter that will try to optimize the display on labels:
	// uses SI prefixes (G, M, k, µ, ...), and round values
	// depending the available space (related to config.labelNumber)
	var DEFAULT_FORMAT = function(value) {
		if (this.FORMAT === undefined) {
			// sets the format regex
			if (this.labelDecimalsMax === 0) {
				this.FORMAT = this.labelMantissaMax + '.a';
			} else {
				var decimals = new Array(this.labelDecimalsMax + 1).join('0');
				this.FORMAT = this.labelMantissaMax + '.[' + decimals + ']a';
			}
		}

		return FORMATTER.set(value).format(this.FORMAT);
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
		// suffix for the displayed value
		valueSuffix : ''
	};

	var ReactiveGauge = function(container, configuration) {
		var config = {};

		/* MISC VALUES */
		var radius = GAUGE_DIAMETER / 2;
		var range = undefined;
		var scale = undefined;

		/* ELEMENTS */
		var valueLabel = undefined;
		var svgContainer = undefined;
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
				if (defaultConfig[prop] === undefined) {
					console.warn('Config property ' + prop + ' is unknwon');
				}
			}
			// reset format
			config.FORMAT = undefined;

			range = config.maxAngle - config.minAngle;
			computeLayout();

			// a linear scale that maps domain values to a percent from 0..1
			scale = d3.scale.linear().range([ 0, 1 ]).domain([ config.minValue, config.maxValue ]);

			// label ticks
			labelData = computeTicks();

			// coloring / gradient
			if (config.colors.constructor === Array) {
				colors = d3.range(config.sectorsNumber).map(function() {
					return 1 / config.sectorsNumber;
				});
				arcColorFn = function(i) {
					/* fix me : ugly */
					var index = Math.floor(i * config.sectorsNumber);
					index = Math.min(index, config.colors.length - 1);
					return config.colors[index];
				};
			} else if (config.colors) {
				if (config.colors === 'gradient') {
					colors = d3.range(GRADIENT_ELT_NUMBER).map(function() {
						return 1 / GRADIENT_ELT_NUMBER;
					});
				} else {
					colors = d3.range(config.sectorsNumber).map(function() {
						return 1 / config.sectorsNumber;
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
		 * Returns a readonly access to the actual config (use update() to
		 * modify the config)
		 */
		function getReadOnlyConfig() {
			var configClone = JSON.parse(JSON.stringify(config));
			Object.freeze(configClone);
			return configClone;
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

			function spaces(angleShift) {
				// space is the space needed to display the part of
				// the gauge, ie for the right space, the part between 0° and
				// minAngle, or the part
				// between 180° and maxAngle
				return [ size(minAngle + angleShift), size(maxAngle + angleShift) ];
			}
			function size(angle) {
				return radius * Math.sin(deg2rad(angle));
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
					topSpace = radius;
					break;
				case 1:
					rightSpace = radius;
					break;
				case 2:
					bottomSpace = radius;
					break;
				case 3:
					leftSpace = radius;
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

			// if more than 2 axis are fully shown
			// the gauge is considered as 'wide'
			var fullSize = radius * 3 + padding * 4;
			if (fullSize < height + width) {
				isWide = true;
			}
		}

		/**
		 * Render the gauge
		 */
		function render(configuration) {
			configure(configuration);

			svgContainer = d3.select(container)//
			.classed('wide-gauge', isWide);

			svg = svgContainer.append('svg:svg')//
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
			.attr('transform', centerTx);
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
			.append('g')//
			.attr('transform', function(d) {
				var ratio = scale(d);
				var newAngle = config.minAngle + (ratio * range);
				return 'rotate(' + newAngle + ') translate(0,' + (config.labelInset - radius) + ')';
			})//
			.append('text')//
			.text(config.labelFormat.bind(config));

			// value display
			if (config.showValue) {
				var valueTx = config.valueInset;
				// placed between the two bounds
				var angle = config.minAngle + Math.abs(range) / 2;
				if (isWide) {
					// keep centered
					valueTx = 0;
					angle = 0;
				}
				var translationTf = 'translate(0, ' + -valueTx + ')';

				var valueZone = svg.append('g')//
				.attr('class', 'gauge-value')//
				.attr('transform', centerTx + ' rotate(' + angle + ')')//
				.append('g')//
				.attr('transform', translationTf + ' rotate(' + -angle + ')')//
				.append('text');
				// value
				valueLabel = valueZone.append('tspan');
				// value suffix
				valueZone.append('tspan')//
				.text(config.valueSuffix)//
				.attr('class', 'unit')//
				.attr('x', 0)//
				.attr('dy', '1em');
			}
		}

		/**
		 * Render the pointer part of the gauge
		 */
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
			newValue = (newValue === undefined ? 0 : newValue);

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
			computeTicks : computeTicks
		/* end-test-code */
		};
	}

	/***************************************************************************
	 * Exposing ReactiveGauge
	 **************************************************************************/
	ReactiveGauge.config = defaultConfig;

	// CommonJS module is defined
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = ReactiveGauge;

	} else if (typeof requirejs !== 'undefined') {
		return ReactiveGauge;

		// vanilla JS
	} else {
		// here, `this` means `window` in the browser, or `global` on the
		// server
		this.ReactiveGauge = ReactiveGauge;
	}
});

/*******************************************************************************
 * Initializing ReactiveGauge dependencies
 ******************************************************************************/

// CommonJS : sets the dependencies
if (typeof module !== 'undefined' && module.exports) {
	const
	d3 = require('d3');
	const
	numbro = require('numbro');

	ReactiveGaugeFactory(d3, numbro)

	// RequireJS : sets the dependencies url and define the module
} else if (typeof requirejs !== 'undefined') {

	// retrieve the protocol to allow use in a https page
	var protocol = document.location.protocol;
	// required when testing locally
	protocol = (protocol === 'file:' ? 'http:' : protocol);

	requirejs.config({
		"paths" : {
			"d3" : protocol + "//cdn.jsdelivr.net/d3js/3.5.16/d3.min",
			"numbro" : protocol + "//cdnjs.cloudflare.com/ajax/libs/numbro/1.7.1/numbro.min"
		}
	});

	define([ 'd3', 'numbro' ], function(d3, numbro) {
		return ReactiveGaugeFactory(d3, numbro);
	});

	// CommonJS and vanilla : start the factory
} else {
	ReactiveGaugeFactory.call(typeof window === 'undefined' ? this : window);
}
