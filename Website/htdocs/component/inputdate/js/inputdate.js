/*========================================================================
 * $Id: searchform.js 73821 2013-07-17 11:51:32Z michael.biebl $
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

define(
		[ "api/v2/common", "underscore", "component!base", "component!searchform", "client/template",
				"client/templateregistry", "utils/dom", "jquery", "i18n/i18n",
				"bootstrap-daterangepicker/daterangepicker", "moment"],
		function(Common, _, Base, SearchFormTemplate, Template, TemplateRegistry, dom, $, i18n, daterangepicker, moment) {

			var InputDatePickerTemplate = Template.extend({
			});

			/*
			 * "label": "GBDAT", "and": [ { "num": -915156000000, "cmp": "GE",
			 * "unit": "ms_since_1970" }, { "num": -883620000001, "cmp": "LE",
			 * "unit": "ms_since_1970" }
			 * 
			 */
			var InputDatePickerView = SearchFormTemplate.ComponentView
					.extend({
						tagName : "input",

						initializeDatePicker: function() {
							var that = this;
							SearchFormTemplate.ComponentView.prototype.initialize.apply(this, arguments);

							var isRange = that.options
									&& that.options.isrange === "true";
						    this.formats = [ "DD.MM.YYYY",
						                     "DD-MM-YYYY",
						    		         "MM.DD.YYYY",
	                                         "MM-DD-YYYY",
	                                         "D. MMMM YYYY",
	                                         "DD. MMMM YYYY",
	                                         "DD MMMM YYYY",
	                                         "D MMMM YYYY",
	                                         "MMMM YYYY",
	                                         "YYYY MMMM",
	                                         "MM YYYY",
	                                         "YYYY MM",
	                                         "M YYYY",
	                                         "YYYY M",
	                                         "MMMM",
	                                         "YYYY"
	                                         ];
						    
						    this.formatGranularityMap = {
						      "DD.MM.YYYY" : "D",
						      "DD-MM-YYYY" : "D",
						      "MM.DD.YYYY" : "D",
						      "MM-DD-YYYY" : "D",
						      "D. MMMM YYYY": "D",
						      "DD. MMMM YYYY": "D",
						      "DD MMMM YYYY": "D",
						      "D MMMM YYYY": "D",
						      "MMMM YYYY": "M",
						      "YYYY MMMM": "M",
						      "MM YYYY": "M",
						      "YYYY MM": "M",
						      "M YYYY": "M",
						      "YYYY M": "M",
						      "MMMM": "M",  
                  "YYYY": "Y"
						    };
							
							// TODO: uninitialize
							if(this.picker) return;
							this.picker = this.$el.daterangepicker({
								showDropdowns : true,
								singleDatePicker : !isRange,
								minDate : "01.01.1900",
								maxDate : "12.31.2100",
								format : "DD.MM.YYYY",
								suppressInputParsing: true,
						        locale : {
					                applyLabel: i18n("Apply"),
					                cancelLabel: i18n("Cancel"),
					                fromLabel: i18n("daterangepicker_from"),
					                toLabel: i18n("daterangepicker_to"),
					                weekLabel: "W",
					                customRangeLabel: "Custom Range",
					                daysOfWeek: moment.weekdaysMin(),
					                monthNames: moment.monthsShort(),
					                firstDay: moment.localeData()._week.dow
					            }
							});
							
							var existingShow = this.picker.show;
							
							this.$el.on("apply.daterangepicker",
											function(ev, picker) {
												var startMillsecSince1970 = picker.startDate.valueOf(), 
												    endMillisecondsSince1970 = picker.endDate.valueOf(),
												    isRange = that.options && that.options.isrange === "true",
												    description = isRange ? 
												    	i18n("daterangepicker_from") + " " + picker.startDate.format('DD.MM.YYYY') + " " + i18n("daterangepicker_to") + " "+ picker.endDate.format('DD.MM.YYYY') : 
												    	picker.startDate.format('DD.MM.YYYY');
						                                
												that.setQuery(that.$el, description, picker.startDate, picker.endDate, true);
												that.options.parentView.submit(
					                                 ev, null);
											});
							//TODO:IE11
							if (!$.browser.msie) {
							  var inputGroup = this.$el.wrap('<div class="mb-input-clear"></div>');
	                          var resetButton = $('<button class="btn mb-btn-no-decor mb-no-print" type="button" tabindex="-1"><i class="icon-remove-sign"></i></button>');
	                          this.$el.after(resetButton);
	                          resetButton.click(function (ev, button) {
	                            if (that.$el.val() || that.$el.data("queryexpr")) {
	                               that.$el.data("queryexpr", null).trigger("changedata");
	                               that.options.parentView.submit(ev, null);
	                            }
	                          });
							}
							 
							
							this.$el.change(function (ev) {
                              if (!that.$el.val()) {
                                that.$el.data("queryexpr", null).trigger("changedata");
                                that.options.parentView.submit(ev, null);
                                $(ev.target).data("daterangepicker").hide();
                              }
                            });
							
							this.$el.keypress(function (ev, picker) {
							  $(ev.target).data("daterangepicker").show();
							  if (ev.keyCode !== 13) {
							     if (that.timeout) {
							       clearTimeout(that.timeout);
							     }
							     that.timeout = setTimeout(function () {
							       that.parseInput($(ev.target).val(), picker);
							     }, 1000);
						      } else {
						        if (that.timeout) {
                                  clearTimeout(that.timeout);
                                }
                                that.parseInput($(ev.target).val(), picker);
						        var queryExpr = $(ev.target).data("queryexpr");
						        if (queryExpr == null || queryExpr == undefined) {
						          ev.preventDefault();
						          ev.stopPropagation();
						        }
						        $(ev.target).data("daterangepicker").hide();
						      }
							}); 

						},
		
						initialize : function() {
							$(this.el).on("mouseover",_.bind(function(){this.initializeDatePicker();},this));
						},
						
						isRange : function () {
						  return this.options && this.options.isrange === "true";
						},
						
						setQuery : function(element, description, startDate, endDate, triggerChange) {
						  if (element && startDate && endDate) {
                            startDate.startOf("day");
                            endDate.endOf("day");
                            var queryExpr =  {
                                "description": description,
                                and : [
                                    {
                                       "num" : startDate.valueOf() - 7200000, //2 hours less for compensating summer time
                                       "cmp" : "GE",
                                       "unit" : "ms_since_1970"
                                     },
                                     {
                                       "num" : endDate.valueOf(),
                                       "cmp" : "LE",
                                       "unit" : "ms_since_1970"
                                     }]                                                
                           };
                           if (triggerChange) {
                             $(element).data("queryexpr", queryExpr).trigger("changedata");
                           } else {
                             $(element).data("queryexpr", queryExpr);
                           }
						  }
						},
						
						getDateStrings : function(dateValue) {
              var intervalStarters = new RegExp(".*\\s*(from|" + i18n("daterangepicker_from") + ")\\s*", "i");
              var intervalSplitters = new RegExp("\\s+(to|:|" + i18n("daterangepicker_to") + ")\\s+", "i");
						  if (dateValue) {
						    dateValue = dateValue.replace(intervalStarters, "");
						    var dateStrings = dateValue.split(intervalSplitters), result = [];
						    for (var i = 0; i < dateStrings.length; i++) {
						      result.push(dateStrings[i].trim());
						    }
						    return result;
						  }
						  return [ dateValue.trim() ];
						},
						
						parseSingleDate : function(dateValue) {
						  var start = moment(dateValue, this.formats, false), end = start;
						  if (start.isValid()) {
                            
                            var formatType = this.formatGranularityMap[start._f];
                            
                            end = start.clone();
                            if (formatType == "D") {
                              end.endOf("day");
                            } else if (formatType == "M") {
                              end.endOf("month");
                            } else if (formatType == "Y") {
                              end.endOf("year");
                            }
                            var daterangepicker = $(this.picker).data("daterangepicker");
                            daterangepicker.startDate = start;
                            daterangepicker.endDate = start;
                            daterangepicker.format = start._f;
                            daterangepicker["leftCalendar"].month.month(start.month()).year(start.year());
                            daterangepicker["rightCalendar"].month.month(start.month()).year(start.year());
                            daterangepicker.updateCalendars();
                            daterangepicker.notify();
                            return {"formatType": formatType, "startDate": start, "endDate": end }
						  }
						  return { "startDate": null, "endDate": null };					  
						},
						
						parseDateRange : function(dateValue1, dateValue2) {
						  var start = moment(dateValue1, this.formats, false), 
						      end = moment(dateValue2, this.formats, false);
						  if (start.isValid() && end.isValid()) {
						    end.endOf("day");
						    var startFormatType = this.formatGranularityMap[start._f],
						        endFormatType = this.formatGranularityMap[end._f];
						    
						    if (endFormatType == "M") {
						      end.endOf("month");
                            } 
						    else if (endFormatType == "Y") {
						      end.endOf("year");
                            }
						    var daterangepicker = $(this.picker).data("daterangepicker");
						    daterangepicker.startDate = start;
						    daterangepicker.format = start._f;
						    daterangepicker.endDate = end;
						    daterangepicker["leftCalendar"].month.month(start.month()).year(start.year());
                            daterangepicker["rightCalendar"].month.month(end.month()).year(end.year());
						    daterangepicker.updateCalendars();
						    daterangepicker.notify();
						    return {"startFormatType": startFormatType, "endFormatType": endFormatType, "startDate": start, "endDate": end }
						  }
						  return { "startDate": null, "endDate": null };
						},
						
						parseInput : function(input) {
						  try {
						     var dateStrings = this.getDateStrings(input), parseResult = null;
						     if (dateStrings && dateStrings.length) {
						       if (this.isRange()) {
						         parseResult = this.parseDateRange(dateStrings[0], dateStrings[dateStrings.length - 1]);
						       } else {
						         parseResult = this.parseSingleDate(dateStrings[0]);
						       }
						       if (parseResult && parseResult.startDate && parseResult.endDate) {
						         this.setQuery(this.picker, input, parseResult.startDate, parseResult.endDate, true);
						       } else {
						         $(this.picker).data("queryexpr", null);
						       }
						     } else {
						       $(this.picker).data("queryexpr", null);
						     }
						  } catch (error) {
						    $(this.picker).data("queryexpr", null);
						  } 
						}
					
					});

			InputDatePickerTemplate.View = InputDatePickerView;

			return InputDatePickerTemplate;
		});
