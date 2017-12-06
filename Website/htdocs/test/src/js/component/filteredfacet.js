/*========================================================================
* $Id: filteredfacet.js 98065 2017-05-11 15:06:51Z michael.biebl $
*
* Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2014
*
* Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
* Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
* Urheber festgelegten Stelle in der Funktion des Computerprogramms
* angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
* Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
* Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
* =========================================================================*/


define ([
    "qunit",
    "jquery",
    "client/application",
    "component!filteredfacet",
    "i18n/i18n",
    "underscore"
  ], function(
    QUnit,
    $,
    Application,
    FilteredFacet,
    i18n,
    _
  ) {

    QUnit.module("Filteredfacet");
    var data = {
      facets: [{
        id: "mes.date",
        name: "Date",
        entries: [{
          html: "1",
          value: "1",
          query_expr: { unparsed: 1, id: "c1" },
          entries: [{
            html: "1.1",
            value: 1.1,
            query_expr: { unparsed: 1.1, id: "c11" }
          },{
            html: "1.2",
            value: 1.2,
            query_expr: { unparsed: 1.2, id: "c12" }
          }]
        }, {
          html: "2",
          value: 2,
          query_expr: { unparsed: 2, id: "c2" },
          entries: [{
            html: "2.1",
            value: 2.1,
            query_expr: { unparsed: 2.1, id: "c21" }
          },{
            html: "2.2",
            value: 2.2,
            query_expr: { unparsed: 2.2, id: "c22" }
          }]
        }]
      }]
    };

    QUnit.asyncTest("Inputmodel Changes Silently After Input Value Changes", function() {
        expect(1);
        var dom = document.createElement("DIV");

        dom.innerHTML = '<div data-template="filteredfacet" data-name="mes.date"></div>';

        new Application({
            channels: ["http://example1.mindbreeze.com"],
            rootEl: dom,
            startSearch: false,
            callback: function (application) {
              var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];
              application.models.search.output.load(data, { parse: true });

              window.setTimeout(function () {
                view.constraintsModel.on("change", function () {
                    ok(false, "change event must not occur");
                });
                view.userInputView.el.value = "test";
                view.userInputView.$el.trigger("blur");
                equal(view.getUserQuery().unparsed, "test", "Query is updated");
                start();
              }, 1000);
            }
        });
    });

    QUnit.asyncTest("Inputmodel Changes After Input Submit", function() {
        expect(2);
        var dom = document.createElement("DIV");

        dom.innerHTML = '<div data-template="filteredfacet" data-name="mes.date"></div>';

        new Application({
            channels: ["http://example1.mindbreeze.com"],
            rootEl: dom,
            startSearch: false,
            callback: function (application) {
              var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];
              application.models.search.output.load(data, { parse: true });

              window.setTimeout(function () {
                var triggeredChange = false;
                view.constraintsModel.on("change", function () {
                    ok(!triggeredChange, "change event must occur exactly once");
                    triggeredChange = true;
                });
                view.userInputView.el.value = "test";
                var e = $.Event("keypress");
                e.keyCode = 13;
                view.userInputView.$el.trigger(e);
                view.userInputView.$el.trigger("change");
                equal(view.getUserQuery().unparsed, "test", "Query is updated");
                _.defer(start);
              }, 1000);
            }
        });
    });

    testConstraint("1", [[0]], ["c2"]);
    testConstraint("2", [[0], [0,0]], ["c12", "c2"]);
    testConstraint("3", [[0], [0,0], [1]], ["c12"]);
    testConstraint("4", [[0], [0,0], [1,0]], ["c12", "c22"]);

    function testConstraint(name, checkPaths, filtered) {
      QUnit.asyncTest(name, function() {
        var dom = document.createElement("DIV");

        dom.innerHTML = '<div data-template="filteredfacet" data-name="mes.date"></div>';

        new Application({
            channels: ["http://example1.mindbreeze.com"],
            rootEl: dom,
            startSearch: false,
            callback: function (application) {
              var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];

              application.models.search.output.load(data, { parse: true });

              _.defer(function () {
                _.each(checkPaths, function (checkPath) {
                    var models = view.collection.models;
                    _.each(checkPath, function (index) {
                      var model = models[index],
                          entries = model.get("entries");

                      view.toggleFacetValue(true, model);
                      models = entries && entries.models;
                    });
                });


                var constraint = view.constraintsModel.get([view.filterID]);
                equal(_.keys(constraint.filtered).length, filtered.length, "number of filtered entries must be equal");
                equal(!!constraint.filtered.c1,  _.contains(filtered, "c1"),  "c1");
                equal(!!constraint.filtered.c11, _.contains(filtered, "c11"), "c11");
                equal(!!constraint.filtered.c12, _.contains(filtered, "c12"), "c12");
                equal(!!constraint.filtered.c2,  _.contains(filtered, "c2"),  "c2");
                equal(!!constraint.filtered.c21, _.contains(filtered, "c21"), "c21");
                equal(!!constraint.filtered.c22, _.contains(filtered, "c22"), "c22");

                start();
              });
            }
        });
    });
  }

  QUnit.asyncTest("Test default open true", function() {
    var dom = document.createElement("DIV");
    dom.innerHTML = '<div data-template="filteredfacet" data-name="' + _.uniqueId("mes.date") + '" data-collapsible="true" data-default-open="true"></div>';

    new Application({
      channels: ["http://example1.mindbreeze.com"],
      rootEl: dom,
      startSearch: false,
      callback: function (application) {
        var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];
        equal(view.isOpen(), true, "view is open");
        start();
      }
    });
  });

  QUnit.asyncTest("Test default open false", function() {
    var dom = document.createElement("DIV");
    dom.innerHTML = '<div data-template="filteredfacet" data-name="' + _.uniqueId("mes.date") + '" data-collapsible="true" data-default-open="false"></div>';

    new Application({
      channels: ["http://example1.mindbreeze.com"],
      rootEl: dom,
      startSearch: false,
      callback: function (application) {
        var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];
        equal(view.isOpen(), false, "view is closed");
        start();
      }
    });
  });


  QUnit.asyncTest("Test title caching", function() {
    var dom = document.createElement("DIV");
    dom.innerHTML = '<div data-template="filteredfacet" data-name="mes.date"></div>';

    new Application({
      channels: ["http://example1.mindbreeze.com"],
      rootEl: dom,
      startSearch: false,
      callback: function (application) {
        var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];

        application.models.search.output.load(data, { parse: true });
        retry(function () {
            return view.titleEl
          }, function () {
            equal($(view.titleEl).text(), i18n("date"), "title is set");

            // set user query for field, so filter is still displayed
            view.userInputView.el.value = "test";
            view.userInputView.$el.trigger("blur");
            application.models.search.output.load({}, { parse: true });

            retry(function () {
                return !view.treeView; // no checkboxes available
              }, function () {
              equal($(view.titleEl).text(), i18n("date"), "title is set");
              start();
            });
        });
      }
    });
  });

  testParameterInitialization(
    "Default values",
    '<div data-template="filteredfacet" data-name="mes.date"></div>',
    undefined,
    "auto"
  );

  testParameterInitialization(
    "suggest=false",
    '<div data-template="filteredfacet" data-name="mes.date" data-suggest="false"></div>',
    undefined,
    undefined
  );

  testParameterInitialization(
    "given user-input-template",
    '<div data-template="filteredfacet" data-name="mes.date" data-user-input-template="inputdate"></div>',
    "inputdate",
    undefined
  );

  testParameterInitialization(
    "user-input-template is reset when user-input is disabled",
    '<div data-template="filteredfacet" data-name="mes.date" data-user-input="disabled" data-user-input-template="inputdate"></div>',
    undefined,
    undefined
  );

  testParameterInitialization(
    "user-input-template is not reset when suggest is false",
    '<div data-template="filteredfacet" data-name="mes.date" data-suggest="false" data-user-input-template="inputdate"></div>',
    "inputdate",
    undefined
  );

  testParameterInitialization(
    "given user-input-template but disabled",
    '<div data-template="filteredfacet" data-name="mes.date" data-user-input="disabled" data-user-input-template="inputdate"></div>',
    undefined,
    undefined
  );

  testParameterInitialization(
    "given user-input-template with options",
    '<div data-template="filteredfacet" data-name="mes.date" data-always-visible="true" data-user-input-isrange="true" data-user-input-template="inputdate"></div>',
    "inputdate",
    undefined,
    {
      isrange: "true"
    },
    true
  );

  testParameterInitialization(
    "given user-input-template + always-visible + auto",
    '<div data-template="filteredfacet" data-name="mes.date" data-always-visible="true" data-user-input="auto" data-user-input-template="inputdate"></div>',
    undefined,
    "auto"
  );

  testParameterInitialization(
    "auto",
    '<div data-template="filteredfacet" data-name="mes.date" data-user-input="auto"></div>',
    undefined,
    "auto"
  );

  function testParameterInitialization(name, html, expectedUserInputTemplate, expectedUserInput, expectedUserInputOptions, expectedAlwaysVisible) {
    expectedAlwaysVisible = expectedAlwaysVisible || false;

    QUnit.asyncTest("Parameter initialization: " + name, function() {
      var dom = document.createElement("DIV");
      dom.innerHTML = html;

      new Application({
        channels: ["http://example1.mindbreeze.com"],
        rootEl: dom,
        startSearch: false,
        callback: function (application) {
          var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];

          equal(view.options.suggest, undefined);
          equal(view.options.userInput, expectedUserInput);
          equal(view.options.userInputTemplate, expectedUserInputTemplate);
          equal(view.options.alwaysVisible, expectedAlwaysVisible);
          if (expectedUserInputOptions && _.keys(expectedUserInputOptions).length > 0) {
            var validateUserInputOptions = function () {
              validateUserInputOptions.tries = validateUserInputOptions.tries || 0;
              validateUserInputOptions.tries++;
              if (validateUserInputOptions.tries > 100) {
                ok(false, "options could not be validated");
                start();
                return;
              }

              if (view.userInputView && view.userInputView.options) {
                _.each(expectedUserInputOptions, function (value, key) {
                  equal(view.userInputView.options[key], value);
                });
                start();
              } else {
                setTimeout(validateUserInputOptions, 100);
              }
            };
            setTimeout(validateUserInputOptions);
          } else {
            start();
          }
        }
      });
    });
  }

  var retry = function (condition, callback, maximumTries, interval) {
    maximumTries = maximumTries || 100;
    interval = interval || 100;

    var tries = 0,
        done,
        retryF = function () {
          if (tries < maximumTries) {
            tries++;
            try {
              done = condition();
            } catch (e) {
            }
          }

          if (done) {
            callback();
          } else {
            window.setTimeout(retryF, interval);
          }
        }

    retryF();
  }

});
