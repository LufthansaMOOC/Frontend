/*========================================================================
 * $Id: open_search_channel_test.js 98065 2017-05-11 15:06:51Z michael.biebl $
 *
 * Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2013
 *
 * Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
 * Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
 * Urheber festgelegten Stelle in der Funktion des Computerprogramms
 * angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
 * Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
 * Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
 * =========================================================================*/

/* global trace */

define([
    "qunit",
    "service/open_search_channel",
    "service/channel",
    "backbone",
    "underscore",
    "text!./example_open_search_response.xml"
], function (
    QUnit,
    OpenSearchChannel,
    Channel,
    Backbone,
    _,
    openSearchResponse
) {

  /* use strict */
    var clone = function (o) {
          return JSON.parse(JSON.stringify(o));
        },
        MockChannel = Channel.extend({
          initialize: function (options) {
            this.reset();
          },

          reset: function () {
            this.calls = [];
            this.callCount = 0;
          },

          call: function (path, request, responseObserver) {
            this.calls.push({
                path: path,
                request: request
            });

            var promise = new Channel.DeferredCallFinished(),
                that = this;

            _.defer(function () {
                that.success(clone(that.get("responses")[that.callCount++]), promise, responseObserver);
            });

            return promise;
          }
      }),
      responses = [
        openSearchResponse
      ];

  QUnit.module("OpenSearch Federation", { });

  QUnit.asyncTest("Adapting an existing call", function() {
    expect(4);
    
    var responseObserver = {};
    _.extend(responseObserver, Backbone.Events);
    
    var mockChannel = new MockChannel({
            responses: responses
        }),
        channel = new OpenSearchChannel({
          parentChannel: mockChannel
        }, {
          urlTemplate: "http://beta.refbase.net/opensearch.php"
        });
    
    responseObserver.once("response", function(data, url) {
      trace("Received data from url(" + url + ").");
      ok(data.resultset.results.length > 0, "OpenSearch XML-Response is transformed to javascript structure");
    });

    var promise = channel.call(
                  "search",
                  {
                    views: [{
                             id: "test",
                             query: { unparsed: "test" },
                             count: 1
                           }]
                  },
                  responseObserver),

    call = mockChannel.calls[0];

    equal(call.path, "http://beta.refbase.net/opensearch.php", "Path is adapted from urlTemplate");
    equal(call.request, null, "Request is reset, because all parameters are passed in the url");

    responseObserver = {};
    _.extend(responseObserver, Backbone.Events);

    promise = channel.call(
              "not_search",
              {
              },
              responseObserver);

    responseObserver.once("response", function(response) {
      deepEqual(response, {}, "Service should not return for calls other than search");
    });
    
    promise.always(function(){ trace("response finished, status: failed " + this.isFailed()); start();});
  });
});
