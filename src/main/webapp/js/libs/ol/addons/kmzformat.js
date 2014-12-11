// FIXME http://earth.google.com/kml/1.0 namespace?
// FIXME why does node.getAttribute return an unknown type?
// FIXME text
// FIXME serialize arbitrary feature properties
// FIXME don't parse style if extractStyles is false

goog.provide('ol.format.KMZ');

goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom.NodeType');
goog.require('goog.math');
goog.require('goog.object');
goog.require('goog.string');
goog.require('ol.Feature');
goog.require('ol.array');
goog.require('ol.color');
goog.require('ol.feature');
goog.require('ol.format.Feature');
goog.require('ol.format.XMLFeature');
goog.require('ol.format.XSD');
goog.require('ol.geom.Geometry');
goog.require('ol.geom.GeometryCollection');
goog.require('ol.geom.GeometryType');
goog.require('ol.geom.LineString');
goog.require('ol.geom.LinearRing');
goog.require('ol.geom.MultiLineString');
goog.require('ol.geom.MultiPoint');
goog.require('ol.geom.MultiPolygon');
goog.require('ol.geom.Point');
goog.require('ol.geom.Polygon');
goog.require('ol.proj');
goog.require('ol.style.Fill');
goog.require('ol.style.Icon');
goog.require('ol.style.IconAnchorUnits');
goog.require('ol.style.IconOrigin');
goog.require('ol.style.Image');
goog.require('ol.style.Stroke');
goog.require('ol.style.Style');
goog.require('ol.style.Text');
goog.require('ol.xml');
goog.require('ol.format.KML');



/**
 * @classdesc
 * Feature format for reading and writing data in the KMZ format.
 *
 * @constructor
 * @extends {ol.format.XMLFeature}
 * @param {olx.format.KMZOptions=} opt_options Options.
 * @api stable
 */
ol.format.KMZ = function(opt_options) {

  var options = goog.isDef(opt_options) ? opt_options : {};

  goog.base(this, options);

  this.imgSrcMap_ = goog.isDef(options.imgSrcMap) ?
    options.imgSrcMap : null;

};
goog.inherits(ol.format.KMZ, ol.format.KML);

ol.format.KMZ.readLatLonBox_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'LatLonBox');

  var latlonboxobj = ol.xml.pushParseAndPop({}, ol.format.KMZ.LATLONBOX_PARSERS_, node, objectStack);
  if(goog.isDef(latlonboxobj)) {
    return latlonboxobj;
  } else {
    return undefined;
  }
};

ol.format.KMZ.LATLONBOX_PARSERS_ = ol.xml.makeParsersNS(
  ol.format.KML.NAMESPACE_URIS_, {
    'north': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal),
    'south': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal),
    'east': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal),
    'west': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal)
  });

ol.format.KMZ.GROUNDOVERLAY_PARSERS_ = ol.xml.makeParsersNS(
  ol.format.KML.NAMESPACE_URIS_, {
    'name': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
    'LatLonBox': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readLatLonBox_),
    'Icon': ol.xml.makeObjectPropertySetter(ol.format.KML.readIcon_)
  });

/**
 * Read the first feature from a KMZ source.
 *
 * @function
 * @param {ArrayBuffer|Document|Node|Object|string} source Source.
 * @param {olx.format.ReadOptions=} opt_options Read options.
 * @return {ol.Feature} Feature.
 * @api stable
 */
ol.format.KMZ.prototype.readFeature;


/**
 * @inheritDoc
 */
ol.format.KMZ.prototype.readFeatureFromNode = function(node, opt_options) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  if (!goog.array.contains(ol.format.KML.NAMESPACE_URIS_, node.namespaceURI)) {
    return null;
  }
  goog.asserts.assert(node.localName == 'Placemark');
  var feature = this.readPlacemark_(
      node, [this.getReadOptions(node, opt_options)]);
  if (goog.isDef(feature)) {
    return feature;
  } else {
    return null;
  }
};


/**
 * Read all features from a KMZ source.
 *
 * @function
 * @param {ArrayBuffer|Document|Node|Object|string} source Source.
 * @param {olx.format.ReadOptions=} opt_options Read options.
 * @return {Array.<ol.Feature>} Features.
 * @api stable
 */
ol.format.KMZ.prototype.readFeatures;


/**
 * @inheritDoc
 */
ol.format.KMZ.prototype.readFeaturesFromNode = function(node, opt_options) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  if (!goog.array.contains(ol.format.KML.NAMESPACE_URIS_, node.namespaceURI)) {
    return [];
  }
  var features;
  var localName = ol.xml.getLocalName(node);
  if (localName == 'Document' || localName == 'Folder') {
    features = this.readDocumentOrFolder_(
        node, [this.getReadOptions(node, opt_options)]);
    if (goog.isDef(features)) {
      return features;
    } else {
      return [];
    }
  } else if (localName == 'Placemark') {
    var feature = this.readPlacemark_(
        node, [this.getReadOptions(node, opt_options)]);
    if (goog.isDef(feature)) {
      return [feature];
    } else {
      return [];
    }
  } else if (localName == 'kml') {
    features = [];
    var n;
    for (n = node.firstElementChild; !goog.isNull(n);
         n = n.nextElementSibling) {
      var fs = this.readFeaturesFromNode(n, opt_options);
      if (goog.isDef(fs)) {
        goog.array.extend(features, fs);
      }
    }
    return features;
  } else {
    return [];
  }
};

/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {Array.<ol.Feature>|undefined} Features.
 */
ol.format.KMZ.prototype.readDocumentOrFolder_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  var localName = ol.xml.getLocalName(node);
  goog.asserts.assert(localName == 'Document' || localName == 'Folder');
  // FIXME use scope somehow
  var parsersNS = ol.xml.makeParsersNS(
      ol.format.KML.NAMESPACE_URIS_, {
        'Folder': ol.xml.makeArrayExtender(this.readDocumentOrFolder_, this),
        'Placemark': ol.xml.makeArrayPusher(this.readPlacemark__, this),
        'Style': goog.bind(this.readSharedStyle_, this),
        'StyleMap': goog.bind(this.readSharedStyleMap_, this),
        'GroundOverlay': ol.xml.makeArrayPusher(this.readGroundOverlay_, this)
      });
  var features = ol.xml.pushParseAndPop(/** @type {Array.<ol.Feature>} */ ([]),
      parsersNS, node, objectStack, this);
  if (goog.isDef(features)) {
    return features;
  } else {
    return undefined;
  }
};

ol.format.KMZ.prototype.readGroundOverlay_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'GroundOverlay');

  var object = ol.xml.pushParseAndPop({type:'overlay'}, ol.format.KMZ.GROUNDOVERLAY_PARSERS_, node, objectStack);
  if(!goog.isDef(object)) {
    return undefined;
  }

  var feature = new ol.Feature();
  feature.setProperties(object);
  return feature;
};

/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.Feature|undefined} Feature.
 */
ol.format.KMZ.prototype.readPlacemark__ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Placemark');
  var object = ol.xml.pushParseAndPop({'geometry': null},
      ol.format.KMZ.PLACEMARK_PARSERS_, node, objectStack, this);
  if (!goog.isDef(object)) {
    return undefined;
  }
  var feature = new ol.Feature();
  var id = node.getAttribute('id');
  if (!goog.isNull(id)) {
    feature.setId(id);
  }
  var options = /** @type {olx.format.ReadOptions} */ (objectStack[0]);
  if (goog.isDefAndNotNull(object.geometry)) {
    ol.format.Feature.transformWithOptions(object.geometry, false, options);
  }
  feature.setProperties(object);
  if (this.extractStyles_) {
    feature.setStyle(this.featureStyleFunction_);
  }
  return feature;
};

/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {Array.<ol.style.Style>} Style.
 */
ol.format.KMZ.readStyle_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Style');
  var styleObject = ol.xml.pushParseAndPop(
      {}, ol.format.KMZ.STYLE_PARSERS_, node, objectStack, this);
  if (!goog.isDef(styleObject)) {
    return null;
  }
  var fillStyle = /** @type {ol.style.Fill} */ (goog.object.get(
      styleObject, 'fillStyle', ol.format.KML.DEFAULT_FILL_STYLE_));
  var fill = /** @type {boolean|undefined} */
      (goog.object.get(styleObject, 'fill'));
  if (goog.isDef(fill) && !fill) {
    fillStyle = null;
  }
  var imageStyle = /** @type {ol.style.Image} */ (goog.object.get(
      styleObject, 'imageStyle', ol.format.KML.DEFAULT_IMAGE_STYLE_));
  var strokeStyle = /** @type {ol.style.Stroke} */ (goog.object.get(
      styleObject, 'strokeStyle', ol.format.KML.DEFAULT_STROKE_STYLE_));
  var outline = /** @type {boolean|undefined} */
      (goog.object.get(styleObject, 'outline'));
  if (goog.isDef(outline) && !outline) {
    strokeStyle = null;
  }
  return [new ol.style.Style({
    fill: fillStyle,
    image: imageStyle,
    stroke: strokeStyle,
    text: null, // FIXME
    zIndex: undefined // FIXME
  })];
};



ol.format.KMZ.IconStyleParser_ = function(node, objectStack, tself) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'IconStyle');
  // FIXME refreshMode
  // FIXME refreshInterval
  // FIXME viewRefreshTime
  // FIXME viewBoundScale
  // FIXME viewFormat
  // FIXME httpQuery
  var object = ol.xml.pushParseAndPop(
      {}, ol.format.KML.ICON_STYLE_PARSERS_, node, objectStack);
  if (!goog.isDef(object)) {
    return;
  }
  var styleObject = /** @type {Object} */ (objectStack[objectStack.length - 1]);
  goog.asserts.assert(goog.isObject(styleObject));
  var IconObject = /** @type {Object} */ (goog.object.get(object, 'Icon', {}));
  var src;
  var href = /** @type {string|undefined} */
      (goog.object.get(IconObject, 'href'));
  if (goog.isDef(href)) {
    src = href;
  } else {
    src = ol.format.KML.DEFAULT_IMAGE_STYLE_SRC_;
  }
  var anchor, anchorXUnits, anchorYUnits;
  var hotSpot = /** @type {ol.format.KMZVec2_|undefined} */
      (goog.object.get(object, 'hotSpot'));
  if (goog.isDef(hotSpot)) {
    anchor = [hotSpot.x, hotSpot.y];
    anchorXUnits = hotSpot.xunits;
    anchorYUnits = hotSpot.yunits;
  } else if (src === ol.format.KML.DEFAULT_IMAGE_STYLE_SRC_) {
    anchor = ol.format.KML.DEFAULT_IMAGE_STYLE_ANCHOR_;
    anchorXUnits = ol.format.KML.DEFAULT_IMAGE_STYLE_ANCHOR_X_UNITS_;
    anchorYUnits = ol.format.KML.DEFAULT_IMAGE_STYLE_ANCHOR_Y_UNITS_;
  } else if (/^http:\/\/maps\.(?:google|gstatic)\.com\//.test(src)) {
    anchor = [0.5, 0];
    anchorXUnits = ol.style.IconAnchorUnits.FRACTION;
    anchorYUnits = ol.style.IconAnchorUnits.FRACTION;
  }

  var offset;
  var x = /** @type {number|undefined} */
      (goog.object.get(IconObject, 'x'));
  var y = /** @type {number|undefined} */
      (goog.object.get(IconObject, 'y'));
  if (goog.isDef(x) && goog.isDef(y)) {
    offset = [x, y];
  }

  var size;
  var w = /** @type {number|undefined} */
      (goog.object.get(IconObject, 'w'));
  var h = /** @type {number|undefined} */
      (goog.object.get(IconObject, 'h'));
  if (goog.isDef(w) && goog.isDef(h)) {
    size = [w, h];
  }

  var rotation;
  var heading = /** @type {number|undefined} */
      (goog.object.get(object, 'heading'));
  if (goog.isDef(heading)) {
    rotation = goog.math.toRadians(heading);
  }

  var scale = /** @type {number|undefined} */
      (goog.object.get(object, 'scale'));
  if (src == ol.format.KML.DEFAULT_IMAGE_STYLE_SRC_) {
    size = ol.format.KML.DEFAULT_IMAGE_STYLE_SIZE_;
  }
  
  var srcmap = this.imgSrcMap_;
  if(srcmap && srcmap[src]) {
  src = srcmap[src];
  }

  var imageStyle = new ol.style.Icon({
    anchor: anchor,
    anchorOrigin: ol.style.IconOrigin.BOTTOM_LEFT,
    anchorXUnits: anchorXUnits,
    anchorYUnits: anchorYUnits,
    crossOrigin: 'anonymous', // FIXME should this be configurable?
    offset: offset,
    offsetOrigin: ol.style.IconOrigin.BOTTOM_LEFT,
    rotation: rotation,
    scale: scale,
    size: size,
    src: src
  });
  goog.object.set(styleObject, 'imageStyle', imageStyle);
};


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.PLACEMARK_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KML.NAMESPACE_URIS_, {
      'ExtendedData': ol.format.KML.ExtendedDataParser_,
      'MultiGeometry': ol.xml.makeObjectPropertySetter(
          ol.format.KML.readMultiGeometry_, 'geometry'),
      'LineString': ol.xml.makeObjectPropertySetter(
          ol.format.KML.readLineString_, 'geometry'),
      'LinearRing': ol.xml.makeObjectPropertySetter(
          ol.format.KML.readLinearRing_, 'geometry'),
      'Point': ol.xml.makeObjectPropertySetter(
          ol.format.KML.readPoint_, 'geometry'),
      'Polygon': ol.xml.makeObjectPropertySetter(
          ol.format.KML.readPolygon_, 'geometry'),
      'Style': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readStyle_),
      'StyleMap': ol.format.KML.PlacemarkStyleMapParser_,
      'address': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'description': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'name': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'open': ol.xml.makeObjectPropertySetter(ol.format.XSD.readBoolean),
      'phoneNumber': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'styleUrl': ol.xml.makeObjectPropertySetter(ol.format.KML.readURI_),
      'visibility': ol.xml.makeObjectPropertySetter(ol.format.XSD.readBoolean)
    }, ol.xml.makeParsersNS(
        ol.format.KML.GX_NAMESPACE_URIS_, {
          'MultiTrack': ol.xml.makeObjectPropertySetter(
              ol.format.KML.readGxMultiTrack_, 'geometry'),
          'Track': ol.xml.makeObjectPropertySetter(
              ol.format.KML.readGxTrack_, 'geometry')
        }
    ));


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.STYLE_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KML.NAMESPACE_URIS_, {
      'IconStyle': ol.format.KMZ.IconStyleParser_,
      'LineStyle': ol.format.KML.LineStyleParser_,
      'PolyStyle': ol.format.KML.PolyStyleParser_
    });