// FIXME should handle all geo-referenced data, not just vector data

goog.provide('ol.interaction.DragAndDropZip');
goog.provide('ol.interaction.DragAndDropZipEvent');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.Promise');
goog.require('goog.events.Event');
goog.require('goog.events.FileDropHandler');
goog.require('goog.events.FileDropHandler.EventType');
goog.require('goog.fs.FileReader');
goog.require('goog.functions');
goog.require('ol.interaction.Interaction');
goog.require('ol.proj');



/**
 * @classdesc
 * Handles input of vector data by drag and drop.
 *
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @fires ol.interaction.DragAndDropZipEvent
 * @param {olx.interaction.DragAndDropOptions=} opt_options Options.
 * @api stable
 */
ol.interaction.DragAndDropZip = function(opt_options) {

  var options = goog.isDef(opt_options) ? opt_options : {};

  goog.base(this);

  /**
   * @private
   * @type {Array.<function(new: ol.format.Feature)>}
   */
  this.formatConstructors_ = goog.isDef(options.formatConstructors) ?
      options.formatConstructors : [];

  /**
   * @private
   * @type {ol.proj.Projection}
   */
  this.projection_ = goog.isDef(options.projection) ?
      ol.proj.get(options.projection) : null;

  /**
   * @private
   * @type {goog.events.FileDropHandler}
   */
  this.fileDropHandler_ = null;

  /**
   * @private
   * @type {goog.events.Key|undefined}
   */
  this.dropListenKey_ = undefined;
  
  this.imgSrcMap_ = {};

};
goog.inherits(ol.interaction.DragAndDropZip, ol.interaction.Interaction);


/**
 * @inheritDoc
 */
ol.interaction.DragAndDropZip.prototype.disposeInternal = function() {
  if (goog.isDef(this.dropListenKey_)) {
    goog.events.unlistenByKey(this.dropListenKey_);
  }
  goog.base(this, 'disposeInternal');
};

ol.interaction.DragAndDropZip.prototype.readImage_ = function(entry, filename, type) {
	var _self = this;
	var fr = new FileReader();
	var image = document.createElement("img");
	image.id = "img_" + filename;
	return new goog.Promise(function(resolve, reject) {
		entry.getData(new zip.Data64URIWriter("image/"+type),
			function(res) {
				image.src = res;
				_self.imgSrcMap_[filename] = res;
				resolve();
			}, function(current, total) {
			}
		);
	});
}

/**
 * @param {goog.events.BrowserEvent} event Event.
 * @private
 */
ol.interaction.DragAndDropZip.prototype.handleDrop_ = function(event) {
  var _self = this;
  var files = event.getBrowserEvent().dataTransfer.files;
  var i, ii, file;
  for (i = 0, ii = files.length; i < ii; ++i) {
    file = files[i];
    var filename = file.name.toLowerCase();
    if(goog.string.endsWith(filename, 'kml')) {
      // The empty string param is a workaround for
      // https://code.google.com/p/closure-library/issues/detail?id=524
      var reader = goog.fs.FileReader.readAsText(file, '');
      reader.addCallback(goog.partial(this.handleResult_, file), this);
    }
	  else if (goog.string.endsWith(filename, 'kmz')) {
		var thekmlentry = null;
    	zip.createReader(new zip.BlobReader(file), function(zipReader) {
			var promises = [];
    		zipReader.getEntries(function(entries) {
    			entries.forEach(function(entry) {
    				var subfilename = entry.filename;
    				var lcsubname = subfilename.toLowerCase();
    				if(goog.string.endsWith(lcsubname, 'kml')) {
    					thekmlentry = entry;
    				} else if(goog.string.endsWith(lcsubname, 'jpg')) {
    					promises.push(_self.readImage_(entry, subfilename, 'jpg'));
    				} else if(goog.string.endsWith(lcsubname, 'gif')) {
    					promises.push(_self.readImage_(entry, subfilename, 'gif'));
    				} else if(goog.string.endsWith(lcsubname, 'png')) {
    					promises.push(_self.readImage_(entry, subfilename, 'png'));
    				}
    			});
				
				goog.Promise.all(promises).then(function(value) {
					thekmlentry.getData(new zip.TextWriter(), function(text) {
						// text contains the entry data as a String
						//console.log(text);
						_self.handleResult_(thekmlentry, text);
					  }, function(current, total) {
						// onprogress callback
					});
				});
    		});
    	}, function() {
        alert('error reading zip file')
      });
    }
  };
};

ol.interaction.DragAndDropZip.prototype.getImgSrcMap = function() {
	return this.imgSrcMap_;
}

/**
 * @param {File} file File.
 * @param {string} result Result.
 * @private
 */
ol.interaction.DragAndDropZip.prototype.handleResult_ = function(file, result) {
  var map = this.getMap();
  goog.asserts.assert(!goog.isNull(map));
  var projection = this.projection_;
  if (goog.isNull(projection)) {
    var view = map.getView();
    goog.asserts.assert(!goog.isNull(view));
    projection = view.getProjection();
    goog.asserts.assert(goog.isDef(projection));
  }
  var formatConstructors = this.formatConstructors_;
  var features = [];
  var i, ii;
  for (i = 0, ii = formatConstructors.length; i < ii; ++i) {
    var formatConstructor = formatConstructors[i];
    var format = new formatConstructor({imgSrcMap : this.imgSrcMap_});
    var readFeatures = this.tryReadFeatures_(format, result);
    if (!goog.isNull(readFeatures)) {
      var featureProjection = format.readProjection(result);
      var transform = ol.proj.getTransform(featureProjection, projection);
      var j, jj;
      for (j = 0, jj = readFeatures.length; j < jj; ++j) {
        var feature = readFeatures[j];
        var geometry = feature.getGeometry();
        if (goog.isDefAndNotNull(geometry)) {
          geometry.applyTransform(transform);
        }
        features.push(feature);
      }
    }
  }
  this.dispatchEvent(
      new ol.interaction.DragAndDropZipEvent(
          ol.interaction.DragAndDropZipEventType.ADD_FEATURES, this, file,
          features, projection));
};


/**
 * @inheritDoc
 */
ol.interaction.DragAndDropZip.prototype.handleMapBrowserEvent =
    goog.functions.TRUE;


/**
 * @inheritDoc
 */
ol.interaction.DragAndDropZip.prototype.setMap = function(map) {
  if (goog.isDef(this.dropListenKey_)) {
    goog.events.unlistenByKey(this.dropListenKey_);
    this.dropListenKey_ = undefined;
  }
  if (!goog.isNull(this.fileDropHandler_)) {
    goog.dispose(this.fileDropHandler_);
    this.fileDropHandler_ = null;
  }
  goog.asserts.assert(!goog.isDef(this.dropListenKey_));
  goog.base(this, 'setMap', map);
  if (!goog.isNull(map)) {
    this.fileDropHandler_ = new goog.events.FileDropHandler(map.getViewport());
    this.dropListenKey_ = goog.events.listen(
        this.fileDropHandler_, goog.events.FileDropHandler.EventType.DROP,
        this.handleDrop_, false, this);
  }
};


/**
 * @param {ol.format.Feature} format Format.
 * @param {string} text Text.
 * @private
 * @return {Array.<ol.Feature>} Features.
 */
ol.interaction.DragAndDropZip.prototype.tryReadFeatures_ = function(format, text) {
  try {
    return format.readFeatures(text);
  } catch (e) {
    return null;
  }
};


/**
 * @enum {string}
 */
ol.interaction.DragAndDropZipEventType = {
  /**
   * Triggered when features are added
   * @event ol.interaction.DragAndDropZipEvent#addfeatures
   * @api stable
   */
  ADD_FEATURES: 'addfeatures'
};



/**
 * @classdesc
 * Events emitted by {@link ol.interaction.DragAndDropZip} instances are instances
 * of this type.
 *
 * @constructor
 * @extends {goog.events.Event}
 * @implements {oli.interaction.DragAndDropZipEvent}
 * @param {ol.interaction.DragAndDropZipEventType} type Type.
 * @param {Object} target Target.
 * @param {File} file File.
 * @param {Array.<ol.Feature>=} opt_features Features.
 * @param {ol.proj.Projection=} opt_projection Projection.
 */
ol.interaction.DragAndDropZipEvent =
    function(type, target, file, opt_features, opt_projection) {

  goog.base(this, type, target);

  /**
   * @type {Array.<ol.Feature>|undefined}
   * @api stable
   */
  this.features = opt_features;

  /**
   * @type {File}
   * @api stable
   */
  this.file = file;

  /**
   * @type {ol.proj.Projection|undefined}
   * @api
   */
  this.projection = opt_projection;

};
goog.inherits(ol.interaction.DragAndDropZipEvent, goog.events.Event);
