'use strict';

import {Url, format} from 'url';
import * as Promise from 'bluebird';

const mongodbUri = require('mongodb-uri');

interface Service {
	host: string;
	port: number;
}

interface MongoDbUri {
	hosts: Service[];
	username?: string;
	password?: string;
	database: string;
	options: {
		[prop: string]: string
	}
}

/*
 * Prepare a MongoDB Uri based on the environment variables
 */  
export function mongoConnectionString(fetchServices: () => Promise<Service[]>) : Promise<string> {
	const env = process.env;
	const hosts = (env.MONGODB_HOSTS || '').split(',').map(hostname => {
		let [host, port] = hostname.split(':');
		return {
			host: host, port: port || 27017
		};
	});
	const [authEnabled, user, pass] = [env.MONGODB_AUTH === 'yes', env.MONGODB_USERNAME || env.MONGODB_USER, env.MONGODB_PASSWORD || env.MONGODB_PASS];
	const [host, port, db] = [env.MONGODB_HOST || 'localhost', env.MONGODB_PORT || 27017, env.MONGODB_DATABASE || 'test'];
	const [replSetEnabled, replSetName] = [env.MONGODDB_REPLSET === 'yes', env.MONGODB_REPLSET_NAME];
	
  return <Promise<string>>fetchServices()
    .then((services: Service[]) => {
			const opts: any = {};
			const uri: MongoDbUri = {
				hosts: services,
				database: db,
				options: opts
			};
			
			if (replSetEnabled) {
				opts.replSet = replSetName;
			}
			if (authEnabled) {
				uri.username = user;
				uri.password = pass;
			}
			return Promise.resolve(mongodbUri.format(uri));
    });
}

function mongoConnectionStringTest() {
	process.env.MONGODB_AUTH = 'yes';
	process.env.MONGODB_USERNAME = 'user';
	process.env.MONGODB_PASSWORD = 'pass';
	process.env.MONGODDB_REPLSET = 'yes';
	process.env.MONGODB_REPLSET_NAME = 'rs0';
	process.env.MONGODB_DATABASE = 'test';
	
	const exConnString = 'mongodb://user:pass@localhost:27001,localhost:27002,localhost:27003/test?replSet=rs0'
	
	mongoConnectionString(() => Promise.resolve([{
		host: 'localhost',
		port: 27001
	}, {
		host: 'localhost',
		port: 27002
	}, {
		host: 'localhost',
		port: 27003
	}]))
		.then((url: string) => {
			console.log(url === exConnString);
			console.log(url);
		});
}

mongoConnectionStringTest();g(url);
		});
}

mongoConnectionStringTest();