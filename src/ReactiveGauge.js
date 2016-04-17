/*This code is released under the MIT license.

Copyright (C) 2012 Matt Magoffin
http://bl.ocks.org/msqr/3202712

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
ReactiveGauge = function(container, configuration) {
	var config = {};

	/* MISC VALUES */
	var radius = ReactiveGauge.GAUGE_DIAMETER / 2;
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
	var gradient = undefined;
	var arcColorFn = undefined;
	/**
	 * Indicates the gauge will have a rectangular layout
	 */
	var isRectangular = false;
	/**
	 * Indicates the gauge will have a vertical rectangular layout
	 */
	var isVertical = false;
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

	var donut = d3.layout.pie();

	function deg2rad(deg) {
		return deg * Math.PI / 180;
	}

	/**
	 * Do config related computations
	 */
	function configure(configuration) {
		// merge default config and custom config
		for ( var prop in ReactiveGauge.defaultConfig) {
			config[prop] = ReactiveGauge.defaultConfig[prop];
		}
		for ( var prop in configuration) {
			config[prop] = configuration[prop];
			if (ReactiveGauge.defaultConfig[prop] == undefined) {
				console.warn('Config property ' + prop + ' is unknwon');
			}
		}

		range = config.maxAngle - config.minAngle;
		computeLayout();

		// a linear scale that maps domain values to a percent from 0..1
		scale = d3.scale.linear().range([ 0, 1 ]).domain([ config.minValue, config.maxValue ]);

		// label ticks
		if (isNaN(config.labelNumber)) {
			config.labelNumber = config.sectorsNumber;
			labelData = scale.ticks(config.labelNumber);
		} else {
			labelData = scale.ticks(config.labelNumber - 1);
		}

		// coloring / gradient
		if (config.gradient.constructor === Array) {
			gradient = d3.range(config.sectorsNumber).map(function() {
				return 1 / config.sectorsNumber
			});
			arcColorFn = function(i) {
				/* fix me : ugly */
				var index = Math.floor(i * config.sectorsNumber);
				index = Math.min(index, config.gradient.length - 1);
				return config.gradient[index];
			}
		} else if (config.gradient) {
			if (config.gradient === 'smooth') {
				gradient = d3.range(ReactiveGauge.GRADIENT_ELT_NUMBER).map(function() {
					return 1 / ReactiveGauge.GRADIENT_ELT_NUMBER
				});
			} else {
				gradient = d3.range(config.sectorsNumber).map(function() {
					return 1 / config.sectorsNumber
				});
			}
			arcColorFn = d3.interpolateHsl(d3.rgb(config.startColor), d3.rgb(config.endColor));
		} else {
			gradient = [ 1 ];
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

	function isRendered() {
		return (svg !== undefined);
	}

	/**
	 * Note : calculates ideal size of the gauge depending its min&max angles
	 * along with the required translations to draw it. To ehance : grows size
	 * by quarters of circle, and assumes minAngle < maxAngle
	 */
	function computeLayout() {
		var padding = 0;// ReactiveGauge.GAUGE_DIAMETER / 20;// manage space
		// for long labels

		// Actual size depends on the min&max angles
		var angle = Math.abs(range);

		// size
		if (angle <= 90) {
			width = radius;
			height = radius;
		} else if (angle > 90 && angle <= 180) {
			isRectangular = true;
			// handles vertical display
			if (config.minAngle % 180 === 0) {
				isVertical = true;
				width = radius + padding;
				height = radius * 2;
			} else {
				width = radius * 2;
				height = radius + padding;
			}
		}
		if (angle > 180) {
			isWide = true;
			width = radius * 2;
			height = radius * 2;
		}

		// TRANSLATION
		// simple case : gauge is centered
		tx = 150;
		ty = 150;
		// complex case : only a quarter or a half of circle
		if (angle <= 90 || angle === 180) {
			// 'left' space is not used
			if (config.minAngle == 0 || config.maxAngle == 180) {
				tx = 0;
			}
			// 'bottom' space is not used
			if (config.minAngle == 90 || config.maxAngle == 270) {
				ty = 0;
			}
		}
	}

	function render(configuration) {
		configure(configuration);

		svg = d3.select(container)//
		.classed('gauge-vertical', isVertical)//
		.classed('gauge-360', (range === 360))//
		.append('svg:svg')//
		.attr('class', 'gauge')//
		.attr('viewBox', '0 0 ' + width + ' ' + height)//
		.attr('preserveAspectRatio', 'xMinYMin meet');

		var centerTx = 'translate(' + tx + ',' + ty + ')';

		// gauge arc
		var arcs = svg.append('g')//
		.attr('class', 'arc')//
		.attr('transform', centerTx);

		// gauge sectors
		var sectors = arcs.selectAll('path')//
		.data(gradient).enter()//
		.append('path')//
		.attr('d', arcData);
		if (config.gradient) {
			sectors.attr('fill', function(d, i) {
				return arcColorFn(d * i);
			});
		}

		// gauge border
		if (config.border) {
			arcs.append('path')//
			.attr('fill', 'none')//
			.attr('class', 'arc-border')//
			.attr('d', fullArcData);
		}

		// pointer
		if (config.pointerType === 'filler') {
			pointer = svg.append('g')//
			.attr('class', 'pointer ' + config.pointerType)//
			.attr('transform', centerTx)//
			.append('path');
		} else {
			if (config.pointerType === 'needle') {
				var needleHeadLength = Math.round(radius - config.needleLengthInset);
				var lineData = [ [ config.needleWidth / 2, 0 ],//
				[ 0, -needleHeadLength ],//
				[ -(config.needleWidth / 2), 0 ],//
				[ 0, config.needleTailLength ],//
				[ config.needleWidth / 2, 0 ] ];
			} else if (config.pointerType === 'filament') {
				var lineData = [ [ 0, -(radius - config.ringInset - config.ringWidth - config.filamentLengthMargin) ],//
				[ 0, -(radius - config.ringInset + config.filamentLengthMargin) ] ];
			}
			var pointerLine = d3.svg.line().interpolate('monotone');
			pointer = svg//
			.append('g')//
			.data([ lineData ])//
			.attr('class', 'pointer ' + config.pointerType)//
			.attr('transform', centerTx)//
			.append('path')//
			.attr('d', pointerLine);
		}

		// labels
		var lg = svg.append('g')//
		.attr('class', 'label')//
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
		.text(config.labelFormat);

		// value display
		if (config.showValue) {
			var valueTx = config.valueInset;
			var valueTy = -config.valueInset;
			var angle = config.minAngle;
			var fontScale = 3;
			if (isWide) {
				fontScale *= 2; /* more space = zoom out = need bigger font */
				valueTx = 0; /* do not shift vertically */
				angle = 0; /* keep centered */
			}
			if (isRectangular) {
				valueTy = 0; /* do not shift laterally */
			}
			var translationTf = 'translate(' + valueTx + ',' + valueTy + ')';

			valueLabel = svg.append('g')//
			.attr('class', 'value')//
			.attr('transform', centerTx)//
			.append('text').attr('transform', 'rotate(' + angle + ') ' //
					+ translationTf //
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
			valueLabel.text(newValue);
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
};

/* PRIVATE CONSTANTS */
ReactiveGauge.DEFAULT_POINTER_WIDTH = 10;
// diameter of the gauge (including ticks and labels), used only as
// reference for drawing
// the actual size on screen depends on the size of the gauge container
ReactiveGauge.GAUGE_DIAMETER = 300;
// Number of parts of gauge to simulate a color gradient
ReactiveGauge.GRADIENT_ELT_NUMBER = 70;

/* DEFAULT CONFIGURATION */
ReactiveGauge.defaultConfig = {
	/* ring size */
	ringInset : 10,
	ringWidth : 20,
	minAngle : -90,
	maxAngle : 90,

	/* pointer types: 'needle', 'filament', 'filler' */
	pointerType : 'needle',
	pointerSlowness : 200,
	// for 'needle' pointers
	needleWidth : ReactiveGauge.DEFAULT_POINTER_WIDTH,
	needleTailLength : ReactiveGauge.DEFAULT_POINTER_WIDTH / 2,
	needleLengthInset : 15,
	// for 'filament'
	filamentLengthMargin : 5,
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
	labelFormat : d3.format(',g'),
	labelInset : 0,

	/* colors */
	// 'smooth' for a smooth color gradient
	// 'sectors' for coloring on each sector (gradient)
	// [#111, #222, ...] for specifying the color of each sector
	// false (default) : uses the CSS color
	gradient : false,
	startColor : '#ffebee',
	endColor : '#d50000',

	/* enables the border */
	border : false,

	/* enable value display */
	showValue : false,
	valueInset : 40
};