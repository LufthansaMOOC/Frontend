/*========================================================================
* $Id: actionsheet.js 80970 2014-09-05 12:27:45Z michael.biebl $
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

define([
    "client/template",
    "component!base",
    "i18n/i18n",
    "jquery",
    "underscore"
  ], function (
    Template,
    Base,
    i18n,
    $,
    _
  ) {

  var ActionSheet = Template.extend({
  });

  ActionSheet.View = Base.extend({

    show: function (showCallback, hideConditionCallback, hideCallback) {
      this.remove();

      this.actionSheetEl = document.createElement("div");
      this.actionEl = document.createElement("div");

      var cancelButton = document.createElement("button"),
          that = this;

      this.showCallback = showCallback;
      this.hideConditionCallback = hideConditionCallback || function (e) {
        return e.target === this.actionSheetEl || e.target === cancelButton; // only hide when one of the elements is clicked directly
      };
      this.hideCallback = hideCallback;

      cancelButton.innerHTML = i18n("Close");
      cancelButton.className = "mb-phone-action-button mb-cancel-button";

      this.actionEl.className = "mb-action-sheet-actions";

      this.actionSheetEl.appendChild(this.actionEl);
      this.actionSheetEl.className = "mb-action-sheet";
      this.actionSheetEl.id = "mb-action-sheet";

      $(this.actionSheetEl).on("click", function (e) {
          that.hide(e);
      });

      $(window).on("resize.action-sheet-" + this.id, _.bind(this.remove, this));

      showCallback(this.actionEl);

      this.actionEl.appendChild(cancelButton);
      document.body.appendChild(this.actionSheetEl);

      window.setTimeout(function () {
          document.body.classList.add("mb-action-sheet-open");
        }, 0);
    },

    remove: function () {
      $(window).off("resize.action-sheet-" + this.id);
      document.body.classList.remove("mb-action-sheet-open");
      if (this.hideCallback) this.hideCallback(this.actionEl);
      if (this.actionSheetEl) this.actionSheetEl.parentNode.removeChild(this.actionSheetEl);
      this.hideConditionCallback = null;
      this.hideCallback = null;
      this.actionSheetEl = null;
    },

    hide: function (e) {
      if (this.hideConditionCallback && !this.hideConditionCallback(e)) return;
      var that = this;

      document.body.classList.remove("mb-action-sheet-open");

      window.setTimeout(function () {
          that.remove();
        }, 150);
    }
  });

  return ActionSheet;
});
