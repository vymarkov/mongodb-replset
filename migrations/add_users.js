users = db.getUsers();
printjson(users);

db.createUser({
	user: 'mongooser',
	pwd: 'mongoose',
	customData: {
		contactInfo: 'v.y.markov@gmail.com'
	},
	roles: [{
		role: 'read', db: 'dev'
	}]
});

db.createUser({
	user: 'mongooserw',
	pwd: 'mongoose',
	customData: {
		contactInfo: 'v.y.markov@gmail.com'
	},
	roles: [{
		role: 'readWrite', db: 'dev'
	}]
});

printjson(db.getUsers());