/*========================================================================
* $Id: adder.js 98643 2017-06-02 12:13:11Z michael.biebl $
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
    "i18n/i18n",
    "component!base",
    "component!list",
    "component!mustache",
    "utils/dom",
    "jquery",
    "underscore",
    "backbone"
  ],
  function(
    i18n,
    Base,
    ListTemplate,
    MustacheTemplate,
    dom,
    $,
    _,
    Backbone
) {
var ListView = ListTemplate.View;

var AddItemView = MustacheTemplate.View.extend({

  events: {
    "click .mb-create": "create",
    "sortinsert": "sortInsert"
  },

  sortInsert: function (e, ui) {
    var parent = document.createElement("div");
    this.create(e, { 
        el: parent
      },
      null
    );
    var created = $(parent).children();
    ui.item.replaceWith(created);
    ui.item = created;
  },
  
  setEditable: function (editable) {
  },

  doInstrument: function () {
    return false;
  },

  create: function (e, parent, insertBefore) {
    this.options.parent.options.application.hidePicker();
    this.model.create(this.options.parent.options.application, parent || this.options.parent.options.parent, typeof insertBefore === "undefined" ? this.options.parent.options.insertBefore : insertBefore);
  },

  initialize: function () {
    var that = this;

    this.options.templateString = this.options.templateString || "<div class=\"editor-selection\"><div class=\"editor-selection-content mb-create\" {{option_attributes}}>{{#icon}}<img src=\"{{{icon}}}\">{{/icon}}<p>{{{name}}}</p><p>{{{description}}}</p></div></div>";
    MustacheTemplate.View.prototype.initialize.apply(this, arguments);
    this.$el.draggable({
        connectToSortable: this.options.parent.options.sortables,
        tolerance: "pointer",
        helper: "clone",
        appendTo: "body"
    });
  }
});

var AdderGroupView = Backbone.View.extend({
    tagName: "li",
    
    events: {
      "click": "select"
    },

    select: function () {
      this.options.parent.selectGroup(this.model);
    },

    render: function () {
      this.el.innerHTML = i18n(this.model.get("name"));

      return this;
    }

});

var AdderGroupsView = ListView.extend({
    tagName: "ul",
    className: "nav nav-stacked",
    childView: AdderGroupView,

    selectGroup: function (group) {
      this.options.delegate && this.options.delegate.selectGroup && this.options.delegate.selectGroup(group);
    },

    setEditable: function (editable) {
    }

});

var SelectionView = ListView.extend({
    
    childView: AddItemView,
  
    setEditable: function (editable) {
    }
});

var AdderGroupHeaderView = MustacheTemplate.View.extend({

  className: "mb-group",

  setEditable: function (editable) {
  },

  create: function (e) {
    this.model.create(this.options.parent.options.application, this.options.parent.options.parent, this.options.parent.options.insertBefore);
  },

  initialize: function () {
    this.options.templateString = "<a name=\"adder_{{id}}\"></a><h2>{{{name}}}</h2>{{#description}}<div class=\"editor-description\"><p>{{{description}}}</p></div>{{/description}}";
      MustacheTemplate.View.prototype.initialize.apply(this, arguments);
    }
  });


  var AdderView = Base.extend({

    events: {
      "click .close": "remove"
    },

    initialize: function () {
      var that = this;

      Base.prototype.initialize.apply(this, arguments);

      this.groupsView = new AdderGroupsView(_.extend({delegate: this}, this.options));

      this.addersView = new AddersView(_.extend(
        this.options,
        {
          model: this.model
        }
      ));
    },

    className: "editor",

    selectGroup: function (group) {
      this.$el.find('a[name="adder_' + group.get("id") + '"]').get(0).scrollIntoView();
    },
    
    setEditable: function (editable) {
    },

    render: function () {
      var that = this;

      this.groups = this.make(
          "div",
          {
            "class": "editor-left"
          }
        )

      this.groups.appendChild(this.groupsView.render().el);
      this.appendChild(this.groups);
      this.appendChild(this.addersView.render().el);

      return this;
    }
  });

  var AddersViewEntryView = Base.extend({

    render: function () {
      this.el.innerHTML = "";

      this.appendChild(new AdderGroupHeaderView({
        model: this.model
      }).render().el);

      this.appendChild(new SelectionView(
        _.extend(
          {},
          this.options.parent.options,
          {
            model: this.model.get("adders")
          }
        )).render().el
      );

      return this;
    },

    setEditable: function (editable) {
    }

  });

  var AddersView = ListView.extend({
    tagName: "div",
    className: "editor-right mb-scrollable-y",
    childView: AddersViewEntryView,

    selectGroup: function (group) {
      this.options.delegate && this.options.delegate.selectGroup && this.options.delegate.selectGroup(group);
    },

    setEditable: function (editable) {
    }

  });
  
  AdderView.AddItemView = AddItemView;
  AdderView.AdderGroupView = AdderGroupView;
  AdderView.AdderGroupsView = AdderGroupsView;
  AdderView.SelectionView = SelectionView;
  AdderView.AdderGroupHeaderView = AdderGroupHeaderView;
  AdderView.AddersViewEntryView = AddersViewEntryView;
  AdderView.AddersView = AddersView;
  return AdderView;
});
