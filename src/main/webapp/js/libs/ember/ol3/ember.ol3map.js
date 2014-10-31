function getMapHeight() {
	var windowHeight = $(window).height();
	return windowHeight;
}

if('undefined' === typeof Ol3Map) {
	Ol3Map = Ember.Namespace.create();
}

Ol3Map.Ol3MapController = Ember.Controller.extend({
	actions: {
		zoomToObject: function(object, type) {
			if(type == "layer") {
				var map = this.get('map');
				var vectorsource = object.getSource();
				var view = map.getView();
				view.fitExtent(vectorsource.getExtent(), map.getSize());
			} else if(tupe == "geom") {
				var map = this.get('map');
				var view = map.getView();
				view.fitExtent(object.getExtent(), map.getSize());
			}
		}
	}
})

Ol3Map.Ol3MapView = Ember.View.extend({
	lat:0,
	lon:0,
	zoom:0,
	rotate:0,
	_register: function() {
		this.set('handle', this);
	}.on('init'),
	didInsertElement: function() {
		var _this = this;
		
		var height = getMapHeight();
		this.get('element').style['height'] = height + "px";
		$(window).resize(function() {
			_this.get('element').style['height'] = getMapHeight() + "px";
			_this.get('element').style['width'] = $(window).width() + "px";
		})
		if(this.get('element').style['width'] == '') {
			_this.get('element').style['width'] = $(window).width() + "px";
		}
		
		var mlon = this.get('lon');
		var mlat = this.get('lat');
		var mzoom = this.get('zoom');
		var mrotate = this.get('rotate');
		
		var view = new ol.View({
			center: [mlon,mlat],
			zoom: mzoom,
			projection: 'EPSG:4326',
			rotation: mrotate
		});
		
		var layers = [
		  new ol.layer.Tile({
			source: new ol.source.TileWMS({
			  url: 'http://demo.opengeo.org/geoserver/wms',
			  params: {
				'LAYERS': 'ne:NE1_HR_LC_SR_W_DR'
			  }
			})
		  })
		];
		
		var map = new ol.Map({
			target: this.get('element'),
			view: view,
			layers: layers
		});
		
		map.addControl(new ol.control.ZoomSlider());
		
		map.on('moveend', function() {
			var view = map.getView();
			var center = view.getCenter();
			var zoom = view.getZoom();
			_this.set('zoom', zoom);
			_this.set('lat', center[1]);
			_this.set('lon', center[0]);
		})
		
		map.on('pointermove', function() {
		});
		
		view.on('change:rotation', function(evt) {
			var view = evt.target;
			var rads = view.getRotation();
			_this.set('rotate', rotation);
		})
		
		this.set('map', map);
	},
	
	actions: {
		zoomToObject: function(object, type) {
			if(type == "layer") {
				var map = this.get('map');
				var vectorsource = object.getSource();
				var view = map.getView();
				view.fitExtent(vectorsource.getExtent(), map.getSize());
			} else if(tupe == "geom") {
				var map = this.get('map');
				var view = map.getView();
				view.fitExtent(object.getExtent(), map.getSize());
			}
		}
	},
	
	observeCenterChange: function(self, trigger) {
		var vlat = this.get('lat');
		var vlon = this.get('lon');
		var vzoom = this.get('zoom');
		var map = this.get('map');
		
		if(map) {
			var view = map.getView();
			var center = view.getCenter();
			var center = view.getCenter();
			var mlat = center[1];
			var mlon = center[0];
			var mzoom = view.getZoom();
			if(mlat != vlat || mlon != vlon) {
				view.setCenter([vlon, vlat]);
			}
			if(mzoom != vzoom) {
				view.setZoom(vzoom);
			}
		}
	}.observes('this.lat', 'this.lon', 'this.zoom'),
	observeRotationChange: function(self, trigger) {
		var rotate = eval(trigger);
		var map = this.get('map');
		if(map) {
			var view = map.getView();
			var currot = view.getRotation();
			if(currot != rotate) {
				view.setRotation(rotate);
			}
		}
	}.observes('this.rotate')
});