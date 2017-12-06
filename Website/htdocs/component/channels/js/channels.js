/*========================================================================
* $Id: channels.js 85349 2015-07-17 12:21:45Z michael.biebl $
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
    "client/template",
    "client/views/list",
    "service/messageframe_channel",
    "component!base",
    "utils/mustache",
    "component!mustache"
  ], function(
    i18n,
    Template,
    ListView,
    MessageFrameChannel,
    ComponentBase,
    MustacheAdapter,
    MustacheTemplate
  ) {

  var ChannelView = MustacheTemplate.View.extend({

    initialize: function () {
      this.options.template = {
        mustacheAdapter: new MustacheAdapter(this.constructor.DEFAULT_TEMPLATE)
      }
      MustacheTemplate.View.prototype.initialize.apply(this, arguments);
    },

    change: function () {
      this.render();
    }

  });

  ChannelView.DEFAULT_TEMPLATE = '<div class="checkbox"><input type="checkbox" class="action" data-name="enabled" {{checked}} id="{{id}}"{{#description?}} aria-describedby="{{id}}_description"{{/description?}}> <h4><label for="{{id}}">{{#icon?}}<img class="mb-small" src="{{icon}}" alt="">{{/icon?}} {{{name}}}</label></h4> {{#description?}}<p id="{{id}}_description">{{{description}}}</p>{{/description?}}</div>';

  var ChannelTemplate = Template.extend({});

  ChannelTemplate.View = ListView.extend({

    initialize: function () {
      this.options.childViewConstructor = ChannelView;
      ListView.prototype.initialize.apply(this, arguments);
    }

  });

  return ChannelTemplate;
});
