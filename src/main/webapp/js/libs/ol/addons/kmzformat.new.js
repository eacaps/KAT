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
};
goog.inherits(ol.format.KMZ, ol.format.KML);

ol.format.readLatLonBox_ = function(node, objectStack) {
  goog.asserts.assert(node.nodeType == goog.dom.NodeType.ELEMENT);
  goog.asserts.assert(node.localName == 'LatLonBox');

  var latlonboxobj = ol.xml.pushParseAndPop({}, ol.format.LATLONBOX_PARSERS_, node, objectStack);
  if(good.isDef(latlonboxobj)) {
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
  goog.asserts.assert(node.localName == 'LatLonBox');

  var object = ol.xml.pushParseAndPop({type:'overlay'}, ol.format.KMZ.GROUNDOVERLAY_PARSERS_, node, objectStack);
  if(!goog.isDef(object)) {
    return undefined;
  }

  var feature = new ol.Feature();
  feature.setProperties(object);
  return feature;
};
