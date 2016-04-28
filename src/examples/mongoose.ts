//
// our goal is show how to use Mongoose with the Replica Set where 
// our application will try to connect to the MongoDB using a new mongodb replset uri 
// every time when the replica set will be changed: may be added new members 
// or removed existing members

'use strict';

import {fetchServices} from '../fetchServices';
import * as Promise from 'bluebird';

const READ_PREFERENCES_PRIMARY = 'primary';
const READ_PREFERENCES_SECONDARY = 'secondary';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const mongodbUri = require('mongodb-uri');
const Schema = mongoose.Schema;

const UserSchema = Schema({
	username: String,
	email: String
}, {
	read: 'secondary',
	safe: { w: 'majority', wtimeout: 10000 }
});

function mongoUrl(services: (any) => Promise<string>): Promise<string> {
	return <Promise<string>>Promise.resolve({
			filters: {
				status: ['running'],
				label: ['service=mongo', 'replset=rs0']
			}
		})
		.then(services)
		.then((services: string) => {
			console.log(services);

			let obj = {
				username: 'admin',
				password: 'password',
				hosts: services.split(',').map((url: string) => {
					return {
						host: url.split(':')[0],
						port: url.split(':')[1] || 27017
					};
				}),
				database: 'dev',
				options: {
					replSet: 'rs0'
				}
			};

			return Promise.resolve(mongodbUri.format(obj));
		});
}

function connection(url: () => Promise<string>, schemas: () => Promise<any>) {
	let cachedUrl, cachedConn;

	return () => {
		return Promise.props({
			url: url(),
			schemas: schemas()
		})
		.then((m: { url: string, schemas: any}) => {
			if (cachedUrl && cachedConn && cachedUrl === m.url) {
				return Promise.resolve(cachedConn);
			}
			cachedUrl = m.url;

			return new Promise((resolve: (any) => void, reject: (Error) => void) => {
				cachedConn = mongoose.createConnection(m.url);
				mongoose.set('debug', true);
				cachedConn.on('error', (err) => {	
					console.log('ocurred error', err.stack);
				});
				cachedConn.on('connected', () => {
					console.log('---');
					console.log('MongoDB Replica Set connection url %s', m.url);
					console.log('Connected correctly to server');
					console.log('---');

					// for (let schemaname ) {
						// cachedConn.model(schemaname, m.schemas.get(schemaname));
					// }
					
					Object.keys(m.schemas).forEach((schemaname: string) => cachedConn.model(m.schemas[schemaname]));

					resolve(cachedConn);
				});
				cachedConn.on('all', () => {
					console.log('All members of the replica set are connected');
				});
				cachedConn.on('fullsetup', () => {
					console.log('A primary and at least one secondary are connected');
				});
			});
		});
	};
}

function main() {
	const schemas = () => {
		const schemas = {};
		schemas['User'] = UserSchema;
		return Promise.resolve(schemas);
	};
	const manulAdrr = process.env.MANUL_ADDR || 'http://192.168.99.102:3000';
	const services = fetchServices(manulAdrr);
	const url = () => mongoUrl(services);
	const conn = connection(url, schemas);

	setInterval(() => {
		conn()
			.tap((conn) => {
				const User = conn.model('User');

				return User.create({ username: 'mike', email: 'mike@gmail.com' })
					.delay(1500)
					.then((doc) => {
						console.log('User successfully added', doc);
						return User.findOne({ username: 'mike' });
					})
					.delay(1500)
					.then((doc) => {
						console.log('User found', doc);
					});
			});
	}, 5000);
}
main();
