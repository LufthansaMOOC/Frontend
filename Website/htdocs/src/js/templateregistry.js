/*========================================================================
* $Id: templateregistry.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "backbone",
    "editors/adder/js/model",
    "underscore"
  ],
  function(
    Backbone,
    AdderGroups,
    _
  ) {

    var compareByWeight = function (a, b) {
      if (_.isNumber(a.weight) && _.isNumber(b.weight)) {
        return a.weight - b.weight;
      }

      if (_.isNumber(a.weight)) return -1;

      return 1;
    };

    var TemplateRegistry = function () {
      this.templateTypes = {};
    };

    _.extend(TemplateRegistry.prototype, Backbone.Events, {

        add: function (templateType) {
          this.templateTypes[templateType.id] = templateType;
        },

        getAdders: function (context, application) {
          var that = this,
              adderGroups = new AdderGroups(),
              sortedIds = _.pluck(_.values(this.templateTypes).sort(compareByWeight), "id");

          _.forEach(sortedIds, function (id) {
              var templateType = that.templateTypes[id];

              if (templateType.on) {
                templateType.on("changed", function () {
                    var adders = new AdderGroups.Adders();
                    var entries = _.collect(templateType.getAdders(context, application), function (adderEntry) {
                        return _.extend({
                            templateType: templateType.id
                          }, adderEntry);
                    });

                    if (entries && entries.length > 0) {
                      adders.add(entries);
                      adderGroups.remove(templateType.id);
                      adderGroups.add({
                        id: templateType.id,
                        name: templateType.name || templateType.id,
                        description: templateType.description,
                        adders: adders
                      });
                    }
                });
              }
              
              var adders = new AdderGroups.Adders();
              var entries = _.collect(templateType.getAdders(context, application), function (adderEntry) {
                return _.extend({
                    templateType: templateType.id
                }, adderEntry);
              });

              if (entries && entries.length > 0) {
                adders.add(entries);

                adderGroups.add({
                    id: templateType.id,
                    name: templateType.name || templateType.id,
                    description: templateType.description,
                    adders: adders
                });
              }
          });

          return adderGroups;
        },

        create: function (id, options) {
          var templateType = this.templateTypes[id];
          if (!templateType) return null;

          return templateType.create(options);
        }
    });

    var templateRegistry = new TemplateRegistry();

  // TODO: don't make global, add to application instead
  return templateRegistry;
});
