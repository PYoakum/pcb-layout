# Warning: 

Those PCB files were made with the help of Claude (Opus 4.6) in about 15 minutes using the pcb-layout API and < 30k tokens. At the time of this writing, the "validation tests" it supposedly "passed" were the ones run by the model. 

In other words, ***they are likely AI slop.***

But RAM prices are out of control right now, so desperate times and all that.

If you get to it before me, I hope it serves as a good start to your enthusiast project -- please submit suggestions for improvements. 

I aim to do my own tests and will update here with progress soon.

*PY*

## Update March 30th, 2026

The first pass was woefully inadequate unfortunately, but it was a good start.

The current iteration (I think it's probably in the 50+ range right now) passes 167 unit and validation tests that can be mostly be described as:

- Components observe clearance minimums, should not overlap with other parts or extend off the edge of the PCB.
- Tracing nodes should be more accurately positioned and free of short circuits, connects pads to bus and positioned in the correct z-layer.
- The width and radius of the vias and traces were causing offset in the nodes and paths so there were overlap and positioning issues.
- The PCB can now use custom profiles, which was necessary for DIMM.

Will add more updates as I have them.
