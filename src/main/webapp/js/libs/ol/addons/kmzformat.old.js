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


/**
 * @typedef {{x: number, xunits: (ol.style.IconAnchorUnits|undefined),
 *            y: number, yunits: (ol.style.IconAnchorUnits|undefined)}}
 */
ol.format.KMZVec2_;


/**
 * @typedef {{flatCoordinates: Array.<number>,
 *            whens: Array.<number>}}
 */
ol.format.KMZGxTrackObject_;



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

  goog.base(this);

  /**
   * @inheritDoc
   */
  this.defaultDataProjection = ol.proj.get('EPSG:4326');

  this.imgSrcMap_ = goog.isDef(options.imgSrcMap) ?
    options.imgSrcMap : null;
  
  var defaultStyle = goog.isDef(options.defaultStyle) ?
      options.defaultStyle : ol.format.KMZ.DEFAULT_STYLE_ARRAY_;

  /** @type {Object.<string, (Array.<ol.style.Style>|string)>} */
  var sharedStyles = {};

  var findStyle =
      /**
       * @param {Array.<ol.style.Style>|string|undefined} styleValue Style
       *     value.
       * @return {Array.<ol.style.Style>} Style.
       */
      function(styleValue) {
    if (goog.isArray(styleValue)) {
      return styleValue;
    } else if (goog.isString(styleValue)) {
      // KMZ files in the wild occasionally forget the leading `#` on styleUrls
      // defined in the same document.  Add a leading `#` if it enables to find
      // a style.
      if (!(styleValue in sharedStyles) && ('#' + styleValue in sharedStyles)) {
        styleValue = '#' + styleValue;
      }
      return findStyle(sharedStyles[styleValue]);
    } else {
      return defaultStyle;
    }
  };

  /**
   * @private
   * @type {boolean}
   */
  this.extractStyles_ = goog.isDef(options.extractStyles) ?
      options.extractStyles : true;

  /**
   * @private
   * @type {Object.<string, (Array.<ol.style.Style>|string)>}
   */
  this.sharedStyles_ = sharedStyles;

  /**
   * @private
   * @type {ol.feature.FeatureStyleFunction}
   */
  this.featureStyleFunction_ =
      /**
       * @param {number} resolution Resolution.
       * @return {Array.<ol.style.Style>} Style.
       * @this {ol.Feature}
       */
      function(resolution) {
    var style = /** @type {Array.<ol.style.Style>|undefined} */
        (this.get('Style'));
    if (goog.isDef(style)) {
      return style;
    }
    var styleUrl = /** @type {string|undefined} */ (this.get('styleUrl'));
    if (goog.isDef(styleUrl)) {
      return findStyle(styleUrl);
    }
    return defaultStyle;
  };

};
goog.inherits(ol.format.KMZ, ol.format.KML);


/**
 * @const
 * @type {Array.<string>}
 * @private
 */
ol.format.KMZ.EXTENSIONS_ = ['.kml'];


/**
 * @const
 * @type {Array.<string>}
 * @private
 */
ol.format.KMZ.GX_NAMESPACE_URIS_ = [
  'http://www.google.com/kml/ext/2.2'
];


/**
 * @const
 * @type {Array.<string>}
 * @private
 */
ol.format.KMZ.NAMESPACE_URIS_ = [
  null,
  'http://earth.google.com/kml/2.0',
  'http://earth.google.com/kml/2.1',
  'http://earth.google.com/kml/2.2',
  'http://www.opengis.net/kml/2.2'
];


/**
 * @const
 * @type {string}
 * @private
 */
ol.format.KMZ.SCHEMA_LOCATION_ = 'http://www.opengis.net/kml/2.2 ' +
    'https://developers.google.com/kml/schema/kml22gx.xsd';


/**
 * @const
 * @type {ol.Color}
 * @private
 */
ol.format.KMZ.DEFAULT_COLOR_ = [255, 255, 255, 1];


/**
 * @const
 * @type {ol.style.Fill}
 * @private
 */
ol.format.KMZ.DEFAULT_FILL_STYLE_ = new ol.style.Fill({
  color: ol.format.KMZ.DEFAULT_COLOR_
});


/**
 * @const
 * @type {ol.Size}
 * @private
 */
ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_ = [2, 20]; // FIXME maybe [8, 32] ?


/**
 * @const
 * @type {ol.style.IconAnchorUnits}
 * @private
 */
ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_X_UNITS_ =
    ol.style.IconAnchorUnits.PIXELS;


/**
 * @const
 * @type {ol.style.IconAnchorUnits}
 * @private
 */
ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_Y_UNITS_ =
    ol.style.IconAnchorUnits.PIXELS;


/**
 * @const
 * @type {ol.Size}
 * @private
 */
ol.format.KMZ.DEFAULT_IMAGE_STYLE_SIZE_ = [32, 32];


/**
 * @const
 * @type {string}
 * @private
 */
ol.format.KMZ.DEFAULT_IMAGE_STYLE_SRC_ =
    'https://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png';


/**
 * @const
 * @type {ol.style.Image}
 * @private
 */
ol.format.KMZ.DEFAULT_IMAGE_STYLE_ = new ol.style.Icon({
  anchor: ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_,
  anchorXUnits: ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_X_UNITS_,
  anchorYUnits: ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_Y_UNITS_,
  crossOrigin: 'anonymous',
  rotation: 0,
  scale: 1,
  size: ol.format.KMZ.DEFAULT_IMAGE_STYLE_SIZE_,
  src: ol.format.KMZ.DEFAULT_IMAGE_STYLE_SRC_
});


/**
 * @const
 * @type {ol.style.Stroke}
 * @private
 */
ol.format.KMZ.DEFAULT_STROKE_STYLE_ = new ol.style.Stroke({
  color: ol.format.KMZ.DEFAULT_COLOR_,
  width: 1
});


/**
 * @const
 * @type {ol.style.Text}
 * @private
 */
ol.format.KMZ.DEFAULT_TEXT_STYLE_ = new ol.style.Text({
  font: 'normal 16px Helvetica',
  fill: ol.format.KMZ.DEFAULT_FILL_STYLE_,
  stroke: ol.format.KMZ.DEFAULT_STROKE_STYLE_,
  scale: 1
});


/**
 * @const
 * @type {ol.style.Style}
 * @private
 */
ol.format.KMZ.DEFAULT_STYLE_ = new ol.style.Style({
  fill: ol.format.KMZ.DEFAULT_FILL_STYLE_,
  image: ol.format.KMZ.DEFAULT_IMAGE_STYLE_,
  text: ol.format.KMZ.DEFAULT_TEXT_STYLE_,
  stroke: ol.format.KMZ.DEFAULT_STROKE_STYLE_,
  zIndex: 0
});


/**
 * @const
 * @type {Array.<ol.style.Style>}
 * @private
 */
ol.format.KMZ.DEFAULT_STYLE_ARRAY_ = [ol.format.KMZ.DEFAULT_STYLE_];


/**
 * @const
 * @type {Object.<string, ol.style.IconAnchorUnits>}
 * @private
 */
ol.format.KMZ.ICON_ANCHOR_UNITS_MAP_ = {
  'fraction': ol.style.IconAnchorUnits.FRACTION,
  'pixels': ol.style.IconAnchorUnits.PIXELS
};


/**
 * @param {Node} node Node.
 * @private
 * @return {ol.Color|undefined} Color.
 */
ol.format.KMZ.readColor_ = function(node) {
  var s = ol.xml.getAllTextContent(node, false);
  // The KMZ specification states that colors should not include a leading `#`
  // but we tolerate them.
  var m = /^\s*#?\s*([0-9A-Fa-f]{8})\s*$/.exec(s);
  if (m) {
    var hexColor = m[1];
    return [
      parseInt(hexColor.substr(6, 2), 16),
      parseInt(hexColor.substr(4, 2), 16),
      parseInt(hexColor.substr(2, 2), 16),
      parseInt(hexColor.substr(0, 2), 16) / 255
    ];

  } else {
    return undefined;
  }
};


/**
 * @param {Node} node Node.
 * @private
 * @return {Array.<number>|undefined} Flat coordinates.
 */
ol.format.KMZ.readFlatCoordinates_ = function(node) {
  var s = ol.xml.getAllTextContent(node, false);
  var flatCoordinates = [];
  // The KMZ specification states that coordinate tuples should not include
  // spaces, but we tolerate them.
  var re =
      /^\s*([+\-]?\d*\.?\d+(?:e[+\-]?\d+)?)\s*,\s*([+\-]?\d*\.?\d+(?:e[+\-]?\d+)?)(?:\s*,\s*([+\-]?\d*\.?\d+(?:e[+\-]?\d+)?))?\s*/i;
  var m;
  while ((m = re.exec(s))) {
    var x = parseFloat(m[1]);
    var y = parseFloat(m[2]);
    var z = m[3] ? parseFloat(m[3]) : 0;
    flatCoordinates.push(x, y, z);
    s = s.substr(m[0].length);
  }
  if (s !== '') {
    return undefined;
  }
  return flatCoordinates;
};


/**
 * @param {Node} node Node.
 * @private
 * @return {string|undefined} Style URL.
 */
ol.format.KMZ.readStyleUrl_ = function(node) {
  var s = goog.string.trim(ol.xml.getAllTextContent(node, false));
  if (goog.isDefAndNotNull(node.baseURI)) {
    return goog.Uri.resolve(node.baseURI, s).toString();
  } else {
    return s;
  }

};


/**
 * @param {Node} node Node.
 * @private
 * @return {string} URI.
 */
ol.format.KMZ.readURI_ = function(node) {
  var s = ol.xml.getAllTextContent(node, false);
  if (goog.isDefAndNotNull(node.baseURI)) {
    return goog.Uri.resolve(node.baseURI, goog.string.trim(s)).toString();
  } else {
    return goog.string.trim(s);
  }
};


/**
 * @param {Node} node Node.
 * @private
 * @return {ol.format.KMZVec2_} Vec2.
 */
ol.format.KMZ.readVec2_ = function(node) {
  var xunits = node.getAttribute('xunits');
  var yunits = node.getAttribute('yunits');
  return {
    x: parseFloat(node.getAttribute('x')),
    xunits: ol.format.KMZ.ICON_ANCHOR_UNITS_MAP_[xunits],
    y: parseFloat(node.getAttribute('y')),
    yunits: ol.format.KMZ.ICON_ANCHOR_UNITS_MAP_[yunits]
  };
};


/**
 * @param {Node} node Node.
 * @private
 * @return {number|undefined} Scale.
 */
ol.format.KMZ.readScale_ = function(node) {
  var number = ol.format.XSD.readDecimal(node);
  if (goog.isDef(number)) {
    return Math.sqrt(number);
  } else {
    return undefined;
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {Array.<ol.style.Style>|string|undefined} StyleMap.
 */
ol.format.KMZ.readStyleMapValue_ = function(node, objectStack) {
  return ol.xml.pushParseAndPop(
      /** @type {Array.<ol.style.Style>|string|undefined} */ (undefined),
      ol.format.KMZ.STYLE_MAP_PARSERS_, node, objectStack);
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.IconStyleParser_ = function(node, objectStack, self) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'IconStyle');
  // FIXME refreshMode
  // FIXME refreshInterval
  // FIXME viewRefreshTime
  // FIXME viewBoundScale
  // FIXME viewFormat
  // FIXME httpQuery
  var object = ol.xml.pushParseAndPop(
      {}, ol.format.KMZ.ICON_STYLE_PARSERS_, node, objectStack);
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
    src = ol.format.KMZ.DEFAULT_IMAGE_STYLE_SRC_;
  }
  var anchor, anchorXUnits, anchorYUnits;
  var hotSpot = /** @type {ol.format.KMZVec2_|undefined} */
      (goog.object.get(object, 'hotSpot'));
  if (goog.isDef(hotSpot)) {
    anchor = [hotSpot.x, hotSpot.y];
    anchorXUnits = hotSpot.xunits;
    anchorYUnits = hotSpot.yunits;
  } else if (src === ol.format.KMZ.DEFAULT_IMAGE_STYLE_SRC_) {
    anchor = ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_;
    anchorXUnits = ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_X_UNITS_;
    anchorYUnits = ol.format.KMZ.DEFAULT_IMAGE_STYLE_ANCHOR_Y_UNITS_;
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
  if (src == ol.format.KMZ.DEFAULT_IMAGE_STYLE_SRC_) {
    size = ol.format.KMZ.DEFAULT_IMAGE_STYLE_SIZE_;
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
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.LabelStyleParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'LabelStyle');
  // FIXME colorMode
  var object = ol.xml.pushParseAndPop(
      {}, ol.format.KMZ.LABEL_STYLE_PARSERS_, node, objectStack);
  if (!goog.isDef(object)) {
    return;
  }
  var styleObject = objectStack[objectStack.length - 1];
  goog.asserts.assert(goog.isObject(styleObject));
  var textStyle = new ol.style.Text({
    fill: new ol.style.Fill({
      color: /** @type {ol.Color} */
          (goog.object.get(object, 'color', ol.format.KMZ.DEFAULT_COLOR_))
    }),
    scale: /** @type {number|undefined} */
        (goog.object.get(object, 'scale'))
  });
  goog.object.set(styleObject, 'textStyle', textStyle);
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.LineStyleParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'LineStyle');
  // FIXME colorMode
  // FIXME gx:outerColor
  // FIXME gx:outerWidth
  // FIXME gx:physicalWidth
  // FIXME gx:labelVisibility
  var object = ol.xml.pushParseAndPop(
      {}, ol.format.KMZ.LINE_STYLE_PARSERS_, node, objectStack);
  if (!goog.isDef(object)) {
    return;
  }
  var styleObject = objectStack[objectStack.length - 1];
  goog.asserts.assert(goog.isObject(styleObject));
  var strokeStyle = new ol.style.Stroke({
    color: /** @type {ol.Color} */
        (goog.object.get(object, 'color', ol.format.KMZ.DEFAULT_COLOR_)),
    width: /** @type {number} */ (goog.object.get(object, 'width', 1))
  });
  goog.object.set(styleObject, 'strokeStyle', strokeStyle);
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.PolyStyleParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'PolyStyle');
  // FIXME colorMode
  var object = ol.xml.pushParseAndPop(
      {}, ol.format.KMZ.POLY_STYLE_PARSERS_, node, objectStack);
  if (!goog.isDef(object)) {
    return;
  }
  var styleObject = objectStack[objectStack.length - 1];
  goog.asserts.assert(goog.isObject(styleObject));
  var fillStyle = new ol.style.Fill({
    color: /** @type {ol.Color} */
        (goog.object.get(object, 'color', ol.format.KMZ.DEFAULT_COLOR_))
  });
  goog.object.set(styleObject, 'fillStyle', fillStyle);
  var fill = /** @type {boolean|undefined} */ (goog.object.get(object, 'fill'));
  if (goog.isDef(fill)) {
    goog.object.set(styleObject, 'fill', fill);
  }
  var outline =
      /** @type {boolean|undefined} */ (goog.object.get(object, 'outline'));
  if (goog.isDef(outline)) {
    goog.object.set(styleObject, 'outline', outline);
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {Array.<number>} LinearRing flat coordinates.
 */
ol.format.KMZ.readFlatLinearRing_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'LinearRing');
  return /** @type {Array.<number>} */ (ol.xml.pushParseAndPop(
      null, ol.format.KMZ.FLAT_LINEAR_RING_PARSERS_, node, objectStack));
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.gxCoordParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(goog.array.contains(
      ol.format.KMZ.GX_NAMESPACE_URIS_, node.namespaceURI));
  goog.asserts.assert(node.localName == 'coord');
  var gxTrackObject = /** @type {ol.format.KMZGxTrackObject_} */
      (objectStack[objectStack.length - 1]);
  goog.asserts.assert(goog.isObject(gxTrackObject));
  var flatCoordinates = gxTrackObject.flatCoordinates;
  var s = ol.xml.getAllTextContent(node, false);
  var re =
      /^\s*([+\-]?\d+(?:\.\d*)?(?:e[+\-]?\d*)?)\s+([+\-]?\d+(?:\.\d*)?(?:e[+\-]?\d*)?)\s+([+\-]?\d+(?:\.\d*)?(?:e[+\-]?\d*)?)\s*$/i;
  var m = re.exec(s);
  if (m) {
    var x = parseFloat(m[1]);
    var y = parseFloat(m[2]);
    var z = parseFloat(m[3]);
    flatCoordinates.push(x, y, z, 0);
  } else {
    flatCoordinates.push(0, 0, 0, 0);
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.geom.MultiLineString|undefined} MultiLineString.
 */
ol.format.KMZ.readGxMultiTrack_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(goog.array.contains(
      ol.format.KMZ.GX_NAMESPACE_URIS_, node.namespaceURI));
  goog.asserts.assert(node.localName == 'MultiTrack');
  var lineStrings = ol.xml.pushParseAndPop(
      /** @type {Array.<ol.geom.LineString>} */ ([]),
      ol.format.KMZ.GX_MULTITRACK_GEOMETRY_PARSERS_, node, objectStack);
  if (!goog.isDef(lineStrings)) {
    return undefined;
  }
  var multiLineString = new ol.geom.MultiLineString(null);
  multiLineString.setLineStrings(lineStrings);
  return multiLineString;
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.geom.LineString|undefined} LineString.
 */
ol.format.KMZ.readGxTrack_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(goog.array.contains(
      ol.format.KMZ.GX_NAMESPACE_URIS_, node.namespaceURI));
  goog.asserts.assert(node.localName == 'Track');
  var gxTrackObject = ol.xml.pushParseAndPop(
      /** @type {ol.format.KMZGxTrackObject_} */ ({
        flatCoordinates: [],
        whens: []
      }), ol.format.KMZ.GX_TRACK_PARSERS_, node, objectStack);
  if (!goog.isDef(gxTrackObject)) {
    return undefined;
  }
  var flatCoordinates = gxTrackObject.flatCoordinates;
  var whens = gxTrackObject.whens;
  goog.asserts.assert(flatCoordinates.length / 4 == whens.length);
  var i, ii;
  for (i = 0, ii = Math.min(flatCoordinates.length, whens.length); i < ii;
       ++i) {
    flatCoordinates[4 * i + 3] = whens[i];
  }
  var lineString = new ol.geom.LineString(null);
  lineString.setFlatCoordinates(ol.geom.GeometryLayout.XYZM, flatCoordinates);
  return lineString;
};

/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {Object} Icon object.
 */
ol.format.KMZ.readIcon_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Icon');
  var iconObject = ol.xml.pushParseAndPop(
      {}, ol.format.KMZ.ICON_PARSERS_, node, objectStack);
  if (goog.isDef(iconObject)) {
    return iconObject;
  } else {
    return null;
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {Array.<number>} Flat coordinates.
 */
ol.format.KMZ.readFlatCoordinatesFromNode_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  return /** @type {Array.<number>} */ (ol.xml.pushParseAndPop(null,
      ol.format.KMZ.GEOMETRY_FLAT_COORDINATES_PARSERS_, node, objectStack));
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.geom.LineString|undefined} LineString.
 */
ol.format.KMZ.readLineString_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'LineString');
  var flatCoordinates =
      ol.format.KMZ.readFlatCoordinatesFromNode_(node, objectStack);
  if (goog.isDef(flatCoordinates)) {
    var lineString = new ol.geom.LineString(null);
    lineString.setFlatCoordinates(ol.geom.GeometryLayout.XYZ, flatCoordinates);
    return lineString;
  } else {
    return undefined;
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.geom.Polygon|undefined} Polygon.
 */
ol.format.KMZ.readLinearRing_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'LinearRing');
  var flatCoordinates =
      ol.format.KMZ.readFlatCoordinatesFromNode_(node, objectStack);
  if (goog.isDef(flatCoordinates)) {
    var polygon = new ol.geom.Polygon(null);
    polygon.setFlatCoordinates(ol.geom.GeometryLayout.XYZ, flatCoordinates,
        [flatCoordinates.length]);
    return polygon;
  } else {
    return undefined;
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.geom.Geometry} Geometry.
 */
ol.format.KMZ.readMultiGeometry_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'MultiGeometry');
  var geometries = ol.xml.pushParseAndPop(
      /** @type {Array.<ol.geom.Geometry>} */ ([]),
      ol.format.KMZ.MULTI_GEOMETRY_PARSERS_, node, objectStack);
  if (!goog.isDef(geometries)) {
    return null;
  }
  if (geometries.length === 0) {
    return new ol.geom.GeometryCollection(geometries);
  }
  var homogeneous = true;
  var type = geometries[0].getType();
  var geometry, i, ii;
  for (i = 1, ii = geometries.length; i < ii; ++i) {
    geometry = geometries[i];
    if (geometry.getType() != type) {
      homogeneous = false;
      break;
    }
  }
  if (homogeneous) {
    /** @type {ol.geom.GeometryLayout} */
    var layout;
    /** @type {Array.<number>} */
    var flatCoordinates;
    if (type == ol.geom.GeometryType.POINT) {
      var point = geometries[0];
      goog.asserts.assertInstanceof(point, ol.geom.Point);
      layout = point.getLayout();
      flatCoordinates = point.getFlatCoordinates();
      for (i = 1, ii = geometries.length; i < ii; ++i) {
        geometry = geometries[i];
        goog.asserts.assertInstanceof(geometry, ol.geom.Point);
        goog.asserts.assert(geometry.getLayout() == layout);
        ol.array.safeExtend(flatCoordinates, geometry.getFlatCoordinates());
      }
      var multiPoint = new ol.geom.MultiPoint(null);
      multiPoint.setFlatCoordinates(layout, flatCoordinates);
      return multiPoint;
    } else if (type == ol.geom.GeometryType.LINE_STRING) {
      var multiLineString = new ol.geom.MultiLineString(null);
      multiLineString.setLineStrings(geometries);
      return multiLineString;
    } else if (type == ol.geom.GeometryType.POLYGON) {
      var multiPolygon = new ol.geom.MultiPolygon(null);
      multiPolygon.setPolygons(geometries);
      return multiPolygon;
    } else if (type == ol.geom.GeometryType.GEOMETRY_COLLECTION) {
      return new ol.geom.GeometryCollection(geometries);
    } else {
      goog.asserts.fail();
      return null;
    }
  } else {
    return new ol.geom.GeometryCollection(geometries);
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.geom.Point|undefined} Point.
 */
ol.format.KMZ.readPoint_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Point');
  var flatCoordinates =
      ol.format.KMZ.readFlatCoordinatesFromNode_(node, objectStack);
  if (goog.isDefAndNotNull(flatCoordinates)) {
    var point = new ol.geom.Point(null);
    goog.asserts.assert(flatCoordinates.length == 3);
    point.setFlatCoordinates(ol.geom.GeometryLayout.XYZ, flatCoordinates);
    return point;
  } else {
    return undefined;
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.geom.Polygon|undefined} Polygon.
 */
ol.format.KMZ.readPolygon_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Polygon');
  var flatLinearRings = ol.xml.pushParseAndPop(
      /** @type {Array.<Array.<number>>} */ ([null]),
      ol.format.KMZ.FLAT_LINEAR_RINGS_PARSERS_, node, objectStack);
  if (goog.isDefAndNotNull(flatLinearRings) &&
      !goog.isNull(flatLinearRings[0])) {
    var polygon = new ol.geom.Polygon(null);
    var flatCoordinates = flatLinearRings[0];
    var ends = [flatCoordinates.length];
    var i, ii;
    for (i = 1, ii = flatLinearRings.length; i < ii; ++i) {
      ol.array.safeExtend(flatCoordinates, flatLinearRings[i]);
      ends.push(flatCoordinates.length);
    }
    polygon.setFlatCoordinates(
        ol.geom.GeometryLayout.XYZ, flatCoordinates, ends);
    return polygon;
  } else {
    return undefined;
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {Array.<ol.style.Style>} Style.
 */
ol.format.KMZ.readStyle_ = function(node, objectStack, opt_this) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Style');
  var styleObject = ol.xml.pushParseAndPop(
      {}, ol.format.KMZ.STYLE_PARSERS_, node, objectStack, opt_this);
  if (!goog.isDef(styleObject)) {
    return null;
  }
  var fillStyle = /** @type {ol.style.Fill} */ (goog.object.get(
      styleObject, 'fillStyle', ol.format.KMZ.DEFAULT_FILL_STYLE_));
  var fill = /** @type {boolean|undefined} */
      (goog.object.get(styleObject, 'fill'));
  if (goog.isDef(fill) && !fill) {
    fillStyle = null;
  }
  var imageStyle = /** @type {ol.style.Image} */ (goog.object.get(
      styleObject, 'imageStyle', ol.format.KMZ.DEFAULT_IMAGE_STYLE_));
  var textStyle = /** @type {ol.style.Text} */ (goog.object.get(
      styleObject, 'textStyle', ol.format.KMZ.DEFAULT_TEXT_STYLE_));
  var strokeStyle = /** @type {ol.style.Stroke} */ (goog.object.get(
      styleObject, 'strokeStyle', ol.format.KMZ.DEFAULT_STROKE_STYLE_));
  var outline = /** @type {boolean|undefined} */
      (goog.object.get(styleObject, 'outline'));
  if (goog.isDef(outline) && !outline) {
    strokeStyle = null;
  }
  return [new ol.style.Style({
    fill: fillStyle,
    image: imageStyle,
    stroke: strokeStyle,
    text: textStyle,
    zIndex: undefined // FIXME
  })];
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.DataParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Data');
  var name = node.getAttribute('name');
  if (!goog.isNull(name)) {
    var data = ol.xml.pushParseAndPop(
        undefined, ol.format.KMZ.DATA_PARSERS_, node, objectStack);
    if (goog.isDef(data)) {
      var featureObject =
          /** @type {Object} */ (objectStack[objectStack.length - 1]);
      goog.asserts.assert(goog.isObject(featureObject));
      goog.object.set(featureObject, name, data);
    }
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.ExtendedDataParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'ExtendedData');
  ol.xml.parseNode(ol.format.KMZ.EXTENDED_DATA_PARSERS_, node, objectStack);
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.PairDataParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Pair');
  var pairObject = ol.xml.pushParseAndPop(
      {}, ol.format.KMZ.PAIR_PARSERS_, node, objectStack);
  if (!goog.isDef(pairObject)) {
    return;
  }
  var key = /** @type {string|undefined} */
      (goog.object.get(pairObject, 'key'));
  if (goog.isDef(key) && key == 'normal') {
    var styleUrl = /** @type {string|undefined} */
        (goog.object.get(pairObject, 'styleUrl'));
    if (goog.isDef(styleUrl)) {
      objectStack[objectStack.length - 1] = styleUrl;
    }
    var Style = /** @type {ol.style.Style} */
        (goog.object.get(pairObject, 'Style'));
    if (goog.isDef(Style)) {
      objectStack[objectStack.length - 1] = Style;
    }
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.PlacemarkStyleMapParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'StyleMap');
  var styleMapValue = ol.format.KMZ.readStyleMapValue_(node, objectStack);
  if (!goog.isDef(styleMapValue)) {
    return;
  }
  var placemarkObject = objectStack[objectStack.length - 1];
  goog.asserts.assert(goog.isObject(placemarkObject));
  if (goog.isArray(styleMapValue)) {
    goog.object.set(placemarkObject, 'Style', styleMapValue);
  } else if (goog.isString(styleMapValue)) {
    goog.object.set(placemarkObject, 'styleUrl', styleMapValue);
  } else {
    goog.asserts.fail();
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.SchemaDataParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'SchemaData');
  ol.xml.parseNode(ol.format.KMZ.SCHEMA_DATA_PARSERS_, node, objectStack);
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.SimpleDataParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'SimpleData');
  var name = node.getAttribute('name');
  if (!goog.isNull(name)) {
    var data = ol.format.XSD.readString(node);
    var featureObject =
        /** @type {Object} */ (objectStack[objectStack.length - 1]);
    goog.object.set(featureObject, name, data);
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.innerBoundaryIsParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'innerBoundaryIs');
  var flatLinearRing = ol.xml.pushParseAndPop(
      /** @type {Array.<number>|undefined} */ (undefined),
      ol.format.KMZ.INNER_BOUNDARY_IS_PARSERS_, node, objectStack);
  if (goog.isDef(flatLinearRing)) {
    var flatLinearRings = /** @type {Array.<Array.<number>>} */
        (objectStack[objectStack.length - 1]);
    goog.asserts.assert(goog.isArray(flatLinearRings));
    goog.asserts.assert(flatLinearRings.length > 0);
    flatLinearRings.push(flatLinearRing);
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.outerBoundaryIsParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'outerBoundaryIs');
  var flatLinearRing = ol.xml.pushParseAndPop(
      /** @type {Array.<number>|undefined} */ (undefined),
      ol.format.KMZ.OUTER_BOUNDARY_IS_PARSERS_, node, objectStack);
  if (goog.isDef(flatLinearRing)) {
    var flatLinearRings = /** @type {Array.<Array.<number>>} */
        (objectStack[objectStack.length - 1]);
    goog.asserts.assert(goog.isArray(flatLinearRings));
    goog.asserts.assert(flatLinearRings.length > 0);
    flatLinearRings[0] = flatLinearRing;
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.whenParser_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'when');
  var gxTrackObject = /** @type {ol.format.KMZGxTrackObject_} */
      (objectStack[objectStack.length - 1]);
  goog.asserts.assert(goog.isObject(gxTrackObject));
  var whens = gxTrackObject.whens;
  var s = ol.xml.getAllTextContent(node, false);
  var re =
      /^\s*(\d{4})($|-(\d{2})($|-(\d{2})($|T(\d{2}):(\d{2}):(\d{2})(Z|(?:([+\-])(\d{2})(?::(\d{2}))?)))))\s*$/;
  var m = re.exec(s);
  if (m) {
    var year = parseInt(m[1], 10);
    var month = goog.isDef(m[3]) ? parseInt(m[3], 10) - 1 : 0;
    var day = goog.isDef(m[5]) ? parseInt(m[5], 10) : 1;
    var hour = goog.isDef(m[7]) ? parseInt(m[7], 10) : 0;
    var minute = goog.isDef(m[8]) ? parseInt(m[8], 10) : 0;
    var second = goog.isDef(m[9]) ? parseInt(m[9], 10) : 0;
    var when = Date.UTC(year, month, day, hour, minute, second);
    if (goog.isDef(m[10]) && m[10] != 'Z') {
      var sign = m[11] == '-' ? -1 : 1;
      when += sign * 60 * parseInt(m[12], 10);
      if (goog.isDef(m[13])) {
        when += sign * 60 * 60 * parseInt(m[13], 10);
      }
    }
    whens.push(when);
  } else {
    whens.push(0);
  }
};


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.DATA_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'value': ol.xml.makeReplacer(ol.format.XSD.readString)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.EXTENDED_DATA_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'Data': ol.format.KMZ.DataParser_,
      'SchemaData': ol.format.KMZ.SchemaDataParser_
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.FLAT_LINEAR_RING_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'coordinates': ol.xml.makeReplacer(ol.format.KMZ.readFlatCoordinates_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.FLAT_LINEAR_RINGS_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'innerBoundaryIs': ol.format.KMZ.innerBoundaryIsParser_,
      'outerBoundaryIs': ol.format.KMZ.outerBoundaryIsParser_
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.GX_TRACK_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'when': ol.format.KMZ.whenParser_
    }, ol.xml.makeParsersNS(
        ol.format.KMZ.GX_NAMESPACE_URIS_, {
          'coord': ol.format.KMZ.gxCoordParser_
        }));


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.GEOMETRY_FLAT_COORDINATES_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'coordinates': ol.xml.makeReplacer(ol.format.KMZ.readFlatCoordinates_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.ICON_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'href': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readURI_)
    }, ol.xml.makeParsersNS(
        ol.format.KMZ.GX_NAMESPACE_URIS_, {
          'x': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal),
          'y': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal),
          'w': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal),
          'h': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal)
        }));


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.ICON_STYLE_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'Icon': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readIcon_),
      'heading': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal),
      'hotSpot': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readVec2_),
      'scale': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readScale_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.INNER_BOUNDARY_IS_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'LinearRing': ol.xml.makeReplacer(ol.format.KMZ.readFlatLinearRing_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.LABEL_STYLE_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'color': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readColor_),
      'scale': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readScale_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.LINE_STYLE_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'color': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readColor_),
      'width': ol.xml.makeObjectPropertySetter(ol.format.XSD.readDecimal)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.MULTI_GEOMETRY_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'LineString': ol.xml.makeArrayPusher(ol.format.KMZ.readLineString_),
      'LinearRing': ol.xml.makeArrayPusher(ol.format.KMZ.readLinearRing_),
      'MultiGeometry': ol.xml.makeArrayPusher(ol.format.KMZ.readMultiGeometry_),
      'Point': ol.xml.makeArrayPusher(ol.format.KMZ.readPoint_),
      'Polygon': ol.xml.makeArrayPusher(ol.format.KMZ.readPolygon_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.GX_MULTITRACK_GEOMETRY_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.GX_NAMESPACE_URIS_, {
      'Track': ol.xml.makeArrayPusher(ol.format.KMZ.readGxTrack_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.OUTER_BOUNDARY_IS_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'LinearRing': ol.xml.makeReplacer(ol.format.KMZ.readFlatLinearRing_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.PAIR_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'Style': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readStyle_),
      'key': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'styleUrl': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readStyleUrl_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.PLACEMARK_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'ExtendedData': ol.format.KMZ.ExtendedDataParser_,
      'MultiGeometry': ol.xml.makeObjectPropertySetter(
          ol.format.KMZ.readMultiGeometry_, 'geometry'),
      'LineString': ol.xml.makeObjectPropertySetter(
          ol.format.KMZ.readLineString_, 'geometry'),
      'LinearRing': ol.xml.makeObjectPropertySetter(
          ol.format.KMZ.readLinearRing_, 'geometry'),
      'Point': ol.xml.makeObjectPropertySetter(
          ol.format.KMZ.readPoint_, 'geometry'),
      'Polygon': ol.xml.makeObjectPropertySetter(
          ol.format.KMZ.readPolygon_, 'geometry'),
      'Style': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readStyle_),
      'StyleMap': ol.format.KMZ.PlacemarkStyleMapParser_,
      'address': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'description': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'name': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'open': ol.xml.makeObjectPropertySetter(ol.format.XSD.readBoolean),
      'phoneNumber': ol.xml.makeObjectPropertySetter(ol.format.XSD.readString),
      'styleUrl': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readURI_),
      'visibility': ol.xml.makeObjectPropertySetter(ol.format.XSD.readBoolean)
    }, ol.xml.makeParsersNS(
        ol.format.KMZ.GX_NAMESPACE_URIS_, {
          'MultiTrack': ol.xml.makeObjectPropertySetter(
              ol.format.KMZ.readGxMultiTrack_, 'geometry'),
          'Track': ol.xml.makeObjectPropertySetter(
              ol.format.KMZ.readGxTrack_, 'geometry')
        }
    ));


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.POLY_STYLE_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'color': ol.xml.makeObjectPropertySetter(ol.format.KMZ.readColor_),
      'fill': ol.xml.makeObjectPropertySetter(ol.format.XSD.readBoolean),
      'outline': ol.xml.makeObjectPropertySetter(ol.format.XSD.readBoolean)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.SCHEMA_DATA_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'SimpleData': ol.format.KMZ.SimpleDataParser_
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.STYLE_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'IconStyle': ol.format.KMZ.IconStyleParser_,
      'LabelStyle': ol.format.KMZ.LabelStyleParser_,
      'LineStyle': ol.format.KMZ.LineStyleParser_,
      'PolyStyle': ol.format.KMZ.PolyStyleParser_
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Parser>>}
 * @private
 */
ol.format.KMZ.STYLE_MAP_PARSERS_ = ol.xml.makeParsersNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'Pair': ol.format.KMZ.PairDataParser_
    });


/**
 * @inheritDoc
 */
ol.format.KMZ.prototype.getExtensions = function() {
  return ol.format.KMZ.EXTENSIONS_;
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
      ol.format.KMZ.NAMESPACE_URIS_, {
        'Folder': ol.xml.makeArrayExtender(this.readDocumentOrFolder_, this),
        'Placemark': ol.xml.makeArrayPusher(this.readPlacemark_, this),
        'Style': goog.bind(this.readSharedStyle_, this),
        'StyleMap': goog.bind(this.readSharedStyleMap_, this)
      });
  var features = ol.xml.pushParseAndPop(/** @type {Array.<ol.Feature>} */ ([]),
      parsersNS, node, objectStack, this);
  if (goog.isDef(features)) {
    return features;
  } else {
    return undefined;
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 * @return {ol.Feature|undefined} Feature.
 */
ol.format.KMZ.prototype.readPlacemark_ = function(node, objectStack) {
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
 */
ol.format.KMZ.prototype.readSharedStyle_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'Style');
  var id = node.getAttribute('id');
  if (!goog.isNull(id)) {
    var style = ol.format.KMZ.readStyle_(node, objectStack, this);
    if (goog.isDef(style)) {
      var styleUri;
      if (goog.isDefAndNotNull(node.baseURI)) {
        styleUri = goog.Uri.resolve(node.baseURI, '#' + id).toString();
      } else {
        styleUri = '#' + id;
      }
      this.sharedStyles_[styleUri] = style;
    }
  }
};


/**
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.prototype.readSharedStyleMap_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'StyleMap');
  var id = node.getAttribute('id');
  if (goog.isNull(id)) {
    return;
  }
  var styleMapValue = ol.format.KMZ.readStyleMapValue_(node, objectStack);
  if (!goog.isDef(styleMapValue)) {
    return;
  }
  var styleUri;
  if (goog.isDefAndNotNull(node.baseURI)) {
    styleUri = goog.Uri.resolve(node.baseURI, '#' + id).toString();
  } else {
    styleUri = '#' + id;
  }
  this.sharedStyles_[styleUri] = styleMapValue;
};


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
  if (!goog.array.contains(ol.format.KMZ.NAMESPACE_URIS_, node.namespaceURI)) {
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
  if (!goog.array.contains(ol.format.KMZ.NAMESPACE_URIS_, node.namespaceURI)) {
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
 * @param {Document|Node|string} source Souce.
 * @return {string|undefined} Name.
 * @api stable
 */
ol.format.KMZ.prototype.readName = function(source) {
  if (ol.xml.isDocument(source)) {
    return this.readNameFromDocument(/** @type {Document} */ (source));
  } else if (ol.xml.isNode(source)) {
    return this.readNameFromNode(/** @type {Node} */ (source));
  } else if (goog.isString(source)) {
    var doc = ol.xml.parse(source);
    return this.readNameFromDocument(doc);
  } else {
    goog.asserts.fail();
    return undefined;
  }
};


/**
 * @param {Document} doc Document.
 * @return {string|undefined} Name.
 */
ol.format.KMZ.prototype.readNameFromDocument = function(doc) {
  var n;
  for (n = doc.firstChild; !goog.isNull(n); n = n.nextSibling) {
    if (n.nodeType == goog.dom.NodeType.ELEMENT) {
      var name = this.readNameFromNode(n);
      if (goog.isDef(name)) {
        return name;
      }
    }
  }
  return undefined;
};


/**
 * @param {Node} node Node.
 * @return {string|undefined} Name.
 */
ol.format.KMZ.prototype.readNameFromNode = function(node) {
  var n;
  for (n = node.firstElementChild; !goog.isNull(n); n = n.nextElementSibling) {
    if (goog.array.contains(ol.format.KMZ.NAMESPACE_URIS_, n.namespaceURI) &&
        n.localName == 'name') {
      return ol.format.XSD.readString(n);
    }
  }
  for (n = node.firstElementChild; !goog.isNull(n); n = n.nextElementSibling) {
    var localName = ol.xml.getLocalName(n);
    if (goog.array.contains(ol.format.KMZ.NAMESPACE_URIS_, n.namespaceURI) &&
        (localName == 'Document' ||
         localName == 'Folder' ||
         localName == 'Placemark' ||
         localName == 'kml')) {
      var name = this.readNameFromNode(n);
      if (goog.isDef(name)) {
        return name;
      }
    }
  }
  return undefined;
};


/**
 * Read the projection from a KMZ source.
 *
 * @function
 * @param {ArrayBuffer|Document|Node|Object|string} source Source.
 * @return {ol.proj.Projection} Projection.
 * @api stable
 */
ol.format.KMZ.prototype.readProjection;


/**
 * @inheritDoc
 */
ol.format.KMZ.prototype.readProjectionFromDocument = function(doc) {
  return this.defaultDataProjection;
};


/**
 * @inheritDoc
 */
ol.format.KMZ.prototype.readProjectionFromNode = function(node) {
  return this.defaultDataProjection;
};


/**
 * @param {Node} node Node to append a TextNode with the color to.
 * @param {ol.Color|string} color Color.
 * @private
 */
ol.format.KMZ.writeColorTextNode_ = function(node, color) {
  var rgba = ol.color.asArray(color);
  var opacity = (rgba.length == 4) ? rgba[3] : 1;
  var abgr = [opacity * 255, rgba[2], rgba[1], rgba[0]];
  var i;
  for (i = 0; i < 4; ++i) {
    var hex = parseInt(abgr[i], 10).toString(16);
    abgr[i] = (hex.length == 1) ? '0' + hex : hex;
  }
  ol.format.XSD.writeStringTextNode(node, abgr.join(''));
};


/**
 * @param {Node} node Node to append a TextNode with the coordinates to.
 * @param {Array.<number>} coordinates Coordinates.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeCoordinatesTextNode_ =
    function(node, coordinates, objectStack) {
  var context = objectStack[objectStack.length - 1];
  goog.asserts.assert(goog.isObject(context));

  var layout = goog.object.get(context, 'layout');
  var stride = goog.object.get(context, 'stride');

  var dimension;
  if (layout == ol.geom.GeometryLayout.XY ||
      layout == ol.geom.GeometryLayout.XYM) {
    dimension = 2;
  } else if (layout == ol.geom.GeometryLayout.XYZ ||
      layout == ol.geom.GeometryLayout.XYZM) {
    dimension = 3;
  } else {
    goog.asserts.fail();
  }

  var d, i;
  var ii = coordinates.length;
  var text = '';
  if (ii > 0) {
    text += coordinates[0];
    for (d = 1; d < dimension; ++d) {
      text += ',' + coordinates[d];
    }
    for (i = stride; i < ii; i += stride) {
      text += ' ' + coordinates[i];
      for (d = 1; d < dimension; ++d) {
        text += ',' + coordinates[i + d];
      }
    }
  }
  ol.format.XSD.writeStringTextNode(node, text);
};


/**
 * @param {Node} node Node.
 * @param {Array.<ol.Feature>} features Features.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeDocument_ = function(node, features, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.DOCUMENT_SERIALIZERS_,
      ol.format.KMZ.DOCUMENT_NODE_FACTORY_, features, objectStack);
};


/**
 * @param {Node} node Node.
 * @param {Object} icon Icon object.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeIcon_ = function(node, icon, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  var parentNode = objectStack[objectStack.length - 1].node;
  var orderedKeys = ol.format.KMZ.ICON_SEQUENCE_[parentNode.namespaceURI];
  var values = ol.xml.makeSequence(icon, orderedKeys);
  ol.xml.pushSerializeAndPop(context,
      ol.format.KMZ.ICON_SERIALIZERS_, ol.xml.OBJECT_PROPERTY_NODE_FACTORY,
      values, objectStack, orderedKeys);
  orderedKeys =
      ol.format.KMZ.ICON_SEQUENCE_[ol.format.KMZ.GX_NAMESPACE_URIS_[0]];
  values = ol.xml.makeSequence(icon, orderedKeys);
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.ICON_SERIALIZERS_,
      ol.format.KMZ.GX_NODE_FACTORY_, values, objectStack, orderedKeys);
};


/**
 * @param {Node} node Node.
 * @param {ol.style.Icon} style Icon style.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeIconStyle_ = function(node, style, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  var properties = {};
  var src = style.getSrc();
  var size = style.getSize();
  var iconImageSize = style.getImageSize();
  var iconProperties = {
    'href': src
  };

  if (!goog.isNull(size)) {
    goog.object.set(iconProperties, 'w', size[0]);
    goog.object.set(iconProperties, 'h', size[1]);
    var anchor = style.getAnchor(); // top-left
    var origin = style.getOrigin(); // top-left

    if (!goog.isNull(origin) && !goog.isNull(iconImageSize) &&
        origin[0] !== 0 && origin[1] !== size[1]) {
      goog.object.set(iconProperties, 'x', origin[0]);
      goog.object.set(iconProperties, 'y',
          iconImageSize[1] - (origin[1] + size[1]));
    }

    if (!goog.isNull(anchor) &&
        anchor[0] !== 0 && anchor[1] !== size[1]) {
      var /** @type {ol.format.KMZVec2_} */ hotSpot = {
        x: anchor[0],
        xunits: ol.style.IconAnchorUnits.PIXELS,
        y: size[1] - anchor[1],
        yunits: ol.style.IconAnchorUnits.PIXELS
      };
      goog.object.set(properties, 'hotSpot', hotSpot);
    }
  }

  goog.object.set(properties, 'Icon', iconProperties);

  var scale = style.getScale();
  if (scale !== 1) {
    goog.object.set(properties, 'scale', scale);
  }

  var rotation = style.getRotation();
  if (rotation !== 0) {
    goog.object.set(properties, 'heading', rotation); // 0-360
  }

  var parentNode = objectStack[objectStack.length - 1].node;
  var orderedKeys = ol.format.KMZ.ICON_STYLE_SEQUENCE_[parentNode.namespaceURI];
  var values = ol.xml.makeSequence(properties, orderedKeys);
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.ICON_STYLE_SERIALIZERS_,
      ol.xml.OBJECT_PROPERTY_NODE_FACTORY, values, objectStack, orderedKeys);
};


/**
 * @param {Node} node Node.
 * @param {ol.style.Text} style style.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeLabelStyle_ = function(node, style, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  var properties = {};
  var fill = style.getFill();
  if (!goog.isNull(fill)) {
    goog.object.set(properties, 'color', fill.getColor());
  }
  var scale = style.getScale();
  if (goog.isDef(scale) && scale !== 1) {
    goog.object.set(properties, 'scale', scale);
  }
  var parentNode = objectStack[objectStack.length - 1].node;
  var orderedKeys =
      ol.format.KMZ.LABEL_STYLE_SEQUENCE_[parentNode.namespaceURI];
  var values = ol.xml.makeSequence(properties, orderedKeys);
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.LABEL_STYLE_SERIALIZERS_,
      ol.xml.OBJECT_PROPERTY_NODE_FACTORY, values, objectStack, orderedKeys);
};


/**
 * @param {Node} node Node.
 * @param {ol.style.Stroke} style style.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeLineStyle_ = function(node, style, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  var properties = {
    'color': style.getColor(),
    'width': style.getWidth()
  };
  var parentNode = objectStack[objectStack.length - 1].node;
  var orderedKeys = ol.format.KMZ.LINE_STYLE_SEQUENCE_[parentNode.namespaceURI];
  var values = ol.xml.makeSequence(properties, orderedKeys);
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.LINE_STYLE_SERIALIZERS_,
      ol.xml.OBJECT_PROPERTY_NODE_FACTORY, values, objectStack, orderedKeys);
};


/**
 * @param {Node} node Node.
 * @param {ol.geom.Geometry} geometry Geometry.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeMultiGeometry_ =
    function(node, geometry, objectStack) {
  goog.asserts.assert(
      (geometry instanceof ol.geom.MultiPoint) ||
      (geometry instanceof ol.geom.MultiLineString) ||
      (geometry instanceof ol.geom.MultiPolygon));
  /** @type {ol.xml.NodeStackItem} */
  var context = {node: node};
  var type = geometry.getType();
  /** @type {Array.<ol.geom.Geometry>} */
  var geometries;
  /** @type {function(*, Array.<*>, string=): (Node|undefined)} */
  var factory;
  if (type == ol.geom.GeometryType.MULTI_POINT) {
    geometries =
        (/** @type {ol.geom.MultiPoint} */ (geometry)).getPoints();
    factory = ol.format.KMZ.POINT_NODE_FACTORY_;
  } else if (type == ol.geom.GeometryType.MULTI_LINE_STRING) {
    geometries =
        (/** @type {ol.geom.MultiLineString} */ (geometry)).getLineStrings();
    factory = ol.format.KMZ.LINE_STRING_NODE_FACTORY_;
  } else if (type == ol.geom.GeometryType.MULTI_POLYGON) {
    geometries =
        (/** @type {ol.geom.MultiPolygon} */ (geometry)).getPolygons();
    factory = ol.format.KMZ.POLYGON_NODE_FACTORY_;
  } else {
    goog.asserts.fail();
  }
  ol.xml.pushSerializeAndPop(context,
      ol.format.KMZ.MULTI_GEOMETRY_SERIALIZERS_, factory,
      geometries, objectStack);
};


/**
 * @param {Node} node Node.
 * @param {ol.geom.LinearRing} linearRing Linear ring.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeBoundaryIs_ = function(node, linearRing, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  ol.xml.pushSerializeAndPop(context,
      ol.format.KMZ.BOUNDARY_IS_SERIALIZERS_,
      ol.format.KMZ.LINEAR_RING_NODE_FACTORY_, [linearRing], objectStack);
};


/**
 * FIXME currently we do serialize arbitrary/custom feature properties
 * (ExtendedData).
 * @param {Node} node Node.
 * @param {ol.Feature} feature Feature.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writePlacemark_ = function(node, feature, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};

  // set id
  if (goog.isDefAndNotNull(feature.getId())) {
    node.setAttribute('id', feature.getId());
  }

  // serialize properties (properties unknown to KMZ are not serialized)
  var properties = feature.getProperties();
  var styleFunction = feature.getStyleFunction();
  if (goog.isDef(styleFunction)) {
    // FIXME the styles returned by the style function are supposed to be
    // resolution-independent here
    var styles = styleFunction.call(feature, 0);
    if (!goog.isNull(styles) && styles.length > 0) {
      goog.object.set(properties, 'Style', styles[0]);
      var textStyle = styles[0].getText();
      if (!goog.isNull(textStyle)) {
        goog.object.set(properties, 'name', textStyle.getText());
      }
    }
  }
  var parentNode = objectStack[objectStack.length - 1].node;
  var orderedKeys = ol.format.KMZ.PLACEMARK_SEQUENCE_[parentNode.namespaceURI];
  var values = ol.xml.makeSequence(properties, orderedKeys);
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.PLACEMARK_SERIALIZERS_,
      ol.xml.OBJECT_PROPERTY_NODE_FACTORY, values, objectStack, orderedKeys);

  // serialize geometry
  var options = /** @type {olx.format.WriteOptions} */ (objectStack[0]);
  var geometry = feature.getGeometry();
  if (goog.isDefAndNotNull(geometry)) {
    geometry =
        ol.format.Feature.transformWithOptions(geometry, true, options);
  }
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.PLACEMARK_SERIALIZERS_,
      ol.format.KMZ.GEOMETRY_NODE_FACTORY_, [geometry], objectStack);
};


/**
 * @param {Node} node Node.
 * @param {ol.geom.SimpleGeometry} geometry Geometry.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writePrimitiveGeometry_ = function(node, geometry, objectStack) {
  goog.asserts.assert(
      (geometry instanceof ol.geom.Point) ||
      (geometry instanceof ol.geom.LineString) ||
      (geometry instanceof ol.geom.LinearRing));
  var flatCoordinates = geometry.getFlatCoordinates();
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  goog.object.set(context, 'layout', geometry.getLayout());
  goog.object.set(context, 'stride', geometry.getStride());
  ol.xml.pushSerializeAndPop(context,
      ol.format.KMZ.PRIMITIVE_GEOMETRY_SERIALIZERS_,
      ol.format.KMZ.COORDINATES_NODE_FACTORY_,
      [flatCoordinates], objectStack);
};


/**
 * @param {Node} node Node.
 * @param {ol.geom.Polygon} polygon Polygon.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writePolygon_ = function(node, polygon, objectStack) {
  goog.asserts.assertInstanceof(polygon, ol.geom.Polygon);
  var linearRings = polygon.getLinearRings();
  goog.asserts.assert(linearRings.length > 0);
  var outerRing = linearRings.shift();
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  // inner rings
  ol.xml.pushSerializeAndPop(context,
      ol.format.KMZ.POLYGON_SERIALIZERS_,
      ol.format.KMZ.INNER_BOUNDARY_NODE_FACTORY_,
      linearRings, objectStack);
  // outer ring
  ol.xml.pushSerializeAndPop(context,
      ol.format.KMZ.POLYGON_SERIALIZERS_,
      ol.format.KMZ.OUTER_BOUNDARY_NODE_FACTORY_,
      [outerRing], objectStack);
};


/**
 * @param {Node} node Node.
 * @param {ol.style.Fill} style Style.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writePolyStyle_ = function(node, style, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.POLY_STYLE_SERIALIZERS_,
      ol.format.KMZ.COLOR_NODE_FACTORY_, [style.getColor()], objectStack);
};


/**
 * @param {Node} node Node to append a TextNode with the scale to.
 * @param {number|undefined} scale Scale.
 * @private
 */
ol.format.KMZ.writeScaleTextNode_ = function(node, scale) {
  ol.format.XSD.writeDecimalTextNode(node, scale * scale);
};


/**
 * @param {Node} node Node.
 * @param {ol.style.Style} style Style.
 * @param {Array.<*>} objectStack Object stack.
 * @private
 */
ol.format.KMZ.writeStyle_ = function(node, style, objectStack) {
  var /** @type {ol.xml.NodeStackItem} */ context = {node: node};
  var properties = {};
  var fillStyle = style.getFill();
  var strokeStyle = style.getStroke();
  var imageStyle = style.getImage();
  var textStyle = style.getText();
  if (!goog.isNull(imageStyle)) {
    goog.object.set(properties, 'IconStyle', imageStyle);
  }
  if (!goog.isNull(textStyle)) {
    goog.object.set(properties, 'LabelStyle', textStyle);
  }
  if (!goog.isNull(strokeStyle)) {
    goog.object.set(properties, 'LineStyle', strokeStyle);
  }
  if (!goog.isNull(fillStyle)) {
    goog.object.set(properties, 'PolyStyle', fillStyle);
  }
  var parentNode = objectStack[objectStack.length - 1].node;
  var orderedKeys = ol.format.KMZ.STYLE_SEQUENCE_[parentNode.namespaceURI];
  var values = ol.xml.makeSequence(properties, orderedKeys);
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.STYLE_SERIALIZERS_,
      ol.xml.OBJECT_PROPERTY_NODE_FACTORY, values, objectStack, orderedKeys);
};


/**
 * @param {Node} node Node to append a TextNode with the Vec2 to.
 * @param {ol.format.KMZVec2_} vec2 Vec2.
 * @private
 */
ol.format.KMZ.writeVec2_ = function(node, vec2) {
  node.setAttribute('x', vec2.x);
  node.setAttribute('y', vec2.y);
  node.setAttribute('xunits', vec2.xunits);
  node.setAttribute('yunits', vec2.yunits);
};


/**
 * @const
 * @type {Object.<string, Array.<string>>}
 * @private
 */
ol.format.KMZ.KMZ_SEQUENCE_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, [
      'Document', 'Placemark'
    ]);


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.KMZ_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'Document': ol.xml.makeChildAppender(ol.format.KMZ.writeDocument_),
      'Placemark': ol.xml.makeChildAppender(ol.format.KMZ.writePlacemark_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.DOCUMENT_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'Placemark': ol.xml.makeChildAppender(ol.format.KMZ.writePlacemark_)
    });


/**
 * @const
 * @type {Object.<string, string>}
 * @private
 */
ol.format.KMZ.GEOMETRY_TYPE_TO_NODENAME_ = {
  'Point': 'Point',
  'LineString': 'LineString',
  'LinearRing': 'LinearRing',
  'Polygon': 'Polygon',
  'MultiPoint': 'MultiGeometry',
  'MultiLineString': 'MultiGeometry',
  'MultiPolygon': 'MultiGeometry'
};


/**
 * @const
 * @type {Object.<string, Array.<string>>}
 * @private
 */
ol.format.KMZ.ICON_SEQUENCE_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, [
      'href'
    ],
    ol.xml.makeStructureNS(
        ol.format.KMZ.GX_NAMESPACE_URIS_, [
          'x', 'y', 'w', 'h'
    ]));


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.ICON_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'href': ol.xml.makeChildAppender(ol.format.XSD.writeStringTextNode)
    }, ol.xml.makeStructureNS(
        ol.format.KMZ.GX_NAMESPACE_URIS_, {
          'x': ol.xml.makeChildAppender(ol.format.XSD.writeDecimalTextNode),
          'y': ol.xml.makeChildAppender(ol.format.XSD.writeDecimalTextNode),
          'w': ol.xml.makeChildAppender(ol.format.XSD.writeDecimalTextNode),
          'h': ol.xml.makeChildAppender(ol.format.XSD.writeDecimalTextNode)
        }));


/**
 * @const
 * @type {Object.<string, Array.<string>>}
 * @private
 */
ol.format.KMZ.ICON_STYLE_SEQUENCE_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, [
      'scale', 'heading', 'Icon', 'hotSpot'
    ]);


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.ICON_STYLE_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'Icon': ol.xml.makeChildAppender(ol.format.KMZ.writeIcon_),
      'heading': ol.xml.makeChildAppender(ol.format.XSD.writeDecimalTextNode),
      'hotSpot': ol.xml.makeChildAppender(ol.format.KMZ.writeVec2_),
      'scale': ol.xml.makeChildAppender(ol.format.KMZ.writeScaleTextNode_)
    });


/**
 * @const
 * @type {Object.<string, Array.<string>>}
 * @private
 */
ol.format.KMZ.LABEL_STYLE_SEQUENCE_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, [
      'color', 'scale'
    ]);


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.LABEL_STYLE_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'color': ol.xml.makeChildAppender(ol.format.KMZ.writeColorTextNode_),
      'scale': ol.xml.makeChildAppender(ol.format.KMZ.writeScaleTextNode_)
    });


/**
 * @const
 * @type {Object.<string, Array.<string>>}
 * @private
 */
ol.format.KMZ.LINE_STYLE_SEQUENCE_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, [
      'color', 'width'
    ]);


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.LINE_STYLE_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'color': ol.xml.makeChildAppender(ol.format.KMZ.writeColorTextNode_),
      'width': ol.xml.makeChildAppender(ol.format.XSD.writeDecimalTextNode)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.BOUNDARY_IS_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'LinearRing': ol.xml.makeChildAppender(
          ol.format.KMZ.writePrimitiveGeometry_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.MULTI_GEOMETRY_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'LineString': ol.xml.makeChildAppender(
          ol.format.KMZ.writePrimitiveGeometry_),
      'Point': ol.xml.makeChildAppender(
          ol.format.KMZ.writePrimitiveGeometry_),
      'Polygon': ol.xml.makeChildAppender(ol.format.KMZ.writePolygon_)
    });


/**
 * @const
 * @type {Object.<string, Array.<string>>}
 * @private
 */
ol.format.KMZ.PLACEMARK_SEQUENCE_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, [
      'name', 'open', 'visibility', 'address', 'phoneNumber', 'description',
      'styleUrl', 'Style'
    ]);


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.PLACEMARK_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'MultiGeometry': ol.xml.makeChildAppender(
          ol.format.KMZ.writeMultiGeometry_),
      'LineString': ol.xml.makeChildAppender(
          ol.format.KMZ.writePrimitiveGeometry_),
      'LinearRing': ol.xml.makeChildAppender(
          ol.format.KMZ.writePrimitiveGeometry_),
      'Point': ol.xml.makeChildAppender(
          ol.format.KMZ.writePrimitiveGeometry_),
      'Polygon': ol.xml.makeChildAppender(ol.format.KMZ.writePolygon_),
      'Style': ol.xml.makeChildAppender(ol.format.KMZ.writeStyle_),
      'address': ol.xml.makeChildAppender(ol.format.XSD.writeStringTextNode),
      'description': ol.xml.makeChildAppender(
          ol.format.XSD.writeStringTextNode),
      'name': ol.xml.makeChildAppender(ol.format.XSD.writeStringTextNode),
      'open': ol.xml.makeChildAppender(ol.format.XSD.writeBooleanTextNode),
      'phoneNumber': ol.xml.makeChildAppender(
          ol.format.XSD.writeStringTextNode),
      'styleUrl': ol.xml.makeChildAppender(ol.format.XSD.writeStringTextNode),
      'visibility': ol.xml.makeChildAppender(
          ol.format.XSD.writeBooleanTextNode)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.PRIMITIVE_GEOMETRY_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'coordinates': ol.xml.makeChildAppender(
          ol.format.KMZ.writeCoordinatesTextNode_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.POLYGON_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'outerBoundaryIs': ol.xml.makeChildAppender(
          ol.format.KMZ.writeBoundaryIs_),
      'innerBoundaryIs': ol.xml.makeChildAppender(
          ol.format.KMZ.writeBoundaryIs_)
    });


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.POLY_STYLE_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'color': ol.xml.makeChildAppender(ol.format.KMZ.writeColorTextNode_)
    });


/**
 * @const
 * @type {Object.<string, Array.<string>>}
 * @private
 */
ol.format.KMZ.STYLE_SEQUENCE_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, [
      'IconStyle', 'LabelStyle', 'LineStyle', 'PolyStyle'
    ]);


/**
 * @const
 * @type {Object.<string, Object.<string, ol.xml.Serializer>>}
 * @private
 */
ol.format.KMZ.STYLE_SERIALIZERS_ = ol.xml.makeStructureNS(
    ol.format.KMZ.NAMESPACE_URIS_, {
      'IconStyle': ol.xml.makeChildAppender(ol.format.KMZ.writeIconStyle_),
      'LabelStyle': ol.xml.makeChildAppender(ol.format.KMZ.writeLabelStyle_),
      'LineStyle': ol.xml.makeChildAppender(ol.format.KMZ.writeLineStyle_),
      'PolyStyle': ol.xml.makeChildAppender(ol.format.KMZ.writePolyStyle_)
    });


/**
 * @const
 * @param {*} value Value.
 * @param {Array.<*>} objectStack Object stack.
 * @param {string=} opt_nodeName Node name.
 * @return {Node|undefined} Node.
 * @private
 */
ol.format.KMZ.GX_NODE_FACTORY_ = function(value, objectStack, opt_nodeName) {
  return ol.xml.createElementNS(ol.format.KMZ.GX_NAMESPACE_URIS_[0],
      'gx:' + opt_nodeName);
};


/**
 * @const
 * @param {*} value Value.
 * @param {Array.<*>} objectStack Object stack.
 * @param {string=} opt_nodeName Node name.
 * @return {Node|undefined} Node.
 * @private
 */
ol.format.KMZ.DOCUMENT_NODE_FACTORY_ = function(value, objectStack,
    opt_nodeName) {
  goog.asserts.assertInstanceof(value, ol.Feature);
  var parentNode = objectStack[objectStack.length - 1].node;
  goog.asserts.assert(ol.xml.isNode(parentNode));
  return ol.xml.createElementNS(parentNode.namespaceURI, 'Placemark');
};


/**
 * @const
 * @param {*} value Value.
 * @param {Array.<*>} objectStack Object stack.
 * @param {string=} opt_nodeName Node name.
 * @return {Node|undefined} Node.
 * @private
 */
ol.format.KMZ.GEOMETRY_NODE_FACTORY_ = function(value, objectStack,
    opt_nodeName) {
  if (goog.isDefAndNotNull(value)) {
    goog.asserts.assertInstanceof(value, ol.geom.Geometry);
    var parentNode = objectStack[objectStack.length - 1].node;
    goog.asserts.assert(ol.xml.isNode(parentNode));
    return ol.xml.createElementNS(parentNode.namespaceURI,
        ol.format.KMZ.GEOMETRY_TYPE_TO_NODENAME_[value.getType()]);
  }
};


/**
 * A factory for creating coordinates nodes.
 * @const
 * @type {function(*, Array.<*>, string=): (Node|undefined)}
 * @private
 */
ol.format.KMZ.COLOR_NODE_FACTORY_ = ol.xml.makeSimpleNodeFactory('color');


/**
 * A factory for creating coordinates nodes.
 * @const
 * @type {function(*, Array.<*>, string=): (Node|undefined)}
 * @private
 */
ol.format.KMZ.COORDINATES_NODE_FACTORY_ =
    ol.xml.makeSimpleNodeFactory('coordinates');


/**
 * A factory for creating innerBoundaryIs nodes.
 * @const
 * @type {function(*, Array.<*>, string=): (Node|undefined)}
 * @private
 */
ol.format.KMZ.INNER_BOUNDARY_NODE_FACTORY_ =
    ol.xml.makeSimpleNodeFactory('innerBoundaryIs');


/**
 * A factory for creating Point nodes.
 * @const
 * @type {function(*, Array.<*>, string=): (Node|undefined)}
 * @private
 */
ol.format.KMZ.POINT_NODE_FACTORY_ =
    ol.xml.makeSimpleNodeFactory('Point');


/**
 * A factory for creating LineString nodes.
 * @const
 * @type {function(*, Array.<*>, string=): (Node|undefined)}
 * @private
 */
ol.format.KMZ.LINE_STRING_NODE_FACTORY_ =
    ol.xml.makeSimpleNodeFactory('LineString');


/**
 * A factory for creating LinearRing nodes.
 * @const
 * @type {function(*, Array.<*>, string=): (Node|undefined)}
 * @private
 */
ol.format.KMZ.LINEAR_RING_NODE_FACTORY_ =
    ol.xml.makeSimpleNodeFactory('LinearRing');


/**
 * A factory for creating Polygon nodes.
 * @const
 * @type {function(*, Array.<*>, string=): (Node|undefined)}
 * @private
 */
ol.format.KMZ.POLYGON_NODE_FACTORY_ =
    ol.xml.makeSimpleNodeFactory('Polygon');


/**
 * A factory for creating outerBoundaryIs nodes.
 * @const
 * @type {function(*, Array.<*>, string=): (Node|undefined)}
 * @private
 */
ol.format.KMZ.OUTER_BOUNDARY_NODE_FACTORY_ =
    ol.xml.makeSimpleNodeFactory('outerBoundaryIs');


/**
 * Encode an array of features in the KMZ format.
 *
 * @function
 * @param {Array.<ol.Feature>} features Features.
 * @param {olx.format.WriteOptions=} opt_options Options.
 * @return {Node} Result.
 * @api stable
 */
ol.format.KMZ.prototype.writeFeatures;


/**
 * @inheritDoc
 */
ol.format.KMZ.prototype.writeFeaturesNode = function(features, opt_options) {
  var kml = ol.xml.createElementNS(ol.format.KMZ.NAMESPACE_URIS_[4], 'kml');
  var xmlnsUri = 'http://www.w3.org/2000/xmlns/';
  var xmlSchemaInstanceUri = 'http://www.w3.org/2001/XMLSchema-instance';
  ol.xml.setAttributeNS(kml, xmlnsUri, 'xmlns:gx',
      ol.format.KMZ.GX_NAMESPACE_URIS_[0]);
  ol.xml.setAttributeNS(kml, xmlnsUri, 'xmlns:xsi', xmlSchemaInstanceUri);
  ol.xml.setAttributeNS(kml, xmlSchemaInstanceUri, 'xsi:schemaLocation',
      ol.format.KMZ.SCHEMA_LOCATION_);

  var /** @type {ol.xml.NodeStackItem} */ context = {node: kml};
  var properties = {};
  if (features.length > 1) {
    goog.object.set(properties, 'Document', features);
  } else if (features.length == 1) {
    goog.object.set(properties, 'Placemark', features[0]);
  }
  var orderedKeys = ol.format.KMZ.KMZ_SEQUENCE_[kml.namespaceURI];
  var values = ol.xml.makeSequence(properties, orderedKeys);
  ol.xml.pushSerializeAndPop(context, ol.format.KMZ.KMZ_SERIALIZERS_,
      ol.xml.OBJECT_PROPERTY_NODE_FACTORY, values, [opt_options], orderedKeys);
  return kml;
};
