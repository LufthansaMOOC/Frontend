/*========================================================================
* $Id: facet_test.js 98065 2017-05-11 15:06:51Z michael.biebl $
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

define([
    "utils/clone",
    "underscore",
    "backbone",
    "client/application",
    "service/channel",
    "jquery"
  ], function (
    clone,
    _,
    Backbone,
    Application,
    Channel,
    $
  ) {
    var MockChannel = Backbone.Model.extend({
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
              if (responseObserver) { responseObserver.trigger("response", clone(that.get("responses")[that.callCount++]), that); }
              promise.triggerDone();
            });
            return promise;
          }
        }),
        responses = [
          {},

          /* search response 1 */
          {
            views: [{
              id: "main",
              facets: [{
                id: "extension",
                name: "Extension",
                entries: [{
                  html: "0",
                  count: 29,
                  query_expr: "0"
                },{
                  html: "1",
                  count: 29,
                  query_expr: "1"
                },{
                  html: "2",
                  count: 29,
                  query_expr: "2"
                }]
              }]
            }]
          },

          /* search response 2 */
          {
            views: [{
              id: "main",
              facets: [{
                id: "extension",
                name: "Extension",
                entries: [{
                  html: "00",
                  count: 28,
                  query_expr: "00"
                },{
                  html: "01",
                  count: 1,
                  query_expr: "01"
                }]
              }]
            }]
          }
        ];

    responses.push(responses[1]);
    responses.push(responses[1]);

    module("Facet", {
      setup: function () {
      }
    });

    facetTest("select", [
      function () {
        var facetEntries = model.submodel("views.main.facets.extension.entries").get(),
            extension;

        extension = facetEntries[0];
        equal(extension.children, null, "no children for the facet entry");
        equal(model.input.get("views.main.user.constraints"), null, "no constraints are set");

        check(0);
      },

      function () {
        assertUserConstraints([{ facet: "extension", or: ["0"]}]);
        
        assertChecked(0);
        assertAvailable(0, 0);
        assertNotChecked(0, 0);
        assertNotChecked(0, 1);
        assertNotChecked(1);
        assertNotChecked(2);

        check(1)
      },

      function () {
        assertUserConstraints([{ facet: "extension", or: ["0", "1"]}]);

        // TODO: check selected state in model
        // TODO: expect no child nodes
        assertChecked(0);
        assertChecked(1);
        assertNotAvailable(1, 0);
        assertNotChecked(2);

        check(2);
      },

      function () {
        assertUserConstraints([{ facet: "extension", or: ["0", "1", "2"]}]);

        // TODO: check selected state in model

        // TODO: expect no child nodes
        assertChecked(0);
        assertChecked(1);
        assertChecked(2);
      }
    ]);
    
    facetTest("select child", [
      function () {
        check(0);
      },

      function () {
        assertUserConstraints([{ facet: "extension", or: ["0"]}]);
        
        assertChecked(0);

        check(0, 0)
      },

      function () {
        assertChecked(0);
        assertChecked(0, 0);
      }
    ]);



    var model,
        view;
    
    function facetTest(name, tests) {
      var mockChannel = new MockChannel({
            responses: clone(responses)
          }),
          dom = document.createElement("DIV");

      dom.innerHTML = '<div data-template="view" data-id="main"><div id="facets" data-template="facet" data-name="extension"></div></div>';

      asyncTest(name, function () {
        new Application({
          channels: [mockChannel],
          rootEl: dom,
          startSearch: false,
          callback: function (application) {
            model = application.models.search,
            view = application.templateTree.getTemplateByEl(dom.children[0].children[0]).instances[0];
            
            assertOnEvent(model, "computed", tests);

            // start search
            model.set("query", { unparsed: "ALL" });
          }
        });
      });
    }

    /* assertion helpers */

    function assertOnEvent(target, ev, assertions) {
      var index = 0;

      target.on(ev, function () {
        if (index < assertions.length) {
          assertions[index]();
        }
        if (index === assertions.length - 1) {
          start();
        }
        index++;
      });
    }

    function getCheckbox(levelIndexes___) {
      var ret = _.reduce(arguments, function ($el, levelIndex) {
        return $el.find("> ul > li").add($el.find("> div > ul > li")).slice(levelIndex, levelIndex + 1);
      }, view.$el);
      return ret.find(" > label > input:checkbox");
    }

    function isChecked(levelIndexes___) {
      return getCheckbox.apply(this, arguments).is(":checked");
    }

    function assertChecked(levelIndexes___) {
      ok(isChecked.apply(this, arguments), Array.prototype.join.call(arguments, "") + " must be checked");
    }

    function assertNotChecked(levelIndexes___) {
      ok(!isChecked.apply(this, arguments), Array.prototype.join.call(arguments, "") + " must not be checked");
    }

    function check(levelIndexes___) {
      getCheckbox.apply(this, arguments).attr("checked", "checked").click();
    }

    function assertUserConstraints(expected) {
      deepEqual(model.input.get("views.main.user.constraints"), expected, "user.constraints must be " + JSON.stringify(expected));
    }

    function assertAvailable(levelIndexes___) {
      equal(getCheckbox.apply(this, arguments).length, 1, Array.prototype.join.call(arguments, "") + " checkbox must be available");
    }
    
    function assertNotAvailable(levelIndexes___) {
      equal(getCheckbox.apply(this, arguments).length, 0, Array.prototype.join.call(arguments, "") + " checkbox must not be available");
    }

});
