/*========================================================================
* $Id: timeline.js 101191 2017-09-04 06:50:35Z daniel.eppensteiner $
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
    "client/template",
    "component!results",
    "client/resourceinfo",
    "i18n/i18n",
    "jquery",
    "text!../mustache/template.mustache",
    "moment",
    "underscore",
    "./lib/timeline",
    "./lib/timeline-locales"
   ], function(
     Template,
     Results,
     ResourceInfo,
     i18n,
     $,
     DEFAULT_TEMPLATE,
     moment,
     _,
     links
   ) {

  var getValue = function (model, name) {
   return model.get(name);
  }

  var loadCss = function (url, id) {
   var el = document.getElementById(id);

   if (!el) {
     el = document.createElement("link");
     el.rel = "stylesheet";
     el.href = url;
     el.id = id;
     (document.head || document.getElementsByTagName("script")[0].parentNode).appendChild(el);
   }
  }

  loadCss(ResourceInfo.scriptLocation + "../client/component/timeline/js/lib/timeline.css", "mbTimelineCss");

  var ResultsView = Results.View,
      TimelineView = ResultsView.extend({

    setModel: function () {
      var that = this;
      ResultsView.prototype.setModel.apply(this, arguments);
      this.listenTo(this.collection, "remove", this.removeOne);
      this.listenTo(this.collection, "change", this.update);
    },

    removeOne: function () {
      this.update();
    },

    hide: function () {
      if (this.timelineEl) {
        $(this.timelineEl).hide();
      }
    },

    show: function () {
      var range = {
            start: new Date(2008,0,1),
            end: new Date(2010,11,31)
          };

      this.timelineEl = this.timelineEl || document.createElement("div");
      if (!this.timelineEl) return;
      if (this.timelineEl.parentNode != this.el) {
        this.el.appendChild(this.timelineEl);
      }
      if (!this.timeline) {
       this.timeline = new links.Timeline(this.timelineEl,
       {
           style: "dot",
           min: range.start,
           max: range.end,
           zoomMin: 1000 * 60 * 60 * 24,
           date: this.options.date,
           height: this.options.height,
           locale: i18n.locale.substring(0,2),
           showCurrentTime: false
       });
       links.events.addListener(this.timeline, "select", _.bind(this.onSelect, this));
      }
      $(this.timelineEl).show();
    },

    renderMarker: function (model) {
      try {
        var view = this.options.resultTemplate.createView({model: model, application: this.options.application, "parent": this, modelType: "Result"}),
            viewEl = view.render().el;

        return viewEl;
      } finally {
      }
    },

    getSelectedModels: function () {
      var timeline = this.timeline,
          selection = this.timeline.getSelection(),
          selectedModels = _.map(selection, function (selectionEntry) {
            return timeline.getItem(selectionEntry.row).model;
          });

      return selectedModels;
    },

    onSelect: function () {
      var timeline = this.timeline,
          selection = this.timeline.getSelection(),
          selectedModels = _.map(selection, function (selectionEntry) {
            return timeline.getItem(selectionEntry.row).model;
          });
    },

    updateState: function () {
    },

    addOne: function(model) {
      this.update();
    },

    getDisplayedProperties: function () {
      var displayProperties = ResultsView.prototype.getDisplayedProperties.apply(this, arguments);
      displayProperties["mes:date"] = (displayProperties["mes:date"] || {});
      displayProperties["mes:date"].format = "VALUE";

      if (this.options.date) {
        displayProperties[this.options.date] = (displayProperties[this.options.date] || {});
        displayProperties[this.options.date].format = "VALUE";
      }

      return displayProperties;
    },

    update: function () {
      var that = this;
      try {
        this._render = true;
        _.defer(function () {
            if (that._render) {
              that._render = false;
              that.render();
            }
        });
      } catch (e) {
        console.error(e);
      }
    },

    takeStartEndFromModels: function (range, models) {
      var that = this;
      models.forEach(function (model) {
        var mesDate = that.getDateFromModel(model);

        if (mesDate && (!range.start || mesDate < range.start)) range.start = mesDate;
        if (mesDate && (!range.end || mesDate > range.end)) range.end = mesDate;
      });
    },

    getDateFromModel: function (model) {
      if (this.options.date) {
        return getValue(model, this.options.date);
      } else {
        return getValue(model, "mes:date");
      }
      
    },

    filterModels: function (models) {
      var that = this;
      return _.filter(models, function (model) {
        return !!that.getDateFromModel(model);
      });
    },

    render: function () {
      var models = this.filterModels(this.collection.models),
          range = {
            start: null,
            end: null
          },
          timeline,
          that = this,
          data;

      if (models.length > 0) {
        this.show();
        timeline = this.timeline;
      } else {
        this.hide();
        return;
      }

      if (this.options.rangeStart && this.options.rangeEnd) {
        range = {
          start: this.options.rangeStart,
          end: this.options.rangeEnd
        }
      } else {
        this.takeStartEndFromModels(range, models);

        var paddingLeft = (this.options.paddingLeft || 2) * -1;
        var paddingRight = this.options.paddingRight || 2;

        range.start = moment(range.start).add(paddingLeft, "month").startOf("month").toDate();
        range.end = moment(range.end).add(paddingRight, "month").endOf("month").toDate();
      }

      data = _.flatten(_.map(models.reverse(), function (model) {
            var mesDate = that.getDateFromModel(model),
                entries = [];

            if (mesDate >= range.start && mesDate <= range.end) {
              entries.push({
                  start: mesDate,
                  content: that.renderMarker(model),
                  model: model
              });
            }

            return entries;
          }));

      timeline.setOptions({
          style: "dot",
          min: range.start,
          max: range.end,
          zoomMin: 1000 * 60 * 60 * 24,
          date: this.options.date,
          height: this.options.height,
          locale: i18n.locale.substring(0,2),
          showCurrentTime: false
      });
      timeline.deleteAllItems();
      timeline.draw(data);
      timeline.setVisibleChartRange(range.start, range.end);
      return this;
    },

    remove: function () {
        this.hide();
        if (this.timeline) {
          delete this.timeline;
        }
        if (this.timelineEl && this.timelineEl.parentNode) {
          this.timelineEl.parentNode.removeChild(this.timelineEl);
        }

        ResultsView.prototype.remove.apply(this, arguments);
      }
  });
  
  var Timeline = Results.extend({

      createView: function (options) {
        var view = new TimelineView(_.extend({}, options, {
              resultTemplate: this.getContent(),
              application: options.application,
              template: this,
              date: this.get("date", options.date),
              height: this.get("height", options.height),
              rangeStart: this.get("range_start", options.rangeStart),
              rangeEnd: this.get("range_end", options.rangeEnd),
              paddingLeft: this.get("padding-left", options.paddingLeft),
              paddingRight: this.get("padding-right", options.paddingRight),
              el: this.el
        }));
        this.instances.push(view);
        return view;
      },

      schema: new Template.Schema({
        inputAttributes: {
          view: {
            type: "reference",
            reference: "view"
          },
          date: {
            title: "editor_timeline_date",
            type: "string",
            "default": "mes:date"
          },
          height: {
            title: "editor_timeline_height",
            type: "string",
            "default": "auto"
          },
          "range_start": {
            type: "date",
            title: "editor_timeline_range_start"
          },
          "range_end": {
            type: "date",
            title: "editor_timeline_range_end"
          },
          "padding-left": {
            type: "int", 
            title: "editor_padding_left"
          },
          "padding-right": {
            type: "int",
            title: "editor_padding_right"
          }
        }
      }),

      hasContent: function () { return true },

      getContent: function() { return this.children[0].template; }
  });
  Timeline.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;
  Timeline.View = TimelineView;

  return Timeline;

});

