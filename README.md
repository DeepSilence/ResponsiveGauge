[![License](http://img.shields.io/:license-mit-blue.svg)](http://doge.mit-license.org)
[![Code Climate](https://codeclimate.com/github/DeepSilence/ResponsiveGauge/badges/gpa.svg)](https://codeclimate.com/github/DeepSilence/ResponsiveGauge)

#[Responsive gauge](http://deepsilence.github.io/ResponsiveGauge "Responsive gauge demo and documentation")

Responsive gauge is a lightweight js library to create customizable gauges, that adapts to theirs container's available space.
The lib is based on D3, numbro and generates SVG.

[See the demos and documentation.](http://deepsilence.github.io/ResponsiveGauge "Responsive gauge demo and documentation")

<span style="text-align:center;">
	<img src="https://raw.githubusercontent.com/DeepSilence/ResponsiveGauge/master/examples.png"/>
</span>

## Capabilities
* lightweigth library
* gauges are responsive to their containers size changes
* gauges can be customized : 
 * different styles of pointers (needle, filament, filler)
 * different size, position and colorization of the labels, gauges and pointers
 * gauges can start and end at any angle
 * gauges can have different colorizations (smooth gradient, gradient by sectors, monochrome)
 * gauges can have borders 
 * custom label format, and unit
* efficient values updates (no full rerender)
* a default configuration can be set for common gauges
* animation of the pointer stabilization

##Compatibility
* Opera 36+, FF 43+, Chrome 45+, IE11+
	
## Known bugs 
* 'pointer.slowness' is not yet implemented for 'filled' pointers
* on IE, the container must have a relative positioning for the gauge to be repaint on resize
	
---
Based on Matt Magoffin (http://bl.ocks.org/msqr/3202712) work

Released under the MIT license (see the LICENSE file for details)
