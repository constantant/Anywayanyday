/**
 * Namespace
 * @type {Object}
 */
var app = {};

/**
 * Request to remote server
 * @param {String} action
 * @param {String|Object} params
 * @param {Function} success
 * @param {Object=} opt_context
 */
app.request = function(action, params, success, opt_context){
	var script = document.createElement('script'),
		id = ++app.request.ID_,
		callbackName = 'callback' + id,
		firstScriptInDocument = document.getElementsByTagName('script')[0],
		requestParams = '';

	if(typeof params == 'string'){
		requestParams = params;
	}else if(typeof params == 'object'){
		for(var name in params){
			requestParams += encodeURIComponent(name) + '=' + encodeURIComponent(params[name]) + '&';
		}
	}

	window[callbackName] = function(data){
		success.call(opt_context, data);

		window[callbackName] = null;
		delete window[callbackName];
		firstScriptInDocument.parentNode.removeChild(script);
	};

	script.type = 'text/javascript';
	script.async = true;
	script.src = action + '?' + requestParams + '_Serialize=JSON&callback=' + callbackName;

	//firstScriptInDocument.parentNode.insertBefore(script, firstScriptInDocument);
	firstScriptInDocument.parentNode.appendChild(script);
};

/**
 * ID of request
 * @type {number}
 * @private
 */
app.request.ID_ = 0;

/**
 * List of flights
 * @param {Object} options
 * @constructor
 */
app.FlightList = function(options){

	/**
	 * New Request Action
	 * @type {String}
	 * @private
	 */
	this.newRequestAction_ = options['newRequestAction'];

	/**
	 * Request State Action
	 * @type {String}
	 * @private
	 */
	this.requestStateAction_ = options['requestStateAction'];

	/**
	 * Fares Action
	 * @type {String}
	 * @private
	 */
	this.faresAction_ = options['faresAction'];

	/**
	 * Id Synonym
	 * @type {Number}
	 * @private
	 */
	this.idSynonym_ = null;

	/**
	 * Route
	 * @type {String}
	 * @private
	 */
	this.route_ = options['Route'];

	/**
	 * Duration
	 * @type {Number}
	 * @private
	 */
	this.duration_ = options['Duration'] || 1000;

	/**
	 *  Language
	 * @type {String}
	 * @private
	 */
	this.language_ = options['Language'] || 'RU';

	/**
	 * Currency
	 * @type {String}
	 * @private
	 */
	this.currency_ = options['Currency'] || 'RUB';

	/**
	 * Limit
	 * @type {Number}
	 * @private
	 */
	this.limit_ = options['Limit'] || 100;

	this.init();
};

/**
 * Init
 */
app.FlightList.prototype.init = function(){
	/**
	 * Base element
	 * @type {!HTMLElement}
	 * @private
	 */
	this.element_ = app.getElementByTemplate(app.FlightList.templateBase);
	this.tabs_ = this.element_.getElementsByClassName(app.FlightList.ClassName.TABS)[0];
	this.content_ = this.element_.getElementsByClassName(app.FlightList.ClassName.CONTENT)[0];
	this.loading_ = this.element_.getElementsByClassName(app.FlightList.ClassName.LOADING)[0];
	this.loadingBar_ = this.loading_.getElementsByClassName(app.FlightList.ClassName.LOADING_BAR)[0];
	this.loadingPercent_ = this.loading_.getElementsByClassName(app.FlightList.ClassName.LOADING_PERCENT)[0];

	this.newRequest();
};

/**
 * new request
 */
app.FlightList.prototype.newRequest = function(){
	app.request(
		this.newRequestAction_,
		{
			'Route': this.route_
		},
		this.onNewRequest,
		this
	);
};

/**
 * After new request
 * @param data
 */
app.FlightList.prototype.onNewRequest = function(data){
	this.idSynonym_ = data['IdSynonym'];
	this.checkingData();
};

/**
 * checking data
 */
app.FlightList.prototype.checkingData = function(){
	var self_ = this;

	app.request(
		this.requestStateAction_,
		{
			'R': this.idSynonym_
		},
		function(data){
			var completed = data['Completed'];
			if(completed == 100){
				this.getData();
			}else{
				this.setLoadingProgress(completed);
				setTimeout(function(){
					self_.checkingData();
				}, this.duration_);
			}
		},
		this
	);
};

/**
 * get data
 */
app.FlightList.prototype.getData = function(){
	app.request(
		this.faresAction_,
		{
			'L': this.language_,
			'C': this.currency_,
			'Limit': this.limit_,
			'DebugFullNames': true,
			'R': this.idSynonym_
		},
		function(data){
			this.decorateData(data);
			this.showLoading(false);
		},
		this
	);
};

/**
 * Decorate data
 * @param {Object} data
 */
app.FlightList.prototype.decorateData = function(data){
	this.decorateTabs(data);
	this.decorateContent(data);
};

/**
 * Decorate tabs
 * @param {Object} data
 */
app.FlightList.prototype.decorateTabs = function(data){
	var airlines =  data['Airlines'],
		airlinesLen = airlines.length, i = 0,
		list = [];

	for(;i<airlinesLen;i++){
		console.log(airlines[i]);
		list.push(app.FlightList.templateTab(airlines[i]));
	}

	this.tabs_.innerHTML = list.join('');
};

/**
 * Decorate content
 * @param {Object} data
 */
app.FlightList.prototype.decorateContent = function(data){

};

/**
 * sets loading progress
 * @param {String|Number} completed
 */
app.FlightList.prototype.setLoadingProgress = function(completed){
	this.loadingBar_.style.width = completed + '%';
	this.loadingPercent_.innerHTML = completed;
};

/**
 * show loading
 * @param {Boolean=} opt_show
 */
app.FlightList.prototype.showLoading = function(opt_show){
	this.loading_.style.display = opt_show ? '' : 'none';
};

/**
 * Render to view
 * @param {Element=} opt_element
 */
app.FlightList.prototype.render = function(opt_element){
	(opt_element || document.body).appendChild(this.element_);
};

/**
 * Class names
 * @enum {String}
 */
app.FlightList.ClassName = {
	TABS:'flights-tabs',
	CONTENT:'flights-content',
	LOADING:'flights-loading',
	LOADING_BAR:'flights-loading-bar',
	LOADING_PERCENT:'flights-loading-percent',
	TAB:'flights-tab',
	INFO:'flights-info'
};

/**
 * Base template of FlightList
 * @param {Object=} opt_data
 */
app.FlightList.templateBase = function (opt_data) {
	return '<div class="flights">' +
		'<div class="flights-tabs"></div>' +
		'<div class="flights-content"></div>' +
		'<div class="flights-loading">' +
			'<div class="flights-loading-bar"></div>' +
			'<div class="flights-loading-percent">0</div>' +
		'</div>' +
	'</div>';
};

/**
 * Tab template of FlightList
 * @param {Object=} opt_data
 */
app.FlightList.templateTab = function (opt_data) {
	return '<a href="javascript:;" class="flights-tab" data-code="'+ opt_data['Code'] +'">'+ opt_data['Code'] +'</a>';
};

/**
 * Flight info template of FlightList
 * @param {Object=} opt_data
 */
app.FlightList.templateInfo = function (opt_data) {
	return '<div class="flights-info" data-code="'+ opt_data['code'] +'">'+ opt_data['title'] +'</div>';
};

/**
 *
 * @param {Function} template
 * @param {Object=} opt_data
 * @returns {!HTMLElement}
 */
app.getElementByTemplate = function(template, opt_data){
	var	wrapper = document.createElement('div');

	wrapper.innerHTML = template(opt_data);
	if (wrapper.childNodes.length == 1) {
		var firstChild = wrapper.firstChild;
		if (firstChild.nodeType == 1) {
			return /** @type {!Element} */ (firstChild);
		}
	}
};