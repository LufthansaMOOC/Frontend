/*===========================================================================
* $Id: tree_test.js 80739 2014-08-21 15:43:58Z michael.biebl $
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
    "underscore",
    "backbone",
    "client/views/tree",
    "jquery"
  ], function (
    _,
    Backbone,
    TreeView,
    $
  ) {
    var root = document.getElementById("qunit-fixture"),
        $root = $(root),
        data,
        tree;

    module("Tree Tests", {
      setup: function () {
        data = new Backbone.Collection([{
            label: "a",
            entries: new Backbone.Collection([{
              label: "a.1"
            },{
              label: "a.2"
            }])
          },{
            label: "b"
        }]);

        tree = new TreeView({
          model: data,
          childrenPath: "entries"
        });

        root.appendChild(tree.el);
      }
    });
    
    test("Standard Test", function () {
      var ul = root.childNodes[0];

      equal(ul.childNodes.length, 2, "2 childnodes on root level");
      equal(ul.childNodes[0].childNodes[0].innerHTML, "a", "first child is a");
      equal(ul.childNodes[0].childNodes[1].childNodes.length, 2, "a has 2 children");
      equal(ul.childNodes[0].childNodes[1].childNodes[0].childNodes[0].innerHTML, "a.1", "first grandchild is a.1");
      equal(ul.childNodes[0].childNodes[1].childNodes[1].childNodes[0].innerHTML, "a.2", "second grandchild is a.2");

      equal(ul.childNodes[1].childNodes[0].innerHTML, "b", "second child is a");
    });

    asyncTest("Add Test", function () {
      var ul = root.childNodes[0];

      equal(ul.childNodes.length, 2, "2 childnodes on root level");

      _.defer(function () {
        data.add({
          label: "c"
        });

        equal(ul.childNodes.length, 3, "3 childnodes on root level");
        equal(ul.childNodes[2].childNodes[0].innerHTML, "c", "third child is a");
        equal(ul.childNodes[2].childNodes.length, 1, "a has no child list");

        data.at(2).set("entries", new Backbone.Collection([{
          label: "c.1"
        }]));
        
        equal(ul.childNodes[2].childNodes.length, 2, "a has a child list");
        equal(ul.childNodes[2].childNodes[1].childNodes[0].childNodes[0].innerHTML, "c.1", "third grandchild is c.1");
        start();
      });
    });


    test("Remove Test", function () {
      var ul = root.childNodes[0];

      equal(ul.childNodes.length, 2, "2 childnodes on root level");

      data.at(1).destroy();

      equal(ul.childNodes.length, 1, "1 childnode on root level");
      
      data.at(0).unset("entries");
      equal(ul.childNodes[0].childNodes.length, 1, "a has no child list");
    });

    test("Add fixed model at first position", function () {
      tree.remove();

      var CustomTreeView = TreeView.extend({

        addOne: function (model, collection, options) {
          options = options || {};
          this.addAnyIfNotExists(collection);

          options = _.clone(options);
          options.at = typeof options.at === "undefined" ? collection && _.indexOf(collection.models, model) : options.at;
          options.at = options.at + 1;

          TreeView.prototype.addOne.apply(this, [model, collection, options]);
        },

        addAnyIfNotExists: function (collection) {
          if (this.anyModel) return;

          this.anyModel = new Backbone.Model({
            label: "any"
          });

          this.addOne(this.anyModel, collection, { at: -1 });
        }

      });

      tree = new CustomTreeView({
          model: data,
          childrenPath: "entries"
      });
      root.appendChild(tree.el);

      var ul = root.childNodes[0];
      equal(ul.childNodes.length, 3, "3 childnodes on root level");
      equal(ul.childNodes[0].childNodes[0].innerHTML, "any", "first child is any");
      equal(ul.childNodes[1].childNodes[0].innerHTML, "a", "second child is a");

      equal(ul.childNodes[1].childNodes[1].childNodes.length, 3, "a has 3 children");
      equal(ul.childNodes[1].childNodes[1].childNodes[0].childNodes[0].innerHTML, "any", "first grandchild is any");
      equal(ul.childNodes[1].childNodes[1].childNodes[1].childNodes[0].innerHTML, "a.1", "second grandchild is a.1");
      equal(ul.childNodes[1].childNodes[1].childNodes[2].childNodes[0].innerHTML, "a.2", "third grandchild is a.2");
    });

});
