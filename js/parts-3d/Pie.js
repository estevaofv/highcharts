(function (H) {
	var deg2rad = H.deg2rad,
		each = H.each,
		pick = H.pick,
		seriesTypes = H.seriesTypes,
		svg = H.svg,
		wrap = H.wrap;

/*** 
	EXTENSION FOR 3D PIES
***/

wrap(seriesTypes.pie.prototype, 'translate', function (proceed) {
	proceed.apply(this, [].slice.call(arguments, 1));

	// Do not do this if the chart is not 3D
	if (!this.chart.is3d()) {
		return;
	}

	var series = this,
		chart = series.chart,
		options = chart.options,
		seriesOptions = series.options,
		depth = seriesOptions.depth || 0,
		options3d = options.chart.options3d,
		origin = {
			x: chart.plotWidth / 2,
			y: chart.plotHeight / 2,
			z: options3d.depth
		},
		alpha = options3d.alpha,
		beta = options3d.beta,
		z = seriesOptions.stacking ? (seriesOptions.stack || 0) * depth : series._i * depth;

	z += depth / 2;

	if (seriesOptions.grouping !== false) {
		z = 0;
	}

	each(series.data, function (point) {
		var shapeArgs = point.shapeArgs,
			angle;

		point.shapeType = 'arc3d';

		shapeArgs.z = z;
		shapeArgs.depth = depth * 0.75;
		shapeArgs.origin = origin;
		shapeArgs.alpha = alpha;
		shapeArgs.beta = beta;
		shapeArgs.center = series.center;

		angle = (shapeArgs.end + shapeArgs.start) / 2;

		point.slicedTranslation = {
			translateX: Math.round(Math.cos(angle) * seriesOptions.slicedOffset * Math.cos(alpha * deg2rad)),
			translateY: Math.round(Math.sin(angle) * seriesOptions.slicedOffset * Math.cos(alpha * deg2rad))
		};
	});
});

wrap(seriesTypes.pie.prototype.pointClass.prototype, 'haloPath', function (proceed) {
	var args = arguments;
	return this.series.chart.is3d() ? [] : proceed.call(this, args[1]);
});

wrap(seriesTypes.pie.prototype, 'pointAttribs', function (proceed, point, state) {
	var attr = proceed.call(this, point, state),
		options = this.options;

	if (this.chart.is3d()) {
		attr.stroke = options.edgeColor || options.borderColor || point.color || this.color;
		attr['stroke-width'] = pick(options.edgeWidth, 1);
	}

	return attr;
});

wrap(seriesTypes.pie.prototype, 'drawPoints', function (proceed) {
	var seriesGroup = this.group;

	proceed.apply(this, [].slice.call(arguments, 1));

	if (this.chart.is3d()) {		
		each(this.points, function (point) {
			var graphic = point.graphic;

			graphic.out.add(seriesGroup);
			graphic.inn.add(seriesGroup);
			graphic.side1.add(seriesGroup);
			graphic.side2.add(seriesGroup);

			// Hide null or 0 points (#3006, 3650)
			graphic[point.y ? 'show' : 'hide']();
		});
	}
});

wrap(seriesTypes.pie.prototype, 'drawDataLabels', function (proceed) {
	if (this.chart.is3d()) {
		var series = this;
		each(series.data, function (point) {
			var shapeArgs = point.shapeArgs,
				r = shapeArgs.r,
				d = shapeArgs.depth,
				a1 = (shapeArgs.alpha || series.chart.options.chart.options3d.alpha) * deg2rad, //#3240 issue with datalabels for 0 and null values
				a2 = (shapeArgs.start + shapeArgs.end) / 2,
				labelPos = point.labelPos;

			labelPos[1] += (-r * (1 - Math.cos(a1)) * Math.sin(a2)) + (Math.sin(a2) > 0 ? Math.sin(a1) * d : 0);
			labelPos[3] += (-r * (1 - Math.cos(a1)) * Math.sin(a2)) + (Math.sin(a2) > 0 ? Math.sin(a1) * d : 0);
			labelPos[5] += (-r * (1 - Math.cos(a1)) * Math.sin(a2)) + (Math.sin(a2) > 0 ? Math.sin(a1) * d : 0);

		});
	}

	proceed.apply(this, [].slice.call(arguments, 1));
});

wrap(seriesTypes.pie.prototype, 'addPoint', function (proceed) {
	proceed.apply(this, [].slice.call(arguments, 1));	
	if (this.chart.is3d()) {
		// destroy (and rebuild) everything!!!
		this.update(this.userOptions, true); // #3845 pass the old options
	}
});

wrap(seriesTypes.pie.prototype, 'animate', function (proceed) {
	if (!this.chart.is3d()) {
		proceed.apply(this, [].slice.call(arguments, 1));
	} else {
		var args = arguments,
			init = args[1],
			animation = this.options.animation,
			attribs,
			center = this.center,
			group = this.group,
			markerGroup = this.markerGroup;

		if (svg) { // VML is too slow anyway
				
			if (animation === true) {
				animation = {};
			}
			// Initialize the animation
			if (init) {

				// Scale down the group and place it in the center
				group.oldtranslateX = group.translateX;
				group.oldtranslateY = group.translateY;
				attribs = {
					translateX: center[0],
					translateY: center[1],
					scaleX: 0.001, // #1499
					scaleY: 0.001
				};

				group.attr(attribs);
				if (markerGroup) {
					markerGroup.attrSetters = group.attrSetters;
					markerGroup.attr(attribs);
				}

			// Run the animation
			} else {
				attribs = {
					translateX: group.oldtranslateX,
					translateY: group.oldtranslateY,
					scaleX: 1,
					scaleY: 1
				};
				group.animate(attribs, animation);

				if (markerGroup) {
					markerGroup.animate(attribs, animation);
				}

				// Delete this function to allow it only once
				this.animate = null;
			}

		}
	}
});
	return H;
}(Highcharts));
