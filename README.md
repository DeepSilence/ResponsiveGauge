Responsive gauge is a Javascript library to create gauges of custom styles, that adapts to theirs container's available space.
The lib is based on D3, numbro and generates SVG.

[See the demos and documentation.](https://www.google.com "Responsive gauge demo and documentation")

## Capabilities
* gauge resizes with its container
* gauge can start and end at any angle
* pointer can be of different styles (needle, filament, filler)
* gauge can have different colorizations (smooth gradient, gradient by sectors, monochrome)
* gauges can have borders 
* labels, gauge and pointer can have different size, position and colorization
* labels and value can be formated, and their unit given
* a default configuration can be set for common gauges
* values updates are efficient (no full rerender)
* pointer stabilization at the correct position can be animated 

##known bugs 
* pointerSlowness is not yet implemented for 'filled' pointers
	
	
---
Based on Matt Magoffin (http://bl.ocks.org/msqr/3202712) work

Released under the MIT license (see the LICENSE file for details)
