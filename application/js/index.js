// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @output_file_name compiled.js
// ==/ClosureCompiler==


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

	/**
	 * Current tab
	 * @type {String}
	 * @private
	 */
	this.currentTab_ = null;

	this.init();
};

/**
 * Init
 */
app.FlightList.prototype.init = function(){
	this.element_ = app.getElementByTemplate(app.FlightList.templateBase);
	this.tabs_ = this.element_.getElementsByClassName(app.FlightList.ClassType.TABS)[0];
	this.content_ = this.element_.getElementsByClassName(app.FlightList.ClassType.CONTENT)[0];
	this.loading_ = this.element_.getElementsByClassName(app.FlightList.ClassType.LOADING)[0];
	this.loadingBar_ = this.loading_.getElementsByClassName(app.FlightList.ClassType.LOADING_BAR)[0];
	this.loadingPercent_ = this.loading_.getElementsByClassName(app.FlightList.ClassType.LOADING_PERCENT)[0];

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
			this.setData(data);
			this.decorateData();
			this.showLoading(false);
		},
		this
	);
};

/**
 * sets data
 * @param {Object} data
 */
app.FlightList.prototype.setData = function(data){
	var references = data['References'];
	this.airports_ = references['Airports'];
	this.carriers_ = references['Carriers'];
	this.planes_ = references['Planes'];
	this.airlines_ = data['Airlines'];
};

/**
 * Decorate data
 */
app.FlightList.prototype.decorateData = function(){
	this.decorateTabs();
	if(!this.currentTab_){
		this.currentTab_ = this.carriers_[0]['Code'];
	}
	this.decorateContent();
};

/**
 * Decorate tabs
 */
app.FlightList.prototype.decorateTabs = function(){
	var airlines =  this.airlines_,
		airlinesLen = airlines.length, i = 0, data, code,
		list = [];

	for(;i<airlinesLen;i++){
		code = airlines[i]['Code'];
		data = app.getDataByCode(this.carriers_, code);

		data['Current'] = (i == 0);
		data['Total'] = app.getDataByCode(this.airlines_, code)['Fares'].length;

		list.push(app.FlightList.templateTab(data));
	}

	this.tabs_.innerHTML = list.join('');
	this.bindTabs();
};

/**
 * bind tabs
 */
app.FlightList.prototype.bindTabs = function(){
	var self_ = this;
	this.tabs_.addEventListener('click', function(event) {
		self_.onClickTab(event);
	}, false);
};

/**
 * click on tab
 * @param {MouseEvent} event
 */
app.FlightList.prototype.onClickTab = function(event){
	var target = event.target,
		current = this.tabs_.getElementsByClassName(app.FlightList.ClassType.TAB_CURRENT)[0],
		code = target.dataset['code'];

	if(code){
		this.currentTab_ = code;

		current.className = app.FlightList.ClassType.TAB;
		target.className = app.FlightList.ClassType.TAB_CURRENT;

		this.decorateContent();
	}

};

/**
 * Decorate content
 * @param {String|Number=} opt_code
 */
app.FlightList.prototype.decorateContent = function(opt_code){
	var fares =  app.getDataByCode(this.airlines_, (opt_code || this.currentTab_))['Fares'],
		faresLen = fares.length, i= 0, data,
		faresList = [];

	for(;i<faresLen;i++){
		data = fares[i];

		data['Amount'] = data['TotalAmount'].formatMoney(0, ',', ' ');
		data['Currency'] = this.currency_;
		data['Title'] = this.getDirectionsView(data);

		faresList.push(app.FlightList.templateInfo(data));
	}

	this.content_.innerHTML = faresList.join('');
};

/**
 * Directions view
 * @param {Object} data
 * @return {string}
 */
app.FlightList.prototype.getDirectionsView = function(data){
	var directions = data['Directions'],
		directionsLen = directions.length, i= 0, directionData,
		directionsList = [];

	for(;i<directionsLen;i++){
		directionData = directions[i];
		directionData['Direction'] = this.getPointsView(directionData['Points']);
		directionsList.push(app.FlightList.templateInfoDirection(directionData));
	}
	return directionsList.join('');
};

/**
 * Points view
 * @param {Object} data
 * @return {string}
 */
app.FlightList.prototype.getPointsView = function(data){
	var pointsLen = data.length, i= 0, pointData,
		pointsList = [];

	for(;i<pointsLen;i++){
		pointData = data[i];
		pointData['Title'] = app.getDataByCode(this.airports_, pointData['ArrivalCode'])['Name'];

		pointsList.push(app.FlightList.templateInfoPoint(pointData));
	}
	return pointsList.join(app.FlightList.templateInfoPointArrow());
};

/**
 * sets loading progress
 * @param {String|Number} completed
 */
app.FlightList.prototype.setLoadingProgress = function(completed){
	this.loadingBar_.style.width = completed + '%';
	this.loadingPercent_.innerHTML = completed + '%';
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
 * @export
 */
app.FlightList.prototype.render = function(opt_element){
	(opt_element || document.body).appendChild(this.element_);
};

/**
 * Class types
 * @enum {String}
 */
app.FlightList.ClassType = {
	TABS:'flights-tabs',
	CONTENT:'flights-content',
	LOADING:'flights-loading',
	LOADING_BAR:'flights-loading-bar',
	LOADING_PERCENT:'flights-loading-percent',
	TAB:'flights-tab',
	TAB_CURRENT:'flights-tab-current',
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
			'<div class="flights-loading-percent">0%</div>' +
		'</div>' +
	'</div>';
};

/**
 * Tab template of FlightList
 * @param {Object=} opt_data
 */
app.FlightList.templateTab = function (opt_data) {
	return '<a href="javascript:;" class="flights-tab'+ (opt_data['Current'] ? '-current' : '') +'" data-code="'+ opt_data['Code'] +'">'+ opt_data['Name'] +' ('+ opt_data['Total'] +')</a>';
};

/**
 * Flight info template of FlightList
 * @param {Object=} opt_data
 */
app.FlightList.templateInfo = function (opt_data) {
	return '<div class="flights-info" data-id="'+ opt_data['Id'] +'">' +
		'<div class="flights-info-amount">'+ opt_data['Amount'] +' '+ opt_data['Currency'] +'</div>' +
		'<div class="flights-info-title">'+ opt_data['Title'] +'</div>' +
	'</div>';
};

/**
 * Flight direction info template
 * @param {Object=} opt_data
 */
app.FlightList.templateInfoDirection = function (opt_data) {
	return '<div class="flights-info-direction">'+ opt_data['Direction'] +'</div>';
};

/**
 * Flight points info template
 * @param {Object=} opt_data
 */
app.FlightList.templateInfoPoint = function (opt_data) {
	return '<div class="flights-info-point">'+
		opt_data['Title'] +' ['+
			opt_data['ArrivalCode'] +
			(opt_data['ArrivalTerminal'] ? '-' + opt_data['ArrivalTerminal'] : '') +
			(opt_data['DepartureTerminal'] ? '-' + opt_data['DepartureTerminal'] : '') +
		']' +
	'</div>';
};

/**
 * Flight points info template
 * @param {Object=} opt_data
 */
app.FlightList.templateInfoPointArrow = function (opt_data) {
	return '<div class="flights-info-point-arrow"></div>';
};

/**
 * gets data by code
 * @param {Array} data_list
 * @param {String|Number} code
 * @returns {Object}
 */
app.getDataByCode = function(data_list, code){
	var len = data_list.length,i=0;
	for(;i<len;i++){
		if(data_list[i]['Code'] == code){
			return data_list[i];
		}
	}
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

Number.prototype.formatMoney = function(c, d, t){
	var n = this,
		c = isNaN(c = Math.abs(c)) ? 2 : c,
		d = d == undefined ? "." : d,
		t = t == undefined ? "," : t,
		s = n < 0 ? "-" : "",
		i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
		j = (j = i.length) > 3 ? j % 3 : 0;
	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};