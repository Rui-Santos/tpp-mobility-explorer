/* global L */

import Ember from 'ember';
import mapBboxController from 'mobility-playground/mixins/map-bbox-controller';
import setTextboxClosed from 'mobility-playground/mixins/set-textbox-closed';
import sharedActions from 'mobility-playground/mixins/shared-actions';
import xml2js from 'npm:xml2js';
import polylineEncoded from 'npm:polyline-encoded';


export default Ember.Controller.extend(mapBboxController, setTextboxClosed, sharedActions, {
  queryParams: ['bbox','pin','trace', 'showAttributes'],
  center: Ember.computed('trace', function(){
    // to get center from new gpx:
    // var encodedPolyline = this.model.traceRouteRequest;
    // var decodedPolyline = L.Polyline(L.PolylineUtil.decode(encodedPolyline, 6));
    // var bounds = decodedPolyline.getBounds();
    
    return this.model.gpxTrace ? this.model.gpxTrace.center : this.get('mapCenter');
  }),
  zoom: 14,
  trace: null,
  showMapMatch: false,
  showAttributes: false,
  styleAttribute: "weighted_grade",
  // styleAttribute: "speed",
  gpxPlaceholder: Ember.computed('trace', function(){
    if (this.get('trace')){
      return this.get('trace');
    } else {
      return "Select a sample GPX trace...";
    }
  }),
  edges: null,
  attributes: Ember.computed('trace', function(){
    console.log(this.model.mapMatchRequests.attributesRequest.edges[0])
    var attributes = this.model.mapMatchRequests.attributesRequest.edges[0];
    var attributeArray = [];
    for (var attribute in attributes){
      attributeArray.push(attribute)
    }
    // return [this.model.mapMatchRequests.attributesRequest.edges[0]];
    return attributeArray;
  }),
  
  traceAttributeSegments: Ember.computed('trace', function() {
    // attributes look different when using the trace_route response shape vs the trace_attribute response shape 
    // (even though the trace_route response shape is what is sent into the trace_attribute request)
    var points = L.PolylineUtil.decode(this.model.mapMatchRequests.attributesRequest.shape, 6);
    // var points = this.model.mapMatchRequests.decodedPolyline;
    var edges = this.model.mapMatchRequests.attributesRequest.edges;
    var edgeCoordinates = [];
    var attributeArray = [];
    var attributeArraySum = 0;

    for (var i = 0; i < edges.length; i++){
      var attribute;
      // decide whether to use max_upward_grade and max_downward_grade or wieghted_grade
      if (this.get('styleAttribute') === 'weighted_grade') {
        var weightedGrade = edges[i].weighted_grade;
        if (edges[i].max_upward_grade !== 0 && edges[i].max_downward_grade !== 0) {
          attribute = edges[i].weighted_grade;
        } else if (edges[i].max_upward_grade !== 0) {
          attribute = edges[i].max_upward_grade;
        } else if (edges[i].max_downward_grade !== 0) {
          attribute = edges[i].max_downward_grade; 
        }
      } else {
        // set attribute to the value for the selected attribute
        attribute = edges[i][this.get('styleAttribute')];
      }
      // add attribute to attributeArray
      attributeArray.push(attribute);
      // increment attributeArraySum, to use to find average later
      attributeArraySum = attributeArraySum + attribute;
    }
    // sort attributeArray in ascending order
    attributeArray.sort(function(a,b){return a - b})
    // find the minimum value in attributeArray
    var attributeArrayMin = attributeArray[0]
    // find the maximum value in attributeArray
    var attributeArrayMax = attributeArray[attributeArray.length-1]
    // find the average value for the attribute
    var attributeArrayAverage = attributeArraySum / attributeArray.length;
    // find the median value for the attribute (to use to test with different attributes)
    var attributeArrayMedian = attributeArray[Math.floor(attributeArray.length/2)];

    for (var i = 0; i < edges.length; i++){
      // create coordinate array for segment
      var begin = edges[i].begin_shape_index;
      var end =  edges[i].end_shape_index;
      var pointsSlice = points.slice(begin, end+1);
    
      var mid = attributeArrayAverage;
      // var mid = attributeArrayMedian;  
      var min = attributeArrayMin;
      var max = attributeArrayMax;
    
      // may want to set midpoing to zero for grade attributes
      // if (this.get('styleAttribute') === "weighted_grade"){
      //   mid = 0;
      // }

      var attr = edges[i][this.get('styleAttribute')];
      
      // find color
        
      // Hue is a degree on the color wheel; 0 (or 360) is red, 120 is green, 240 is blue. Numbers in between reflect different shades.
      // Saturation is a percentage value; 100% is the full colour.
      // Lightness is also a percentage; 0% is dark (black), 100% is light (white), and 50% is the average.

      // HSL
      // blue: 240
      // green: 120
      // yellow: 60
      // red: 0 or 360

      var range = attributeArrayMax - attributeArrayMin;
      var percentage = (attr + attributeArrayMin) / range;

      var highColor = 0;
      var midColor = 120;
      var lowColor = 280;
  
      // set color scale around midpoint
      if (attr <= mid){
        var hue = (percentage * (midColor - lowColor));
        var color = 'hsl(' + hue + ', 90%, 50%)';
      } else if (attr > mid) {
        var hue = (percentage * (highColor - midColor));
        var color =  'hsl(' + hue + ', 90%, 50%)';
      }
     
      // add segment info to edgeCoordinates array, to use to draw polyline layers on map 
      edgeCoordinates.push({
        coordinates: pointsSlice,
        color: color,
        attribute: attribute
      })
    }
    return edgeCoordinates;
  }),
 
  actions: {
    updatebbox(e) {
      var newbox = e.target.getBounds();
      this.set('bbox', newbox.toBBoxString());
    },

    setTrace(trace){
      this.set('showMapMatch', false);
      this.set('center', trace.center);
      this.set('trace', trace.name);
      this.set('showMapMatch', false);
      this.set('showAttributes', false);
    },
    
    setShowMapMatch(){
      if (this.get('showMapMatch')){
        this.set('showMapMatch', false);
      } else {
        this.set('showAttributes', false);
        this.set('showMapMatch', true);
      }
    },

    showAttributes(){
      if (this.get('showAttributes')){
        this.set('showAttributes', null);
      } else {
        this.set('showMapMatch', false);
        this.set('showAttributes', true);
      }
    }
  }
});