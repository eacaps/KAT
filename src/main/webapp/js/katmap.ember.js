if (typeof String.prototype.endsWith !== 'function') {
	String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};
}
zip.workerScriptsPath = "js/libs/zipjs/";

function getMapHeight() {
	var windowheight = jQuery(window).height() - jQuery('#navbarele').height();
	return windowheight;
}

Kat.MapView = Ol3Map.Ol3MapView.extend({
	didInsertElement: function() {
		this._super();
		var _this = this;
		var map = this.get('map');
		
		var dragAndDropInteraction = new ol.interaction.DragAndDropZip({
			formatConstructors: [
				ol.format.KMZ
			]
		});
		dragAndDropInteraction.on('addfeatures', function(evt) {
			var filename = evt.file.filename;
			var vectorsource = new ol.source.Vector({
				features: evt.features,
				projection: evt.projection
			});
			var newlayer = new ol.layer.Vector({
				source: vectorsource
			});
			_this.get('controller').send('addFile', filename, newlayer);
			map.getLayers().push(newlayer);
			_this.send('zoomToObject', newlayer, 'layer');
		});
		map.addInteraction(dragAndDropInteraction);

		var clickstyle = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'rgba(255,0,0,.2)',
					width: 8
				}),
				fill: new ol.style.Fill({
					color: 'rgba(255,0,0,0)'
				})
			})
		];

		var hoverstyle = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'rgba(255,255,0,.2)',
					width: 8
				}),
				fill: new ol.style.Fill({
					color: 'rgba(255,0,0,0)'
				})
			})
		];

		var hoveroverlay = new ol.FeatureOverlay({
			map: map,
			style: function(feature, resolution) {
				return hoverstyle;
			}
		});

		var clickoverlay = new ol.FeatureOverlay({
			map: map,
			style: function(feature, resolution) {
				return clickstyle;
			}
		});

		var maphover = function(pixel) {
			hoveroverlay.setFeatures(new ol.Collection());

			map.forEachFeatureAtPixel(pixel, function(feature, layer) {
				if(layer)
					hoveroverlay.addFeature(feature);
			});
		};

		var mapclick = function(pixel) {
			var clickedfeatures = false;
			clickoverlay.setFeatures(new ol.Collection());
			map.forEachFeatureAtPixel(pixel, function(feature, layer) {
				if(layer)
					clickoverlay.addFeature(feature);
			});
		};

		$(map.getViewport()).on('mousemove'), function(evt) {
			var pixel = map.getEventPixel(evt.originalEvent);
			maphover(pixel);
		};

		var popup = new ol.Overlay({
			element: document.getElementById('popup')
		})
		map.addOverlay(popup);

		$(map.getViewport()).on('click', function(evt) {
			var pixel = map.getEventPixel(evt.originalEvent);
			var features = mapclick(pixel);
			var element = popup.getElement();
			$(element).popover('destroy');
			if(features && features.length > 0) {
				var coordinate = map.getCoordinateFromPixel(pixel);
				var hdms = ol.coordinate.toStringHDMS(coordinate);
				popup.setPosition(coordinate);

				var featurehtml = "";
				for(var x=0;x<features.length;x++) {
					var feature = features[x];
					featurehtml += "<pre>"+feature[x].get('description')+"</pre><br>";
				}
				$(element).popover({
					'placement': 'auto',
					'animation': false,
					'html': true,
					'content': "<p>You clicked: <code>"+hdms+"</code><br>"+featurehtml+"</p>"
				});
				$(element).popover('show');
			}
		})
	}
})