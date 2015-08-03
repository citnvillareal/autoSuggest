/*!
 * jQuery autoSuggest plugin
 * Original author: Neil K. Villareal
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Neil K. Villareal
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 */
;
(function($, window, document, undefined) {
    "use strict"

    var pluginName = "autoSuggest";

    var defaults = {
        data: [],
        searchable: [
            "description"
        ],
        display: "description",
        templates: {
            "content-wrapper": "<div class=\"autoComplete-wrapper\"></div>",
            "list-group": "<div class=\"list-group\"></div>",
            "list-group-item": "<a class=\"list-group-item\" href=\"#\"><%=description%></a>",
            "bv-list-group-item": "<a class=\"list-group-item\" href=\"#\"><%=value%></a>",
            "loading": "<span class=\"list-group-item\"><%=value%></span>",
            "failed": "<span class=\"list-group-item\"><%=value%></span>"
        },
        borderRadius: 5,
        limit: 5,
        vent: {
            onselect: function(e, itemData, _this) {
                // TO DO
            },
            onblur: function(e, itemData, _this) {
                // TO DO
            }
        },
        selectionClassName: "list-group-item-info",
        url: false,
        delay: 500,
        messages: {
            loading: "Loading...",
            failed: "No data matched."
        },
        defaultItemData: {}
    };

    var Key = {
        _pressed: false,

        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        ENTER: 13,
        SPACE: 32,

        isDown: function(keyCode) {
            return (this._pressed == keyCode);
        },

        hasKeyDown: function() {
            return (this._pressed !== false);
        },

        onKeydown: function(event) {
            this._pressed = event.keyCode;
        }
    };

    function Plugin(el, opt) {
        var _this = this;

        _this.el = el;
        _this.$el = $(_this.el);

        _this.options = $.extend(true, {}, defaults, opt);

        _this._defaults = defaults;
        _this._name = pluginName;
        _this.totalMatched = 0;
        _this.prevFormOnSubmit = [];
        _this.lastSelected = null;

        _this.$el.bind("keydown", function(e) {
            e.stopPropagation();
            Key.onKeydown(e);
        });

        _this.init();
    }

    Plugin.prototype.init = function() {
        var _this = this;

        _this.lastKeyWord = "";

        _this.$el.wrap(_this.template("content-wrapper"));
        _this.$input = (_this.$el.is("input")) ? _this.$el : $(_this.$el.find("input"));
        _this.$parentElement = _this.$el.parent();

        var borderColor = _this.$input.css("border-color");
        var borderWidth = _this.$input.css("border-width");
        var position = _this.$el.position();
        var width = _this.$el.outerWidth();
        var heigth = _this.$el.outerHeight();

        _this.$parentElement.find("*").css({
            "border": 0,
            "border-radius": 0
        });

        _this.$el.css({
            "border": borderWidth + " solid " + borderColor,
            "border-radius": _this.options.borderRadius + "px",
            "overflow": "hidden"
        });

        _this.$listGroup = _this.template("list-group").css({
            "max-height": "200px",
            "overflow-y": "auto",
            "border": borderWidth + " solid " + borderColor,
            "border-radius": "0px 0px " + _this.options.borderRadius + "px " + _this.options.borderRadius + "px",
            "border-top": 0,
            "position": "absolute",
            "top": position.top + heigth + "px",
            "left": position.left + "px",
            "width": width + "px",
            "z-index": 99999
        }).hide();

        _this.$parentElement.append(_this.$listGroup);

        _this.$input.bind("keyup", function(e) {
            e.preventDefault();
            _this.onKeyUp(e);
        });

        _this.$input.blur(function(e) {
            _this.onBlur(e);
        });

        _this.$el.closest("form").attr('autocomplete', 'off');
        _this.$input.attr('autocomplete', 'off');
    };

    Plugin.prototype.onKeyUp = function(e) {
        var _this = this;

        _this.reloadChangingDesign();

        if (Key.isDown(Key.ENTER)) {
            _this.onEnter(e);
        } else if (Key.isDown(Key.DOWN) || Key.isDown(Key.UP)) {
            _this.onSelection(e);
        } else if (_this.options.url == false) {
            _this.search(_this.$input.val());
        } else {
            _this.remoteSearch(_this.$input.val());
        }
    }

    Plugin.prototype.reloadChangingDesign = function() {
        var _this = this;

        var position = _this.$el.position();
        var width = _this.$el.outerWidth();
        var heigth = _this.$el.outerHeight();

        _this.$listGroup.css({
            "top": position.top + heigth + "px",
            "left": position.left + "px",
            "width": width + "px"
        });
    }

    Plugin.prototype.onEnter = function(e) {
        var _this = this;

        if (!_this.$listGroup.is(":Visible")) {
            _this.$el.closest("form").submit();
        }

        var selected = _this.$listGroup.find("." + _this.options.selectionClassName)[0];

        if (selected == null) {
            _this.onNoSelect(e);
        } else {
            $(selected).trigger("mousedown");
        }

        _this.hideListGroup();
    };

    Plugin.prototype.onBlur = function(e) {
        var _this = this;
        var selected = _this.$listGroup.find("." + _this.options.selectionClassName)[0];

        if (selected == null) {
            _this.onNoSelect(e);
        } else {
            $(selected).trigger("mousedown");
        }

        _this.options.vent.onblur(e, _this.lastSelected, _this);
        _this.hideListGroup();
    };



    Plugin.prototype.remoteSearch = function(keyword) {
        var _this = this;
        var requestUrl = "";

        _this.lastKeyWord = keyword;
        _this.hideListGroup();

        if (typeof _this.timeoutId != undefined) {
            clearTimeout(_this.timeoutId);
        }

        if (typeof _this.xhr != undefined) {
            _this.xhr.abort();
        }

        requestUrl = _this.options.url + encodeURIComponent(keyword);

        _this.timeoutId = setTimeout(function() {

            if (keyword.trim().length <= 0) {
                return;
            }
            var $loading = _this.template("loading", _this.options.messages["loading"]).css({
                "border": 0,
                "border-radius": 0
            });
            _this.$listGroup.html($loading);
            _this.showListGroup();

            _this.xhr = $.get(requestUrl, function(res) {
                if (typeof res == "string") {
                    res = JSON.parse(res) || $.parseJSON(res);
                }

                if (typeof res["data"] == undefined || res["data"] == null) {
                    _this.options["data"] = [];
                } else {
                    _this.options["data"] = res.data;
                }

                _this.search(_this.$input.val());
                clearTimeout(_this.timeoutId);
            });

        }, _this.options.delay);
    }

    Plugin.prototype.search = function(keyword) {
        var _this = this;
        var data = _this.options["data"];
        var searchable = _this.options["searchable"];

        _this.hideListGroup();
        _this.lastKeyWord = keyword;

        if (keyword.trim().length <= 0) {
            return;
        }

        for (var i = 0; i < data.length; i++) {

            if (_this.$listGroup.children().length >= _this.options.limit && _this.options.limit !== false) {
                return;
            }

            var span = $("<span></span>");
            span.addClass("auto-wrap");
            span.css({
                "font-weight": "bold"
            });


            if (typeof data[i] == "string") {
                var obj = data[i];
                span.html(_this.lastKeyWord);
                if (typeof obj != undefined && obj.indexOf(keyword) >= 0) {
                    obj = obj.replace(_this.lastKeyWord, span.clone().wrap('<div>').parent().html());
                    _this.append(obj);
                }
            } else {
                var obj = $.extend(true, {}, data[i]);
                var flag = false;

                for (var j = 0; j < searchable.length; j++) {
                    var key = searchable[j];

                    if (typeof obj[key] != undefined && obj[key].indexOf(keyword) >= 0) {
                        span.html(_this.lastKeyWord);
                        obj[key] = obj[key].replace(_this.lastKeyWord, span.clone().wrap('<div>').parent().html());
                        flag = true;
                    }
                }

                if (flag) {
                    _this.append(obj);
                }
            }
        }

        if (_this.totalMatched <= 0) {
            var $failed = _this.template("failed", _this.options.messages["failed"]).css({
                "border": 0,
                "border-radius": 0
            });
            _this.$listGroup.html($failed);
            _this.showListGroup();
        }
    };

    Plugin.prototype.append = function(obj) {
        var _this = this,
            templateName = (typeof obj == "string") ? "bv-list-group-item" : "list-group-item",
            objValue = (typeof obj == "string") ? {
                "value": obj
            } : obj,
            $el = _this.template(templateName, objValue).css({
                "border": 0,
                "border-radius": 0
            });

        _this.$listGroup.append($el);

        $el.bind("mousedown", function(e) {
            _this.lastKeyWord = _this.$input.val();
            _this.onSelect(e, obj, true);
            _this.options.vent.onselect(e, obj, _this);
            _this.hideListGroup();
        });

        $el.bind("select", function(e) {
            _this.onSelect(e, obj);
        });
        ++_this.totalMatched;
        _this.showListGroup();
    };

    Plugin.prototype.showListGroup = function() {
        var _this = this;

        _this.$el.css({
            "border-radius": _this.options.borderRadius + "px " + _this.options.borderRadius + "px 0px 0px"
        });

        _this.$listGroup.show();
    };

    Plugin.prototype.hideListGroup = function() {
        var _this = this;

        _this.$listGroup.hide();
        _this.clearListGroup();
    };

    Plugin.prototype.showHideListGroup = function() {
        var _this = this;

        if (_this.totalMatched > 0) {
            _this.showListGroup();
        } else {
            _this.hideListGroup();
        }
    };

    Plugin.prototype.clearListGroup = function() {
        var _this = this;

        _this.$el.css({
            "border-radius": _this.options.borderRadius + "px"
        });

        _this.$listGroup.html("");
        _this.totalMatched = 0;
    };

    Plugin.prototype.onSelect = function(e, obj, flag) {
        e.preventDefault();
        var _this = this;
        var searchable = _this.options.searchable;
        var value = "";

        if (typeof obj == "string") {
            var span = $("<div></div>").html(obj).find('.auto-wrap')[0];
            if (typeof span != undefined) {
                var content = $(span).html();

                obj = obj.replace($(span).clone().wrap('<div>').parent().html(), content);
                value = obj;
            }
        } else {
            for (var i = 0; i < searchable.length; i++) {
                var span = $("<div></div>").html(obj[searchable[i]]).find('.auto-wrap')[0];
                if (typeof span != undefined) {
                    var content = $(span).html();
                    obj[searchable[i]] = obj[searchable[i]].replace($(span).clone().wrap('<div>').parent().html(), content);
                }
            }

            value = obj[_this.options.display];
        }

        if (flag === true) {
            _this.lastKeyWord = value;
            _this.lastSelected = obj;
        }

        _this.$input.val(value);
        _this.$input.focus();
        _this.$input.trigger("change");
    }

    Plugin.prototype.onNoSelect = function(e) {
        var _this = this;
        var obj = _this.options.defaultItemData;

        if (_this.lastSelected != null && typeof _this.lastSelected[_this.options.display] != undefined && _this.lastKeyWord == _this.lastSelected[_this.options.display]) {
            obj = _this.lastSelected;
        } else if (_this.options.searchable.length > 0) {
            for (var i = 0; i < _this.options.searchable.length; i++) {
                obj[_this.options.searchable[i]] = "";
            }

            obj[_this.options.display] = _this.$input.val();
        }

        _this.lastSelected = obj;
        _this.options.vent.onselect(e, obj, _this);
    }

    Plugin.prototype.onSelection = function(e, obj) {
        var _this = this;

        if (_this.totalMatched <= 0) {
            return;
        }

        var listGroupItems = _this.$listGroup.children();
        var currentElement = _this.$listGroup.find("." + _this.options.selectionClassName)[0];

        if (currentElement == null) {
            if (Key.isDown(Key.DOWN)) {
                $(listGroupItems[0]).addClass(_this.options.selectionClassName);
                $(listGroupItems[0]).trigger("select");
                _this.scrollDownListGroup(listGroupItems[0]);
            } else if (Key.isDown(Key.UP)) {
                $(listGroupItems[listGroupItems.length - 1]).addClass(_this.options.selectionClassName);
                $(listGroupItems[listGroupItems.length - 1]).trigger("select");
                _this.scrollUpListGroup(listGroupItems[listGroupItems.length - 1]);
            }
            return;
        }

        $(currentElement).removeClass(_this.options.selectionClassName);

        var currentIndex = listGroupItems.index(currentElement);
        var previous = ((currentIndex + -1) <= -1) ? listGroupItems[listGroupItems.length - 1] : listGroupItems[currentIndex - 1];
        var next = ((currentIndex + 1) >= listGroupItems.length) ? listGroupItems[0] : next = listGroupItems[currentIndex + 1];

        if (Key.isDown(Key.DOWN)) {
            if ((currentIndex + 1) >= listGroupItems.length && currentElement != null) {
                _this.$input.val(_this.lastKeyWord);
            } else {
                $(next).addClass(_this.options.selectionClassName);
                $(next).trigger("select");
                _this.scrollDownListGroup(next);
            }
        } else if (Key.isDown(Key.UP)) {
            if ((currentIndex - 1) < 0 && currentElement != null) {
                _this.$input.val(_this.lastKeyWord);
            } else {
                $(previous).addClass(_this.options.selectionClassName);
                $(previous).trigger("select");
                _this.scrollUpListGroup(previous);
            }
        }
    };

    Plugin.prototype.template = function(templateName, obj) {
        var _this = this;

        var tmpl = _this.options.templates[templateName];
        if (typeof obj != undefined) {
            if (typeof obj == "string") {
                tmpl = tmpl.replace("<%=value%>", obj);
            } else {
                $.each(obj, function(key, value) {
                    tmpl = tmpl.replace("<%=" + key + "%>", value);
                });
            }
        }

        return $(tmpl);
    }

    Plugin.prototype.scrollDownListGroup = function(el) {
        var _this = this;
        var bPos = $(el).position().top + $(el).outerHeight();

        if (bPos <= 0) {
            _this.$listGroup.animate({
                scrollTop: 0
            }, 100);
        } else if (bPos >= 200) {
            var topPos = _this.$listGroup.scrollTop();
            topPos = topPos + (bPos - 200);
            _this.$listGroup.animate({
                scrollTop: topPos
            }, 100);
        }
    }

    Plugin.prototype.scrollUpListGroup = function(el) {
        var _this = this;
        var bPos = $(el).position().top;
        var maxHeight = _this.totalHeight(_this.$listGroup.children());

        if (bPos >= 200) {
            _this.$listGroup.animate({
                scrollTop: (maxHeight - 200) + (200 - $(el).outerHeight())
            }, 100);
        } else if (bPos <= 0) {
            var topPos = _this.$listGroup.scrollTop();
            topPos = _this.$listGroup.scrollTop() - Math.abs($(el).position().top);
            _this.$listGroup.animate({
                scrollTop: topPos
            }, 100);
        }
    }

    Plugin.prototype.totalHeight = function(childNodes) {
        var total = 0;
        $.each(childNodes, function(key, node) {
            total += $(node).outerHeight();
        });

        return total;
    }
    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
            }
        });
    }
})(jQuery, window, document, "undefined");