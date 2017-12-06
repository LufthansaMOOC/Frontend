/*===========================================================================
* $Id: application_test.js 115430 2017-11-08 08:31:22Z michael.biebl $
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
    "text!test/basic.html",
    "client/application",
    "utils/clone",
    "i18n/i18n",
    "service/channel",
    "text!../../../../test/js/api/v2/search/example_sourceinfo_response.txt",
    "jquery",
    "underscore"
  ], function (
    basicHtml,
    Application,
    clone,
    i18n,
    Channel,
    exampleSourceInfoResponseString,
    $,
    _
  ) {
    function SimpleOutputChannel(id, response) {
      this.id = id;
      this.response = response;
    }

    _.extend(SimpleOutputChannel.prototype, {
      on: function () {
      },

      get: function (propertyName) {
        return this.id;
      },

      call: function(path, request, responseObserver) {
        var promise = new Channel.DeferredCallFinished();
        var that = this;
        try {
          if (responseObserver) { responseObserver.trigger("response", JSON.parse(JSON.stringify(that.response)), that); }
        } catch (e) {
          console.error("failed to trigger observer", e, e.stack);
        }
        promise.triggerDone();
        return promise;
      }
    });

    var root = document.getElementById("qunit-fixture"),
        application,
        userConstraints;
    
    function initializationTest (rootEl) {
      return function () {
        equal(application.templateTree.rootNode.el, rootEl, "rootNode is set correctly");
        ok(application.templateTree.rootEls[0], rootEl, "rootNode is set correctly");
        equal(application.templateTree.rootNode.children.length, 1, "initialization OK");
      };
    }
    
    module("Application initialization with DOM", {
      setup: function () {
        root.innerHTML = basicHtml;

        application = new Application({
            startSearch: false
        });
      }
    });

    test("initialization", initializationTest(document.body));

    module("Application initialization with rootEl", {
      setup: function () {
        root.innerHTML = basicHtml;

        application = new Application({
            rootEl: root,
            startSearch: false
        });
      }
    });
    test("initialization", initializationTest(root));
    
    module("Application initialization with rootEl and templateString", {
      setup: function () {
        root.innerHTML = "";

        application = new Application({
            rootEl: root,
            templateString: basicHtml,
            startSearch: false
        });
      }
    });
    test("initialization", initializationTest(root));

    module("Helpers", {
      setup: function () {
        root.innerHTML = "";

        application = new Application({
            rootEl: root,
            startSearch: false
        });
      }
    });

    module("Application - State", {
      setup: function () {
        root.innerHTML = basicHtml;
        $(root).find(".main").append('<form data-template="searchform" id="basic-form"><input name="query"></form>');

        application = new Application({
            startSearch: false,
            rootEl: root
        });

        userConstraints = '{"filter_mes:date":{"label":"mes:date","filtered_name":"Date","filtered":{"2013":{"label":"mes:date","and":[{"num":1356991200000,"cmp":"GE","unit":"ms_since_1970"},{"num":1388527199999,"cmp":"LE","unit":"ms_since_1970"}],"description":"2013","id":"2013","value":{"num":1356991200000,"unit":"ms_since_1970"},"path":[]}},"filter_base":{"2014":{"label":"mes:date","and":[{"num":1388527200000,"cmp":"GE","unit":"ms_since_1970"},{"num":1420063199999,"cmp":"LE","unit":"ms_since_1970"}],"description":"2014","id":"2014","value":{"num":1388527200000,"unit":"ms_since_1970"},"path":[]},"2015":{"label":"mes:date","and":[{"num":1420063200000,"cmp":"GE","unit":"ms_since_1970"},{"num":1451599199999,"cmp":"LE","unit":"ms_since_1970"}],"description":"2015","id":"2015","value":{"num":1420063200000,"unit":"ms_since_1970"},"path":[]}}},"filter_extension":{"label":"extension","filtered_name":"Extension","filtered":{"png":{"label":"extension","regex":"^\\\\Qpng\\\\E$","description":"png","id":"png","value":{"str":"png"},"path":[]}},"filter_base":{"html":{"label":"extension","regex":"^\\\\Qhtml\\\\E$","description":"html","id":"html","value":{"str":"html"},"path":[]}}}}'
      }
    });

    asyncTest("getting and setting userConstraints and unparsedUserQuery", function () {
      expect(6);
      var computingCalls = 0,
          form = document.getElementById("basic-form");

      application.models.search.on("computing", function () {
        computingCalls++;
      });

      application.execute(function () {
        // setting query in form
        form.elements.query.value = "test";
        $(form).submit();
        application.getUserConstraints()
        equal(application.getUnparsedUserQuery(), "test", "form value is available vie getUnparsedUserQuery");
        equal(computingCalls, 1, "one search has to be triggered");

        // setting query via setUnparsedUserQuery
        application.setUnparsedUserQuery("test2");
        equal(application.getUnparsedUserQuery(), "test2", "getUnparsedUserQuery works after setUnparsedUserQuery");
        equal(computingCalls, 2, "two searches have to be triggered");

        // setting userConstraints via setUserConstraints
        application.setUserConstraints(JSON.parse(userConstraints));
        equal(JSON.stringify(application.getUserConstraints()), userConstraints, "getUserConstraints works after setUserConstraints");
        equal(computingCalls, 3, "three searches have to be triggered");

        start();
      });
    });

    module("Application - Actions", {
      setup: function () {
        var root = document.createElement("div");

        application = new Application({
            startSearch: false,
            rootEl: root
        });
      }
    });

    asyncTest("Action: openSearch", function () {
      application.execute(function (application) {
        var originalOpen = window.open,
            $button = $("<button>OpenSearch suche</button>"),
            openedURLs = [],
            warnings = [];

        $button.appendTo(application.rootEls);

        window.open = function (url) {
          openedURLs.push(url);
        }

        Application.prototype.displayWarning = function (message) {
          warnings.push(message);
        }

        application.setUnparsedUserQuery("Österreich");

        ok(i18n.locale.length > 0, "locale is set");
        i18n.locale = "en-US";

        $button.attr("data-action-object", JSON.stringify({ openSearch: {}}));
        $button.attr("data-href", "https://example.mindbreeze.com?query={searchTerms}&hl={language}");
        $button.click();

        $button.attr("data-href", "https://example2.mindbreeze.com?query={searchTerms}");
        $button.click();

        $button.attr("data-action-object", JSON.stringify({ openSearch: { searchTerms: "{searchTerms} abc" }}));
        $button.click();

        $button.attr("data-action-object", JSON.stringify({ openSearch: { searchTerms: "{searchTerms} abc", href: "https://example3.mindbreeze.com?query={searchTerms}" }}));
        $button.click();

        $button.removeAttr("data-href");
        $button.click();

        application.setUnparsedUserQuery("1 2 3");
        $button.click();

        deepEqual(openedURLs,
                  [
                    "https://example.mindbreeze.com?query=" + encodeURIComponent("Österreich") + "&hl=en-US",
                    "https://example2.mindbreeze.com?query=" + encodeURIComponent("Österreich"),
                    "https://example2.mindbreeze.com?query=" + encodeURIComponent("Österreich abc"),
                    "https://example3.mindbreeze.com?query=" + encodeURIComponent("Österreich abc"),
                    "https://example3.mindbreeze.com?query=" + encodeURIComponent("Österreich abc"),
                    "https://example3.mindbreeze.com?query=" + encodeURIComponent("1 2 3 abc")
                  ],
                  "all URLs openened correctly");

        deepEqual(warnings,
                  [],
                  "no warnings occured");


        openedURLs = [];
        application.setUnparsedUserQuery();
        $button.click();

        deepEqual(openedURLs,
                  [ ],
                  "no URLs were openened");

        deepEqual(warnings.length, 1, "warning occured");

        window.open = originalOpen;
        start();
      });
    });

    module("Application - Datasources")

    testDataSourceOrder("Default", "", "", true, ["b", "c", "a"]);
    testDataSourceOrder("Ungrouped", "", "", false, ["a", "b", "c"]);
    testDataSourceOrder("Ungrouped with name", "c", "", false, ["c", "a", "b"]);
    testDataSourceOrder("Ungrouped with name and category", "c", "Web", false, ["c", "a", "b"]);
    testDataSourceOrder("Grouped with name", "c", "", true, ["c", "b", "a"]);
    testDataSourceOrder("Grouped with name and category", "c", "Web", true, ["a", "c", "b"]);

    function testDataSourceOrder(name, nameOrder, categoryOrder, groupByCategory, expectedOrder) {
      asyncTest("Datasource order - " + name, function () {
          var response = JSON.parse(exampleSourceInfoResponseString);
          response.sources.data_sources[0].name = "a"; // Web
          response.sources.data_sources[1].name = "b"; // Microsoft Exchange
          response.sources.data_sources[2] = clone(response.sources.data_sources[1]);
          response.sources.data_sources[2].name = "c"; // Microsoft Exchange

          root.innerHTML = '<div ' +
                             'data-datasources-name-order="' + nameOrder + '" ' +
                             'data-datasources-group-by-category="' + groupByCategory + '" ' +
                             'data-datasources-category-order="' + categoryOrder + '" ' +
                           '></div>';

          application = new Application({
              rootEl: root.childNodes[0],
              startSearch: false,
              channels: [new SimpleOutputChannel("id", response)]
          });
          application.execute(function () {
            deepEqual(
              _.keys(application.models.userSourceInfo.get("sources.data_sources")),
              expectedOrder,
              "correct order"
            )
            start();
          });
      });
    }

    module("Application - Plugin initialization");
    
    asyncTest("plugins with errors don't block loading", function () {
      Mindbreeze.require.undef("plugin-config");
      Mindbreeze.require.undef("plugin-init");
      Mindbreeze.require.undef("client/application");

      Mindbreeze.define("test-ok/init", function () {
        window.testOKLoaded = true;
      });
      Mindbreeze.define("test-nok/init", function () {
          throw "invalid plugin";
      });
      Mindbreeze.define("plugin-config", function () {
        return [{"init":"init","id":"test-ok"},{"init":"init","id":"test-nok"},{"init":"init","id":"test-not-available"}];
      });

      Mindbreeze.require(["client/application"], function (Application) {
        var application = new Application({
            startSearch: false
        });
        application.execute(function (application) {
          equal(window.testOKLoaded, true, "test-ok plugin loaded correctly");
          delete window.testOKLoaded;
          start();
        });
      });
    });
});
