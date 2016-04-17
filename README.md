

Based on D3 and Numbro, uses SVG


## Capabilities


* gauge resizes with its container
* different pointers (needle, thin, filling)
* different gauge colorations (smooth gradient, gradient by sectors, custom sectors)
* borders
* different gauge sizes (quarter, half, three quarters and full circles) 
* different labels vs gauge position
* default config for several gauges
* efficient updates (no full rerender)
 	
##CSS classes added to the container

	'gauge-360' for full size gauges
	'gauge-vertical' for half gauges whose layout are vertical
 	
##known bugs 

* gauge size calculation only works for mod(90°) sizes
* pointerSlowness not implmented for 'filled' pointers
	
	
---
Based on Matt Magoffin (http://bl.ocks.org/msqr/3202712) work

Released under the MIT license