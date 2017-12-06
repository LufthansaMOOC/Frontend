/*========================================================================
* $Id: tree.js 98065 2017-05-11 15:06:51Z michael.biebl $
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


/**
* A View for displaying trees.
*
* The html-structure looks like the following:
*
* * ul
*   * li
*     * <view>
*     * ul
*       * li
*         * <view>
*
*
* Options:
*  * containerTagName
*  * containerClassName
*  * entryTagName
*  * entryClassName
*/
define([
    "component!base",
    "client/views/list",
    "underscore"
  ], function(
    Base,
    ListView,
    _
  ) {

  var TreeView = ListView.extend({

    defaultOptions: {
      entryTagName: "li"
    },

    createEntryView: function (options) {
      return ListView.prototype.createEntryView.apply(this, [_.extend(options, {
              childrenPath: this.options.childrenPath,
              containerTagName: this.tagName,
              containerClassName: this.className,
              containerConstructor: this.constructor
      })]);
    },

  });
  
  TreeView.EntryView = ListView.EntryView.extend({
    
    updateChildListView: function () {
      var model = this.getChildModel();
      if (model) {
        if (this.childListView) {
          this.childListView.remove();
        }

        var options = _.clone(this.options);
        var tagName = options.tagName;
        var className = options.className;
        delete options.tagName;
        delete options.className;

        this.childListView = new this.options.containerConstructor(_.extend(
          {
            tagName: options.containerTagName,
            className: options.containerClassName,
            entryTagName: tagName,
            entryClassName: className
          },
          options,
          {
            model: model
          }
        ));
        this.appendChild(this.childListView.el);
      } else {
        if (this.childListView) {
          this.childListView.remove();
          delete this.childListView;
        }
      }
    },

    getChildModel: function () {
      return this.model.get(this.options.childrenPath);
    },

    setModel: function () {
      ListView.EntryView.prototype.setModel.apply(this, arguments);

      if (this.childView) this.childView.setModel(this.model);

      if (this.model) {
        this.updateChildListView();
        this.listenTo(this.model, "change:" + this.options.childrenPath, this.updateChildListView);
      }
    },

    remove: function () {
      if (this.childListView) {
        this.childListView.remove();
        delete this.childListView;
      }
      ListView.EntryView.prototype.remove.apply(this, arguments);
    }
  });

  return TreeView;

});
