jest.dontMock('../src/ReactiveGauge');
var math = require('mathjs');

describe('deg2rad', function() {
	var gauge = require('../src/ReactiveGauge')();

	it('should be zero', function() {
		var result = gauge.deg2rad(0);
		expect(result).toBe(0);
	});
	it('should be Pi', function() {
		var result = gauge.deg2rad(180);
		expect(result).toBe(math.pi);
	});
	it('should be 2xPi', function() {
		var result = gauge.deg2rad(360);
		expect(result).toBe(math.pi * 2);
	});
});

describe('computeTicks', function() {
	it('should keep the labelNumber if specified', function() {
		var labelNumber = 10;
		var gauge = require('../src/ReactiveGauge')('test', {
			labelNumber  : labelNumber,
			sectorsNumber  : 5,
		});
		gauge.computeTicks();
		var config = gauge.getConfig();
		expect(config.labelNumber).toBe(labelNumber);
	});
});
