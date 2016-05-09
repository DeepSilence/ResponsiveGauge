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
	console.log('Starting ResponsiveGauge in RequireJS mode');
	
	createScript('lib/require.min.js', '../../dist/ResponsiveGauge.min').then(function() {
		require([ 'ResponsiveGauge.min' ], function(ResponsiveGauge) {
			this.ResponsiveGauge = ResponsiveGauge;
			startTests();
		});
	});

	// vanilla : sets the dependencies in <HEAD> then start the tests
} else {
	console.log('Starting ResponsiveGauge in vanilla JS mode');
	
	// retrieve the protocol to allow use in a https page
	var protocol = document.location.protocol;
	protocol = (protocol === 'file:' ? 'http:' : protocol); // for local test

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
	ResponsiveGauge.config.ring.colors = 'gradient';
	ResponsiveGauge.config.ring.minAngle = 0;
	ResponsiveGauge.config.ring.maxAngle = 90;
	ResponsiveGauge.config.data.max = 800;

	/**
	 * Generate configs for angles checks gauges.
	 */
	function getAngleCheckConfig(minAngle, maxAngle, otherConfig) {
		var config = {
			ring : {
				minAngle : minAngle,
				maxAngle : maxAngle,
			},
			data : {
				min : minAngle,
				max : maxAngle
			}
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
		labels : {
			number : 2
		}
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
		ring : {
			colors : 'gradient'
		}
	}));
	gauges.push(ResponsiveGauge('#sector-gradient-gauge', {
		ring : {
			colors : 'sectors'
		}
	}));
	gauges.push(ResponsiveGauge('#custom-sectors-gauge', {
		ring : {
			colors : [ '#FFF', '#FFF', '#FFF', '#FF7C88', '#D50000' ],
			border : true
		}
	}));

	// BORDERS
	gauges.push(ResponsiveGauge('#without-border-gauge', {
		ring : {
			colors : [ '#FFF' ]
		}
	}));
	gauges.push(ResponsiveGauge('#with-border-gauge', {
		ring : {
			colors : [ '#FFF' ],
			border : true
		}
	}));

	// SIZE AND POSITION
	gauges.push(ResponsiveGauge('#wide-gauge', {
		ring : {
			shift : 0,
			width : 14
		},
		labels : {
			shift : 8
		},
		pointer : {
			type : 'filament'
		}
	}));
	gauges.push(ResponsiveGauge('#inner-label-gauge', {
		ring : {
			shift : 0,
			width : 7
		},
		labels : {
			shift : 12
		},
		pointer : {
			needleLength : 75
		}
	}));
	gauges.push(ResponsiveGauge('#no-gauge', {
		labels : {
			shift : 0
		},
		ring : {
			shift : 5,
			width : 0.5,
			colors : false
		},
		pointer : {
			fillerWidth : 7,
			fillerShift : 2,
			type : 'filler'
		}
	}));
	gauges.push(ResponsiveGauge('#bi-gauge', {
		labels : {
			shift : 9
		},
		pointer : {
			type : 'filler',
			fillerShift : 12,
			fillerWidth : 6
		},
		ring : {
			shift : 10,
			width : 2,
			colors : false
		},
		value : {
			shift : 15
		}
	}));

	// LABELS
	gauges.push(ResponsiveGauge('#no-label-gauge', {
		labels : {
			number : 0
		}
	}));
	gauges.push(ResponsiveGauge('#long-label-gauge', {
		labels : {
			number : 8
		},
		data : {
			max : 100000
		}
	}));
	gauges.push(ResponsiveGauge('#custom-labels-gauge', {
		labels : {
			number : 2
		},
		ring : {
			colors : 'sectors'
		}
	}))
	gauges.push(ResponsiveGauge('#suffixed-label-gauge', {
		value : {
			unit : 'km/h'
		}
	}));

	// POINTERS
	gauges.push(ResponsiveGauge('#needle-pointer-gauge', {
		pointer : {
			type : 'needle'
		}
	}));
	gauges.push(ResponsiveGauge('#filament-pointer-gauge', {
		pointer : {
			type : 'filament'
		}
	}));
	gauges.push(ResponsiveGauge('#filler-pointer-gauge', {
		pointer : {
			type : 'filler',
		},
		ring : {
			colors : false
		}
	}));
	gauges.push(ResponsiveGauge('#slow-pointer-gauge', {
		pointer : {
			slowness : 1000
		}
	}));

	// DEMO PAGE
	// header
	ResponsiveGauge('#example-header-gauge', {
		ring : {
			minAngle : -90,
			maxAngle : 90,
			shift : 1,
			width : 20,
			colors : false
		},
		data : {
			min : 0,
			max : 1000000,
			value : 318093
		},
		labels : {
			mantissaMax : 4,
			number : 11
		},
		pointer : {
			type : 'filler'

		},
		value : {
			shift : 4,
			decimalsMax : 0
		}
	});
	// half gauge
	var percentFormatter = function(value) {
		return value + '%'
	};
	ResponsiveGauge('#example-half-gauge', {
		pointer : {
			type : 'filament'
		},
		ring : {
			minAngle : -45,
			maxAngle : 45,
			colors : 'gradient',
			startColor : '#FFF',
			endColor : '#63c4ca'
		},
		data : {
			value : 44,
			min : 0,
			max : 100
		},
		value : {
			shift : 30,
			formatter : percentFormatter
		},
		labels : {
			formatter : percentFormatter
		}
	});
	// voltage
	ResponsiveGauge('#example-voltage-gauge', {
		ring : {
			minAngle : -90,
			maxAngle : 0,
			colors : [ '#E14C4C', '#FFA3AC', '#FFE4E4', '#FFF', '#FFF' ],
			border : true
		},
		data : {
			min : 10,
			max : 13,
			value : 12.2
		},
		labels : {
			number : 4
		},
		value : {
			decimalsMax : 1,
			unit : 'volts'
		}
	});
	// mails count
	ResponsiveGauge('#example-mail-count-gauge', {
		ring : {
			minAngle : -90,
			maxAngle : 90,
			shift : 1,
			width : 20,
			colors : false
		},
		data : {
			min : 0,
			max : 1000,
			value : 747
		},
		labels : {
			number : 5
		},
		pointer : {
			type : 'filler'
		},
		value : {
			unit : 'emails',
			shift : 10
		}
	});
	// messages count
	ResponsiveGauge('#example-message-count-gauge', {
		ring : {
			minAngle : -90,
			maxAngle : 90,
			shift : 0,
			width : 47,
			colors : false
		},
		data : {
			min : 0,
			max : 1000000,
			value : 673274
		},
		labels : {
			number : 0
		},
		pointer : {
			type : 'filler'
		},
		value : {
			unit : 'messages in queue',
			decimalsMax : 2,
			mantissaMax : 3
		}
	});

	// full circle gauge
	ResponsiveGauge('#example-full-gauge', {
		ring : {
			minAngle : 0,
			maxAngle : 360,
			shift : 5,
			width : 0.5,
			colors : false
		},
		data : {
			min : 0,
			max : 360,
			value : 225
		},
		labels : {
			number : 0,
			shift : 0
		},
		value : {
			formatter : function(v) {
				return Math.floor(v) + '°'
			}
		},
		pointer : {
			fillerWidth : 7,
			fillerShift : 2,
			type : 'filler'
		}
	});

	// filler under the gauge ring
	ResponsiveGauge('#example-bi-gauge', {
		ring : {
			minAngle : -90,
			maxAngle : 90,
			shift : 10,
			width : 2
		},
		data : {
			min : 0,
			max : 300,
			value : 120
		},
		labels : {
			number : 11,
			shift : 9
		},
		pointer : {
			type : 'filler',
			fillerShift : 12,
			fillerWidth : 6
		},
		value : {
			unit : 'km/h',
			shift : 15
		}
	});

	/***************************************************************************
	 * DISPLAY AND REFRESH THE GAUGES
	 **************************************************************************/
	var refresh = function() {
		gauges.forEach(function(g) {
			var config = g.getConfig();
			var range = config.data.max - config.data.min;
			var value = config.data.min + (Math.random() * range);
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
