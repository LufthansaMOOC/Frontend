/*========================================================================
* $Id: templatetree.js 98419 2017-05-29 08:58:04Z daniel.eppensteiner $
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

//
// The TemplateTree searches templates in the DOM.
//
// *Process*
// 1. build tree
//   var tt = new TemplateTree(rootEl, rootTemplateType);
//
// 2. create views based on template tree
//   tt.initialize(model, callback);
//
// 3. destroy all created views and unregister all event handlers
//   tt.destroy(callback);
//
// *Editor Lifecycle*
//
// Repeat steps 1-3 after each edit
//

define([
  "require",
  "underscore"
  ], function(
    require,
    _
) {

  // initializes tree nodes recursivly
  //
  // 1. loads the component if necessary
  // 2. instantiates templates
  // 3. calls itself for children
  function initializeNode(node, application, callback) {
    var errors;
    var module = "component!" + node.templateType;
    require([module], function (Template) {
      var callbackCount;
      var callbackHandler;

      // turns the node into a template
      node.template = new Template(node.el, node, application);
      callbackCount = node.children.length;

      callbackHandler = function () {
        callbackCount--;
        if (callbackCount === 0) {
          try {
            callback(errors);
          } catch (e) {
            if (console && console.warn) console.warn("Failed to notify template tree initialization.", e.stack, e);
          }
        }
      };

      if (node.template.initializationPromise) {
        // additional condition to callback
        callbackCount++;
        node.template.initializationPromise.always(callbackHandler);
      }
      

      if (callbackCount === 0) {
        callback();
      }
      _.forEach(node.children, function (child) {
        try {
          initializeNode(child, application, callbackHandler);
        } catch (e) {
          if (!errors) errors = [];
          errors.push(e);
        }
      });
    });
  };

  function eachNodePost(node, cb) {
    _.forEach(node.children, function(child) {
      eachNodePost(child, cb);
    });
    cb(node);
  }

  var TemplateTree = function (rootEl, rootTemplateType, templateString) {
    this.init.apply(this, arguments);
  };

  var Node = function (tree, el, templateType, parentNode) {
    this.tree = tree;
    this.el = el; /* the DOM element of node */
    this.templateType = templateType; /* the type of the template as specified by data-template or type="text/x-mustache-template" */
    this.parentNode = parentNode;
    this.children = [];
  };

  _.extend(Node.prototype, {

      remove: function () {
        var that = this;

        if (this.parentNode) {
          this.parentNode.children = _.filter(this.parentNode.children, function (child) {
            return child !== that;
          });
          delete this.parentNode;
        }
      },

      firstChildOfType: function (type) {
        return _.find(this.children, function (child) {
          return child.templateType === type;
        });
      },

      append: function (el) {
        if (el) {
          this.el.appendChild(el);
          this.collect();
        }
      },

      collect: function(cb) {
        var that = this;

        // TODO: handle combined callback
        _.forEach(this.el.childNodes, function (el) {
            that.tree.collect(that, el, cb);
        })
      },

      initializeChildren: function (application, model, callback) {
        var that = this;

        _.forEach(this.children, function (child) {
          initializeNode(child,
            application,
            /* callback */
            function () {
              child.template.createView({
                  application: application,
                  model: model,
                  node: child
              });
              if (callback) {
                try {
                  callback();
                } catch (e) {
                  console.error(e, e.stack);
                }
              }
          });
        });
      },

      destroy: function (callback) {
        eachNodePost(this, function(node) {
            if (node.template && node.template.removeViews)
              node.template.removeViews();
        });

        this.template.remove({
          node: this
        });

        if (callback) {
          callback();
        }
      },
      
      destroyChildren: function (callback) {
        _.forEach(this.children, function (node) {
            eachNodePost(node, function(node) {
              if (node.template && node.template.removeViews)
                node.template.removeViews();
            });

            node.template.remove({
              node: node
            });

        });

        if (callback) {
          callback();
        }
      }
  });

  // builds the tree, starting at roolEl using the given template type for the root node

  _.extend(TemplateTree.prototype,  {

    init: function (rootEl, rootTemplateType, templateString) {
      rootEl = rootEl || document.body;

      if (_.isArray(rootEl)) {
        this.rootEls = rootEl;
      }
      else {
        if (templateString) {
          rootEl.innerHTML = templateString;
        }
        this.rootEls = [rootEl];
      }

      this.rootTemplateType = rootTemplateType;
      this.rootNode = this.build();// rootNode;
    },

    // determines if an element is a template
    matches: function (el) {
      try {
        return !!(el.getAttribute && (el.getAttribute("data-template") || el.getAttribute("type") === "text/x-mustache-template"));
      } catch (e) {
        return false;
      }
    },

    getType: function (el) {
      try {
        return el.getAttribute("data-template") || "mustache";
      } catch (e) {
        return "mustache";
      }
    },

    // walks down the DOM tree starting at el and adds template nodes as found
    collect: function (parentNode, el, cb) {
      try {
        if (el && el.getAttribute && el.getAttribute("data-mb-exclude") === "true") {
          return;
        }
      } catch (e) {
      }

      var that = this;

      if (this.matches(el)) {
        // stop if this node is already part of some hiearchy
        if (_.indexOf(this.processedEls, el) != -1) {
          return;
        }
        var childNode = new Node(this, el, this.getType(el), parentNode);
        this.processedEls.push(el);
        parentNode.children.push(childNode);
        if (cb) { cb(childNode); }
        parentNode = childNode;
      }

      _.forEach(el.childNodes, function (childEl) {
          that.collect(parentNode, childEl, cb);
      });
    },

    build: function() {
      var that = this;
      this.processedEls = [];
      var rootNode = new Node(that, this.rootEls.length === 1 ? this.rootEls[0] : null, that.rootTemplateType);
      _.each(this.rootEls, function(rootEl) {
        that.collect(rootNode, rootEl);
      });
      return rootNode;
    },

    // load templates, initialize templates and create view
    // of root template. The createView functions of the templates
    // must take care of creating the sub views as necessary
    initialize: function (application, model, callback) {
      var that = this;
      initializeNode(this.rootNode,
                     application,
                     /* callback */
                     function () {
                       that.rootNode.template.createView({
                         application: application,
                         model: model,
                         node: that.rootNode
                       });
                       if (callback) {
                         try {
                           callback();
                         } catch (e) {
                           console.error(e, e.stack);
                         }
                       }
                     });
    },


    reload: function(application, model, callback, destroyedCallback) {
      var that = this;

      this.destroy(function () {
        if (destroyedCallback) destroyedCallback();
        that.rootNode = that.build();
        that.initialize(application, model, callback);
      });
    },

    // calls remove on root template, which is responsible
    // for removing subviews as well
    destroy: function (callback) {
      eachNodePost(this.rootNode, function(node) {
        if (node.template && node.template.removeViews)
          node.template.removeViews();
      });
      this.rootNode.template.remove({
        node: this.rootNode
      });

      if (callback) {
        callback();
      }
    },

    getTemplateByEl: function (el) {
      var template;
      eachNodePost(this.rootNode, function (node) {
          if (!template) {
            if (node.el === el) {
              template = node.template;
            }
          }
      });

      return template;
    },

    getTemplateById: function (id) {
      if (!id) return;

      return this.getTemplateByEl(document.getElementById(id));
    }

  });

  return TemplateTree;
});
