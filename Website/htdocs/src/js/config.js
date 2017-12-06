/*========================================================================
 * $Id: main.js 73933 2013-07-23 08:47:30Z michael.biebl $
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

  // TODO: Move to packaging ..
  // start with the current config.
  // this does not need to run in non browser configurations ...
  var baseUrl,
      scriptUrl,
      libPath,
      appsPath,
      sourceUrl;
 

  if (require.isBrowser) {
    if (currentScript && currentScript.src) {
      baseUrl = currentScript.src;
      scriptUrl = baseUrl.replace(/[^\/]*$/, "");
      baseUrl =  scriptUrl + "../"
      // if (console && console.log) {
      //   console.log("currentScript", currentScript);
      //   console.log("currentScript.src", currentScript.src);
      // }
    }
    else {
      scriptUrl = require.toUrl("");
      baseUrl = require.toUrl("../");
    }
    // baseUrl is root (without scripts/...)
    sourceUrl = baseUrl + "src/js";
    appsPath  = "../../";
    libPath   = appsPath + "lib/";
  }
  else {
    throw new Error("Non browser environments are for UI components currently not supported.");
  }

 //  console.log("sourceUrl", sourceUrl);
 var appsDir = "../../";
 var configuredRequire = require.config({

    baseUrl:  sourceUrl,
    // 
    paths: {
      "client":     appsPath + "client/src/js",
      "test":       appsPath + "client/test/src/js",
      "api-test":   appsPath + "test/js",
      "libs":       libPath,
      "resource":   appsPath + "../resource",
      "translations": appsPath + "src.generated/js/translations",

      // component is a plugin for loading components
      "component":  "utils/requirejs_plugin_component",
      "editor":     "utils/requirejs_plugin_editor",

      // components is the internal path to the components used by component
      "components":  appsPath + "client/component/",
      "editors":     appsPath + "client/editor/",

      "text": libPath + "text",

      "backbone" :  libPath + "backbone",
      "underscore": libPath + "underscore",
      "mustache":   libPath + "mustache",
      "sloth":   libPath + "sloth",

      "jquery": libPath + "jquery",
      "jquery-ui-autocomplete": libPath + "jquery-ui-1.10.3.custom",
      "jquery-ui-sortable": libPath + "jquery-ui-1.10.3-sortable",
      "jquery-taphold": libPath + "jquery-taphold",

      "bootstrap": libPath + "bootstrap",
      "bootstrap-daterangepicker": libPath + "bootstrap-daterangepicker",
      "handsontable": "../../scripts/handsontable/handsontable.full",
      "highcharts": libPath + "highcharts-4.1.5/highcharts",

      "moment": libPath + "moment-2.8.3-with-locales",

      "jsoneditor": libPath + "jsoneditor"
    },

    // For development
    urlArgs: "bust=" + (new Date()).getTime(),

    shim: {
      "backbone": {
        deps: ["underscore"],
        exports: "Backbone"
      },
      "underscore": {
        exports: "_"
      },
      "handsontable": {
        // deps: ['jquery'],
        exports: 'Handsontable'
      }
    }
  }
);

configuredRequire.config = require.config;

define("client/resourceinfo", [], function() {
  return {
    scriptLocation: scriptUrl,
  };
});

define("client/sourceinfo", ["client/sourceinfo-debug"], function(SourceInfo) {
  if (SourceInfo) {
    return SourceInfo;
  }
  else {
    return {
      builtinSources: [scriptUrl + "../../api/v2/"]
    }
  }
  return SourceInfo;
});

define("plugin-config", function (pluginConfig) {
    return [];
});


