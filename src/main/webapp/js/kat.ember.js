var Kat = Ember.Application.create({
	LOG_BINDINGS: true,
	LOG_TRANSITIONS: true,
	LOG_TRANSITIONS_INTERNAL: true,
	LOG_ACTIVE_GENERATION: true,
	LOG_VIEW_LOOKUPS: true
});

var fileMap = {};

Kat.FileEntry = Ember.Object.extend({
	name: '',
	checked: true,
	features: [],
	layer: null,
	observeCheckChange: function() {
		var checked = this.get('checked');
		var layer = this.get('layer');
		layer.setVisible(checked);
	}.observes('checked')
});

Kat.FeatureEntry = Ember.Object.extend({
	feature: null,
	name: function() {
		var feature = this.get('feature');
		if(feature)
			return feature.get('name');
		return '';
	}.property('feature'),
	visible: true,
	layer: null,
	observeVisibilityChange: function() {
		var feature = this.get('feature');
		feature._hidden = !feature._hidden;
		var layer = this.get('layer');
		layer.dispatchChangeEvent();
	}.observes('visible')
})

Kat.IndexView = Ember.View.extend({});

Kat.ApplicationController = Ember.Controller.extend({
	queryParams: ['lat', 'lon', 'zoom'],
	lat: 0,
	lon: 0,
	zoom: 3,
	filelist: [],
	actions: {
		changeCenter: function(center, zoom) {
			this.set('lon', center[0]);
			this.set('lat', center[1]);
			this.set('zoom', zoom);
		},
		addFile: function(filename, newlayer) {
			if(fileMap[filename] == null) {
				fileMap[filename] = newlayer;
				var filelist = this.get('filelist');
				var vectorsource = newlayer.getSource();
				var vecfeatures = vectorsource.getFeatures();
				var featarr = [];
				for(var x=0;x<vecfeatures.length;x++) {
					var curfeat = vecfeatures[x];
					var featureentry = Kat.FeatureEntry.create({
						feature: curfeat,
						layer: newlayer
					});
					featarr.push(featureentry);
				}
				var entry = Kat.FileEntry.create({
					name: filename,
					features: featarr,
					layer: newlayer
				});
				filelist.pushObject(entry);
			}
		},
		clickFile: function(name) {
			console.log('clicked file:' + name);
			var layer = fileMap[name];
			this.get('katmap').send('zoomToObject', layer, 'layer');
		},
		clickFeature: function(feature) {

		},
		zoomToFeature: function(feature) {
			this.get('katmap').send('zoomToObject', feature, 'feature');
		}
	}
});

Kat.FilesboxController = Ember.ArrayController.extend({
	filesProxy: Ember.computed.map('model', function(model) {
		var obj = Ember.ObjectProxy.create({
			content: model
		});
		return obj;
	}),
	actions: {
	}
})

Kat.FilesboxView = Ember.View.extend({
	templateName: "filesbox"
})