/*========================================================================
* $Id: helper.js 84811 2015-06-22 05:54:05Z michael.biebl $
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

define ([
  ],
  function (
  ) {

  var retry = function (f, count, interval) {
    count = count || 100;
    interval = interval || 10;

    var tries = 0;

    window.setTimeout(function () {
      tries++;
      if (f() === false && tries < count) {
        retry(f, count--, interval);
      }
    }, interval);
  };

  return {

    retry: retry

  };

});
