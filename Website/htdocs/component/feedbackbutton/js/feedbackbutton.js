/*========================================================================
* $Id: feedbackbutton.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "component!base",
    "utils/trace",
    "underscore"
  ], function(
    i18n,
    Template,
    Base,
    Trace,
    _
  ) {

  var FeedbackButtonTemplate = Template.extend({
    schema: new Template.Schema({
      inputAttributes: {
        checkIfEnabledInProfile: {
          title: "editor_feedbackbutton_checkProfile",
          type: "boolean",
          defaultValue: false
        }
      }
    }),

    getOptions: function (options) {
      return _.extend(
        {},
        Template.prototype.getOptions.apply(this, arguments),
        this.attributeModel.getCamelCase()
      );
    }
  });

  FeedbackButtonTemplate.View = Base.extend({

      className: "mb-feedbackbutton",

      events: {
        "click": "feedback",
        "keypress": "feedback"
      },

      initialize: function () {
        Base.prototype.initialize.apply(this, arguments);

        this.$el.addClass(this.className);

        if (this.options.checkIfEnabledInProfile) {
          this.listenTo(this.options.application.models.profile, "change", this.render);
        }

        this.render();
      },

      enabled: function () {
        return Trace.enabled
                && (
                  !this.options.checkIfEnabledInProfile
                  || this.enabledInUserProfile()
                )
      },

      enabledInUserProfile: function () {
        return this.options.application.models.profile.get("show_feedback_button");
      },

      render: function () {
        if (this.rendered) return;

        if (this.enabled()) {
          this.el.innerHTML += '<button type="button" class="mb-hide-text" title="' + i18n("client_headsup_feedback_button") + '">' + i18n("client_headsup_feedback_button") + '</button>'
          this.rendered = true;
        }
        return this.el;
      },

      feedback: function (e) {
        if (e && "keypress" === e.type && e.which !== 13 && e.which !== 27) {
          return true;
        }
        if (e) e.stopPropagation();

        Trace.feedback(this.options.formid);
      }

  });

  return FeedbackButtonTemplate;
});
