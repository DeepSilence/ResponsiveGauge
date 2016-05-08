jest.dontMock('../src/ResponsiveGauge');
var math = require('mathjs');
var responsiveGauge = require('../src/ResponsiveGauge');

/*******************************************************************************
 * deg2rad
 ******************************************************************************/
describe('deg2rad', function() {
	var gauge = responsiveGauge();

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

/*******************************************************************************
 * computeTicks
 ******************************************************************************/
describe('computeTicks', function() {
	it('should keep the labelNumber if specified', function() {
		var labelNumber = 10;
		var gauge = responsiveGauge('test', {
			labels : {
				number : labelNumber
			},
			ring : {
				sectorsNumber : 5
			}
		});
		gauge.computeTicks();
		var config = gauge.getConfig();
		expect(config.labels.number).toBe(labelNumber);
	});
	it('should use the sectors number as default otherwise', function() {
		var gauge = responsiveGauge('test', {
			ring : {
				sectorsNumber : 5
			}
		});
		gauge.computeTicks();
		var config = gauge.getConfig();
		expect(config.labels.number).toBe(config.ring.sectorsNumber);
	});
});

/*******************************************************************************
 * merge
 ******************************************************************************/
describe('merge', function() {
	it('should copy all properties', function() {
		var target = {};
		var source = {
			a : 1,
			b : [ 1, 2, 3 ],
			c : {
				a : 1,
				b : [ 1, 2, 3 ],
				f : function() {
				}
			},
			f : function() {
			}
		};

		responsiveGauge().merge(target, source, source);
		expect(target.a).toBe(source.a);
		expect(target.b).toBe(source.b);
		expect(target.f).toBe(source.f);
		expect(target.c.a).toBe(source.c.a);
		expect(target.c.b).toBe(source.c.b);
		expect(target.c.f).toBe(source.c.f);
	});
});

/*******************************************************************************
 * createConfig
 ******************************************************************************/
describe('createConfig', function() {
	it('should reset FORMAT', function() {
		var gauge = responsiveGauge();
		gauge.createConfig();
		var config = gauge.getConfig();
		expect(config.FORMAT).toBe(undefined);
	});
});

/*******************************************************************************
 * getReadOnlyConfig
 ******************************************************************************/
describe('getReadOnlyConfig', function() {
	it('should return a frozen config', function() {
		var gauge = responsiveGauge();
		var config = gauge.getConfig();
		expect(Object.isFrozen(config)).toBe(true);
	});
});

/*******************************************************************************
 * computeLayout
 ******************************************************************************/
//describe('computeLayout', function() {
//	it('should have a ', function() {
//		var gauge = responsiveGauge();
//		var config = gauge.getConfig();
//		expect(Object.isFrozen(config)).toBe(true);
//	});
//});


