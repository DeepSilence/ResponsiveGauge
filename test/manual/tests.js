/*******************************************************************************
 * LOADS THE REQUIRED DEPEDENCIES
 * 		- call the test page with '?requireJS' to test the requireJS definition of ResponsiveGauge
 * 		- call it without parameter to test it as vanilla js
 * 
 ******************************************************************************/
/**
 * Loads a script
 */
var createScript = function(src, data) {
	var promise = new Promise(function(res, rej) {
		var script = document.createElement('script');
		script.src = src;
		if (data) {
			script.dataset.main = data;
		}
		script.onload = res;
		head.appendChild(script);
	});

	return promise;
};

/**
 * Loads the required scripts depending the environment tested
 */
var mode = document.location.search.slice(1);
var head = document.head;
// requireJS : loads the lib, require the gauges and start the tests
if (mode === 'requireJS') {
	createScript('lib/require.min.js', '../../dist/ResponsiveGauge.min').then(function() {
		require([ 'ResponsiveGauge.min' ], function(ResponsiveGauge) {
			this.ResponsiveGauge = ResponsiveGauge;
			startTests();
		});
	});

	// vanilla : sets the dependencies in <HEAD> then start the tests
} else {
	// retrieve the protocol to allow use in a https page
	var protocol = document.location.protocol;
	protocol = (protocol === 'file:' ? 'http:' : protocol); // for local test

	// load css
	var head = document.getElementsByTagName('head')[0];
	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = '../../dist/ResponsiveGauge.min.css';
	head.appendChild(link);

	// load dependencies
	var promD3 = createScript(protocol + "//cdn.jsdelivr.net/d3js/3.5.16/d3.min.js");
	var promNumbro = createScript(protocol + "//cdnjs.cloudflare.com/ajax/libs/numbro/1.7.1/numbro.min.js");

	Promise.all([ promD3, promNumbro ]).then(function() {
		// createScript('../../src/ResponsiveGauge.js').then(setTimeout(startTests,
		// 100));
		createScript('../../dist/ResponsiveGauge.min.js').then(setTimeout(startTests, 100));
	});
}

function startTests() {
	/***************************************************************************
	 * GAUGES CONFIG
	 **************************************************************************/
	// default config for the tests
	ResponsiveGauge.config.colors = 'gradient';
	ResponsiveGauge.config.minAngle = 0;
	ResponsiveGauge.config.maxAngle = 90;
	ResponsiveGauge.config.maxValue = 800;

	/**
	 * Generate configs for angles checks gauges.
	 */
	function getAngleCheckConfig(minAngle, maxAngle, otherConfig) {
		var config = {
			minAngle : minAngle,
			maxAngle : maxAngle,
			minValue : minAngle,
			maxValue : maxAngle
		};

		for ( var prop in otherConfig) {
			config[prop] = otherConfig[prop];
		}

		return config;
	}

	/***************************************************************************
	 * GAUGES INITIALIZATION
	 **************************************************************************/

	var gauges = [];

	// quarters
	gauges.push(ResponsiveGauge('#qgauge1', getAngleCheckConfig(-90, 0)));
	gauges.push(ResponsiveGauge('#qgauge2', getAngleCheckConfig(0, 90)));
	gauges.push(ResponsiveGauge('#qgauge3', getAngleCheckConfig(90, 180)));
	gauges.push(ResponsiveGauge('#qgauge4', getAngleCheckConfig(180, 270)));

	// halves
	gauges.push(ResponsiveGauge('#hgauge1', getAngleCheckConfig(-90, 90)));
	gauges.push(ResponsiveGauge('#hgauge2', getAngleCheckConfig(90, 270)));
	gauges.push(ResponsiveGauge('#hgauge3', getAngleCheckConfig(180, 360)));
	gauges.push(ResponsiveGauge('#hgauge4', getAngleCheckConfig(0, 180)));

	// three quarters
	gauges.push(ResponsiveGauge('#tgauge1', getAngleCheckConfig(-90, 180)));
	gauges.push(ResponsiveGauge('#tgauge2', getAngleCheckConfig(0, 270)));
	gauges.push(ResponsiveGauge('#tgauge3', getAngleCheckConfig(90, 360)));
	gauges.push(ResponsiveGauge('#tgauge4', getAngleCheckConfig(180, 450)));

	// full
	gauges.push(ResponsiveGauge('#fgauge', getAngleCheckConfig(0, 360)));

	// custom angles (quarters)
	gauges.push(ResponsiveGauge('#custom-quarter-gauge1', getAngleCheckConfig(-80, -10)));
	gauges.push(ResponsiveGauge('#custom-quarter-gauge2', getAngleCheckConfig(20, 70)));
	gauges.push(ResponsiveGauge('#custom-quarter-gauge3', getAngleCheckConfig(100, 170)));
	gauges.push(ResponsiveGauge('#custom-quarter-gauge4', getAngleCheckConfig(210, 230, {
		labelNumber : 2
	})));

	// custom angles (halves)
	gauges.push(ResponsiveGauge('#custom-half-gauge1', getAngleCheckConfig(-45, 45)));
	gauges.push(ResponsiveGauge('#custom-half-gauge2', getAngleCheckConfig(20, 130)));
	gauges.push(ResponsiveGauge('#custom-half-gauge3', getAngleCheckConfig(100, 223)));
	gauges.push(ResponsiveGauge('#custom-half-gauge4', getAngleCheckConfig(210, 300)));

	// custom angles (three quarters)
	gauges.push(ResponsiveGauge('#custom-three-gauge1', getAngleCheckConfig(260, 550)));
	gauges.push(ResponsiveGauge('#custom-three-gauge2', getAngleCheckConfig(20, 223)));
	gauges.push(ResponsiveGauge('#custom-three-gauge3', getAngleCheckConfig(100, 300)));
	gauges.push(ResponsiveGauge('#custom-three-gauge4', getAngleCheckConfig(210, 390)));

	// COLORS / GRADIENTS
	gauges.push(ResponsiveGauge('#gradient-gauge', {
		colors : 'gradient'
	}));
	gauges.push(ResponsiveGauge('#sector-gradient-gauge', {
		colors : 'sectors'
	}));
	gauges.push(ResponsiveGauge('#custom-sectors-gauge', {
		colors : [ '#FFF', '#FFF', '#FFF', '#FF7C88', '#D50000' ],
		border : true
	}));

	// BORDERS
	gauges.push(ResponsiveGauge('#without-border-gauge', {
		colors : [ '#FFF' ]
	}));
	gauges.push(ResponsiveGauge('#with-border-gauge', {
		colors : [ '#FFF' ],
		border : true
	}));

	// SIZE AND POSITION
	gauges.push(ResponsiveGauge('#wide-gauge', {
		ringShift : 0,
		ringWidth : 14,
		labelShift : 8,
		pointerType : 'filament'
	}));
	gauges.push(ResponsiveGauge('#inner-label-gauge', {
		ringShift : 0,
		ringWidth : 7,
		labelShift : 12,
		needleLength : 75
	}));
	gauges.push(ResponsiveGauge('#no-gauge', {
		labelShift : 0,
		ringShift : 5,
		ringWidth : 0.5,
		fillerWidth : 7,
		fillerShift : 2,
		pointerType : 'filler',
		colors : false
	}));
	gauges.push(ResponsiveGauge('#bi-gauge', {
		labelShift : 9,
		pointerType : 'filler',
		fillerShift : 12,
		fillerWidth : 6,
		ringShift : 10,
		ringWidth : 2,
		valueShift : 15,
		colors : false
	}));

	// LABELS
	gauges.push(ResponsiveGauge('#no-label-gauge', {
		labelNumber : 0
	}));
	gauges.push(ResponsiveGauge('#long-label-gauge', {
		labelNumber : 8,
		maxValue : 100000
	}));
	gauges.push(ResponsiveGauge('#custom-labels-gauge', {
		labelNumber : 2,
		colors : 'sectors'
	}))
	gauges.push(ResponsiveGauge('#suffixed-label-gauge', {
		valueUnit : 'km/h'
	}));

	// POINTERS
	gauges.push(ResponsiveGauge('#needle-pointer-gauge', {
		pointerType : 'needle'
	}));
	gauges.push(ResponsiveGauge('#filament-pointer-gauge', {
		pointerType : 'filament'
	}));
	gauges.push(ResponsiveGauge('#filler-pointer-gauge', {
		pointerType : 'filler',
		colors : false
	}));
	gauges.push(ResponsiveGauge('#slow-pointer-gauge', {
		pointerSlowness : 1000
	}));
	
	// DEMO PAGE 
	// header
	ResponsiveGauge('#example-header-gauge', {
		minAngle : -90,
		maxAngle : 90,
		minValue : 0,
		maxValue : 1000000,
		labelNumber : 11,
		pointerType : 'filler',
		ringShift : 1,
		ringWidth : 20,
		colors : false,
		value : 318093,
		valueShift : 4,
		labelMantissaMax : 4,
		valueDecimalsMax : 0
	});
	// half gauge
	var percentFormatter = function(value) {
		return value + '%'
	};
	ResponsiveGauge('#example-half-gauge', {
		pointerType : 'filament',
		minAngle : -45,
		maxAngle : 45,
		minValue : 0,
		maxValue : 100,
		colors : 'gradient',
		startColor : '#FFF',
		endColor : '#63c4ca',
		value : 44,
		valueShift : 30,
		labelFormatter : percentFormatter,
		valueFormatter : percentFormatter
	});
	// voltage
	ResponsiveGauge('#example-voltage-gauge', {
		minAngle : -90,
		maxAngle : 0,
		minValue : 10,
		maxValue : 13,
		colors : [ '#E14C4C', '#FFA3AC', '#FFE4E4', '#FFF', '#FFF' ],
		border : true,
		labelNumber : 4,
		valueDecimalsMax : 1,
		value : 12.2,
		valueUnit : 'volts'
	});
	// mails count
	ResponsiveGauge('#example-mail-count-gauge', {
		minAngle : -90,
		maxAngle : 90,
		minValue : 0,
		maxValue : 1000,
		labelNumber : 5,
		pointerType : 'filler',
		ringShift : 1,
		ringWidth : 20,
		colors : false,
		value : 747,
		valueUnit : 'emails',
		valueShift : 10
	});
	// messages count
	ResponsiveGauge('#example-message-count-gauge', {
		minAngle : -90,
		maxAngle : 90,
		minValue : 0,
		maxValue : 1000000,
		labelNumber : 0,
		pointerType : 'filler',
		ringShift : 0,
		ringWidth : 47,
		colors : false,
		value : 673274,
		valueUnit : 'messages in queue',
		valueDecimalsMax : 2,
		valueMantissaMax : 3
	});

	// full circle gauge
	ResponsiveGauge('#example-full-gauge', {
		minAngle : 0,
		maxAngle : 360,
		minValue : 0,
		maxValue : 360,
		labelNumber : 0,
		valueFormatter : function(v) {
			return Math.floor(v) + '°'
		},
		labelShift : 0,
		ringShift : 5,
		ringWidth : 0.5,
		fillerWidth : 7,
		fillerShift : 2,
		pointerType : 'filler',
		value : 225,
		colors : false
	});

	// filler under the gauge ring
	ResponsiveGauge('#example-bi-gauge', {
		minAngle : -90,
		maxAngle : 90,
		minValue : 0,
		maxValue : 300,
		labelNumber : 11,
		labelShift : 9,
		pointerType : 'filler',
		fillerShift : 12,
		fillerWidth : 6,
		ringShift : 10,
		ringWidth : 2,
		value : 120,
		valueUnit : 'km/h',
		valueShift : 15
	});

	/***************************************************************************
	 * DISPLAY AND REFRESH THE GAUGES
	 **************************************************************************/
	var refresh = function() {
		gauges.forEach(function(g) {
			var config = g.getConfig();
			var range = config.maxValue - config.minValue;
			var value = config.minValue + (Math.random() * range);
			g.update(value);
		})
	};
	refresh();
	// setInterval(refresh, 5000);

	// display gauges options on over
	gauges.forEach(function(g) {
		var cont = g.container;
		cont.append('div')//
		.attr('class', 'gauge-config').text(JSON.stringify(g.getConfig(), null, 4));
		cont.on('mouseover', function() {
			d3.select(d3.event.currentTarget).select('div').classed('visible', true);
		});
		cont.on('mouseout', function() {
			d3.select(d3.event.currentTarget).select('div').classed('visible', false);
		});
	});
}
