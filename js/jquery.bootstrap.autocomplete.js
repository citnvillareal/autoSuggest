/*!
 * jQuery autoComplete plugin
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

;(function($, window, document, undefined){
	"use strict"

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
			"list-group-item": "<a class=\"list-group-item\" href=\"#\"><%=description%></a>",
			"bv-list-group-item": "<a class=\"list-group-item\" href=\"#\"><%=value%></a>",
			"loading": "<span class=\"list-group-item\"><%=value%></span>",
			"failed": "<span class=\"list-group-item\"><%=value%></span>"
		},
		borderRadius: 5,
		limit: 5,
		vent: {
			onselect: function ( e, itemData, _this ) {
				// TO DO
			}
		},
		selectionClassName: "list-group-item-info",
		url: false,
		delay: 500,
		messages: {
			loading: "Loading...",
			failed: "No data matched."
		}
	};

	var Key = {
		_pressed: false,

		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		ENTER: 13,
		SPACE: 32,
		  
		isDown: function ( keyCode ) {
		    return ( this._pressed == keyCode );
		},
		  
		hasKeyDown: function () {
		    return (this._pressed !== false); 
		},

		onKeydown: function ( event ) {
		  this._pressed = event.keyCode;
		}
	};

	function Plugin ( el, opt ) {
		var _this = this;

		_this.el = el;
		_this.$el = $( _this.el );

		_this.options = $.extend ( true, {}, defaults, opt ) ;

		_this._defaults = defaults;
        _this._name = pluginName;
        _this.totalMatched = 0;
        _this.prevFormOnSubmit = [];

        _this.$el.bind( "keydown", function( e ){
        	Key.onKeydown( e );
        } );

		_this.init();
	}

	Plugin.prototype.init = function () {
		var _this = this;

		_this.lastKeyWord = "";

		_this.$el.wrap( _this.template( "content-wrapper" ) );
		_this.$input = ( _this.$el.is( "input" ) )? _this.$el: $(_this.$el.find( "input" ));
		
		_this.$parentElement = _this.$el.parent();

		_this.$parentElement.find( "*" ).css( { "border": 0, "border-radius": 0 } );

		_this.$el.css( {
			"border": "1px solid #ccc",
			"border-radius": _this.options.borderRadius + "px",
			"overflow": "hidden"
		} );

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

		_this.$input.bind ( "keyup", function( e ) {
			e.preventDefault();
			_this.onKeyUp( e );
		} );

		_this.$input.focusout ( function (){
			_this.hideListGroup();
		} );

		$("form").each( function ( key, form ) {
			if(typeof $(form).attr("onsubmit") != undefined) {
				_this.prevFormOnSubmit[key] = $(form).attr("onsubmit");
			}
		} );
	};

	Plugin.prototype.onKeyUp = function ( e ) {
		var _this = this;
		if( Key.isDown ( Key.ENTER ) ) {
			_this.$listGroup.find( "." + _this.options.selectionClassName ).trigger("mousedown");
		} else if( Key.isDown( Key.DOWN ) || Key.isDown ( Key.UP )) {
			_this.onSelection ( e );
		} else if(_this.options.url == false) {
		   _this.search(_this.$input.val());
		} else {
			_this.remoteSearch(_this.$input.val());
		}
	}

	Plugin.prototype.remoteSearch = function( keyword ) {
		var _this = this;
		var requestUrl = "";

		_this.lastKeyWord = keyword;
		_this.hideListGroup();

		if(typeof _this.timeoutId != undefined) {
			clearTimeout(_this.timeoutId);
		}

		if(typeof _this.xhr != undefined) {
			_this.xhr.abort();
		}

		requestUrl = _this.options.url + encodeURIComponent(keyword);

		_this.timeoutId = setTimeout(function(){

			if(keyword.trim().length <= 0) {
				return;
			}
			
			var $loading = _this.template( "loading", _this.options.messages [ "loading" ] ).css( { "border": 0 } );
			_this.$listGroup.html($loading);
			_this.showListGroup();

			_this.xhr = $.get( requestUrl, function ( res ) {
				
				if( typeof res [ "data" ] == undefined || res [ "data" ] == null ) {
					var $failed = _this.template( "failed", _this.options.messages [ "failed" ] ).css( { "border": 0 } );
					_this.$listGroup.html( $failed );
					_this.options [ "data" ] = [];
					return;
				}

				_this.options [ "data" ] = res.data;
				if( _this.options [ "data" ].length > 0 ) {
					_this.search( _this.$input.val() );
				} else {
					var $failed = _this.template( "failed", _this.options.messages [ "failed" ] ).css( { "border": 0 } );
					_this.$listGroup.html( $failed );
				}

				clearTimeout(_this.timeoutId);
			} );

		}, _this.options.delay);
	}

	Plugin.prototype.search = function ( keyword ) {
		var _this = this;
		var data = _this.options ["data"];
		var searchable = _this.options ["searchable"];

		_this.hideListGroup();
		_this.lastKeyWord = keyword;

		if(keyword.trim().length <= 0 && data.length <= 0) {
			return;
		}

		for( var i = 0; i < data.length; i++ ) {

			if( _this.$listGroup.children().length >= _this.options.limit && _this.options.limit !== false ) { 
				return;
			}

			var span = $( "<span></span>" );
				span.addClass( "auto-wrap" );
				span.css({
					"font-weight": "bold"
				});


			if(typeof data [ i ] == "string") {
				var obj = data [ i ];
				span.html(_this.lastKeyWord);
				if(typeof obj != undefined && obj.indexOf( keyword ) >= 0) {
					obj = obj.replace(_this.lastKeyWord, span.clone().wrap('<div>').parent().html());
					_this.append(obj);
				}
			} else {
				var obj = $.extend( true, {}, data[ i ] );

				for(var j = 0; j < searchable.length; j++) {
					var key = searchable[ j ];

					if(typeof obj[ key ] != undefined && obj[ key ].indexOf( keyword ) >= 0) {
						span.html( _this.lastKeyWord );
						obj [ key ] = obj [ key ].replace( _this.lastKeyWord, span.clone().wrap( '<div>' ).parent().html() );
						_this.append(obj);
						break;
					}
				}
			}
		}
	}; 

	Plugin.prototype.append = function ( obj ) {
		var _this = this,
			templateName = ( typeof obj == "string" )? "bv-list-group-item": "list-group-item",
			objValue = ( typeof obj == "string" )? { "value" : obj }: obj,
			$el = _this.template(templateName, objValue).css( { "border": 0, "border-radius": 0 } );
		
		_this.$listGroup.append($el);

		$el.bind( "mousedown", function ( e ) {
			_this.onSelect( e, obj );
			_this.options.vent.onselect( e, obj, _this );
			_this.hideListGroup();
		} );

		$el.bind( "select", function( e ) {
			_this.onSelect(e, obj);
		} );
		
		++_this.totalMatched;
		_this.showListGroup();
	};

	Plugin.prototype.showListGroup = function () {
		var _this = this;

		_this.$el.css({
			"border-radius": _this.options.borderRadius + "px " + _this.options.borderRadius + "px 0px 0px"
		});

		_this.$listGroup.show();

		$("form").each(function(key, form){
			$(form).attr("onsubmit", "return false;");
		});
	};

	Plugin.prototype.hideListGroup = function () {
		var _this = this;

		_this.$listGroup.hide();

		$("form").each(function(key, form){
			if(typeof _this.prevFormOnSubmit[key] != undefined) {
				$(form).attr("onsubmit", _this.prevFormOnSubmit[key]);
			}
		});

		_this.clearListGroup();
	};

	Plugin.prototype.showHideListGroup = function () {
		var _this = this;

		if( _this.totalMatched > 0 ) {
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

	Plugin.prototype.onSelect= function ( e, obj ) {
		e.preventDefault();

		var _this = this;
		var searchable = _this.options.searchable;
		var value = "";

		if(typeof obj == "string") {
			var span = $( "<div></div>" ).html( obj ).find( '.auto-wrap' )[ 0 ];
			var content = $(span).html();

			obj = obj.replace( $( span ).clone().wrap( '<div>' ).parent().html(), content );
			value = obj;
		} else {
			for(var i = 0; i < searchable.length; i++) {
				var span = $( "<div></div>" ).html( obj [ searchable [ i ] ] ).find( '.auto-wrap' )[ 0 ];
				var content = $( span ).html();

				obj [ searchable [ i ] ] = obj[ searchable [ i ] ].replace( $( span ).clone().wrap( '<div>' ).parent().html(), content );
			}

			value = obj [ _this.options.display ];
		}

		_this.$input.val( value );
		_this.$input.focus();
		_this.$input.trigger( "change" );
	}

	Plugin.prototype.onSelection = function( e, obj ) {
		var _this = this;

		if( _this.totalMatched <= 0 ) {
			return;
		}

		var listGroupItems = _this.$listGroup.children();
		var currentElement = _this.$listGroup.find( "." + _this.options.selectionClassName)[ 0 ];

		if( currentElement == null ) {
			if( Key.isDown( Key.DOWN ) ) {
				$( listGroupItems [ 0 ] ).addClass( _this.options.selectionClassName );
				$( listGroupItems [ 0 ] ).trigger( "select" );
				_this.scrollDownListGroup( listGroupItems [ 0 ] );
			} else if( Key.isDown ( Key.UP ) ) {
				$( listGroupItems [ listGroupItems.length - 1 ] ).addClass( _this.options.selectionClassName );
				$( listGroupItems [ listGroupItems.length - 1 ] ).trigger( "select" );
				_this.scrollUpListGroup( listGroupItems [ listGroupItems.length - 1 ] );
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
				$( next ).trigger( "select" );
				_this.scrollDownListGroup( next );
			}
		} else if( Key.isDown( Key.UP ) ) {
			if( ( currentIndex - 1 ) < 0 && currentElement != null) {
				_this.$input.val( _this.lastKeyWord );
			} else {
				$( previous ).addClass( _this.options.selectionClassName );
				$( previous ).trigger( "select" );
				_this.scrollUpListGroup( previous );
			}
		}
	};

	Plugin.prototype.template = function ( templateName, obj ) {	
		var _this = this;

		var tmpl = _this.options.templates [ templateName ];
		
		if(typeof obj != undefined) {
			if(typeof obj == "string") {
				tmpl = tmpl.replace( "<%=value%>", obj );
			} else {
				$.each ( obj, function( key, value ) {
					tmpl = tmpl.replace( "<%="+key+"%>", value );
				} );
			}
		}

		return $( tmpl );
	}

	Plugin.prototype.scrollDownListGroup = function ( el ) {
		var _this = this;
		var bPos = $( el ).position().top + $( el ).outerHeight();

		if(bPos <= 0) {
			_this.$listGroup.animate( {
				scrollTop: 0
			}, 100 );
		}else if(bPos >= 200) {
			var topPos = _this.$listGroup.scrollTop();
			topPos = topPos + (bPos - 200);
			_this.$listGroup.animate( {
				scrollTop: topPos
			}, 100 );
		} 
	}

	Plugin.prototype.scrollUpListGroup = function ( el ) {
		var _this = this;
		var bPos = $( el ).position().top;
		var maxHeight = _this.totalHeight(_this.$listGroup.children());

		if(bPos >= 200) {
			_this.$listGroup.animate( {
				scrollTop: (maxHeight - 200) + (200 - $( el ).outerHeight())
			}, 100 );
		}else if(bPos <= 0) {
			var topPos = _this.$listGroup.scrollTop();
			topPos = _this.$listGroup.scrollTop() - Math.abs($( el ).position().top);
			_this.$listGroup.animate( {
				scrollTop: topPos
			}, 100 );
		} 
	}

	Plugin.prototype.totalHeight = function ( childNodes ) {
		var total = 0;
		$.each( childNodes, function( key, node ){
			total += $(node).outerHeight();
		} );

		return total;
	}
	
	$.fn[pluginName] = function ( options ) {
		return this.each ( function () {
		    if ( !$.data ( this, 'plugin_' + pluginName ) ) {
		        $.data ( this, 'plugin_' + pluginName, new Plugin( this, options ));
		    }
		} );
	}
} )( jQuery, window, document, "undefined" );