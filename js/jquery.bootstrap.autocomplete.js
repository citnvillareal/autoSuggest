;(function($, window, document, undefined){

	var pluginName = "autoComplete";

	var defaults = {
		data: [],
		searchable: [
			"description"
		],
		display: "description",
		templates: {
			"content-wrapper": "<div class=\"autoComplete-wrapper\"></div>",
			"list-group": "<div class=\"list-group\"></div>",
			"list-group-item": "<a class=\"list-group-item\" href=\"#\"><%=common_title%></a>",
			"bv-list-group-item": "<a class=\"list-group-item\" href=\"#\"><%=value%></a>"
		},
		borderRadius: 5,
		limit: 5,
		vent: {
			onselect: function(e, itemData, _this) {
				// TO DO
			}
		},
		selectionClassName: "list-group-item-info",
		url: false
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

		_this.options = $.extend (true, {}, defaults, opt ) ;

		_this._defaults = defaults;
        _this._name = pluginName;

        _this.$el.bind("keydown", function(e){
        	Key.onKeydown(e);
        });

		_this.init();
	}

	Plugin.prototype.init = function() {
		var _this = this;

		_this.lastKeyWord = "";

		_this.$el.wrap(_this.template("content-wrapper"));
		_this.$input = (_this.$el.is("input"))? _this.$el: $(_this.$el.find("input"));
		
		_this.$parentElement = _this.$el.parent();

		_this.$parentElement.find("*").css({ "border": 0, "border-radius": 0 });

		_this.$el.css({
			"border": "1px solid #ccc",
			"border-radius": _this.options.borderRadius + "px",
			"overflow": "hidden"
		});

		var position = _this.$el.position();
		var width = _this.$el.outerWidth();
		var heigth = _this.$el.outerHeight();

		_this.$listGroup = _this.template("list-group").css({
			"max-height": "200px", 
			"overflow-y": "auto",
			"border": "1px solid #ccc", 
			"border-radius": "0px 0px " + _this.options.borderRadius + "px " + _this.options.borderRadius + "px", 
			"border-top": 0,
			"position": "absolute",
			"top": position.top + heigth +"px",
			"left": position.left + "px",
			"width": width + "px",
			"z-index": 9999
		}).hide();

		_this.$parentElement.append(_this.$listGroup);

		_this.$input.bind("keyup", function(e){
			e.preventDefault();
			_this.performSearch(e);
		});

		_this.$input.focusout(function(){
			_this.hideListGroup();
		});
	};

	Plugin.prototype.performSearch = function(e) {
		var _this = this;

		if(typeof _this.timeoutId != undefined) {
			clearTimeout(_this.timeoutId);
		}

		if(Key.isDown(Key.ENTER)) {
			_this.hideListGroup();
			_this.$listGroup.html("");
		} else if(Key.isDown(Key.DOWN) || Key.isDown(Key.UP)) {
			_this.onSelection(e);
			_this.showHideListGroup();
		} else {
			if(_this.options.url == false) {
			   _this.search(_this.$input.val());
			   _this.showHideListGroup();
			} else {
				_this.timeoutId = setTimeout(function(){
					var value = _this.$input.val();
					if(value.trim().length > 0) {
						$.get(_this.options.url + value, function(res) {
							if(res.data == null) {
								_this.options.data = [];
								return;
							}

							_this.options.data = res.data;
							if(_this.options["data"].length > 0) {
								_this.search(_this.$input.val());
						   		_this.showHideListGroup();
							}

							clearTimeout(_this.timeoutId);
						});
					}
				}, 100);
			}
		}
	}

	Plugin.prototype.search = function(keyword) {
		var _this = this;

		keyword = keyword.trim();
		var data = _this.options.data;
		var searchable = _this.options.searchable;

		_this.$listGroup.html("");
		
		if(keyword.trim().length > 0 && data.length > 0) {
			_this.lastKeyWord = keyword;
			for( var i = 0; i < data.length; i++ ) {

				if( _this.$listGroup.children().length >= _this.options.limit && _this.options.limit !== false ) { 
					return;
				}

				var span = $("<span></span>");
					span.addClass("auto-wrap");
					span.css({
						"font-weight": "bold"
					});

				if(typeof data[i] == "string") {
					var obj = data[i];
					span.html(_this.lastKeyWord);
					if(typeof obj != undefined && obj.indexOf(keyword) >= 0) {
						obj = obj.replace(_this.lastKeyWord, span.clone().wrap('<div>').parent().html());
						_this.append(obj);
					}
				} else {
					var obj = $.extend(true, {}, data[i]);
					for(var j = 0; j < searchable.length; j++) {
						var key = searchable[j];
						if(typeof obj[key] != undefined && obj[key].indexOf(keyword) >= 0) {
							span.html(_this.lastKeyWord);

							obj[key] = obj[key].replace(_this.lastKeyWord, span.clone().wrap('<div>').parent().html());
							_this.append(obj);

							break;
						}
					}
				}
			}

		}
	}; 

	Plugin.prototype.append = function(obj) {
		var _this = this;

		var templateName = (typeof obj == "string")? "bv-list-group-item": "list-group-item";
		var objValue = (typeof obj == "string")? {"value": obj}: obj;

		var $el = _this.template(templateName, objValue).css({"border": 0});
		_this.$listGroup.append($el);

		$el.bind("mousedown", function(e){
			e.preventDefault();

			_this.onSelect(e, obj);
			_this.hideListGroup();
		});
	};

	Plugin.prototype.showListGroup = function() {
		var _this = this;

		_this.$el.css({
			"border-radius": _this.options.borderRadius + "px " + _this.options.borderRadius + "px 0px 0px"
		});
		_this.$listGroup.show();

		$("form").each(function(){
			$(this).attr("onsubmit", "return false;");
		});
	};

	Plugin.prototype.hideListGroup = function() {
		var _this = this;

		_this.$el.css({
			"border-radius": _this.options.borderRadius + "px"
		});
		_this.$listGroup.hide();

		$("form").each(function(){
			$(this).removeAttr("onsubmit");
		});
	};

	Plugin.prototype.showHideListGroup = function() {
		var _this = this;

		if(_this.$listGroup.text().trim().length > 0) {
			_this.showListGroup();
		} else {
			_this.hideListGroup();
		}
	};

	Plugin.prototype.onSelect= function(e, obj) {
		var _this = this;
		var searchable = _this.options.searchable;
		var value = "";

		if(typeof obj == "string") {
			var span = $("<div></div>").html(obj).find('.auto-wrap')[0];
			var content = $(span).html();

			obj = obj.replace($(span).clone().wrap('<div>').parent().html(), content);
			value = obj;
		} else {
			for(var i = 0; i < searchable.length; i++) {
				var span = $("<div></div>").html(obj[searchable[i]]).find('.auto-wrap')[0];
				var content = $(span).html();

				obj[searchable[i]] = obj[searchable[i]].replace($(span).clone().wrap('<div>').parent().html(), content);
			}

			value = obj[_this.options.display];
		}

		_this.$input.val(value);
		_this.$input.focus();
		_this.$input.trigger("change");

		_this.options.vent.onselect(e, obj, _this);
	}

	Plugin.prototype.onSelection = function(e, obj) {
		var _this = this;

		var listGroupItems = _this.$listGroup.children();
		var currentElement = _this.$listGroup.find( "." + _this.options.selectionClassName)[ 0 ];

		if( currentElement == null ) {
			if( Key.isDown( Key.DOWN ) ) {
				$( listGroupItems[ 0 ] ).addClass( _this.options.selectionClassName );
				$( listGroupItems[ 0 ] ).trigger("mousedown");
			} else if( Key.isDown( Key.UP ) ) {
				$( listGroupItems[ listGroupItems.length - 1 ] ).addClass( _this.options.selectionClassName );
				$( listGroupItems[ listGroupItems.length - 1 ] ).trigger("mousedown");
			}
			return;
		} 

		$( currentElement ).removeClass( _this.options.selectionClassName );

		var currentIndex = listGroupItems.index( currentElement );
		var previous = ( ( currentIndex + -1 ) <= -1 )? listGroupItems[ listGroupItems.length - 1 ]: listGroupItems[ currentIndex - 1 ];
		var next = ( ( currentIndex + 1 ) >= listGroupItems.length )? listGroupItems[ 0 ]: next = listGroupItems[ currentIndex + 1 ]; 

		if( Key.isDown( Key.DOWN ) ) {
			if( ( currentIndex + 1 ) >= listGroupItems.length && currentElement != null) {
				_this.$input.val( _this.lastKeyWord );
			} else {
				$( next ).addClass( _this.options.selectionClassName );
				$( next ).trigger("mousedown");
			}
		} else if( Key.isDown( Key.UP ) ) {
			if( ( currentIndex - 1 ) < 0 && currentElement != null) {
				_this.$input.val( _this.lastKeyWord );
			} else {
				$( previous ).addClass( _this.options.selectionClassName );
				$( previous ).trigger("mousedown");
			}
		}
	};

	Plugin.prototype.template = function(templateName, obj) {	
		var _this = this;

		var tmpl = _this.options.templates[templateName];
		
		if(typeof obj != undefined) {
			$.each(obj, function(key, value) {
				tmpl = tmpl.replace("<%="+key+"%>", value);
			});
		}

		return $(tmpl);
	}

	
	$.fn[pluginName] = function ( options ) {
		return this.each(function () {
		    if (!$.data(this, 'plugin_' + pluginName)) {
		        $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));
		    }
		});
	}
})(jQuery, window, document, "undefined");