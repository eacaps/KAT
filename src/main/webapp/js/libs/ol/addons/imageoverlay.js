goog.provide('ol.source.ImageOverlay');

goog.require('ol.Image');
goog.require('ol.extent');
goog.require('ol.proj');
goog.require('ol.source.Image');

ol.source.ImageOverlay = function(options) {
  var attributions = goog.isDef(options.attributions) ?
    options.attributions : null;
  var crossOrigin = goog.isDef(options.crossOrigin) ?
      options.crossOrigin : null;
  var imageExtent = options.imageExtent;
  var imageResolution = NaN;
  var imageUrl = options.url;
  var projection = ol.proj.get(options.projection);

  goog.base(this, {
    attributions: attributions,
    logo: options.logo,
    projection: projection,
    resolutions: [imageResolution]
  });

  /**
   * @private
   * @type {ol.Image}
   */
  this.image_ = new ol.Image(imageExtent, imageResolution, 1, attributions,
      imageUrl, crossOrigin);
};
goog.inherits(ol.source.ImageOverlay, ol.source.Image);

ol.source.ImageOverlay.prototype.getImage = function(extent, resolution, pixelratio, projection) {
  if(ol.extent.intersects(extent, this.image_.getExtent())) {
  	return this.image_;
  }
  return null;
}

ol.source.ImageOverlay.prototype.generateTransform = function(pixelratio, viewresolution, framestate, viewrotation, viewcenter, image, transform) {
  var imgextent = image.getExtent();
  var imgresolution = image.getResolution();
  var imgpixelratio = image.getPixelRatio();
  var imgele = image.getImageElement();
  var yres = (imgextent[3] - imgextent[1]) / imgele.height;
  var xres = (imgextent[2] - imgextent[0]) / imgele.width;
  var scalex = pixelratio * xres / (viewresolution * imgpixelratio);
  var scaley = pixelratio * yres / (viewresolution * imgpixelratio);

  ol.vec.Mat4.modifiedTransform2D(transform,
  	pixelratio * framestate.size[0] / 2,
  	pixelratio * framestate.size[1] / 2,
  	scalex, scaley,
  	viewrotation,
  	imgpixelratio * (imgextent[0] - viewcenter[0]) / xres,
  	imgpixelratio * (viewcenter[1] - imgextent[3]) / yres
  );
};

/**
 * @inheritDoc
 */
ol.renderer.canvas.ImageLayer.prototype.prepareFrame =
    function(frameState, layerState) {

  var pixelRatio = frameState.pixelRatio;
  var viewState = frameState.viewState;
  var viewCenter = viewState.center;
  var viewResolution = viewState.resolution;
  var viewRotation = viewState.rotation;

  var image;
  var imageLayer = this.getLayer();
  goog.asserts.assertInstanceof(imageLayer, ol.layer.Image);
  var imageSource = imageLayer.getSource();
  goog.asserts.assertInstanceof(imageSource, ol.source.Image);

  var hints = frameState.viewHints;

  var renderedExtent = frameState.extent;
  if (goog.isDef(layerState.extent)) {
    renderedExtent = ol.extent.getIntersection(
        renderedExtent, layerState.extent);
  }

  if (!hints[ol.ViewHint.ANIMATING] && !hints[ol.ViewHint.INTERACTING] &&
      !ol.extent.isEmpty(renderedExtent)) {
    image = imageSource.getImage(
        renderedExtent, viewResolution, pixelRatio, viewState.projection);
    if (!goog.isNull(image)) {
      var imageState = image.getState();
      if (imageState == ol.ImageState.IDLE) {
        goog.events.listenOnce(image, goog.events.EventType.CHANGE,
            this.handleImageChange, false, this);
        image.load();
      } else if (imageState == ol.ImageState.LOADED) {
        this.image_ = image;
      }
    }
  }

  if (!goog.isNull(this.image_)) {
    image = this.image_;
    var imageExtent = image.getExtent();
    var imageResolution = image.getResolution();
    var imagePixelRatio = image.getPixelRatio();
    var scale = pixelRatio * imageResolution /
        (viewResolution * imagePixelRatio);
    if(imageSource.generateTransform) {
    	imageSource.generateTransform(pixelRatio, viewResolution, frameState, viewRotation, viewCenter, image, this.imageTransform_);
    } else {
	  ol.vec.Mat4.makeTransform2D(this.imageTransform_,
	    pixelRatio * frameState.size[0] / 2,
	    pixelRatio * frameState.size[1] / 2,
	    scale, scale,
	    viewRotation,
	    imagePixelRatio * (imageExtent[0] - viewCenter[0]) / imageResolution,
	    imagePixelRatio * (viewCenter[1] - imageExtent[3]) / imageResolution);
	  this.updateAttributions(frameState.attributions, image.getAttributions());
      this.updateLogos(frameState, imageSource);
	}
  }

  return true;
};

ol.vec.Mat4.modifiedTransform2D = function(mat, translateX1, translateY1, scaleX, scaleY, rotation, translateX2, translateY2) {
	goog.vec.Mat4.makeIdentity(mat);
	if(translateX1 !== 0 || translateY1 !== 0) {
		goog.vec.Mat4.translate(mat, translateX1, translateY1, 0);
	}
	
	if(rotation !== 0) {
		goog.vec.Mat4.rotateZ(mat, rotation);
	}
	
	if(scaleX !== 1 || scaleY !== 1) {
		goog.vec.Mat4.scale(mat, scaleX, scaleY, 1);
	}
	
	if(translateX2 !== 0 || translateY2 !== 0) {
		goog.vec.Mat4.translate(mat, translateX2, translateY2, 0);
	}
	
	return mat;
}