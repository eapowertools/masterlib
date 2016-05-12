var Promise = require('Bluebird');
var winston = require('winston');
var config = require('../config/config');
var qrsCO = require('./qrsChangeOwner');

//set up logging
var logger = new (winston.Logger)({
	level: config.logLevel,
	transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: config.logFile})
    ]
});

var popMeasures =
{
	popMeas: function(app, appId, ownerId, data)
	{
		return new Promise(function(resolve)
		{
			var tags = []
			var tagString = data[4].qText.split(";");
			tagString.forEach(function(tagValue)
			{
				tags.push(tagValue);
			});

			tags.push("MasterItem");
			tags.push(data[3].qText);
			tags.push(data[3].qText.toLowerCase() + '_' + data[0].qText);

			var boolPublishedApp = popMeasures.isAppPublished(app);
			if(boolPublishedApp)
			{
				logger.info('popMeas::App is published.', {module: 'popMeasures'});
			}
			else
			{
				logger.info('popMeas::App is not published.', {module: 'popMeasures'});				
			}

			var objId = data[3].qText.toLowerCase() + '_' + data[0].qText;
			logger.info('popMeas::Calling popMeas for ' + objId, {module: 'popMeasures'});
			
			
			if(data[1].qText.toLowerCase()=='dimension')
			{
				var dim = popMeasures.dim(data,tags);
				
				app.getDimension(objId)
				.then(function(result)
				{
					if(result==null)
					{
						app.createDimension(dim)
						.then(function()
						{
							app.getDimension(objId)
							.then(function(ready)
							{
								//Only run this if the app is published.
								if(boolPublishedApp)
								{
									ready.publish()
									.then(function()
									{
										logger.info('popMeas::Created Dimension ' + data[2].qtext, {module: 'popMeasures'});
										popMeasures.changeOwner(appId,objId,ownerId)
										.then(function(result)
										{
											if(result)
											{
												resolve('Created Dimension: ' + data[2].qtext);										
											}
										})
										.catch(function(error)
										{
											reject(new Error(error));
										});
									})
									.catch(function(error)
									{
										logger.error('popMeas::publish::' + error, {module: 'popMeasures'});
										reject(new Error(error));
									});
								}
								else
								{
									popMeasures.changeOwner(appId,objId,ownerId)
									.then(function(result)
									{
										if(result)
										{
											resolve('Created Dimension: ' + data[2].qtext);										
										}
									})
									.catch(function(error)
									{
										reject(new Error(error));
									});
								}
							})
							.catch(function(error)
							{
								logger.error('popMeas::getDimension::' + error, {module: 'popMeasures'});
								reject(new Error(error));
							});
						})
						.then(function()
						{
							
						})
						.catch(function(error)
						{
							logger.error('popMeas::createDimension::' + error, {module: 'popMeasures'});
							reject(new Error(error));							
						});
					}
					else
					{
						result.setProperties(dim)
						.then(function(ready)
						{
							if(boolPublishedApp)
							{
								result.publish()
								.then(function()
								{
									logger.info('popMeas::Updated Dimension ' + data[2].qText, {module: 'popMeasures'});
									popMeasures.changeOwner(appId,objId,ownerId)
									.then(function(result)
									{
										if(result)
										{
											resolve('Created Dimension: ' + data[2].qtext);										
										}
									})
									.catch(function(error)
									{
										reject(new Error(error));
									})
								})
								.catch(function(error)
								{
									logger.error('popMeas::publish::' + error, {module: 'popMeasures'});
									reject(new Error(error));
								});
							}
							else
							{
								popMeasures.changeOwner(appId,objId,ownerId)
								.then(function(result)
								{
									if(result)
									{
										resolve('Created Dimension: ' + data[2].qtext);										
									}
								})
								.catch(function(error)
								{
									reject(new Error(error));
								})	
							}
						})
						.catch(function(error)
						{
							logger.error('popMeas::setProperties::' + error, {module: 'popMeasures'});
							reject(new Error(error));							
						});
					}
				})
				.catch(function(error)
				{
					logger.error('popMeas::getDimension::' + error, {module: 'popMeasures'});
					reject(new Error(error));
				});
			}
			else
			{
				var meas = popMeasures.meas(data,tags);
				app.getMeasure(objId)
				.then(function(result)
				{
					if(result==null)
					{
						//console.log('handle is null');
						//console.log('create a measure');
						app.createMeasure(meas)
						.then(function(ready)
						{
							app.getMeasure(objId)
							.then(function(ready)
							{
								if(boolPublishedApp)
								{
									ready.publish()
									.then(function()
									{
										logger.info('popMeas::Created Measure ' + data[2].qText, {module: 'popMeasures'});
										popMeasures.changeOwner(appId,objId,ownerId)
										.then(function(result)
										{
											if(result)
											{
												resolve('Created Measure: ' + data[2].qText);										
											}
										})
										.catch(function(error)
										{
											reject(new Error(error));
										})
									})
									.catch(function(error)
									{
										logger.error('popMeas::Publish::' + error, {module: 'popMeasures'});
										reject(new Error(error));
									});
								}
								else
								{
									popMeasures.changeOwner(appId,objId,ownerId)
									.then(function(result)
									{
										if(result)
										{
											resolve('Created Measure: ' + data[2].qText);										
										}
									})
									.catch(function(error)
									{
										reject(new Error(error));
									})
								}
							})
							.catch(function(error)
							{
								logger.error('popMeas::getMeasure::' + error, {module: 'popMeasures'});
								reject(new Error(error));
							});
						})
						.catch(function(error)
						{
							logger.error('popMeas::createMeasure ' +  data[2].qText + ' ' + error, {module: 'popMeasures'});
							reject(new Error(error));							
						});
					}
					else
					{
						//console.log('MasterItems exist');
						//console.log('update measure');
						result.setProperties(meas)
						.then(function(ready)
						{
							if(boolPublishedApp)
							{
								result.publish()
								.then(function()
								{
									logger.info('popMeas::Updated Measure ' + data[2].qText, {module: 'popMeasures'});
									qrsCO.changeOwner(appId, objId,ownerId)
									.then(function()
									{
										popMeasures.changeOwner(appId,objId,ownerId)
										.then(function(result)
										{
											if(result)
											{
												resolve('Created Measure: ' + data[2].qText);										
											}
										})
										.catch(function(error)
										{
											reject(new Error(error));
										})
									})
									.catch(function(error)
									{
										reject(error);
									});
								})
								.catch(function(error)
								{
									logger.error('popMeas::Publish::' + error, {module: 'popMeasures'});
									reject(new Error(error));
								});								
							}
							else
							{
								popMeasures.changeOwner(appId,objId,ownerId)
								.then(function(result)
								{
									if(result)
									{
										resolve('Created Measure: ' + data[2].qText);										
									}
								})
								.catch(function(error)
								{
									reject(new Error(error));
								})
							}
						})
						.catch(function(error)
						{
							logger.error('popMeas::setProperties::' + error, {module: 'popMeasures'});
							reject(new Error(error));							
						});
					}
				})
				.catch(function(error)
				{
					logger.error('popMeas::getMeasure::' + error, {module: 'popMeasures'});
					reject(new Error(error));
				});
			}
		});
	},
	isAppPublished: function(app)
	{
		app.getAppLayout().then(function(appLayout)
		{
			return appLayout.published;
		});
	},
	changeOwner: function(appId, objId, ownerId)
	{
		return new Promise(function(resolve)
		{
			qrsCO.changeOwner(appId, objId, ownerId)
			.then(function()
			{
				resolve(true)
			})
			.catch(function(error)
			{
				reject(error);
			});
		})
	},
	meas: function(data,tags)
	{
		var meas = {
			qInfo: {
		        qId: data[3].qText.toLowerCase() + '_' + data[0].qText,
		        qType: data[1].qText.toLowerCase()
		    },
		    qMeasure: {
		        qLabel: data[2].qText,
		        qDef: data[6].qText,
		        qGrouping: "N",
		        qExpressions: [],
		        qActiveExpression: 0
		    },
		    qMetaDef: {
		        title: data[2].qText,
		        description: data[5].qText,
		        qSize: -1,
		        sourceObject: "",
		        draftObject: "",
		        tags: tags
		   	}
		};
		return meas;
	},
	dim: function(data,tags)
	{
		var dim = {
			qInfo: {
				qId: data[3].qText.toLowerCase() + '_' + data[0].qText,
				qType: data[1].qText.toLowerCase()
			},
			qDim: {
				qGrouping: "N",
				qFieldDefs: [data[6].qText],
				title: data[2].qText,
				qFieldLabels: [data[6].qText]
			},
			qMetaDef: {
				title: data[2].qText,
		        description: data[5].qText,
		        qSize: -1,
		        sourceObject: "",
		        draftObject: "",
		        tags: tags
			}
		};
		return dim;
	}	
}

module.exports = popMeasures;